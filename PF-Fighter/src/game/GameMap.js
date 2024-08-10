class GameMap {
    constructor(nb) {
        this.limitMapTopLeftX = 0;
        this.limitMapTopLeftY = 0;
        this.limitMapTopRightX = 0;
        this.limitMapTopRightY = 0;
        this.limitMapBotLeftX = 0;
        this.limitMapBotLeftY = 0;
        this.limitMapBotRightX = 0;
        this.limitMapBotRightY = 0;
        this.createMap(nb);
    }

    createMap(nb) {
        if (nb === 1)
        {
            this.map1();
        }
    }

    map1() {
        this.limitMapTopLeftX = 0;
        this.limitMapTopLeftY = 0;
        this.limitMapTopRightX = 1000;
        this.limitMapTopRightY = 0;
        this.limitMapBotLeftX = 0;
        this.limitMapBotLeftY = 800;
        this.limitMapBotRightX = 1000;
        this.limitMapBotRightY = 800;
    }
}

export default GameMap;