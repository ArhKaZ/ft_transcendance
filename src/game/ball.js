class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = 10;
        this.reset();
    }

    reset() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;
        this.vx = 5 * (Math.random() > 0.5 ? 1 : -1);
        this.vy = 5 * (Math.random());
    }


    update(paddle1, paddle2) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y <= 0 || this.y + this.size >= this.canvas.height) {
            this.vy *= -1;
        }
        this.collisionPaddle(paddle1);
        this.collisionPaddle(paddle2);
    }

    collisionPaddle(paddle)//si je touche les coins ca ne touche pas
    {
        if (this.x < paddle.x + paddle.width &&
            this.x + this.size > paddle.x &&
            this.y < paddle.y + paddle.height &&
            this.y + this.size > paddle.y) {

            const collidePoint = (this.y + this.size / 2) - (paddle.y + paddle.height / 2);

            const normalizedCollidePoint = collidePoint / (paddle.height / 2);

            const bounceAngle = normalizedCollidePoint * Math.PI / 4;

            this.vx = -this.vx;
            this.vy = 5 * Math.sin(bounceAngle);
        }
    }

    draw(context) {
        context.fillStyle = 'white';
        context.fillRect(this.x, this.y, this.size, this.size);
    }
}

export default Ball;