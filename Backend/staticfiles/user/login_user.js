import { getCSRFToken } from '/utils.js';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('userForm');
    const messageDiv = document.getElementById('message');
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                }),
                credentials: 'include',
            });

            if (response.ok) {
				console.log('before');
				const data = await response.json();
				console.log('after');
				sessionStorage.setItem('token_key', data.token_key);
                // Si la réponse est réussie, rediriger vers la page protégée
                messageDiv.innerHTML = '<span style="color: green;">Connexion réussie. Redirection en cours...</span>';
                // setTimeout(() => {
                //     window.location.href = "/logged/";  // Redirection vers la page protégée
                // }, 1000);
				// ca c'est sur c'est a changer
            } else {
                // Si la réponse échoue, afficher le message d'erreur
                const data = await response.json();
                messageDiv.innerHTML = `<span style="color: red;">Erreur : ${data.error || 'Identifiants incorrects.'}</span>`;
            }
        } catch (error) {
            // En cas d'erreur réseau ou autre, afficher un message générique
            messageDiv.innerHTML = `<span style="color: red;">Une erreur s'est produite lors de la connexion. Veuillez réessayer plus tard.</span>`;
            console.error('Erreur lors de la requête de connexion :', error);
        }
    });
});
