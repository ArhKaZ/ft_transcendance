class Gamemap {
    constructor(canvas, x, y, height, width, groundY, groundX, backSrc, stageSrc) {
        this.canvas = canvas;
        this.x = x * canvas.width / 100;
        this.y = y * canvas.height / 100;
        this.height = height * canvas.height / 100;
        this.width = width * canvas.width / 100;
        this.groundY = groundY * canvas.height / 100;
        this.groundX = groundX * canvas.width / 100;
        // this.groundEndX = this.groundX + (this.width - 10);
        this.back = new Image();
        this.assetsPath = window.PIXELPAWS_ASSETS || '/static/pixelPaws/';
        this.getAssetPath = (path) => `${this.assetsPath}assets/Map/${path}`
        this.back.src = this.getAssetPath(backSrc);
        this.stage = new Image();
        this.stage.src = this.getAssetPath(stageSrc);
    }

    draw(ctx) {
        ctx.drawImage(this.back, 0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.stage, this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.groundX, this.groundY, this.width, 5);
    }
}


// handleCollision(object) {
//     if (object.cY + object.cHeight > this.groundY &&
//         object.cY < this.groundY &&
//         object.cX > this.groundX &&
//         object.cX < this.groundEndX) {
//
//         object.cY = this.groundY - object.cHeight;
//         object.y = object.cY - 34;
//         object.velocityY = 0;
//         object.isJumping = false;
//         object.nbJump = 2;
//         object.canHitAir = true;
//         object.jumpKeyHeld = false;
//     }
//     else {
//         if (object.cY + object.cHeight > this.groundY &&
//             (object.cY > this.groundY || object.cY < this.groundY)) {
//             object.isJumping = true;
//         }
//         if (object.cY > this.groundY &&
//             object.cX + object.cWidth > this.groundX &&
//             object.cX < this.groundX) {
//             object.cX = this.groundX - object.cWidth;
//             object.x = object.cX - 46;
//             object.velocityX = 0;
//         } else if (object.cY > this.groundY &&
//             object.cX < this.groundEndX &&
//             object.cX + object.cWidth > this.groundEndX) {
//             object.cX = this.groundEndX;
//             object.x = object.cX - 46;
//             object.velocityX = 0;
//         }
//     }
// }

export default Gamemap;