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
        // Effet de lueur néon
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

export function createNeonExplosion(side) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Position de départ selon le côté
    const x = side === 'left' ? 50 : canvas.width - 50;
    const y = canvas.height / 2;
    
    // Couleurs néon disponibles (format RGB)
    const colors = [
        '255, 0, 128', // Rose néon
        '0, 255, 255', // Cyan néon
        '255, 255, 0', // Jaune néon
        '0, 255, 128'  // Vert néon
    ];
    
    const particles = [];
    const particleCount = 100;

    // Création des particules
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = Math.random() * 8 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new NeonParticle(x, y, angle, speed, color));
    }

    // Fonction d'animation
    function animate() {
        // Appliquer un effet de traînée
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Mettre à jour et dessiner les particules
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.update();
            particle.draw(ctx);

            // Supprimer les particules mortes
            if (particle.life <= 0) {
                particles.splice(i, 1);
            }
        }

        // Continuer l'animation s'il reste des particules
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        }
    }

    // Démarrer l'animation
    animate();
}
