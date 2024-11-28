import Player from "./game/player.js";
import Game from "./game/game.js";
import CountdownAnimation from "./game/countdownAnimation.js";
import {refreshPlayers, updatePlayerStatus, displayConnectedPlayer, displayWhenConnect } from "./game/waitingRoom.js";

let socket = null;
let currentPlayerId = null;
let keyState = {};
let currentGame = null;
let currentCountdown = null;
let startTime;
let totalTime;
let timerInterval;
let currentRound = 0;

function bindEvents() {
    const btn1 = document.getElementById("btn1");
    const btn2 = document.getElementById("btn2");
    const btn3 = document.getElementById("btn3");
    const btn4 = document.getElementById("btn4");

    btn1.addEventListener('click', () => handleClick('dark_bolt'));
    btn2.addEventListener('click', () => handleClick('fire_bomb'));
    btn3.addEventListener('click', () => handleClick('lightning'));
    btn4.addEventListener('click', () => handleClick('spark'));
}

function sendToBack(data) {
    if (socket?.readyState === WebSocket.OPEN) {
        console.debug('send : ', data);
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

function handleGameCancel(data) {
    alert(`Game is cancelled, player ${data.player_id} is gone`); // TODO Faire meilleur erreur
    window.location.href = '/home';
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
    const socket = new WebSocket(`ws://localhost:8000/ws/magicDuel/${gameId}/${playerId}/`);
    console.log('a l aide ');

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
    // const backCanvas = document.getElementById('mapCanvas');
    const gameCanvas = document.getElementById('gameCanvas');
    const attackCanvas = document.getElementById('attackCanvas');
    const P1 = new Player(1, gameCanvas, game_data.player1_name, game_data.player1_id, game_data.player1_lifes);
    const P2 = new Player(2, gameCanvas, game_data.player2_name, game_data.player2_id, game_data.player2_lifes);
    return new Game(gameCanvas, attackCanvas, P1, P2);
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

        case 'game_start':
            handleGameStart(data, gameId, playerId);
            break;

        case 'countdown':
            await handleCountdown(data.countdown);
            break;

        case 'round_count':
            handleStartRound(data);
            break;

        case 'round_end':
            handleRoundEnd(data);
            break;

        case 'round_interaction':
            handleRoundInteraction(data);
            break;

        case 'player_attack':
            currentGame.playerAttack(data.player_id);
            break;

        case 'round_timer':
            console.log('got round_timer');
            startTimer(data);
            break;

        case 'looser':
            console.log('Game finished, id:', data.player_id);
            break;

        case 'debug':
            console.log(data.from);
            break;

        case 'game_cancel':
            handleGameCancel(data);
            break;
    }
}

function handleRoundEnd(data) {
    clearInterval(timerInterval);
    currentGame.toggleTimer(false);
}

function handleGameStart(data, gameId, playerId) {
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
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    currentCountdown = new CountdownAnimation('countdownCanvas');
}

async function handleCountdown(countdown) {
    await currentCountdown.displayNumber(countdown);
    if (countdown === 0) {
        currentCountdown.stopDisplay();
        currentGame.toggleCanvas(true);
        currentGame.toggleInfoPlayer(false);
        bindEvents();
        currentGame.fillUsernames();
        currentGame.fillLifeBar();
        currentGame.gameLoop(0);
        currentGame.toggleHudPlayer(true);
        currentGame.P1.playAnimationAttack('dark_bolt');
        currentGame.P2.playAnimationAttack('fire_bomb')
    }
}

function handleClick(choice) {
    sendToBack({ action: 'attack', choice: choice, player_id: currentPlayerId });
    currentGame.toggleButtons(false);
}

function handleStartRound(data) {
    currentRound = data.count;
    const roundE = document.getElementById('round-element');
    roundE.textContent = `Round ${data.count}`;
    roundE.classList.remove('hidden');
    roundE.classList.add('fade', 'fade-in');

    setTimeout(() => {
        roundE.classList.remove('fade-in');
        roundE.classList.add('fade-out');
    }, 2000);

    setTimeout(() => {
        roundE.classList.remove('fade', 'fade-out');
        roundE.textContent = '';
        roundE.classList.add('hidden');
        currentGame.toggleButtons(true);
    }, 3000)
}

function handleRoundInteraction(data) {
    if (data.player_id !== 0) {
        const pTakeDmg = currentGame.P1.id === data.player_id ? currentGame.P2 : currentGame.P1;
        pTakeDmg.playAnimationAttack(data.power);
        pTakeDmg.playAnimationPlayer('TakeHit');
        pTakeDmg.loosePv();
    }
    sendToBack({'action': 'finishAnim', 'player_id': currentPlayerId, 'round': currentRound});
}

function startTimer(data) {
    currentGame.toggleTimer(true);
    startTime = data.start_time * 1000;
    totalTime = data.total_time;

    timerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    const elapsedTime = (Date.now() - startTime) / 1000;
    const remainingTime = Math.max(totalTime - elapsedTime, 0);
    const timerE = document.getElementById('timer-element');
    timerE.textContent = `Timer : \n ${remainingTime.toFixed(1)}`;

    if (remainingTime <= 0) {
        currentGame.toggleTimer(false);
        clearInterval(timerInterval);
    }
}

function resizeCanvas() {
    const gameCanvas = document.getElementById('gameCanvas');
    const attackCanvas = document.getElementById('attackCanvas');
    const newWidth = document.getElementById('canvasContainer').offsetWidth;
    const newHeight = document.getElementById('canvasContainer').offsetHeight;

    [gameCanvas, attackCanvas].forEach(canvas => {
        canvas.width = newWidth;
        canvas.height = newHeight;

        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
    });

    if (currentGame) {
        currentGame.updateCanvas(gameCanvas, attackCanvas);
        currentGame.P1.updatePos(gameCanvas);
        currentGame.P2.updatePos(gameCanvas);
        // TODO Deplacer joueur + changer taille bouton
    }
}

document.addEventListener('DOMContentLoaded', init);