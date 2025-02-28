import { getCSRFToken } from '../utils.js';

async function isUserFriend(userName) {
    try {
        const response = await fetch('/api/get_friends/', {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
            }
        });

        if (!response.ok) {
            console.error("Erreur lors de la récupération des amis");
            return false;
        }

        const data = await response.json();
        console.log("Données des amis reçues:", data); // Debugging

        // Vérifier que data est bien un tableau
        if (!Array.isArray(data)) {
            console.error("Le format des amis est incorrect:", data);
            return false;
        }

        // Extraire uniquement les noms des amis si data contient des objets
        const friendNames = data.map(friend => friend.username || friend.name); // Adapter selon le vrai champ

        return friendNames.includes(userName); // Vérifie si userName est dans la liste des amis
    } catch (error) {
        console.error("Échec de la récupération des amis", error);
        return false;
    }
}
async function isFriendRequestPending(userName) {
    try {
        const response = await fetch('/api/get_pending_friends/', {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
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

        // Récupérer l'utilisateur actuellement connecté
        const currentUser = sessionStorage.getItem('username'); // Assure-toi que le username est stocké ici
        
        // Vérifier si c'est currentUser qui a envoyé une demande à userName
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
        const response = await fetch(`/api/user/profile/${userName}/`, {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
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

        // Vérifier et mettre à jour l'état du bouton d'ami
        updateFriendButton(userName);

        // Calcul du winrate
        const wins = parseInt(data.wins, 10) || 0;
        const looses = parseInt(data.looses, 10) || 0;
        let winrate = wins + looses > 0 ? (wins / (wins + looses)) * 100 : 0;

        const winrateSpan = document.getElementById('user-winrate');
        winrateSpan.textContent = `${winrate.toFixed(2)}%`;

        winrateSpan.classList.remove("green", "red");
        winrateSpan.classList.add(winrate > 49 ? "green" : "red");
    } catch (error) {
        console.log("API call failed", error);
    }
}

async function addFriend(userName) {
    const addFriendBtn = document.getElementById('add-friend-btn');

    // Désactiver immédiatement le bouton après le premier clic
    addFriendBtn.src = "../../css/ico/friend_pending_ico.png"; // Icône "En attente"
    addFriendBtn.classList.add("disabled");
    addFriendBtn.onclick = null; // Supprime l'event listener immédiatement

    // Sauvegarder dans le sessionStorage pour garder l'état après reload
    sessionStorage.setItem(`friendRequest_${userName}`, "pending");

    try {
        const response = await fetch('/api/add_friend/', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
            },
            body: JSON.stringify({ 'friend_name': userName })
        });

        if (response.ok) {
            console.log("Ami ajouté !");
            window.location.reload(); // Recharge pour bien refléter le statut
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

    // Vérifier si une requête d'ami a déjà été envoyée
    const wasPending = sessionStorage.getItem(`friendRequest_${userName}`) === "pending";
    
    const isFriend = await isUserFriend(userName);
    const isPending = await isFriendRequestPending(userName);

    // Si la requête était en attente avant le reload, on la garde désactivée
    if (wasPending || isFriend || isPending) {
        addFriendBtn.src = isFriend ? "../../css/ico/friend_added_ico.png" : "../../css/ico/friend_pending_ico.png";
        addFriendBtn.classList.add("disabled");
        addFriendBtn.onclick = null;
    } else {
        addFriendBtn.src = "../../css/ico/add_friend_ico.png";
        addFriendBtn.classList.remove("disabled");
        addFriendBtn.onclick = () => addFriend(userName);
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

            const sortedData = data.reverse().slice(0, 5); // Prendre uniquement les 5 dernières parties
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


// fetchStats();

fetch_user();
fetchHistory();
