class Player {
    constructor(nb) {
        //this.name = prompt("Username for P" + nb);
        this.name = 'random';
        this.nb = nb;
        this.paddle = null;
        this.score = 0;
    }

    incrementScore()
    {
        this.score += 1;
    }

    getScore() {
        return this.score;
    }

    getName() {
        return this.name;
    }
}

export default Player;