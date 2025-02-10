class IA {
	constructor(canvas) {
		this.level = 0;
		this.canvas = canvas;
		this.lastCheck = null;
		this.newPosition = -1;
		this.target = -1;
		this.randPos = -1;
		this.errorRange = [
			this.canvas.height / 4,
			this.canvas.height / 8,
			this.canvas.height / 12,
		];
		this.reactionTime = {
			1: 1100,
			2: 800,
			3: 500
		}
	}

	getFuturePosition(ball, paddle, keyState) {
		let time = (paddle.x - ball.x) / ball.vx;
		let positionFuture = ball.y + ball.vy * time;

		while (positionFuture < 0 || positionFuture > this.canvas.height) {
			if (positionFuture < 0) {
				positionFuture = -positionFuture;
			} else if (positionFuture > this.canvas.height) {
				positionFuture = 2 * this.canvas.height - positionFuture;
			}
		}
		this.target = positionFuture;
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

			if (this.lastCheck == null || diff >= 1000) {
				this.getFuturePosition(ball, paddle, keyState);
				this.target += Math.random() * this.errorRange[this.level];
			}

			if (this.target != -1) {
				this.movePaddle(paddle, keyState);
			}
		} else {
			keyState['z'] = false;
			keyState['q'] = false;
			this.target = -1;
		}
	}

	movePaddle(paddle, keyState) {
		if (this.level === 3 && Math.random() < 0.005) {
			console.log('ia get bugged');
			this.target += this.canvas.height / 8;
		}
		setTimeout(() => {
			if (this.target > paddle.y + paddle.height) {
				keyState['z'] = true;
			} else if (this.target < paddle.y) {
				keyState['q'] = true;
			}
		}, (this.reactionTime[this.level] + Math.random() * 100 - 50));
	}

	generatePointOnPaddle(paddle) {
		const difficultyFactor = Math.min(1, Math.max(0, (this.level - 1) / 2));

		const edgeMargin = difficultyFactor * (paddle.height / 4);

		const validStart = edgeMargin;
		const validEnd = paddle.height - edgeMargin;
		console.log(`validStart: ${validStart} | validEnd: ${validEnd}`);
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