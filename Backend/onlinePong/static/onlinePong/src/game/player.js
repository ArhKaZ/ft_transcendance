class Player {
    constructor(id, name, isCurrentPlayer) {
        this.name = name;
        this.id = id
        this.paddle = null;
        this.isCurrentPlayer = isCurrentPlayer;
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