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
		
		if (!this.tournamentCode) {
			console.error("No tournament code available");
			window.location.href = '/home/';
			return;
		}
		sessionStorage.removeItem('asWin');
		sessionStorage.removeItem('tournament_code');
		sessionStorage.removeItem('finalDone');
		sessionStorage.removeItem('inFinal');
		
		try {
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
		} catch (error) {
			console.error("Error in forfeit API call:", error);
		} finally {
			window.location.href = '/home/';
		}
	}

	async init() {
		user = await getUserFromBack();
		console.log(user);
		sessionStorage.setItem('tournament_code', this.tournamentCode);
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
			if (match.winner === null) {
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
			this.displayTournamentInfo(data);
			return data;
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
	
		data.players.forEach(player => {
			const li = document.createElement('li');
			li.textContent = player.username; 
			playersList.appendChild(li);
		});
	
		
		data.finalists.forEach(finalist => {
			const li = document.createElement('li');
			li.textContent = finalist.username;
			finalistsList.appendChild(li);
		});
	
		
		data.winner.forEach(winner => {
			const li = document.createElement('li');
			li.textContent = winner.username;
			winnerList.appendChild(li);
		});
	}

	displayTournamentInfo(data) {
		
		document.getElementById('tournamentCode').textContent = 
			`Tournament Code: ${data.tournament_code}`;

		if (data.players.length >= 4) {
            document.getElementById('player1').textContent = data.matches[0].player1.pseudo;
            document.getElementById('player2').textContent = data.matches[0].player2.pseudo;
            document.getElementById('player3').textContent = data.matches[1].player1.pseudo;
            document.getElementById('player4').textContent = data.matches[1].player2.pseudo;
        } else {
            console.error("Not enough players");
        }
		if (data.finalists.length >= 2)
		{
			document.getElementById('winner1').textContent = data.matches[0].winner.pseudo;
			document.getElementById('winner2').textContent = data.matches[1].winner.pseudo;
		}
		if (data.winner.length >= 1)
		{
				document.getElementById('finalwinner1').textContent = data.matches[2].winner.pseudo;
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


new TournamentGame();