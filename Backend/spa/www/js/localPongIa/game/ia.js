import Player from './player.js';
class IA {
    constructor(level = 2, canvas) {
        this.level = level * 10;
        this.addToThink = false;
        this.canvas = canvas;
        this.lastCheck = null;
        this.newPosition = -1;
        this.target = -1;
    }

    getFuturePosition(ball, paddle) {
        let temps = (paddle.x - ball.x) / ball.vx;
        let positionFuture = ball.y + ball.vy * temps;

        while (positionFuture < 0 || positionFuture > this.canvas.height) {
            if (positionFuture < 0) {
                positionFuture = -positionFuture;
            } else if (positionFuture > this.canvas.height) {
                positionFuture = 2 * this.canvas.height - positionFuture;
            }
        }

        return positionFuture;
    }

    checkPosition(ball, paddle, keyState) {
        if (!this.addToThink) return;
        let now = Date.now();
        let diff;
        if (this.lastCheck != null) {
            diff = now - this.lastCheck;
        }
        if (this.lastCheck == null || diff >= 1000) {

            this.newPosition = this.getFuturePosition(ball, paddle);
            let error = Math.random() * this.level - this.level / 2;
            this.target = this.newPosition + error;
            keyState['z'] = false;
            keyState['q'] = false;
            this.lastCheck = Date.now();
        }

        if (this.newPosition != -1)
            this.movePaddle(paddle, keyState);

        console.debug(keyState);
    }

    movePaddle(paddle, keyState) {
        setTimeout(() => {
        if (this.target > paddle.y + paddle.height / 2) {
            keyState['z'] = true;
        } else if (this.target < paddle.y + paddle.height / 2) {
            keyState['q'] = true;
    }}, );
    }

    resetPos() {
        this.newPosition = -1;
    }

    setThink(setter) {
        this.addToThink = setter;
    }
}

export default IA;