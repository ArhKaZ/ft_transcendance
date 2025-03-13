import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

const divFriends = document.getElementById("Friends");


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
    window.history.back();
});

async function fetchFriends() {
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

        } else {
            console.error("Error while trying to fetch friendlist :", response.status);
        }
    } catch (error) {
        console.error("fetchFriends call failed", error);
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
            window.location.reload();
        } else {
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                const errorMessage = data.error || `Error while adding a friend: ${response.status}`;
                displayAddFriendError(errorMessage);
            } else {
                
                const textResponse = await response.text();
                displayAddFriendError(`Server returned an invalid response. Status: ${response.status}`);
                console.error("Non-JSON response:", textResponse.substring(0, 100)); 
            }
        }
    } catch (error) {
        displayAddFriendError(`Error while adding a friend: ${error.message}`);
    }
}

async function fetchPendingFriend() {
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
            
            
            let pendingmsg = document.getElementById('pending-msg');
            if (!pendingmsg) {
                pendingmsg = document.createElement('h2');
                pendingmsg.id = 'pending-msg';
                const pendingList = document.getElementById('pending-list');
                pendingList.parentNode.insertBefore(pendingmsg, pendingList);
            }
            
            
            pendingmsg.innerText = data.length > 0 ? "Pending Friend Requests" : "No pending friend requests";
            
            
            const pendingList = document.getElementById('pending-list');
            pendingList.innerHTML = '';
            
            
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
            
                
                const acceptButton = document.createElement('button');
                acceptButton.textContent = "Accept";
                acceptButton.classList.add('accept-button');
                acceptButton.addEventListener('click', (event) => {
                    event.stopPropagation(); 
                    sendFriendRequestToPendingUser(friend.username);
                });
            
                
                const statusIndicator = document.createElement('div');
                statusIndicator.classList.add('status-indicator');
                statusIndicator.classList.add('offline');
                statusIndicator.dataset.username = friend.username;
            
                
                friendInfo.appendChild(friendName);
                friendCard.appendChild(avatar);
                friendCard.appendChild(friendInfo);
                friendCard.appendChild(acceptButton);
                friendCard.appendChild(statusIndicator);
                pendingList.appendChild(friendCard);
            
                
                updateFriendStatus(friend.username);
            });
            
        } else {
            console.error("Error while fetching pending friendlist :", response.status);
        }
    } catch (error) {
        console.error("fetchPendingFriends call failed", error);
    }
}


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
                'friend_name': username,  
            })
        });

        if (response.ok) {
            window.location.reload(); 
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
        console.error("Friend request sending failed", error);
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