class Player {
    constructor(nb, name, id) {
        this.name = name;
        this.id = id;
        this.nb = nb;
        this.cube = null;
        this.stocks = 3;
    }

    decrementStock()
    {
        this.score -= 1;
    }

    getStock() {
        return this.stocks;
    }

    getName() {
        return this.name;
    }
}

export default Player;