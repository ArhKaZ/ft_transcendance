import T_Player from './tournament_player.js';
import { sleep } from '../utils.js';
import { getCSRFToken } from '../utils.js';

class TournamentGame {
	constructor() {
		this.tournamentCode = window.location.pathname.split('/').filter(Boolean)[2];
		this.init();
		this.players = [];
		this.currentPlayer;
		this.quitButton = document.getElementById('quit-button');
		this.messageDiv = document.getElementById('messageDiv');
		document.getElementById('quit-button').addEventListener('click', () => this.quitTournament());
	}

	async quitTournament() {
		if (!this.tournamentCode) return;

		try {
			console.log("je forfeit");
			const response = await fetch(`/api/forfeit_tournament/${this.tournamentCode}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
                },
				credentials: 'include',
            });

			const data = await response.json();

            if (response.ok) {
                sessionStorage.removeItem('asWin');
            	sessionStorage.removeItem('tournament_code');
				setTimeout(() => {
					window.location.href = `/home/`;
				}, 3000);
            } else {
                this.messageDiv.innerHTML = `<div class="error-message">${data.error}</div>`;
            }
        } catch (error) {
            this.messageDiv.innerHTML = `<div class="error-message">Error quitting tournament</div>`;
        }
	}

	async init() {
		await this.loadPlayers();
		console.log("final status in the init ", sessionStorage.getItem('finalDone'));
		if (!sessionStorage.getItem('asWin')) {
			sessionStorage.setItem('tournament_code', this.tournamentCode);
			await sleep(5000);
			window.location.href = `/onlinePong/?tournament=true`;
		} else if (sessionStorage.getItem('asWin') == "true" && sessionStorage.getItem('finalDone') != "true") {
				console.log("je participe a la finale");
				await sleep(5000);
				window.location.href = `/onlinePong/?tournament=true`;
		}
	}

	async getUserFromBack() {
		try {
			const response = await fetch('/api/get-my-info/', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken(),
					'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
				},
				credentials: 'include',
			});
			if (!response.ok) {
				console.log("You need to be logged before playing sisi");
				// handleErrors({message: 'You need to be logged before playing'});
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.log("You need to be logged before playing", error);
			// handleErrors({message: 'You need to be logged before playing'});
		}
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
			this.createPlayers(data);
			this.displayTournamentInfo(data);
		} catch (error) {
			this.displayError('Error loading tournament data');
			console.error('Error:', error);
		}
	}

	createPlayers(data) {
		data.players.forEach(element => {
			this.players.push(new T_Player(element.id, element.username, element.avatar));
		});
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