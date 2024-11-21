import Player from "./player.js";

function displayWhenConnect(data) {
    const elements = {
        player: {
            username: document.getElementById('p1-username'),
            img: document.getElementById('p1-anim'),
            waitingAnim: document.getElementById('p1-waiting-animation'),
            joinedAnim: document.getElementById('p1-joined-animation'),
            avatar: document.getElementById('p1-avatar'),
            avatarImg: document.getElementById('p1-avatar-img'),
        },
        opponent: {
            username: document.getElementById('p2-username'),
            img: document.getElementById('p2-anim'),
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

function displayConnectedPlayer(playerId, playerName, playerAvatar, currentPlayerId) {
    const isPlayer1 = parseInt(playerId) === currentPlayerId;
    const elementId = isPlayer1 ? 'p1' : 'p2';
    const nameElement = document.getElementById(`${elementId}-username`);
    const imgElement = document.getElementById(`${elementId}-anim`);
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
    const p2ImgElement = document.getElementById('p2-anim');
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

export { refreshPlayers, updatePlayerStatus, displayConnectedPlayer, displayWhenConnect }