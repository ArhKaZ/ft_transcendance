class Hitbox {
    constructor(obj, dir) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.dir = dir;
        this.currentHitboxDuration = 0;
        this.updateHitbox(obj, true);
    }

    update() {
        this.currentHitboxDuration--;
        if (this.currentHitboxDuration <= 0) {
            return -1;
        }
    }

    updateHitbox(obj, assign = false) {
        switch (this.dir) {
            case 'upAirLeft':
                this.x = obj.cX;
                this.y = obj.cY + 4;
                this.width = 10;
                this.height = 20;
                if (assign)
                    this.currentHitboxDuration = 120;
                break;
            case 'upAirRight':
                this.x = obj.cX + obj.cWidth - 4;
                this.y = obj.cY + 4;
                this.width = 10;
                this.height = 20;
                if (assign)
                    this.currentHitboxDuration = 120;
                break;
            case 'downAirLeft':
                this.x = obj.cX - 10;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 10;
                this.height = 30;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'downAirRight':
                this.x = obj.cX + obj.cWidth;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 10;
                this.height = 30;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'backAirLeft':
                this.x = obj.cX + obj.cWidth - 5;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 20;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'backAirRight':
                this.x = obj.cX - 5;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 20;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'forwardAirLeft':
                this.x = obj.cX - 10;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 15;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 90;
                break;
            case 'forwardAirRight':
                this.x = obj.cX + obj.cWidth - 4;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 15;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 90;
                break;
            case 'upSmash':
                this.x = obj.cX + 3;
                this.y = obj.cY - 5;
                this.width = 30;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 195;
                break;
            case 'downSmash':
                this.x = obj.cX - 10;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 20;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 160;
                break;
            case 'leftSmash':
                this.x = obj.cX - 8;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 15;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 150;
                break;
            case 'rightSmash':
                this.x = obj.cX + obj.cWidth - 3;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 15;
                this.height = 10;
                if (assign) {
                    this.currentHitboxDuration = 150;
                }
                break;
        }
    }
}

export default Hitbox;