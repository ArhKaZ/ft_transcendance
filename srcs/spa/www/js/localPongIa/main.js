import { getCSRFToken, sleep } from '/js/utils.js';
import Game from "./game/game.js";
import Player from "./game/player.js";
import CountdownAnimation from "../countdownAnimation.js";
import { displayWhenLoad } from "./game/waitingRoom.js";
import { getUserFromBack } from '/js/utils.js';
import { router } from '../router.js';

// État centralisé du jeu
const gameState = {
    oldHeight: null,
    gameStarted: false,
    currentGame: null,
    currentCountdown: null,
    currentLevel: 0,
    asSelectedLevel: false,
    gameIsCancel: false,
    cleanupFunctions: []
};

// Fonction principale d'initialisation
export async function init() {
    try {
        // Initialisation des éléments UI
        const returnButton = document.getElementById('return-button');
        const readyButton = document.getElementById('button-ready');
        const levelButtons = {
            lvl1: document.getElementById('lvl1'),
            lvl2: document.getElementById('lvl2'),
            lvl3: document.getElementById('lvl3')
        };

        // Handlers d'événements
        const handleReturn = () => cleanupAndNavigate();
        const handleReadyClick = () => checkAndLaunchGame();
        const handleLevelClick = (level) => (event) => assignLevel(level, event);

        // Configuration du jeu
        const user = await getUserFromBack();
        if (!user.username) {
            throw new Error("User not authenticated");
        }

        displayWhenLoad(user);
        gameState.currentGame = await initializeGame(user);
        gameState.currentCountdown = new CountdownAnimation('countdownCanvas');

        // Ajout des listeners
        window.addEventListener('resize', handleResize);
        returnButton.addEventListener('click', handleReturn);
        readyButton.addEventListener('click', handleReadyClick);
        
        Object.entries(levelButtons).forEach(([key, button]) => {
            const level = parseInt(key.replace('lvl', ''));
            button.addEventListener('click', handleLevelClick(level));
        });

        // Enregistrement des fonctions de cleanup
        registerCleanup([
            () => window.removeEventListener('resize', handleResize),
            () => returnButton.removeEventListener('click', handleReturn),
            () => readyButton.removeEventListener('click', handleReadyClick),
            ...Object.entries(levelButtons).map(([key, button]) => {
                const level = parseInt(key.replace('lvl', ''));
                return () => button.removeEventListener('click', handleLevelClick(level));
            })
        ]);

    } catch (error) {
        console.error("Initialization error:", error);
        handleErrors({ message: "Game initialization failed" });
    }

    return () => executeCleanup();
}

// Fonctions de gestion du jeu
async function initializeGame(user) {
    const canvas = document.getElementById('gameCanvas');
    gameState.oldHeight = canvas.height;
    const [player, ia] = createPlayers(user);
    return new Game(canvas, player, ia);
}

function createPlayers(userData) {
    return [
        new Player(1, userData.username, userData.avatar),
        new Player(2, 'IA', userData.avatar)
    ];
}

function checkAndLaunchGame() {
    if (!gameState.asSelectedLevel) {
        alert('Please select an AI level first');
        return;
    }
    
    gameState.gameStarted = true;
    gameState.currentGame.IA.assignLevel(gameState.currentLevel);
    startGameCountdown();
}

async function startGameCountdown() {
    try {
        gameState.currentGame.displayCanvas();
        
        for (let i = 3; i > 0; i--) {
            await gameState.currentCountdown.displayNumber(i);
            await sleep(1000);
        }
        
        resizeGameCanvas();
        gameState.currentCountdown.stopDisplay();
        
        if (!gameState.gameIsCancel) {
            await gameState.currentGame.start();
        }
    } catch (error) {
        console.error("Countdown error:", error);
        handleErrors({ message: "Failed to start game" });
    }
}

function assignLevel(level, event) {
    gameState.currentLevel = level;
    gameState.asSelectedLevel = true;
    
    // Mise à jour UI des boutons de niveau
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.remove('clicked');
    });
}

function checkAndLaunch() {
    if (asSelectedLevel) {
        gameStarted = true;
        currentGame.IA.assignLevel(currentLevel);
        startCountdown();
    } else {
        const modalLvl = document.getElementById('modal-level')
        modalLvl.style.display = 'flex';
        document.getElementById('modal-btn-ok').onclick = () => modalLvl.style.display = 'none';
    }
}

function handleLevel1Click(event) {
    assignForALevel(1, event);
}

function handleLevel2Click(event) {
    assignForALevel(2, event);
}

function handleLevel3Click(event) {
    assignForALevel(3, event);
}

function listenerLevelButtons() {
    const lvl1 = document.getElementById('lvl1');
    const lvl2 = document.getElementById('lvl2');
    const lvl3 = document.getElementById('lvl3');

    lvl1.addEventListener('click', handleLevel1Click);
    lvl2.addEventListener('click', handleLevel2Click);
    lvl3.addEventListener('click', handleLevel3Click);
}

function removeLevelButtonsListeners() {
    const lvl1 = document.getElementById('lvl1');
    const lvl2 = document.getElementById('lvl2');
    const lvl3 = document.getElementById('lvl3');

    lvl1.removeEventListener('click', handleLevel1Click);
    lvl2.removeEventListener('click', handleLevel2Click);
    lvl3.removeEventListener('click', handleLevel3Click);
}

function assignForALevel(level, event) {
    currentLevel = level;
    switch (currentLevel) {
        case 1:
            if (lvl2.classList.contains('clicked'))
                lvl2.classList.remove('clicked');
            if (lvl3.classList.contains('clicked'))
                lvl3.classList.remove('clicked');
        case 2:
            if (lvl1.classList.contains('clicked'))
                lvl1.classList.remove('clicked');
            if (lvl3.classList.contains('clicked'))
                lvl3.classList.remove('clicked');
        case 3:
            if (lvl1.classList.contains('clicked'))
                lvl1.classList.remove('clicked');
            if (lvl2.classList.contains('clicked'))
                lvl2.classList.remove('clicked'); 
    }
    event.target.classList.add('clicked');
    
    // Animation UI
    document.getElementById('mp-waiting-animation').classList.add('hidden');
    document.getElementById('mp-joined-animation').classList.remove('hidden');
}

// Fonctions de gestion du canvas
function handleResize() {
    resizeGameCanvas();
}

function resizeGameCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const countdownCanvas = document.getElementById('countdownCanvas');
    
    if (!canvas || !countdownCanvas) return;

    const oldBallPosition = gameState.currentGame ? getNormalizedBallPosition(canvas) : null;

    // Redimensionnement
    canvas.width = window.innerWidth * 0.70;
    canvas.height = window.innerHeight * 0.80;
    countdownCanvas.width = canvas.width;
    countdownCanvas.height = canvas.height;

    // Mise à l'échelle
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scale = Math.min(canvas.width / canvas.offsetWidth, canvas.height / canvas.offsetHeight);
    ctx.scale(scale, scale);

    if (!gameState.gameStarted || !gameState.currentGame) return;

    updateGameElements(canvas, oldBallPosition);
    gameState.oldHeight = canvas.height;
}

function updateGameElements(canvas, oldBallPosition) {
    const game = gameState.currentGame;
    
    // Mise à jour des paddles
    updatePaddlesDimensions(game, canvas);
    
    // Mise à jour de la balle
    game.ball.size = Math.min(canvas.width, canvas.height) * 0.01;
    game.ball.x = oldBallPosition[0] * canvas.width / 100;
    game.ball.y = oldBallPosition[1] * canvas.height / 100;
    
    // Redessin
    redrawGameElements(game);
}

function updatePaddlesDimensions(game, canvas) {
    const paddleWidth = canvas.width * 0.01;
    const paddleHeight = canvas.height * 0.15;

    [game.P1, game.P2].forEach(player => {
        player.paddle.width = paddleWidth;
        player.paddle.height = paddleHeight;
    });

    game.P1.paddle.x = canvas.width * 0.01;
    game.P2.paddle.x = canvas.width - (canvas.width * 0.01 + game.P2.paddle.width);

    game.P1.paddle.y = (game.P1.paddle.y / gameState.oldHeight) * canvas.height;
    game.P2.paddle.y = (game.P2.paddle.y / gameState.oldHeight) * canvas.height;
}

function redrawGameElements(game) {
    game.P1.draw(game.context, game.colorP1);
    game.P2.draw(game.context, game.colorP2);
    game.ball.draw(game.context);
}

function getNormalizedBallPosition(canvas) {
    const ball = gameState.currentGame.ball;
    return [
        ball.x / canvas.width * 100,
        ball.y / canvas.height * 100
    ];
}

// Fonctions de cleanup
function cleanupAndNavigate() {
    gameState.gameIsCancel = true;
    
    if (gameState.currentGame?.isStart) {
        gameState.currentGame.stop();
    }
    
    if (gameState.currentCountdown) {
        gameState.currentCountdown.stopDisplay();
    }
    
    executeCleanup();
    router.navigateTo('/pong/');
}

function registerCleanup(functions) {
    gameState.cleanupFunctions.push(...functions);
}

function executeCleanup() {
    gameState.cleanupFunctions.forEach(fn => fn());
    gameState.cleanupFunctions = [];
}

// Gestion des erreurs
function handleErrors(data) {
    const elementsToHide = [
        'info-main-player', 'hud-p1', 'hud-p2',
        'sparks-container', 'canvasContainer',
        'gameCanvas', 'countdownCanvas', 
        'button-ready', 'levels'
    ];

    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    });

    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    if (errorContainer) errorContainer.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = data.message;
}