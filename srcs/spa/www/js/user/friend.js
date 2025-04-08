import { getCSRFToken, ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';

let cleanupFunctions = [];

const handleAddFriend = async (friend) => {
    await addFriend(friend.username);
};

export async function init() {
    try {
        await Promise.all([
            loadFriendsList(),
            loadPendingFriends()
        ]);
        
        displayStoredErrorMessages();
    } catch (error) {
        console.error("Initialization error:", error);
        displayError("Failed to load friends data");
    }

    const logoutButton = document.getElementById('logout-button');
    const returnButton = document.getElementById('return-button');
    const friendsList = document.getElementById('friends-list');
    const pendingList = document.getElementById('pending-list');

    const handleLogout = async () => {
        await performLogout();
    };

    const handleReturn = () => {
        window.history.back();
    };

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
        cleanupFunctions.push(() => logoutButton.removeEventListener('click', handleLogout));
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

async function loadFriendsList() {
    try {
        const response = await fetch('/api/get_friends/', {
            method: 'GET',
            headers: createAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            renderFriendsList(data);
            updateAllFriendsStatus(data);
        } else {
            throw new Error(`HTTP error: ${response.status}`);
        }
    } catch (error) {
        console.error("Friends list load failed:", error);
        throw error;
    }
}

function renderFriendsList(friends) {
    const friendsList = document.getElementById('friends-list');
    if (!friendsList) return;

    friendsList.innerHTML = '';

    friends.forEach(friend => {
        const friendCard = createFriendCard(friend, false);
        friendsList.appendChild(friendCard);
    });
}

async function loadPendingFriends() {
    try {
        const response = await fetch('/api/get_pending_friends/', {
            method: 'GET',
            headers: createAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            renderPendingFriends(data);
            updateAllFriendsStatus(data);
        } else {
            throw new Error(`HTTP error: ${response.status}`);
        }
    } catch (error) {
        console.error("Pending friends load failed:", error);
        throw error;
    }
}

function renderPendingFriends(pendingFriends) {
    const pendingList = document.getElementById('pending-list');
    const pendingMsg = document.getElementById('pending-msg');
    
    if (!pendingList) return;

    pendingList.innerHTML = '';

    if (!pendingMsg) {
        const newPendingMsg = document.createElement('h2');
        newPendingMsg.id = 'pending-msg';
        pendingList.parentNode.insertBefore(newPendingMsg, pendingList);
    }

    const pendingMsgElement = document.getElementById('pending-msg');
    pendingMsgElement.textContent = pendingFriends.length > 0 
        ? "Pending Friend Requests" 
        : "No pending friend requests";

    pendingFriends.forEach(friend => {
        const friendCard = createPendingFriendCard(friend);
        pendingList.appendChild(friendCard);
    });
}

function createFriendCard(friend, pending) {
    const card = document.createElement('div');
    card.classList.add('friend-card');

    card.addEventListener('click', () => {
        router.navigateTo(`/user/profile/${friend.username}/`);
    });

    const avatar = document.createElement('img');
    avatar.src = friend.avatar || '/avatars/default.png';
    avatar.alt = 'Avatar';
    avatar.classList.add('friend-avatar');

    const info = document.createElement('div');
    info.classList.add('friend-info');

    const name = document.createElement('span');
    name.classList.add('friend-name');
    name.textContent = friend.username;

    info.appendChild(name);
    
    if (!pending && (friend.game_mode || friend.is_in_tournament)) {
        const gameStatus = document.createElement('span');
        gameStatus.classList.add('friend-game-mode');
        
        if (friend.game_mode) {
            gameStatus.textContent = friend.is_waiting_for_game 
                ? 'wait for' 
                : 'in';
            gameStatus.textContent += ` ${friend.game_mode}`;
        } else {
            gameStatus.textContent = 'in Tournament';
        }
        
        info.appendChild(gameStatus);
    }

    const status = document.createElement('div');
    status.classList.add('status-indicator', 'offline');
    status.dataset.username = friend.username;

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(status);

    return card;
}

function createPendingFriendCard(friend) {
    const card = createFriendCard(friend, true);

    const acceptButton = document.createElement('button');
    acceptButton.textContent = "Accept";
    acceptButton.classList.add('accept-button');
    acceptButton.addEventListener('click',async (e) => {
        e.stopPropagation();
        handleAddFriend(friend)
    });
    card.appendChild(acceptButton);
    return card;
}

async function updateAllFriendsStatus(friends) {
    const uniqueUsernames = [...new Set(friends.map(f => f.username))];
    await Promise.all(uniqueUsernames.map(username => updateFriendStatus(username)));
}

async function updateFriendStatus(username) {
    try {
        const response = await fetch(`/api/check-online/${username}/`, {
            method: 'GET',
            headers: createAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateStatusIndicators(username, data.is_online);
        }
    } catch (error) {
        console.error('Status check failed:', error);
    }
}

function updateStatusIndicators(username, isOnline) {
    const indicators = document.querySelectorAll(`.status-indicator[data-username="${username}"]`);
    indicators.forEach(indicator => {
        indicator.classList.remove('online', 'offline');
        indicator.classList.add(isOnline ? 'online' : 'offline');
    });
}

async function addFriend(username) {
    try {
        await ensureValidToken();
        const response = await fetch('/api/add_friend/', {
            method: 'POST',
            headers: createAuthHeaders('application/json'),
            body: JSON.stringify({ friend_name: username })
        });

        if (response.ok) {
            await updateFriendStatus(username);
            router.navigateTo('/user/friend/');
        } else {
            const error = await parseResponseError(response);
            displayAddFriendError(error);
        }
    } catch (error) {
        displayAddFriendError(error.message);
    }
}

async function performLogout() {
    try {
        const response = await fetch('/api/logout/', {
            method: 'POST',
            headers: createAuthHeaders('application/json'),
            credentials: 'include'
        });

        if (response.ok) {
            clearSessionStorage();
            router.navigateTo('/home/');
        } else {
            const error = await response.json();
            console.error('Logout failed:', error);
            displayError('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        router.navigateTo('/home/');
    }
}

function createAuthHeaders(contentType = null) {
    const headers = {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
        'X-CSRFToken': getCSRFToken()
    };
    
    if (contentType) {
        headers['Content-type'] = contentType;
    }
    
    return headers;
}

async function parseResponseError(response) {
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return data.error || `Error: ${response.status}`;
        }
        return `Error: ${response.status}`;
    } catch (error) {
        return `Failed to parse error response`;
    }
}

function clearSessionStorage() {
    ['access_token', 'refresh_token', 'access_expires', 'refresh_expires'].forEach(key => {
        sessionStorage.removeItem(key);
    });
    sessionStorage.removeItem('friend_error_msg');
}

function displayAddFriendError(message) {
    const errorElement = document.getElementById('add-friend-msg');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = "block";
        errorElement.style.color = "red";
    }
}

function displayError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = "block";
    }
}

function displayStoredErrorMessages() {
    const errorMsg = sessionStorage.getItem('friend_error_msg');
    if (errorMsg) {
        displayAddFriendError(errorMsg);
        sessionStorage.removeItem('friend_error_msg');
    }
}