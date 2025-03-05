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

    drawSprite(canvas, ctx, canvasX, canvasY) {
        let scaleFactor = canvas.width / 800;
        const sx = this.currentFrame * this.frameWidth;
        const sy = 0;
        const sWidth = this.frameWidth;
        const sHeight = this.frameHeight;
        const dx = canvasX;
        const dy = canvasY;
        const dWidth = this.frameWidth * scaleFactor;
        const dHeight = this.frameHeight * scaleFactor;
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
            if (this.name === 'attackP1' || this.name === 'attackP2')
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

    resetAnimation() {
        this.currentFrame = 0;
        this.frameCount = 0;
        this.isAnimationComplete = false;
    }
}

export default Sprite;