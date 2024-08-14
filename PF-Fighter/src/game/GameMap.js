class GameMap {
    constructor(canvas) {
        this.x = canvas.width * 0.25;
        this.y = canvas.height * 0.55;
        this.height = canvas.height * 0.45;
        this.width = canvas.width * 0.50;
    }

    handleCollision(object) {
        if (object.y + object.height > this.y &&
            object.y + object.height <= this.y + 40 && // + 40 a ajuster aide a remonter sur la map
            object.x + object.width > this.x &&
            object.x < this.x + this.width) {
            object.y = this.y - object.height;
            object.velocityY = 0;
            object.isJumping = false;
        }
        else if (object.y >= this.y &&
            object.x + object.width > this.x &&
            object.x < this.x) {
            object.x = this.x - object.width;
            object.velocityX = 0;
        }
        else if (object.y >= this.y &&
        object.x < this.x + this.width &&
        object.x + object.width > this.x + this.width) {
            object.x = this.x + this.width;
            object.velocityX = 0;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default GameMap;