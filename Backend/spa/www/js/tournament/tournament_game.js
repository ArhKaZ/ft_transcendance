class TournamentGame {
    constructor() {
        this.tournamentCode = window.location.pathname.split('/').filter(Boolean)[2];
        this.init();
    }

    async init() {
        await this.loadPlayers();
    }

    async loadPlayers() {
        try {
            const response = await fetch(`/api/tournament/${this.tournamentCode}/players/`, {
                headers: {
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load tournament data');
            }

            const data = await response.json();
            this.displayTournamentInfo(data);
        } catch (error) {
            this.displayError('Error loading tournament data');
            console.error('Error:', error);
        }
    }

    displayTournamentInfo(data) {
        // Display tournament code
        document.getElementById('tournamentCode').textContent = 
            `Tournament Code: ${data.tournament_code}`;

        // Display players
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = data.players.map(player => 
            `<li class="player-item">
                <span class="player-name">${player.username}</span>
            </li>`
        ).join('');

    }

    displayError(message) {
        const container = document.querySelector('.tournament-container');
        container.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the tournament game page
new TournamentGame();