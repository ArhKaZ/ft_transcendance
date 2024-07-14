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
        this.vy = 5 * (Math.random() > 0.5 ? 1 : -1);
    }

    hit()
    {
        this.vx *= -1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y <= 0 || this.y + this.size >= this.canvas.height) {
            this.vy *= -1;
        }
        if (this.x <= 0 || this.x + this.size >= this.canvas.width) {
            this.reset();
        }

    }

    draw(context) {
        context.fillStyle = 'white';
        context.fillRect(this.x, this.y, this.size, this.size);
    }
}

export default Ball;