import PlayerAction from "./PlayerAction.js";
import Physics from "./physics.js";
import Gamemap from "./gamemap.js";
class Game {
    constructor(canvas, P1, P2, gameMap) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.P1 = P1;
        this.P2 = P2;
        this.gameMap = gameMap;
        // this.physics = new Physics(0.1, this.map);
        // this.p1.cube = new PlayerAction(this.map.groundX, this.map.groundY, 1, this.physics);
        // this.p2.cube = new PlayerAction(this.map.groundEndX - 120, this.map.groundY, 2, this.physics);
        this.isRunning = false;
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
        this.loop();
    }

    // stop() {
    //     this.isRunning = false;
    //     this.displayWinner();
    // }
    //
    loop() {
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    displayCanvas() {
        document.getElementById('buttonStart').classList.add('hidden');
        document.getElementById('canvasContainer').style.display = 'flex';
    }

    displayWinner() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'red';
        this.ctx.font = '100px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let winnerText;
        if (this.p1.cube.stock === 0) {
            winnerText = 'P2 has WIN!';
        } else if (this.p2.cube.stock === 0) {
            winnerText = 'P1 has WIN!';
        }

        this.ctx.fillText(winnerText, this.canvas.width / 2, this.canvas.height / 2);
    }

    reset(obj) { // TODO temps invisible ?
        obj.stock--;
        obj.velocityY = 0;
        obj.velocityY = 0;
        obj.isJumping = false;
        obj.percent = 0;
        if (obj.nb === 1) {
            obj.x = this.gameMap.groundX;
            obj.y = this.gameMap.groundY - 60;
        }
        else {
            obj.x = this.gameMap.groundEndX - 120;
            obj.y = this.gameMap.groundY - 60;
        }
    }

    update() {

        this.p1.cube.update(this.keyState);
        this.p2.cube.update(this.keyState);

        this.physics.applyGravity(this.p1.cube);
        this.physics.applyGravity(this.p2.cube);

        this.physics.applyMovement(this.p1.cube);
        this.physics.applyMovement(this.p2.cube);

        if (this.physics.handleCollisionWall(this.p1.cube, this.canvas))
            this.reset(this.p1.cube);
        if (this.physics.handleCollisionWall(this.p2.cube, this.canvas))
            this.reset(this.p2.cube);

        this.gameMap.handleCollision(this.p1.cube);
        this.gameMap.handleCollision(this.p2.cube);

        this.physics.handleHit(this.p1.cube, this.p2.cube);
        this.physics.handleHit(this.p2.cube, this.p1.cube);
    }

    draw()
    {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.gameMap.draw(this.ctx);
        this.P1.draw(this.ctx);
        this.P2.draw(this.ctx);
        // this.p1.cube.draw(this.ctx);
        // this.p2.cube.draw(this.ctx);
    }

}

export default Game;