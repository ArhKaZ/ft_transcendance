import T_Player from './tournament_player.js';
import { sleep } from '../utils.js';
import { getCSRFToken } from '../utils.js';

class TournamentGame {
	constructor() {
		this.tournamentCode = window.location.pathname.split('/').filter(Boolean)[2];
		this.init();
		this.players = [];
		this.currentPlayer;
	}

	async init() {
		await this.loadPlayers();
		if (!sessionStorage.getItem('as_play')) {
			sessionStorage.setItem('tournament_code', this.tournamentCode);
			await sleep(5000);
			window.location.href = `/onlinePong/?tournament=true`;
		} else {
			//creer final
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