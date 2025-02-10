
class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.ballSpeed = 4;
        this.reset();
    }

    async reset(asScore) {
        this.ballSpeed = 4;
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;

        const angle = Math.random() * Math.PI / 2 - Math.PI / 4;

        this.vx = this.ballSpeed * Math.cos(angle) *  (asScore === 'p2' ? 1 : -1);
        this.vy = this.ballSpeed * Math.sin(angle);
    }

    update(paddle1, paddle2, ia) {
        let bound = [false, false];
        this.x += this.vx;
        this.y += this.vy;

        if (this.y - this.size <= 0 || this.y + this.size >= this.canvas.height) {
            if (this.y - this.size <= 0 && this.vy === 0) {
                this.vy = 0.1;
            } else if (this.y + this.size >= this.canvas.height && this.vy === 0) {
                this.vy = -0.1;
            } else {
                this.vy *= -1;
            }
            bound[0] = true;
        }

        if (this.collisionPaddle(paddle1, ia) || this.collisionPaddle(paddle2, ia))
        {
            bound[1] = true;
            if (this.ballSpeed <= 8){
                this.ballSpeed += 0.4;
            }
        }
        return bound;
    }

    collisionPaddle(paddle)
    {
        if (this.x - this.size < paddle.x + paddle.width &&
            this.x + this.size > paddle.x &&
            this.y - this.size < paddle.y + paddle.height &&
            this.y + this.size > paddle.y) {
            
            const collidePoint = (this.y + this.size / 2) - (paddle.y + paddle.height / 2);

            const normalizedCollidePoint = collidePoint / (paddle.height / 2);

            const bounceAngle = normalizedCollidePoint * Math.PI / 4;

            this.vx = -Math.sign(this.vx) * this.ballSpeed * Math.cos(bounceAngle);
            this.vy = this.ballSpeed * Math.sin(bounceAngle);
            return 1;
        }
        return 0;
    }

    getPos() {
        return this.x, this.y;
    }

    setInMiddle(canvas) {
        this.x = 50 * canvas.width / 100;
        this.y = 50 * canvas.height / 100;
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