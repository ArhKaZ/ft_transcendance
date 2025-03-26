import { loginUser } from "./login_user.js";
import { router } from '../router.js';

document.getElementById('userForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('password', document.getElementById('password').value);
    formData.append('description', document.getElementById('description').value);
	if (!document.getElementById('pseudo').value) {
		formData.append('pseudo', document.getElementById('username').value);
	}
	else {
		formData.append('pseudo', document.getElementById('pseudo').value);
	}

    const avatarInput = document.getElementById('avatar');
    if (avatarInput.files.length > 0) {
        formData.append('avatar', avatarInput.files[0]);
    }

    try {
        const response = await fetch('/api/add_user/', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            loginUser();
        } else {
            const data = await response.json();
            let errorMessage = 'An error occurred';
            if (data.error) {
                const cleanError = data.error
                    .replace(/duplicate key value violates unique constraint "[^"]+"\n/, '')
                    .replace(/DETAIL: /, '')
                    .replace(/Key \((.+?)\)=\((.+?)\)/, '$1 "$2"')
                    .replace(/\\n/g, ' ');
                errorMessage = `Error: ${cleanError}`;
            } else {
                const errorParts = Object.entries(data).map(
                    ([field, messages]) => `${field
                        .replace('username', 'Username')
                        .replace('password', 'Password')
                        .replace('description', 'Description')
                        .replace('pseudo', 'Tournament pseudo')}: ${messages[0]}`
                );
                errorMessage = errorParts.length > 0 
                    ? `Error:<br>${errorParts.join('<br>')}`
                    : 'Unknown error occurred';
            }
        displayMessage(errorMessage, 'error');
        }
    } catch (error) {
        const message = error instanceof SyntaxError 
            ? 'Invalid server response format' 
            : 'Network error occurred';
        displayMessage(message, 'error');
        console.error('Error details:', error);
    }
});

document.getElementById('return-button').addEventListener('click', () => {
    router.navigateTo('/home/');
});

document.getElementById('avatar').addEventListener('change', function() {
    const fileName = this.files[0] ? this.files[0].name : "No file chosen";
    document.getElementById('file-chosen').textContent = `[${fileName}]`;
});

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = message;
    messageDiv.style.color = type === 'error' ? 'red' : 'green';
}