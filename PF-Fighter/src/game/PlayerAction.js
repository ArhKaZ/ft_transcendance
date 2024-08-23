import Animation from "./animation.js";
import Hitbox from "./hitbox.js";
import hitbox from "./hitbox.js";

class PlayerAction {
    constructor(x, y, nb, physics) {
        this.nb = nb;
        this.x = x;
        this.y = y - 60;
        this.width = 128;
        this.height = 128;

        this.characterX = this.x + 46;
        this.characterY = this.y + 34;
        this.characterWidth = 34;
        this.characterHeight = 60;
        this.sprites = new Animation(this.nb);
        this.look = null;
        if (nb === 1)
            this.look = 'right';
        else
            this.look = 'left';

        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isMoving = false;
        this.maxVelocityX = 2;

        this.stock = 5;
        this.physics = physics;

        this.canHit = true;
        this.hitbox = null;
        this.lastAttackTime = 0;
        this.attackCooldown = 1000;
        this.asHit = false;

        this.percent = 0;
        this.knockbackFrames = 0;
        this.stunFrames = 0;
    }

    update(keyState) {

        this.physics.handleKnockbackAndStun(this);

        const currentTime = Date.now();
        if (this.knockbackFrames === 0 && this.stunFrames === 0) {
            if (this.nb === 1) {
                if (keyState) {
                    //MOVE
                    if (keyState['w']) {
                        this.move('up');
                        this.isMoving = true;
                        this.isJumping = true;
                    }
                    if (keyState['a']) {
                        this.move('left');
                        this.isMoving = true;
                    }
                    if (keyState['d']) {
                        this.move('right');
                        this.isMoving = true;
                    }
                    if (!keyState['a'] && !keyState['d']) {
                        this.move('!left!right');
                        this.isMoving = false;
                    }
                    //ATTACK
                    if (keyState['t'] && this.canAttack(currentTime)) {
                        this.attack('up');
                        this.lastAttackTime = currentTime;
                    }
                    if (keyState['g'] && this.canAttack(currentTime)) {
                        this.attack('down');
                        this.lastAttackTime = currentTime;
                    }
                    if (keyState['f'] && this.canAttack(currentTime)) {
                        this.attack('left');
                        this.lastAttackTime = currentTime;
                    }
                    if (keyState['h'] && this.canAttack(currentTime)) {
                        this.attack('right');
                        this.lastAttackTime = currentTime;
                    }
                }
            } else if (this.nb === 2) {
                if (keyState) {
                    //MOVE
                    if (keyState['ArrowUp']) {
                        this.move('up');
                        this.isMoving = true;
                        this.isJumping = true;
                    }
                    if (keyState['ArrowLeft']) {
                        this.move('left');
                        this.isMoving = true;
                    }
                    if (keyState['ArrowRight']) {
                        this.move('right');
                        this.isMoving = true;
                    }
                    if (!keyState['ArrowLeft'] && !keyState['ArrowRight']) {
                        this.move('!left!right');
                        this.isMoving = false;
                    }
                    //ATTACK
                    if (keyState['p'] && this.canAttack(currentTime)) {
                        this.attack('up');
                        this.lastAttackTime = currentTime;
                    }
                    if (keyState[';'] && this.canAttack(currentTime)) {
                        this.attack('down');
                        this.lastAttackTime = currentTime;
                    }
                    if (keyState['l'] && this.canAttack(currentTime)) {
                        this.attack('left');
                        this.lastAttackTime = currentTime;
                    }
                    if (keyState['\''] && this.canAttack(currentTime)) {
                        this.attack('right');
                        this.lastAttackTime = currentTime;
                    }
                }
            }
        }
        if (this.hitbox) {
            if (this.hitbox.update() === -1) {
                delete this.hitbox;
            }
            else
                this.hitbox.updateHitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight);
        }
        this.characterX = this.x + 46;
        this.characterY = this.y + 34;
    }
//======================ATTACK========================
    canAttack(currentTime) {
        return (currentTime - this.lastAttackTime) >= this.attackCooldown;
    }

    takeDamage(amout) {
        this.percent += amout;
    }

    attack(direction) {
        if (this.canHit) {
            switch(direction) {
                case 'up':
                    if (this.isJumping) {
                        if (this.look === 'right') {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'upAirRight');
                        }
                        else {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'upAirLeft');
                        }
                    } else {
                        this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'upSmash');
                    }
                    break;
                case 'left':
                    if (this.isJumping) {
                        if (this.look === 'right') {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'backAirRight');
                        } else {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'forwardAirLeft');
                        }
                    } else {
                        this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'leftSmash');
                    }
                    break;
                case 'right':
                    if (this.isJumping) {
                        if (this.look === 'right') {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'forwardAirRight');
                        } else {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'backAirLeft');
                        }
                    } else {
                        this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'rightSmash');
                    }
                    break;
                case 'down':
                    if (this.isJumping) {
                        if (this.look === 'right') {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'downAirRight');
                        } else {
                            this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'downAirLeft');
                        }
                    } else {
                        this.hitbox = new Hitbox(this.characterX, this.characterY, this.characterWidth, this.characterHeight, 'downSmash');
                    }
                    break;
            }
        }
    }
//=====================MOVE===========================
    move(direction) {
        switch (direction) {
            case 'left':
                if (!this.isJumping)
                    this.look = 'left';
                if (this.velocityX > -this.maxVelocityX) {
                    this.lastDirection = 'left';
                    this.velocityX -= 0.2;
                }
                break;
            case 'right':
                if (!this.isJumping)
                    this.look = 'right';
                if (this.velocityX < this.maxVelocityX) {
                    this.lastDirection = 'right';
                    this.velocityX += 0.2;
                }
                break;
            case 'up':
                if (!this.isJumping) {
                    this.lastDirection = 'up';
                    this.velocityY = -12;
                }
                break;
            case '!left!right':
                if (this.velocityX > 0) {
                    this.velocityX -= 0.1;
                } else if (this.velocityX < 0) {
                    this.velocityX += 0.1;
                }
                break;
        }
    }

    draw(ctx) {
        // ctx.fillStyle = 'blue';
        // ctx.fillRect(this.x, this.y, this.width, this.height);
        // ctx.fillStyle = 'green';
        // ctx.fillRect(this.characterX, this.characterY, this.characterWidth, this.characterHeight);
        this.sprites.update(ctx, this);

        if (this.hitbox) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
        }
    }
}

export default PlayerAction;