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
			window.location.reload();
		} else {
			console.log("Erreur lors de l'ajout d'un ami :", response.status);
		}
	}
	catch {
		console.log("add friend call failed");
	}
}

fetchFriends();

// document.getElementById('add_friend').addEventListener('click', addFriend);

