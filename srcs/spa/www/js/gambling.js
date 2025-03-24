import { router } from './router.js';

let isTokenClicked = false;

function handleTokenClick(tokenNumber) {
    if (isTokenClicked) return;
    isTokenClicked = true;
    
    // Disable all tokens
    [token1, token2, token3].forEach(token => {
        token.style.pointerEvents = 'none';
    });

    returnToken(tokenNumber);
}

const token1 = document.getElementById('token1');
const token2 = document.getElementById('token2');
const token3 = document.getElementById('token3');

token1.addEventListener('click', () => handleTokenClick(1));
token2.addEventListener('click', () => handleTokenClick(2));
token3.addEventListener('click', () => handleTokenClick(3));

function returnToken(token_number) {
    const token = document.getElementById('token' + token_number);
    token.animate([
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(180deg)' }
    ], {
        duration: 1000,
    });
    token.style.transform = 'rotateY(180deg)';
    document.getElementById("imgtoken" + token_number).src= "../css/ico/Badge_Felin.png";
}

document.getElementById('return-button').addEventListener('click', () => {
    router.navigateTo("/home/");
});