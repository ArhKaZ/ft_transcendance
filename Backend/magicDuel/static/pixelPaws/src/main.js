import Player from "./game/player.js";
import Game from "./game/game.js";
import GameMap from "./game/GameMap.js";
import {refreshPlayers, updatePlayerStatus, displayConnectedPlayer, displayWhenConnect } from "./game/waitingRoom.js";

let socket = null;
let currentPlayerId = null;
let keyState = {};
let currentGame = null;

function bindEvents() {
    window.addEventListener('keydown', (event) => {
        keyState[event.key] = true;
    });

    window.addEventListener('keyup', (event) => {
        keyState[event.key] = false;
    });
}

function sendToBack(data) {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.error("Websocket not ready");
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

function handleError(error) {
    if (error.message.includes("No token") || error.message.includes("Invalid Token") || error.message.includes("User does not exist")) {
        alert("You need to connect before playing");
        window.location.href = '/home';
    } else {
        alert(error.message);
    }
}

async function addPlayerToGame(currentPlayer) {
    currentPlayerId = currentPlayer.id;
    const playerData = {
        player_id: currentPlayer.id,
        username: currentPlayer.username,
        avatar: currentPlayer.src_avatar,
    };
    try {
        const response = await fetch ('api/create_or_join_game/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(playerData),
        });

        const gameState = await response.json();
        const gameId = gameState.game.game_id;
        displayWhenConnect(gameState);
        return setupWebSocket(gameId, currentPlayer.id);
    } catch (error) {
        console.log(error);
    }
}

async function init() {
    try {
        const currentPlayer = await getUserFromBack();
        const playerId = currentPlayer.id;
        socket = await addPlayerToGame(currentPlayer);

        document.getElementById('buttonStart').addEventListener('click', () => {
            sendToBack({ action: 'ready', player_id: playerId})
        });
    } catch (error) {
        handleError(error);
    }
}

function setupWebSocket(gameId, playerId) {
    const socket = new WebSocket(`ws://localhost:8000/ws/pixelPaws/${gameId}/${playerId}/`);

    socket.onopen = () => {
        console.log("WEBSOCKET CONNECTED");
    };

    socket.onmessage = async (e) => {
        await handleWebSocketMessage(e, gameId, playerId);
    };

    socket.onerror = (error) => {
        console.error("Websocket error:", error);
    };

    socket.onclose = () => {
        console.log("WEBSOCKET CLOSED");
    };

    return socket;
}

function createGame(game_data) {
    const backCanvas = document.getElementById('backgroundCanvas');
    const gameCanvas = document.getElementById('gameCanvas');
    const P1 = new Player(1, gameCanvas, game_data.player1_name, game_data.player1_id, game_data.player1_lifes);
    const P2 = new Player(2, gameCanvas, game_data.player2_name, game_data.player2_id, game_data.player2_lifes);
    return new Game(backCanvas, gameCanvas, P1, P2);
}

async function handleWebSocketMessage(event, gameId, playerId) {
    const data = JSON.parse(event.data);
    switch(data.type) {
        case 'players_info':
            refreshPlayers(data, currentGame);
            break;
        case 'player_connected':
            displayConnectedPlayer(data.player_id, data.username, data.avatar, currentPlayerId);
            break;

        case 'player_ready':
            await updatePlayerStatus(data.player_id, gameId);
            break;

        case 'animation':
            handleAnimation(data, currentGame);
            break;

        case 'game_start':
            await handleGameStart(data, gameId, playerId);
            break;
    }
}

async function handleGameStart(data, gameId, playerId) {
    resizeCanvas();
    console.log('Initializing game...', {gameId, playerId});
    currentGame = createGame(data);

    if (!currentGame || !currentGame.P1 || !currentGame.P2) {
        console.error("Game creation failed", {
            gameExists: !!currentGame,
            P1Exists: !!currentGame.P1,
            P2Exists: !!currentGame.P2
        });
        throw new Error('Game creation failed');
    }
    console.log('Game created !', {
        P1: {id: currentGame.P1.id, name: currentGame.P1.name},
        P2: {id: currentGame.P2.id, name: currentGame.P2.name},
    });

    currentGame.start();
    window.addEventListener('resize', resizeCanvas);
    bindEvents();

    setupGameLoop(currentGame, playerId);
}

function setupGameLoop(game, playerId) {
    if (window.gameLoopInterval) {
        clearInterval(window.gameLoopInterval);
    }

    window.gameLoopInterval = setInterval(() => {
        const currentKeyState = {...keyState};
        sendToBack({
            action: 'key_inputs',
            playerId: playerId,
            inputs: currentKeyState,
        });
    }, 20);

    game.drawPlayers();
}

function handleAnimation(data, game) {
    try {
        const player = data.player_id === game.P1.id ? game.P1 :
            data.player_id === game.P2.id ? game.P2 : null;

        if (!player) {
            console.error('Invalid player ID for animation:', {
                receivedId: data.player_id,
                P1Id: game.P1.id,
                P2Id: game.P2.id
            });
            return;
        }

        player.handlePosOrAnim(data, game.gameCtx, game.gameCanvas);
        game.drawPlayers();

    } catch (error) {
        console.error('Animation error:', error, {
            messageData: data,
            gameState: {
                P1Id: game?.P1?.id,
                P2Id: game?.P2?.id
            }
        });
    }
}

function resizeCanvas() {
    const backCanvas = document.getElementById('backgroundCanvas');
    const gameCanvas = document.getElementById('gameCanvas');

    backCanvas.width = window.innerWidth * 0.8;
    backCanvas.height = window.innerHeight * 0.8;
    gameCanvas.width = window.innerWidth * 0.8;
    gameCanvas.height = window.innerHeight * 0.8;
}

document.addEventListener('DOMContentLoaded', init);