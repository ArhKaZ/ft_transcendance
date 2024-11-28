import Sprite from './sprite.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        this.assetsPath = window.MAGICDUEL_ASSETS

        this.getAssetPath = (path) => `${this.assetsPath}assets/${path}`;
        //IDLE
        this.IdleLeft = new Sprite(this.getAssetPath('Wizard/Idle.png'), 6, 10, 231, 190, 'idle',true);
        this.AttackLeft = new Sprite(this.getAssetPath('Wizard/Attack1.png'), 8, 10, 231, 190, 'attack');
        this.TakeHit = new Sprite(this.getAssetPath('Wizard/Hit.png'), 4, 10, 100, 100, 'hit');
        this.Death = new Sprite(this.getAssetPath('Wizard/Death.png'), 7, 10, 100, 100, 'death');
        // CHANGER DONNER SPRITES :
        this.DarkBolt = new Sprite(this.getAssetPath('Attacks/Dark-Bolt.png'), 11, 30, 65, 88, 'darkBolt');
        this.FireBomb = new Sprite(this.getAssetPath('Attacks/Fire-bomb.png'), 14, 30, 65, 64, 'fireBomb');
        this.Lightning = new Sprite(this.getAssetPath('Attacks/Lightning.png'), 10, 30, 65, 128, 'lightning');
        this.Spark = new Sprite(this.getAssetPath('Attacks/spark.png'), 7 , 30, 32, 32, 'spark');
    }

    update(ctx, obj, attackSprite = null) {
        let spriteToDraw = null;

        switch (obj.currentAnimation) {
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
            spriteToDraw.drawSprite(ctx, obj.x, obj.y)
        }

        if (attackSprite) {

            const attackX = obj.x + (obj.nb === 1 ? 100 : -100);
            const attackY = obj.y;
            attackSprite.drawSprite(ctx, attackX, attackY);
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