import Animation from "./animation.js";

class Player {
    constructor(nb, canvas, name, id, img, lifes) {
        this.canvas = canvas;
        this.name = name;
        this.id = id;
        this.nb = nb;
        this.img = img
        if (nb === 1) {
            this.x = canvas.width * (1 / 100);
        } else
            this.x = canvas.width * (70 / 100);
        this.y = canvas.height * (40 / 100);
        this.lifes = lifes;
        this.currentAnimationPlayer = 'Idle';
        this.currentAnimationAttack = 'dark_bolt';
        this.sprites = new Animation();
        this.isAnimatingAttack = false;
        this.isAnimatingPlayer = false;
        this.queuedAnimationPlayer = null;
        this.currentAttackSprite = null;
    }

    updatePos(canvas) {
        this.canvas = canvas;
        if (this.nb === 1) {
            this.x = canvas.width * (3 / 100);
        } else
            this.x = canvas.width * (70 / 100);
        this.y = canvas.height * (40 / 100);
    }

    updateAnimation(ctx) {
        if (this.isAnimatingPlayer && this.sprites.isAnimationComplete(this.currentAnimationPlayer)) {
            if (this.queuedAnimationPlayer) {
                this.currentAnimationPlayer = this.queuedAnimationPlayer;
                this.queuedAnimationPlayer = null;
                this.isAnimatingPlayer = true;
            } else {
                this.currentAnimationPlayer = 'Idle';
                this.isAnimatingPlayer = false;
            }
        }

        let attackSprite = null;

        if (this.currentAttackSprite) {
            attackSprite = this.currentAttackSprite;

            if (this.currentAttackSprite.animationFinish()) {
                this.currentAttackSprite = null;
                this.currentAnimationAttack = null;
                this.isAnimatingAttack = false;
                this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);
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

    loosePv() {
        this.lifes -= 1;
        const lifeElement = document.getElementById(`front-life-${this.nb}`);

        lifeElement.classList.add('damage');
        setTimeout(() => {
            lifeElement.classList.remove('damage');
        }, 500);

        let newWidth = null;

        switch (this.lifes) {
            case 0:
                newWidth = '0%';
                break;
            case 1:
                newWidth = '20%';
                break;
            case 2:
                newWidth = '40%';
                break;
        }
        lifeElement.style.width = newWidth;
    }
}

export default Player;