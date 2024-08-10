import PlayerAction from "./PlayerAction.js";

class Game {
    constructor(canvas, P1, P2) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.p1 = P1;
        this.p2 = P2;
        this.p1.cube = new PlayerAction(this.canvas.height / 2, this.canvas.width / 4, 1);
        this.p2.cube = new PlayerAction(this.canvas.height / 2, this.canvas.width / 8, 2);
        this.isRunning = false;
        this.keyState = {};
        this.keyStateRepeat = {};
        this.dashCC = 0;
        this.lastKeyPressTime = 0;
        this.doublePerssThreshold = 300;
        this.lastKey = null;
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (event) => {
            const currentTime = Date.now();
            if (this.lastKey === event.key && (currentTime - this.lastKeyPressTime) < this.doublePerssThreshold) {
                this.keyStateRepeat[event.key] = true;
            } else {
                this.lastKeyPressTime = currentTime;
                this.lastKey = event.key;
                this.keyState[event.key] = true;
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keyState[event.key] = false;
            this.keyStateRepeat[event.key] = false;
        })
    }

    start() {
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
    }

    loop() {
        if (!this.isRunning) return;

        this.update();
        this.draw();

        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.p1.cube.update(this.keyState, this.keyStateRepeat);
        this.p2.cube.update(this.keyState, this.keyStateRepeat);
        //this.checkIfDeath();
    }

    draw()
    {
        console.log('ici');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        console.log('ici2');
        this.p1.cube.draw(this.ctx);
        console.log('ici3');
        this.p2.cube.draw(this.ctx);
        console.log('ici4');
    }

    // checkIfDeath() {
    //     this.p1.cube.checkDeath();
    //     this.p2.cube.checkDeath();
    // }
}

export default Game;