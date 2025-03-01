import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

var loginbtn = document.getElementById('login-button');

if (loginbtn) {
	loginbtn.addEventListener('click', async function (event) {
		event.preventDefault();
		console.log('clicked');
		await loginUser();
	});
}

document.getElementById('return-button').addEventListener('click', () => {
    window.location.href = "/home/";
});

async function loginUser() {
	const form = document.getElementById('userForm');
	const messageDiv = document.getElementById('message');

	const username = document.getElementById('username').value;
	const password = document.getElementById('password').value;

	try {
		const response = await fetch('/api/login/', {
			method: 'POST', 
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
			},
			body: JSON.stringify({
				username: username,
				password: password,
			}),
			credentials: 'include',
		});

		if (response.ok) {
			console.log('before');
			const data = await response.json();
			console.log('after');
			sessionStorage.setItem('access_token', data.access_token);
    		sessionStorage.setItem('refresh_token', data.refresh_token);
    		sessionStorage.setItem('access_expires', data.access_expires);
    		sessionStorage.setItem('refresh_expires', data.refresh_expires);
			sessionStorage.setItem('username', username);
			messageDiv.innerHTML = '<span style="color: green;">Connexion réussie. Redirection en cours...</span>';
			setTimeout(() => {
				window.location.href = "/home/";
			}, 1000);
		} else {
			const data = await response.json();
			messageDiv.innerHTML = `<span style="color: red;">Erreur : ${data.error || 'Identifiants incorrects.'}</span>`;
		}
	} catch (error) {

		messageDiv.innerHTML = `<span style="color: red;">Une erreur s'est produite lors de la connexion. Veuillez réessayer plus tard.</span>`;
		console.error('Erreur lors de la requête de connexion :', error);
	};
}

