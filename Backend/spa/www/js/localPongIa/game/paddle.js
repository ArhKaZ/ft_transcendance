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
        this.y = 42.5 * canvas.height / 100;
        this.speed = canvas.height * 0.002;
    }

    update(keyState) {
        if (this.player === 1) {
            if (keyState && keyState['ArrowUp'] && this.y > 2) {
                this.y -= this.speed;
            }

            if (keyState && keyState['ArrowDown'] && this.y < (this.canvas.height - this.height) - 2) {
                this.y += this.speed;
            }
        }
        if (this.player === 2) {
            if (keyState && keyState['q'] && this.y > 2) {
                this.y -= this.speed;
            }

            if (keyState && keyState['z'] && this.y < (this.canvas.height - this.height) - 2) {
                this.y += this.speed;
            }
        }
    }

    assignPos(y) {
        this.y = y * this.canvas.height / 100;
    }

    draw(context, color) {
        context.fillStyle = color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default Paddle;