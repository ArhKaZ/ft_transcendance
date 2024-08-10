import Paddle from './paddle.js';
import Ball from './ball.js';

class Game {
    constructor(canvas, p1, p2) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.P1 = p1;
        this.P2 = p2;
        this.P1.paddle = new Paddle(this.canvas, 1);
        this.P2.paddle = new Paddle(this.canvas, 2);
        this.ball = new Ball(this.canvas);
        this.isRunning = false;

        this.keyState = {};
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (event) => {
            this.keyState[event.key] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keyState[event.key] = false;
        });
    }

    start() {
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
        console.log('Game stopped'); // Message de débogage

        // Ajout d'un délai avant d'afficher le gagnant
        setTimeout(() => {
            this.displayWinner();
        }, 10);
    }

    displayWinner() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'red';
        this.context.font = '100px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        let winnerText;
        if (this.P1.getScore() >= 11) {
            winnerText = 'P1 has WIN!';
        } else if (this.P2.getScore() >= 11) {
            winnerText = 'P2 has WIN!';
        }

        this.context.fillText(winnerText, this.canvas.width / 2, this.canvas.height / 2);
    }

    loop() {
        if (!this.isRunning) return;

        this.update();
        this.draw();

        requestAnimationFrame(() => this.loop());
    }

    checkAsScore()
    {
        if (this.ball.x <= 0)
        {
            this.P2.incrementScore();
            this.ball.reset();
        }x
        if (this.ball.x + this.ball.size >= this.canvas.width)
        {
            this.P1.incrementScore();
            this.ball.reset();
        }
    }

    update() {
        this.P1.paddle.update(this.keyState);
        this.P2.paddle.update(this.keyState);
        this.ball.update(this.P1.paddle, this.P2.paddle);
        this.checkAsScore();
        this.checkWinner();
    }

    checkWinner() {
        if (this.P1.getScore() >= 11 || this.P2.getScore() >= 11) {
            this.stop();
        }
    }

    draw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateScores();
        this.P1.paddle.draw(this.context);
        this.P2.paddle.draw(this.context);
        this.ball.draw(this.context);
    }

    updateScores() {
        this.context.fillStyle = 'grey';
        this.context.font = '100px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.fillText(`${this.P1.getScore()}`, this.canvas.width / 4, this.canvas.height / 2);
        this.context.fillText(`${this.P2.getScore()}`, (3 * this.canvas.width) / 4, this.canvas.height / 2);
    }
}

export default Game;