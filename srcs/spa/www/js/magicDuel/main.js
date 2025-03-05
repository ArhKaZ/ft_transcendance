import { getCSRFToken } from '/js/utils.js';
import Player from "./game/player.js";
import Game from "./game/game.js";
import CountdownAnimation from "../countdownAnimation.js";
import {creationGameDisplay, updatePlayerStatus, displayWhenLoad, playerLeave } from "./game/waitingRoom.js";
import { getUserFromBack } from '/js/utils.js';

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
let currentInverval = null;
let asShowDeath = false;

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

async function init() {
	try {
		const user = await getUserFromBack();
		displayWhenLoad(user);
		socket = setupWebSocket(user);
	} catch (error) {
		handleErrors({message:error});
	}
}

function sendSearch(user) {
	const mainP = document.getElementById("info-main-player");
	if (!mainP.classList.contains('hidden'))
	{
		sendToBack({
			action: 'search',
			player_id: user.id,
			player_name: user.username,
			player_avatar: user.avatar,
			player_lp: user.ligue_points
		});
	} else {
		clearInterval(currentInverval);
	}
}

function setupWebSocket(user) {
	currentPlayerId = user.id;
	const id = user.id.toString();
	const currentUrl = window.location.host;
	const socket = new WebSocket(`wss://${currentUrl}/ws/magicDuel/${id}/`);
	
	socket.onopen = () => {
		console.log("WEBSOCKET CONNECTED");
		currentInverval = setInterval(() => sendSearch(user), 2000);
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
			handlePlayerInfo(data);
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

		case 'no_play':
			handleNoPlay(data);
			break;

		case 'error':
			handleErrors(data);
			break;
	}
}

function handlePlayerInfo(data) {
	currentGameId = data.game_id;
	creationGameDisplay(data, currentGame);
	sendToBack({action: 'findGame', game_id: currentGameId})
	document.getElementById('button-ready').addEventListener('click', () => {
		sendToBack({action: 'ready', game_id: currentGameId})
	})
}

function handleRoundEnd(data) {
	clearInterval(timerInterval);
	currentGame.toggleTimer(false);
	document.getElementById('choiceButtons').classList.add('hidden');
}

function handleQuitGame(event) {
	event.preventDefault();
	event.returnValue = true;
}

function handleGameStart(data) {
	currentGame = createGame(data);

	if (!currentGame || !currentGame.P1 || !currentGame.P2) {
		throw new Error('Game creation failed');
	}
	currentGame.start();
	resizeCanvas();
	window.addEventListener('resize', resizeCanvas);
	window.addEventListener("beforeunload", handleQuitGame);
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
	let checkAnim = setInterval(() => {
        if (asFinishedAnim) {
			clearInterval(checkAnim);
			window.removeEventListener('beforeunload', handleQuitGame);
			setTimeout(() => {
				currentGame.displayWinner(data.player_id);
			}, 3000);
        }
    }, 10);
}

function handleErrors(data) {
	const errorContainer = document.getElementById('error-container');

	if (!errorContainer.classList.contains('hidden'))
		return;
	console.log('pass return');
	window.removeEventListener('beforeunload', handleQuitGame);
	const infoMain = document.getElementById('info-main-player');
	const infop1 = document.getElementById('infoP1');
	const infop2 = document.getElementById('infoP2');
	const buttonStart = document.getElementById('button-ready');
	const canvas = document.getElementById('canvasContainer');
	const countDown = document.getElementById('countdownCanvas');
	const game = document.getElementById('gameCanvas');
	const hud = document.getElementById('hud-container');
	const buttonGuide = document.getElementById('btn-book-element');
	const errorMessage = document.getElementById('error-message');
	const lpMessage = document.getElementById('error-lp');

	if (!infoMain.classList.contains('hidden'))
		infoMain.classList.add('hidden');
	if (!infop1.classList.contains('hidden'))
		infop1.classList.add('hidden');
	if (!infop2.classList.contains('hidden'))
		infop2.classList.add('hidden');
	if (!buttonStart.classList.contains('hidden'))
		buttonStart.classList.add('hidden');
	if (!canvas.classList.contains('hidden'))
		canvas.classList.add('hidden');
	console.log('countdown');
	if (!countDown.classList.contains('hidden'))
	{
		if (currentCountdown)
			currentCountdown.stopDisplay();
		countDown.classList.add('hidden');
	}
	if (!game.classList.contains('hidden'))
		game.classList.add('hidden');
	if (!hud.classList.contains('hidden'))
		hud.classList.add('hidden');
	if (!buttonGuide.classList.contains('hidden'))
		buttonGuide.classList.add('hidden');

	errorContainer.classList.remove('hidden');
	errorMessage.innerHTML += data.message;
	console.log('debug:');
	console.log(data.type === 'error');
	console.log(data.game_status);
	console.log(data.lose_lp);
	if (data.type === 'error' || data.game_status === 'WAITING' || data.lose_lp === false)
		lpMessage.classList.add('hidden');
}

function handleGameCancel(data) {
	sendToBack({action: 'cancel'});
	handleErrors(data);
}

function handleNoPlay(data) {
	let playerWin = null;
	if (!data.p2_id) {
		playerWin = currentGame.P1.id === data.p_id ? currentGame.P2 : currentGame.P1;
		if (currentPlayerId === data.p_id) {
			data.message = " You have not played since for 4 rounds";
			let errorLp = document.getElementById('error-lp');
			errorLp.innerText = "You lose 15 LP";
		} else {
			data.message = ` Player ${data.p_name} have not played since 4 rounds`;
			let errorLp = document.getElementById('error-lp');
			errorLp.innerText = "You win 15 LP";
		}
	} else {
		data.message = " You both not played since 4 rounds";
		let errorLp = document.getElementById('error-lp');
		errorLp.classList.add('hidden');
	}
	sendToBack({action: 'cancel'});
	handleErrors(data);
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
			console.log(data);
			pTakeDmg.loosePv();
			if (pTakeDmg.lifes === 0) 
				pTakeDmg.playAnimationPlayer('Death');
			else
				pTakeDmg.playAnimationPlayer('TakeHit');
			sendToBack({'action': 'finishAnim', 'player_id': currentPlayerId, 'round': currentRound});
		}, 1000);
	} else {
		const equE = document.getElementById('draw');
		equE.textContent = 'Draw';
		equE.classList.remove('hidden');
		setTimeout(() => {
			equE.classList.add('hidden');
			sendToBack({'action': 'finishAnim', 'player_id': currentPlayerId, 'round': currentRound});
		}, 1500);
	}
	asFinishedAnim = true;
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

