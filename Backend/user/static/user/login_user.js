document.getElementById('userForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const userData = {
        username: username,
        password: password,
    };

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    try {
        const response = await fetch('/api/login/', {
            method: 'POST',
            body: JSON.stringify(userData),
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log('Réponse brute du serveur:', responseText);

        if (response.ok) {
            try {
                const data = JSON.parse(responseText);
                
                // Enregistrer le token dans localStorage
                localStorage.setItem('authToken', data.token);

                displayMessage('Connexion réussie. Redirection en cours...', 'success');

                // Redirection vers la page protégée
                await accessLoggedPage();

            } catch (parseError) {
                displayMessage('Erreur de parsing JSON : ' + parseError.message, 'error');
                console.error('Contenu de la réponse:', responseText);
            }
        } else {
            displayMessage('Erreur HTTP : ' + response.status + ' ' + response.statusText, 'error');
            console.error('Contenu de la réponse d\'erreur:', responseText);
        }
    } catch (error) {
        displayMessage('Une erreur réseau s\'est produite : ' + error.message, 'error');
        console.error('Détails de l\'erreur:', error);
    }
});

async function accessLoggedPage() {
    const token = localStorage.getItem('authToken');

    if (!token) {
        displayMessage('Vous devez être connecté pour accéder à cette page.', 'error');
        return;
    }

    try {
        const response = await fetch('/logged/', {
            method: 'GET',
            headers: {
                'Authorization': 'Token ' + token,  // Ajouter le token ici
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Données de la page:', data);
            // Afficher les données reçues ou rediriger l'utilisateur
            window.location.href = '/logged'; // Redirection après avoir accédé à la page avec succès
        } else {
            displayMessage('Erreur HTTP : ' + response.status + ' ' + response.statusText, 'error');
        }
    } catch (error) {
        displayMessage('Une erreur réseau s\'est produite : ' + error.message, 'error');
        console.error('Détails de l\'erreur:', error);
    }
}

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = message;
    messageDiv.style.color = type === 'error' ? 'red' : 'green';
}
