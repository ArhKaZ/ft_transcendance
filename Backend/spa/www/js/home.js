import { getCSRFToken } from '/js/utils.js';

document.getElementById('logout-button').addEventListener('click', async () => {
	console.log('Logging out...');
    // Remove the token from sessionStorage
    sessionStorage.removeItem('token_key');

    // Optional: Make a backend call to invalidate the token if needed
    const response = await fetch('/api/logout/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
        },
        credentials: 'include',
    });

    if (response.ok) {
        console.log('Logged out successfully');
    } else {
        console.error('Error logging out:', response);
    }

    // Reload the page
    window.location.reload();
});


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


	loginbtn.style.display = 'none';
	registerbtn.style.display = 'none';

	const welcomemsg = document.getElementById('welcome-msg');
	welcomemsg.innerText = `Bienvenue, ${data.username} !`;
	const avatarImg = document.getElementById('user-avatar');
	avatarImg.src = data.avatar;
	avatarImg.alt = 'avatar';
} else {
	const localbtn = document.getElementById('local-button');
	const pongbtn = document.getElementById('pong-button');
	const historybtn = document.getElementById('history-button');
	const logoutbtn = document.getElementById('logout-button');
	const editbtn = document.getElementById('edit-button');
	const pixelbtn = document.getElementById('pixel-button');
	const friendsbtn = document.getElementById('friend-button');
	const avatarImg = document.getElementById('user-avatar');

	localbtn.style.display = 'none';
	pongbtn.style.display = 'none';
	historybtn.style.display = 'none';
	logoutbtn.style.display = 'none';
	editbtn.style.display = 'none';
	pixelbtn.style.display = 'none';
	friendsbtn.style.display = 'none';
	avatarImg.style.display = 'none';
	
	console.error('Erreur lors de la requête de récupération des informations :', response);
}