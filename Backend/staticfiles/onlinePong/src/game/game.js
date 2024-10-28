import Paddle from './paddle.js';
import Ball from './ball.js';
import Impact from './impact.js';
class Game {
    constructor(canvas, p1, p2) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.P1 = p1;
        this.P2 = p2;
        this.P1.paddle = new Paddle(this.canvas, 1);
        this.P2.paddle = new Paddle(this.canvas, 2);
        this.ball = new Ball(this.canvas);
        this.score = [0, 0];
        this.scoreP1Element = document.getElementById('scoreP1');
        this.scoreP2Element = document.getElementById('scoreP2');
        this.isStart = false;
    }

    start() {
        document.getElementById('buttonStart').classList.add('hidden');
        document.getElementById('canvasContainer').style.display = 'flex';
        document.getElementById('scoreContainer').style.display = 'flex';
        this.P1.draw(this.context);
        this.P2.draw(this.context);
        this.updateScoreFontSize();
        this.isStart = true;
    }

    stop() {
        this.isStart = false;
    }

    updateBallPosition(x, y) {
        this.ball.assignPos(x, y);
    }

    drawGame() {
        this.ball.draw(this.context);
        this.P1.draw(this.context);
        this.P2.draw(this.context);
    }

    updatePlayerPosition(player, y) {
        if (player === 1) {
            this.P1.paddle.assignPos(y);
            this.P1.draw(this.context);
        }
        else {
            this.P2.paddle.assignPos(y);
            this.P2.draw(this.context);
        }
    }

    updateScores(score) {
        this.score = score;
        this.scoreP1Element.textContent = this.score[0].toString();
        this.scoreP2Element.textContent = this.score[1].toString();
    }

    updateScoreFontSize() {
        const fontSize = Math.min(this.canvas.width, this.canvas.height) * 0.20;
        this.scoreP1Element.style.fontSize = `${fontSize}px`;
        this.scoreP2Element.style.fontSize = `${fontSize}px`;
    }

    displayWinner(winner) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'red';
        this.context.font = '100px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        const winnerText = `${winner} has win !`;

        const scoreP1Element = document.getElementById('scoreP1');
        const scoreP2Element = document.getElementById('scoreP2');
        // const canvasElement = document.getElementById('canvasContainer');

        // canvasElement.style.display = 'none';
        scoreP1Element.classList.add('hidden');
        scoreP2Element.classList.add('hidden');

        this.context.fillText(winnerText, this.canvas.width / 2, this.canvas.height / 2);
    }

}

export default Game;