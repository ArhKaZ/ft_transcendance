class NeonParticle {
    constructor(x, y, angle, speed, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.02;
        this.color = color;
        this.radius = Math.random() * 2 + 1;
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.velocityX *= 0.98;
        this.velocityY *= 0.98;
        this.life -= this.decay;
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 2
        );
        
        gradient.addColorStop(0, `rgba(${this.color}, ${this.life})`);
        gradient.addColorStop(0.4, `rgba(${this.color}, ${this.life * 0.6})`);
        gradient.addColorStop(1, `rgba(${this.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function createNeonExplosion(side, ball_y) {
    const explosionCanvas = document.createElement('canvas');
    const gameCanvas = document.getElementById('gameCanvas');
    
    explosionCanvas.style.position = 'absolute';
    explosionCanvas.style.left = gameCanvas.offsetLeft + 'px';
    explosionCanvas.style.top = gameCanvas.offsetTop + 'px';
    explosionCanvas.width = gameCanvas.width;
    explosionCanvas.height = gameCanvas.height;
    
    document.getElementById('canvasContainer').appendChild(explosionCanvas);
    
    const ctx = explosionCanvas.getContext('2d');
    const x = side === 'left' ? 0 : explosionCanvas.width;
    const y = ball_y;

    const colors = [
        '234, 170, 231',
        '140, 40, 136', 
        '90, 15, 87',
        '175, 114, 175',
        '156, 81, 156',
    ];
    
    const particles = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = Math.random() * 4 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new NeonParticle(x, y, angle, speed, color));
    }

    function animate() {
        ctx.clearRect(0, 0, explosionCanvas.width, explosionCanvas.height);
        
        ctx.globalCompositionOperation = 'lighter';
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.update();
            if (particle.life > 0) {
                particle.draw(ctx);
            } else {
                particles.splice(i, 1);
            }
        }

        if (particles.length > 0) {
            requestAnimationFrame(animate);
        } else {
            explosionCanvas.remove();
        }
    }
    
    animate();
}
