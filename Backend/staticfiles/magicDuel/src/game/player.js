import Animation from "./animation.js";

class Player {
    constructor(nb, canvas, name, id, lifes) {
        this.canvas = canvas;
        this.name = name;
        this.id = id;
        this.nb = nb;
        if (nb === 1) {
            this.x = canvas.width * 5 / 100;
        } else
            this.x = canvas.width * 70 / 100;
        this.y = canvas.height * 40 / 100;
        this.lifes = lifes;
        this.currentAnimationPlayer = 'Idle';
        this.currentAnimationAttack = null;
        this.sprites = new Animation();
        this.isAnimatingAttack = false;
        this.isAnimatingPlayer = false;
        this.queuedAnimationPlayer = null;
        this.currentAttackSprite = null;
    }

    updateAnimation(ctx) {
        if (this.isAnimatingPlayer && this.sprites.isAnimationComplete(this.currentAnimationPlayer)) {
            if (this.queuedAnimationPlayer) {
                this.currentAnimationPlayer = this.queuedAnimationPlayer;
                this.queuedAnimationPlayer = null;
            } else {
                this.currentAnimationPlayer = 'Idle';
            }
            this.isAnimatingPlayer = true;
        }

        let  attackSprite = null;
        if (this.currentAttackSprite) {
            attackSprite = this.currentAttackSprite;

            if (this.currentAttackSprite.animationFinish()) {
                this.currentAnimationAttack = null;
                this.isAnimatingAttack = false;
            }
        }

        this.sprites.update(ctx, this, attackSprite);
    }

    playAnimationPlayer(animationName) {
        if (this.isAnimatingPlayer) {
            this.queuedAnimationPlayer = animationName;
            return;
        }

        this.currentAnimationPlayer = animationName;

        if (animationName !== 'Idle') {
            this.isAnimatingPlayer = true;
            this.sprites.resetAnimation(animationName);
        }
    }

    playAnimationAttack(attackName) {
        this.currentAttackSprite = this.sprites.getAttackSprite(attackName);
        this.isAnimatingAttack = true;
    }
}

export default Player;