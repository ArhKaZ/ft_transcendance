class Paddle {
    constructor(canvas, player) {
        this.canvas = canvas;
        this.player = player;
        this.width = canvas.width * 0.01;
        this.height = canvas.height * 0.15;
        if (this.player === 1)
            this.x = canvas.width * (1 / 100);
        if (this.player === 2)
            this.x = canvas.width - (canvas.width * (1 / 100) + this.width);
        this.yPercent = 42.5;
        this.y = this.yPercent * canvas.height / 100;
        this.speed = 0.7;
        this.isMoving = false;
        this.direction = null;
        this.lastUpdateTime = Date.now();
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

        if (this.direction === 'up' && this.y > 2 * (this.canvas.height / 100)) {
            this.yPercent -= this.speed;
        } else if (this.direction === 'down' && this.y + this.height < 98 * (this.canvas.height / 100)) {
            this.yPercent += this.speed;
        }
        console.log(this.yPercent);
        this.y = this.yPercent * this.canvas.height / 100;
    }

    serverUpdate(newY) {
        this.yPercent = newY;
        this.y = this.yPercent * this.canvas.height / 100;
        // const diff = Math.abs(this.x - newY * this.canvas.height / 100);
        // if (diff > 5 * this.canvas.height / 100) {
        //     this.y = newY * this.canvas.height / 100;
        // } else {
        //     this.y = (this.y + (newY - this.y) * 0.3) * this.canvas.height / 100;
        // }
    }

    draw(context, color) {
        context.fillStyle = color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default Paddle;