import Sprite from './sprite.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        this.assetsPath = window.MAGICDUEL_ASSETS;
        this.scale = 2;
        //IDLE
        this.IdleLeft = new Sprite('../static/magicDuel/Wizard/Idle.png', 6, 10, 231, 190, 'idle',true);
        this.AttackLeft = new Sprite('../static/magicDuel/Wizard/Attack1.png', 8, 10, 231, 190, 'attack');
        this.TakeHit = new Sprite('../static/magicDuel/Wizard/Hit.png', 4, 10, 231, 190, 'hit');
        this.Death = new Sprite('../static/magicDuel/Wizard/Death.png', 7, 10, 231, 190, 'death');
        // CHANGER DONNER SPRITES :
        this.DarkBolt = new Sprite('../static/magicDuel/Attacks/Dark-Bolt.png', 11, 10, 67, 92, 'darkBolt');
        this.FireBomb = new Sprite('../static/magicDuel/Attacks/Fire-bomb.png', 14, 10, 67, 67, 'fireBomb');
        this.Lightning = new Sprite('../static/magicDuel/Attacks/Lightning1.png', 10, 10, 46, 92, 'lightning');
        this.Spark = new Sprite('../static/magicDuel/Attacks/spark.png', 7 , 10, 67, 67, 'spark');
    }

    update(ctx, obj, attackSprite = null) {
        let spriteToDraw = null;
        switch (obj.currentAnimationPlayer) {
            case 'Idle':
                spriteToDraw = this.IdleLeft;
                break;
            case 'Attack':
                spriteToDraw = this.AttackLeft;
                break;
            case 'TakeHit':
                spriteToDraw = this.TakeHit;
                break;
            case 'Death':
                spriteToDraw = this.Death;
                break;
            default:
                spriteToDraw = this.IdleLeft;
        }

        if (spriteToDraw) {
            spriteToDraw.drawSprite(ctx, obj.x, obj.y, this.scale)
        }

        if (attackSprite) {
            const attackX = (obj.x + (this.IdleLeft.frameWidth * this.scale) / 2) - (attackSprite.frameWidth * this.scale) / 2;
            const attackY = (obj.y + (this.IdleLeft.frameHeight * this.scale) / 2) - (attackSprite.frameHeight * this.scale) / 2;
            attackSprite.drawSprite(ctx, attackX, attackY, this.scale);
        }
    }

    getAttackSprite(attackName) {
        switch(attackName) {
            case 'dark_bolt': return this.DarkBolt;
            case 'fire_bomb': return  this.FireBomb;
            case 'lightning': return this.Lightning;
            case 'spark': return this.Spark;
            default: return null;
        }
    }

    isAnimationComplete(animationName) {
        let sprite = null;
        switch (animationName) {
            case 'Attack':
                sprite = this.AttackLeft;
                break;
            case 'TakeHit':
                sprite = this.TakeHit;
                break;
            case 'Death':
                sprite = this.Death;
                break;
            default:
                return false;
        }
        return sprite ? sprite.animationFinish() : false;
    }

    resetAnimation(animationName) {
        let sprite = null;
        switch (animationName) {
            case 'Attack':
                sprite = this.AttackLeft;
                break;
            case 'TakeHit':
                sprite = this.TakeHit;
                break;
            case 'Death':
                sprite = this.Death;
                break;
        }
        if (sprite) {
            sprite.resetAnimation();
        }
    }
}

export default Animation;