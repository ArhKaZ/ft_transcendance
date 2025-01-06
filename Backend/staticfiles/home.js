import { getCSRFToken } from '/static/utils.js';

const response = await fetch('/api/get-my-info/', {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
		'X-CSRFToken': getCSRFToken(),
		'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
	},
	credentials: 'include',
});

if (response.ok) {
	const data = await response.json();
	console.log(data);
	const loginbtn = document.getElementById('login-button');
	const registerbtn = document.getElementById('register-button');
	const pongbtn = document.getElementById('pong-button');
	pongbtn.style.display = 'none';
	loginbtn.style.display = 'none';
	registerbtn.style.display = 'block';
	const welcomemsg = document.getElementById('welcome-msg');
	welcomemsg.innerText = `Bienvenue, ${data.username} !`;

} else {
	console.error('Erreur lors de la requête de récupération des informations :', response);
}