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
            this.x = canvas.width * (72 / 100);
        this.y = canvas.height * (40 / 100);
        this.lifes = lifes;
        this.currentAnimationPlayer = `IdleP${nb}`;
        this.currentAnimationAttack = 'dark_bolt';
        this.sprites = new Animation();
        this.isAnimatingAttack = false;
        this.isAnimatingPlayer = false;
        this.queuedAnimationPlayer = null;
        this.currentAttackSprite = null;
    }

    updatePos(canvas, plat) {
        this.canvas = canvas;
        let scaleFactor = canvas.width / 1400;
        let newPlatWidth = plat.width * scaleFactor;
        let newPlatHeight = plat.height * scaleFactor;
        let spriteWidth = 231 * scaleFactor;
        let spriteHeight = 190 * scaleFactor;

        if (this.nb === 1) {
            this.x = canvas.width * 0.05 + newPlatWidth / 2 - spriteWidth / 1.2;
        } else
            this.x = canvas.width * 0.95 - newPlatWidth / 2 - spriteWidth / 1.2;
        
        let marginAbovePlatform = newPlatHeight * 0.1;
        this.y = canvas.height - newPlatHeight - spriteHeight - marginAbovePlatform;
    }

    updateAnimation(ctx) {
        if (this.isAnimatingPlayer && this.sprites.isAnimationComplete(this.currentAnimationPlayer)) {
            if (this.queuedAnimationPlayer) {
                this.currentAnimationPlayer = this.queuedAnimationPlayer;
                this.queuedAnimationPlayer = null;
                this.isAnimatingPlayer = true;
            } else {
                this.currentAnimationPlayer = `IdleP${this.nb}`;
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
        animationName = animationName + `P${this.nb}`;
        if (this.isAnimatingPlayer) {
            this.queuedAnimationPlayer = animationName;
            return;
        }

        this.currentAnimationPlayer = animationName;

        if (animationName !== `IdleP${this.nb}`) {
            this.isAnimatingPlayer = true;
            this.sprites.resetAnimation(animationName);
        }
    }

    playAnimationAttack(attackName) {
        this.currentAttackSprite = this.sprites.getAttackSprite(attackName);
        if (this.currentAttackSprite)
            this.currentAttackSprite.resetAnimation();
        this.isAnimatingAttack = true;
    }

    loosePv() {
        this.lifes -= 1;
        let nb_heart = 0;
        switch (this.lifes) {
            case 0:
                nb_heart = 1;
                break;
            case 1:
                nb_heart = 2;
                break;
            case 2:
                nb_heart = 3;
                break;
        }
        document.getElementById(`p${this.nb}-full-heart-${nb_heart}`).classList.add('hidden');
        document.getElementById(`p${this.nb}-empty-heart-${nb_heart}`).classList.remove('hidden');
    }
}

export default Player;