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

async function getUserFromBack() {
    try {
        const response = await fetch('logged_get_user/');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Getting user error");
        }
        const data_player = await response.json();
        console.log(data_player);
        return data_player
    } catch (error) {
        console.log("error when get user : ", error);
        throw error;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await getUserFromBack();
    } catch (error) {
        if (error.message.includes("No token") || error.message.includes("Invalid Token")) {
            alert("You need to connect before play")
            window.location.href = '/home/';
        } else {
            const errorElement = document.getElementById('error-message'); // Voir si je fais ca 
            if (errorElement) {
                errorElement.textContent = error.message;
                errorElement.style.display = 'block';
            } else {
                alert(error.message);
            }
        }
    }
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
    } if (data.type === 'ball_position') {
        if (game) {
            game.updateBallPosition(data.x, data.y);
            game.drawGame();
        }
    } if (data.type === 'player_move') {
        if (game) {
            const sessionIdPlayer = data.session_id;
            const nbPlayer = getNbPlayer(sessionIdPlayer, game_id);
            game.updatePlayerPosition(nbPlayer, data.y);
        }
    } if (data.type === 'game_finish') {
        const winnerSession = data.winning_session;
        const nbPlayer = getNbPlayer(winnerSession, game_id);
        game.displayWinner(nbPlayer)
    } if (data.type === 'score_update') {
        if (game) {
            game.updateScores(data.score);
        }
    }
    return game;
}

async function getNbPlayer(session_id_player, game_id) {
    const response = await fetch(`./api/get_player?game_id=${game_id}&session_id=${session_id_player}`);
    const data_player = await response.json();
    return data_player.nb_player;
}

function resizeCanvasGame(game) {
    const canvas = document.getElementById('gameCanvas');
    if (asStart) {
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