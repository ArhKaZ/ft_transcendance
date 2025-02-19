console.log("Tournament script loaded!");

class TournamentManager {
	
	constructor() {
		// Ensure elements are available before using them
		this.messageDiv = document.getElementById('message') || this.createMessageDiv();
		this.quitButton = document.getElementById('quit-button');
		
		// Check if elements exist before setup
		if (document.getElementById('create-button') && this.quitButton) {
			this.setupEventListeners();
		}
		
		this.currentTournamentCode = null;
		this.setupTournamentPolling();
	}
	
    setupEventListeners() {
		// Create tournament button handler
        document.getElementById('create-button').addEventListener('click', () => this.createTournament());

		document.getElementById('quit-button').addEventListener('click', () => this.quitTournament());
        
        // Join tournament form handler
        document.getElementById('userForm').addEventListener('submit', (e) => this.joinTournament(e));
        
		// this.quitButton.addEventListener('click', () => this.quitTournament());
        // Setup polling if we're in a tournament
        this.setupTournamentPolling();

    }

	async quitTournament() {
        if (!this.currentTournamentCode) return;

        try {
            const response = await fetch(`/api/quit_tournament/${this.currentTournamentCode}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.handleQuitSuccess(data);
            } else {
                this.messageDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
            }
        } catch (error) {
            this.messageDiv.innerHTML = `<div class="error-message">Error quitting tournament</div>`;
        }
    }

	handleQuitSuccess(data) {
        this.stopTournamentPolling();
        sessionStorage.removeItem('current_tournament');
        this.currentTournamentCode = null;
        
        this.updateUIState(false);
        this.messageDiv.innerHTML = `<div class="success-message">${data.message}</div>`;
        
        if (data.deleted) {
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }

    updateUIState(inTournament) {
		const createButton = document.getElementById('create-button');
		const userForm = document.getElementById('userForm');
		
		if (createButton) createButton.disabled = inTournament;
		if (userForm) userForm.style.display = inTournament ? 'none' : 'block';
		if (this.quitButton) this.quitButton.style.display = inTournament ? 'block' : 'none';
	}

    async createTournament() {
        console.log("je veux creer un nouveau tournois");
        try {
            const response = await fetch('/api/create_tournament/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
                }
            });
    
            const data = await response.json();
    
            if (response.ok) {
                this.currentTournamentCode = data.tournament_code;
				this.updateUIState(true);
                sessionStorage.setItem('current_tournament', data.tournament_code); // Save in sessionStorage
    
                this.messageDiv.innerHTML = `
                    <div class="success-message">
                        Tournament created! Your code is: <strong>${data.tournament_code}</strong><br>
                        Waiting for players... (${data.players_count}/${data.max_players})
                    </div>`;
    
                this.startTournamentPolling();
                document.getElementById('create-button').disabled = true;
                document.getElementById('userForm').style.display = 'none';
            } else {
                this.messageDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
            }
        } catch (error) {
            this.messageDiv.innerHTML = `<div class="error-message">Error creating tournament</div>`;
        }
    }
    
    async joinTournament(event) {
        console.log("je veux rejoindre un nouveau tournois");
        event.preventDefault();
        const tournamentCode = document.getElementById('tournament_code').value;
    
        try {
            const response = await fetch('/api/join_tournament/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
                },
                body: JSON.stringify({ tournament_code: tournamentCode })
            });
    
            const data = await response.json();
    
            if (response.ok) {
                this.currentTournamentCode = tournamentCode;
				this.updateUIState(true);
                sessionStorage.setItem('current_tournament', tournamentCode); // Save in sessionStorage
    
                this.messageDiv.innerHTML = `
                    <div class="success-message">
                        ${data.message}<br>
                        Players: ${data.players_count}/4
                        ${data.started ? '<br>Tournament is starting!' : ''}
                    </div>`;
    
                this.startTournamentPolling();
                document.getElementById('create-button').disabled = true;
                document.getElementById('userForm').style.display = 'none';
    
                if (data.started) {
                    this.handleTournamentStart();
                }
            } else {
                this.messageDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
            }
        } catch (error) {
            this.messageDiv.innerHTML = `<div class="error-message">Error joining tournament</div>`;
        }
    }
    

    async checkTournamentStatus() {
        if (!this.currentTournamentCode) return;
    
        try {
            const response = await fetch(`/api/tournament_status/${this.currentTournamentCode}/`, {
                headers: {
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
                }
            });
    
            const data = await response.json();

			if (response.status === 404) {
				// Tournament was deleted
				this.handleQuitSuccess({ message: 'Tournament has been canceled', deleted: true });
				return;
			}
    
            if (response.ok) {
				const userInTournament = data.players.some(player => 
					player.username === this.getCurrentUsername());
				
				if (!userInTournament) {
					this.handleQuitSuccess({ message: 'You were removed from the tournament' });
					return;
				}

                if (data.is_full) {
                    // Redirect to game page when tournament is full
                    window.location.href = `/tournament/game/${this.currentTournamentCode}/`;
                } else {
                    // Preserve the tournament code while updating player count
                    this.messageDiv.innerHTML = `
                        <div class="success-message">
                            Tournament created! Your code is: <strong>${this.currentTournamentCode}</strong><br>
                            Waiting for players... (${data.players_count}/4)
                        </div>`;
                }
            }
        } catch (error) {
            console.error('Error checking tournament status:', error);
        }
    }

    startTournamentPolling() {
        this.pollInterval = setInterval(() => this.checkTournamentStatus(), 5000);
    }

    stopTournamentPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    handleTournamentStart() {
        this.stopTournamentPolling();
        sessionStorage.removeItem('current_tournament'); // Remove tournament code when it starts
    
        setTimeout(() => {
            window.location.href = `/tournament/game/${this.currentTournamentCode}/`;
        }, 2000);
    }

    setupTournamentPolling() {
        const existingTournament = sessionStorage.getItem('current_tournament');
        if (existingTournament) {
            this.currentTournamentCode = existingTournament;
			this.updateUIState(true);
            console.log("Restoring tournament:", existingTournament);
    
            this.messageDiv.innerHTML = `
                <div class="success-message">
                    Tournament created! Your code is: <strong>${existingTournament}</strong><br>
                    Waiting for players...
                </div>`;
    
            this.startTournamentPolling();
        }
    }
    

    createMessageDiv() {
        const messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        document.getElementById('userForm').insertAdjacentElement('beforebegin', messageDiv);
        return messageDiv;

    }

    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }

	getCurrentUsername() {
		return sessionStorage.getItem('username');
	}
}

console.log("Script starting...");
if (document.readyState === 'loading') {
    console.log("Document still loading, adding DOMContentLoaded listener");
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM fully loaded - creating TournamentManager");
        window.tournamentManager = new TournamentManager();
    });
} else {
    console.log("Document already loaded - creating TournamentManager immediately");
    window.tournamentManager = new TournamentManager();
}