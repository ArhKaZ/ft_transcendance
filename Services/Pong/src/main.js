import Game from './game/game.js';
import Player from './game/player.js';

let oldHeight = 0;
let pseudoP1 = null;
let pseudoP2 = null;

document.getElementById("submitPseudo").addEventListener('click', function() {

    pseudoP1 = document.getElementById('pseudo1').value;
    pseudoP2 = document.getElementById('pseudo2').value;
    document.getElementById('pseudoContainer').style.display = 'none';

    document.getElementById('infoP1').textContent = `P1: ${pseudoP1}`;
    document.getElementById('infoP2').textContent = `P2: ${pseudoP2}`;
    document.getElementById('canvasContainer').style.display = 'block';
    document.getElementById('infoP1').style.display = 'flex';
    document.getElementById('infoP2').style.display = 'flex';
    init();
})

function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');

    canvas.width = window.innerWidth * 0.6;
    canvas.height = window.innerHeight * 0.8;
}

function resizeCanvasGame(game) {
    const canvas = document.getElementById('gameCanvas');

    canvas.width = window.innerWidth * 0.6;
    canvas.height = window.innerHeight * 0.8;
    game.P1.paddle.width = canvas.width * 0.01;
    game.P1.paddle.height = canvas.height * 0.15;
    game.P2.paddle.width = canvas.width * 0.01;
    game.P2.paddle.height = canvas.height * 0.15;
    game.P2.paddle.x = canvas.width - 20;
    game.P1.paddle.y = (game.P1.paddle.y / oldHeight) * canvas.height;
    game.P2.paddle.y = (game.P2.paddle.y / oldHeight) * canvas.height;
    game.ball.size = canvas.width * 0.01;
    game.ball.ballSpeed = canvas.width * 0.004;
    oldHeight = canvas.height;
}

function init() {
    resizeCanvas();
    const canvas = document.getElementById('gameCanvas');
    oldHeight = canvas.height;
    const P1 = new Player(1, pseudoP1);
    const P2 = new Player(2, pseudoP2);
    const game = new Game(canvas, P1, P2);
    const context = canvas.getContext('2d');

    startCountdown(context, () => game.start());
    window.addEventListener("resize", function() { resizeCanvasGame(game) });
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