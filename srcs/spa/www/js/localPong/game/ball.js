
class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.ballSpeed = 4;
        this.reset();
        this.oldPositions = [];
    }

    async reset(asScore) {
        this.oldPositions = [];
        this.ballSpeed = 4;
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;

        const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
        
        const minVelocity = 0.5;

        let vx = this.ballSpeed * Math.cos(angle);
        let vy = this.ballSpeed * Math.sin(angle);

        if (Math.abs(vy) < minVelocity) {
            vy = minVelocity * Math.sign(vy) || minVelocity;
        }

        this.vx = vx * (asScore === 'p2' ? 1 : -1);
        this.vy = vy;
    }

    update(paddle1, paddle2) {
        if (this.oldPositions.length > 20) {
            this.oldPositions.shift();
        }
        this.oldPositions.push({x: this.x, y: this.y});
        let bound = [false, false];

        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;

        if (nextY - this.size <= 0 || nextY + this.size >= this.canvas.height) {
            this.vy *= -1;
            bound[0] = true;

            if (nextY - this.size <= 0) {
                this.y = this.size;
            } else {
                this.y = this.canvas.height - this.size;
            }
        } else {
            this.y = nextY;
        }

        let paddleCollision = false;
        if (this.collisionPaddle(paddle1) || this.collisionPaddle(paddle2))
        {
            bound[1] = true;
            paddleCollision = true;
            if (this.ballSpeed < 8){
                this.ballSpeed += 0.4;
            }
        }

        if (!paddleCollision) {
            this.x = nextX;
        }

        return bound;
    }

    collisionPaddle(paddle)
    {
        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;

        if (nextX - this.size < paddle.x + paddle.width &&
            nextX + this.size > paddle.x &&
            nextY - this.size < paddle.y + paddle.height &&
            nextY + this.size > paddle.y) {
            
            const collidePoint = (this.y - (paddle.y + paddle.height / 2));
            const normalizedCollidePoint = collidePoint / (paddle.height / 2);

            const maxBounceAngle = Math.PI / 3;
            const bounceAngle = normalizedCollidePoint * maxBounceAngle;

            const direction = Math.sign(this.vx) * -1;
            this.vx = direction * this.ballSpeed * Math.cos(bounceAngle);
            this.vy = this.ballSpeed * Math.sin(bounceAngle);
            if (direction === -1) {
                this.x = paddle.x - this.size;
            } else {
                this.x = paddle.x + paddle.width + this.size;
            }

            return true;
        }
        return false;
    }

    getPos() {
        return this.x, this.y;
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