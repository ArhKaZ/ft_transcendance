import Paddle from './paddle.js';
import Ball from './ball.js';
import IA from './ia.js';
import { createNeonExplosion } from './spark.js';
import { sleep } from "../../utils.js";

class Game {
    constructor(canvas, p1, p2) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.P1 = p1;
        this.P2 = p2;
        this.P1.paddle = new Paddle(this.canvas, 1);
        this.P2.paddle = new Paddle(this.canvas, 2);
        this.IA = new IA(this.canvas);
        this.ball = new Ball(this.canvas);
        this.score = [0, 0];
        this.scoreP1Element = document.getElementById('p1-score');
        this.scoreP2Element = document.getElementById('p2-score');
        this.isStart = false;
        this.colorP1 = 'white';
        this.colorP2 = 'white';
        this.keyState = {};
        this.bindEvents();
        this.asReset = false;
        this.bounceAnimations = [];
        this.bound = [false, false];
    }

    bindEvents() {
        window.addEventListener('keydown', (event) => {
            this.keyState[event.key] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keyState[event.key] = false;
        });
    }

    async start() {
        this.displayForStart();
        this.isStart = true;
        await this.loop();
    }

    async loop() {
        if (!this.isStart) return;

        this.update();
        this.drawGame();
        
        if (this.asReset)
        {
            await sleep(1000);
            this.asReset = false;
        }

        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.IA.checkPosition(this.ball, this.P2.paddle, this.keyState)
        this.P1.paddle.update(this.keyState);
        this.P2.paddle.update(this.keyState);
        this.bound = this.ball.update(this.P1.paddle, this.P2.paddle);
        this.checkAsScore();
        this.checkWinner();
    }

    checkWinner() {
        let winner = this.score[0] >= 5 ? 1 : this.score[1] >= 5 ? 2 : 0
        if (winner != 0) {
            this.stop();
            this.displayWinner(winner);
        }
    }

    checkAsScore() {
        if (this.ball.x <= 0) 
        {
            this.P2.incrementScore();
            this.updateScores('left');
            this.ball.reset('p2');
            this.asReset = true;
        }
        if (this.ball.x + this.ball.size >= this.canvas.width)
        {
            this.P1.incrementScore();
            this.updateScores('right');
            this.ball.reset('p1');
            this.asReset = true;
        }
    }

    displayCanvas() {
        document.getElementById('canvasContainer').style.display = 'flex';
        document.getElementById('button-ready').classList.add('hidden');
        document.getElementById('info-main-player').classList.add('hidden');
        document.getElementById('levels').classList.add('hidden');
    }

    displayForStart() {
        document.getElementById('countdownCanvas').classList.add('hidden');
        document.getElementById('gameCanvas').classList.remove('hidden');
        document.getElementById('p1-hud-name').textContent = this.P1.name;
        document.getElementById('p2-hud-name').textContent = this.P2.name;
        document.getElementById('hud-p1').classList.remove('hidden');
        document.getElementById('hud-p2').classList.remove('hidden');
        this.drawBorders(this.context, this.canvas);
        this.P1.draw(this.context, this.colorP1);
        this.P2.draw(this.context, this.colorP2);
        this.ball.draw(this.context);
        this.isStart = true;
    }

    stop() {
        this.isStart = false;
    }

    drawGame() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBorders(this.context, this.canvas);
        this.drawFrame();
        this.ball.draw(this.context);
        this.activeBound();
        this.P1.draw(this.context, this.colorP1);
        this.P2.draw(this.context, this.colorP2);
    }

    drawBorders(ctx, canvas) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    animateBounce(side) {
        const startTime = Date.now();
        const animation = {
            startTime,
            side,
            duration: 1000,
        };
        this.bounceAnimations.push(animation);
    }

    drawFrame() {
        const currentTime = Date.now();
        this.bounceAnimations = this.bounceAnimations.filter(animation => {
            const progress = (currentTime - animation.startTime) / animation.duration;
            if (progress > 1) 
                return false;
            
            const alpha = 1 - progress; 
            this.context.strokeStyle = `rgba(138, 43, 226, ${alpha})`;
            this.context.lineWidth = 4;

            this.context.beginPath();
            if (animation.side === "top") {
                this.context.moveTo(0, 0);
                this.context.lineTo(this.canvas.width, 0);
            } else if (animation.side === "bottom") {
                this.context.moveTo(0, this.canvas.height);
                this.context.lineTo(this.canvas.width, this.canvas.height);
            }
            this.context.stroke();

            return true;
        });
    }

    updatePlayerPosition(player, y) {
        if (player === 1) {
            this.P1.paddle.assignPos(y);
            this.P1.draw(this.context, this.colorP1);
        }
        else {
            this.P2.paddle.assignPos(y);
            this.P2.draw(this.context, this.colorP2);
        }
    }

    updateScores(side) {
        this.score = [this.P1.score, this.P2.score];
        createNeonExplosion(side, this.ball.y);
        this.scoreP1Element.textContent = this.score[0].toString();
        this.scoreP2Element.textContent = this.score[1].toString();
    }

    updateScoreFontSize() {
        const hudP1 = document.getElementById('hud-p1');
        const hudP2 = document.getElementById('hud-p2');
        const nameP1 = document.getElementById('p1-hud-name');
        const nameP2 = document.getElementById('p2-hud-name');
    
        const fontSizeP1 = Math.min(hudP1.offsetWidth, hudP1.offsetHeight) * 1.2;
        const fontSizeP2 = Math.min(hudP2.offsetWidth, hudP2.offsetHeight) * 1.2;
    
        nameP1.style.fontSize = `${fontSizeP1}px`;
        nameP2.style.fontSize = `${fontSizeP2}px`;
    
        const scoreFontSizeP1 = Math.min(hudP1.offsetWidth, hudP1.offsetHeight) * 1.3;
        const scoreFontSizeP2 = Math.min(hudP2.offsetWidth, hudP2.offsetHeight) * 1.3;
    
        this.scoreP1Element.style.fontSize = `${scoreFontSizeP1}px`;
        this.scoreP2Element.style.fontSize = `${scoreFontSizeP2}px`;
    }

    activeBound() {
        if (this.bound[0]) {
            this.bound_wall();
        }
        else if (this.bound[1]) {
            this.bound_player();
        }
    }

    bound_wall() {
        console.log('bound_wall');
        const y_ball = this.ball.y;
        if (y_ball < this.canvas.height / 2) {
            this.animateBounce("top");
        } else {
           this.animateBounce("bottom");
        }
    }

    bound_player() {
        const x_ball = this.ball.x;
        
        if (x_ball < this.canvas.width / 2) {
            this.startPulseEffect('P1');
        } else {
            this.startPulseEffect('P2');
        }
    }

    startPulseEffect(player) {
        let opacity = 0.2; 
        let increasing = true; 
        const duration = 1000; 
        const intervalSpeed = 30; 
    
        const intervalId = setInterval(() => {

            if (increasing) {
                opacity += 0.2;
                if (opacity >= 1) increasing = false; 
            } else {
                opacity -= 0.2;
                if (opacity <= 0.2) increasing = true;
            }
    
            this[`color${player}`] = `rgba(138, 43, 226, ${opacity.toFixed(2)})`;
        }, intervalSpeed);
    

        setTimeout(() => {
            clearInterval(intervalId);
            this[`color${player}`] = 'white';
        }, duration);
    }

    displayWinner(winner) {
        
        const endElement = document.getElementById('end-container');
        const gameCanvas = document.getElementById('gameCanvas');
        const p1ImgElement = document.getElementById('end-img-p1');
        const p2ImgElement = document.getElementById('end-img-p2');
        const p1NameElement = document.getElementById('end-name-p1');
        const p2NameElement = document.getElementById('end-name-p2');

        if (this.P1.id === winner) {
            document.getElementById('crown-img-p1').classList.remove('hidden');
        } else {
            document.getElementById('crown-img-p2').classList.remove('hidden');
        }
        
        p1ImgElement.src = this.P1.img;
        p2ImgElement.src = this.P2.img;
        p1NameElement.textContent = this.P1.name;
        p2NameElement.textContent = this.P2.name;
        gameCanvas.classList.add('hidden');
        endElement.classList.remove('hidden');
    }
}

export default Game;