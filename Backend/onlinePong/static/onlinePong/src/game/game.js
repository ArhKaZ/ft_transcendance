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
        this.score = [];
        this.isStart = false;
    }

    start() {
        document.getElementById('buttonStart').style.display = 'none';
        document.getElementById('canvasContainer').style.display = 'block';
        this.P1.draw(this.context);
        this.P2.draw(this.context);
        this.isStart = true;
    }

    updateBallPosition(x, y) {
        this.ball.assignPos(x, y);

    }

    drawGame() {
        this.ball.draw(this.context);
        this.P1.draw(this.context);
        this.P2.draw(this.context);
        this.drawScore();
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
    }

    drawScore() {
        this.context.fillStyle = 'grey';
        this.context.font = '100px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.fillText(`${this.score[0]}`, this.canvas.width / 4, this.canvas.height / 2);
        this.context.fillText(`${this.score[1]}`, (3 * this.canvas.width) / 4, this.canvas.height / 2);
    }

    displayWinner(winner) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'red';
        this.context.font = '100px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        let winnerText;
        if (winner === 1) {
            winnerText = 'P1 has WIN!';
        } else if (winner === 2) {
            winnerText = 'P2 has WIN!';
        }
        this.context.fillText(winnerText, this.canvas.width / 2, this.canvas.height / 2);
    }

}

export default Game;