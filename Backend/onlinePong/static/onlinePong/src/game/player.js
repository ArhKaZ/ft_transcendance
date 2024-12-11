class Player {
    constructor(id, name, img) {
        this.name = name;
        this.id = id
        this.paddle = null;
        this.img = img;
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