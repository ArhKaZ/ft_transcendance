import GameMap from './GameMap.js';
class PlayerAction {
    constructor(x, y, nb) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 10;
        this.map = new GameMap(1);
        this.nb = nb;
    }

    update(keyState, keyStateRepeat) {
        if (this.nb === 1)
        {
            this.moveP1(keyState, keyStateRepeat);
        }
        else if (this.nb === 2) {
            this.moveP2(keyState, keyStateRepeat); 
        }
    }

    moveP1(keyState, keyStateRepeat) {
        if (keyState && keyState['w']) {
            this.y -= this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['w']) {
            this.y -= this.speed * 2;
        }
        if (keyState && keyState['d']) {
            this.x += this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['d']) {
            this.x += this.speed * 2;
        }
        if (keyState && keyState['s']) {
            this.y += this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['s']) {
            this.y += this.speed * 2;
        }
        if (keyState && keyState['a']) {
            this.x -= this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['a']) {
            this.x -= this.speed * 2;
        }
    }

    moveP2(keyState, keyStateRepeat) {
        if (keyState && keyState['ArrowUp']) {
            this.y -= this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['ArrowUp']) {
            this.y -= this.speed * 2;
        }
        if (keyState && keyState['ArrowRight']) {
            this.x += this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['ArrowRight']) {
            this.x += this.speed * 2;
        }
        if (keyState && keyState['ArrowDown']) {
            this.y += this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['ArrowDown']) {
            this.y += this.speed * 2;
        }
        if (keyState && keyState['ArrowLeft']) {
            this.x -= this.speed;
        }
        if (keyStateRepeat && keyStateRepeat['ArrowLeft']) {
            this.x -= this.speed * 2;
        }
    }
    // checkDeath() {
    //     if (x === map)
    // }

    draw(ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default PlayerAction;