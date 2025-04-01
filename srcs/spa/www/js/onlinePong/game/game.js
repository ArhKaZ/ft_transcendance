import Paddle from './paddle.js';
import Ball from './ball.js';
import { createNeonExplosion } from './spark.js';

class Game {
    constructor(canvas, p1, p2) {
        // Add canvas validation
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Invalid canvas element provided');
        }

        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        
        // Validate player objects
        if (!p1 || !p2) {
            throw new Error('Both players must be provided');
        }

        // Initialize with null checks
        this.P1 = {
            ...p1,
            paddle: new Paddle(this.canvas, 1)
        };
        this.P2 = {
            ...p2,
            paddle: new Paddle(this.canvas, 2)
        };

        // Score elements with fallbacks
        this.scoreP1Element = document.getElementById('p1-score') || { textContent: '0' };
        this.scoreP2Element = document.getElementById('p2-score') || { textContent: '0' };

        // Rest of initialization
        this.ball = new Ball(this.canvas);
        this.score = [0, 0];
        this.isStart = false;
        this.colorP1 = 'white';
        this.colorP2 = 'white';
        this.isBoundPlayer = false;
        this.isBoundWall = false;
        this.canMove = false;
        this.animationId = null;
        this.bounceAnimation = {
            active: false,
            startTime: null,
            side: null,
            duration: 1000
        };
    }

    displayCanvas() {
        const canvasContainer = document.getElementById('canvasContainer');
        const readyButton = document.getElementById('button-ready');
        
        // Safe element handling
        canvasContainer?.classList?.remove('hidden');
        readyButton?.classList?.add('hidden');
    }

    start() {
        // Add null-safe element access
        const safeUpdate = (id, action) => {
            const el = document.getElementById(id);
            el?.classList?.[action]('hidden');
        };

        // Toggle visibility states
        safeUpdate('countdownCanvas', 'add');
        safeUpdate('gameCanvas', 'remove');
        safeUpdate('infoP1', 'add');
        safeUpdate('infoP2', 'add');
        safeUpdate('hud-p1', 'remove');
        safeUpdate('hud-p2', 'remove');

        // Update HUD names with fallbacks
        const setTextSafe = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setTextSafe('p1-hud-name', this.P1.name);
        setTextSafe('p2-hud-name', this.P2.name);

        // Initialize game visuals
        this.drawBorders(this.context, this.canvas);
        this.P1.draw(this.context, this.colorP1);
        this.P2.draw(this.context, this.colorP2);
        this.ball.setInMiddle(this.canvas);
        this.ball.draw(this.context);
        this.isStart = true;
        this.startGameLoop();
    }

    // Add null checks to critical methods
    displayWinner(winner) {
        const endElement = document.getElementById('end-container');
        const gameCanvas = document.getElementById('gameCanvas');
        
        // Validate elements before use
        if (!endElement || !gameCanvas) return;

        const updateWinnerUI = (playerId, crownId) => {
            if (this[playerId].id.toString() === winner) {
                const crown = document.getElementById(crownId);
                crown?.classList?.remove('hidden');
            }
        };

        gameCanvas.classList.add('hidden');
        endElement.classList.remove('hidden');
        
        // Update player-specific elements
        updateWinnerUI('P1', 'crown-img-p1');
        updateWinnerUI('P2', 'crown-img-p2');

        // Safe image updates
        const updateImage = (id, src) => {
            const img = document.getElementById(id);
            if (img) img.src = src;
        };

        updateImage('end-img-p1', this.P1.img);
        updateImage('end-img-p2', this.P2.img);

        // Safe text updates
        const setWinnerName = (id, name) => {
            const el = document.getElementById(id);
            if (el) el.textContent = name;
        };

        setWinnerName('end-name-p1', this.P1.name);
        setWinnerName('end-name-p2', this.P2.name);
    }

    // Add error boundary to game loop
    startGameLoop() {
        const gameLoop = () => {
            try {
                if (!this.isStart) return;
                this.ball.updatePosition(this.P1.paddle, this.P2.paddle);
                this.P1.paddle.updatePosition(this.canMove);
                this.P2.paddle.updatePosition(this.canMove);
                this.drawGame();
                this.animationId = requestAnimationFrame(gameLoop);
            } catch (error) {
                console.error('Game loop error:', error);
                this.stop();
            }
        }
        
        try {
            this.animationId = requestAnimationFrame(gameLoop);
        } catch (error) {
            console.error('Failed to start game loop:', error);
        }
    }
}

export default Game;