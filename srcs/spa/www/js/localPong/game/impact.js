class Impact {
    constructor(x, y, size, color, context) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.context = context;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.03;
    }

    draw() {
        this.context.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        this.context.fillRect(this.x, this.y, this.size, this.size);
    }

    isAlive() {
        return this.alpha > 0;
    }
}

export default Impact;