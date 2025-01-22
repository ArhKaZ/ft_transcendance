import { getCSRFToken, sleep } from '/js/utils.js';
import Game from "./game/game.js";
import Player from "./game/player.js";
import CountdownAnimation from "../countdownAnimation.js";
import { displayWhenLoad } from "./game/waitingRoom.js";

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
                'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
            },
            credentials: 'include',
        });
        if (!response.ok) {
            console.log("error reponse");
            const errorData = await response.json();
            throw new Error(errorData.error || "Error getting user");
        }
        const data = await response.json();
        return await data;
    } catch (error) {
        alert("Need to be logged");
        window.location.href = '/home/';
        console.error("Error when getting user:", error);
        throw error;
    }
}

async function init() {
    const user = await getUserFromBack();
    displayWhenLoad(user);
    currentGame = await initGame(user);
    currentCountdown = new CountdownAnimation('countdownCanvas');
    window.addEventListener('resize', () => resizeCanvasGame());
    document.getElementById('button-ready').addEventListener('click', () => {
        gameStarted = true;
        startCountdown();
    })
}

async function startCountdown() {
    currentGame.displayCanvas();
    for (let i = 3; i >= 0; i--) {
        await currentCountdown.displayNumber(i);
        await sleep(1000);
    }
    currentCountdown.stopDisplay();
    await currentGame.start();
    resizeCanvasGame();
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