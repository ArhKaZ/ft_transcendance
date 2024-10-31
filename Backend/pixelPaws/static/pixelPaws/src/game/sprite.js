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

        // Add loading check
        this.isLoaded = false;
        this.sprite.onload = () => {
            this.isLoaded = true;
        };
    }

    drawSprite(ctx, canvasX, canvasY, isAttack = false, isJump = false, hitboxes = null, scale = 2) {
        if (!this.isLoaded) return;

        const scaledWidth = this.frameWidth * scale;
        const scaledHeight = this.frameHeight * scale;

        try {
            //console.log('1');
            ctx.drawImage(
                this.sprite,
                this.currentFrame * this.frameWidth, 0,
                this.frameWidth, this.frameHeight,
                canvasX, canvasY,
                scaledWidth, scaledHeight
            );
            //console.log('2');
            if (!isAttack) {
               // console.log(3);
                this.updateFrame(isJump);
                //console.log(4);
            } else {
                this.updateFrameAttack(hitboxes);
            }
           // console.log(5);
            if (this.isAnimationComplete) {
                //console.log('end anim');
                this.resetAnimation();
            }
            //console.log(6);
        } catch (error) {
            console.error('Error drawing sprite:', error);
        }
    }

    affDurAnim() {
        console.log(this.totalFrames * this.animationSpeed);
    }

    animationFinish() {
        return this.isAnimationComplete;
    }

    updateFrame(isJump) {
       // console.log(3.1, "frameCount:", this.frameCount);
        this.frameCount++;
        //console.log(3.2, "frameCount:", this.frameCount);
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
        //console.log(3.3);
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