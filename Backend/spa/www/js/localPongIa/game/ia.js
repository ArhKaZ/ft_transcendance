import Player from './player.js';
class IA {
	constructor(level, canvas) {
		this.level = level;
		this.canvas = canvas;
		this.lastCheck = null;
		this.newPosition = -1;
		this.target = -1;
		this.errorRange = { 
			1: this.canvas.height / 10, 
			2: this.canvas.height / 25, 
			3: this.canvas.height / 50
		}
		this.reactionTime = {
			1: 800,
			2: 500,
			3: 300
		}
	}

	getFuturePosition(ball, paddle, keyState) {
		let temps = (paddle.x - ball.x) / ball.vx;
		let positionFuture = ball.y + ball.vy * temps;

		while (positionFuture < 0 || positionFuture > this.canvas.height) {
			if (positionFuture < 0) {
				positionFuture = -positionFuture;
			} else if (positionFuture > this.canvas.height) {
				positionFuture = 2 * this.canvas.height - positionFuture;
			}
		}
		this.newPosition = positionFuture;
		let error = Math.random() * this.errorRange[this.level] - this.errorRange[this.level] / 2;
		this.target = this.newPosition + error;
		keyState['z'] = false;
		keyState['q'] = false;
		this.lastCheck = Date.now();
	}

	checkPosition(ball, paddle, keyState) {
		if (ball.vx > 0) {
			let now = Date.now();
			let diff;
			if (this.lastCheck != null) {
				diff = now - this.lastCheck;
			}
			if (this.lastCheck == null || diff >= 1000) 
				this.getFuturePosition(ball, paddle, keyState);
			if (this.newPosition != -1)
				this.movePaddle(paddle, keyState);
		}
	}

	movePaddle(paddle, keyState) {
		let randPosInPaddle = Math.floor(Math.random() * (paddle.y + paddle.height - paddle.y + 1)) + paddle.y;
		setTimeout(() => {
		if (this.target > randPosInPaddle) {
			keyState['z'] = true;
		} else if (this.target < randPosInPaddle) {
			keyState['q'] = true;
	}}, this.reactionTime[this.level]);
	}

	resetPos() {
		this.newPosition = -1;
	}

	setThink(setter) {
		this.addToThink = setter;
	}
}

export default IA;