import Player from "./game/player.js";
import Game from "./game/game.js";
import {refreshPlayers, updatePlayerStatus, displayConnectedPlayer, displayWhenConnect } from "./game/waitingRoom.js";

let socket = null;
let currentPlayerId = null;
let keyState = {};

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
    console.log('ws1');
    const socket = new WebSocket(`ws://localhost:8000/ws/pixelPaws/${gameId}/${playerId}/`);
    let game = null;
    console.log('ws2')
    socket.onopen = () => {
        console.log("WEBSOCKET CONNECTED");
    };

    socket.onmessage = async (e) => {
        game = await handleWebSocketMessage(e, game, gameId, playerId);
    };

    socket.onerror = (error) => console.error("Websocket error:", error);
    socket.onclose = () => console.log("WEBSOCKET CLOSED");
    return socket;
}

function createGame(game_data) {
    const canvas = document.getElementById('gameCanvas');
    const P1 = new Player(1, game_data.player1_name, game_data.player1_id);
    const P2 = new Player(2, game_data.player2_name, game_data.player2_id);
    const game = new Game(canvas, P1, P2);
    return game;
}

async function handleWebSocketMessage(event, game, gameId, playerId) {
    const data = JSON.parse(event.data);
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
        case 'game_start':
            console.log(data);
            game = createGame(data);
            resizeCanvas();
            game.start();
            window.addEventListener('resize', resizeCanvas);
            bindEvents();

            setInterval(() => {
                sendToBack({
                    action: 'key_inputs',
                    playerId: playerId,
                    inputs: keyState,
                })
            }, 20);

            break;
    }
    return game;
}

function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');

    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
}

document.addEventListener('DOMContentLoaded', init);
