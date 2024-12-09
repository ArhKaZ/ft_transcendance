function createSpark(x, y, direction) {
    // Créer une étincelle
    const spark = document.createElement('div');
    spark.classList.add('spark');

    // Positionner l'étincelle
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;

    // Calculer la direction et la dispersion des étincelles
    const angle = direction === 'left' ? Math.random() * -90 : Math.random() * 90;
    const distance = Math.random() * 100 + 50; // Distance de dispersion aléatoire

    // Calculer le mouvement de l'étincelle
    const moveX = Math.cos(angle * Math.PI / 180) * distance;
    const moveY = Math.sin(angle * Math.PI / 180) * distance;

    // Ajouter les variables de mouvement à l'animation
    spark.style.setProperty('--move-x', `${moveX}px`);
    spark.style.setProperty('--move-y', `${moveY}px`);

    // Ajouter l'étincelle au conteneur
    document.getElementById('sparks-container').appendChild(spark);

    // Supprimer l'étincelle après l'animation
    setTimeout(() => {
        spark.remove();
    }, 500); // Le temps d'animation est de 500ms
}

export function triggerSparks(pointSide) {
    const canvas = document.getElementById('gameCanvas');
    const x = pointSide === 'left' ? 100 : canvas.width - 100;
    const y = canvas.height / 2;

    // Créer des étincelles du côté où le point est marqué
    for (let i = 0; i < 10; i++) {
        createSpark(x, y, pointSide);
    }
}