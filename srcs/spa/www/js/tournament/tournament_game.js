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
		window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('popstate', this.handlePopState.bind(this));

		this.init();
	}

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
			sessionStorage.setItem('programmaticNavigation', 'true');
            window.location.href = '/home/';
		}
	}

	async init() {
		user = await getUserFromBack();
		sessionStorage.setItem('tournament_code', this.tournamentCode);
		let oldData = null;
		let data = null
		if (this.checkLeft(this.tournamentCode) == true) {
			sessionStorage.setItem('programmaticNavigation', 'true');
			window.location.href = `/home/`;
		}
		while (true) {
			data = await this.loadEnd();
			await sleep(500);
			if (oldData && data !== oldData) {
				this.displayTournamentInfo(data);
				
				if (sessionStorage.getItem('finalDone') || data.winner.length > 0) {
					sessionStorage.removeItem('asWin');
					sessionStorage.removeItem('inFinal');
					sessionStorage.removeItem('tournament_code');
					sessionStorage.removeItem('finalDone');
					sessionStorage.setItem('programmaticNavigation', 'true');
					if (data.winner[0].id === user.id) {
						try {
							await ensureValidToken();
							const response = await fetch(`/api/record_match/${this.tournamentCode}/`, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									'X-CSRFToken': getCSRFToken(),
									'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
								},
								credentials: 'include',
							});
						} catch (error) {
							console.error("Error in record_match API call:", error);
						}
					}
					return;
				}
				else if (data.finalists.length > 0) {
					if (await this.verifUserInFinal(data))
						break;
				}
				else {
					if (this.verifUserNeedPlay(data)){
						sessionStorage.setItem('programmaticNavigation', 'true');
						window.location.href = `/onlinePong/?tournament=true`;
						break;
					}
				}
			}
			else {
				oldData = data;
			}
			await sleep(1500);
		}
	}

	async verifUserInFinal(data) {
		let isFinalist = false;
		let canPlay = true;
		for (const finalist of data.finalists) {
			if (finalist.id === user.id) {
				isFinalist = true;
				break;
			}
		}
		if (isFinalist === false)
			return false;
		else if (isFinalist === true) {
			for (const match of data.matches) {
				if (match.is_final)
					continue;
				if (match.winner == null && match.score == null) {
					canPlay = false;
					break;
				}
			}
		}
		if (canPlay) {
			sessionStorage.setItem('inFinal', true);
			sessionStorage.setItem('programmaticNavigation', 'true');
			window.location.href = `/onlinePong/?tournament=true`;
			return true;
		}
		return false;
	}

	verifUserNeedPlay(data) {
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