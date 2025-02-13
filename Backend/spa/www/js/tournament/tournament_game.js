class TournamentGame {
    constructor() {
        this.tournamentCode = window.location.pathname.split('/').pop();
        this.init();
    }

    async init() {
        document.getElementById('tournament-code').textContent = this.tournamentCode;
        this.startStatusPolling();
    }

    async checkTournamentStatus() {
        try {
            const response = await fetch(`/api/tournament_status/${this.tournamentCode}/`, {
                headers: {
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updatePlayerList(data.players);
                this.updateStatus(data);
                
                if (!data.is_active) {
                    // Tournament was cancelled or ended
                    window.location.href = '/tournament/';
                }
            } else {
                // Handle error - maybe tournament doesn't exist anymore
                window.location.href = '/tournament/';
            }
        } catch (error) {
            console.error('Error checking tournament status:', error);
        }
    }

    updatePlayerList(players) {
        const container = document.getElementById('players-container');
        container.innerHTML = players.map(player => `
            <div class="player">
                <strong>${player.username}</strong>
                <span>${player.status}</span>
            </div>
        `).join('');
    }

    updateStatus(data) {
        const statusDiv = document.getElementById('status-message');
        if (data.started) {
            statusDiv.textContent = 'Tournament is starting!';
            // Additional game logic here
        } else {
            statusDiv.textContent = `Waiting for players... (${data.players_count}/4)`;
        }
    }

    startStatusPolling() {
        this.pollInterval = setInterval(() => this.checkTournamentStatus(), 2000);
    }

    stopStatusPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tournamentGame = new TournamentGame();
});