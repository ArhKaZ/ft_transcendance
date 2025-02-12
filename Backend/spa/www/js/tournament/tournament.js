document.getElementById('userForm'),addEventListener('submit', async function(event) {
	const tournamentCode = document.getElementById('tournament_code');

	try {
		const response = await fetch('/api/join_tournament/', {
			method: 'GET',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
			}
		});
		if (response.ok) {
			const data = await response.json();
		}

	} catch (error) {
		messageDiv.innerHTML = `<span style="color: red;">Error. Are you sure about the code ?</span>`;
	}
});

