import Animation from "./animation.js";

class PlayerAction {
    constructor(x, y, nb, physics) {
        this.nb = nb;

        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velocityX = 0;
        this.velocityY = 0;
        this.stock = 5;
        this.isJumping = false;
        this.isMoving = false;
        this.maxVelocityX = 2;
        this.physics = physics;
        this.canHit = true;
        this.hitbox = null;
        this.hitboxDuration = 20;
        this.currentHitboxDuration = 0;
        this.lastAttackTime = 0;
        this.attackCooldown = 1000;

        this.percent = 0;

        this.knockbackFrames = 0;
        this.stunFrames = 0;
        this.asHit = false;
        this.sprites = new Animation(this.nb);
        this.look = null;
        if (nb === 1)
            this.look = 'right';
        else
            this.look = 'left';
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
            this.currentHitboxDuration--;
            if (this.currentHitboxDuration <= 0) {
                this.hitbox = null;
            }
        }
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
                    this.hitbox = {
                        x: this.x + 1.5,
                        y: this.y - this.height,
                        width: this.width - 3,
                        height: this.height - 3,
                        dir: 'up'
                    };
                    break;
                case 'left':
                    this.hitbox = {
                        x: this.x - this.width,
                        y: this.y + 1.5,
                        width: this.width - 3,
                        height: this.height - 3,
                        dir: 'left'
                    };
                    break;
                case 'right':
                    this.hitbox = {
                        x: this.x + this.width + 3,
                        y: this.y + 1.5,
                        width: this.width - 3,
                        height: this.height - 3,
                        dir: 'right'
                    };
                    break;
                case 'down':
                    this.hitbox = {
                        x: this.x + 1.5,
                        y: this.y + this.height + 3,
                        width: this.width - 3,
                        height: this.height - 3,
                        dir: 'down'
                    };
                    break;
            }
            this.currentHitboxDuration = this.hitboxDuration;
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
                    this.isJumping = true;
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
        this.sprites.update(ctx, this.x, this.y, this.isMoving, this.isJumping, this.look);

        if (this.hitbox) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
        }
    }
}

export default PlayerAction;