class Player {
    constructor(nb, isMe) {
        // this.name = name;
        this.nb = nb;
        this.paddle = null;
        this.isMe = false;
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