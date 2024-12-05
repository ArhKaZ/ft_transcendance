
class Game {
    constructor(gameCanvas, attackCanvas, P1, P2) {
        this.gameCanvas = gameCanvas;
        this.attackCanvas = attackCanvas;
        this.gameCtx = gameCanvas.getContext('2d');
        this.attackCtx = attackCanvas.getContext('2d');
        this.P1 = P1;
        this.P2 = P2;
        this.isRunning = false;
        this.back = new Image();
        this.plat = new Image();
        this.backLifeBar = new Image();
        this.lifeBar = new Image();
        this.assetsPath = window.MAGICDUEL_ASSETS;
        this.getAssetPath = (path) => `${this.assetsPath}assets/${path}`;
        this.back.src = this.getAssetPath('map/back.png');
        this.backLifeBar.src = this.getAssetPath('Hearts/back_life_bar.png');
        this.lifeBar.src = this.getAssetPath('Hearts/life_bar.png');
        this.plat.src = this.getAssetPath('map/plat_little.png');
        this.keyState = {};
        this.bindEvents();
        this.countdownFinish = false;

        //TEST ANIMATION
        this.animationFrameId = null;
        this.lastTimestamp = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;

    }

    updateCanvas(gameCanvas, attackCanvas) {
        this.gameCanvas = gameCanvas;
        this.attackCanvas = attackCanvas;
        this.gameCtx = gameCanvas.getContext('2d');
        this.attackCtx = attackCanvas.getContext('2d');
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
            this.P1.playAnimationPlayer('Attack');
        } else if (playerId === this.P2.id) {
            this.P2.playAnimationPlayer('Attack');
        }
    }

    toggleCanvas(show) {
        const gameCanvas = document.getElementById('gameCanvas');
        if (show) {
            // gameCanvas.classList.remove('hidden'); ??? 
            gameCanvas.style.backgroundImage = 'url(' + this.back.src + ')';
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

    toggleInfoPlayer(show) {
        const infoP1 = document.getElementById('infoP1');
        const infoP2 = document.getElementById('infoP2');

        if (show) {
            infoP1.classList.remove('hidden');
            infoP2.classList.remove('hidden');
        } else {
            infoP1.classList.add('hidden');
            infoP2.classList.add('hidden');
        }
    }

    toggleHudPlayer(show) {
       const huds = document.getElementById('hud-items');
       if (show) {
           huds.classList.remove('hidden');
       } else {
           huds.classList.add('hidden');
       }
    }

    fillUsernames() {
        if (!this.P1.name || !this.P2.name) {
            console.error('Error with one of the username');
        }
        document.getElementById('p1-hud-name-element').textContent = this.P1.name;
        document.getElementById('p2-hud-name-element').textContent = this.P2.name;
    }

    fillLifeBar() {
        const backLifeBar1 = document.getElementById('back-life-bar-1');
        const backLifeBar2 = document.getElementById('back-life-bar-2');
        const frontLife1 = document.getElementById('front-life-1');
        const frontLife2 = document.getElementById('front-life-2');

        backLifeBar1.src = this.backLifeBar.src;
        backLifeBar2.src = this.backLifeBar.src;
        frontLife1.src = this.lifeBar.src;
        frontLife2.src = this.lifeBar.src;
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
            
            this.gameCtx.drawImage(this.plat, this.gameCanvas.width * (7/100), this.gameCanvas.height * (74/100));
            this.gameCtx.drawImage(this.plat, this.gameCanvas.width * (76/100), this.gameCanvas.height * (74/100));
            this.P1.updateAnimation(this.gameCtx);
            this.P2.updateAnimation(this.gameCtx);

            this.lastTimestamp = timestamp;
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
}

export default Game;