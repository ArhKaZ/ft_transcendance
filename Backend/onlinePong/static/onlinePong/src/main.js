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

document.addEventListener("DOMContentLoaded", async () => {
    socket = await createGame();

    document.getElementById('buttonStart').addEventListener('click', async () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    'action': 'ready',
                    'sessionId': session_id
                }));
            } else {
                console.error("WebSocket n'est pas prêt");
            }
        });
})

async function createGame() {
    try {
        const response = await fetch(`./api/create_or_join_game?session_id=${session_id}`);
        const data = await response.json();
        const game_id = data.game_id;
        const socket = new WebSocket(`ws://0.0.0.0:8000/ws/onlinePong/${game_id}/${session_id}`);

        socket.onopen = function() {
            console.log("WebSocket connecter");
        };

          socket.onmessage = function (e) {
            const data = JSON.parse(e.data);
            const message = data['message'];
            if (message === 'game_start') {
                init_game(game_id, session_id);
            }
            console.log("Message reçu:", message);
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


function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 'message': message}));
    } else {
        console.error("Websocket not ready");
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
    game.start();
}