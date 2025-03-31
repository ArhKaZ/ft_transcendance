import { sleep, getCSRFToken, ensureValidToken, getUserFromBack } from '/js/utils.js';
import { router } from '../router.js';

class TournamentGame {
    constructor() {
        this.tournamentCode = window.location.pathname.split('/').filter(Boolean)[2];
        this.players = [];
        this.currentPlayer = null;
        this.pollingInterval = null;
        this.cleanupFunctions = [];
    }

    async init() {
        try {
            this.setupElements();
            this.setupEventListeners();
            
            this.user = await getUserFromBack();
            sessionStorage.setItem('tournament_code', this.tournamentCode);

            if (await this.checkLeft(this.tournamentCode)) {
                this.cleanupAndNavigate('/home/');
                return;
            }

            await this.startTournamentPolling();
        } catch (error) {
            console.error("Initialization error:", error);
            this.displayError("Failed to initialize tournament");
        }
    }

    setupElements() {
        this.quitButton = document.getElementById('quit-button');
        this.messageDiv = document.getElementById('messageDiv');
    }

    setupEventListeners() {
        const handleQuit = () => this.quitTournament();
        const handleBeforeUnload = (event) => this.handleBeforeUnload(event);
        const handlePopState = (event) => this.handlePopState(event);

        if (this.quitButton) {
            this.quitButton.addEventListener('click', handleQuit);
            this.cleanupFunctions.push(() => 
                this.quitButton.removeEventListener('click', handleQuit)
            );
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        this.cleanupFunctions.push(() => 
            window.removeEventListener('beforeunload', handleBeforeUnload)
        );

        window.addEventListener('popstate', handlePopState);
        this.cleanupFunctions.push(() => 
            window.removeEventListener('popstate', handlePopState)
        );
    }

    cleanup() {
        this.stopTournamentPolling();
        this.cleanupFunctions.forEach(fn => fn());
        this.cleanupFunctions = [];
    }

    async startTournamentPolling() {
		let oldData = null;
		
		// Add deep equality check function
		const isDataDifferent = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
		
		this.pollingInterval = setInterval(async () => {
			try {
				const data = await this.loadEnd();
				console.log("Polling Data:", data); // Debug log
				
				// Check if data has changed
				if (!oldData || isDataDifferent(data, oldData)) {
					console.log("Data changed, processing...");
					this.displayTournamentInfo(data);
					
					// Check for tournament end
					if (sessionStorage.getItem('finalDone') || data.winner?.length > 0) {
						console.log("Tournament ended, handling...");
						await this.handleTournamentEnd(data);
						return;
					}
					// Check if user is in the final and ready
					else if (data.finalists?.length > 0) {
						console.log("Checking finals...");
						const inFinal = await this.verifUserInFinal(data);
						if (inFinal) {
							console.log("Navigating to final game...");
							this.cleanupAndNavigate('/onlinePong/?tournament=true');
							return;
						}
					}
					// Check if user needs to play a regular match
					else if (this.verifUserNeedPlay(data)) {
						console.log("User needs to play, navigating...");
						this.cleanupAndNavigate('/onlinePong/?tournament=true');
						return;
					}
				}
				
				oldData = data;
			} catch (error) {
				console.error("Polling error:", error);
				this.stopTournamentPolling();
			}
		}, 3000); // Increased interval to 3 seconds
	}

    stopTournamentPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async handleTournamentEnd(data) {
        this.stopTournamentPolling();
        
        if (data.winner[0]?.id === this.user.id) {
            await this.recordMatch();
        }
        
        this.cleanupSessionStorage();
        this.cleanupAndNavigate('/home/');
    }

    cleanupSessionStorage() {
        ['asWin', 'tournament_code', 'finalDone', 'inFinal'].forEach(key => {
            sessionStorage.removeItem(key);
        });
    }

    cleanupAndNavigate(path) {
        sessionStorage.setItem('programmaticNavigation', 'true');
        this.cleanup();
        router.navigateTo(path);
    }

    /* Méthodes existantes restructurées */
    handleBeforeUnload(event) {
        if (sessionStorage.getItem('programmaticNavigation') === 'true') {
            sessionStorage.removeItem('programmaticNavigation');
            return;
        }

        event.preventDefault();
        event.returnValue = '';
        this.syncForfeit();
    }

    syncForfeit() {
        ensureValidToken();
        const url = `/api/forfeit_tournament/${this.tournamentCode}/`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-CSRFToken', getCSRFToken());
        xhr.setRequestHeader('Authorization', `Bearer ${sessionStorage.getItem('access_token')}`);
        try {
            xhr.send(JSON.stringify({}));
        } catch (e) {
            console.error('Forfeit request failed during unload:', e);
        }
    }

    handlePopState(event) {
        history.pushState(null, document.title, window.location.href);
        this.quitTournament();
    }

    async checkLeft(tournamentCode) {
        try {
            await ensureValidToken();
            const response = await fetch(`/api/tournament/${tournamentCode}/check_left/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
    
            if (!response.ok) {
                throw new Error('Failed to check left status');
            }
    
            const data = await response.json();
            return data.is_left;
    
        } catch (error) {
            console.error('Error checking left status:', error);
            return false;
        }
    }

    async quitTournament() {
        if (!this.tournamentCode) {
            console.error("No tournament code available");
            this.cleanupAndNavigate('/home/');
            return;
        }
        
        try {
            await ensureValidToken();
            await fetch(`/api/forfeit_tournament/${this.tournamentCode}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error in forfeit API call:", error);
        } finally {
            this.cleanupSessionStorage();
            this.cleanupAndNavigate('/home/');
        }
    }

    async loadEnd() {
        const response = await fetch(`/api/tournament/${this.tournamentCode}/end_players/`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load tournament data');
        }
        return await response.json();
    }

    async verifUserInFinal(data) {
        const isFinalist = data.finalists.some(finalist => finalist.id === this.user.id);
        if (!isFinalist) return false;

        const canPlay = data.matches.every(match => {
            if (match.is_final) return true;
            return match.winner != null || match.score != null;
        });

        if (canPlay) {
            sessionStorage.setItem('inFinal', 'true');
            return true;
        }
        return false;
    }

    verifUserNeedPlay(data) {
        return data.matches.some(match => {
            return match.winner === null && 
                  (match.player1.id === this.user.id || match.player2.id === this.user.id);
        });
    }

    async recordMatch() {
        try {
            await ensureValidToken();
            await fetch(`/api/record_match/${this.tournamentCode}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error in record_match API call:", error);
        }
    }

    populatePlayers(data) {
        const populateList = (selector, items) => {
            const list = document.getElementById(selector);
            if (list) {
                list.innerHTML = items.map(item => 
                    `<li>${item.username}</li>`
                ).join('');
            }
        };

        populateList('players-list', data.players);
        populateList('finalists-list', data.finalists);
        populateList('winner-list', data.winner);
    }

    displayTournamentInfo(data) {
        document.getElementById('tournamentCode').textContent = 
            `Tournament Code: ${data.tournament_code}`;

        if (data.players.length >= 4) {
            document.getElementById('player1').textContent = data.matches[0].player1.pseudo;
            document.getElementById('player2').textContent = data.matches[0].player2.pseudo;
            document.getElementById('player3').textContent = data.matches[1].player1.pseudo;
            document.getElementById('player4').textContent = data.matches[1].player2.pseudo;
        }

        if (data.finalists.length >= 2) {
            document.getElementById('winner1').textContent = data.matches[0].winner.pseudo;
            document.getElementById('winner2').textContent = data.matches[1].winner.pseudo;
        }

        if (data.winner.length >= 1) {
            document.getElementById('finalwinner1').textContent = data.matches[2].winner.pseudo;
        }
    }

    displayError(message) {
        const container = document.querySelector('.tournament-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                </div>
            `;
        }
    }

    getAuthHeaders(contentType = 'application/json') {
        const headers = {
            'X-CSRFToken': getCSRFToken(),
            'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
        };

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        return headers;
    }
}

// Interface pour le SPA
let tournamentGame;

export async function init() {
    tournamentGame = new TournamentGame();
    await tournamentGame.init();
}

export async function cleanup() {
    if (tournamentGame) {
        tournamentGame.cleanup();
        tournamentGame = null;
    }
}