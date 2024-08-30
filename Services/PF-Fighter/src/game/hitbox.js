class Hitbox {
    constructor(obj, dir) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.dir = dir;
        this.damage = 0;
        this.power = 1;
        this.frameBegin = 0;
        this.frameEnd = 0;
        this.isActive = false;
        this.updateHitbox(obj, true);
    }

    checkActivation(currentFrame) {
        if (currentFrame >= this.frameBegin && currentFrame <= this.frameEnd) {
            this.isActive = true;
        } else {
            this.isActive = false;
        }
    }

    isExpired(currentFrame) {
        return currentFrame > this.frameEnd;
    }

    updateHitbox(obj, assign = false) {
        switch (this.dir) {
            case 'upAirLeft':
                this.x = obj.cX;
                this.y = obj.cY + 4;
                this.width = 10;
                this.height = 20;
                this.damage = 13;
                this.power = 1.5;
                if (assign) {
                    this.frameBegin = 3;
                    this.frameEnd = 6;
                }
                break;
            case 'upAirRight':
                this.x = obj.cX + obj.cWidth - 4;
                this.y = obj.cY + 4;
                this.width = 10;
                this.height = 20;
                this.damage = 13;
                this.power = 1.5;
                if (assign) {
                    this.frameBegin = 3;
                    this.frameEnd = 6;
                }
                break;
            case 'downAirLeft1':
                this.x = obj.cX - 10;
                this.y = obj.cY + (obj.cHeight / 2) - 10;
                this.width = 10;
                this.height = 10;
                this.damage = 20;
                this.power = 0.3;
                if (assign) {
                    this.frameBegin = 6;
                    this.frameEnd = 7;
                }
                break;
            case 'downAirLeft2':
                this.x = obj.cX - 10;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 10;
                this.height = 20;
                this.damage = 20;
                this.power = 10;
                if (assign) {
                    this.frameBegin = 7;
                    this.frameEnd = 8;
                }
                break;
            case 'downAirRight1':
                this.x = obj.cX + obj.cWidth;
                this.y = obj.cY + (obj.cHeight / 2) - 10;
                this.width = 10;
                this.height = 10;
                this.damage = 20;
                this.power = 1;
                if (assign) {
                    this.frameBegin = 6;
                    this.frameEnd = 7;
                }
                break;
            case 'downAirRight2':
                this.x = obj.cX + obj.cWidth;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 10;
                this.height = 20;
                this.damage = 20;
                this.power = 10;
                if (assign) {
                    this.frameBegin = 7;
                    this.frameEnd = 8;
                }
                break;
            case 'backAirLeft1':
                this.x = obj.cX + obj.cWidth - 5;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 20;
                this.height = 10;
                this.damage = 15;
                this.power = 1.9;
                if (assign) {
                    this.frameBegin = 2;
                    this.frameEnd = 4;
                }
                break;
            case 'backAirLeft2':
                this.x = obj.cX + obj.cWidth - 5;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 20;
                this.height = 10;
                this.damage = 15;
                this.power = 1.9;
                if (assign) {
                    this.frameBegin = 2;
                    this.frameEnd = 4;
                }
                break;
            case 'backAirRight1':
                this.x = obj.cX;
                this.y = obj.cY + (obj.cHeight / 2) - 5;
                this.width = 10;
                this.height = 10;
                this.damage = 15;
                this.power = 1.9;
                if (assign) {
                    this.frameBegin = 2;
                    this.frameEnd = 4;
                }
                break;
            case 'backAirRight2':
                this.x = obj.cX + 10;
                this.y = obj.cY + (obj.cHeight / 2) + 5;
                this.width = 10;
                this.height = 10;
                this.damage = 15;
                this.power = 1.9;
                if (assign) {
                    this.frameBegin = 2;
                    this.frameEnd = 4;
                }
                break;
            case 'forwardAirLeft':
                this.x = obj.cX - 10;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 15;
                this.height = 10;
                this.damage = 8;
                this.power = 1;
                if (assign) {
                    this.frameBegin = 2;
                    this.frameEnd = 4;
                }
                break;
            case 'forwardAirRight':
                this.x = obj.cX + obj.cWidth - 4;
                this.y = obj.cY + (obj.cHeight / 2) + 10;
                this.width = 15;
                this.height = 10;
                this.damage = 8;
                this.power = 1;
                if (assign) {
                    this.frameBegin = 2;
                    this.frameEnd = 4;
                }
                break;
            case 'upSmash':
                this.x = obj.cX + 3;
                this.y = obj.cY - 5;
                this.width = 30;
                this.height = 10;
                this.damage = 14;
                this.power = 3;
                if (assign) {
                    this.frameBegin = 5;
                    this.frameEnd = 8;
                }
                break;
            case 'downSmash1':
                this.x = obj.cX - 10;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 20;
                this.height = 10;
                this.damage = 14;
                this.power = 3;
                if (assign) {
                    this.frameBegin = 5;
                    this.frameEnd = 7;
                }
                break;
            case 'downSmash2':
                this.x = obj.cX + obj.cWidth - 5;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 20;
                this.height = 10;
                this.damage = 14;
                this.power = 3;
                if (assign) {
                    this.frameBegin = 5;
                    this.frameEnd = 7;
                }
                break;
            case 'leftSmash1':
                this.x = obj.cX - 8;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 15;
                this.height = 10;
                this.damage = 13;
                this.power = 2.4;
                if (assign) {
                    this.frameBegin = 4;
                    this.frameEnd = 5;
                }
                break;
            case 'leftSmash2':
                this.x = obj.cX - 8;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 15;
                this.height = 10;
                this.damage = 13;
                this.power = 2.4;
                if (assign) {
                    this.frameBegin = 7;
                    this.frameEnd = 8;
                }
                break;
            case 'rightSmash1':
                this.x = obj.cX + obj.cWidth - 3;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 15;
                this.height = 10;
                this.damage = 13;
                this.power = 2.4;
                if (assign) {
                    this.frameBegin = 4;
                    this.frameEnd = 5;
                }
                break;
            case 'rightSmash2':
                this.x = obj.cX + obj.cWidth - 3;
                this.y = obj.cY + (obj.cHeight / 2);
                this.width = 15;
                this.height = 10;
                this.damage = 13;
                this.power = 2.4;
                if (assign) {
                    this.frameBegin = 7;
                    this.frameEnd = 8;
                }
                break;
        }
    }
}

export default Hitbox;