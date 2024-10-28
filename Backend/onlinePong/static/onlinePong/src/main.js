import Game from "../src/game/game.js";
import Player from "../src/game/player.js";
import {refreshPlayers, updatePlayerStatus, displayConnectedPlayer, displayWhenConnect } from "./game/waitingRoom.js";

let socket = null;
let oldHeight = null;
let gameStarted = false;
let currentPlayerId = null;

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
        console.log(data);
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
        game = await handleWebSocketMessage(e, game, gameId, playerId);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error.type);
    socket.onclose = () => console.log("WebSocket closed");

    window.addEventListener("resize", () => resizeCanvasGame(game));

    return socket;
}

async function initGame(gameId, playerId) {
    const canvas = document.getElementById('gameCanvas');
    const response = await fetch(`api/get_player/?game_id=${gameId}&player_id=${playerId}`);
    const data = await response.json();

    oldHeight = canvas.height;
    const [P1, P2] = createPlayers(data);
    return new Game(canvas, P1, P2);
}

function createPlayers(data) {
    const mainPlayer = new Player(data.player_id, data.player_name, data.player_number === 1);
    const opponent = new Player(data.opponent_id, data.opponent_name, data.player_number === 2);
    return data.player_number === 1 ? [mainPlayer, opponent] : [opponent, mainPlayer];
}

async function handleWebSocketMessage(e, game, gameId, playerId) {
    const data = JSON.parse(e.data);
    switch(data.type) {
        case 'players_info':
            refreshPlayers(data, game);
            break;
        case 'player_connected':
            displayConnectedPlayer(data.player_id, data.player_name, data.player_avatar, currentPlayerId);
            break;
        case 'player_ready':
            await updatePlayerStatus(data.player_id, gameId);
            break;
        case 'ball_position':
            if (game) {
                game.updateBallPosition(data.x, data.y);
                game.drawGame();
            }
            break;
        case 'player_move':
            if (game) updatePlayerPosition(game, data);
            break;
        case 'score_update':
            if (game) game.updateScores(data.score);
            break;
        case 'game_finish':
            if (game) {
                handleGameFinish(game, data.winning_session, data.opponent_name);
                gameStarted = false;
                game.stop();
            }
            break;
    }
    if (data.message === 'game_start') {
        game = await initGame(gameId, playerId);
        game.start();
        gameStarted = true;
        resizeCanvasGame(game);
    }
    return game;
}

function updatePlayerPosition(game, data) {
    const playerNumber = parseInt(data.player_id) === parseInt(game.P1.id) ? 1 : 2;
    game.updatePlayerPosition(playerNumber, data.y);
}


function handleGameFinish(game, winningId, opponent) {
    const winnerName = parseInt(game.P1.id) === parseInt(winningId) ? game.P1.name : game.P2.name;
    game.displayWinner(winnerName);


	if (currentPlayerId === winningId) {
		// j'ai gagné
		fetch('/api/add_match/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'), // Si vous utilisez CSRF protection
			},
			credentials: 'include',  // Important pour inclure les cookies
			body: JSON.stringify({
				'opponent_name': opponent, // Remplacez par le vrai nom de l'adversaire
				'won': true
			})
		})
		.then(response => response.json())
		.then(data => console.log('Match enregistré:', data))
		.catch(error => console.error('Erreur:', error));
	} else {
		// j'ai perdu
		fetch('/api/add_match/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'), // Si vous utilisez CSRF protection
			},
			credentials: 'include',  // Important pour inclure les cookies
			body: JSON.stringify({
				'opponent_name': opponent, // Remplacez par le vrai nom de l'adversaire
				'won': false
			})
		})
		.then(response => response.json())
		.then(data => console.log('Match enregistré:', data))
		.catch(error => console.error('Erreur:', error));
	}
}

function resizeCanvasGame(game) {
    if (!gameStarted || !game) return;

    const canvas = document.getElementById('gameCanvas');
    const textInfoP1 = document.getElementById('p1-username');
    const textInfoP2 = document.getElementById('p2-username');

    canvas.width = window.innerWidth * 0.6;
    canvas.height = window.innerHeight * 0.8;

    updatePaddleDimensions(game, canvas);
    updateBallSize(game, canvas);
    updateFontSizes(game, canvas, textInfoP1, textInfoP2);

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

function updateBallSize(game, canvas) {
    game.ball.size = Math.min(canvas.width, canvas.height) * 0.01;
}

function updateFontSizes(game, canvas, textInfoP1, textInfoP2) {
    game.updateScoreFontSize();
    const fontSize = Math.min(canvas.width, canvas.height) * 0.05;
    textInfoP1.style.fontSize = `${fontSize}px`;
    textInfoP2.style.fontSize = `${fontSize}px`;
}