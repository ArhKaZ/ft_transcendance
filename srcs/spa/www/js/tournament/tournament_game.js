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

	async checkLeft(tournamentCode) {
		try {
			const response = await fetch(`/api/tournament/${tournamentCode}/check_left/`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken(),
					'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
				},
				credentials: 'include',
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
		console.log("Tournament Code:", this.tournamentCode);
		console.log("CSRF Token:", getCSRFToken());
		console.log("Token Key:", sessionStorage.getItem('token_key'));
		if (!this.tournamentCode) return;

		try {
			console.log("je forfeit");
			const response = await fetch(`/api/forfeit_tournament/${this.tournamentCode}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                    'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
                },
				credentials: 'include',
            });
			
			const data = await response.json();
			
            if (response.ok) {
				sessionStorage.removeItem('asWin');
            	sessionStorage.removeItem('tournament_code');
				console.log("fetch no error worked");
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
		if (this.checkLeft(this.tournamentCode) == true) {
			window.location.href = `/home/`;
		}
		console.log("final status in the init ", sessionStorage.getItem('finalDone'));
		await this.loadEnd();
		if (!sessionStorage.getItem('asWin')) {
			console.log("premiere game");
			// await this.loadPlayers();
			sessionStorage.setItem('tournament_code', this.tournamentCode);
			await sleep(5000);
			window.location.href = `/onlinePong/?tournament=true`;
		} else if (sessionStorage.getItem('asWin') == "true" && sessionStorage.getItem('finalDone') != "true") {
			console.log("je participe a la finale");
			await sleep(5000);
			window.location.href = `/onlinePong/?tournament=true`;
			// await this.loadFinal();
		}
		else {
			console.log("la finale est finie");
		}
	}
	
	async loadEnd() {
		try {
			const response = await fetch(`/api/tournament/${this.tournamentCode}/end_players/`, {
				headers: {
					'Authorization': `Token ${sessionStorage.getItem('token_key')}`
				}
			});
			
			if (!response.ok) {
				throw new Error('Failed to load tournament data');
			}
			
			const data = await response.json();
			console.log(data);
			this.displayTournamentInfo(data);
			// this.populatePlayers(data);
		} catch (error) {
			this.displayError('Error loading tournament data');
			console.error('Error:', error);
		}
	}

	populatePlayers(data) {
		const playersList = document.getElementById('players-list');
		const finalistsList = document.getElementById('finalists-list');
		const winnerList = document.getElementById('winner-list');
	
		playersList.innerHTML = '';
		finalistsList.innerHTML = '';
		winnerList.innerHTML = '';
	
		// Add all players
		data.players.forEach(player => {
			const li = document.createElement('li');
			li.textContent = player.username; // Adjust according to your serializer fields
			playersList.appendChild(li);
		});
	
		// Add finalists
		data.finalists.forEach(finalist => {
			const li = document.createElement('li');
			li.textContent = finalist.username;
			finalistsList.appendChild(li);
		});
	
		// Add winner (if exists)
		data.winner.forEach(winner => {
			const li = document.createElement('li');
			li.textContent = winner.username;
			winnerList.appendChild(li);
		});
	}

	displayTournamentInfo(data) {
		// Display tournament code
		document.getElementById('tournamentCode').textContent = 
			`Tournament Code: ${data.tournament_code}`;

		// Display players
		if (data.players.length >= 4) {
            document.getElementById('player1').textContent = data.players[0].pseudo;
            document.getElementById('player2').textContent = data.players[1].pseudo;
            document.getElementById('player3').textContent = data.players[2].pseudo;
            document.getElementById('player4').textContent = data.players[3].pseudo;
        } else {
            // S'il y a moins de 4 joueurs, afficher un message d'erreur ou adapter l'affichage.
            console.error("Nombre insuffisant de joueurs");
        }
		if (data.finalists.length >= 2)
		{
			document.getElementById('winner1').textContent = data.finalists[0].pseudo;
			document.getElementById('winner2').textContent = data.finalists[1].pseudo;
		}
		if (data.winner.length >= 1)
		{
				document.getElementById('finalwinner1').textContent = data.winner[0].pseudo;
		}
	}

	displayError(message) {
		const container = document.querySelector('.tournament-container');
		container.innerHTML = `
			<div class="error-message">
				<p>${message}</p>
			</div>
		`;
	}
}

// Initialize the tournament game page
new TournamentGame();