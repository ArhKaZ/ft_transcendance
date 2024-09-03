import Sprite from './sprite.js';
import Hitbox from './hitbox.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        //IDLE
        this.IdleLeft = new Sprite('assets/Character/IdleLeft.png', 4, 40);
        this.IdleRight = new Sprite('assets/Character/IdleRight.png', 4, 40);
        this.IdleLeftPurple = new Sprite('assets/Character/IdleLeftPurple.png', 4, 40);
        this.IdleRightPurple = new Sprite('assets/Character/IdleRightPurple.png', 4, 40);
        //RUN
        this.RunLeft = new Sprite('assets/Character/WalkLeft.png', 8, 20);
        this.RunRight = new Sprite('assets/Character/WalkRight.png', 8, 20);
        this.RunLeftPurple = new Sprite('assets/Character/WalkLeftPurple.png', 8, 20);
        this.RunRightPurple = new Sprite('assets/Character/WalkRightPurple.png', 8, 20);
        //JUMP
        this.JumpLeft = new Sprite('assets/Character/JumpLeft.png', 8, 40);
        this.JumpRight = new Sprite('assets/Character/JumpRight.png', 8, 40);
        this.JumpLeftPurple = new Sprite('assets/Character/JumpLeftPurple.png', 8, 40);
        this.JumpRightPurple = new Sprite('assets/Character/JumpRightPurple.png', 8, 40);
        //BACKAIR
        this.BackAirLeft = new Sprite('assets/Character/BackAirLeft.png', 6, 20);
        this.BackAirRight = new Sprite('assets/Character/BackAirR.png', 6, 20);
        this.BackAirLeftPurple = new Sprite('assets/Character/BackAirLeftPurple.png', 6, 20);
        this.BackAirRightPurple = new Sprite('assets/Character/BackAirRightPurple.png', 6, 20);
        //DOWNSMASH
        this.DownSmashLeft = new Sprite('assets/Character/DownSmashLeft.png', 8, 20);
        this.DownSmashRight = new Sprite('assets/Character/DownSmashRight.png', 8, 20);
        this.DownSmashLeftPurple = new Sprite('assets/Character/DownSmashLeftPurple.png', 8, 20);
        this.DownSmashRightPurple = new Sprite('assets/Character/DownSmashRightPurple.png', 8, 20);
        //DOWNAIR
        this.DownAirLeft = new Sprite('assets/Character/DownAirLeft.png', 8, 25);
        this.DownAirRight = new Sprite('assets/Character/DownAirRight.png', 8, 25);
        this.DownAirLeftPurple = new Sprite('assets/Character/DownAirLeftPurple.png', 8, 25);
        this.DownAirRightPurple = new Sprite('assets/Character/DownAirRightPurple.png', 8, 25);
        //FSMASH
        this.SideSmashLeft = new Sprite('assets/Character/SideSmashLeft.png', 10, 15);
        this.SideSmashRight = new Sprite('assets/Character/SideSmashRight.png', 10, 15);
        this.SideSmashLeftPurple = new Sprite('assets/Character/SideSmashLeftPurple.png', 10, 15);
        this.SideSmashRightPurple = new Sprite('assets/Character/SideSmashRightPurple.png', 10, 15);
        //UPAIR
        this.UpAirLeft = new Sprite('assets/Character/UpAirLeft.png', 8, 40);
        this.UpAirRight = new Sprite('assets/Character/UpAirRight.png', 8, 40);
        this.UpAirLeftPurple = new Sprite('assets/Character/UpAirLeftPurple.png', 8, 15);
        this.UpAirRightPurple = new Sprite('assets/Character/UpAirRightPurple.png', 8, 15);
        //FAIR
        this.FairLeft = new Sprite('assets/Character/FairLeft.png', 6, 15);
        this.FairRight = new Sprite('assets/Character/FairRight.png', 6, 15);
        this.FairLeftPurple = new Sprite('assets/Character/FairLeftPurple.png', 6, 15);
        this.FairRightPurple = new Sprite('assets/Character/FairRightPurple.png', 6, 15);
        //UPSMASH
        this.UpSmashLeft = new Sprite('assets/Character/UpSmashLeft.png', 13, 15);
        this.UpSmashRight = new Sprite('assets/Character/UpSmashRight.png', 13, 15);
        this.UpSmashLeftPurple = new Sprite('assets/Character/UpSmashLeftPurple.png', 13, 15);
        this.UpSmashRightPurple = new Sprite('assets/Character/UpSmashRightPurple.png', 13, 15);
    }

    update(ctx, obj) {
        if (obj.hitboxes.length > 0) {
            if (obj.nb === 1) {
                this.drawAttack(ctx, obj);
            }
            else
                this.drawAttackPurple(ctx, obj);
        }
        else {
            if (obj.look === 'left') {
                if (obj.isMoving && !obj.isJumping && obj.hitboxes.length === 0) {
                    if (obj.nb === 1)
                        this.RunLeft.drawSprite(ctx, obj.x, obj.y);
                    else
                        this.RunLeftPurple.drawSprite(ctx, obj.x, obj.y);
                } else if (obj.isJumping && obj.hitboxes.length === 0) {
                    if (obj.nb === 1)
                        this.JumpLeft.drawSprite(ctx, obj.x, obj.y, false, true);
                    else
                        this.JumpLeftPurple.drawSprite(ctx, obj.x, obj.y, false, true);
                } else if (!obj.isMoving && !obj.isJumping && obj.hitboxes.length === 0) {
                    if (obj.nb === 1)
                        this.IdleLeft.drawSprite(ctx, obj.x, obj.y);
                    else
                        this.IdleLeftPurple.drawSprite(ctx, obj.x, obj.y);
                }
            } else if (obj.look === 'right') {
                if (obj.isMoving && !obj.isJumping && obj.hitboxes.length === 0) {
                    if (obj.nb === 1)
                        this.RunRight.drawSprite(ctx, obj.x, obj.y);
                    else
                        this.RunRightPurple.drawSprite(ctx, obj.x, obj.y);
                } else if (obj.isJumping && obj.hitboxes.length === 0) {
                    if (obj.nb === 1)
                        this.JumpRight.drawSprite(ctx, obj.x, obj.y, false, true);
                    else
                        this.JumpRightPurple.drawSprite(ctx, obj.x, obj.y, false, true);
                } else if (!obj.isMoving && !obj.isJumping && obj.hitboxes.length === 0) {
                    if (obj.nb === 1)
                        this.IdleRight.drawSprite(ctx, obj.x, obj.y);
                    else
                        this.IdleRightPurple.drawSprite(ctx, obj.x, obj.y);
                }
            }
        }
    }

    drawAttackPurple(ctx, obj) {
        let currentAnimation = null;
        obj.hitboxes.forEach((hitbox) => {
            switch (hitbox.dir) {
                case 'upAirLeft1':
                    // this.UpAirLeftPurple.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirLeftPurple;
                    break;
                case 'upAirLeft2':
                    // this.UpAirLeftPurple.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirLeftPurple;
                    break;
                case 'upAirRight1':
                    // this.UpAirRightPurple.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirRightPurple;
                    break;
                case 'upAirRight2':
                    // this.UpAirRightPurple.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirRightPurple;
                    break;
                case 'downAirLeft1':
                    // this.DownAirLeftPurple.affDurAnim();
                    currentAnimation = this.DownAirLeftPurple;
                    break;
                case 'downAirLeft2':
                    // this.DownAirLeftPurple.affDurAnim();
                    currentAnimation = this.DownAirLeftPurple;
                    break;
                case 'downAirRight1':
                    // this.DownAirRightPurple.affDurAnim();
                    currentAnimation = this.DownAirRightPurple;
                    break;
                case 'downAirRight2':
                    // this.DownAirRightPurple.affDurAnim();
                    currentAnimation = this.DownAirRightPurple;
                    break;
                case 'backAirLeft1':
                    // this.BackAirLeftPurple.affDurAnim();
                    currentAnimation = this.BackAirLeftPurple;
                    break;
                case 'backAirLeft2':
                    // this.BackAirLeftPurple.affDurAnim();
                    currentAnimation = this.BackAirLeftPurple;
                    break;
                case 'backAirRight1':
                    //this.BackAirRightPurple.affDurAnim();
                    currentAnimation = this.BackAirRightPurple;
                    break;
                case 'backAirRight2':
                    //this.BackAirRightPurple.affDurAnim();
                    currentAnimation = this.BackAirRightPurple;
                    break;
                case 'forwardAirLeft':
                    //this.FairLeftPurple.affDurAnim();
                    currentAnimation = this.FairLeftPurple;
                    break;
                case 'forwardAirRight':
                    //this.FairRightPurple.affDurAnim();
                    currentAnimation = this.FairRightPurple;
                    break;
                case 'upSmashLeft1':
                    //this.UpSmashLeftPurple.affDurAnim();
                    obj.y -= 0.2;
                    currentAnimation = this.UpSmashLeftPurple;
                    break;
                case 'upSmashLeft2':
                    //this.UpSmashLeftPurple.affDurAnim();
                    obj.y -= 0.2;
                    currentAnimation = this.UpSmashLeftPurple;
                    break;
                case 'upSmashRight1':
                    //this.UpSmashLeftPurple.affDurAnim();
                    obj.y -= 0.2;
                    currentAnimation = this.UpSmashRightPurple;
                    break;
                case 'upSmashRight2':
                    //this.UpSmashLeftPurple.affDurAnim();
                    obj.y -= 0.2;
                    currentAnimation = this.UpSmashRightPurple;
                    break;
                case 'downSmash1':
                    if (obj.look === 'right') {
                        //this.DownSmashLeftPurple.affDurAnim();
                        currentAnimation = this.DownSmashRightPurple;
                    } else {
                        currentAnimation = this.DownSmashLeftPurple;
                    }
                    break;
                case 'leftSmash1':
                    //this.SideSmashLeftPurple.affDurAnim();
                    currentAnimation = this.SideSmashLeftPurple;
                    break;
                case 'leftSmash2':
                    currentAnimation = this.SideSmashLeftPurple;
                    break;
                case 'rightSmash1':
                    //this.SideSmashRightPurple.affDurAnim();
                    currentAnimation = this.SideSmashRightPurple;
                    break;
                case 'rightSmash2':
                    currentAnimation = this.SideSmashRightPurple;
                    break;
            }
        });

        if (currentAnimation) {
            currentAnimation.drawSprite(ctx, obj.x, obj.y, true, false, obj.hitboxes);
        }
    }

    drawAttack(ctx, obj) {
        let currentAnimation = null;
        obj.hitboxes.forEach((hitbox) => {
            //console.log(hitbox.dir);
            switch (hitbox.dir) {
                case 'upAirLeft1':
                    this.UpAirLeft.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirLeft;
                    break;
                case 'upAirLeft2':
                    this.UpAirLeft.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirLeft;
                    break;
                case 'upAirRight1':
                    //this.UpAirRight.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirRight;
                    break;
                case 'upAirRight2':
                    //this.UpAirRight.affDurAnim();
                    obj.velocityY -= 0.13;
                    currentAnimation = this.UpAirRight;
                    break;
                case 'downAirLeft1':
                    this.DownAirLeft.affDurAnim();
                    currentAnimation = this.DownAirLeft;
                    break;
                case 'downAirLeft2':
                    this.DownAirLeft.affDurAnim();
                    currentAnimation = this.DownAirLeft;
                    break;
                case 'downAirRight1':
                    //this.DownAirRight.affDurAnim();
                    currentAnimation = this.DownAirRight;
                    break;
                case 'downAirRight2':
                    //this.DownAirRight.affDurAnim();
                    currentAnimation = this.DownAirRight;
                    break;
                case 'backAirLeft1':
                    currentAnimation = this.BackAirLeft;
                    break;
                case 'backAirLeft2':
                    currentAnimation = this.BackAirLeft;
                    break;
                case 'backAirRight1':
                    //his.BackAirRight.affDurAnim();
                    currentAnimation = this.BackAirRight;
                    break;
                case 'backAirRight2':
                    //his.BackAirRight.affDurAnim();
                    currentAnimation = this.BackAirRight;
                    break;
                case 'forwardAirLeft':
                    //this.FairLeft.affDurAnim();
                    currentAnimation = this.FairLeft;
                    break;
                case 'forwardAirRight':
                    //this.FairRight.affDurAnim();
                    currentAnimation = this.FairRight;
                    break;
                case 'upSmashLeft1':
                    //this.UpSmashLeft.affDurAnim();
                    obj.y -= 1.9;
                    currentAnimation = this.UpSmashLeft;
                    break;
                case 'upSmashLeft2':
                    //this.UpSmashLeft.affDurAnim();
                    obj.y -= 1.9;
                    currentAnimation = this.UpSmashLeft;
                    break;
                case 'upSmashRight1':
                    //this.UpSmashLeft.affDurAnim();
                    obj.y -= 1.9;
                    currentAnimation = this.UpSmashRight;
                    break;
                case 'upSmashRight2':
                    //this.UpSmashLeft.affDurAnim();
                    obj.y -= 1.9;
                    currentAnimation = this.UpSmashRight;
                    break;
                case 'downSmash1':
                    if (obj.look === 'right') {
                        //this.DownSmashLeft.affDurAnim();
                        currentAnimation = this.DownSmashRight;
                    } else {
                        currentAnimation = this.DownSmashLeft;
                    }
                    break;
                case 'leftSmash1':
                   // this.SideSmashLeft.affDurAnim();
                    currentAnimation = this.SideSmashLeft;
                    break;
                case 'leftSmash2':
                    currentAnimation = this.SideSmashLeft;
                    break;
                case 'rightSmash1':
                    //this.SideSmashRight.affDurAnim();
                    currentAnimation = this.SideSmashRight;
                    break;
                case 'rightSmash2':
                    currentAnimation = this.SideSmashRight;
                    break;
            }
        });

        if (currentAnimation) {
            currentAnimation.drawSprite(ctx, obj.x, obj.y, true, false, obj.hitboxes);
        }
    }
}

export default Animation;