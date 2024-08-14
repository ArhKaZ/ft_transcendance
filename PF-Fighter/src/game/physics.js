class Physic {
    constructor(gravity) {
        this.gravity = gravity;
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

    handleCollisionPlayer(object, vs) {

        if (object.x + object.width > vs.x && object.x < vs.x &&
            object.y < vs.y + vs.height && object.y + object.height > vs.y) {

            let speedDifference = object.velocityX - vs.velocityX;
            if (speedDifference > 0) {
                vs.x += Math.abs(speedDifference) * 20;
            } else {
                object.x -= Math.abs(speedDifference) * 20;
            }
            vs.velocityX = 0;
            object.velocityX = 0;
            console.log("hit left");
        }
        else if (object.x < vs.x + vs.width && object.x + object.width > vs.x + vs.width &&
            object.y < vs.y + vs.height && object.y + object.height > vs.y) {

            let speedDifference = object.velocityX - vs.velocityX;
            if (speedDifference > 0) {
                vs.x -= Math.abs(speedDifference) * 20;
            }
            else {
                object.x += Math.abs(speedDifference) * 20;
            }

            vs.velocityX = 0;
            object.velocityX = 0;
            console.log("hit right");
        }
        // Vérifier collision en haut
        else if (object.y + object.height > vs.y && object.y < vs.y &&
            object.x < vs.x + vs.width && object.x + object.width > vs.x ) {

            let speedDifference = object.velocityY - vs.velocityY;
            if (speedDifference > 0) {
                vs.velocityY += Math.abs(speedDifference) * 20;
            }
            else {
                object.velocityY -= Math.abs(speedDifference) * 20;
            }
            vs.velocityY = 0;
            object.velocityY = 0;
            console.log("hit top");
        }
        // Vérifier collision en bas
        else if (object.y + object.height > vs.y && object.y < vs.y &&
            object.x < vs.x + vs.width && object.x + object.width > vs.x) {

            let speedDifference = object.velocityY - vs.velocityY;
            if (speedDifference > 0) {
                vs.velocityY -= Math.abs(speedDifference) * 20;
            }
            else {
                object.velocityY += Math.abs(speedDifference) * 20;
            }
            vs.velocityY = 0;
            object.velocityY = 0;
            console.log("hit bottom");
        }
    }
}

export default Physic