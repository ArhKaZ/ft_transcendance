import Player from "./player.js";

function displayWhenLoad(player) {
    const nameElement = document.getElementById('mp-username');
    const avatarImg = document.getElementById('mp-avatar-img');

    nameElement.innerText = player.username;
    avatarImg.src = player.avatar;
    document.getElementById('button-ready').classList.remove('hidden');
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

export { updatePlayerStatus,  displayWhenLoad }