import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';
import { redirectTo42OAuth } from '/js/user/oauth.js';
import { router } from './router.js';


let cleanupFunctions = [];

export async function init() {
	const searchButton = document.getElementById('search-button');
	const searchInput = document.getElementById('search-input');
	const searchResults = document.getElementById('search-results');
	const searchContainer = document.querySelector('.search-container');
	const friendSearchContainer = document.querySelector('.friend-search-container');
	var oauthbtn = document.getElementById('oauth-button');


	const handleLogout = async () => {
		try {
			await ensureValidToken();
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

				sessionStorage.removeItem('access_token');
				sessionStorage.removeItem('refresh_token');
				sessionStorage.removeItem('access_expires');
				sessionStorage.removeItem('refresh_expires');
				sessionStorage.clear();

				router.navigateTo('/home/');
			} else {
				console.error('Logout failed:', await response.json());
			}
		} catch (error) {
			console.error('Network error during logout:', error);
			router.navigateTo('/home/');
		}
	};

	document.getElementById('logout-button').addEventListener('click', handleLogout);

	cleanupFunctions.push(() => {
		document.getElementById('logout-button').removeEventListener('click', handleLogout);
	});

	const handleAvatarClick = () =>  router.navigateTo(`/user/profile/${sessionStorage.getItem('username')}/`);
	document.getElementById('user-avatar').addEventListener('click', handleAvatarClick);

	cleanupFunctions.push(() => {
		document.getElementById('user-avatar').removeEventListener('click', handleAvatarClick);
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
		const friendSearchContainer = document.querySelector('.friend-search-container');

	} else {
		const bottomBtns = document.getElementById('bottom-buttons')

		const gamebtn = document.getElementById('Game-button');
		const gamblingbtn = document.getElementById('gambling-button');
		const historybtn = document.getElementById('history-button');
		const logoutbtn = document.getElementById('logout-button');
		const friendsbtn = document.getElementById('friend-button');
		const avatarImg = document.getElementById('user-avatar');
		const userInfo = document.querySelector('.user-info');

		userInfo.style.display = 'none';
		searchButton.style.display = 'none';
		searchInput.style.display = 'none';
		searchResults.style.display = 'none';
		bottomBtns.style.display = 'none';

		gamebtn.style.display = 'none';
		gamblingbtn.style.display = 'none';
		historybtn.style.display = 'none';
		logoutbtn.style.display = 'none';

		friendsbtn.style.display = 'none';
		avatarImg.style.display = 'none';
		searchContainer.style.display = 'none';
		friendSearchContainer.style.display = 'none';

		console.error('Error while fetching informations :', response);
	}

	const search_button = async () => {
		const userName = searchInput.value.trim();

		if (userName) {
			router.navigateTo(`/user/profile/${userName}`);
		} else {
			searchResults.textContent = 'Please enter a username.';
		}
	};

	searchButton.addEventListener('click', search_button);

	cleanupFunctions.push(() => {
		searchButton.removeEventListener('click', search_button);
	});

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			searchButton.click();
		}
	};

	searchInput.addEventListener('keypress', handleKeyPress);

	cleanupFunctions.push(() => {
		searchInput.removeEventListener('keypress', handleKeyPress);
	});

	if (oauthbtn) {
		const handleOAuthClick = (event) => {
			event.preventDefault();
			redirectTo42OAuth();
		};
		oauthbtn.addEventListener('click', handleOAuthClick);

		cleanupFunctions.push(() => {
			oauthbtn.removeEventListener('click', handleOAuthClick);
		});
	}

	return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}