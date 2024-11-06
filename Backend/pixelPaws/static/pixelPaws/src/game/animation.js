import Sprite from './sprite.js';
import Hitbox from './hitbox.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        this.assetsPath = window.PIXELPAWS_ASSETS || '/static/pixelPaws/';

        this.getAssetPath = (path) => `${this.assetsPath}assets/Character/${path}`;
        //IDLE
        this.IdleLeft = new Sprite(this.getAssetPath('IdleLeft.png'), 4, 40);
        this.IdleRight = new Sprite(this.getAssetPath('IdleRight.png'), 4, 40);
        this.IdleLeftPurple = new Sprite(this.getAssetPath('IdleLeftPurple.png'), 4, 40);
        this.IdleRightPurple = new Sprite(this.getAssetPath('IdleRightPurple.png'), 4, 40);
        //RUN
        this.RunLeft = new Sprite(this.getAssetPath('WalkLeft.png'), 8, 20);
        this.RunRight = new Sprite(this.getAssetPath('WalkRight.png'), 8, 20);
        this.RunLeftPurple = new Sprite(this.getAssetPath('WalkLeftPurple.png'), 8, 20);
        this.RunRightPurple = new Sprite(this.getAssetPath('WalkRightPurple.png'), 8, 20);
        //JUMP
        this.JumpLeft = new Sprite(this.getAssetPath('JumpLeft.png'), 8, 40);
        this.JumpRight = new Sprite(this.getAssetPath('JumpRight.png'), 8, 40);
        this.JumpLeftPurple = new Sprite(this.getAssetPath('JumpLeftPurple.png'), 8, 40);
        this.JumpRightPurple = new Sprite(this.getAssetPath('JumpRightPurple.png'), 8, 40);
        //BACKAIR
        this.BackAirLeft = new Sprite(this.getAssetPath('BackAirLeft.png'), 6, 20);
        this.BackAirRight = new Sprite(this.getAssetPath('BackAirR.png'), 6, 20);
        this.BackAirLeftPurple = new Sprite(this.getAssetPath('BackAirLeftPurple.png'), 6, 20);
        this.BackAirRightPurple = new Sprite(this.getAssetPath('BackAirRightPurple.png'), 6, 20);
        //DOWNSMASH
        this.DownSmashLeft = new Sprite(this.getAssetPath('DownSmashLeft.png'), 8, 20);
        this.DownSmashRight = new Sprite(this.getAssetPath('DownSmashRight.png'), 8, 20);
        this.DownSmashLeftPurple = new Sprite(this.getAssetPath('DownSmashLeftPurple.png'), 8, 20);
        this.DownSmashRightPurple = new Sprite(this.getAssetPath('DownSmashRightPurple.png'), 8, 20);
        //DOWNAIR
        this.DownAirLeft = new Sprite(this.getAssetPath('DownAirLeft.png'), 8, 25);
        this.DownAirRight = new Sprite(this.getAssetPath('DownAirRight.png'), 8, 25);
        this.DownAirLeftPurple = new Sprite(this.getAssetPath('DownAirLeftPurple.png'), 8, 25);
        this.DownAirRightPurple = new Sprite(this.getAssetPath('DownAirRightPurple.png'), 8, 25);
        //FSMASH
        this.SideSmashLeft = new Sprite(this.getAssetPath('SideSmashLeft.png'), 10, 15);
        this.SideSmashRight = new Sprite(this.getAssetPath('SideSmashRight.png'), 10, 15);
        this.SideSmashLeftPurple = new Sprite(this.getAssetPath('SideSmashLeftPurple.png'), 10, 15);
        this.SideSmashRightPurple = new Sprite(this.getAssetPath('SideSmashRightPurple.png'), 10, 15);
        //UPAIR
        this.UpAirLeft = new Sprite(this.getAssetPath('UpAirLeft.png'), 8, 40);
        this.UpAirRight = new Sprite(this.getAssetPath('UpAirRight.png'), 8, 40);
        this.UpAirLeftPurple = new Sprite(this.getAssetPath('UpAirLeftPurple.png'), 8, 15);
        this.UpAirRightPurple = new Sprite(this.getAssetPath('UpAirRightPurple.png'), 8, 15);
        //FAIR
        this.FairLeft = new Sprite(this.getAssetPath('FairLeft.png'), 6, 15);
        this.FairRight = new Sprite(this.getAssetPath('FairRight.png'), 6, 15);
        this.FairLeftPurple = new Sprite(this.getAssetPath('FairLeftPurple.png'), 6, 15);
        this.FairRightPurple = new Sprite(this.getAssetPath('FairRightPurple.png'), 6, 15);
        //UPSMASH
        this.UpSmashLeft = new Sprite(this.getAssetPath('UpSmashLeft.png'), 13, 15);
        this.UpSmashRight = new Sprite(this.getAssetPath('UpSmashRight.png'), 13, 15);
        this.UpSmashLeftPurple = new Sprite(this.getAssetPath('UpSmashLeftPurple.png'), 13, 15);
        this.UpSmashRightPurple = new Sprite(this.getAssetPath('UpSmashRightPurple.png'), 13, 15);
    }

    update(ctx, obj) {
        let spriteToDraw = null;

        if (obj.look === 'left') {
            if (obj.currentAnimation === 'Run')
                spriteToDraw = obj.nb === 1 ? this.RunLeft : this.RunLeftPurple;
            if (obj.currentAnimation === 'Jump')
                spriteToDraw = obj.nb === 1 ? this.JumpLeft : this.JumpLeftPurple;
            if (obj.currentAnimation === 'Idle')
                spriteToDraw = obj.nb === 1 ? this.IdleLeft : this.IdleLeftPurple;
        }
        if (obj.look === 'right') {
            if (obj.currentAnimation === 'Run')
                spriteToDraw = obj.nb === 1 ? this.RunRight : this.RunRightPurple;
            if (obj.currentAnimation === 'Jump')
                spriteToDraw = obj.nb === 1 ? this.JumpRight : this.JumpRightPurple;
            if (obj.currentAnimation === 'Idle')
                spriteToDraw = obj.nb === 1 ? this.IdleRight : this.IdleRightPurple;
        }

        spriteToDraw.drawSprite(ctx, obj.x, obj.y, obj.width, obj.height);
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