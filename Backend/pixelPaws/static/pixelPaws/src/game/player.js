import Animation from './animation.js'
import GameMap from './gamemap.js'

class Player {
    constructor(nb, canvas, name, id, x, y, percent, lifes) {
        this.name = name;
        this.canvas = canvas;
        this.id = id;
        this.nb = nb;
        this.x = x * canvas.width / 100;
        this.y = y * canvas.height / 100;
        this.percent = percent;
        this.lifes = lifes;
        this.isAnimating = false;
        this.currentAnimation = 'Idle';
        this.look = 'right';
        this.isMoving = false;
        this.isJumping = false;
        this.sprites = new Animation();
        this.lastPosition = {x: this.x, y: this.y};
        this.drawRequested = false;
    }

    decrementStock()
    {
        this.score -= 1;
    }

    getStock() {
        return this.stocks;
    }

    getName() {
        return this.name;
    }

    startAnimation(data, game) {
        this.isAnimating = true;
        this.animate(game, data);
    }

    stopAnimation() {
        this.isAnimating = false;
        this.currentAnimation = 'Idle';
    }

    animate(game, data) {
        if (!this.isAnimating) return;

        const newX = (data.player_x * game.canvas.width / 100) - 46;
        const newY = (data.player_y * game.canvas.height / 100) - 34;

        if (newX !== this.lastPosition.x) {
            this.isMoving = true;
            this.look = newX > this.lastPosition.x ? 'right' : 'left';
        } else {
            this.isMoving = false;
        }

        this.isJumping = newY !== this.lastPosition.y;

        this.x = newX;
        this.y = newY;
        this.look = data.player_look;

        if (data.animation) {
            this.currentAnimation = data.animation;
        } else {
            if (this.isJumping) {
                this.currentAnimation = 'Jump';
            } else if (this.isMoving) {
                this.currentAnimation = 'Run';
            } else {
                this.currentAnimation = 'Idle';
            }
        }

        this.lastPosition = {x: this.x, y: this.y};
        this.drawRequested = true;
    }

    draw(ctx) {
        //if (this.drawRequested) {
            this.sprites.update(ctx, this);
            this.drawRequested = false;
        //}
    }

}

export default Player;