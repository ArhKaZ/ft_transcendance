import Sprite from './sprite.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        this.assetsPath = window.MAGICDUEL_ASSETS

        this.getAssetPath = (path) => `${this.assetsPath}assets/Wizard/${path}`;
        //IDLE
        this.IdleLeft = new Sprite(this.getAssetPath('Idle.png'), 6, 40);
        this.AttackLeft = new Sprite(this.getAssetPath('Attack1.png'), 8, 50);
        this.TakeHit = new Sprite(this.getAssetPath('Hit.png'), 4, 30);
        this.Death = new Sprite(this.getAssetPath('Death.png'), 7, 50);
    }

    update(ctx, obj) {
        let spriteToDraw = null;

        if (obj.look === 'left') {
            if (obj.currentAnimation === 'Idle')
                spriteToDraw = this.IdleLeft;
        }
        if (obj.look === 'right') {
            if (obj.currentAnimation === 'Idle')
                spriteToDraw = this.IdleLeft;
        }

        spriteToDraw.drawSprite(ctx, obj.x, obj.y, obj.width, obj.height);
        return spriteToDraw.getAnimationSpeed();
    }

}

export default Animation;