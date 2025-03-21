import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

var loginbtn = document.getElementById('login-button');

if (loginbtn) {
	loginbtn.addEventListener('click', async function (event) {
		event.preventDefault();
		await loginUser();
	});
}

document.getElementById('return-button').addEventListener('click', () => {
    window.location.href = "/home/";
});

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
			messageDiv.innerHTML = '<span style="color: green;">Login successful. Redirecting...</span>';
			setTimeout(() => {
				window.location.href = "/home/";
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

