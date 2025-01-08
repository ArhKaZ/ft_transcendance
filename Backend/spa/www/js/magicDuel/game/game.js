
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
        this.assetsPath = window.MAGICDUEL_ASSETS;
        this.back.src = '../static/magicDuel/map/back.png';
        this.plat.src = '../static/magicDuel/map/plat_little.png';
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
        this.displayCanvas();
        this.isRunning = true;
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.isRunning = false;
    }


    toggleCanvas(show) {
        const gameCanvas = document.getElementById('gameCanvas');
        if (show) {
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

    displayCanvas() {
        document.getElementById('button-ready').classList.add('hidden');
        document.getElementById('canvasContainer').style.display = 'flex';
    }

    getPlayer(playerId) {
        if (playerId == this.P1.id)
            return this.P1;
        else if (playerId == this.P2.id)
            return this.P2;
    }

    displayWinner(winner) {
        const endElement = document.getElementById('end-container');
        const gameCanvas = document.getElementById('gameCanvas');
        const p1ImgElement = document.getElementById('end-img-p1');
        const p2ImgElement = document.getElementById('end-img-p2');
        const p1NameElement = document.getElementById('end-name-p1');
        const p2NameElement = document.getElementById('end-name-p2');

        if (this.P1.id === winner) {
            document.getElementById('crown-img-p1').classList.remove('hidden');
        } else {
            document.getElementById('crown-img-p2').classList.remove('hidden');
        }
        
        p1ImgElement.src = this.P1.img;
        p2ImgElement.src = this.P2.img;
        p1NameElement.textContent = this.P1.name;
        p2NameElement.textContent = this.P2.name;
        gameCanvas.classList.add('hidden');
        endElement.classList.remove('hidden');
    }

    gameLoop(timestamp) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }

        const elapsed = timestamp - this.lastTimestamp;

        if (elapsed >= this.frameInterval) {
            this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

            this.gameCtx.drawImage(this.plat, this.gameCanvas.width * (3/100), this.gameCanvas.height * (72/100));
            this.gameCtx.drawImage(this.plat, this.gameCanvas.width * (76/100), this.gameCanvas.height * (72/100));
            this.P1.updateAnimation(this.gameCtx);
            this.P2.updateAnimation(this.gameCtx);

            this.lastTimestamp = timestamp;
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
}

export default Game;