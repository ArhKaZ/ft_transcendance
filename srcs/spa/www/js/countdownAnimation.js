import Dot from './onlinePong/game/dot.js';
import { ensureValidToken } from '/js/utils.js';
import { sleep } from './utils.js';
class CountdownAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.dots = [];
        this.particleCount = 3400;
        this.isAnimating = false;

        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.animate = this.animate.bind(this);

        window.addEventListener('resize', this.resizeCanvas);
        this.resizeCanvas();
    }

    stopDisplay() {
        this.isAnimating = false;
        this.canvas.classList.add('hidden');
        window.removeEventListener('resize', this.resizeCanvas);
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createDotsFromText(text) {
        const fontSize = Math.min(this.canvas.width, this.canvas.height) * 0.5;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const textMetrics = this.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize * 0.8;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        const dots = [];

        const sampleArea = {
            x: (this.canvas.width - textWidth) / 2,
            y: (this.canvas.height - textHeight) / 2,
            width: textWidth,
            height: textHeight
        };

        for (let i = 0; i < this.particleCount; i++) {
            let found = false;
            let attempts = 0;
            const maxAttempts = 100;

            while (!found && attempts < maxAttempts) {
                const x = sampleArea.x + Math.random() * sampleArea.width;
                const y = sampleArea.y + Math.random() * sampleArea.height;

                const index = (Math.floor(y) * this.canvas.width + Math.floor(x)) * 4;

                if (pixels[index + 3] > 128) {
                    dots.push(new Dot(x, y, this.canvas.width, this.canvas.height));
                    found = true;
                }

                attempts++;
            }
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        return dots;
    }

    animate() {
        if (!this.isAnimating) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.dots.forEach(dot => {
            dot.update();
            dot.draw(this.ctx);
        });

        requestAnimationFrame(this.animate);
    }

    async displayNumber(from) {
        let count = from;
        this.isAnimating = true;

        if (count > 0) {
            this.dots = this.createDotsFromText(count.toString());
        } else {
            this.dots = this.createDotsFromText('GO');
            this.isAnimating = false;
            this.destroy();
        }

        this.animate();
    }

    destroy() {
        window.removeEventListener('resize', this.resizeCanvas);
        this.isAnimating = false;
    }
}

export default CountdownAnimation;