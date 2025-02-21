class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.sizePercent = this.size / Math.min(canvas.width, canvas.height) * 100;
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

        this.speed = 0.55;

        this.lastServerUpdate = Date.now();
        this.lastUpdateTime = Date.now();
    }

    serverUpdate(data) {
        this.serverX = data.x;
        this.serverY = data.y;
        this.vx = data.vx;
        this.vy = data.vy;
        this.lastServerUpdate = Date.now();

        const diffX = Math.abs(this.xPercent - this.serverX);
        const diffY = Math.abs(this.yPercent - this.serverY);
        if (diffX > 0.1 || diffY > 0.1) {
            this.xPercent = this.serverX;
            this.yPercent = this.serverY;
            this.x = this.xPercent * this.canvas.width / 100;
            this.y = this.yPercent * this.canvas.height / 100;
        }
    }

    updatePosition(paddle1, paddle2) {
        if (this.vx === 0 && this.vy === 0) return [false, false];
        const nextXPercent = this.xPercent + this.vx;
        const nextYPercent = this.yPercent + this.vy;

        const nextX = nextXPercent * this.canvas.width / 100;
        const nextY = nextYPercent * this.canvas.height / 100;

        let bound = [false, false];

        if (nextYPercent <= 1 || nextYPercent >= 99) {
            console.log(Date.now());
            this.vy *= -1;
            bound[0] = true;

            if (nextYPercent <= 1) {
                this.yPercent = 1;
            } else {
                this.yPercent = 99;
            }
        } else {
            this.yPercent = nextYPercent;
        }

        let paddleCollision = false;
        if (this.checkPaddleCollision(paddle1) || this.checkPaddleCollision(paddle2)) {
            bound[1] = true;
            paddleCollision = true;
        }

        if (!paddleCollision) {
            this.xPercent = nextXPercent;
        }

        this.x = this.xPercent * this.canvas.width / 100;
        this.y = this.yPercent * this.canvas.height / 100;

        return bound;
    }

    checkPaddleCollision(paddle) {
        const nextXPercent = this.xPercent + this.vx;
        const nextYPercent = this.yPercent + this.vy;

        const nextX = nextXPercent * this.canvas.width / 100;
        const nextY = nextYPercent * this.canvas.height / 100;
        if (nextXPercent - this.sizePercent < ((paddle.x + paddle.width) / this.canvas.width * 100) &&
            nextXPercent + this.sizePercent > (paddle.x / this.canvas.width * 100) &&
            nextYPercent < paddle.yPercent + 16 &&
            nextYPercent > paddle.yPercent) {
            const collidePoint = (nextYPercent + 1) - (paddle.yPercent + 8)
            const normalizedCollidePoint = collidePoint / 8;
            const maxBounceAngle = Math.PI / 4;
            const bounceAngle = normalizedCollidePoint * maxBounceAngle;
            
            const direction = Math.sign(this.vx) * -1;
        
            this.vx = direction * this.speed * Math.cos(bounceAngle);
            this.vy = this.speed * Math.sin(bounceAngle);

            if (Math.abs(normalizedCollidePoint) > 0.9) {
                this.vy *= 0.5;
            }
            // if (this.vx < 0) {
            //     this.xPercent = 3;
            //     console.log('xPercent :', this.xPercent);
            // } else {
            //     this.xPercent = 97
            //     console.log('xPercent :', this.xPercent);
            // }

            return true;
        }
        return false;
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