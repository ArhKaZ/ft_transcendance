import Sprite from './sprite.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        this.assetsPath = window.MAGICDUEL_ASSETS;
        this.scale = 2;
        this.IdleP1 = new Sprite('../assets/magicDuel/Wizard/IdleP1.png', 6, 6, 231, 190, 'idleP1', true);
        this.AttackP1 = new Sprite('../assets/magicDuel/Wizard/AttackP1.png', 8, 6, 231, 190, 'attackP1');
        this.TakeHitP1 = new Sprite('../assets/magicDuel/Wizard/HitP1.png', 4, 7, 231, 190, 'hitP1');
        this.IdleP2 = new Sprite('../assets/magicDuel/Wizard/IdleP2.png', 6, 6, 231, 190, 'idleP2', true);
        this.AttackP2 = new Sprite('../assets/magicDuel/Wizard/AttackP2.png', 8, 6, 231, 190, 'attackP2');
        this.TakeHitP2 = new Sprite('../assets/magicDuel/Wizard/HitP2.png', 4, 7, 231, 190, 'hitP2');
        this.DeathP1 = new Sprite('../assets/magicDuel/Wizard/DeathP1.png', 7, 7, 231, 190, 'deathP1');
        this.DeathP2 = new Sprite('../assets/magicDuel/Wizard/DeathP2.png', 7, 7, 231, 190, 'deathP2');
        this.DarkBolt = new Sprite('../assets/magicDuel/Attacks/Dark-Bolt.png', 11, 6, 67, 92, 'darkBolt');
        this.FireBomb = new Sprite('../assets/magicDuel/Attacks/Fire-bomb.png', 14, 6, 67, 67, 'fireBomb');
        this.Lightning = new Sprite('../assets/magicDuel/Attacks/Lightning1.png', 10, 6, 46, 92, 'lightning');
        this.Spark = new Sprite('../assets/magicDuel/Attacks/Spark.png', 7 , 6, 67, 67, 'spark');
    }

    update(ctx, obj, attackSprite = null) {
        let spriteToDraw = null;
        switch (obj.currentAnimationPlayer) {
            case 'IdleP1':
                spriteToDraw = this.IdleP1;
                break;
            case 'IdleP2':
                spriteToDraw = this.IdleP2;
                break;
            case 'AttackP1':
                spriteToDraw = this.AttackP1;
                break;
            case 'AttackP2':
                spriteToDraw = this.AttackP2;
                break;
            case 'TakeHitP1':
                spriteToDraw = this.TakeHitP1;
                break;
            case 'TakeHitP2':
                spriteToDraw = this.TakeHitP2;
                break;
            case 'DeathP1':
                spriteToDraw = this.DeathP1;
                break;
            case 'DeathP2':
                spriteToDraw = this.DeathP2;
                break;
            default:
                spriteToDraw = this.IdleP1;
        }

        if (spriteToDraw) {
            spriteToDraw.drawSprite(obj.canvas, ctx, obj.x, obj.y)
        }

        if (attackSprite) {
            let scaleFactor = obj.canvas.width / 1400;
            const attackX = obj.x + (231 * scaleFactor) / 2 + (attackSprite.frameWidth * scaleFactor) / 2;
            const attackY = obj.y + (190 * scaleFactor) / 2;
            attackSprite.drawSprite(obj.canvas, ctx, attackX, attackY);
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
            case 'AttackP1':
                sprite = this.AttackP1;
                break;
            case 'TakeHitP1':
                sprite = this.TakeHitP1;
                break;
            case 'AttackP2':
                sprite = this.AttackP2;
                break;
            case 'TakeHitP2':
                sprite = this.TakeHitP2;
                break;
            default:
                return false;
        }
        return sprite ? sprite.animationFinish() : false;
    }

    resetAnimation(animationName) {
        let sprite = null;
        switch (animationName) {
            case 'AttackP1':
                sprite = this.AttackP1;
                break;
            case 'TakeHitP1':
                sprite = this.TakeHitP1;
                break;
            case 'AttackP2':
                sprite = this.AttackP2;
                break;
            case 'TakeHitP2':
                sprite = this.TakeHitP2;
                break;
            case 'DeathP1':
                sprite = this.DeathP1;
                break;
            case 'DeathP2':
                sprite = this.DeathP2;
                break;
        }
        if (sprite) {
            sprite.resetAnimation();
        }
    }
}

export default Animation;