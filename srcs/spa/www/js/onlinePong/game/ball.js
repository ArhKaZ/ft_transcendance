class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.xPercent = 50;
        this.yPercent = 50;
        this.x = this.xPercent * canvas.width / 100;
        this.y = this.yPercent * canvas.height / 100;
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
            // Convertir les positions normalisées en coordonnées canvas
        this.serverX = data.x;
        this.serverY = data.y;

        // Convertir les vitesses normalisées en unités canvas
        this.vx = data.vx;
        this.vy = data.vy;
        console.log('sX: ', this.serverX, 'sY: ', this.serverY, 'vx: ', this.vx, 'vy: ', this.vy);
        this.lastServerUpdate = Date.now();

        // Correction immédiate si l'écart est significatif
        const diffX = Math.abs(this.xPercent - this.serverX);
        const diffY = Math.abs(this.yPercent - this.serverY);
        if (diffX > 2 || diffY > 2) {
            this.xPercent = this.serverX;
            this.yPercent = this.serverY;
            this.x = this.xPercent * this.canvas.width / 100;
            this.y = this.yPercent * this.canvas.height / 100;
        }
    }

    
    updatePosition() {
        if (this.vx === 0 && this.vy === 0) return;
        // const now = Date.now();
        // const serverDiff = (now - this.lastServerUpdate) / 1000;
        
        // console.log('serverdiff :', serverDiff);
        // this.x = this.serverX + this.vx * serverDiff;
        // this.y = this.serverY + this.vy * serverDiff;
        this.xPercent += this.vx;
        this.yPercent += this.vy;

        this.x = this.xPercent * this.canvas.width / 100;
        this.y = this.yPercent * this.canvas.height / 100;
    }

    setInMiddle() {
        this.x = (50 / 100) * this.canvas.width; // Convertir en unités canvas
        this.y = (50 / 100) * this.canvas.height; // Convertir en unités canvas
        this.vx = 0;
        this.vy = 0;
        this.serverX = 50;
        this.serverY = 50;
        this.serverVx = 0;
        this.serverVy = 0;
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