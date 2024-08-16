import GameMap from './GameMap.js';
class PlayerAction {
    constructor(x, y, nb, physics) {
        this.nb = nb;

        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.maxVelocityX = 5;
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
                    }
                    if (keyState['a']) {
                        this.move('left');
                    }
                    if (keyState['d']) {
                        this.move('right');
                    }
                    if (!keyState['a'] && !keyState['d']) {
                        this.move('!left!right');
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
                    }
                    if (keyState['ArrowLeft']) {
                        this.move('left');
                    }
                    if (keyState['ArrowRight']) {
                        this.move('right');
                    }
                    if (!keyState['ArrowLeft'] && !keyState['ArrowRight']) {
                        this.move('!left!right');
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
                        height: this.height - 3
                    };
                    break;
                case 'left':
                    this.hitbox = {
                        x: this.x - this.width,
                        y: this.y + 1.5,
                        width: this.width - 3,
                        height: this.height - 3
                    };
                    break;
                case 'right':
                    this.hitbox = {
                        x: this.x + this.width + 3,
                        y: this.y + 1.5,
                        width: this.width - 3,
                        height: this.height - 3
                    };
                    break;
                case 'down':
                    this.hitbox = {
                        x: this.x + 1.5,
                        y: this.y + this.height + 3,
                        width: this.width - 3,
                        height: this.height - 3
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
                if (this.velocityX > -this.maxVelocityX) {
                    this.velocityX -= 0.3;
                }
                break;
            case 'right':
                if (this.velocityX < this.maxVelocityX) {
                    this.velocityX += 0.3;
                }
                break;
            case 'up':
                if (!this.isJumping) {
                    this.velocityY = -20;
                    this.isJumping = true;
                }
                break;
            case '!left!right':
                if (this.velocityX > 0) {
                    this.velocityX -= 0.2;
                } else if (this.velocityX < 0) {
                    this.velocityX += 0.2;
                }
                break;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.hitbox) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
        }
    }
}

export default PlayerAction;