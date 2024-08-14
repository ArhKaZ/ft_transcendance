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
        this.isRunning = false;
        this.newColorLeft = 0;
        this.newColorRight = 0;
        this.leftColor = {r: 0, g: 0, b: 0, a: 0};
        this.rightColor = {r: 0, g: 0, b: 0, a: 0};
        this.particles = [];
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
        }
        if (this.ball.x + this.ball.size >= this.canvas.width)
        {
            this.P1.incrementScore();
            this.ball.reset();
        }
    }

    update() {
        this.P1.paddle.update(this.keyState);
        this.P2.paddle.update(this.keyState);
        let res = this.ball.update(this.P1.paddle, this.P2.paddle);
        switch (res) {
            case 1:
                this.newColorLeft = 20;
                this.createImpact(this.ball.x, this.ball.y);
                break;
            case 2:
                this.newColorRight = 20;
                this.createImpact(this.ball.x, this.ball.y);
                break;
        }
        this.checkAsScore();
        //this.checkWinner();
    }

    checkWinner() {
        if (this.P1.getScore() >= 11 || this.P2.getScore() >= 11) {
            this.stop();
        }
    }

    draw() {

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.newColorLeft === 20)
            this.leftColor = this.newColor();

        if (this.newColorRight === 20)
            this.rightColor = this.newColor();

        if (this.newColorLeft > 0) {
            this.context.fillStyle = `rgba(${this.leftColor.r}, ${this.leftColor.g}, ${this.leftColor.b}, ${this.leftColor.a})`;
            this.context.fillRect(0, 0, this.canvas.width / 2, this.canvas.height);
            --this.newColorLeft;
        }
        else if (this.newColorRight > 0) {
            this.context.fillStyle = `rgba(${this.rightColor.r}, ${this.rightColor.g}, ${this.rightColor.b}, ${this.rightColor.a})`;
            this.context.fillRect(this.canvas.width / 2, 0, this.canvas.width / 2, this.canvas.height);
            --this.newColorRight;
        }

        this.particles = this.particles.filter(particle => {
            particle.update();
            particle.draw();
            return particle.isAlive();
        });

        this.updateScores();
        this.P1.paddle.draw(this.context);
        this.P2.paddle.draw(this.context);
        this.ball.draw(this.context);
    }

    createImpact(x, y) {
        for (let i = 0; i < 20; i++) {
            const size = Math.random() * 5 + 2;
            const color = {r:Math.random() * 255, g: Math.random() * 255, b : Math.random() * 255};
            this.particles.push(new Impact(x, y, size, color, this.context));
        }
    }

    newColor() {

        let start = 70;
        let r = start + Math.round(Math.random() * (255 - start));
        let g = start + Math.round(Math.random() * (255 - start));
        let b = start + Math.round(Math.random() * (255 - start));
        let a = 0.7;
        return {r, g, b, a};
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