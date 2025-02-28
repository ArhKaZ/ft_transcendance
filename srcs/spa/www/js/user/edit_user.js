import { ensureValidToken } from '/js/utils.js';

document.getElementById('userForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(this);

    try {
        const response = await fetch('/api/edit_user_api/', {
            method: 'PATCH',
			headers: {
				'Authorization' : `Bearer ${sessionStorage.getItem('access_token')}`,
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

document.getElementById('erase-button').addEventListener('click', async () => {
	console.log('Erasing...');
    // Remove the token from sessionStorage
    
    // Optional: Make a backend call to invalidate the token if needed
    const response = await fetch('/api/erase/', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        },
        credentials: 'include',
    });
    sessionStorage.removeItem('access_token');

    if (response.ok) {
        console.log('Erased successfully');
    } else {
        console.error('Error erasing:', response);
    }

    // Reload the page
    window.location.reload();
});

document.getElementById('avatar').addEventListener('change', function() {
    const fileName = this.files[0] ? this.files[0].name : "No file chosen";
    document.getElementById('file-chosen').textContent = fileName;
});

document.getElementById('return-button').addEventListener('click', () => {
    window.history.back();
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

