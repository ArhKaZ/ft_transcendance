import { getCSRFToken, ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';

class ProfileManager {
    constructor() {
        this.cleanupFunctions = [];
        this.userName = null;
    }

    async init() {
        try {
            this.userName = this.getUserNameFromURL();
            this.setupEventListeners();
            await this.loadProfileData();
            await this.loadHistory();
        } catch (error) {
            console.error("Profile initialization failed:", error);
            router.navigateTo('/user_not_found/');
        }
    }

    cleanup() {
        this.cleanupFunctions.forEach(fn => fn());
        this.cleanupFunctions = [];
        sessionStorage.removeItem(`friendRequest_${this.userName}`);
    }

    setupEventListeners() {
        const returnButton = document.getElementById('return-button');
        if (returnButton) {
            const handler = () => window.history.back();
            returnButton.addEventListener('click', handler);
            this.cleanupFunctions.push(() => returnButton.removeEventListener('click', handler));
        }

        document.querySelectorAll('.image-button').forEach(button => {
            const handler = () => console.log('Button clicked:', button.querySelector('img').alt);
            button.addEventListener('click', handler);
            this.cleanupFunctions.push(() => button.removeEventListener('click', handler));
        });
    }

    getUserNameFromURL() {
        const pathSegments = window.location.pathname.split('/');
        return pathSegments[3];
    }

    async loadProfileData() {
        try {
            const response = await this.apiGetProfile();
			if (!response.ok)
				throw new Error('Failed to load profile data');
            const data = await response.json();
            
            this.updateProfileUI(data);
            await this.updateFriendButton(data.username);
            
            if (await this.isUserFriend(data.username)) {
                this.handleGameStatus(data);
            }
        } catch (error) {
            throw new Error('Failed to load profile data');
        }
    }

    async apiGetProfile() {
        await ensureValidToken();
        return fetch(`/api/user/profile/${this.userName}/`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    updateProfileUI(data) {
        document.getElementById('username').textContent = data.username;
        document.getElementById('user-pseudo').textContent = data.pseudo;
        document.getElementById('ligue-points').textContent = data.ligue_points;
        document.getElementById('user-description').textContent = data.description || "No description provided";
        document.getElementById('user-avatar').src = data.avatar || '/avatars/default.png';
        
        // Update winrate
        const wins = parseInt(data.wins, 10) || 0;
        const looses = parseInt(data.looses, 10) || 0;
        const winrateSpan = document.getElementById('user-winrate');
        const winrate = this.calculateWinrate(wins, looses);
        winrateSpan.textContent = `${winrate.toFixed(2)}%`;
        winrateSpan.classList.toggle("green", winrate > 49);
        winrateSpan.classList.toggle("red", winrate <= 49);
    }

    calculateWinrate(wins, looses) {
        return wins + looses > 0 ? (wins / (wins + looses)) * 100 : 0;
    }

    async updateFriendButton(userName) {
        const addFriendBtn = document.getElementById('add-friend-btn');
        const currentUser = sessionStorage.getItem('username');

        if (currentUser === userName) {
            addFriendBtn.style.display = 'none';
            return;
        }

        const [isFriend, isPending] = await Promise.all([
            this.isUserFriend(userName),
            this.isFriendRequestPending(userName)
        ]);

        this.updateButtonState(addFriendBtn, isFriend, isPending);
    }

    updateButtonState(button, isFriend, isPending) {
        const wasPending = sessionStorage.getItem(`friendRequest_${this.userName}`) === "pending";

        if (wasPending || isFriend || isPending) {
            button.src = isFriend ? "/css/ico/friend_added_ico.png" : "/css/ico/friend_pending_ico.png";
            button.classList.add("disabled");
            button.onclick = null;
        } else {
            button.src = "/css/ico/add_friend_ico.png";
            button.classList.remove("disabled");
            button.onclick = () => this.addFriend();
        }
    }

    async addFriend() {
        const addFriendBtn = document.getElementById('add-friend-btn');
        
        try {
            addFriendBtn.src = "/css/ico/friend_pending_ico.png";
            addFriendBtn.classList.add("disabled");
            sessionStorage.setItem(`friendRequest_${this.userName}`, "pending");

            await ensureValidToken();
            const response = await fetch('/api/add_friend/', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 'friend_name': this.userName })
            });

            if (!response.ok) {
                throw new Error('Failed to add friend');
            }

            window.location.reload();
        } catch (error) {
            console.error("Friend addition failed:", error);
            this.resetFriendButton(addFriendBtn);
        }
    }

    resetFriendButton(button) {
        button.src = "/css/ico/add_friend_ico.png";
        button.classList.remove("disabled");
        sessionStorage.removeItem(`friendRequest_${this.userName}`);
    }

    handleGameStatus(data) {
        if (!data.is_in_tournament && !data.game_mode) return;

        const actionContainer = document.createElement('div');
        actionContainer.id = 'action-container';
        actionContainer.classList.add('action-section');

        const statusElement = this.createStatusElement(data);
        actionContainer.appendChild(statusElement);

        if (this.shouldShowJoinButton(data)) {
            const joinButton = this.createJoinButton(data);
            actionContainer.appendChild(joinButton);
        }

        document.getElementById('profile-header').appendChild(actionContainer);
    }

    createStatusElement(data) {
        const status = document.createElement('span');
        status.textContent = data.game_mode ? 
            `Status: ${data.is_waiting_for_game ? 'Waiting for' : 'Playing'} ${data.game_mode}` :
            `Tournament: ${data.code_current_tournament}`;
        
        return status;
    }

    createJoinButton(data) {
        const button = document.createElement('button');
        button.classList.add('buttons');
        button.textContent = 'Join';
        
        const handler = () => this.handleJoinAction(data);
        button.addEventListener('click', handler);
        this.cleanupFunctions.push(() => button.removeEventListener('click', handler));

        return button;
    }

    handleJoinAction(data) {
        if (data.game_mode === 'Pong') {
            router.navigateTo('/onlinePong/');
        } else if (data.game_mode === 'MagicDuel') {
            router.navigateTo('/magicDuel/');
        } else if (data.code_current_tournament) {
            sessionStorage.setItem('tournament_code_from_profile', data.code_current_tournament);
            router.navigateTo('/tournament');
        }
    }

    async loadHistory() {
        try {
            const response = await fetch(`/api/user/profile/get_history/${this.userName}/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.renderHistoryTable(data);
            }
        } catch (error) {
            console.error("Failed to load history:", error);
        }
    }

	renderHistoryTable(data) {
		const historyDiv = document.getElementById('history');
		if (!historyDiv) {
			console.error("History div not found");
			return;
		}
	
		// Sort and limit to 5 most recent items
		const sortedData = data.reverse().slice(0, 5);
	
		// Create table element
		const table = document.createElement('table');
		table.className = 'history-table';
	
		// Create table header
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
	
		// Create table body with rows
		const tbody = document.createElement('tbody');
		sortedData.forEach(item => {
			const row = document.createElement('tr');
	
			// Date cell
			const dateCell = document.createElement('td');
			dateCell.textContent = item.date;
			row.appendChild(dateCell);
	
			// Opponent cell
			const opponentCell = document.createElement('td');
			opponentCell.textContent = item.opponent_name;
			row.appendChild(opponentCell);
	
			// Game mode cell
			const typeCell = document.createElement('td');
			typeCell.textContent = item.type;
			row.appendChild(typeCell);
	
			// Result cell
			const resultCell = document.createElement('td');
			resultCell.textContent = item.won ? "Won" : "Lost";
			row.appendChild(resultCell);
	
			tbody.appendChild(row);
		});
	
		table.appendChild(tbody);
	
		// Clear and update the history div
		historyDiv.innerHTML = '';
		historyDiv.appendChild(table);
	}

    getAuthHeaders(contentType = 'application/json') {
        return {
            'Content-type': contentType,
            'X-CSRFToken': getCSRFToken(),
            'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
        };
    }

    async isUserFriend(userName) {
        try {
            const response = await fetch('/api/get_friends/', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) return false;
            
            const data = await response.json();
            return Array.isArray(data) && data.some(friend => 
                (friend.username || friend.name) === userName
            );
        } catch (error) {
            console.error("Friend check failed:", error);
            return false;
        }
    }

    async isFriendRequestPending(userName) {
        try {
            const response = await fetch('/api/get_pending_friends/', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) return false;

            const data = await response.json();
            const currentUser = sessionStorage.getItem('username');
            
            return Array.isArray(data) && data.some(request => 
                request.sender === currentUser && request.receiver === userName
            );
        } catch (error) {
            console.error("Pending check failed:", error);
            return false;
        }
    }

    shouldShowJoinButton(data) {
        return (data.is_waiting_for_game && data.game_mode) || 
               (!data.tournament_start && data.code_current_tournament);
    }
}

let profileManager;

export async function init() {
    profileManager = new ProfileManager();
    await profileManager.init();
}

export async function cleanup() {
    if (profileManager) {
        profileManager.cleanup();
        profileManager = null;
    }
}