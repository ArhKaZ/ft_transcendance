class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.x = 50 * this.canvas.width / 100;
        this.y = 50 * this.canvas.height / 100;
    }

    assignPos(x, y) {
        this.x = x * this.canvas.width / 100;
        this.y = y * this.canvas.height / 100;
    }

    getPos() {
        return this.x, this.y;
    }

    draw(context) {
        context.shadowBlur = 20; 
        context.shadowColor = '#8a2be2'; 
        context.fillStyle = '#8a2be2';
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        context.fill();
        context.shadowBlur = 0;
        context.shadowColor = 'transparent';
    }
}

export default Ball;