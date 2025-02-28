import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchContainer = document.querySelector('.search-container');
const friendSearchContainer = document.querySelector('.friend-search-container');


document.getElementById('logout-button').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/logout/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            },
            credentials: 'include',
        });

        if (response.ok) {
            // Clear all client-side storage
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
            sessionStorage.removeItem('access_expires');
            sessionStorage.removeItem('refresh_expires');
            sessionStorage.clear();
            
            // Redirect to login
            window.location.href = '/home/';
        } else {
            console.error('Logout failed:', await response.json());
        }
    } catch (error) {
        console.error('Network error during logout:', error);
        window.location.href = '/home/';
    }
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

	const loginbtn = document.getElementById('login-button');
	const registerbtn = document.getElementById('register-button');
	const bottomBtns = document.getElementById('bottom-buttons');


	bottomBtns.style.display = 'flex';
	loginbtn.style.display = 'none';
	registerbtn.style.display = 'none';

	const welcomemsg = document.getElementById('welcome-msg');
	welcomemsg.innerText = `Welcome, ${data.username} !`;
	const avatarImg = document.getElementById('user-avatar');
	avatarImg.src = data.avatar;
	avatarImg.alt = 'avatar';
	const lps = document.getElementById('lps');
	lps.innerText += data.ligue_points;
	const friendSearchContainer = document.querySelector('.friend-search-container');


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
	searchButton.style.display = 'none';
	searchInput.style.display = 'none';
	searchResults.style.display = 'none';
	bottomBtns.style.display = 'none';
	// localbtn.style.display = 'none';
	gamebtn.style.display = 'none';
	historybtn.style.display = 'none';
	logoutbtn.style.display = 'none';

	friendsbtn.style.display = 'none';
	avatarImg.style.display = 'none';
	searchContainer.style.display = 'none';
	friendSearchContainer.style.display = 'none';



	
	console.error('Erreur lors de la requête de récupération des informations :', response);
}



searchButton.addEventListener('click', async () => {
    const userName = searchInput.value.trim();

    if (userName) {
        window.location.href = `/user/profile/${userName}`;
    } else {
        searchResults.textContent = 'Please enter a username.';
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchButton.click();
    }
});