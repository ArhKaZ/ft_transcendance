document.getElementById('userForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('password', document.getElementById('password').value);
    formData.append('description', document.getElementById('description').value);
    
    const avatarInput = document.getElementById('avatar');
    if (avatarInput.files.length > 0) {
        formData.append('avatar', avatarInput.files[0]);
    }

    try {
        const response = await fetch('/api/add_user/', {
            method: 'POST',
            body: formData,
        });

        const responseText = await response.text();
        console.log('Server response:', responseText);

        if (response.ok) {
            try {
                const data = JSON.parse(responseText);
                window.location.href = '/home';
            } catch (parseError) {
                displayMessage('JSON parsing error: ' + parseError.message, 'error');
                console.error('Response content:', responseText);
            }
        } else {
            displayMessage('HTTP error: ' + response.status + ' ' + response.statusText, 'error');
            console.error('Error response content:', responseText);
        }
    } catch (error) {
        displayMessage('A network error occurred: ' + error.message, 'error');
        console.error('Error details:', error);
    }
});

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = message;
    messageDiv.style.color = type === 'error' ? 'red' : 'green';
}