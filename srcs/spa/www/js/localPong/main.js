import { getCSRFToken, sleep } from '/js/utils.js';
import Game from "./game/game.js";
import Player from "./game/player.js";
import CountdownAnimation from "../countdownAnimation.js";
import { displayWhenLoad } from "./game/waitingRoom.js";
import { ensureValidToken } from '/js/utils.js';

let oldHeight = null;
let gameStarted = false;
let currentPlayerId = null;
let currentGame = null;
let currentCountdown = null;
let currentGameId = null;

async function getUserFromBack() {
    try {
        const response = await fetch('/api/get-my-info/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            credentials: 'include',
        });
        if (!response.ok) {
            handleErrors({message: 'You need to be logged before playing'});
        }
        const data = await response.json();
        return data;
    } catch (error) {
        handleErrors({message: 'You need to be logged before playing'});
    }
}

async function init() {
    const user = await getUserFromBack();
    if (!user.username)
        return;
    displayWhenLoad(user);
    currentGame = await initGame(user);
    currentCountdown = new CountdownAnimation('countdownCanvas');
    window.addEventListener('resize', () => resizeCanvasGame());
    document.getElementById('button-ready').addEventListener('click', async () => {
        gameStarted = true;
        await startCountdown();
    })
}

async function startCountdown() {
    currentGame.displayCanvas();
    for (let i = 3; i > 0; i--) {
        await currentCountdown.displayNumber(i);
        await sleep(1000);
    }
    resizeCanvasGame();
    currentCountdown.stopDisplay();
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
    const p2_name = data.username + '(1)';
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
    if (!countdown.classList.contains('hidden'))
    {
        if (currentCountdown)
            currentCountdown.stopDisplay();
        countdown.classList.add('hidden');
    }
    console.log('button:', button);
    if (!button.classList.contains('hidden'))
    {
        console.log('je passe ici');
        button.classList.add('hidden');
    }
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

init();