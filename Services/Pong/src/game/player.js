class Player {
    constructor(nb, name) {
        this.name = name;
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