import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';
import { boolUserLog } from "../utils.js";

let cleanupFunctions = [];

export async function init() {
	if (await boolUserLog() === true) {
		router.navigateTo('/home/');
		return ;
	}
    const loginbtn = document.getElementById('login-button');
    const returnButton = document.getElementById('return-button');

    const handleLogin = async (event) => {
        event.preventDefault();
        await loginUser();
    };

    const handleReturn = () => {
        router.navigateTo('/home/');
    };

    if (loginbtn) {
        loginbtn.addEventListener('click', handleLogin);
        cleanupFunctions.push(() => loginbtn.removeEventListener('click', handleLogin));
    }

    if (returnButton) {
        returnButton.addEventListener('click', handleReturn);
        cleanupFunctions.push(() => returnButton.removeEventListener('click', handleReturn));
    }

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}

export async function loginUser() {
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
			const data = await response.json();
			sessionStorage.setItem('access_token', data.access_token);
			sessionStorage.setItem('refresh_token', data.refresh_token);
			sessionStorage.setItem('access_expires', data.access_expires);
			sessionStorage.setItem('refresh_expires', data.refresh_expires);
			sessionStorage.setItem('username', username);
			sessionStorage.setItem('is_oauth', false);
			messageDiv.innerHTML = '<span style="color: green;">Login successful. Redirecting...</span>';
			setTimeout(() => {
				router.navigateTo('/home/');
			}, 1000);
		} else {
			const data = await response.json();
			messageDiv.innerHTML = `<span style="color: red;">Error : ${data.error || 'Invalid credentials.'}</span>`;
		}
	} catch (error) {

		messageDiv.innerHTML = `<span style="color: red;">An error happened during login attempt. Please try again later.</span>`;
		console.error('Error during login request:', error);
	};
}
