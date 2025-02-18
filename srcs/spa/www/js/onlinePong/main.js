import { getCSRFToken, sleep } from '/js/utils.js';
import Game from "./game/game.js";
import Player from "./game/player.js";
import CountdownAnimation from "../countdownAnimation.js";
import {creationGameDisplay, updatePlayerStatus, displayWhenLoad } from "./game/waitingRoom.js";

let socket = null;
let oldHeight = null;
let gameStarted = false;
let currentPlayerId = null;
let currentGame = null;
let currentCountdown = null;
let currentGameId = null;
let inTournament = false;

function sendToBack(data) {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.error("WebSocket not ready");
    }
}

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
            handleErrors({message: 'You need to be logged before playing'});
        }
        const data = await response.json();
        return await data;
    } catch (error) {
        handleErrors({message: 'You need to be logged before playing'});
    }
}
    
async function init() {
    const user = await getUserFromBack();

    displayWhenLoad(user);
    
    socket = setupWebSocket(user);
}

function setupWebSocket(user) {
    currentPlayerId = user.id;
    const id = user.id.toString();
    const socket = new WebSocket(`wss://127.0.0.1:8443/ws/onlinePong/${id}/`);
    const urlParams = new URLSearchParams(window.location.search);
    inTournament = urlParams.get('tournament');
    
    socket.onopen = () => {
        console.log("WebSocket connected");
        if (inTournament) {
            sendToBack({
                action: 'tournament',
                player_id: user.id,
                player_name: user.username,
                player_avatar: user.avatar,
                create: urlParams.get('create_game'),
                opponent: {
                    id: urlParams.get('opp_id'),
                    name: urlParams.get('opp_name'),
                    avatar: urlParams.get('opp_avatar'),
                }
            })
        } else {
            sendToBack({
                action: 'search', 
                player_id: user.id, 
                player_name: user.username, 
                player_avatar: user.avatar,
            });
        }
    };

    socket.onmessage = async (e) => {
        await handleWebSocketMessage(e);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error.type);
    socket.onclose = () => console.log("WebSocket closed");

    window.addEventListener("resize", () => resizeCanvasGame());

    return socket;
}


function setupKeyboardControls(playerId) {
    let movementInterval = null;

    window.addEventListener('keydown', (event) => {
        if (!movementInterval) {
            const direction = event.key === 'ArrowUp' ? 'up' : event.key === 'ArrowDown' ? 'down' : null;
            if (direction) {
                sendMovement(direction, playerId);
                movementInterval = setInterval(() => sendMovement(direction, playerId), 10);
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            clearInterval(movementInterval);
            movementInterval = null;
        }
    });
}

function sendMovement(direction, playerId) {
    sendToBack({ action: 'move', direction, player_id: playerId });
}

async function initGame(data) {
    const canvas = document.getElementById('gameCanvas');
    oldHeight = canvas.height;
    const [P1, P2] = createPlayers(data);
    return new Game(canvas, P1, P2);
}

function createPlayers(data) {
    const p1_id = data.player1_id;
    const p2_id = data.player2_id;
    const p1_name = data.player1_name;
    const p2_name = data.player2_name;
    const p1_avatar = data.player1_avatar;
    const p2_avatar = data.player2_avatar;

    const P1 = new Player(p1_id, p1_name, p1_avatar);
    const P2 = new Player(p2_id, p2_name, p2_avatar);
    return [P1, P2];
}

async function handleWebSocketMessage(e) {
    const data = JSON.parse(e.data);
    switch(data.type) {

        case 'players_info':
            console.log('got player infos');
            handlePlayerInfo(data);
            break;

        case 'player_ready':
            await updatePlayerStatus(data.player_number);
            break;

        case 'ball_position':
            currentGame.updateBallPosition(data.x, data.y);
            currentGame.drawGame(data.bound_wall, data.bound_player);
            break;

        case 'player_move':
            updatePlayerPosition(currentGame, data);
            break;

        case 'score_update':
            currentGame.updateScores(data);
            break;

        case 'game_finish':
            handleGameFinish(currentGame, data.winning_session);
            gameStarted = false;
            currentGame.stop();
            break;

        case 'game_start':
            await handleGameStart(data);
            break;

        case 'countdown':
            await handleCountdown(data.countdown);
            break;

        case 'game_cancel':
            handleGameCancel(data);
            break;

        case 'error':
            handleErrors(data);
            break; 

        case 'waiting_tournament':
            await handleWaiting(data);
            break;
    }
}

async function handleWaiting(data) {
    await sleep(100);
    sendToBack({
        action: 'tournament',
        player_id: data.player_id, 
        player_name: data.player_name, 
        player_avatar: data.player_avatar,
        opponent: data.opponent,
        create: data.create,
    });
}

function handleErrors(data) {
    const infoMain = document.getElementById('info-main-player');
    const infop1 = document.getElementById('infoP1');
    const infop2 = document.getElementById('infoP2');
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
    if (!infop1.classList.contains('hidden'))
        infop1.classList.add('hidden');
    if (!infop2.classList.contains('hidden'))
        infop2.classList.add('hidden');
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
    if (!button.classList.contains('hidden'))
        button.classList.add('hidden');

    errorContainer.classList.remove('hidden');
    errorMessage.innerText += data.message;
}

function handlePlayerInfo(data) {
    currentGameId = data.game_id;
    creationGameDisplay(data, currentGame);
    sendToBack({action: 'findGame', game_id: currentGameId})
    document.getElementById('button-ready').addEventListener('click', () => {
        sendToBack({action: 'ready', game_id: currentGameId})
    })
}

async function handleGameStart(data) {
    currentGame = await initGame(data);
    currentGame.displayCanvas();
    currentCountdown = new CountdownAnimation('countdownCanvas');
    gameStarted = true;
    resizeCanvasGame();
}

function handleGameCancel(data) {
    sendToBack({action: 'cancel'});
    handleErrors(data);
}

function updatePlayerPosition(game, data) {
    const playerNumber = parseInt(data.player_id) === parseInt(game.P1.id) ? 1 : 2;
    game.updatePlayerPosition(playerNumber, data.y);
}

async function handleCountdown(countdown) {
    await currentCountdown.displayNumber(countdown);
    if (countdown === 0) {
        setupKeyboardControls(currentPlayerId);
        currentCountdown.stopDisplay();
        currentGame.start();
    }
}

function handleGameFinish(game, winningId) {
    const opponentName = currentPlayerId === parseInt(game.P1.id) ? game.P2.name : game.P1.name;
    setTimeout(() => {
        game.displayWinner(winningId);
    }, 500);
    const asWin = currentPlayerId === parseInt(winningId);
    fetch('/api/add_match/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
            'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
        },
        credentials: 'include',
        body: JSON.stringify({
            'type': 'Pong',
            'opponent_name': opponentName,
            'won': asWin
        })
    }).then(response => response.json())
    .then(data => {
        console.log('Match enregistrer ', data);
        
    }).catch(error => console.error(error));
}

function resizeCanvasGame() {
    const canvasCount = document.getElementById('countdownCanvas');
    const canvas = document.getElementById('gameCanvas');

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

    oldHeight = canvas.height;

    currentGame.P1.draw(currentGame.context, currentGame.colorP1);
    currentGame.P2.draw(currentGame.context, currentGame.colorP2);
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

init();