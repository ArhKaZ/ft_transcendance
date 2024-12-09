import Paddle from './paddle.js';
import Ball from './ball.js';
import Impact from './impact.js';
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
        document.getElementById('buttonStart').classList.add('hidden');
    }

    start() {
        document.getElementById('gameCanvas').classList.remove('hidden');
        document.getElementById('infoP1').classList.add('hidden');
        document.getElementById('infoP2').classList.add('hidden');
        document.getElementById('p1-hud-name').textContent = this.P1.name;
        document.getElementById('p2-hud-name').textContent = this.P2.name;
        document.getElementById('hud-p1').classList.remove('hidden');
        document.getElementById('hud-p2').classList.remove('hidden');
        this.drawBorders(this.context, this.canvas);
        this.P1.draw(this.context);
        this.P2.draw(this.context);
        // this.updateScoreFontSize();
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
            this.P1.draw(this.context);
        }
        else {
            this.P2.paddle.assignPos(y);
            this.P2.draw(this.context);
        }
    }

    updateScores(score) {
        this.score = score;
        this.scoreP1Element.textContent = this.score[0].toString();
        this.scoreP2Element.textContent = this.score[1].toString();
    }

    updateScoreFontSize() {
        const hudP1 = document.getElementById('hud-p1');
        const hudP2 = document.getElementById('hud-p2');
        const nameP1 = document.getElementById('p1-hud-name');
        const nameP2 = document.getElementById('p2-hud-name');
    
        const fontSizeP1 = Math.min(hudP1.offsetWidth, hudP1.offsetHeight) * 1.2; // Nom
        const fontSizeP2 = Math.min(hudP2.offsetWidth, hudP2.offsetHeight) * 1.2;
    
        nameP1.style.fontSize = `${fontSizeP1}px`;
        nameP2.style.fontSize = `${fontSizeP2}px`;
    
        const scoreFontSizeP1 = Math.min(hudP1.offsetWidth, hudP1.offsetHeight) * 1.3; // Score
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
            console.log('option1');
            this.startPulseEffect('P1');
        } else {
            console.log('option2');
            this.startPulseEffect('P2');
        }
    }

    startPulseEffect(player) {
        let opacity = 0.2; 
        let increasing = true; 
        const duration = 1000; 
        const intervalSpeed = 50; 
    
        const intervalId = setInterval(() => {

            if (increasing) {
                opacity += 0.1;
                if (opacity >= 1) increasing = false; 
            } else {
                opacity -= 0.1;
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
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'red';
        this.context.font = '100px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        const winnerText = `${winner} has win !`;

        const scoreP1Element = document.getElementById('scoreP1');
        const scoreP2Element = document.getElementById('scoreP2');
        // const canvasElement = document.getElementById('canvasContainer');

        // canvasElement.style.display = 'none';
        scoreP1Element.classList.add('hidden');
        scoreP2Element.classList.add('hidden');

        this.context.fillText(winnerText, this.canvas.width / 2, this.canvas.height / 2);

        setTimeout(() => {
            window.location.href = '/logged';
        }, 5000);
    }

}

export default Game;