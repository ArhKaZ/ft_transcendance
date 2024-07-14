import Paddle from './paddle.js';
import Ball from './ball.js';

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.paddle1 = new Paddle(this.canvas, 1);
        this.paddle2 = new Paddle(this.canvas, 2);
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

    loop() {
        if (!this.isRunning) return;

        this.update();
        this.draw();

        requestAnimationFrame(() => this.loop());
    }

    collision(paddle)//si je touche les coins ca ne touche pas
    {
        if (paddle.player === 1) {
            if (this.ball.y >= paddle.topHit && this.ball.y <= paddle.botHit && this.ball.x === paddle.x + paddle.width)
            {
                this.ball.hit();
            }
        }
        else {
            if (this.ball.y >= paddle.topHit && this.ball.y <= paddle.botHit && this.ball.x === paddle.x - paddle.width)
            {
                this.ball.hit();
            }
        }
    }

    update() {
        this.paddle1.update(this.keyState);
        this.paddle2.update(this.keyState);
        this.ball.update();
        //faire boucle pour verifier chaque joueur ?
        this.collision(this.paddle1);
        this.collision(this.paddle2);
    }

    draw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.paddle1.draw(this.context);
        this.paddle2.draw(this.context);
        this.ball.draw(this.context);
    }
}

export default Game;