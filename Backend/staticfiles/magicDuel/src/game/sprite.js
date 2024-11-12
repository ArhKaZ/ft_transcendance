class Sprite {
    constructor(src, totalFrames, animationSpeed, width, height) {
        this.sprite = new Image();
        this.sprite.src = src;
        this.totalFrames = totalFrames;
        this.frameWidth = 18;
        this.frameHeight = 29;
        this.currentFrame = 0;
        this.frameCount = 0;
        this.animationSpeed = animationSpeed;
        this.isAnimationComplete = false;
    }

    drawSprite(ctx, canvasX, canvasY, isAttack = false, isJump = false, hitboxes = null, scale = 2) {

        const sx = this.currentFrame * 231 + 60;
        const sy = 50;
        const sWidth = this.frameWidth;
        const sHeight = this.frameHeight;
        const dx = canvasX;
        const dy = canvasY;
        const dWidth = this.frameWidth * scale;
        const dHeight = this.frameHeight * scale;
        ctx.drawImage(
            this.sprite,
            sx, sy,
            sWidth, sHeight,
            dx, dy,
            dWidth, dHeight
        );

        if (!isAttack)
            this.updateFrame(isJump);
        else
            this.updateFrameAttack(hitboxes);


        if (this.isAnimationComplete) {
            this.resetAnimation();
        }
    }

    affDurAnim() {
        console.log(this.totalFrames * this.animationSpeed);
    }

    getAnimationSpeed() {
        return this.animationSpeed;
    }

    animationFinish() {
        return this.isAnimationComplete;
    }

    updateFrame(isJump) {
        this.frameCount++;
        if (this.frameCount >= this.animationSpeed) {
            this.frameCount = 0;

            if (isJump) {
                if (this.currentFrame === 3) {
                    this.currentFrame = 4;
                } else if (this.currentFrame === 4) {
                    this.currentFrame = 3;
                } else {
                    this.currentFrame = 3;
                }
            } else {
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
            }
        }
    }

    updateFrameAttack(hitboxes)
    {
        this.frameCount++;
        if (this.frameCount >= this.animationSpeed) {
            this.currentFrame++;
            this.frameCount = 0;

            if (this.currentFrame >= this.totalFrames) {
                this.currentFrame = this.totalFrames - 1;
                this.isAnimationComplete = true;
            }
        }

        hitboxes.forEach((hitbox) => {
            hitbox.checkActivation(this.currentFrame);
        });
        if (this.isAnimationComplete) {
            this.removeExpiredHitboxes(hitboxes);
        }
    }

    removeExpiredHitboxes(hitboxes) {
        for (let i = hitboxes.length - 1; i >= 0; i--) {
            if (hitboxes[i].isExpired(this.currentFrame) || this.isAnimationComplete) {
                hitboxes.splice(i, 1);
            }
        }
    }

    resetAnimation() {
        this.currentFrame = 0;
        this.frameCount = 0;
        this.isAnimationComplete = false;
    }
}

export default Sprite;