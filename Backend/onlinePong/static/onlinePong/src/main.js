import Game from "../src/game/game.js";
import Player from "../src/game/player.js";

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
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = error.message;
            errorElement.style.display = 'block';
        } else {
            alert(error.message);
        }
    }
}

async function updatePlayerStatus(playerId, gameId) {
    try {
        const response = await fetch(`./api/get_player?game_id=${gameId}&player_id=${playerId}`);
        const data = await response.json();
        const playerNumber = data.player_number;
        const waitingAnimation = document.getElementById(`p${playerNumber}-waiting-animation`);
        const joinedAnimation = document.getElementById(`p${playerNumber}-joined-animation`);

        waitingAnimation.classList.add('hidden');
        joinedAnimation.classList.remove('hidden');
    } catch (error) {
        console.error('Error updating player status:', error);
    }
}

async function createGame(currentPlayer) {
    currentPlayerId = currentPlayer.id;
    const currentPlayerName = currentPlayer.username;
    try {
        const response = await fetch(`./api/create_or_join_game?player_id=${currentPlayerId}&player_name=${currentPlayerName}`);
        const data = await response.json();
        const gameId = data.game_id;
        displayWhenConnect(data);
        return setupWebSocket(gameId, currentPlayerId);
    } catch (error) {
        console.error('Error creating game:', error);
    }
}

function setupWebSocket(gameId, playerId) {
    const socket = new WebSocket(`ws://localhost:8000/ws/onlinePong/${gameId}/${playerId}`);
    let game = null;

    socket.onopen = () => {
        console.log("WebSocket connected");
        // sendToBack({ action: 'get_players', game_id: gameId });
    };

    socket.onmessage = async (e) => {
        game = await handleWebSocketMessage(e, game, gameId, playerId);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error.type);
    socket.onclose = () => console.log("WebSocket closed");

    window.addEventListener("resize", () => resizeCanvasGame(game));

    return socket;
}

function displayWhenConnect(data) {
    const elements = {
        player: {
            username: document.getElementById('p1-username'),
            img: document.getElementById('p1-img'),
            waitingAnim: document.getElementById('p1-waiting-animation'),
            joinedAnim: document.getElementById('p1-joined-animation'),
        },
        opponent: {
            username: document.getElementById('p2-username'),
            img: document.getElementById('p2-img'),
            waitingAnim: document.getElementById('p2-waiting-animation'),
            joinedAnim: document.getElementById('p2-joined-animation'),
        }
    };

    const playerData = {
        name: data.player1_name,
        isMe: data.player1_is_me,
        exists: true,
        isReady: data.player1_ready,
    }

    const opponentData = {
        name: data.player2_name,
        isMe: !data.player1_is_me,
        exists: !!data.player2_name,
        isReady: data.player2_ready,
    }

    updatePlayerDisplay(elements.player, playerData);
    updatePlayerDisplay(elements.opponent, opponentData);
}

function updatePlayerDisplay(elements, data) {
    if (data.isMe || data.exists) {
        elements.username.innerText = data.name;
        elements.username.classList.remove('hidden');
        elements.img.classList.remove('hidden');
        if (data.isReady)
            elements.joinedAnim.classList.remove('hidden');
        else
            elements.waitingAnim.classList.remove('hidden');
    }
}

async function initGame(gameId, playerId) {
    const canvas = document.getElementById('gameCanvas');
    const response = await fetch(`./api/get_player?game_id=${gameId}&player_id=${playerId}`);
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
    console.log(data);
    switch(data.type) {
        case 'players_info':
            console.log('hello!');
            refreshPlayers(data, game);
            break;
        case 'player_connected':
            displayConnectedPlayer(data.player_id, data.player_name);
            break;
        case 'player_ready':
            updatePlayerStatus(data.player_id, gameId);
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
                handleGameFinish(game, data.winning_session);
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

function handleGameFinish(game, winningId) {
    const winnerName = parseInt(game.P1.id) === parseInt(winningId) ? game.P1.name : game.P2.name;
    game.displayWinner(winnerName);
}

function displayConnectedPlayer(playerId, playerName) {
    const isPlayer1 = parseInt(playerId) === currentPlayerId;
    const elementId = isPlayer1 ? 'p1' : 'p2';
    const nameElement = document.getElementById(`${elementId}-username`);
    const imgElement = document.getElementById(`${elementId}-img`);
    const waitingAnimElement = document.getElementById(`${elementId}-waiting-animation`);
    if (nameElement.classList.contains('hidden')) {
        nameElement.innerText = playerName;
        nameElement.classList.remove('hidden');
        imgElement.classList.remove('hidden');
        waitingAnimElement.classList.remove('hidden');
    }
}

function refreshPlayers(data, game) {
    console.log('Refreshing players:', data);
    const p1Element = document.getElementById('p1-username');
    const p1WaitingElement = document.getElementById('p1-waiting-animation');
    const p1JoinedElement = document.getElementById('p1-joined-animation');
    const p2Element = document.getElementById('p2-username');
    const p2ImgElement = document.getElementById('p2-img');
    const p2WaitingElement = document.getElementById('p2-waiting-animation');
    const p2JoinedElement = document.getElementById('p2-joined-animation');

    // Mise à jour du joueur 1
    p1Element.innerText = data.player1_name || 'None';
    p1Element.classList.toggle('hidden', !data.player1_name);
    p1WaitingElement.classList.toggle('hidden', data.player1_ready);
    p1JoinedElement.classList.toggle('hidden', !data.player1_ready);

    // Mise à jour du joueur 2
    p2Element.innerText = data.player2_name || 'None';
    p2Element.classList.toggle('hidden', !data.player2_name);
    p2ImgElement.classList.toggle('hidden', !data.player2_name);
    p2WaitingElement.classList.toggle('hidden', !data.player2_name || data.player2_ready);
    p2JoinedElement.classList.toggle('hidden', !data.player2_name || !data.player2_ready);

    // Mise à jour des objets du jeu si nécessaire
    if (game) {
        if (game.P1 && game.P1.id === data.player1) {
            game.P1.name = data.player1_name;
        } else if (game.P2 && game.P2.id === data.player1) {
            game.P1 = game.P2;
            game.P1.name = data.player1_name;
            game.P2 = null;
        }

        if (data.player2) {
            if (!game.P2) {
                game.P2 = new Player(data.player2, data.player2_name, false);
            } else {
                game.P2.id = data.player2;
                game.P2.name = data.player2_name;
            }
        } else {
            game.P2 = null;
        }
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