import Player from "./player.js";

function displayWhenLoad(player, tournament) {
    const nameElement = document.getElementById('mp-username');
    const avatarImg = document.getElementById('mp-avatar-img');

    if (!tournament)
        nameElement.innerText = player.username;
    else
        nameElement.innerText = player.pseudo;
    avatarImg.src = player.avatar;
}

function creationGameDisplay(data, game) {
    // Get all elements first with null checks
    const elements = {
        infoMain: document.getElementById('info-main-player'),
        buttonReady: document.getElementById('button-ready'),
        infoP1: document.getElementById('infoP1'),
        infoP2: document.getElementById('infoP2'),
        p1Element: document.getElementById('p1-username'),
        p1ImgElement: document.getElementById('p1-img'),
        p1Waiting: document.getElementById('p1-waiting-animation'),
        p1Joined: document.getElementById('p1-joined-animation'),
        p1Avatar: document.getElementById('p1-avatar'),
        p1AvatarImg: document.getElementById('p1-avatar-img'),
        p2Element: document.getElementById('p2-username'),
        p2ImgElement: document.getElementById('p2-img'),
        p2Waiting: document.getElementById('p2-waiting-animation'),
        p2Joined: document.getElementById('p2-joined-animation'),
        p2Avatar: document.getElementById('p2-avatar'),
        p2AvatarImg: document.getElementById('p2-avatar-img')
    };

    // Check critical elements exist
    if (!elements.infoMain || !elements.buttonReady || !elements.infoP1 || !elements.infoP2) {
        console.error('Critical DOM elements missing for game display');
        return;
    }

    // Toggle visibility states with optional chaining
    elements.infoMain?.classList.add('hidden');
    elements.buttonReady?.classList.remove('hidden');
    elements.infoP1?.classList.remove('hidden');
    elements.infoP2?.classList.remove('hidden');

    // Player 1 setup
    if (elements.p1Element && elements.p1ImgElement && elements.p1AvatarImg) {
        elements.p1Element.textContent = data.player1_name || 'None';
        elements.p1Element.classList.toggle('hidden', !data.player1_name);
        elements.p1ImgElement.classList.toggle('hidden', !data.player1_name);
        elements.p1Waiting?.classList.toggle('hidden', data.player1_ready);
        elements.p1Joined?.classList.toggle('hidden', !data.player1_ready);
        elements.p1AvatarImg.src = data.player1_avatar || '/static/images/default_avatar.png';
        elements.p1Avatar?.classList.toggle('hidden', !data.player1_name);
    }

    // Player 2 setup
    if (elements.p2Element && elements.p2ImgElement && elements.p2AvatarImg) {
        elements.p2Element.textContent = data.player2_name || 'None';
        elements.p2Element.classList.toggle('hidden', !data.player2_name);
        elements.p2ImgElement.classList.toggle('hidden', !data.player2_name);
        elements.p2Waiting?.classList.toggle('hidden', data.player2_ready);
        elements.p2Joined?.classList.toggle('hidden', !data.player2_ready);
        elements.p2AvatarImg.src = data.player2_avatar || '/static/images/default_avatar.png';
        elements.p2Avatar?.classList.toggle('hidden', !data.player2_name);
    }

    // Game state management
    if (game) {
        try {
            if (game.P1 && game.P1.id === data.player1) {
                game.P1.name = data.player1_name;
            } else if (game.P2 && game.P2.id === data.player1) {
                game.P1 = game.P2;
                game.P1.name = data.player1_name;
                game.P2 = null;
            }

            if (data.player2) {
                game.P2 = game.P2 || new Player(data.player2, data.player2_name, false);
                game.P2.id = data.player2;
                game.P2.name = data.player2_name;
            } else {
                game.P2 = null;
            }
        } catch (error) {
            console.error('Error updating game state:', error);
        }
    }

    console.debug('Game display updated:', data);
}

async function updatePlayerStatus(playerNumber) {
    try {
        const waitingAnimation = document.getElementById(`p${playerNumber}-waiting-animation`);
        const joinedAnimation = document.getElementById(`p${playerNumber}-joined-animation`);

        waitingAnimation.classList.add('hidden');
        joinedAnimation.classList.remove('hidden');
    } catch (error) {
        console.error('Error updating player status:', error);
    }
}

export { creationGameDisplay, updatePlayerStatus,  displayWhenLoad }