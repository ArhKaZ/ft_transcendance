import Animation from "./animation.js";

class Player {
    constructor(nb, canvas, name, id, x, y, percent, lifes) {
        this.name = name;
        this.id = id;
        this.nb = nb;
        this.x = (x * canvas.width / 100);
        this.y = (y * canvas.height / 100);
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

    handlePosOrAnim(data, ctx, canvas) {
        this.x = data.player_x * canvas.width / 100;
        this.y = data.player_y * canvas.height / 100;
        const newAnim = data.animation;
        const newLook = data.player_look;
        if (newAnim !== this.currentAnimation || newLook !== this.look) {
            this.currentAnimation = newAnim;
            this.look = newLook;
        }
    }

    draw(ctx, canvas) {
        const animate = () => {
            this.sprites.update(ctx, this);
            requestAnimationFrame(animate);
        };

        animate();
    }

}

export default Player;