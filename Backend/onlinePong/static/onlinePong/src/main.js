import Game from "../src/game/game.js";
import Player from "../src/game/player.js";
let socket = null;

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const session_id = generateUUID();


function sendToBack(json) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(json);
    } else {
        console.error("Websocket not ready");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    socket = await createGame();

    document.getElementById('buttonStart').addEventListener('click', async () => {
           sendToBack(JSON.stringify({
                    'action': 'ready',
                    'sessionId': session_id
                }));
        });

    let movementInvertal = null;
    window.addEventListener('keydown', (event) => {
        if (movementInvertal === null) {
        if (event.key === 'ArrowUp') {
            console.log('session_id:' ,session_id);
            sendToBack(JSON.stringify({ 'action': 'move', 'direction': 'up', 'session_id': session_id }));
            movementInvertal = setInterval(() => {
                sendToBack(JSON.stringify({ 'action': 'move', 'direction': 'up', 'session_id': session_id }));
            }, 100);
        }
        if (event.key === 'ArrowDown') {
            sendToBack(JSON.stringify({ 'action': 'move', 'direction': 'down', 'session_id': session_id }));
            movementInvertal = setInterval(() => {
                sendToBack(JSON.stringify({ 'action': 'move', 'direction': 'down', 'session_id': session_id }));
            }, 100);
        }

        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            clearInterval(movementInvertal);
            movementInvertal = null;
        }
    });
})

async function createGame() {
    try {
        const response = await fetch(`./api/create_or_join_game?session_id=${session_id}`);
        const data = await response.json();
        const game_id = data.game_id;
        const socket = new WebSocket(`ws://0.0.0.0:8000/ws/onlinePong/${game_id}/${session_id}`);
        let game = null;
        socket.onopen = function() {
            console.log("WebSocket connecter");
        };

          socket.onmessage = async function (e) {
            const data = JSON.parse(e.data);
            if (data.message === 'game_start') {
                game = await init_game(game_id, session_id);
                game.start();
            }
            if (data.type === 'ball_position') {
                if (game) {
                    game.updateBallPosition(data.x, data.y);
                }
            }
            if (data.type === 'player_move') {
                if (game) {
                    const session_id_player = data.session_id;
                    const response = await fetch(`./api/get_player?game_id=${game_id}&session_id=${session_id_player}`);
                    const data_player = await response.json();
                    console.log(data.y);
                    game.updatePlayerPosition(data_player.nb_player, data.y);
                }
            }
        };

        socket.onerror = function (error) {
            console.error("Erreur WebSocket:", error);
        };

        socket.onclose = function () {
            console.log("WebSocket fermé");
        };

        return socket;
    } catch (error) {
        console.log('Error creating game', error);
    }
}

async function init_game(game_id, session_id) {
    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');
    const response = await fetch(`./api/get_player?game_id=${game_id}&session_id=${session_id}`);
    const data = await response.json();
    let P1 = null;
    let P2 = null;
    if (data.nb_player === 1) {
        P1 = new Player(1, true);
        P2 = new Player(2, false);
    } else {
        P1 = new Player(1, false);
        P2 = new Player(2, true);
    }
    const game = new Game(canvas, P1, P2);
    return game;
}

