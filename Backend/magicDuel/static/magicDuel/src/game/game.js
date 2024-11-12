
class Game {
    constructor(backCanvas, gameCanvas, P1, P2) {
        this.backCanvas = backCanvas;
        this.gameCanvas = gameCanvas;
        this.backCtx = backCanvas.getContext("2d");
        this.gameCtx = gameCanvas.getContext('2d');
        this.P1 = P1;
        this.P2 = P2;
        this.isRunning = false;
        this.back = new Image();
        this.assetsPath = window.MAGICDUEL_ASSETS;
        this.getAssetPath = (path) => `${this.assetsPath}assets/${path}`;
        this.back.src = this.getAssetPath('map.png');
        this.keyState = {};
        this.bindEvents();
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
        this.drawMap(this.backCtx, this.backCanvas.width, this.backCanvas.height);
    }

    toggleButtons(show) {
        const choiceButtons = document.getElementById('choiceButtons');
        if (show) {
            choiceButtons.classList.remove("hidden");
        } else {
            choiceButtons.classList.add("hidden");
        }
    }



    drawMap(ctx, width, height)
    {
        ctx.drawImage(this.back, 0, 0, width, height);
    }

    drawPlayers() {
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
        this.P1.draw(this.gameCanvas, this.gameCtx);
        this.P2.draw(this.gameCanvas, this.gameCtx);
    }

    displayCanvas() {
        document.getElementById('buttonStart').classList.add('hidden');
        document.getElementById('canvasContainer').style.display = 'flex';
    }
}

export default Game;