import { getCSRFToken } from '/js/utils.js';
import Player from "./game/player.js";
import Game from "./game/game.js";
import CountdownAnimation from "../countdownAnimation.js";
import {creationGameDisplay, updatePlayerStatus, displayWhenLoad, playerLeave } from "./game/waitingRoom.js";

let socket = null;
let currentPlayerId = null;
let keyState = {};
let currentGame = null;
let currentCountdown = null;
let startTime;
let totalTime;
let timerInterval;
let currentRound = 0;
let currentGameId = null;
let asFinishedAnim = false;

function bindEvents() {
	const btn1 = document.getElementById("btn1");
	const btn2 = document.getElementById("btn2");
	const btn3 = document.getElementById("btn3");
	const btn4 = document.getElementById("btn4");
	const btnBook = document.getElementById('openBook');
	const bookOverlay = document.getElementById("bookOverlay");

	btn1.addEventListener('click', () => handleClick('dark_bolt'));
	btn2.addEventListener('click', () => handleClick('fire_bomb'));
	btn3.addEventListener('click', () => handleClick('lightning'));
	btn4.addEventListener('click', () => handleClick('spark'));
	btnBook.addEventListener("click", () => handleOpenBook());
}

function handleOpenBook() {
	const bookOverlay = document.getElementById("bookOverlay");
	const imgBookOpen = document.getElementById("img-book-open");
	const imgBookClosed = document.getElementById("img-book-closed");

	if (bookOverlay.classList.contains("hidden")) {
		imgBookClosed.classList.add("hidden");
		imgBookOpen.classList.remove("hidden");
		bookOverlay.classList.remove("hidden");
	} else {
		imgBookOpen.classList.add("hidden");
		imgBookClosed.classList.remove("hidden");
		bookOverlay.classList.add("hidden");
	}
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
        const response = await fetch('/api/get-my-info/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
            },
            credentials: 'include',
        });
        if (!response.ok) {
            console.log("error reponse");
            const errorData = await response.json();
            throw new Error(errorData.error || "Error getting user");
        }
        const data = await response.json();
        console.log('data:', data);
        return await data;
    } catch (error) {
        alert("Need to be logged");
        window.location.href = '/home/';
        console.error("Error when getting user:", error);
        throw error;
    }
}

function handleError(error) {
	if (error.message.includes("No token") || error.message.includes("Invalid Token") || error.message.includes("User does not exist")) {
		alert("You need to connect before playing");
		window.location.href = '/home/';
	} else {
		alert(error.message);
	}
}

function handleGameCancel(data) {
	if (!data.message) {
		alert(`Player ${data.username} left`);
		if (data.game_status === "WAITING")
		{
			window.location.href = '/home/';
		}
		else { //Gerer les lp 
			window.location.href = '/home/';
		}
	} else {
		alert(data.message);
		window.location.href = '/home/';
	}
}

async function init() {
	try {
		const user = await getUserFromBack();
		displayWhenLoad(user);
		socket = setupWebSocket(user);
	} catch (error) {
		handleError(error);
	}
}

function setupWebSocket(user) {
	currentPlayerId = user.id;
	const id = user.id.toString()
	const socket = new WebSocket(`wss://127.0.0.1:8443/ws/magicDuel/${id}/`);
	let game = null;

	socket.onopen = () => {
		console.log("WEBSOCKET CONNECTED");
		sendToBack({
			action: 'search',
			player_id: user.id,
			player_name: user.username,
			player_avatar: user.avatar,
			player_lp: user.ligue_points
		});
	}

	socket.onmessage = async (e) => {
		await handleWebSocketMessage(e);
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
	const gameCanvas = document.getElementById('gameCanvas');
	const attackCanvas = document.getElementById('attackCanvas');
	const P1 = new Player(1, gameCanvas, game_data.player1_name, game_data.player1_id, game_data.player1_avatar, game_data.player1_lifes);
	const P2 = new Player(2, gameCanvas, game_data.player2_name, game_data.player2_id, game_data.player2_avatar, game_data.player2_lifes);
	return new Game(gameCanvas, attackCanvas, P1, P2);
}

async function handleWebSocketMessage(event) {
	const data = JSON.parse(event.data);
	switch(data.type) {

		case 'players_info':
			console.log(data)
			currentGameId = data.game_id;
			creationGameDisplay(data, currentGame);
			sendToBack({action: 'findGame', game_id: currentGameId})
			document.getElementById('button-ready').addEventListener('click', () => {
				sendToBack({action: 'ready', game_id: currentGameId})
			})
			break;

		case 'player_ready':
			await updatePlayerStatus(data.player_number);
			break;

		case 'game_start':
			handleGameStart(data);
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
			currentGame.getPlayer(data.player_id).playAnimationPlayer('Attack');
			break;

		case 'round_timer':
			startTimer(data);
			break;

		case 'game_end':
			handleGameFinish(data);
			break;

		case 'debug':
			console.log(data.from);
			break;

		case 'game_cancel':
			handleGameCancel(data);
			break;

		case 'error':
			alert('Error : ' + data.message);
			window.location.href = '/home/';
	}
}

function handleRoundEnd(data) {
	clearInterval(timerInterval);
	currentGame.toggleTimer(false);
	document.getElementById('choiceButtons').classList.add('hidden');
}

function handleGameStart(data) {
	currentGame = createGame(data);

	if (!currentGame || !currentGame.P1 || !currentGame.P2) {
		throw new Error('Game creation failed');
	}
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
		currentGame.toggleButtonTuto(true);
		bindEvents();
		currentGame.fillUsernames();
		currentGame.gameLoop(0);
		currentGame.toggleHudPlayer(true);
	}
}

function handleGameFinish(data) {
	while (!asFinishedAnim) {;}
	setTimeout(() => {
		currentGame.displayWinner(data.player_id);
		sendMatchApi(data.player_id);
	}, 500);
}

function sendMatchApi(winningId) {
	const opponentName = currentPlayerId === parseInt(currentGame.P1.id) ? currentGame.P2.name : currentGame.P1.name;
    const asWin = currentPlayerId === parseInt(winningId);
    fetch('/api/add_match/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
            'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
        },
        credentials: 'include',
        body: JSON.stringify({
            'type': 'magicDuel',
            'opponent_name': opponentName,
            'won': asWin
        })
    }).then(response => response.json())
    .then(data => {
        console.log('Match enregistrer ', data);
    }).catch(error => console.error(error));
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
	asFinishedAnim = false;
	if (data.player_id !== 0) {
		const pTakeDmg = currentGame.P1.id === data.player_id ? currentGame.P2 : currentGame.P1;
		pTakeDmg.playAnimationAttack(data.power);
		setTimeout(() => {
			pTakeDmg.playAnimationPlayer('TakeHit');
			pTakeDmg.loosePv();
		}, 1000);
	} else {
		const equE = document.getElementById('draw');
		equE.textContent = 'Draw';
		equE.classList.remove('hidden');
		setTimeout(() => {
			equE.classList.add('hidden');
		}, 1500);
	}
	asFinishedAnim = true;
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
		currentGame.updateImageSize(gameCanvas);
		currentGame.updateCanvas(gameCanvas, attackCanvas);
		currentGame.P1.updatePos(gameCanvas, currentGame.plat);
		currentGame.P2.updatePos(gameCanvas, currentGame.plat);
	}
}

init();

