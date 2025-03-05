class Paddle {
    constructor(canvas, player) {
        this.canvas = canvas;
        this.player = player;
        this.width = canvas.width * 0.01;
        this.height = canvas.height * 0.16;
        if (this.player === 1)
            this.x = canvas.width * (1 / 100);
        if (this.player === 2)
            this.x = canvas.width - (canvas.width * (1 / 100) + this.width);
        this.yPercent = 42.5;
        this.y = this.yPercent * canvas.height / 100;
        this.speed = 0.9;
        this.isMoving = false;
        this.direction = null;
    }

    startMoving(direction) {
        this.direction = direction;
        this.isMoving = true;
    }

    stopMoving() {
        this.direction = null;
        this.isMoving = false;
    }

    updatePosition(canMove) {
        if (!this.isMoving || !canMove) return;

        if (this.direction === 'up' && this.yPercent > 1.5) {
            this.yPercent -= this.speed;
        } else if (this.direction === 'down' && this.yPercent + 16 < 99.5 ) {
            this.yPercent += this.speed;
        }
        this.y = this.yPercent * this.canvas.height / 100;
    }

    serverUpdate(newY) {
        this.yPercent = newY;
        this.y = this.yPercent * this.canvas.height / 100;
    }

    draw(context, color) {
        context.fillStyle = color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default Paddle;