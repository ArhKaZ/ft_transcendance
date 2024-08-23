class Hitbox {
    constructor(cX, cY, cWidth, cHeight, dir) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.dir = dir;
        this.currentHitboxDuration = 0;
        this.updateHitbox(cX, cY, cWidth, cHeight, true);
    }

    update() {
        this.currentHitboxDuration--;
        if (this.currentHitboxDuration <= 0) {
            return -1;
        }
    }

    updateHitbox(cX, cY, cWidth, cHeight, assign = false) {
        switch (this.dir) {
            case 'upAirLeft':
                this.x = cX - (cWidth / 2 - 10);
                this.y = cY;
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 195;
                break;
            case 'upAirRight':
                this.x = cX - (cWidth / 2 + 10);
                this.y = cY;
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 195;
                break;
            case 'downAirLeft':
                this.x = cX - 10;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'downAirRight':
                this.x = cX + cWidth + 10;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'backAirLeft':
                this.x = cX + cWidth + 10;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'backAirRight':
                this.x = cX - 10;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 80;
                break;
            case 'forwardAirLeft':
                this.x = cX - 5;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 120;
                break;
            case 'forwardAirRight':
                this.x = cX + cWidth + 5;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 120;
                break;
            case 'upSmash':
                this.x = cX + cWidth / 2;
                this.y = cY - 5;
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 120;
                break;
            case 'downSmash':
                this.x = cX;
                this.y = cY + (cHeight / 4);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 160;
                break;
            case 'leftSmash':
                this.x = cX - 5;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 150;
                break;
            case 'rightSmash':
                this.x = cX + cWidth + 5;
                this.y = cY + (cHeight / 2);
                this.width = 10;
                this.height = 10;
                if (assign)
                    this.currentHitboxDuration = 150;
                break;
        }
    }
}

export default Hitbox;