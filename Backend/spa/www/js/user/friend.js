import { getCSRFToken } from '/static/utils.js';

const divFriends = document.getElementById("Friends");

var addbtn = document.getElementById('add-button');

if (addbtn) {
	addbtn.addEventListener('click', async function (event) {
		event.preventDefault();
		console.log('clicked');
		await addFriend();
	});
}

async function fetchFriends() {
	console.log("fetching friends");
	try {
		const response = await fetch('/api/get_friends/', {
			method: 'GET',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
			}
		});

		if (response.ok) {
			const data = await response.json(); // Assuming this is your JSON response
			const friendmsg = document.getElementById('friend-msg');

			// Extract usernames from the array
			const usernames = data.map(item => item.username).join(', ');

			// Display the usernames in the message
			friendmsg.innerText = `Friends: ${usernames} !`;

			console.log("get friends call worked");
		} else {
			console.log("Erreur lors de la récupération de la liste d'amis :", response.status);
		}
	}
	catch {
		console.log("get friends call failed");
	}
}
const addmsg = document.getElementById('add-friend-msg');

async function addFriend() {
	console.log(document.getElementById('friend_name').value);
	try {
		const response = await fetch('/api/add_friend/', {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
			},
			body: JSON.stringify({
				'friend_name': document.getElementById('friend_name').value,
			})
		});

		if (response.ok) {
			console.log("add friend call worked");
			console.log(response);
			window.location.reload();
		} else {
			// Error handling for failed response
			addmsg.innerText = `Erreur lors de l'ajout d'un ami: ${response.status}`;
		}
	} catch (error) {
		// Error handling for fetch/network errors
		addmsg.innerText = `Erreur lors de l'ajout d'un ami: ${error.message}`;
		console.log("add friend call failed", error);
	}
}

async function fetchPendingFriend() {
	console.log("fetching pending friends");
	try {
		const response = await fetch('/api/get_pending_friends/', {
			method: 'GET',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
			}
		});

		if (response.ok) {
			const data = await response.json(); // Assuming this is your JSON response
			const pendingmsg = document.getElementById('pending-msg');

			// Extract usernames from the array
			const usernames = data.map(item => item.username).join(', ');

			// Display the usernames in the message
			pendingmsg.innerText = `Pending friends: ${usernames} !`;

			console.log("get pending friends call worked");
		} else {
			console.log("Erreur lors de la récupération de la liste d'amis en attente :", response.status);
		}
	}
	catch {
		console.log("get pending friends call failed");
	}
}

// async function deleteFriend(friend_name) {
// 	console.log(friend_name);
// 	try {
// 		const response = await fetch('/api/delete_friend/', {
// 			method: 'POST',
// 			headers: {
// 				'Content-type': 'application/json',
// 				'X-CSRFToken': getCSRFToken(),
// 				'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
// 			},
// 			body: JSON.stringify({
// 				'friend_name': friend_name,
// 			})
// 		});

// 		if (response.ok) {
// 			console.log("delete friend call worked");
// 			window.location.reload();
// 		} else {
// 			// Error handling for failed response
// 			console.log(`Erreur lors de la suppression d'un ami: ${response.status}`);
// 		}
// 	} catch (error) {
// 		// Error handling for fetch/network errors
// 		console.log(`Erreur lors de la suppression d'un ami: ${error.message}`);
// 		console.log("delete friend call failed", error);
// 	}
// }

fetchPendingFriend();
fetchFriends();

// document.getElementById('add_friend').addEventListener('click', addFriend);

