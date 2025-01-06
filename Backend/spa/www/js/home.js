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
	const historybtn = document.getElementById('history-button');
	const logoutbtn = document.getElementById('logout-button');
	const editbtn = document.getElementById('edit-button');
	const pixelbtn = document.getElementById('pixel-button');

	pongbtn.style.display = 'block';
	historybtn.style.display = 'block';
	logoutbtn.style.display = 'block';
	editbtn.style.display = 'block';
	pixelbtn.style.display = 'block';
	
	loginbtn.style.display = 'none';
	registerbtn.style.display = 'none';

	const welcomemsg = document.getElementById('welcome-msg');
	welcomemsg.innerText = `Bienvenue, ${data.username} !`;

} else {
	console.error('Erreur lors de la requête de récupération des informations :', response);
}