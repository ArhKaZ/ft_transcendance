class GameMap {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = canvas.width * 0.25;
        this.y = canvas.height * 0.50;
        this.height = canvas.height * 0.34;
        this.width = canvas.width * 0.45;
        this.groundY = this.y + 30;
        this.groundX = this.x;
        this.groundEndX = this.groundX + (this.width - 10);
        this.back = new Image();
        this.back.src = './assets/Map/city.png';
        this.stage = new Image();
        this.stage.src = './assets/Map/stage.png';
    }

    handleCollision(object) {
        if (object.characterY + object.characterHeight > this.groundY &&
            object.characterY < this.groundY &&
            object.characterX > this.groundX &&
            object.characterX < this.groundEndX) {

            object.characterY = this.groundY - object.characterHeight;
            object.y = object.characterY - 34;
            object.velocityY = 0;
            object.isJumping = false;
        }
        else if (object.characterY > this.groundY &&
            object.characterX + object.characterWidth > this.groundX &&
            object.characterX < this.groundX) {

            object.characterX = this.groundX - object.characterWidth;
            object.x = object.characterX - 46;
            object.velocityX = 0;
        }
        else if (object.characterY > this.groundY &&
        object.characterX < this.groundEndX &&
        object.characterX + object.characterWidth > this.groundEndX) {

            object.characterX = this.groundEndX;
            object.x = object.characterX - 46;
            object.velocityX = 0;
        }
    }

    draw(ctx) {
        ctx.drawImage(this.back, 0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.stage, this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.groundX, this.groundY, this.width, 5);
    }
}

export default GameMap;