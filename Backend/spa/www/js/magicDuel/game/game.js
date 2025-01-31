
class Game {
    constructor(gameCanvas, attackCanvas, P1, P2) {
        this.gameCanvas = gameCanvas;
        this.attackCanvas = attackCanvas;
        this.gameCtx = gameCanvas.getContext('2d');
        this.attackCtx = attackCanvas.getContext('2d');
        this.P1 = P1;
        this.P2 = P2;
        this.isRunning = false;
        this.back = new Image(gameCanvas.width, gameCanvas.height);
        this.plat = new Image(282, 215);
        this.assetsPath = window.MAGICDUEL_ASSETS;
        this.back.src = '../assets/magicDuel/map/back.png';
        this.plat.src = '../assets/magicDuel/map/plat_little.png';
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

    toggleButtonTuto(show) {
        const button = document.getElementById('btn-book-element');
        if (show) {
            button.classList.remove('hidden');
        } else {
            button.classList.add('hidden');
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
        document.getElementById('canvasContainer').classList.remove('hidden');
    }

    getPlayer(playerId) {
        if (playerId == this.P1.id)
            return this.P1;
        else if (playerId == this.P2.id)
            return this.P2;
    }

    updateImageSize(gameCanvas) {
        this.back.width = gameCanvas.width;
        this.back.height = gameCanvas.height;
    }

    displayWinner(winner) {
        const endElement = document.getElementById('end-container');
        const gameCanvas = document.getElementById('gameCanvas');
        const p1ImgElement = document.getElementById('end-img-p1');
        const p2ImgElement = document.getElementById('end-img-p2');
        const p1NameElement = document.getElementById('end-name-p1');
        const p2NameElement = document.getElementById('end-name-p2');
        const overlay = document.getElementById('bookOverlay');

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
        this.toggleButtonTuto(false);
        if (!overlay.classList.contains('hidden'))
            overlay.classList.add('hidden');
    }

    gameLoop(timestamp) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }

        const elapsed = timestamp - this.lastTimestamp;

        if (elapsed >= this.frameInterval) {
            this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

            let scaleFactor = this.gameCanvas.width / 1400;
            let newPlatWidth = this.plat.width * scaleFactor;
            let newPlatHeight = this.plat.height * scaleFactor;
            this.gameCtx.drawImage(
                this.plat, 
                this.gameCanvas.width * 0.05, 
                this.gameCanvas.height - (newPlatHeight - 5),
                newPlatWidth, 
                newPlatHeight
            );
            this.gameCtx.drawImage(
                this.plat, 
                this.gameCanvas.width * 0.95 - newPlatWidth, 
                this.gameCanvas.height - (newPlatHeight - 5),
                newPlatWidth,
                newPlatHeight
            );
            this.P1.updateAnimation(this.gameCtx);
            this.P2.updateAnimation(this.gameCtx);

            this.lastTimestamp = timestamp;
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
}

export default Game;