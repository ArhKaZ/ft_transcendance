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
        this.BackAirLeft = new Sprite('assets/Character/BackAirLeft.png', 8, 10);
        this.BackAirRight = new Sprite('assets/Character/BackAirRight.png', 8, 10);
        this.DownSmashLeft = new Sprite('assets/Character/DownSmashLeft.png', 8, 20);
        this.DownSmashRight = new Sprite('assets/Character/DownSmashRight.png', 8, 20);
        this.DownAirLeft = new Sprite('assets/Character/DownAirLeft.png', 8, 10);
        this.DownAirRight = new Sprite('assets/Character/DownAirRight.png', 8, 10);
        this.SideSmashLeft = new Sprite('assets/Character/SideSmashLeft.png', 10, 15);
        this.SideSmashRight = new Sprite('assets/Character/SideSmashRight.png', 10, 15);
        this.UpAirLeft = new Sprite('assets/Character/UpSmashLeft.png', 8, 15);
        this.UpAirRight = new Sprite('assets/Character/UpSmashRight.png', 8, 15);
        this.FairLeft = new Sprite('assets/Character/FairLeft.png', 6, 15);
        this.FairRight = new Sprite('assets/Character/FairRight.png', 6, 15);
        this.UpSmashLeft = new Sprite('assets/Character/UpSmashLeft.png', 13, 15);
        this.UpSmashRight = new Sprite('assets/Character/UpSmashRight.png', 13, 15);
    }

    update(ctx, obj) {
        if (obj.hitbox) {
            this.drawAttack(ctx, obj);
        }
        else {
            if (obj.look === 'left') {
                if (obj.isMoving && !obj.isJumping && !obj.hitbox) {
                    this.RunLeft.drawSprite(false, ctx, obj.x, obj.y);
                } else if (obj.isJumping && !obj.hitbox) {
                    this.JumpLeft.drawSprite(false, ctx, obj.x, obj.y);
                } else if (!obj.isMoving && !obj.isJumping && !obj.hitbox) {
                    this.IdleLeft.drawSprite(false, ctx, obj.x, obj.y);
                }
            } else if (obj.look === 'right') {
                if (obj.isMoving && !obj.isJumping && !obj.hitbox) {
                    this.RunRight.drawSprite(false, ctx, obj.x, obj.y);
                } else if (obj.isJumping && !obj.hitbox) {
                    this.JumpRight.drawSprite(false, ctx, obj.x, obj.y);
                } else if (!obj.isMoving && !obj.isJumping && !obj.hitbox) {
                    this.IdleRight.drawSprite(false, ctx, obj.x, obj.y);
                }
            }
        }
    }

    drawAttack(ctx, obj) {
        switch (obj.hitbox.dir) {
            case 'upAirLeft':
                this.UpAirLeft.affDurAnim();
                obj.velocityY -= 0.13;
                this.UpAirLeft.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'upAirRight':
                this.UpAirRight.affDurAnim();
                obj.velocityY -= 0.13;
                this.UpAirRight.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'downAirLeft':
                this.DownAirLeft.affDurAnim();
                this.DownAirLeft.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'downAirRight':
                this.DownAirRight.affDurAnim();
                this.DownAirRight.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'backAirLeft':
                this.BackAirLeft.affDurAnim();
                this.BackAirLeft.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'backAirRight':
                this.BackAirRight.affDurAnim();
                this.BackAirRight.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'forwardAirLeft':
                this.FairLeft.affDurAnim();
                this.FairLeft.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'forwardAirRight':
                this.FairRight.affDurAnim();
                this.FairRight.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'upSmash':
                this.UpSmashLeft.affDurAnim();
                obj.y -= 1.9;
                if (obj.look === 'left') {
                    this.UpSmashLeft.drawSprite(true, ctx, obj.x, obj.y);
                } else {
                    this.UpSmashRight.drawSprite(true, ctx, obj.x, obj.y);
                }
                break;
            case 'downSmash':
                if (obj.look === 'right') {
                    this.DownSmashLeft.affDurAnim();
                    this.DownSmashRight.drawSprite(true, ctx, obj.x, obj.y);
                } else {
                    this.DownSmashLeft.drawSprite(true, ctx, obj.x, obj.y);
                }
                break;
            case 'leftSmash':
                this.SideSmashLeft.affDurAnim();
                this.SideSmashLeft.drawSprite(true, ctx, obj.x, obj.y);
                break;
            case 'rightSmash':
                this.SideSmashRight.affDurAnim();
                this.SideSmashRight.drawSprite(true, ctx, obj.x, obj.y);
                break;
        }
    }
}

export default Animation;