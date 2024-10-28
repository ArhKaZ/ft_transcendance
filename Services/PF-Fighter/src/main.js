import Player from "./game/player.js";
import Game from "./game/game.js";


function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');

    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
}

function init() {
    resizeCanvas();
    const canvas = document.getElementById('gameCanvas');
    const P1 = new Player(1);
    const P2 = new Player(2);
    const game = new Game(canvas, P1, P2);

    game.start();
    window.addEventListener('resize', resizeCanvas);
}

document.addEventListener('DOMContentLoaded', init);
