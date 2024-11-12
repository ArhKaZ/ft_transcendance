class GameMap {
    constructor(canvas, x, y, height, width, groundY, groundX, backSrc, stageSrc) {
        this.x = x * canvas.width / 100;
        this.y = y * canvas.height / 100;
        this.height = height * canvas.height / 100;
        this.width = width * canvas.width / 100;
        this.groundY = groundY * canvas.height / 100;
        this.groundX = groundX * canvas.width / 100;
        // this.groundEndX = this.groundX + (this.width - 10);
        this.back = new Image();
        this.assetsPath = window.PIXELPAWS_ASSETS || '/static/pixelPawsdrop/';
        this.getAssetPath = (path) => `${this.assetsPath}assets/Map/${path}`
        this.back.src = this.getAssetPath(backSrc);
        this.stage = new Image();
        this.stage.src = this.getAssetPath(stageSrc);
    }

    draw(ctx, canvas) {
        ctx.drawImage(this.back, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.stage, this.x, this.y, this.width, this.height);
        // ctx.fillStyle = 'black';
        // ctx.fillRect(this.groundX, this.groundY, this.width, 5);
    }
}

export default GameMap;