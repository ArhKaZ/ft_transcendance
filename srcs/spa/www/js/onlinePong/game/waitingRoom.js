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

    document.getElementById('info-main-player').classList.add('hidden');
    document.getElementById('button-ready').classList.remove('hidden');;
    
    document.getElementById('infoP1').classList.remove('hidden');
    document.getElementById('infoP2').classList.remove('hidden');

    const p1Element = document.getElementById('p1-username');
    const p1ImgElement = document.getElementById('p1-img');
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
    
    p1Element.innerText = data.player1_name || 'None';
    p1Element.classList.toggle('hidden', !data.player1_name);
    p1ImgElement.classList.toggle('hidden', !data.player1_name);
    p1WaitingElement.classList.toggle('hidden', data.player1_ready);
    p1JoinedElement.classList.toggle('hidden', !data.player1_ready);
    p1AvatarImg.src = data.player1_avatar || '';
    p1Avatar.classList.toggle('hidden', !data.player1_name);

    p2Element.innerText = data.player2_name || 'None';
    p2Element.classList.toggle('hidden', !data.player2_name);
    p2ImgElement.classList.toggle('hidden', !data.player2_name);
    p2WaitingElement.classList.toggle('hidden', !data.player2_name || data.player2_ready);
    p2JoinedElement.classList.toggle('hidden', !data.player2_name || !data.player2_ready);
    p2AvatarImg.src = data.player2_avatar || '';
    p2Avatar.classList.toggle('hidden', !data.player2_name);

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