import { ensureValidToken } from '/js/utils.js';

document.getElementById('userForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(this);

    try {
        await ensureValidToken();
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
            let errorMessage = 'An error occurred';
            if (data.error) {
                const cleanError = data.error
                    .replace('[ErrorDetail(string=\'', '')
                    .replace('\', code=\'invalid\')]', '')
                errorMessage = `Error: ${cleanError}`;
            } else {
            errorMessage = `Error:<br>${data.error}`;
        }
        displayMessage(errorMessage, 'error');
        }
    } catch (error) {
        displayMessage('A network error occurred.', 'error');
        console.error('Error details:', error);
    }
});

document.getElementById('erase-button').addEventListener('click', async () => {
    try {
        await ensureValidToken();
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
        } else {
            console.error('Error erasing:', response);
        }
        window.location.reload();
    } catch (error) {
        console.error ('Error', error);
    }
});

document.getElementById('avatar').addEventListener('change', function() {
    const fileName = this.files[0] ? this.files[0].name : "No file chosen";
    document.getElementById('file-chosen').textContent = fileName;
});

document.getElementById('return-button').addEventListener('click', () => {
    window.location.href = "/home/";
});

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = message;
        messageDiv.style.color = type === 'error' ? 'red' : 'green';
    } else {
        console.error('Message div not found');
    }
}

