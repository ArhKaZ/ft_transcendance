import Sprite from './sprite.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        this.IdleLeft = new Sprite('assets/Character/IdleLeft.png', 4, 40);
        this.IdleRight = new Sprite('assets/Character/IdleRight.png', 4, 40);
        this.RunLeft = new Sprite('assets/Character/WalkLeft.png', 8, 40);
        this.RunRight = new Sprite('assets/Character/WalkRight.png', 8, 40);
        this.JumpLeft = new Sprite('assets/Character/JumpLeft.png', 8, 40);
        this.JumpRight = new Sprite('assets/Character/JumpRight.png', 8, 40);
    }

    update(ctx, x, y, isMoving, isJumping, look) {
        if (look === 'left') {
            if (isMoving && !isJumping) {
                this.RunLeft.drawSprite(ctx, x, y);
            } else if (isJumping) {
                this.JumpLeft.drawSprite(ctx, x, y);
            } else if (!isMoving && !isJumping) {
                this.IdleLeft.drawSprite(ctx, x, y);
            }
        }
        else if (look === 'right') {
            if (isMoving && !isJumping) {
                this.RunRight.drawSprite(ctx, x, y);
            } else if (isJumping) {
                this.JumpRight.drawSprite(ctx, x, y);
            } else if (!isMoving && !isJumping) {
                this.IdleRight.drawSprite(ctx, x, y);
            }
        }
    }

}

export default Animation;