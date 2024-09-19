document.getElementById('userForm').addEventListener('submit', async function(event) {
    event.preventDefault();

	
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const description = document.getElementById('description').value;

    const userData = {
        username: username,
        password: password,
        description: description
    };

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    try {
        const response = await fetch('/api/add_user/', {
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
                window.location.href = '/home';
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

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = message;
    messageDiv.style.color = type === 'error' ? 'red' : 'green';
}