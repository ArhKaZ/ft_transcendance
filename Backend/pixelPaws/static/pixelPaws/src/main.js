import Player from "./game/player.js";
import Game from "./game/game.js";
import Gamemap from "./game/gamemap.js";
import {refreshPlayers, updatePlayerStatus, displayConnectedPlayer, displayWhenConnect } from "./game/waitingRoom.js";

let socket = null;
let currentPlayerId = null;
let keyState = {};

let gameInitialized = false;
let messageQueue = [];

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
    let game = null;

    socket.onopen = () => {
        console.log("WEBSOCKET CONNECTED");
        gameInitialized = false;
        messageQueue = [];
    };

    socket.onmessage = async (e) => {
        game = await handleWebSocketMessage(e, game, gameId, playerId);
    };

    socket.onerror = (error) => {
        console.error("Websocket error:", error);
        gameInitialized = false;
    };

    socket.onclose = () => {
        console.log("WEBSOCKET CLOSED");
        gameInitialized = false;
        if (window.gameLoopInterval) {
            clearInterval(window.gameLoopInterval);
        }
    };

    return socket;
}

function createGame(game_data) {
    const canvas = document.getElementById('gameCanvas');
    const gameMap = new Gamemap(canvas, game_data.map_x, game_data.map_y, game_data.map_height, game_data.map_width, game_data.map_ground_y, game_data.map_ground_x, game_data.back_src, game_data.stage_src);
    const P1 = new Player(1, canvas, game_data.player1_name, game_data.player1_id, game_data.player1_x, game_data.player1_y, game_data.player1_percent, game_data.player1_lifes);
    const P2 = new Player(2, canvas, game_data.player2_name, game_data.player2_id, game_data.player2_x, game_data.player2_y, game_data.player2_percent, game_data.player2_lifes);
    const game = new Game(canvas, P1, P2, gameMap);
    return game;
}

async function handleWebSocketMessage(event, game, gameId, playerId) {
    const data = JSON.parse(event.data);

    console.log(`Received message type: ${data.type}`, {
        gameExists: !!game,
        gameInitialized,
        timestamp: new Date().toISOString()
    });

    if (data.type === 'game_start' && !gameInitialized) {
        game = await handleGameStart(data, gameId, playerId);
        gameInitialized = true;

        while (messageQueue.length > 0) {
            const queuedMessage = messageQueue.shift();
            console.log('Processing queued message: ', queuedMessage.type);
            await handleGameMessage(queuedMessage, game, gameId, playerId);
        }
        return game;
    }

    if (data.type === 'game_start' && gameInitialized) {
        console.log("Ignore game_start because game is initialized");
        return game;
    }

    if (!gameInitialized && ['animation'].includes(data.type)) {
        console.log('Queuing message:', data.type);
        messageQueue.push(data);
        return game;
    }

    return await handleGameMessage(data, game, gameId, playerId);
}

async function handleGameStart(data, gameId, playerId) {
    resizeCanvas();
    console.log('Initializing game...', {gameId, playerId});
    const game = createGame(data);

    if (!game || !game.P1 || !game.P2) {
        console.error("Game creation failed", {
            gameExists: !!game,
            P1Exists: !!game.P1,
            P2Exists: !!game.P2
        });
        throw new Error('Game creation failed');
    }
    console.log('Game created !', {
        P1: {id: game.P1.id, name: game.P1.name},
        P2: {id: game.P2.id, name: game.P2.name},
    });

    game.start();
    window.addEventListener('resize', resizeCanvas);
    bindEvents();

    setupGameLoop(game, playerId);
    return game;
}

function setupGameLoop(game, playerId) {
    if (window.gameLoopInterval) {
        clearInterval(window.gameLoopInterval);
    }

    window.gameLoopInterval = setInterval(() => {
        if (!gameInitialized) {
            console.warn("Game loop running but game not initialized");
            return;
        }

        const currentKeyState = {...keyState};
        sendToBack({
            action: 'key_inputs',
            playerId: playerId,
            inputs: currentKeyState,
        });
    }, 20);
}

async function handleGameMessage(data, game, gameId, playerId) {
    switch(data.type) {
        case 'players_info':
            refreshPlayers(data, game);
            break;

        case 'player_connected':
            displayConnectedPlayer(data.player_id, data.username, data.avatar, currentPlayerId);
            break;

        case 'player_ready':
            await updatePlayerStatus(data.player_id, gameId);
            break;

        case 'animation':
            handleAnimation(data, game);
            break;
    }
    return game;
}

function handleAnimation(data, game) {
    if (!gameInitialized) {
        console.error('Received animation before game initialization');
        return;
    }

    if (!game || !game.P1 || !game.P2) {
        console.error('Invalid game state during animation:', {
            gameExists: !!game,
            P1Exists: !!game?.P1,
            P2Exists: !!game?.P2,
            timestamp: new Date().toISOString()
        });
        return game;
    }

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

        player.stopAnimation();
        player.startAnimation(data, game);
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
    const canvas = document.getElementById('gameCanvas');

    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
}

document.addEventListener('DOMContentLoaded', init);
