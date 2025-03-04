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
            console.error("Erreur lors de la récupération des amis");
            return false;
        }

        const data = await response.json();
        console.log("Données des amis reçues:", data);

        if (!Array.isArray(data)) {
            console.error("Le format des amis est incorrect:", data);
            return false;
        }

        const friendNames = data.map(friend => friend.username || friend.name);

        return friendNames.includes(userName);
    } catch (error) {
        console.error("Échec de la récupération des amis", error);
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
            console.error("Erreur lors de la récupération des demandes d'amis en attente");
            return false;
        }

        const data = await response.json();
        console.log("Demandes d'amis en attente :", data);

        if (!Array.isArray(data)) {
            console.error("Format incorrect des demandes en attente:", data);
            return false;
        }

        const currentUser = sessionStorage.getItem('username');
        
        return data.some(request => request.sender === currentUser && request.receiver === userName);
    } catch (error) {
        console.error("Échec de la récupération des demandes en attente", error);
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
    } catch (error) {
        console.log("API call failed", error);
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
            console.log("Ami ajouté !");
            window.location.reload();
        } else {
            const data = await response.json();
            console.error("Erreur lors de l'ajout d'un ami :", data.error || response.status);
        }
    } catch (error) {
        console.error("Échec de l'ajout d'un ami", error);
    }
}

async function updateFriendButton(userName) {
    const addFriendBtn = document.getElementById('add-friend-btn');

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
            console.log("get history call worked");
            const data = await response.json();

            const sortedData = data.reverse().slice(0, 5);

            // Create the table element
            const table = document.createElement('table');
            table.className = 'history-table';

            // Create the table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Date</th>
                    <th>Adversaire</th>
                    <th>Mode</th>
                    <th>Résultat</th>
                </tr>
            `;
            table.appendChild(thead);

            // Create the table body
            const tbody = document.createElement('tbody');
            sortedData.forEach(item => {
                const row = document.createElement('tr');

                // Create and append the date cell
                const dateCell = document.createElement('td');
                dateCell.textContent = item.date; // Safe
                row.appendChild(dateCell);

                // Create and append the opponent cell
                const opponentCell = document.createElement('td');
                opponentCell.textContent = item.opponent_name; // Safe
                row.appendChild(opponentCell);

                // Create and append the type cell
                const typeCell = document.createElement('td');
                typeCell.textContent = item.type; // Safe
                row.appendChild(typeCell);

                // Create and append the result cell
                const resultCell = document.createElement('td');
                resultCell.textContent = item.won ? "Gagné" : "Perdu"; // Safe
                row.appendChild(resultCell);

                // Append the row to the table body
                tbody.appendChild(row);
            });

            // Append the table body to the table
            table.appendChild(tbody);

            // Insert the table into the history div
            const historyDiv = document.getElementById('history');
            if (historyDiv) {
                historyDiv.innerHTML = ''; // Clear existing content
                historyDiv.appendChild(table); // Append the new table
            } else {
                console.error("History div not found");
            }
        } else {
            console.log("Erreur lors de la récupération de l'historique :", response.status);
        }
    } catch (error) {
        console.log("history call failed", error);
    }
}

document.getElementById('return-button').addEventListener('click', () => {
    console.log("return click");
    window.history.back();
});


fetch_user();
fetchHistory();

