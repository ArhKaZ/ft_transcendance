import { getCSRFToken } from '../utils.js';

async function fetch_user() {

    const pathSegments = window.location.pathname.split('/');
    const userName = pathSegments[3];
    try {
        const response = await fetch(`/api/user/profile/${userName}/`, {
            method: 'GET',
			headers: {
                'Content-type' : 'application/json',
                'X-CSRFToken': getCSRFToken(),
				'Authorization' : `Token ${sessionStorage.getItem('token_key')}`,
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
        
        // Populate friends list
        const friendsList = document.getElementById('friends-list');
        if (data.friends && data.friends.length > 0) {
            data.friends.forEach(friend => {
                const friendElement = document.createElement('div');
                friendElement.className = 'friend-card';
                friendElement.innerHTML = `
                <a href="/user/profile/${friend.username}/" class="friend-link">
                <img src="${friend.avatar || '/avatars/default.png'}" alt="${friend.username}'s avatar" class="friend-avatar">
                <div class="friend-info">
                <span class="friend-username">${friend.username}</span>
                <span class="friend-pseudo">${friend.pseudo}</span>
                </div>
                </a>
                `;
                friendsList.appendChild(friendElement);
            });
        } else 
        friendsList.innerHTML = '<p class="no-friends">No friends yet</p>';
    } catch (error) {
        console.log("api call failed", error);
    }
}

async function fetchHistory() {
    const pathSegments = window.location.pathname.split('/');
    const userName = pathSegments[3];
    try {
        const response = await fetch(`/api/user/profile/get_history/${userName}/`, {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
            }
        });

        if (response.ok) {
            console.log("get history call worked");
            const data = await response.json();

            const sortedData = data.reverse();
            // Génération du tableau HTML
            let historyHtml = `
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Adversaire</th>
                            <th>Mode</th>
                            <th>Résultat</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            sortedData.forEach(item => {
                historyHtml += `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.opponent_name}</td>
                        <td>${item.type}</td>
                        <td>${item.won ? "Gagné" : "Perdu"}</td>
                    </tr>
                `;
            });

            historyHtml += `
                    </tbody>
                </table>
            `;

            // Correctly target the history div
            const historyDiv = document.getElementById('history');
            if (historyDiv) {
                historyDiv.innerHTML = historyHtml;
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

fetch_user();
fetchHistory();
