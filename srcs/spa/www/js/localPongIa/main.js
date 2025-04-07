import { getCSRFToken, sleep } from '/js/utils.js';
import Game from "./game/game.js";
import Player from "./game/player.js";
import CountdownAnimation from "../countdownAnimation.js";
import { displayWhenLoad } from "./game/waitingRoom.js";
import { getUserFromBack } from '/js/utils.js';
import { router } from '../router.js';

let oldHeight = null;
let gameStarted = false;
let currentGame = null;
let currentCountdown = null;
let currentLevel = 0;
let asSelectedLevel = false;
let gameIsCancel = false;

const handleResize = () => resizeCanvasGame();

function returnBack() {
    gameIsCancel = true;
    if (currentGame && currentGame.isStart)
        currentGame.stop();
    window.removeEventListener("resize", handleResize);
    document.getElementById('return-button').removeEventListener('click', returnBack);
    document.getElementById('button-ready').removeEventListener('click', checkAndLaunch);
    removeLevelButtonsListeners();
    router.navigateTo('/pong/');
}

export async function init() {
    oldHeight = null;
    gameStarted = false;
    currentGame = null;
    currentCountdown = null;
    currentLevel = 0;
    asSelectedLevel = false;
    gameIsCancel = false;
    const popstateHandler = () => {
        if (window.location.pathname === '/localPongIa/') {
            returnBack();
        }
    };
    window.addEventListener('popstate', popstateHandler);
    document.getElementById('return-button').addEventListener('click', () => {
        returnBack();
    });
    const user = await getUserFromBack();
    if (!user.username)
        return;
    displayWhenLoad(user);
    currentGame = await initGame(user);
    currentCountdown = new CountdownAnimation('countdownCanvas');
    window.addEventListener('resize', handleResize);
    listenerLevelButtons();
    document.getElementById('button-ready').addEventListener('click', () => {
        checkAndLaunch();
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
    asSelectedLevel = true;
    document.getElementById('mp-waiting-animation').classList.add('hidden');
    document.getElementById('mp-joined-animation').classList.remove('hidden');
}

async function startCountdown() {
    currentGame.displayCanvas();
    for (let i = 3; i > 0; i--) {
        await currentCountdown.displayNumber(i);
        await sleep(1000);
    }
    resizeCanvasGame();
    currentCountdown.stopDisplay();
    if (!gameIsCancel)
        await currentGame.start();
}

async function initGame(user) {
    const canvas = document.getElementById('gameCanvas');
    oldHeight = canvas.height;
    const [P1, P2] = createPlayers(user);
    return new Game(canvas, P1, P2);
}

function createPlayers(data) {
    const p1_id = 1;
    const p2_id = 2;
    const p1_name = data.username;
    const p2_name = 'IA';
    const p1_avatar = data.avatar;
    const p2_avatar = data.avatar;

    const P1 = new Player(p1_id, p1_name, p1_avatar);
    const P2 = new Player(p2_id, p2_name, p2_avatar);
    return [P1, P2];
}

function handleErrors(data) {
    const infoMain = document.getElementById('info-main-player');
    const hudp1 = document.getElementById('hud-p1');
    const hudp2 = document.getElementById('hud-p2');
    const spark = document.getElementById('sparks-container');
    const canvasContainer = document.getElementById('canvasContainer');
    const game = document.getElementById('gameCanvas');
    const countdown = document.getElementById('countdownCanvas');
    const button = document.getElementById('button-ready');
    const levels = document.getElementById('levels');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    if (!infoMain.classList.contains('hidden'))
        infoMain.classList.add('hidden');
    if (!hudp1.classList.contains('hidden'))
        hudp1.classList.add('hidden');
    if (!hudp2.classList.contains('hidden'))
        hudp2.classList.add('hidden');
    if (!spark.classList.contains('hidden'))
        spark.classList.add('hidden');
    if (!canvasContainer.classList.contains('hidden'))
        canvasContainer.classList.add('hidden');
    if (!game.classList.contains('hidden'))
        game.classList.add('hidden');
    if (!countdown.classList.contains('hidden')) {
        if (currentCountdown)
            currentCountdown.stopDisplay();
        countdown.classList.add('hidden');
    }
    if (!levels.classList.contains('hidden'))
        levels.classList.add('hidden');
    if (!button.classList.contains('hidden'))
        button.classList.add('hidden');

    errorContainer.classList.remove('hidden');
    errorMessage.innerText += data.message;
}

function resizeCanvasGame() {

    const canvasCount = document.getElementById('countdownCanvas');
    const canvas = document.getElementById('gameCanvas');
    let oldCoorNormBall;

    if (currentGame) {
        oldCoorNormBall = getCoorBall(canvas);
    }

    canvas.width = window.innerWidth * 0.70;
    canvas.height = window.innerHeight * 0.80;
    canvasCount.width = window.innerWidth * 0.70;
    canvasCount.height = window.innerHeight * 0.80;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scale = Math.min(canvas.width / canvas.offsetWidth, canvas.height / canvas.offsetHeight);
    ctx.scale(scale, scale);

    if (!gameStarted || !currentGame) return;

    updatePaddleDimensions(currentGame, canvas);
    currentGame.ball.size = Math.min(canvas.width, canvas.height) * 0.01;
    currentGame.ball.x = oldCoorNormBall[0] * canvas.width / 100;
    currentGame.ball.y = oldCoorNormBall[1] * canvas.height / 100;
    oldHeight = canvas.height;

    currentGame.P1.draw(currentGame.context, currentGame.colorP1);
    currentGame.P2.draw(currentGame.context, currentGame.colorP2);
    currentGame.ball.draw(currentGame.context);
}

function updatePaddleDimensions(game, canvas) {
    const paddleWidth = canvas.width * 0.01;
    const paddleHeight = canvas.height * 0.15;

    game.P1.paddle.width = paddleWidth;
    game.P1.paddle.height = paddleHeight;
    game.P2.paddle.width = paddleWidth;
    game.P2.paddle.height = paddleHeight;

    game.P1.paddle.x = canvas.width * 0.01;
    game.P2.paddle.x = canvas.width - (canvas.width * 0.01 + game.P2.paddle.width);

    game.P1.paddle.y = (game.P1.paddle.y / oldHeight) * canvas.height;
    game.P2.paddle.y = (game.P2.paddle.y / oldHeight) * canvas.height;
}

function getCoorBall(canvas) {
    const oldX = currentGame.ball.x;
    const oldY = currentGame.ball.y;
    let normX = oldX / canvas.width * 100;
    let normY = oldY / canvas.height * 100;
    return [normX, normY];
}

// init();