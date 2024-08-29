import Animation from "./animation.js";
import Hitbox from "./hitbox.js";

class PlayerAction {
    constructor(x, y, nb, physics) {
        this.nb = nb;
        this.x = x;
        this.y = y - 60;
        this.width = 128;
        this.height = 128;

        this.cX = this.x + 46;
        this.cY = this.y + 34;
        this.cWidth = 34;
        this.cHeight = 60;
        this.sprites = new Animation(this.nb);
        this.look = null;
        if (nb === 1)
            this.look = 'right';
        else
            this.look = 'left';

        this.velocityX = 0;
        this.velocityY = 0;
        this.nbJump = 2;
        this.isJumping = false;
        this.isMoving = false;
        this.maxVelocityX = 2;


        this.stock = 5;
        this.physics = physics;

        this.canHit = true;
        this.canHitAir = true;
        this.hitboxes = [];
        this.lastAttackTime = 0;
        this.attackCooldown = 1000;

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
                        console.log(this.jumpKeyHeld);
                        console.log(this.nbJump);
                        if (!this.jumpKeyHeld && this.nbJump > 0) {
                            this.move('up');
                            this.nbJump--;
                            this.isMoving = true;
                            this.isJumping = true;
                            this.jumpKeyHeld = true;
                        }
                    } else {
                        this.jumpKeyHeld = false;
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
                    if (keyState['ArrowUp'])  {
                        if (!this.jumpKeyHeld && this.nbJump > 0) {
                            this.move('up');
                            this.nbJump--;
                            this.isMoving = true;
                            this.isJumping = true;
                            this.jumpKeyHeld = true;
                        }
                    } else {
                        this.jumpKeyHeld = false;
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
        if (this.hitboxes.length > 0) {
            this.hitboxes = this.hitboxes.filter(hitbox => {
                hitbox.updateHitbox(this);
                return true;
            });
        }
        this.cX = this.x + 46;
        this.cY = this.y + 34;
    }
//======================ATTACK========================
    canAttack(currentTime) {
        return (currentTime - this.lastAttackTime) >= this.attackCooldown;
    }

    addHitbox(hitbox) {
        this.hitboxes.push(hitbox);
    }

    attack(direction) {
        if (this.canHit) {
            switch(direction) {
                case 'up':
                    if (this.isJumping) {
                        if (this.look === 'right' && this.canHitAir) {
                            this.addHitbox(new Hitbox(this, 'upAirRight'));
                            this.canHitAir = false;
                        }
                        else if (this.canHitAir) {
                            this.addHitbox(new Hitbox(this, 'upAirLeft'));
                            this.canHitAir = false;
                        }
                    } else {
                        this.addHitbox(new Hitbox(this, 'upSmash'));
                    }
                    break;
                case 'left':
                    if (this.isJumping) {
                        if (this.look === 'right') {
                            this.addHitbox(new Hitbox(this, 'backAirRight'));
                        } else {
                            this.addHitbox(new Hitbox(this, 'forwardAirLeft'));
                        }
                    } else {
                        this.addHitbox(new Hitbox(this, 'leftSmash1'));
                        this.addHitbox(new Hitbox(this, 'leftSmash2'));
                    }
                    break;
                case 'right':
                    if (this.isJumping) {
                        if (this.look === 'right') {
                            this.addHitbox(new Hitbox(this, 'forwardAirRight'));
                        } else {
                            this.addHitbox(new Hitbox(this, 'backAirLeft'));
                        }
                    } else {
                        this.addHitbox(new Hitbox(this, 'rightSmash1'));
                        this.addHitbox(new Hitbox(this, 'rightSmash2'));
                    }
                    break;
                case 'down':
                    if (this.isJumping) {
                        if (this.look === 'right') {
                            this.addHitbox(new Hitbox(this, 'downAirRight'));
                        } else {
                            this.addHitbox(new Hitbox(this, 'downAirLeft'));
                        }
                    } else {
                        this.addHitbox(new Hitbox(this, 'downSmash1'));
                        this.addHitbox(new Hitbox(this, 'downSmash2'));
                    }
                    break;
            }
        }
    }
//=====================MOVE===========================
    move(direction) {
        if (this.hitboxes.length === 0) {
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
                    this.lastDirection = 'up';
                    this.velocityY = -6;
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
    }

    draw(ctx) {
        // ctx.fillStyle = 'blue';
        // ctx.fillRect(this.x, this.y, this.width, this.height);
        // ctx.fillStyle = 'green';
        // ctx.fillRect(this.cX, this.cY, this.cWidth, this.cHeight);
        this.sprites.update(ctx, this);

        if (this.hitboxes.length > 0) {
            this.hitboxes.forEach((hitbox) => {
                if (hitbox.isActive) {
                    ctx.fillStyle = 'red';
                    ctx.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
                }
            })
        }
    }
}

export default PlayerAction;