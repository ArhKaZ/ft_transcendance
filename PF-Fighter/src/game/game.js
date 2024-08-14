import PlayerAction from "./PlayerAction.js";
import Physics from "./physics.js";
import GameMap from "./GameMap.js";
class Game {
    constructor(canvas, P1, P2) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.p1 = P1;
        this.p2 = P2;
        this.map = new GameMap(this.canvas);
        this.p1.cube = new PlayerAction(this.map.x + 5, this.map.y - 40, 1);
        this.p2.cube = new PlayerAction(this.map.x + this.map.width - 30, this.map.y - 40, 2);
        this.isRunning = false;
        this.keyState = {};
        this.keyStateDash = {};
        this.dashCC = 0;
        this.physics = new Physics(0.20);
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (event) => {
            if (event.ctrlKey) {
                this.keyStateDash[event.key] = true;
            } else {
                this.keyState[event.key] = true;
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keyState[event.key] = false;
            this.keyStateDash[event.key] = false;
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
        this.p1.cube.update(this.keyState, this.keyStateDash);
        this.p2.cube.update(this.keyState, this.keyStateDash);

        this.physics.applyGravity(this.p1.cube);
        this.physics.applyGravity(this.p2.cube);

        this.physics.handleCollisionWall(this.p1.cube, this.canvas);
        this.physics.handleCollisionWall(this.p2.cube, this.canvas);

        this.physics.handleCollision(this.p1.cube, this.p2.cube);
        //this.physics.applyForces(this.p1.cube, this.p2.cube);
        //this.physics.handleCollisionPlayer(this.p1.cube, this.p2.cube);

        this.physics.applyMovement(this.p1.cube);
        this.physics.applyMovement(this.p2.cube);

        this.map.handleCollision(this.p1.cube);
        this.map.handleCollision(this.p2.cube);
    }

    draw()
    {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);
        this.p1.cube.draw(this.ctx);
        this.p2.cube.draw(this.ctx);
    }

    // checkIfDeath() {
    //     this.p1.cube.checkDeath();
    //     this.p2.cube.checkDeath();
    // }
}

export default Game;