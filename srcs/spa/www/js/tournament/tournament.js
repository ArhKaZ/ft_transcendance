import { ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';

class TournamentManager {
    constructor() {
        this.messageDiv = document.getElementById('message') || this.createMessageDiv();
        this.cleanupFunctions = [];
        this.currentTournamentCode = null;
        this.pollInterval = null;
    }

    async init() {
        const popstateHandler = () => {
        if (this.currentTournamentCode) {
            this.justQuit();
            this.stopTournamentPolling();
            this.cleanupTournamentState();
        }
        };
        window.addEventListener('popstate', popstateHandler);

        this.setupUIElements();
        this.setupEventListeners();
        this.checkExistingTournament();

        const tournamentCodeProfile = sessionStorage.getItem('tournament_code_from_profile');
        if (tournamentCodeProfile) {
            document.getElementById('tournament_code').value = tournamentCodeProfile;
            sessionStorage.removeItem('tournament_code_from_profile');
        }
    }

    setupUIElements() {
        this.quitButton = document.getElementById('quit-button');
        this.createButton = document.getElementById('create-button');
        this.userForm = document.getElementById('userForm');
    }

    setupEventListeners() {
        const handleCreate = () => this.createTournament();
        const handleQuit = () => this.quitTournament(false);
        const handleJoin = (e) => this.joinTournament(e);
        const handleReturn = () => this.quitTournament(true);

        if (this.createButton) {
            this.createButton.addEventListener('click', handleCreate);
            this.cleanupFunctions.push(() => 
                this.createButton.removeEventListener('click', handleCreate)
            );
        }

        if (this.quitButton) {
            this.quitButton.addEventListener('click', handleQuit);
            this.cleanupFunctions.push(() => 
                this.quitButton.removeEventListener('click', handleQuit)
            );
        }

        if (this.userForm) {
            this.userForm.addEventListener('submit', handleJoin);
            this.cleanupFunctions.push(() => 
                this.userForm.removeEventListener('submit', handleJoin)
            );
        };

        const returnButton = document.getElementById('return-button');
        if (returnButton) {
            returnButton.addEventListener('click', handleReturn);
            this.cleanupFunctions.push(() => 
                returnButton.removeEventListener('click', handleReturn)
            );
        }
    }

    cleanup() {
        this.stopTournamentPolling();
        this.cleanupFunctions.forEach(fn => fn());
        this.cleanupFunctions = [];
    }


    handleReturnNavigation() {
        if (this.currentTournamentCode) {
            if (confirm('Do you want to quit the current tournament?')) {
                this.quitTournament(true);
                router.navigateTo("/pong/");
            }
        } else {
            router.navigateTo("/pong/");
        }
    }

    async quitTournament(leave) {
        if (!this.currentTournamentCode) return;

        try {
            await ensureValidToken();
            const response = await fetch(`/api/quit_tournament/${this.currentTournamentCode}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();

            if (response.ok) {
                leave ? this.handleLeaveSuccess(data) : this.handleQuitSuccess(data);
            } else {
                this.displayMessage(data.error, 'error');
            }
        } catch (error) {
            this.displayMessage('Error quitting tournament', 'error');
        }
    }

    justQuit() {
        try {
            ensureValidToken();
            const response =  fetch(`/api/quit_tournament/${this.currentTournamentCode}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            const data =  response.json();

            if (!response.ok) {
                this.displayMessage(data.error, 'error');
            }
        } catch (error) {
            this.displayMessage('Error quitting tournament', 'error');
        }
    }

    handleLeaveSuccess(data) {
        this.cleanupTournamentState();
        this.displayMessage(data.message, 'success');
        
        if (data.deleted) {
            setTimeout(() => router.navigateTo('/home/'), 0);
        }
    }

    handleQuitSuccess(data) {
        this.cleanupTournamentState();
        this.displayMessage(data.message, 'success');
    }

    cleanupTournamentState() {
        this.stopTournamentPolling();
        sessionStorage.removeItem('current_tournament');
        this.currentTournamentCode = null;
        this.updateUIState(false);
    }

    updateUIState(inTournament) {
        if (this.createButton) this.createButton.style.display = inTournament ? 'none' : 'block';
        if (this.userForm) this.userForm.style.display = inTournament ? 'none' : 'block';
        if (this.quitButton) this.quitButton.style.display = inTournament ? 'block' : 'none';
    }

    async createTournament() {
        try {
            await ensureValidToken();
            const response = await fetch('/api/create_tournament/', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();

            if (response.ok) {
                this.currentTournamentCode = data.tournament_code;
                this.updateUIState(true);
                sessionStorage.setItem('current_tournament', data.tournament_code);

                this.displayMessage(
                    `Tournament created! Your code is: <strong>${data.tournament_code}</strong><br>
                    Waiting for players... (${data.players_count}/${data.max_players})`,
                    'success'
                );

                this.startTournamentPolling();
                if (this.createButton) this.createButton.disabled = true;
                if (this.userForm) this.userForm.style.display = 'none';
            } else {
                this.displayMessage(data.error, 'error');
            }
        } catch (error) {
            this.displayMessage('Error creating tournament', 'error');
        }
    }

    async joinTournament(event) {
        event.preventDefault();
        const tournamentCode = document.getElementById('tournament_code').value;

        try {
            await ensureValidToken();
            const response = await fetch('/api/join_tournament/', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ tournament_code: tournamentCode })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentTournamentCode = tournamentCode;
                this.updateUIState(true);
                sessionStorage.setItem('current_tournament', tournamentCode);

                let message = `${data.message}<br>Players: ${data.players_count}/4`;
                if (data.started) message += '<br>Tournament is starting!';

                this.displayMessage(message, 'success');
                this.startTournamentPolling();
                
                if (this.createButton) this.createButton.disabled = true;
                if (this.userForm) this.userForm.style.display = 'none';

                if (data.started) {
                    this.handleTournamentStart();
                }
            } else {
                this.displayMessage(data.error, 'error');
            }
        } catch (error) {
            this.displayMessage('Error joining tournament', 'error');
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

            if (response.status === 404) {
                this.handleQuitSuccess({ message: 'Tournament has been canceled', deleted: true });
                return;
            }

            const data = await response.json();

            if (response.ok) {
                const userInTournament = data.players.some(player => 
                    player.username === sessionStorage.getItem('username'));

                if (!userInTournament) {
                    this.handleQuitSuccess({ message: 'You were removed from the tournament' });
                    return;
                }

                if (data.is_full) {
                    clearInterval(this.pollInterval);
                    sessionStorage.removeItem('current_tournament');
                    router.navigateTo(`/tournament/game/${this.currentTournamentCode}/`);
                } else {
                    this.displayMessage(
                        `Tournament created! Your code is: <strong>${this.currentTournamentCode}</strong><br>
                        Waiting for players... (${data.players_count}/4)`,
                        'success'
                    );
                }
            }
        } catch (error) {
            console.error('Error checking tournament status:', error);
        }
    }

    startTournamentPolling() {
        this.pollInterval = setInterval(() => this.checkTournamentStatus(), 5000);
    }

    async stopTournamentPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    handleTournamentStart() {
        this.stopTournamentPolling();
        sessionStorage.removeItem('current_tournament');

        setTimeout(() => {
            router.navigateTo(`/tournament/game/${this.currentTournamentCode}/`);
        }, 2000);
    }

    checkExistingTournament() {
        const existingTournament = sessionStorage.getItem('current_tournament');
        if (existingTournament) {
            this.currentTournamentCode = existingTournament;
            this.updateUIState(true);
            this.displayMessage(
                `Tournament created! Your code is: <strong>${existingTournament}</strong><br>
                Waiting for players...`,
                'success'
            );
            this.startTournamentPolling();
        }
    }

    createMessageDiv() {
        const messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        document.getElementById('userForm')?.insertAdjacentElement('beforebegin', messageDiv);
        return messageDiv;
    }

    displayMessage(message, type) {
        this.messageDiv.innerHTML = `
            <div class="${type}-message">
                ${message}
            </div>`;
    }

    getAuthHeaders(contentType = 'application/json') {
        const headers = {
            'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            'X-CSRFToken': this.getCSRFToken()
        };

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        return headers;
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
}

let tournamentManager;

export async function init() {
    tournamentManager = new TournamentManager();
    await tournamentManager.init();
}
