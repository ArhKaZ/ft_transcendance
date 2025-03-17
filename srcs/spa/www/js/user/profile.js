import { getCSRFToken } from '../utils.js';
import { ensureValidToken } from '/js/utils.js';

async function isUserFriend(userName) {
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

        if (!response.ok) {
            console.error("Error while fetching friends");
            return false;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            console.error("Firends format is incorrect:", data);
            return false;
        }

        const friendNames = data.map(friend => friend.username || friend.name);

        return friendNames.includes(userName);
    } catch (error) {
        console.error("Failed fetching friends", error);
        return false;
    }
}
async function isFriendRequestPending(userName) {
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

        if (!response.ok) {
            console.error("Error while trying to fetch pending friend requests");
            return false;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            console.error("Incorrect format for pending firends:", data);
            return false;
        }

        const currentUser = sessionStorage.getItem('username');
        
        return data.some(request => request.sender === currentUser && request.receiver === userName);
    } catch (error) {
        console.error("Failed to fetch pending friend requests", error);
        return false;
    }
}



async function fetch_user() {
    const pathSegments = window.location.pathname.split('/');
    const userName = pathSegments[3];
    try {
        await ensureValidToken();
        const response = await fetch(`/api/user/profile/${userName}/`, {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
				'Authorization' : `Bearer ${sessionStorage.getItem('access_token')}`,
			}
		});
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('User not found');
            }
            throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        console.debug(data);
        document.getElementById('username').textContent = data.username;
        document.getElementById('user-pseudo').textContent = data.pseudo;
        document.getElementById('ligue-points').textContent = data.ligue_points;
        document.getElementById('user-description').textContent = data.description || "No description provided";
        document.getElementById('user-avatar').src = data.avatar || '/avatars/default.png';
        document.getElementById('user-wins').textContent = data.wins;
        document.getElementById('user-looses').textContent = data.looses;
        
        updateFriendButton(userName);

        const wins = parseInt(data.wins, 10) || 0;
        const looses = parseInt(data.looses, 10) || 0;
        let winrate = wins + looses > 0 ? (wins / (wins + looses)) * 100 : 0;

        const winrateSpan = document.getElementById('user-winrate');
        winrateSpan.textContent = `${winrate.toFixed(2)}%`;

        winrateSpan.classList.remove("green", "red");
        winrateSpan.classList.add(winrate > 49 ? "green" : "red");

        if (data.is_in_tournament || data.game_mode) {
            let profile = document.getElementById('profile-header');
            let action = document.createElement('div');
            let header = document.createElement('div');
            header.innerHTML = 'Status:';
            header.classList.add('head-text');
            action.appendChild(header);
            action.classList.add('action-section');

            let currentAction = document.createElement('span');
            let button = null;
            if (data.game_mode) {
                if (data.is_waiting_for_game) {
                    currentAction.innerText = `wait for a ${data.game_mode} game`;
                    button = document.createElement('button');
                    button.innerText = 'Join';
                } else {
                    currentAction = `playing in a ${data.game_mode} game`;
                }
            } else {
                if (!data.current_tournament.started) {
                    currentAction.innerText = `wait for ${data.code_current_tournament} tournament to start`;
                    button = document.createElement('button');
                    button.innerText = 'Join';
                } else {
                    currentAction.innerText = `playing in ${data.code_current_tournament} tournament`;
                }
            }
            action.appendChild(currentAction);
            if (button) {
                button.classList.add('buttons');
                button.id = 'join-button';
                action.appendChild(button);
            }
            profile.appendChild(action);
        }
        
    } catch (error) {
        console.error("API call failed", error);
        window.location.href = '/user_not_found/';
    }
}

async function addFriend(userName) {
    const addFriendBtn = document.getElementById('add-friend-btn');

    addFriendBtn.src = "/css/ico/friend_pending_ico.png";
    addFriendBtn.classList.add("disabled");
    addFriendBtn.onclick = null;

    sessionStorage.setItem(`friendRequest_${userName}`, "pending");

    try {
        await ensureValidToken();
        const response = await fetch('/api/add_friend/', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({ 'friend_name': userName })
        });

        if (response.ok) {
            window.location.reload();
        } else {
            const data = await response.json();
            console.error("Error while trying to add a friend :", data.error || response.status);
        }
    } catch (error) {
        console.error("Failed adding a friend", error);
    }
}

async function updateFriendButton(userName) {
    const addFriendBtn = document.getElementById('add-friend-btn');
    const currentUser = sessionStorage.getItem('username');

    if (currentUser === userName) {
        addFriendBtn.style.display = 'none';
        return;
    }

    const wasPending = sessionStorage.getItem(`friendRequest_${userName}`) === "pending";

    const isFriend = await isUserFriend(userName);
    const isPending = await isFriendRequestPending(userName);

    if (wasPending || isFriend || isPending) {
        addFriendBtn.src = isFriend ? "/css/ico/friend_added_ico.png" : "/css/ico/friend_pending_ico.png";
        addFriendBtn.classList.add("disabled");
        addFriendBtn.onclick = null;
    } else {
        addFriendBtn.src = "/css/ico/add_friend_ico.png";
        addFriendBtn.classList.remove("disabled");
        addFriendBtn.onclick = () => addFriend(userName);
    }
}

async function fetchHistory() {
    const pathSegments = window.location.pathname.split('/');
    const userName = pathSegments[3];
    try {
        await ensureValidToken();
        const response = await fetch(`/api/user/profile/get_history/${userName}/`, {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            }
        });

        if (response.ok) {
            const data = await response.json();

            const sortedData = data.reverse().slice(0, 5);

            const table = document.createElement('table');
            table.className = 'history-table';

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Mode</th>
                    <th>Results</th>
                </tr>
            `;
            table.appendChild(thead);

            
            const tbody = document.createElement('tbody');
            sortedData.forEach(item => {
                const row = document.createElement('tr');

                
                const dateCell = document.createElement('td');
                dateCell.textContent = item.date; 
                row.appendChild(dateCell);

                
                const opponentCell = document.createElement('td');
                opponentCell.textContent = item.opponent_name; 
                row.appendChild(opponentCell);

                
                const typeCell = document.createElement('td');
                typeCell.textContent = item.type; 
                row.appendChild(typeCell);

                
                const resultCell = document.createElement('td');
                resultCell.textContent = item.won ? "Won" : "Lost"; 
                row.appendChild(resultCell);

                
                tbody.appendChild(row);
            });

            
            table.appendChild(tbody);

            
            const historyDiv = document.getElementById('history');
            if (historyDiv) {
                historyDiv.innerHTML = ''; 
                historyDiv.appendChild(table); 
            } else {
                console.error("History div not found");
            }
        }
    } catch (error) {
        console.error("History call failed", error);
    }
}

document.getElementById('return-button').addEventListener('click', () => {
    window.history.back();
});


fetch_user();
fetchHistory();

