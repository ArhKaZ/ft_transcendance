import Animation from "./animation.js";

class Player {
    constructor(nb, canvas, name, id, lifes) {
        this.name = name;
        this.id = id;
        this.nb = nb;
        if (nb === 1) {
            this.x = canvas.width * 10 / 100;
        } else
            this.x = canvas.width * 90 / 100;
        this.y = canvas.height * 80 / 100;
        this.lifes = lifes;
        this.isAnimating = false;
        this.currentAnimation = 'Idle';
        this.look = 'right';
        this.sprites = new Animation();
    }

    draw(ctx, canvas) {
        const animate = () => {
            const speed = this.sprites.update(ctx, this);
            requestAnimationFrame(animate);
        };

        animate();
    }

}

export default Player;