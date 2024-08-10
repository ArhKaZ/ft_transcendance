import Game from './game/game.js';
import Player from './game/player.js';

document.addEventListener('DOMContentLoaded', init);

function init() {
    const canvas = document.getElementById('gameCanvas');
    const P1 = new Player(1);
    const P2 = new Player(2);
    const game = new Game(canvas, P1, P2);
    const context = canvas.getContext('2d');

    startCountdown(context, () => game.start(P1, P2));
}

function startCountdown(context, callback) {
    const countdownValues = ["3", "2", "1", "GO"];
    let currentIndex = 0;

    function clearCanvas () {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    }

    function drawText(text) {
        clearCanvas();
        context.fillStyle = 'red';
        context.font = '100px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, context.canvas.width / 2, context.canvas.height / 2);
    }

    function updateCountdown(context) {
        if (currentIndex < countdownValues.length) {
            drawText(countdownValues[currentIndex]);
            currentIndex++;
        }
        if (currentIndex < countdownValues.length) {
            setTimeout(updateCountdown, 1000);
        } else {
            setTimeout(() => {
                clearCanvas();
                callback();
            }, 900);
        }
    }
    setTimeout(updateCountdown, 1000);
}