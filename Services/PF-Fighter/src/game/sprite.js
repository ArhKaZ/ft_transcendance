class Sprite {
    constructor(src, totalFrames, animationSpeed) {
        this.sprite = new Image();
        this.sprite.src = src;
        this.totalFrames = totalFrames;
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.currentFrame = 0;
        this.frameCount = 0;
        this.animationSpeed = animationSpeed;
        this.isAnimationComplete = false;
    }

    drawSprite(ctx, canvasX, canvasY, isAttack = false, isJump = false, hitboxes = null, scale = 2) {

        const scaledWidth = this.frameWidth * scale;
        const scaledHeight = this.frameHeight * scale;
        ctx.drawImage(
            this.sprite,
            this.currentFrame * this.frameWidth, 0,
            this.frameWidth, this.frameHeight,
            canvasX, canvasY,
            scaledWidth, scaledHeight
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

            if (this.currentFrame >= this.totalFrames - 1) {
                this.currentFrame = this.totalFrames - 1;
                this.isAnimationComplete = true;
            }
        }

        hitboxes.forEach((hitbox) => {
            hitbox.checkActivation(this.currentFrame);
        });

        this.removeExpiredHitboxes(hitboxes);
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