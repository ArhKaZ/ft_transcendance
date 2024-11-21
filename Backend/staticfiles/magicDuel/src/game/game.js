
class Game {
    constructor(backCanvas, gameCanvas, attackCanvas, P1, P2) {
        this.backCanvas = backCanvas;
        this.gameCanvas = gameCanvas;
        this.attackCanvas = attackCanvas;
        this.backCtx = backCanvas.getContext("2d");
        this.gameCtx = gameCanvas.getContext('2d');
        this.attackCtx = attackCanvas.getContext('2d');
        this.P1 = P1;
        this.P2 = P2;
        this.isRunning = false;
        this.back = new Image();
        this.assetsPath = window.MAGICDUEL_ASSETS;
        this.getAssetPath = (path) => `${this.assetsPath}assets/${path}`;
        this.back.src = this.getAssetPath('newMapBig.png');
        this.keyState = {};
        this.bindEvents();
        this.countdownFinish = false;

        //TEST ANIMATION
        this.animationFrameId = null;
        this.lastTimestamp = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;

    }

    bindEvents() {
        window.addEventListener('keydown', (event) => {
                this.keyState[event.key] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keyState[event.key] = false;
        });
    }

    start() {
        console.log('canvas display');
        this.displayCanvas();
        this.isRunning = true;
        console.log('start finished');
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.isRunning = false;
    }

    playerAttack(playerId) {
        if (playerId === this.P1.id) {
            this.P1.playAnimationPlayer('Attack')
        } else if (playerId === this.P2.id) {
            this.P2.playAnimationPlayer('Attack');
        }
    }

    toggleTimer(show) {
        const timer = document.getElementById('timer-element');
        if (show) {
            timer.classList.remove('hidden');
        } else {
            timer.classList.add('hidden');
        }
    }

    toggleButtons(show) {
        const choiceButtons = document.getElementById('choiceButtons');
        if (show) {
            choiceButtons.classList.remove('hidden');
        } else {
            choiceButtons.classList.add('hidden');
        }
    }

    drawMap()
    {
        const ctx = this.backCanvas.getContext('2d');
        ctx.drawImage(this.back, 0, 0, this.backCanvas.width, this.backCanvas.height);
    }

    displayCanvas() {
        document.getElementById('buttonStart').classList.add('hidden');
        document.getElementById('canvasContainer').style.display = 'flex';
    }

    gameLoop(timestamp) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }

        const elapsed = timestamp - this.lastTimestamp;

        if (elapsed >= this.frameInterval) {
            this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            // this.attackCanvas.clearRect(0, 0, this.attackCanvas.width, this.attackCanvas.height);

            this.P1.updateAnimation(this.gameCtx);
            this.P2.updateAnimation(this.gameCtx);

            this.lastTimestamp = timestamp;
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
}

export default Game;