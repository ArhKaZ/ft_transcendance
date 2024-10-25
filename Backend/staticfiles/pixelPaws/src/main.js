import Player from "./game/player.js";
import Game from "./game/game.js";

let socket = null;
let currentPlayerId = null;

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

function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');

    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
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
    //resizeCanvas();
    // const canvas = document.getElementById('gameCanvas');
    // const P1 = new Player(1);
    // const P2 = new Player(2);
    // const game = new Game(canvas, P1, P2);
    //
    // game.start();
}

function displayWhenConnect(data) {
    const elements = {
        player: {
            username: document.getElementById('p1-username'),
            img: document.getElementById('p1-img'),
            waitingAnim: document.getElementById('p1-waiting-animation'),
            joinedAnim: document.getElementById('p1-joined-animation'),
            avatar: document.getElementById('p1-avatar'),
            avatarImg: document.getElementById('p1-avatar-img'),
        },
        opponent: {
            username: document.getElementById('p2-username'),
            img: document.getElementById('p2-img'),
            waitingAnim: document.getElementById('p2-waiting-animation'),
            joinedAnim: document.getElementById('p2-joined-animation'),
            avatar: document.getElementById('p2-avatar'),
            avatarImg: document.getElementById('p2-avatar-img'),
        }
    };

    const playerData = {
        name: data.game.player1_name,
        isMe: data.p1_is_me,
        exists: true,
        isReady: data.game.player1_ready,
        avatar: data.game.player1_avatar,
    }

    const opponentData = {
        name: data.game.player2_name,
        isMe: !data.p1_is_me,
        exists: !!data.game.player2_name,
        isReady: data.game.player2_ready,
        avatar: data.game.player2_avatar,
    }

    updatePlayerDisplay(elements.player, playerData);
    updatePlayerDisplay(elements.opponent, opponentData);
}

function updatePlayerDisplay(elements, data) {
    if (data.isMe || data.exists) {
        elements.username.innerText = data.name;
        elements.username.classList.remove('hidden');
        elements.avatarImg.src = data.avatar;
        elements.avatar.classList.remove('hidden');
        elements.img.classList.remove('hidden');
        if (data.isReady)
            elements.joinedAnim.classList.remove('hidden');
        else
            elements.waitingAnim.classList.remove('hidden');
    }
}

function displayConnectedPlayer(playerId, playerName, playerAvatar) {
    const isPlayer1 = parseInt(playerId) === currentPlayerId;
    const elementId = isPlayer1 ? 'p1' : 'p2';
    const nameElement = document.getElementById(`${elementId}-username`);
    const imgElement = document.getElementById(`${elementId}-img`);
    const waitingAnimElement = document.getElementById(`${elementId}-waiting-animation`);
    const avatarImgElement = document.getElementById(`${elementId}-avatar-img`);
    const avatarElement = document.getElementById(`${elementId}-avatar`);
    if (nameElement.classList.contains('hidden')) {
        nameElement.innerText = playerName;
        nameElement.classList.remove('hidden');
        imgElement.classList.remove('hidden');
        waitingAnimElement.classList.remove('hidden');
        avatarImgElement.src = playerAvatar;
        avatarElement.classList.remove('hidden');
    }
}

function refreshPlayers(data, game) {
    const p1Element = document.getElementById('p1-username');
    const p1WaitingElement = document.getElementById('p1-waiting-animation');
    const p1JoinedElement = document.getElementById('p1-joined-animation');
    const p1Avatar = document.getElementById('p1-avatar');
    const p1AvatarImg = document.getElementById('p1-avatar-img');
    const p2Element = document.getElementById('p2-username');
    const p2ImgElement = document.getElementById('p2-img');
    const p2WaitingElement = document.getElementById('p2-waiting-animation');
    const p2JoinedElement = document.getElementById('p2-joined-animation');
    const p2Avatar = document.getElementById('p2-avatar');
    const p2AvatarImg = document.getElementById('p2-avatar-img');

    // Mise à jour du joueur 1
    p1Element.innerText = data.player1_name || 'None';
    p1Element.classList.toggle('hidden', !data.player1_name);
    p1WaitingElement.classList.toggle('hidden', data.player1_ready);
    p1JoinedElement.classList.toggle('hidden', !data.player1_ready);
    p1AvatarImg.src = data.player1_avatar || '';
    p1Avatar.classList.toggle('hidden', !data.player1_name);

    // Mise à jour du joueur 2
    p2Element.innerText = data.player2_name || 'None';
    p2Element.classList.toggle('hidden', !data.player2_name);
    p2ImgElement.classList.toggle('hidden', !data.player2_name);
    p2WaitingElement.classList.toggle('hidden', !data.player2_name || data.player2_ready);
    p2JoinedElement.classList.toggle('hidden', !data.player2_name || !data.player2_ready);
    p2AvatarImg.src = data.player2_avatar || '';
    p2Avatar.classList.toggle('hidden', !data.player2_name);

    // Mise à jour des objets du jeu si nécessaire
    if (game) {
        if (game.P1 && game.P1.id === data.player1) {
            game.P1.name = data.player1_name;
        } else if (game.P2 && game.P2.id === data.player1) {
            game.P1 = game.P2;
            game.P1.name = data.player1_name;
            game.P2 = null;
        }

        if (data.player2) {
            if (!game.P2) {
                game.P2 = new Player(data.player2, data.player2_name, false);
            } else {
                game.P2.id = data.player2;
                game.P2.name = data.player2_name;
            }
        } else {
            game.P2 = null;
        }
    }
}

async function updatePlayerStatus(playerId, gameId) {
    try {
        console.log('cc');
        const response = await fetch(`api/get_info_player/?game_id=${gameId}&player_id=${playerId}`);
        const data = await response.json();
        const playerNumber = data.player_number;
        const waitingAnimation = document.getElementById(`p${playerNumber}-waiting-animation`);
        const joinedAnimation = document.getElementById(`p${playerNumber}-joined-animation`);

        waitingAnimation.classList.add('hidden');
        joinedAnimation.classList.remove('hidden');
    } catch (error) {
        console.error('Error updating player status:', error);
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
    // window.addEventListener("resize", () => resizeCanvasGame(game));
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
            displayConnectedPlayer(data.player_id, data.username, data.avatar);
            break;
        case 'player_ready':
            await updatePlayerStatus(data.player_id, gameId);
            break;
        case 'game_start':
            game = createGame(data);
            game.start();
            window.addEventListener('resize', resizeCanvas);
            break;
    }
}



document.addEventListener('DOMContentLoaded', init);
