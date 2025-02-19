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

        const responseText = await response.text();
        console.log('Server response:', responseText);

        if (response.ok) {
            try {
                // const data = JSON.parse(response.JSON);
                window.location.href = '/home/';
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

document.getElementById('avatar').addEventListener('change', function() {
    const fileName = this.files[0] ? this.files[0].name : "No file chosen";
    document.getElementById('file-chosen').textContent = fileName;
});

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = message;
    messageDiv.style.color = type === 'error' ? 'red' : 'green';
}