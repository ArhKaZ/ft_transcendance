import Game from "../src/game/game.js";
import Player from "../src/game/player.js";
import CountdownAnimation from "./game/countdownAnimation.js";
import {refreshPlayers, updatePlayerStatus, displayConnectedPlayer, displayWhenConnect } from "./game/waitingRoom.js";

let socket = null;
let oldHeight = null;
let gameStarted = false;
let currentPlayerId = null;
let currentGame = null;
let currentCountdown = null;

function sendToBack(data) {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.error("WebSocket not ready");
    }
}

async function getUserFromBack() {
    try {
        const response = await fetch('logged_get_user/');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error getting user");
        }
        return await response.json();
    } catch (error) {
        console.error("Error when getting user:", error);
        throw error;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const currentPlayer = await getUserFromBack();
        const playerId = currentPlayer.id;
        socket = await createGame(currentPlayer);

        document.getElementById('buttonStart').addEventListener('click', () => {
            sendToBack({ action: 'ready', player_id: playerId });
        });

        setupKeyboardControls(playerId);
    } catch (error) {
        handleError(error);
    }
});

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

function handleError(error) {
    if (error.message.includes("No token") || error.message.includes("Invalid Token") || error.message.includes("User does not exist")) {
        alert("You need to connect before playing");
        window.location.href = '/home/';
    } else {
        alert(error.message);
    }
}

async function createGame(currentPlayer) {
    currentPlayerId = currentPlayer.id;
    const currentPlayerName = currentPlayer.username;
    const currentAvatarSrc = currentPlayer.src_avatar;
    try {
        const response = await fetch(`./api/create_or_join_game?player_id=${currentPlayerId}&player_name=${currentPlayerName}&src=${currentAvatarSrc}`);
        const data = await response.json();
        const gameId = data.game_id;
        displayWhenConnect(data);
        return setupWebSocket(gameId, currentPlayerId);
    } catch (error) {
        console.error('Error creating game:', error);
    }
}

function setupWebSocket(gameId, playerId) {
    const socket = new WebSocket(`ws://localhost:8000/ws/onlinePong/${gameId}/${playerId}/`);
    let game = null;

    socket.onopen = () => {
        console.log("WebSocket connected");
    };

    socket.onmessage = async (e) => {
        await handleWebSocketMessage(e, gameId);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error.type);
    socket.onclose = () => console.log("WebSocket closed");

    window.addEventListener("resize", () => resizeCanvasGame(game));

    return socket;
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

    const P1 = new Player(p1_id, p1_name);
    const P2 = new Player(p2_id, p2_name);
    return [P1, P2];
}

async function handleWebSocketMessage(e, gameId) {
    const data = JSON.parse(e.data);
    switch(data.type) {

        case 'players_info':
            refreshPlayers(data, currentGame);
            break;

        case 'player_connected':
            displayConnectedPlayer(data.player_id, data.player_name, data.player_avatar, currentPlayerId);
            break;

        case 'player_ready':
            await updatePlayerStatus(data.player_id, gameId);
            break;

        case 'ball_position':
            if (currentGame) {
                currentGame.updateBallPosition(data.x, data.y);
                currentGame.drawGame(data.bound_wall, data.bound_player);
            }
            break;

        case 'player_move':
            if (currentGame) {
                updatePlayerPosition(currentGame, data);
            }
            break;

        case 'score_update':
            if (currentGame) {
                currentGame.updateScores(data.scores);
            }
            break;

        case 'game_finish':
            if (currentGame) {
                handleGameFinish(currentGame, data.winning_session);
                gameStarted = false;
                currentGame.stop();
            }
            break;

        case 'game_start':
            currentGame = await initGame(data);
            currentGame.displayCanvas();
            currentCountdown = new CountdownAnimation('countdownCanvas');
            gameStarted = true;
            resizeCanvasGame(currentGame);
            break;

        case 'countdown':
            await handleCountdown(data.countdown);
            break;

        case 'game_cancel':
            handleGameCancel(data);
            break;
    }
}

function handleGameCancel(data) {
    alert(`Game is cancelled, player ${data.player_id} is gone`); // TODO Faire meilleur erreur
    window.location.href = '/logged';
}


function updatePlayerPosition(game, data) {
    const playerNumber = parseInt(data.player_id) === parseInt(game.P1.id) ? 1 : 2;
    game.updatePlayerPosition(playerNumber, data.y);
}

async function handleCountdown(countdown) {
    await currentCountdown.displayNumber(countdown);
    if (countdown === 0) {
        currentCountdown.stopDisplay();
        currentGame.start();
    }
}

function handleGameFinish(game, winningId, opponent) {
    const winnerName = parseInt(game.P1.id) === parseInt(winningId) ? game.P1.name : game.P2.name;
    const opponentName = currentPlayerId === parseInt(game.P1.id) ? game.P2.name : game.P1.name;
    game.displayWinner(winnerName);
    const asWin = currentPlayerId === parseInt(winningId);
    fetch('/api/add_match/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`, // Si vous utilisez CSRF protection
        },
        // credentials: 'include',  // Important pour inclure les cookies
        body: JSON.stringify({
            'opponent_name': opponentName, // Remplacez par le vrai nom de l'adversaire
            'won': asWin
        })
    }).then(response => response.json())
    .then(data => {
        console.log('Match enregistrer ', data);
    }).catch(error => console.error(error));
}

function resizeCanvasGame(game) {
    if (!gameStarted || !game) return;

    const canvasCount = document.getElementById('countdownCanvas');
    const canvas = document.getElementById('gameCanvas');

    canvas.width = window.innerWidth * 0.6;
    canvas.height = window.innerHeight * 0.8;
    canvasCount.width = window.innerWidth * 0.6;
    canvasCount.height = window.innerHeight * 0.8;

    
    updatePaddleDimensions(game, canvas);
    // game.updateScoreFontSize();
    game.ball.size = Math.min(canvas.width, canvas.height) * 0.01;

    oldHeight = canvas.height;

    game.P1.draw(game.context);
    game.P2.draw(game.context);
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
