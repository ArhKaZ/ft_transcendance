class Paddle {
    constructor(canvas, player) {
        this.canvas = canvas;
        this.player = player;
        this.width = canvas.width * 0.01;
        this.height = canvas.height * 0.15;
        if (this.player === 1)
            this.x = 10;
        if (this.player === 2)
            this.x = canvas.width - 20;
        this.y = canvas.height / 2;
    }

    assignPos(y) {
        this.y = y * this.canvas.height / 100;
    }

    draw(context) {
        context.fillStyle = 'white';
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default Paddle;