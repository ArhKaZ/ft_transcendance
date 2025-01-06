document.getElementById('userForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(this);

    try {
        const response = await fetch('/api/edit_user_api/', {
            method: 'PATCH',
			headers: {
				'Authorization' : `Token ${sessionStorage.getItem('token_key')}`,
			},
            body: formData,
        });

        const data = await response.json();
        
        if (response.ok) {
            displayMessage(data.message, 'success');
            setTimeout(() => window.location.href = '/home/', 2000);
        } else {
            displayMessage(data.message || 'An error occurred', 'error');
        }
    } catch (error) {
        displayMessage('A network error occurred: ' + error.message, 'error');
        console.error('Error details:', error);
    }
});

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.color = type === 'error' ? 'red' : 'green';
    } else {
        console.error('Message div not found');
    }
}

