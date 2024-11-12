import Animation from "./animation.js";

class Player {
    constructor(nb, canvas, name, id, lifes) {
        this.name = name;
        this.id = id;
        this.nb = nb;
        if (nb === 1) {
            this.x = canvas.width * 10 / 100;
        } else
            this.x = canvas.width * 70 / 100;
        this.y = canvas.height * 60 / 100;
        this.lifes = lifes;
        this.currentAnimation = 'Idle';
        this.sprites = new Animation();
    }


    draw(canvas, ctx) {
        const animate = () => {
            this.sprites.update(ctx, this);
            requestAnimationFrame(animate);
        };

        animate();
    }

}

export default Player;