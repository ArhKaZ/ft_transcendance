class Physic {
    constructor(gravity) {
        this.gravity = gravity;
        this.knockbackScaling = 0.1;
        this.baseKnockback = 2;
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
        if (object.y < 0) {
            object.y = 0;
            object.velocityY = 0;
        }
        if (object.y + object.height > canvas.height) {
            object.y = canvas.height - object.height;
            object.velocityY = 0;
            object.isJumping = false;
        }

        if (object.x < 0) {
            object.x = 0;
            object.velocityX = 0;
        } else if (object.x + object.width > canvas.width) {
            object.x = canvas.width - object.width;
            object.velocityX = 0;
        }
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
                //object.asHit = true;
                this.applyKnockback(vs, 'top', vs.percent);
            }
            //hit from bot
            else if (object.hitbox.dir === 'down' &&
                vs.y > object.hitbox.y &&
                vs.y < object.hitbox.y + object.hitbox.height &&
                vs.y + vs.height > object.hitbox.y + object.hitbox.height &&
                this.collisionHitboxHorizontal(object, vs)) {
                //object.asHit = true;
                this.applyKnockback(vs, 'bottom', vs.percent);
            }
        }
    }

    applyKnockback(object, direction, percent) {
        console.log('knockback', direction);
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

    handleCollisionPlayer(object, vs) { // TODO changer pour juste mettre juste collision

        if (object.x + object.width > vs.x && object.x < vs.x &&
            object.y < vs.y + vs.height && object.y + object.height > vs.y) {

            object.x = vs.x - object.width;
            object.velocityX = 0;
           // console.log("hit left");
        }
        else if (object.x < vs.x + vs.width && object.x + object.width > vs.x + vs.width &&
            object.y < vs.y + vs.height && object.y + object.height > vs.y) {

            object.x = vs.x + vs.width;
            object.velocityX = 0;
            //console.log("hit right");
        }
        // Vérifier collision en haut TODO NE MARCHE PAS A CAUSE DE LA GRAVITE
        else if (object.y + object.height > vs.y && object.y < vs.y &&
            object.x < vs.x + vs.width && object.x + object.width > vs.x ) {

            object.y = vs.y;
            object.velocityY = 0;
            //console.log("hit top");
        }
        // Vérifier collision en bas
        else if (object.y + object.height > vs.y && object.y < vs.y &&
            object.x < vs.x + vs.width && object.x + object.width > vs.x) {

            object.y = vs.y + vs.height;
            vs.velocityY = 0;
            object.velocityY = 0;
            //console.log("hit bottom");
        }
    }


}

export default Physic