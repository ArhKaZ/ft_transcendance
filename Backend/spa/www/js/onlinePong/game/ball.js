class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.x = 50;
        this.y = 50;
        this.vx = 0;
        this.vy = 0;
        this.lastUpdateTime = Date.now();
        this.serverX = 50;
        this.serverY = 50;
    }

    serverUpdate(data) {
        console.log('update from server : ', data);
        this.serverX = data.x;
        this.serverY = data.y;
        this.vx = data.vx;
        this.vy = data.vy;
    }

    
    updatePosition() {
        if (this.vx === 0 && this.vy === 0) return;
        const now = Date.now();
        // const deltaTime = (now - this.lastUpdateTime) / 1000;
        
        this.x += this.vx;
        this.y += this.vy;
        // console.log(`x : ${this.x} y : ${this.y}`);
        this.lastUpdateTime = now;
    }

    setInMiddle() {
        this.x = 50;
        this.y = 50;
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