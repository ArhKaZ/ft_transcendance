class Paddle {
    constructor(canvas, player) {
        this.canvas = canvas;
        this.player = player;
        this.width = 10;
        this.height = 100;
        if (this.player === 1)
            this.x = 10;
        if (this.player === 2)
            this.x = canvas.width - 20;
        this.y = (canvas.height - this.height) / 2;
        this.speed = 5;
    }

    update(keyState) {
        if (this.player === 2) {
            if (keyState && keyState['ArrowUp'] && this.y > 10) {
                this.y -= this.speed;
            }

            if (keyState && keyState['ArrowDown'] && this.y < (this.canvas.height - this.height) - 10) {
                this.y += this.speed;
            }
        }
        if (this.player === 1) {
            if (keyState && keyState['q'] && this.y > 10) {
                this.y -= this.speed;
            }

            if (keyState && keyState['z'] && this.y < (this.canvas.height - this.height) - 10) {
                this.y += this.speed;
            }
        }
    }

    draw(context) {
        context.fillStyle = 'white';
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default Paddle;