import Sprite from './sprite.js';
import Hitbox from './hitbox.js';

class Animation {
    constructor(nb) {
        this.nb = nb;
        this.assetsPath = window.PIXELPAWS_ASSETS || '/static/pixelPawsdrop/';

        this.getAssetPath = (path) => `${this.assetsPath}assets/Character/${path}`;
        //IDLE
        // this.IdleLeft = new Sprite(this.getAssetPath('IdleLeft.png'), 4, 40);
    }

    update(ctx, obj) {
        let spriteToDraw = null;

        if (obj.look === 'left') {
            if (obj.currentAnimation === 'Idle')
                spriteToDraw = obj.nb === 1 ? this.IdleLeft : this.IdleLeftPurple;
        }
        if (obj.look === 'right') {
            if (obj.currentAnimation === 'Idle')
                spriteToDraw = obj.nb === 1 ? this.IdleRight : this.IdleRightPurple;
        }

        spriteToDraw.drawSprite(ctx, obj.x, obj.y, obj.width, obj.height);
        return spriteToDraw.getAnimationSpeed();
    }


}

export default Animation;