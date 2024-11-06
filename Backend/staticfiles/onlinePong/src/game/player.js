class Player {
    constructor(id, name) {
        this.name = name;
        this.id = id
        this.paddle = null;
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

    draw(context) {
        this.paddle.draw(context);
    }
}

export default Player;