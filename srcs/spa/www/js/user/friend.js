import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

const divFriends = document.getElementById("Friends");
var addbtn = document.getElementById('add-button');

if (addbtn) {
    addbtn.addEventListener('click', async function (event) {
        event.preventDefault();
        console.log('clicked');
        await addFriend();
    });
}

document.getElementById('logout-button').addEventListener('click', async () => {
    console.log('Logging out...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('access_expires');
    localStorage.removeItem('refresh_expires');
    sessionStorage.removeItem('username');
    
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
    console.log("return click");
    window.history.back();
});

async function fetchFriends() {
    console.log("fetching friends");
    try {
        const response = await fetch('/api/get_friends/', {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            }
        });

        if (response.ok) {
            const data = await response.json();
            const friendmsg = document.getElementById('friend-msg');
            const usernames = data.map(item => item.username).join(', ');
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
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
                'friend_name': document.getElementById('friend_name').value,
            })
        });

        if (response.ok) {
            console.log("add friend call worked");
            window.location.reload();
        } else {
            const data = await response.json();
            const errorMessage = data.error || `Erreur lors de l'ajout d'un ami : ${response.status}`;
            displayAddFriendError(errorMessage);
        }
    } catch (error) {
        displayAddFriendError(`Erreur lors de l'ajout d'un ami: ${error.message}`);
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
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            }
        });
        if (response.ok) {
            const data = await response.json();
            const pendingmsg = document.getElementById('pending-msg');
            const usernames = data.map(item => item.username).join(', ');
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

function displayAddFriendError(message) {
    const addmsg = document.getElementById('add-friend-msg');
    addmsg.innerText = message;
    addmsg.style.display = "block";
    addmsg.style.color = "red";
}

fetchPendingFriend();
fetchFriends();

window.addEventListener('DOMContentLoaded', () => {
    const addmsg = document.getElementById('add-friend-msg');
    const errorMsg = sessionStorage.getItem('friend_error_msg');

    if (errorMsg && addmsg) {
        addmsg.innerText = errorMsg;
        addmsg.style.display = "block";
        addmsg.style.color = "red";
        sessionStorage.removeItem('friend_error_msg');
    }
});