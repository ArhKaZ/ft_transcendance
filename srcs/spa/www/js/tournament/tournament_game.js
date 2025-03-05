import T_Player from './tournament_player.js';
import { sleep } from '../utils.js';
import { getCSRFToken } from '../utils.js';
import { ensureValidToken, getUserFromBack } from '/js/utils.js';

let user = null;

class TournamentGame {
	constructor() {
		this.tournamentCode = window.location.pathname.split('/').filter(Boolean)[2];
		this.players = [];
		this.currentPlayer;
		this.quitButton = document.getElementById('quit-button');
		this.messageDiv = document.getElementById('messageDiv');
		document.getElementById('quit-button').addEventListener('click', () => this.quitTournament());
		

		this.init();
		this.preventExit();
	}

	preventExit() {
		window.addEventListener('beforeunload', (event) => {
			event.preventDefault();
			event.returnValue = 'Do you want to quit the tournament';
		});

		window.addEventListener('popstate', (event) => {
			if (confirm('Are you sure ?')) {
				this.quitTournament();
			} else {
				history.pushState(null, '', window.location.href);
			}
		});

		// Ajoute une entrée dans l'historique pour empêcher un retour direct
		history.pushState(null, '', window.location.href);
	}

	async checkLeft(tournamentCode) {
		try {
			await ensureValidToken();
			const response = await fetch(`/api/tournament/${tournamentCode}/check_left/`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken(),
					'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
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
		console.log("Quitting tournament:", this.tournamentCode);
		
		if (!this.tournamentCode) {
			console.error("No tournament code available");
			window.location.href = '/home/';
			return;
		}
	
		// Clean up session storage immediately
		sessionStorage.removeItem('asWin');
		sessionStorage.removeItem('tournament_code');
		sessionStorage.removeItem('finalDone');
		sessionStorage.removeItem('inFinal');
		
		try {
			console.log("Sending forfeit request to API");
			await ensureValidToken();
			const response = await fetch(`/api/forfeit_tournament/${this.tournamentCode}/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken(),
					'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
				},
				credentials: 'include',
			});
			
			console.log("Forfeit API response status:", response.status);
		} catch (error) {
			console.error("Error in forfeit API call:", error);
		} finally {
			// Always navigate home
			console.log("Navigating to home page");
			window.location.href = '/home/';
		}
	}

	async init() {
		user = await getUserFromBack();
		console.log(user);
		sessionStorage.setItem('tournament_code', this.tournamentCode); // verifier si il est deja set
		await sleep(2000);
		if (this.checkLeft(this.tournamentCode) == true) {
			window.location.href = `/home/`;
		}
		const data = await this.loadEnd();
		if (sessionStorage.getItem('finalDone') || data.winner.length > 0) {
			console.log('tournoi fini');
			sessionStorage.removeItem('asWin');
			sessionStorage.removeItem('inFinal');
			sessionStorage.removeItem('tournament_code');
			sessionStorage.removeItem('finalDone');
			return;
		}
		else if (data.finalists.length > 0) {
			this.verifUserInFinal(data);
		}
		else {
			if (this.verifUserNeedPlay(data))
				window.location.href = `/onlinePong/?tournament=true`;
		}
	}

	verifUserInFinal(data) {
		for (const finalist of data.finalists) {
			console.log(finalist);
			console.log(user);
			console.log(finalist.id == user.id);
			if (finalist.id === user.id) {
				sessionStorage.setItem('inFinal', true);
				window.location.href = `/onlinePong/?tournament=true`;
				break;
			}
		}
	}

	verifUserNeedPlay(data) {
		console.log(`data:`, data);
		return data.matches.some(match => {
			// Vérifier si la match n'a pas de vainqueur
			if (match.winner === null) {
				// Vérifier si l'utilisateur est l'un des joueurs de la match
				return match.player1.id === user.id || match.player2.id === user.id;
			}
			return false;
		});
	}

	async loadEnd() {
		try {
			await ensureValidToken();
			const response = await fetch(`/api/tournament/${this.tournamentCode}/end_players/`, {
				headers: {
					'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
				}
			});
			
			if (!response.ok) {
				throw new Error('Failed to load tournament data');
			}
			
			const data = await response.json();
			console.log("JSON Final du Tournoi :", JSON.stringify(data, null, 2));
			this.displayTournamentInfo(data);
			return data;
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