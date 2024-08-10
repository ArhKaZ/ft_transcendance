import Player from "./game/player.js";
import Game from "./game/game.js";

document.addEventListener('DOMContentLoaded', init);

function init() {
    const canvas = document.getElementById('gameCanvas');
    const P1 = new Player(1);
    const P2 = new Player(2);
    const game = new Game(canvas, P1, P2);

    game.start();
}