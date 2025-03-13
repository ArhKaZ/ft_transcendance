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
		
		this.needToWait = false;
		this.oldPositions = [];
	}

	serverUpdate(data) {
		this.needToWait = false;
		this.serverX = data.x;
		this.serverY = data.y;

		const currentSpeed = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
		const reductionFactor = Math.max(0.85, Math.min(0.95, 1 - (currentSpeed * 0.1)));

		this.vx = data.vx * reductionFactor;
		this.vy = data.vy * reductionFactor;
		this.lastServerUpdate = Date.now();

		const diffX = Math.abs(this.xPercent - this.serverX);
		const diffY = Math.abs(this.yPercent - this.serverY);
		if (diffX > 0.01 || diffY > 0.01) {
			this.xPercent = this.serverX;
			this.yPercent = this.serverY;
			this.x = this.xPercent * this.canvas.width / 100;
			this.y = this.yPercent * this.canvas.height / 100;
		}
	}

	updatePosition(paddle1, paddle2) {
		if (this.vx === 0 && this.vy === 0) return [false, false];
		if (this.oldPositions.length > 20) {
            this.oldPositions.shift();
        }
		this.oldPositions.push({x: this.x, y: this.y});
		const nextXPercent = this.xPercent + this.vx;
		const nextYPercent = this.yPercent + this.vy;

		let bound = [false, false];

		if (nextYPercent < 1 || nextYPercent > 99) {
			this.needToWait = true;
		} else {
			if (!this.needToWait) {
				this.yPercent = nextYPercent;
				this.y = this.yPercent * this.canvas.height / 100;
			}
		}

		let paddleCollision = false;
		if (this.checkPaddleCollision(paddle1) || this.checkPaddleCollision(paddle2)) {
			bound[1] = true;
			paddleCollision = true;
			this.needToWait = true;
		}

		if (!paddleCollision) {
			if (!this.needToWait) {
				this.xPercent = nextXPercent;
				this.x = this.xPercent * this.canvas.width / 100;
			}
		}

		return bound;
	}

	checkPaddleCollision(paddle) {
		const nextXPercent = this.xPercent + this.vx;
		const nextYPercent = this.yPercent + this.vy;

		if (nextXPercent - this.sizePercent < ((paddle.x + paddle.width) / this.canvas.width * 100) &&
			nextXPercent + this.sizePercent > (paddle.x / this.canvas.width * 100) &&
			nextYPercent < paddle.yPercent + 16 &&
			nextYPercent > paddle.yPercent) {
				return true;
		}
		return false;
	}
	
	setInMiddle() {
		this.oldPositions = [];
		this.x = (50 / 100) * this.canvas.width; 
		this.y = (50 / 100) * this.canvas.height; 
		this.vx = 0;
		this.vy = 0;
		this.serverX = 50;
		this.serverY = 50;
		this.serverVx = 0;
		this.serverVy = 0;
	}
	
    draw(context) {
        context.shadowBlur = 10; 
        context.shadowColor = '#8a2be2'; 
        context.fillStyle = '#8a2be2';
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        context.fill();
        context.shadowBlur = 0;
        context.shadowColor = 'transparent';
        let reverse = this.oldPositions.reverse();
        reverse.forEach((element, index) =>  {
            context.beginPath();
            let newSize = this.size * (1 - index / this.oldPositions.length);
            newSize = Math.max(newSize, 1);
            let alpha = 0.9 - index / this.oldPositions.length;
            context.globalAlpha = Math.max(alpha, 0.1);
            context.arc(element.x, element.y, newSize, 0, 2 * Math.PI);
            context.fill();
        });
        context.globalAlpha = 1;
        this.oldPositions.reverse();
    }
}

export default Ball;