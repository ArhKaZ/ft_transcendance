import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

document.getElementById('logout-button').addEventListener('click', async () => {
	console.log('Logging out...');
    // Remove the token from sessionStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('access_expires');
    localStorage.removeItem('refresh_expires');
    sessionStorage.removeItem('username');

    // Optional: Make a backend call to invalidate the token if needed
	await ensureValidToken();
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
    window.location.href = "/home/";
});

document.getElementById('return-button').addEventListener('click', () => {
    window.location.href = "/home/";
});

document.getElementById('user-avatar').addEventListener('click', () => {
    window.location.href = "/user/edit_user/";
});

await ensureValidToken();
const response = await fetch('/api/get-my-info/', {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
		'X-CSRFToken': getCSRFToken(),
		'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
	},
	credentials: 'include',
});

if (response.ok) {
	const data = await response.json();
	console.log(data);

	const bottomBtns = document.getElementById('bottom-buttons');

	const welcomemsg = document.getElementById('welcome-msg');
	const avatarImg = document.getElementById('user-avatar');
	avatarImg.src = data.avatar;
	avatarImg.alt = 'avatar';
	const lps = document.getElementById('lps');
	lps.innerText += data.ligue_points;
} else {
	const bottomBtns = document.getElementById('bottom-buttons')
	const logoutbtn = document.getElementById('logout-button');
	const avatarImg = document.getElementById('user-avatar');
    const tournamentbtn = document.getElementById('tournament-button');

	bottomBtns.style.display = 'none';
	localbtn.style.display = 'none';
    userInfo.style.display = 'none';
	pongbtn.style.display = 'none';
	historybtn.style.display = 'none';
	logoutbtn.style.display = 'none';
	editbtn.style.display = 'none';
	pixelbtn.style.display = 'none';
	friendsbtn.style.display = 'none';
	avatarImg.style.display = 'none';
	
	console.error('Erreur lors de la requête de récupération des informations :', response);
}