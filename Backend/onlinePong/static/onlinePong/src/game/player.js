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

    draw(context, color) {
        this.paddle.draw(context, color);
    }
}

export default Player;