import Game from "../src/game/game.js";
import Player from "../src/game/player.js";

let socket = null;
let oldHeight = null;
let asStart = false;

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
            }, 10);
        }
        if (event.key === 'ArrowDown') {
            sendToBack(JSON.stringify({ 'action': 'move', 'direction': 'down', 'session_id': session_id }));
            movementInvertal = setInterval(() => {
                sendToBack(JSON.stringify({ 'action': 'move', 'direction': 'down', 'session_id': session_id }));
            }, 10);
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
            game = await handleWebSOnMessage(e, game, game_id, session_id);
        };

        socket.onerror = function (error) {
            console.error("Erreur WebSocket:", error);
        };

        socket.onclose = function () {
            console.log("WebSocket fermé");
        };

        window.addEventListener("resize", function() { resizeCanvasGame(game) });

        return socket;
    } catch (error) {
        console.log('Error creating game', error);
    }
}

async function initGame(game_id, session_id) {
    const canvas = document.getElementById('gameCanvas');
    const response = await fetch(`./api/get_player?game_id=${game_id}&session_id=${session_id}`);
    const data = await response.json();
    let P1 = null;
    let P2 = null;

    oldHeight = canvas.height;

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

async function handleWebSOnMessage(e, game, game_id, session_id) {
    const data = JSON.parse(e.data);

    if (data.message === 'game_start') {
        game = await initGame(game_id, session_id);
        game.start();
        asStart = true;
        resizeCanvasGame(game);
        console.log('cc');
    } if (data.type === 'ball_position') {
        if (game) {
            console.log('ball_pos:1');
            game.updateBallPosition(data.x, data.y);
        }
    } if (data.type === 'player_move') {
        if (game) {
            const session_id_player = data.session_id;
            const response = await fetch(`./api/get_player?game_id=${game_id}&session_id=${session_id_player}`);
            const data_player = await response.json();
            game.updatePlayerPosition(data_player.nb_player, data.y);
        }
    } if (data.type === 'game_finish') {
        game.displayWinner()
    } if (data.type === 'score_update') {
        if (game) {
            console.log(data.score);
            game.updateScores(data.score);
        }
    }
    return game;
}

function resizeCanvasGame(game) {
    const canvas = document.getElementById('gameCanvas');
    console.log('resize:1');
    if (asStart) {
        console.log('resize:2');
        canvas.width = window.innerWidth * 0.6;
        canvas.height = window.innerHeight * 0.8;
        game.P1.paddle.width = canvas.width * 0.01;
        game.P1.paddle.height = canvas.height * 0.15;
        game.P2.paddle.width = canvas.width * 0.01;
        game.P2.paddle.height = canvas.height * 0.15;
        game.P2.paddle.x = canvas.width - 20;
        game.P1.paddle.y = (game.P1.paddle.y / oldHeight) * canvas.height;
        game.P2.paddle.y = (game.P2.paddle.y / oldHeight) * canvas.height;
        game.ball.size = canvas.width * 0.01;
        oldHeight = canvas.height;
        game.P1.draw(game.context);
        game.P2.draw(game.context);
    }
}