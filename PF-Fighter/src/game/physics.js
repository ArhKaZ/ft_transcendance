class Physic {
    constructor(gravity) {
        this.gravity = gravity;
        this.knockbackScaling = 0.1;
        this.baseKnockback = 2;
        this.collision = new Set();
    }

    applyGravity(object) {
        object.velocityY += this.gravity;
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
        return object.y < 0 || object.y + object.height > canvas.height ||
            object.x < 0 || object.x + object.width > canvas.width;
    }

    collisionHitboxHorizontal(object, vs) {
        return (vs.x < object.hitbox.x && vs.x + vs.width > object.hitbox.x && vs.x + vs.width < object.hitbox.x + object.hitbox.width ||
            vs.x > object.hitbox.x && vs.x < object.hitbox.x + object.hitbox.width && vs.x + vs.width > object.hitbox.x + object.hitbox.width ||
            vs.x < object.hitbox.x && vs.x + vs.width > object.hitbox.x && vs.x + vs.width > object.hitbox.x + object.hitbox.width);
    }

    collisionHitboxVertical(object, vs) {
        return (vs.y < object.hitbox.y && vs.y + vs.height > object.hitbox.y + object.hitbox.height ||
            vs.y < object.hitbox.y && vs.y + vs.height > object.hitbox.y && vs.y + vs.height < object.hitbox.y ||
            vs.y > object.hitbox.y && vs.y < object.hitbox.y + object.hitbox.height && vs.y + vs.height > object.hitbox.y + object.hitbox.height);
    }

    handleHit(object, vs) {
        if (object.hitbox) {
            if (object.hitbox.dir === 'left' &&
                vs.x < object.hitbox.x &&
                vs.x + vs.width > object.hitbox.x &&
                vs.x + vs.width < object.hitbox.x + object.hitbox.width &&
                this.collisionHitboxVertical(object, vs)) {
                this.applyKnockback(vs, 'left', vs.percent);
            }
            else if (object.hitbox.dir === 'right' &&
                vs.x > object.hitbox.x &&
                vs.x < object.hitbox.x + object.hitbox.width &&
                vs.x + vs.width > object.hitbox.x + object.hitbox.width &&
                this.collisionHitboxVertical(object, vs)) {
                this.applyKnockback(vs, 'right', vs.percent);
            }
            //hit from top
            else if (object.hitbox.dir === 'up' &&
                vs.y < object.hitbox.y &&
                vs.y + vs.height > object.hitbox.y &&
                vs.y + vs.height < object.hitbox.y + object.hitbox.height &&
                this.collisionHitboxHorizontal(object,vs)) {
                this.applyKnockback(vs, 'top', vs.percent);
            }
            //hit from bot
            else if (object.hitbox.dir === 'down' &&
                vs.y > object.hitbox.y &&
                vs.y < object.hitbox.y + object.hitbox.height &&
                vs.y + vs.height > object.hitbox.y + object.hitbox.height &&
                this.collisionHitboxHorizontal(object, vs)) {
                this.applyKnockback(vs, 'bottom', vs.percent);
            }
        }
    }

    applyKnockback(object, direction, percent) {
        let knockback = (this.baseKnockback + (percent * this.knockbackScaling));

        object.knockbackFrames = 20;
        object.stunFrames = Math.floor(percent * 0.2);

        object.percent += 7.3;
        switch(direction) {
            case 'up':
                object.velocityY = -knockback / object.knockbackFrames;
                break;
            case 'down':
                object.velocityY = knockback / object.knockbackFrames;
                break;
            case 'left':
                object.velocityX = -knockback / object.knockbackFrames;
                break;
            case 'right':
                object.velocityX = knockback / object.knockbackFrames;
                break;
        }
        object.asHit = false;
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

    createKeyCollision(obj1, obj2, dirObj, dirCol) {
        return `${obj1.nb}-${obj2.nb}-${dirObj}-${dirCol}`;
    }

    handleCollisionPlayer(obj1, obj2) {
        let key, initiator, suffer, direction;

        if (obj1.velocityX !== 0 || obj1.velocityY !== 0) {
            initiator = obj1;
            suffer = obj2;
            if (obj1.velocityX > 0)
                direction = 'right';
            if (obj1.velocityX < 0)
                direction = 'left';
            if (obj1.velocityY < 0)
                direction = 'up';
            if (obj1.velocityY > 0)
                direction = 'down';
        }
        else if (obj2.velocityX !== 0 || obj2.velocityY !== 0) {
            initiator = obj2;
            suffer = obj1;
            if (obj2.velocityX > 0)
                direction = 'right';
            if (obj2.velocityX < 0)
                direction = 'left';
            if (obj2.velocityY < 0)
                direction = 'up';
            if (obj2.velocityY > 0)
                direction = 'down';
        }
        if (obj1.x + obj1.width > obj2.x && obj1.x < obj2.x &&
            obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y) {
            key = this.createKeyCollision(initiator, suffer, direction, 'left');
        }
        if (obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x + obj2.width &&
            obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y) {
            key = this.createKeyCollision(initiator, suffer, direction, 'right');
        }
        // Vérifier collision en haut TODO NE MARCHE PAS A CAUSE DE LA GRAVITE
        if (obj1.y + obj1.height > obj2.y && obj1.y < obj2.y &&
            obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x ) {
            key = this.createKeyCollision(initiator, suffer, direction, 'top');
        }
        // Vérifier collision en bas
        if (obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y + obj2.height &&
            obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x) {
            key = this.createKeyCollision(initiator, suffer, direction, 'bot');
        }
        if (key && !this.collision.has(key)) {
            this.collision.add(key);
        }
    }

    resolveCollision(obj1, obj2) {
        if (this.collision) {
            this.collision.forEach((key) => {
                let [initiatorNb, sufferNb, dirObj, dirCol] = key.split('-');
                let initiator, suffer;
                if (initiatorNb === 1) {
                    initiator = obj1;
                    suffer = obj2;
                }
                else {
                    initiator = obj2;
                    suffer = obj1;
                }

                switch (dirCol) {
                    case 'left':
                        initiator = suffer.x - initiator.width;
                        initiator.velocityX = 0;
                        break;
                    case 'right':
                        initiator.x = suffer.x + suffer.width;
                        initiator.velocityX = 0;
                        break;
                    case 'top':
                        initiator.y = suffer.y - initiator.height;
                        initiator.velocityY = 0;
                        break;
                    case 'bot':
                        initiator.y = suffer.y + suffer.height;
                        initiator.velocityY = 0;
                        break;
                }
            });

            this.collision.clear();
        }
    }
}

export default Physic