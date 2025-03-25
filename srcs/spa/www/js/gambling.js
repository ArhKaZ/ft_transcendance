import { ensureValidToken } from '/js/utils.js';
import { router } from './router.js';

let isTokenClicked = false;

const token1 = document.getElementById('token1');
const token2 = document.getElementById('token2');
const token3 = document.getElementById('token3');

token1.addEventListener('click', async () => handleTokenClick(1));
token2.addEventListener('click', async () => handleTokenClick(2));
token3.addEventListener('click', async () => handleTokenClick(3));

function resetTokens() {
    isTokenClicked = false;
    
    // Réactiver tous les tokens
    [token1, token2, token3].forEach(token => {
        token.style.pointerEvents = 'auto';
        const tokenElement = token.querySelector('.token');
        tokenElement.classList.remove('flipped');
    });
}

// Ajoutez l'écouteur d'événement pour le bouton Reset
document.getElementById('reset-button').addEventListener('click', resetTokens);


async function handleTokenClick(tokenNumber) {
    if (isTokenClicked) return;
    isTokenClicked = true;
    
    // Disable all tokens
    [token1, token2, token3].forEach(token => {
        token.style.pointerEvents = 'none';
    });

    // Flip the clicked token immediately
    flipToken(tokenNumber);

    // Flip the other tokens after 3 seconds
    const otherTokens = [1, 2, 3].filter(num => num !== tokenNumber);
    setTimeout(() => {
        otherTokens.forEach(num => flipToken(num));
        
        // Show modal after all tokens have flipped (add 1 second for animation)
        setTimeout(() => showBadgeModal(tokenNumber), 1000);
    }, 1500);

    await returnToken(tokenNumber);
    const badgeName = document.getElementById(`imgtokenback${tokenNumber}`).alt;
    await ensureValidToken();
    const response2 = await fetch('/api/add_badge/', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
            'badge_name': badgeName
        })
    });
    if (response2.ok) {
        console.log('Badge added to user');
    }
    
}   

function flipToken(tokenNumber) {
    const token = document.getElementById(`token${tokenNumber}`).querySelector('.token');
    token.classList.add('flipped');
    token.animate([
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(180deg)' }
    ], {
        duration: 1000,
    });
}

function showBadgeModal(tokenNumber) {
    const badgeImage = document.getElementById(`imgtokenback${tokenNumber}`).src;
    const badgeName = document.getElementById(`imgtokenback${tokenNumber}`).alt;
    
    // Create modal elements
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#222';
    modalContent.style.padding = '2rem';
    modalContent.style.borderRadius = '10px';
    modalContent.style.textAlign = 'center';
    modalContent.style.maxWidth = '500px';
    
    const title = document.createElement('h2');
    title.textContent = 'Congratulations!';
    title.style.color = 'white';
    title.style.fontFamily = '"Press Start 2P", cursive';
    title.style.marginBottom = '1rem';
    
    const image = document.createElement('img');
    image.src = badgeImage;
    image.style.width = '200px';
    image.style.height = '200px';
    image.style.objectFit = 'cover';
    image.style.marginBottom = '1rem';
    
    const message = document.createElement('p');
    message.textContent = `You have won the ${badgeName} badge!`;
    message.style.color = 'white';
    message.style.fontFamily = '"Press Start 2P", cursive';
    message.style.marginBottom = '1.5rem';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'OK';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = '4px solid white';
    closeButton.style.padding = '10px 20px';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontFamily = '"Press Start 2P", cursive';
    
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modalContent.appendChild(title);
    modalContent.appendChild(image);
    modalContent.appendChild(message);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
}

async function returnToken(token_number) {
    try {
        await ensureValidToken();
        const response = await fetch('/api/spend_ticket/', {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            }
        });
        const data = await response.json();
        if (data.success) {
            console.log(`Remaining tickets: ${data.remaining_tickets}`);
            data.badges.forEach((badge, index) => {
                const tokenNumber = index + 1;
                const imgElement = document.getElementById(`imgtokenback${tokenNumber}`);   
                imgElement.src = badge.image;
                imgElement.alt = badge.name;
            });
        }
    } catch (error) {
        console.error('Error: ' + error);
    }
}

document.getElementById('return-button').addEventListener('click', () => {
    router.navigateTo("/home/");
});
