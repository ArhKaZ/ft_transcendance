import { getCSRFToken, sleep } from '/js/utils.js';
import Game from "./game/game.js";
import Player from "./game/player.js";
import CountdownAnimation from "../countdownAnimation.js";
import {creationGameDisplay, updatePlayerStatus, displayWhenLoad } from "./game/waitingRoom.js";
import { getUserFromBack, ensureValidToken } from '/js/utils.js';

let socket = null;
let oldHeight = null;
let gameStarted = false;
let currentPlayerId = null;
let currentGame = null;
let currentCountdown = null;
let currentGameId = null;
let inTournament = false;
let inFinal = false;
let pressKey = false;
let is_finished = false;
let keyUpHandler = null;
let keyDownHandler = null;
let currentPseudo = null;

function sendToBack(data) {
	if (socket?.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(data));
	} else {
		console.error("WebSocket not ready");
	}
}

async function getInfoMatchTournament(user) {
	try {
		await ensureValidToken();
		const response = await fetch(`/api/tournament/${sessionStorage.getItem('tournament_code')}/get_opponent`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
			},
			credentials: 'include',
		});
		if (!response.ok) {
			console.log(`Error get opponent : ${response.error}`);
			return null;
		}
		const data = await response.json();
		return data;
	} catch (error) {
		handleErrors({message: `You need to be logged before playing ${error}`});
	}
}

async function getInfoFinale(user) {
	try {
		await ensureValidToken();
		const response = await fetch(`/api/tournament/${sessionStorage.getItem('tournament_code')}/get_final_opponent`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
			},
			credentials: 'include',
		});
		if (!response.ok) {
			console.log(`Error get opponent : ${response.error}`);
			return null;
		}
		const data = await response.json();
		return data;
	} catch (error) {
		handleErrors({message: 'You need to be logged before playing'});
	}
}

async function init() {
	const user = await getUserFromBack();
	const urlParams = new URLSearchParams(window.location.search);
	let infos = null;
	inTournament = urlParams.get('tournament');
	if (inTournament && sessionStorage.getItem('inFinal')) {
		inFinal = true;
		infos = await getInfoFinale(user);
		console.log(infos);
		if (infos === null)
			handleGameFinish(currentGame, currentPlayerId);
	}
	else if (inTournament) {
		infos = await getInfoMatchTournament(user);
		if (infos === null)
			handleGameFinish(currentGame, currentPlayerId);
	}

	displayWhenLoad(user, inTournament);
	
	socket = setupWebSocket(user, infos);
}

function setupWebSocket(user, infos) {
	currentPlayerId = user.id;
	if (!inTournament)
		currentPseudo = user.username;
	else 
		currentPseudo = user.pseudo;
	const id = user.id.toString();
	const currentUrl = window.location.host;
	const socket = new WebSocket(`wss://${currentUrl}/ws/onlinePong/${id}/`);
	

	socket.onopen = () => {
		window.addEventListener('beforeunload', () => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.close();
			}
		});
		
		if (inTournament && infos) {
			let objToSend = {
				action: 'tournament',
				player_id: user.id,
				player_name: currentPseudo,
				player_avatar: user.avatar,
				create: infos.create,
				is_final_match: inFinal,
				tournament_code: sessionStorage.getItem('tournament_code'),
				... (infos.create && {
					opponent: {
						id: infos.opp_id,
						name: infos.opp_name,
						avatar: infos.opp_avatar,
					}
				})
			}
			sendToBack(objToSend);
		} else {
			sendToBack({
				action: 'search', 
				player_id: user.id, 
				player_name: currentPseudo, 
				player_avatar: user.avatar,
			});
		}
	};

	socket.onmessage = async (e) => {
		await handleWebSocketMessage(e);
	};

	socket.onerror = (error) => console.error("WebSocket error:", error.type);

	window.addEventListener("resize", () => resizeCanvasGame());

	return socket;
}


function setupKeyboardControls(playerId) {
    keyDownHandler = (event) => {
        const direction = event.key === 'ArrowUp' ? 'up' : event.key === 'ArrowDown' ? 'down' : null;
        if (direction && !pressKey) {
            pressKey = true;
            sendToBack({ action: 'move', instruction: 'start', direction, player_id: playerId});
        }
    };

    keyUpHandler = (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            sendToBack({ action: 'move', instruction: 'stop', player_id: playerId});
            pressKey = false;
        }
    };

    window.addEventListener('keydown',keyDownHandler);
    window.addEventListener('keyup',keyUpHandler);
}

function cleanKeyboardControls() {
    window.removeEventListener('keydown', keyDownHandler);
    window.removeEventListener('keyup', keyUpHandler);
    keyDownHandler = null;
    keyUpHandler = null;
    socket = null;
    oldHeight = null;
    gameStarted = false;
    currentPlayerId = null;
    currentGame = null;
    currentCountdown = null;
    currentGameId = null;
    pressKey = false;
    is_finished = false;
}

async function initGame(data) {
	const canvas = document.getElementById('gameCanvas');
	oldHeight = canvas.height;
	const [P1, P2] = createPlayers(data);
	return new Game(canvas, P1, P2);
}

function createPlayers(data) {
	const p1_id = data.player1_id;
	const p2_id = data.player2_id;
	const p1_name = data.player1_name;
	const p2_name = data.player2_name;
	const p1_avatar = data.player1_avatar;
	const p2_avatar = data.player2_avatar;

	const P1 = new Player(p1_id, p1_name, p1_avatar);
	const P2 = new Player(p2_id, p2_name, p2_avatar);
	return [P1, P2];
}

async function handleWebSocketMessage(e) {
	const data = JSON.parse(e.data);
	switch(data.type) {
		case 'players_info':
			handlePlayerInfo(data);
			break;

		case 'player_ready':
			await updatePlayerStatus(data.player_number);
			break;

		case 'ball_position':
			currentGame.updateBallPosition(data);
			break;

		case 'score_update':
			currentGame.updateScores(data);
			break;

        case 'game_finish':
            is_finished = true;
			if (currentGame) {
            	currentGame.stop();
            	handleGameFinish(currentGame, data.winning_session);
			} else {
				console.log('auto win ');
				handleGameFinish(null, data.winning_session);

				if (inTournament) {
					setTimeout(() => {
						window.location.href = `/tournament/game/${sessionStorage.getItem('tournament_code')}`
					}, 2000);
				}
			}
            gameStarted = false;
            break;

		case 'game_start':
			await handleGameStart(data);
			break;

		case 'countdown':
			await handleCountdown(data.countdown);
			break;

		case 'game_cancel':
			handleGameCancel(data);
			break;

		case 'error':
			handleErrors(data);
			break; 

		case 'waiting_tournament':
			await handleWaiting(data);
			break;

		case 'player_movement_start':
			handlePlayerStartMove(data);
			break;

		case 'player_movement_stop':
			handlePlayerStopMove(data);
			break;
		
		case 'no_opp':
			if (inTournament && inFinal) {
				window.location.href = `/tournament/game/${sessionStorage.getItem('tournament_code')}/`;
				break;
			}
			else if (inTournament) {
				window.location.href = `/tournament/game/${sessionStorage.getItem('tournament_code')}/`;
				break;
			}

	}
}

function handlePlayerStartMove(data) {
	const player = data.player_id === currentGame.P1.id ? currentGame.P1 : currentGame.P2;
	player.paddle.startMoving(data.direction);
}

function handlePlayerStopMove(data) {
	const player = data.player_id === currentGame.P1.id ? currentGame.P1 : currentGame.P2;
	player.paddle.stopMoving();
	player.paddle.serverUpdate(data.finalY);
}

async function handleWaiting(data) {
	await sleep(100);
	sendToBack({
		action: 'tournament',
		player_id: data.player_id, 
		player_name: data.player_name, 
		player_avatar: data.player_avatar,
		opponent: data.opponent || null,
		create: data.create || false,
		tournament_code: sessionStorage.getItem('tournament_code'),
	});
}

function handleErrors(data) {
	if (currentGame) {
		currentGame.stop();
	}
	if (is_finished) return;
	const errorContainer = document.getElementById('error-container');
	
	if (!errorContainer.classList.contains('hidden'))
		return;

	const infoMain = document.getElementById('info-main-player');
	const infop1 = document.getElementById('infoP1');
	const infop2 = document.getElementById('infoP2');
	const hudp1 = document.getElementById('hud-p1');
	const hudp2 = document.getElementById('hud-p2');
	const spark = document.getElementById('sparks-container');
	const canvasContainer = document.getElementById('canvasContainer');
	const game = document.getElementById('gameCanvas');
	const countdown = document.getElementById('countdownCanvas');
	const button = document.getElementById('button-ready');
	const errorMessage = document.getElementById('error-message');
	const buttonError = document.getElementById('button-home-error');

	if (!infoMain.classList.contains('hidden'))
		infoMain.classList.add('hidden');
	if (!infop1.classList.contains('hidden'))
		infop1.classList.add('hidden');
	if (!infop2.classList.contains('hidden'))
		infop2.classList.add('hidden');
	if (!hudp1.classList.contains('hidden'))
		hudp1.classList.add('hidden');
	if (!hudp2.classList.contains('hidden'))
		hudp2.classList.add('hidden');
	if (!spark.classList.contains('hidden'))
		spark.classList.add('hidden');
	if (!canvasContainer.classList.contains('hidden'))
		canvasContainer.classList.add('hidden');
	if (!game.classList.contains('hidden'))
		game.classList.add('hidden');
	if (!countdown.classList.contains('hidden'))
	{
		if (currentCountdown)
			currentCountdown.stopDisplay();
		countdown.classList.add('hidden');
	}
	if (!button.classList.contains('hidden'))
		button.classList.add('hidden');

	errorContainer.classList.remove('hidden');
	errorMessage.innerText += data.message;

	if (inTournament) {
		buttonError.innerText = "Back to Tournament"
		buttonError.href = `/tournament/game/${sessionStorage.getItem('tournament_code')}/`;
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

async function handleGameStart(data) {
	currentGame = await initGame(data);
	currentGame.displayCanvas();
	currentCountdown = new CountdownAnimation('countdownCanvas');
	gameStarted = true;
	resizeCanvasGame();
}

function handleGameCancel(data) {
	console.log('handleGameCancel');
	handleErrors(data);
	let p1Pseudo = document.getElementById('p1-username').innerText;
	let p2Pseudo = document.getElementById('p2-username').innerText;
	let pseudoAdv = p1Pseudo === currentPseudo ? p1Pseudo : p2Pseudo;
	setTimeout(() => {
		handleGameFinish(currentGame, data.id, pseudoAdv);
		cleanKeyboardControls();
	}, 1000);
}

async function handleCountdown(countdown) {
	await currentCountdown.displayNumber(countdown);
	if (countdown === 0) {
		setupKeyboardControls(currentPlayerId);
		currentCountdown.stopDisplay();
		currentGame.start();
	}
}

function handleGameFinish(game, winningId, opponentName = null) {
    const btnBack = document.getElementById('button-home-end');
    if (!game) {
        const endContainer = document.getElementById('end-container');
        const endMessage = document.getElementById('end-message');
        const waitingRoom = document.getElementById('waitingContainer');
        
        if (waitingRoom && !waitingRoom.classList.contains('hidden')) {
            waitingRoom.classList.add('hidden');
        }
        
        if (endContainer && endContainer.classList.contains('hidden')) {
            endContainer.classList.remove('hidden');
        }
        
        if (endMessage) {
            endMessage.innerText = "You have been declared the winner as you are the only player connected!";
        }
    } else {
        if (opponentName === null)
            if (game && game.P1 && game.P2)
                opponentName = currentPlayerId === parseInt(game.P1.id) ? game.P2.name : game.P1.name;
        
        setTimeout(() => {
            game.displayWinner(winningId);
        }, 500);
    }
    
    if (inTournament) {
        console.log('inTournament finish')
        if (inFinal)
            sessionStorage.setItem('finalDone', true);
        btnBack.href = `/tournament/game/${sessionStorage.getItem('tournament_code')}/`;
        btnBack.innerText = "Back to Tournament";
        setTimeout(() => {
            window.location.href = `/tournament/game/${sessionStorage.getItem('tournament_code')}/`;
        }, 3000);
    }
    else
        btnBack.innerText = "Back to Home";
}


function resizeCanvasGame() {
	const canvasCount = document.getElementById('countdownCanvas');
	const canvas = document.getElementById('gameCanvas');

	canvas.width = window.innerWidth * 0.70;
	canvas.height = window.innerHeight * 0.80;
	canvasCount.width = window.innerWidth * 0.70;
	canvasCount.height = window.innerHeight * 0.80;
	
	const ctx = canvas.getContext('2d');
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	const scale = Math.min(canvas.width / canvas.offsetWidth, canvas.height / canvas.offsetHeight);
	ctx.scale(scale, scale);

	if (!gameStarted || !currentGame) return;
	
	updatePaddleDimensions(currentGame, canvas);
	currentGame.ball.size = Math.min(canvas.width, canvas.height) * 0.01;

	oldHeight = canvas.height;

	currentGame.P1.draw(currentGame.context, currentGame.colorP1);
	currentGame.P2.draw(currentGame.context, currentGame.colorP2);
}

function updatePaddleDimensions(game, canvas) {
	const paddleWidth = canvas.width * 0.01;
	const paddleHeight = canvas.height * 0.15;

	game.P1.paddle.width = paddleWidth;
	game.P1.paddle.height = paddleHeight;
	game.P2.paddle.width = paddleWidth;
	game.P2.paddle.height = paddleHeight;

	game.P1.paddle.x = canvas.width * 0.01;
	game.P2.paddle.x = canvas.width - (canvas.width * 0.01 + game.P2.paddle.width);

	game.P1.paddle.y = (game.P1.paddle.y / oldHeight) * canvas.height;
	game.P2.paddle.y = (game.P2.paddle.y / oldHeight) * canvas.height;
}

init();