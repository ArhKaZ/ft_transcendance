class Player {
    constructor(nb) {
        //this.name = prompt("Username for P" + nb);
        this.name = 'random';
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