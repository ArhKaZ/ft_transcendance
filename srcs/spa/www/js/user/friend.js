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
            
            window.location.href = '/home/';
        } else {
            console.error('Logout failed:', await response.json());
        }
    } catch (error) {
        console.error('Network error during logout:', error);
        window.location.href = '/home/';
    }
});

document.getElementById('return-button').addEventListener('click', () => {
    console.log("return click");
    window.history.back();
});

async function fetchFriends() {
    console.log("fetching friends");
    try {
        await ensureValidToken();
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
            const friendsList = document.getElementById('friends-list');
            friendsList.innerHTML = '';

            data.forEach(friend => {
                const friendCard = document.createElement('div');
                friendCard.classList.add('friend-card');

                friendCard.addEventListener('click', () => {
                    window.location.href = `/user/profile/${friend.username}/`;
                });

                const avatar = document.createElement('img');
                avatar.src = friend.avatar || '/avatars/default.png';
                avatar.alt = 'Avatar';
                avatar.classList.add('friend-avatar');

                const friendInfo = document.createElement('div');
                friendInfo.classList.add('friend-info');

                const friendName = document.createElement('span');
                friendName.classList.add('friend-name');
                friendName.textContent = friend.username;


                const statusIndicator = document.createElement('div');
                statusIndicator.classList.add('status-indicator');
                statusIndicator.classList.add('offline');
                

                statusIndicator.dataset.username = friend.username;

                friendInfo.appendChild(friendName);
                friendCard.appendChild(avatar);
                friendCard.appendChild(friendInfo);
                friendCard.appendChild(statusIndicator);
                friendsList.appendChild(friendCard);
                
                updateFriendStatus(friend.username);
            });

            console.log("get friends call worked");
        } else {
            console.log("Erreur lors de la récupération de la liste d'amis :", response.status);
        }
    } catch (error) {
        console.log("get friends call failed", error);
    }
}


async function updateFriendStatus(username) {
    try {
        await ensureValidToken();
        const response = await fetch(`/api/check-online/${username}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const isOnline = data.is_online;
            console.log(`${username} is ${isOnline ? 'online' : 'offline'}`);
            
            const statusIndicators = document.querySelectorAll(`.status-indicator[data-username="${username}"]`);
            
            statusIndicators.forEach(indicator => {
                indicator.classList.remove('online', 'offline');
                indicator.classList.add(isOnline ? 'online' : 'offline');
            });
        }
    } catch (error) {
        console.error('Error checking user status:', error);
    }
}

const addmsg = document.getElementById('add-friend-msg');

async function addFriend() {
    const friendName = document.getElementById('friend_name').value;
    console.log(friendName);
    try {
        await ensureValidToken();
        const response = await fetch('/api/add_friend/', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
                'friend_name': friendName,
            })
        });

        if (response.ok) {
            console.log(`Friend request to ${friendName} sent`);
            window.location.reload();
        } else {
            // Check content type before parsing
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                const errorMessage = data.error || `Erreur lors de l'ajout d'un ami : ${response.status}`;
                displayAddFriendError(errorMessage);
            } else {
                // Handle non-JSON response
                const textResponse = await response.text();
                displayAddFriendError(`Server returned an invalid response. Status: ${response.status}`);
                console.error("Non-JSON response:", textResponse.substring(0, 100)); // Log the first 100 chars
            }
        }
    } catch (error) {
        displayAddFriendError(`Erreur lors de l'ajout d'un ami: ${error.message}`);
        console.log("add friend call failed", error);
    }
}

async function fetchPendingFriend() {
    console.log("fetching pending friends");
    try {
        await ensureValidToken();
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
            
            // Create the pending-msg element if it doesn't exist
            let pendingmsg = document.getElementById('pending-msg');
            if (!pendingmsg) {
                pendingmsg = document.createElement('h2');
                pendingmsg.id = 'pending-msg';
                const pendingList = document.getElementById('pending-list');
                pendingList.parentNode.insertBefore(pendingmsg, pendingList);
            }
            
            // Set the header text
            pendingmsg.innerText = data.length > 0 ? "Pending Friend Requests" : "No pending friend requests";
            
            // Get the container for pending friends
            const pendingList = document.getElementById('pending-list');
            pendingList.innerHTML = '';
            
            // Create cards for each pending friend
            data.forEach(friend => {
                const friendCard = document.createElement('div');
                friendCard.classList.add('friend-card');
            
                // Redirect to profile on click
                friendCard.addEventListener('click', () => {
                    window.location.href = `/user/profile/${friend.username}/`;
                });
            
                const avatar = document.createElement('img');
                avatar.src = friend.avatar || '/avatars/default.png';
                avatar.alt = 'Avatar';
                avatar.classList.add('friend-avatar');
            
                const friendInfo = document.createElement('div');
                friendInfo.classList.add('friend-info');
            
                const friendName = document.createElement('span');
                friendName.classList.add('friend-name');
                friendName.textContent = friend.username;
            
                // Create accept button (which now sends a new request)
                const acceptButton = document.createElement('button');
                acceptButton.textContent = "Accept";
                acceptButton.classList.add('accept-button');
                acceptButton.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevent card click from triggering
                    sendFriendRequestToPendingUser(friend.username);
                });
            
                // Create status indicator
                const statusIndicator = document.createElement('div');
                statusIndicator.classList.add('status-indicator');
                statusIndicator.classList.add('offline');
                statusIndicator.dataset.username = friend.username;
            
                // Append everything to the card
                friendInfo.appendChild(friendName);
                friendCard.appendChild(avatar);
                friendCard.appendChild(friendInfo);
                friendCard.appendChild(acceptButton);
                friendCard.appendChild(statusIndicator);
                pendingList.appendChild(friendCard);
            
                // Update status indicator
                updateFriendStatus(friend.username);
            });
            
            console.log("get pending friends call worked");
        } else {
            console.log("Erreur lors de la récupération de la liste d'amis en attente :", response.status);
        }
    } catch (error) {
        console.log("get pending friends call failed", error);
    }
}

// Function to accept a friend request
async function sendFriendRequestToPendingUser(username) {
    try {
        await ensureValidToken();
        const response = await fetch('/api/add_friend/', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
                'friend_name': username,  // Send a new friend request
            })
        });

        if (response.ok) {
            console.log(`Friend request sent to ${username}`);
            window.location.reload(); // Refresh to update UI
        } else {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                displayAddFriendError(data.error || `Error sending friend request: ${response.status}`);
            } else {
                const textResponse = await response.text();
                displayAddFriendError(`Server returned an invalid response. Status: ${response.status}`);
                console.error("Non-JSON response:", textResponse.substring(0, 100));
            }
        }
    } catch (error) {
        displayAddFriendError(`Error sending friend request: ${error.message}`);
        console.log("Friend request sending failed", error);
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