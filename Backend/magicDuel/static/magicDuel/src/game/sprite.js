class Sprite {
    constructor(src, totalFrames, animationSpeed, width, height, name, isLooping = false) {
        this.name = name;
        this.sprite = new Image();
        this.sprite.src = src;
        this.totalFrames = totalFrames;
        this.frameWidth = width;
        this.frameHeight = height;
        this.currentFrame = 0;
        this.frameCount = 0;
        this.animationSpeed = animationSpeed;
        this.isAnimationComplete = false;
        this.isLooping = isLooping;
    }

    drawSprite(ctx, canvasX, canvasY, scale = 2) {
        const sx = this.currentFrame * this.frameWidth;
        const sy = 0;
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

        this.updateFrame();
    }

    animationFinish() {
        return this.isAnimationComplete;
    }

    updateFrame() {
        this.frameCount++;
        if (this.frameCount >= this.animationSpeed) {
            this.frameCount = 0;
            this.currentFrame++;

            if (this.isLooping) {
                this.currentFrame = this.currentFrame % this.totalFrames;
            } else {
                if (this.currentFrame >= this.totalFrames) {
                    this.isAnimationComplete = true;
                    this.currentFrame = this.totalFrames - 1;
                }
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