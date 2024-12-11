document.querySelector('button[type="Invite"]').addEventListener('click', function() {
    const username = document.getElementById('username').value;

    if (!username) {
        alert('Please enter a username!');
        return;
    }

    // Prepare the data to be sent
    const data = {
        username: username,
    };

    // Send the POST request to the API
    fetch('/api/invite_friend/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`, // Include the JWT token from cookies
        },
		body: JSON.stringify(data),
    })
    if (response.ok) {
		console.log("Invitation send");
		messageDiv.innerHTML = '<span style="color: green;">Invitation sent</span>';
        setTimeout(() => {
            window.location.href = "/logged/";
        }, 1000);
	}
	else {
		console.log("Error, Invitation not send");
		messageDiv.innerHTML = '<span style="color: red;">Invitation not sent, try with an existing pseudo</span>';
	}
});
