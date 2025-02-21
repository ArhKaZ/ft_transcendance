class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.x = 50;
        this.y = 50;
        this.vx = 0;
        this.vy = 0;
        
        this.serverX = 50;
        this.serverY = 50;
        this.serverVx = 0;
        this.serverVy = 0;

        this.lastServerUpdate = Date.now();
        this.lastUpdateTime = Date.now();
        this.interpolFactor = 0.3;
        this.speedMultiplier = 1 / (0.016);
    }

    serverUpdate(data) {
        this.serverX = data.x;
        this.serverY = data.y;
        this.vx = data.vx * this.speedMultiplier;
        this.vy = data.vy * this.speedMultiplier;

        this.lastServerUpdate = Date.now();

        const diffX = Math.abs(this.x - this.serverX);
        const diffY = Math.abs(this.y - this.serverY);
        if (diffX > 5 || diffY > 5) {
            this.x = this.serverX;
            this.y = this.serverY;
        }
    }

    
    updatePosition() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;
        
        if (this.vx === 0 && this.vy === 0) return;

        const nextX = this.x + this.vx * deltaTime;
        const nextY = this.y + this.vy * deltaTime;
        
        const serverDiff = (now - this.lastServerUpdate) / 1000;
        const predictedX = this.serverX + this.vx * serverDiff;
        const predictedY = this.serverY + this.vy * serverDiff;
        
        this.x = nextX + (predictedX - nextX) * this.interpolFactor;
        this.y = nextY + (predictedY - nextY) * this.interpolFactor;
    }

    setInMiddle() {
        this.x = 50;
        this.y = 50;
        this.vx = 0;
        this.vy = 0;
        this.serverX = 50;
        this.serverY = 50;
        this.serverVx = 0;
        this.serverVy = 0;
    }
    
    draw(context) {
        let xCanvas = this.x * this.canvas.width / 100;
        let yCanvas = this.y * this.canvas.height / 100;
        context.shadowBlur = 20; 
        context.shadowColor = '#8a2be2'; 
        context.fillStyle = '#8a2be2';
        context.beginPath();
        context.arc(xCanvas, yCanvas, this.size, 0, 2 * Math.PI);
        context.fill();
        context.shadowBlur = 0;
        context.shadowColor = 'transparent';
    }
}

export default Ball;