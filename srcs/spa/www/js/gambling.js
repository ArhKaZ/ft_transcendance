import { ensureValidToken } from '/js/utils.js';
import { router } from './router.js';
import { getUserFromBack } from './utils.js';
import { getCSRFToken } from './utils.js';

let isTokenClicked = false;

// let cleanupFunctions = [];

//peut etre mettre les event listener dans un garbage collector

export async function init() {
    updateTicketCount();
    const token1 = document.getElementById('token1');
    const token2 = document.getElementById('token2');
    const token3 = document.getElementById('token3');
    document.getElementById('reset-button').addEventListener('click', resetTokens);
    
    token1.addEventListener('click', async () => handleTokenClick(1));
    token2.addEventListener('click', async () => handleTokenClick(2));
    token3.addEventListener('click', async () => handleTokenClick(3));
    document.getElementById('return-button').addEventListener('click', () => {
        router.navigateTo("/home/");
    });
    
    document.addEventListener('DOMContentLoaded', async () => {
        await updateTicketCount();
        token1.addEventListener('click', async () => {
            if (!token1.disabled) await handleTokenClick(1);
        });
        token2.addEventListener('click', async () => {
            if (!token2.disabled) await handleTokenClick(2);
        });
        token3.addEventListener('click', async () => {
            if (!token3.disabled) await handleTokenClick(3);
        });
    });
}

// updateTicketCount();


function updateButtonStates(ticketCount) {
    const buttons = [token1, token2, token3];
    buttons.forEach(button => {
        button.disabled = ticketCount <= 0;
    });
}

async function updateTicketCount() {
    try {
        await ensureValidToken();
        const user = await getUserFromBack();
        if (!user.username)
            return;
        const ticketCount = user.tickets || 0;
        document.getElementById('ticket-count').textContent = `You currently have ${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}`;
        updateButtonStates(ticketCount);
    } catch (error) {
        console.error('Error fetching ticket count:', error);
        document.getElementById('ticket-count').textContent = 'Could not load ticket count';
        updateButtonStates(0);
    }
}

function resetTokens() {
    isTokenClicked = false;
    
    // Réactiver tous les tokens
    [token1, token2, token3].forEach(token => {
        token.style.pointerEvents = 'auto';
        const tokenElement = token.querySelector('.token');
        tokenElement.classList.remove('flipped');
    });
}



async function handleTokenClick(tokenNumber) {
    updateTicketCount();
    const tokenButton = document.getElementById(`token${tokenNumber}`);
    if (isTokenClicked || tokenButton.disabled) return;
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
    }, 1500);

    try {
        await returnToken(tokenNumber);
        const badgeName = document.getElementById(`imgtokenback${tokenNumber}`).alt;
        await ensureValidToken();
        
        const response2 = await fetch('/api/add_badge/', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
                'badge_name': badgeName
            })
        });

        const result = await response2.json();
        
        // Show modal after all tokens have flipped (add 1 second for animation)
        setTimeout(() => {
            if (response2.ok) {
                showBadgeModal(tokenNumber, true, result.message);
            } else {
                showBadgeModal(tokenNumber, false, result.error || 'An error occurred');
            }
        }, 2500);
        
    } catch (error) {
        console.error('Error:', error);
        setTimeout(() => {
            showBadgeModal(tokenNumber, false, 'An error occurred while processing your request');
        }, 2500);
    }
}

function flipToken(tokenNumber) {
    updateTicketCount();
    const token = document.getElementById(`token${tokenNumber}`).querySelector('.token');
    token.classList.add('flipped');
    token.animate([
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(180deg)' }
    ], {
        duration: 1000,
    });
}

function showBadgeModal(tokenNumber, isSuccess, message) {
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
    title.textContent = isSuccess ? 'Congratulations!' : 'Oops!';
    title.style.color = isSuccess ? 'white' : '#ff5555';
    title.style.fontFamily = '"Press Start 2P", cursive';
    title.style.marginBottom = '1rem';
    
    const image = document.createElement('img');
    if (isSuccess) {
        image.src = badgeImage;
        image.style.width = '200px';
        image.style.height = '200px';
        image.style.objectFit = 'cover';
        image.style.marginBottom = '1rem';
    }
    
    const messageElement = document.createElement('p');
    messageElement.textContent = isSuccess ? `You won the ${badgeName} badge !` : message;
    messageElement.style.color = isSuccess ? 'white' : '#ff5555';
    messageElement.style.fontFamily = '"Press Start 2P", cursive';
    messageElement.style.marginBottom = '1.5rem';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'OK';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = '4px solid ' + (isSuccess ? 'white' : '#ff5555');
    closeButton.style.padding = '10px 20px';
    closeButton.style.color = isSuccess ? 'white' : '#ff5555';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontFamily = '"Press Start 2P", cursive';
    
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modalContent.appendChild(title);
    if (isSuccess) modalContent.appendChild(image);
    modalContent.appendChild(messageElement);
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
                'X-CSRFToken': getCSRFToken(),
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

// document.getElementById('return-button').addEventListener('click', () => {
//     router.navigateTo("/home/");
// });

// document.addEventListener('DOMContentLoaded', async () => {
//     await updateTicketCount();
//     token1.addEventListener('click', async () => {
//         if (!token1.disabled) await handleTokenClick(1);
//     });
//     token2.addEventListener('click', async () => {
//         if (!token2.disabled) await handleTokenClick(2);
//     });
//     token3.addEventListener('click', async () => {
//         if (!token3.disabled) await handleTokenClick(3);
//     });
// });