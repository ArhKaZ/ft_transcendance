class IA {
	constructor(canvas) {
		this.level = 0;
		this.canvas = canvas;
		this.lastCheck = null;
		this.newPosition = -1;
		this.target = -1;
		this.randPos = -1;
		this.errorRange = { 
			1: this.canvas.height / 8, 
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
		console.log(`target: ${this.newPosition} error: ${error} final: ${this.target}`)
		keyState['z'] = false;
		keyState['q'] = false;
		this.lastCheck = Date.now();
	}

	checkPosition(ball, paddle, keyState) {
		if (ball.vx > 0) {
			let now = Date.now();
			let diff;
			if (this.randPos === -1)
				this.randPos = this.generatePointOnPaddle(paddle);

			if (this.lastCheck != null) {
				diff = now - this.lastCheck;
			}
			if (this.lastCheck == null || diff >= 1000) {
				this.getFuturePosition(ball, paddle, keyState);
				console.log(`randPos: ${this.randPos}`);
			}
			if (this.newPosition != -1)
				this.movePaddle(paddle, this.randPos, keyState);
		} else {
			keyState['z'] = false;
			keyState['q'] = false;
			this.randPos = -1;
		}
	}

	movePaddle(paddle, randPosInPaddle, keyState) {
		if (!randPosInPaddle) return;
		console.log(`random Pos: ${randPosInPaddle}`);
		if (this.level === 3 && Math.random() < 0.005) {
			console.log('ia get bugged');
			this.target += this.canvas.height / 8;
		}
		setTimeout(() => {
			if (this.target > paddle.y + randPosInPaddle) {
				keyState['z'] = true;
			} else if (this.target < paddle.y + randPosInPaddle) {
				keyState['q'] = true;
			}
		}, (this.reactionTime[this.level] + Math.random() * 100 - 50));
	}

	generatePointOnPaddle(paddle) {
		const difficultyFactor = Math.min(1, Math.max(0, (this.level - 1) / 2));

		const edgeMargin = difficultyFactor * (paddle.height / 4);

		const validStart = edgeMargin;
		const validEnd = paddle.height - edgeMargin;

		return Math.random() * (validEnd - validStart) + validStart;
	}

	resetPos() {
		this.newPosition = -1;
	}

	setThink(setter) {
		this.addToThink = setter;
	}

	assignLevel(level) {
		this.level = level;
	}
}

export default IA;