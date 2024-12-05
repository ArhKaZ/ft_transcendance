class Dot {
    constructor(x, y, canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.targetX = x;
        this.targetY = y;
        this.size = 1;
        this.speed = 0.1;
        this.originalX = this.x;
        this.originalY = this.y;
        this.distanceToTarget = Math.hypot(this.targetX - this.x, this.targetY - this.y);
    }

    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const currentDistance = Math.hypot(dx, dy);

        const speedMultiplier = Math.min(1, currentDistance / this.distanceToTarget);
        const adjustedSpeed = this.speed * (0.5 + speedMultiplier);

        this.x += dx * adjustedSpeed;
        this.y += dy * adjustedSpeed;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }
}

export default Dot;