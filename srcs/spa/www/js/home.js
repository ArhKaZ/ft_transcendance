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

document.getElementById('user-avatar').addEventListener('click', () => {
    window.location.href = "/user/edit_user/";
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
	const bottomBtns = document.getElementById('bottom-buttons');


	bottomBtns.style.display = 'flex';
	loginbtn.style.display = 'none';
	registerbtn.style.display = 'none';

	const welcomemsg = document.getElementById('welcome-msg');
	welcomemsg.innerText = `Bienvenue, ${data.username} !`;
	const avatarImg = document.getElementById('user-avatar');
	avatarImg.src = data.avatar;
	avatarImg.alt = 'avatar';
	const lps = document.getElementById('lps');
	lps.innerText += data.ligue_points;
} else {
	const bottomBtns = document.getElementById('bottom-buttons')
	// const localbtn = document.getElementById('local-button');
	const gamebtn = document.getElementById('Game-button');
	const historybtn = document.getElementById('history-button');
	const logoutbtn = document.getElementById('logout-button');

	// const editbtn = document.getElementById('edit-button');
	// const pixelbtn = document.getElementById('pixel-button');


	const friendsbtn = document.getElementById('friend-button');
	const avatarImg = document.getElementById('user-avatar');

	const userInfo = document.querySelector('.user-info');
    userInfo.style.display = 'none';
	bottomBtns.style.display = 'none';
	// localbtn.style.display = 'none';
	gamebtn.style.display = 'none';
	historybtn.style.display = 'none';
	logoutbtn.style.display = 'none';

	friendsbtn.style.display = 'none';
	avatarImg.style.display = 'none';

	
	console.error('Erreur lors de la requête de récupération des informations :', response);
}