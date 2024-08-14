import GameMap from './GameMap.js';
class PlayerAction {
    constructor(x, y, nb) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.nb = nb;
        this.canDash = true;
        this.maxVelocityX = 5;
    }

    update(keyState, keyStateDash) {
        if (this.nb === 1)
        {
            this.moveP1(keyState, keyStateDash);
        }
        else if (this.nb === 2) {
            this.moveP2(keyState, keyStateDash);
        }
    }

    moveP1(keyState, keyStateDash) {
        //saut
        if (keyState && keyState['w']) {
            if (!this.isJumping) {
                this.velocityY = -20;
                this.isJumping = true;
            }
        }
        //deplacement
        if (keyState && keyState['d']) {
            if (this.velocityX < this.maxVelocityX) {
                this.velocityX += 0.3;
            }
        }

        if (keyState && keyState['a']) {
            if (this.velocityX > -this.maxVelocityX) {
                this.velocityX -= 0.3;
            }
        }

        if (!keyState['a'] && !keyState['d']) {
            if (this.velocityX > 0) {
                this.velocityX -= 0.2;
            } else if (this.velocityX < 0) {
                this.velocityX += 0.2;
            }
        }
        //dash
        if (keyStateDash && keyStateDash['d']) {
            if (this.canDash) {
                this.velocityX += 16;
                this.canDash = false;
            }
        }
        if (keyStateDash && keyStateDash['s']) {
            if (this.canDash) {
                this.velocityY += 16;
                this.canDash = false;
            }
        }
        if (keyStateDash && keyStateDash['w']) {
            if (this.canDash) {
                this.velocityY -= 16;
                this.canDash = false;
            }
        }
        else if (keyStateDash && keyStateDash['a']) {
            if (this.canDash) {
                this.velocityX -= 16;
                this.canDash = false;
            }
        }
    }

    moveP2(keyState, keyStateDash) {
        //saut
        if (keyState && keyState['ArrowUp']) {
            if (!this.isJumping) {
                this.velocityY = -20;
                this.isJumping = true;
            }
        }
        //deplacement
        if (keyState && keyState['ArrowRight']) {
            if (this.velocityX < this.maxVelocityX) {
                this.velocityX += 0.3;
            }
        }
        if (keyState && keyState['ArrowLeft']) {
            if (this.velocityX > -this.maxVelocityX) {
                this.velocityX -= 0.3;
            }
        }

        if (!keyState['ArrowRight'] && !keyState['ArrowLeft']) {
            if (this.velocityX > 0) {
                this.velocityX -= 0.2;
            } else if (this.velocityX < 0) {
                this.velocityX += 0.2;
            }
        }
        //dash
        if (keyStateDash && keyStateDash['ArrowUp']) {
            if (this.canDash) {
                this.velocityY = 16;
                this.canDash = false;
            }
        }
        if (keyStateDash && keyStateDash['ArrowRight']) {
            if (this.canDash) {
                this.velocityX += 16;
                this.canDash = false;
            }
        }
        if (keyStateDash && keyStateDash['ArrowDown']) {
            if (this.canDash) {
                this.velocityY = 16;
                this.canDash = false;
            }
        }
        else if (keyStateDash && keyStateDash['ArrowLeft']) {
            if (this.canDash) {
                this.velocityX -= 16;
                this.canDash = false;
            }
        }
    }

    // giveDash()
    // {
    //     this.canDash = true;
    // }

    draw(ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

export default PlayerAction;