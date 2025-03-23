import { ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';

class TournamentManager {
	
	constructor() {
		this.messageDiv = document.getElementById('message') || this.createMessageDiv();
		this.quitButton = document.getElementById('quit-button');
		
		if (document.getElementById('create-button') && this.quitButton) {
			this.setupEventListeners();
		}
		
		this.currentTournamentCode = null;
		this.setupTournamentPolling();

        this.setupHistoryListener();
	}

    setupHistoryListener() {
        window.addEventListener('popstate', (event) => {
            if (this.currentTournamentCode) {   
                event.preventDefault();
                if (confirm('Do you want to quit the current tournament?')) {
                    this.quitTournament(true);
                } else {
                    window.history.pushState({}, '', window.location.href);
                }
            }
        });
        window.history.pushState({}, '', window.location.href);
    }
	
    setupEventListeners() {
        document.getElementById('create-button').addEventListener('click', () => this.createTournament());
		document.getElementById('quit-button').addEventListener('click', () => this.quitTournament(false));
        document.getElementById('userForm').addEventListener('submit', (e) => this.joinTournament(e));
        this.setupTournamentPolling();

    }

	async quitTournament(leave) {
        if (!this.currentTournamentCode) return;

        try {
            await ensureValidToken();
            const response = await fetch(`/api/quit_tournament/${this.currentTournamentCode}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                }
            });

            const data = await response.json();

            if (response.ok) {
                if (leave == false)
                    this.handleQuitSuccess(data);
                else
                    this.handleLeaveSuccess(data);
            } else {
                this.messageDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
            }
        } catch (error) {
            this.messageDiv.innerHTML = `<div class="error-message">Error quitting tournament</div>`;
        }
    }

    handleLeaveSuccess(data) {
        this.stopTournamentPolling();
        sessionStorage.removeItem('current_tournament');
        this.currentTournamentCode = null;
        
        this.updateUIState(false);
        this.messageDiv.innerHTML = `<div class="success-message">${data.message}</div>`;
        
        if (data.deleted) {
            setTimeout(() => {
                router.navigateTo('/home/');
            }, 0);
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
            }, 0);
        }
    }

    updateUIState(inTournament) {
		const createButton = document.getElementById('create-button');
		const userForm = document.getElementById('userForm');
		
		if (createButton) createButton.style.display = inTournament ? 'none' : 'block';
		if (userForm) userForm.style.display = inTournament ? 'none' : 'block';
		if (this.quitButton) this.quitButton.style.display = inTournament ? 'block' : 'none';
	}

    async createTournament() {
        try {
            await ensureValidToken();
            const response = await fetch('/api/create_tournament/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                }
            });
    
            const data = await response.json();
    
            if (response.ok) {
                this.currentTournamentCode = data.tournament_code;
				this.updateUIState(true);
                sessionStorage.setItem('current_tournament', data.tournament_code); 
    
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
        event.preventDefault();
        const tournamentCode = document.getElementById('tournament_code').value;
    
        try {
            await ensureValidToken();
            const response = await fetch('/api/join_tournament/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ tournament_code: tournamentCode })
            });
    
            const data = await response.json();
    
            if (response.ok) {
                this.currentTournamentCode = tournamentCode;
				this.updateUIState(true);
                sessionStorage.setItem('current_tournament', tournamentCode); 
    
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
            await ensureValidToken();
            const response = await fetch(`/api/tournament_status/${this.currentTournamentCode}/`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                }
            });
    
            const data = await response.json();

			if (response.status === 404) {
				
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
                    
                    sessionStorage.removeItem('current_tournament');
                    router.navigateTo(`/tournament/game/${this.currentTournamentCode}/`);
                } else {
                    
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
        sessionStorage.removeItem('current_tournament'); 
    
        setTimeout(() => {
            router.navigateTo(`/tournament/game/${this.currentTournamentCode}/`);
        }, 2000);
    }

    setupTournamentPolling() {
        const existingTournament = sessionStorage.getItem('current_tournament');
        if (existingTournament) {
            this.currentTournamentCode = existingTournament;
			this.updateUIState(true);    
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

document.getElementById('return-button').addEventListener('click', () => {
    
    if (window.tournamentManager && window.tournamentManager.currentTournamentCode) {
        
        if (confirm('Do you want to quit the current tournament?')) {
            window.tournamentManager.quitTournament(true);
            router.navigateTo("/pong/");
        }
    } else {
        
        router.navigateTo("/pong/");
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tournamentManager = new TournamentManager();
    });
} else {
    window.tournamentManager = new TournamentManager();
}