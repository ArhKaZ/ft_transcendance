import Paddle from './paddle.js';
import Ball from './ball.js';
import { createNeonExplosion } from './spark.js';

class Game {
    constructor(canvas, p1, p2) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.P1 = p1;
        this.P2 = p2;
        this.P1.paddle = new Paddle(this.canvas, 1);
        this.P2.paddle = new Paddle(this.canvas, 2);
        this.ball = new Ball(this.canvas);
        this.score = [0, 0];
        this.scoreP1Element = document.getElementById('p1-score');
        this.scoreP2Element = document.getElementById('p2-score');
        this.isStart = false;
        this.colorP1 = 'white';
        this.colorP2 = 'white';
    }

    displayCanvas() {
        document.getElementById('canvasContainer').style.display = 'flex';
        document.getElementById('button-ready').classList.add('hidden');
    }

    start() {
        document.getElementById('countdownCanvas').classList.add('hidden');
        document.getElementById('gameCanvas').classList.remove('hidden');
        document.getElementById('infoP1').classList.add('hidden');
        document.getElementById('infoP2').classList.add('hidden');
        document.getElementById('p1-hud-name').textContent = this.P1.name;
        document.getElementById('p2-hud-name').textContent = this.P2.name;
        document.getElementById('hud-p1').classList.remove('hidden');
        document.getElementById('hud-p2').classList.remove('hidden');
        this.drawBorders(this.context, this.canvas);
        this.P1.draw(this.context, this.colorP1);
        this.P2.draw(this.context, this.colorP2);
        this.ball.setInMiddle(this.canvas);
        this.ball.draw(this.context);
        this.isStart = true;
    }

    stop() {
        this.isStart = false;
    }

    updateBallPosition(x, y) {
        this.ball.assignPos(x, y);
    }

    drawGame(bound_wall, bound_player) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBorders(this.context, this.canvas);
        this.ball.draw(this.context);
        this.activeBound(bound_wall, bound_player);
        this.P1.draw(this.context, this.colorP1);
        this.P2.draw(this.context, this.colorP2);
    }

    drawBorders(ctx, canvas) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }


    animateBounce(ctx, canvas, x, side) {
        const animationTime = 1000;
        const startTime = Date.now();
    
        function drawFrame() {
            const elapsedTime = Date.now() - startTime;
            const progress = elapsedTime / animationTime;
    
            if (progress > 1) return;
    
            const alpha = 1 - progress; 
            ctx.strokeStyle = `rgba(138, 43, 226, ${alpha})`;
            ctx.lineWidth = 4;
    
            ctx.beginPath();
            if (side === "top") {
                ctx.moveTo(0, 0);
                ctx.lineTo(canvas.width, 0);
            } else if (side === "bottom") {
                ctx.moveTo(0, ctx.canvas.height);
                ctx.lineTo(canvas.width, ctx.canvas.height);
            }
            ctx.stroke();
    
            requestAnimationFrame(drawFrame); 
        }

        drawFrame(); 
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

    updateScores(data) {
        const side = data.player_id === this.P1.id ? 'right' : 'left'; 
        createNeonExplosion(side, this.ball.y);
        this.score = data.scores;
        this.scoreP1Element.textContent = this.score[0].toString();
        this.scoreP2Element.textContent = this.score[1].toString();
        this.drawGame(false, false);
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

    activeBound(bound_wall, bound_player) {
        if (bound_wall) {
            this.bound_wall();
        }
        else if (bound_player) {
            this.bound_player();
        }
    }

    bound_wall() {
        const x_ball = this.ball.x;
        const y_ball = this.ball.y;
        if (y_ball < this.canvas.height / 2) {
            this.animateBounce(this.context, this.canvas, x_ball, "top");
        } else {
           this.animateBounce(this.context, this.canvas, x_ball, "bottom");
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

    displayWinner(loser) {
        
        const endElement = document.getElementById('end-container');
        const gameCanvas = document.getElementById('gameCanvas');
        const p1ImgElement = document.getElementById('end-img-p1');
        const p2ImgElement = document.getElementById('end-img-p2');
        const p1NameElement = document.getElementById('end-name-p1');
        const p2NameElement = document.getElementById('end-name-p2');

        if (this.P1.id === loser) {
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