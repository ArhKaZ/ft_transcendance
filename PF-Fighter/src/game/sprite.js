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

    drawSprite(isAttack, ctx, canvasX, canvasY, scale = 2) {

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
            this.updateFrame();
        else
            this.updateFrameAttack();

        if (this.isAnimationComplete) {
            this.resetAnimation();
        }
    }

    affDurAnim() {
        console.log(this.totalFrames * this.animationSpeed);
    }

    updateFrame() {
        this.frameCount++;
        if (this.frameCount >= this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
            this.frameCount = 0;
        }
    }

    updateFrameAttack()
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
    }

    resetAnimation() {
        this.currentFrame = 0;
        this.frameCount = 0;
        this.isAnimationComplete = false;
    }
}

export default Sprite;