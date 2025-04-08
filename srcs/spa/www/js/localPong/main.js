import { getCSRFToken, sleep } from '/js/utils.js';
import Game from "./game/game.js";
import Player from "./game/player.js";
import CountdownAnimation from "../countdownAnimation.js";
import { displayWhenLoad } from "./game/waitingRoom.js";
import { getUserFromBack } from '/js/utils.js';
import { router } from '../router.js';

let cleanupFunctions = [];
let gameState = {
    oldHeight: null,
    gameStarted: false,
    currentGame: null,
    currentCountdown: null,
    gameIsCancel: false
};

export async function init() {
    const returnButton = document.getElementById('return-button');
    const readyButton = document.getElementById('button-ready');
    const handleReturn = () => returnBack();
    const handleReadyClick = async () => {
        gameState.gameStarted = true;
        await startCountdown();
    };
    const popstateHandler = () => {
        if (gameState.gameStarted) {
            gameState.gameIsCancel = true;
            returnBack();
        }
    };
    window.addEventListener('popstate', popstateHandler);
    try {
        const user = await getUserFromBack();
        if (!user.username) {
            handleErrors({ message: "User not authenticated" });
            return;
        }

        displayWhenLoad(user);
        gameState.currentGame = await initGame(user);
        gameState.currentCountdown = new CountdownAnimation('countdownCanvas');

        window.addEventListener('resize', handleResize);
        returnButton.addEventListener('click', handleReturn);
        readyButton.addEventListener('click', handleReadyClick);
    } catch (error) {
        console.error("Initialization error:", error);
        handleErrors({ message: "Initialization failed" });
    }
}

function resetGameState() {
    gameState.oldHeight = null;
    gameState.gameStarted = false;
    gameState.currentCountdown = null;
    gameState.currentGame = null;
    gameState.gameIsCancel = false;
}

async function initGame(user) {
    const canvas = document.getElementById('gameCanvas');
    gameState.oldHeight = canvas.height;
    const [P1, P2] = createPlayers(user);
    return new Game(canvas, P1, P2);
}

function createPlayers(data) {
    return [
        new Player(1, data.username, data.avatar),
        new Player(2, data.username + '(1)', data.avatar)
    ];
}

async function startCountdown() {
    if (!gameState.currentGame) return;

    gameState.currentGame.displayCanvas();
    try {
        for (let i = 3; i > 0; i--) {
            if (!gameState.currentCountdown)
                return;
            await gameState.currentCountdown.displayNumber(i);
            await sleep(1000);
        }
        
        resizeCanvasGame();
        gameState.currentCountdown.stopDisplay();
        
        if (!gameState.gameIsCancel) {
            await gameState.currentGame.start();
        }
    } catch (error) {
        console.error("Countdown error:", error);
        handleErrors({ message: "Game start failed" });
    }
}

function returnBack() {
    gameState.gameIsCancel = true;
    
    if (gameState.currentGame?.isStart) {
        gameState.currentGame.stop();
    }
    
    if (gameState.currentCountdown) {
        gameState.currentCountdown.stopDisplay();
    }
    resetGameState();
    router.navigateTo('/pong/');
}

function handleResize() {
    resizeCanvasGame();
}

function resizeCanvasGame() {
    const canvas = document.getElementById('gameCanvas');
    const canvasCount = document.getElementById('countdownCanvas');
    
    if (!canvas || !canvasCount) return;

    let oldCoorNormBall = gameState.currentGame ? getCoorBall(canvas) : null;

    canvas.width = window.innerWidth * 0.70;
    canvas.height = window.innerHeight * 0.80;
    canvasCount.width = canvas.width;
    canvasCount.height = canvas.height;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scale = Math.min(canvas.width / canvas.offsetWidth, canvas.height / canvas.offsetHeight);
    ctx.scale(scale, scale);

    if (!gameState.gameStarted || !gameState.currentGame) return;
    updateGameElements(canvas, oldCoorNormBall);
    gameState.oldHeight = canvas.height;
}

function updateGameElements(canvas, oldCoorNormBall) {
    const game = gameState.currentGame;
    updatePaddleDimensions(game, canvas);
    game.ball.size = Math.min(canvas.width, canvas.height) * 0.01;
    game.ball.x = oldCoorNormBall[0] * canvas.width / 100;
    game.ball.y = oldCoorNormBall[1] * canvas.height / 100;

    game.P1.draw(game.context, game.colorP1);
    game.P2.draw(game.context, game.colorP2);
    game.ball.draw(game.context);
}

function updatePaddleDimensions(game, canvas) {
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

function getCoorBall(canvas) {
    const ball = gameState.currentGame.ball;
    return [
        ball.x / canvas.width * 100,
        ball.y / canvas.height * 100
    ];
}

function handleErrors(data) {
    const elementsToHide = [
        'info-main-player', 'hud-p1', 'hud-p2',
        'sparks-container', 'canvasContainer',
        'gameCanvas', 'countdownCanvas', 'button-ready'
    ];

    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
        }
    });

    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    if (errorContainer) errorContainer.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = data.message;
}