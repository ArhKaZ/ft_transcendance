class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.size = Math.min(canvas.width, canvas.height) * 0.01;
        this.x = 0;
        this.y = 0;
    }

    assignPos(x, y) {
        this.x = x * this.canvas.width / 100;
        this.y = y * this.canvas.height / 100;
    }

    draw(context) {
        context.shadowBlur = 20; // Intensité de l'effet lumineux
        context.shadowColor = '#8a2be2'; // Couleur violette de l'ombre
    
        // Définir la couleur de la balle
        context.fillStyle = '#8a2be2'; // Couleur violette
        context.clearRect(0,0, this.canvas.width, this.canvas.height);
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        context.fill();

        context.shadowBlur = 0;
        context.shadowColor = 'transparent';
    }
}

export default Ball;