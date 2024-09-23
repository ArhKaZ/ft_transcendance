class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = canvas.width * 0.01;
        this.x = 0;
        this.y = 0;
    }

    assignPos(x, y) {
        this.x = x * this.canvas.width / 100;
        this.y = y * this.canvas.height / 100;
    }

    draw(context) {
        context.clearRect(0,0, this.canvas.width, this.canvas.height);
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        context.fillStyle = 'white';
        context.fill();
    }
}

export default Ball;