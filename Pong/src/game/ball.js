class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = canvas.width * 0.01;
        this.ballSpeed = canvas.width * 0.004;
        this.reset();
    }

    reset() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;

        //Vitesse par rapport a la taille du canvas
        const angle = Math.random() * Math.PI / 2 - Math.PI / 4; // Angle aleatoire

        this.vx = this.ballSpeed * Math.cos(angle) *  (Math.random() > 0.5 ? 1 : -1);
        this.vy = this.ballSpeed * Math.sin(angle);
    }


    update(paddle1, paddle2) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y - this.size <= 0 || this.y + this.size >= this.canvas.height) {
            this.vy *= -1;
        }

        if (this.collisionPaddle(paddle1))
            return 1;
        if (this.collisionPaddle(paddle2))
            return 2;

        return 0;
    }

    collisionPaddle(paddle)//si je touche les coins ca ne touche pas
    {
        if (this.x - this.size < paddle.x + paddle.width &&
            this.x + this.size > paddle.x &&
            this.y - this.size < paddle.y + paddle.height &&
            this.y + this.size > paddle.y) {

            const collidePoint = (this.y + this.size / 2) - (paddle.y + paddle.height / 2);

            const normalizedCollidePoint = collidePoint / (paddle.height / 2);

            const bounceAngle = normalizedCollidePoint * Math.PI / 4;

            this.vx = -this.vx;
            this.vy = this.ballSpeed * Math.sin(bounceAngle);
            return 1;
        }
        return 0;
    }


    draw(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        context.fillStyle = 'white';
        context.fill();
    }
}

export default Ball;