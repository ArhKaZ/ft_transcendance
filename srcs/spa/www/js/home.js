import { getCSRFToken } from '/js/utils.js';
import { redirectTo42OAuth } from '/js/user/oauth.js';
import { handle42OAuthCallback } from '/js/user/oauth.js';

const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
var oauthbtn = document.getElementById('oauth-button');

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
	const oauthbtn = document.getElementById('oauth-button');



	bottomBtns.style.display = 'flex';
	loginbtn.style.display = 'none';
	registerbtn.style.display = 'none';
	oauthbtn.style.display = 'none';

	const welcomemsg = document.getElementById('welcome-msg');
	welcomemsg.innerText = `Welcome, ${data.username} !`;
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
	const oauthbtn = document.getElementById('oauth-button');


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

	
	console.error('Erreur lors de la requête de récupération des informations :', response);
}



searchButton.addEventListener('click', async () => {
    const userName = searchInput.value.trim(); // Get the username from the input

    if (userName) {
        // Navigate to the user profile page
        window.location.href = `/user/profile/${userName}`;
    } else {
        searchResults.textContent = 'Please enter a username.'; // Show an error message
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchButton.click(); // Trigger the search button click
    }
});

if (oauthbtn) {
	oauthbtn.addEventListener('click', async function (event) {
		event.preventDefault();
		console.log('clicked');
		redirectTo42OAuth();
	});
}