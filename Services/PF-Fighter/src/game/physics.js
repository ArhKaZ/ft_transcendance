class Physic {
    constructor(gravity, map) {
        this.gravity = gravity;
        this.knockbackScaling = 0.1;
        this.baseKnockback = 5;
        this.gravityAccumulator = 0;
        this.stage = map;
        this.highPosition = this.stage.groundY - (this.stage.height * 0.75);
        this.lowPosition = this.stage.groundY - (this.stage.height * 0.25);
    }

    applyGravity(object) {
        // if (object.hitboxes.length > 0) {
        //     object.hitboxes.forEach((hitbox) => {
        //         let gravityMultiplier = 1;
        //         switch (hitbox.dir) {
        //             case 'backAirLeft':
        //                 gravityMultiplier = 0.3;
        //                 break;
        //             case 'backAirRight':
        //                 gravityMultiplier = 0.3;
        //                 break;
        //             case 'downAirLeft':
        //                 gravityMultiplier = 0.3;
        //                 break;
        //             case 'downAirRight':
        //                 gravityMultiplier = 0.3;
        //                 break;
        //         }
        //         object.velocityY += this.gravity * gravityMultiplier;
        //     });
        //
        //  }// else if (object.knockbackFrames > 0) {
        //     let gravityMultiplier;
        //
        //     if (object.cY < this.highPosition) {
        //         gravityMultiplier = 0.3;
        //     } else if (object.cY > this.lowPosition) {
        //         gravityMultiplier = 0.7;
        //     } else {
        //         gravityMultiplier = 0.5;
        //     }
        //
        //     object.velocityY += this.gravity * gravityMultiplier;
        // } else {
        //     this.gravityAccumulator += this.gravity;
        //     if (this.gravityAccumulator >= 0.1) {
        //         object.velocityY += this.gravityAccumulator;
        //         this.gravityAccumulator = 0;
        //     }
        // }
    }

    applyMovement(object) {
        object.x += object.velocityX;
        object.y += object.velocityY;

        const friction = 0.95;

        if (Math.abs(object.velocityX) < 0.1) {
            object.velocityX = 0;
        } else {
            object.velocityX *= friction;
        }

        if (Math.abs(object.velocityY) < 0.1) {
            object.velocityY = 0;
        } else {
            object.velocityY *= friction;
        }
    }

    handleCollisionWall(object, canvas) {
        return object.cY < 0 || object.cY + object.cHeight > canvas.height ||
            object.cX < 0 || object.cX + object.cWidth > canvas.width;
    }

    detectHit(hitbox, heartbox) {
        return hitbox.x < heartbox.cX + heartbox.cWidth &&
            hitbox.x + hitbox.width > heartbox.cX &&
            hitbox.y < heartbox.cY + heartbox.cHeight &&
            hitbox.y + hitbox.height > heartbox.cY;
    }

    handleHit(object, vs) {
        if (object.hitboxes.length > 0) {
            object.hitboxes.forEach((hitbox) => {
                if (hitbox.isActive && this.detectHit(hitbox, vs)) {
                    this.applyKnockback(vs, hitbox);
                }
            });
        }
    }

    applyKnockback(object, hitbox) {
        if (object.stunFrames === 0) {
            const attackPower = hitbox.power || 1;

            let knockback = (this.baseKnockback + (object.percent * this.knockbackScaling)) * attackPower;

            object.percent += hitbox.damage;

            object.knockbackFrames = 20;
            object.stunFrames = Math.floor(object.percent * 0.3);
            let direction = {x: 0, y: 0};
            switch (hitbox.dir) {
                case 'upAirLeft':
                    direction.x = -0.3;
                    direction.y = -1;
                    break;
                case 'upAirRight':
                    direction.x = 0.3;
                    direction.y = -1;
                    break;
                case 'downAirLeft1':
                    direction.x = -0.5;
                    direction.y = -0.2;
                    break;
                case 'downAirLeft2':
                    direction.x = -0.2;
                    direction.y = 1;
                    break;
                case 'downAirRight1':
                    direction.x = 0.5;
                    direction.y = -0.2;
                    break;
                case 'downAirRight2':
                    direction.x = 0.2;
                    direction.y = 1;
                    break;
                case 'backAirLeft1':
                    direction.x = -1;
                    direction.y = -0.1;
                    break;
                case 'backAirLeft2':
                    direction.x = -1;
                    direction.y = -0.1;
                    break;
                case 'backAirRight1':
                    direction.x = -0.1;
                    direction.y = 1;
                    break;
                case 'backAirRight2':
                    direction.x = -0.1;
                    direction.y = 1;
                    break;
                case 'forwardAirLeft':
                    direction.x = -0.2;
                    direction.y = -1;
                    break;
                case 'forwardAirRight':
                    direction.x = -0.2;
                    direction.y = 1;
                    break;
                case 'upSmash':
                    direction.x = object.look === 'left' ? -0.8 : 0.8;
                    direction.y = -1;
                    break;
                case 'downSmash1':
                    direction.x = -1;
                    direction.y = -0.3;
                    break;
                case 'downSmash2':
                    direction.x = 1;
                    direction.y = 0.3;
                    break;
                case 'leftSmash1':
                    direction.x = -1;
                    direction.y = -0.4;
                    break;
                case 'leftSmash2':
                    direction.x = -1;
                    direction.y = -0.4;
                    break;
                case 'rightSmash1':
                    direction.x = 1;
                    direction.y = -0.4;
                    break;
                case 'rightSmash2':
                    direction.x = 1;
                    direction.y = -0.4;
                    break;
            }
            object.velocityX = (knockback / object.knockbackFrames) * direction.x;
            object.velocityY = (knockback / object.knockbackFrames) * direction.y;

            object.asHit = false;
        }
    }

    handleKnockbackAndStun(object) {
        if (object.knockbackFrames > 0) {
            object.x += object.velocityX;
            object.y += object.velocityY;
            object.knockbackFrames--;
        } else if (object.stunFrames > 0) {
            object.stunFrames--;
        }
    }


}

export default Physic