import { sleep } from '../utils.js';
import { getCSRFToken } from '../utils.js';
import { ensureValidToken, getUserFromBack } from '/js/utils.js';
import { router } from '../router.js';

let user = null;

class TournamentGame {
	constructor() {
		this.tournamentCode = window.location.pathname.split('/').filter(Boolean)[2];
		this.players = [];
		this.currentPlayer;
		this.quitButton = document.getElementById('quit-button');
		this.messageDiv = document.getElementById('messageDiv');
		document.getElementById('quit-button').addEventListener('click', () => this.quitTournament());
		// window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('popstate', this.handlePopState.bind(this));
		this.tournamentConfig = {
			rounds: [
				{ // Round 1
					matches: [
						{ participants: ['Joueur 1', 'Joueur 2'], position: { x: 0.1, y: 0.3 }, nextMatch: 0 },
						{ participants: ['Joueur 3', 'Joueur 4'], position: { x: 0.1, y: 0.7 }, nextMatch: 0 }
					]
				},
				{ // Finale
					matches: [
						{ participants: ['Vainqueur 1', 'Vainqueur 2'], position: { x: 0.5, y: 0.5 }, nextMatch: null }
					]
				},
				{ // Gagnant
					matches: [
						{ participants: ['Champion'], position: { x: 0.9, y: 0.6 }, nextMatch: null }
					]
				}
			]
		};

		this.roundsMidpoints = [];

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
			router.navigateTo('/home/');
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
            router.navigateTo('/home/');
		}
	}

	async init() {
		user = await getUserFromBack();
		sessionStorage.setItem('tournament_code', this.tournamentCode);
		let oldData = null;
		let data = null
		if (this.checkLeft(this.tournamentCode) == true) {
			sessionStorage.setItem('programmaticNavigation', 'true');
			router.navigateTo('/home/');
		}
		// while (true) {
			data = await this.loadEnd();
			await sleep(500);
			this.canvasTournament(data);
			this.displayTournamentInfo(data);
			// if (oldData && data !== oldData) {
				this.displayTournamentInfo(data);
				if (sessionStorage.getItem('finalDone') || data.winner.length > 0) {
					console.log('end of tournament');
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
						return;
						// break;
				}
				else {
					if (this.verifUserNeedPlay(data)){
						sessionStorage.setItem('programmaticNavigation', 'true');
						router.navigateTo(`/onlinePong/?tournament=true`);
						return;
						// break;
					}
				}
			// }
			oldData = data;
			await sleep(1500);
		// }
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
			router.navigateTo(`/onlinePong/?tournament=true`);
			return true;
		}
		return false;
	}

	verifUserNeedPlay(data) {
		return data.matches.some(match => {
			if (match.winner === null) {
				console.log('need to play');
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

	// populatePlayers(data) {
	// 	const playersList = document.getElementById('players-list');
	// 	const finalistsList = document.getElementById('finalists-list');
	// 	const winnerList = document.getElementById('winner-list');
	
	// 	playersList.innerHTML = '';
	// 	finalistsList.innerHTML = '';
	// 	winnerList.innerHTML = '';
	
	// 	data.players.forEach(player => {
	// 		const li = document.createElement('li');
	// 		li.textContent = player.username; 
	// 		playersList.appendChild(li);
	// 	});
	
		
	// 	data.finalists.forEach(finalist => {
	// 		const li = document.createElement('li');
	// 		li.textContent = finalist.username;
	// 		finalistsList.appendChild(li);
	// 	});
	
		
	// 	data.winner.forEach(winner => {
	// 		const li = document.createElement('li');
	// 		li.textContent = winner.username;
	// 		winnerList.appendChild(li);
	// 	});
	// }

	displayTournamentInfo(data) {
		console.debug(data);
		if (data.players.length >= 4) {
            document.getElementById('round0match0p0').textContent = data.matches[0].player1.pseudo;
            document.getElementById('round0match0p1').textContent = data.matches[0].player2.pseudo;
            document.getElementById('round0match1p0').textContent = data.matches[1].player1.pseudo;
            document.getElementById('round0match1p1').textContent = data.matches[1].player2.pseudo;
        } else {
            console.error("Not enough players");
        }
		if (data.finalists.length >= 2)
		{
			document.getElementById('round1match0p0').textContent = data.matches[0].winner.pseudo;
			document.getElementById('round1match0p1').textContent = data.matches[1].winner.pseudo;
		}
		if (data.winner.length >= 1)
		{
			document.getElementById('round2match0p0').textContent = data.matches[2].winner.pseudo;
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

	canvasTournament() {
		const canvas = document.getElementById('tournament-canvas');
		const ctx = canvas.getContext('2d');
		const container = document.querySelector('.tournament-container');
		
		document.getElementById('tournamentCode').textContent = `Tournament Code: ${sessionStorage.tournament_code}`;
		this.resizeCanvas(canvas, container);
		
		this.createParticipantElements(canvas, container);
		
		this.drawConnectingLines(ctx, canvas);

		window.addEventListener('resize', () => {
			this.resizeCanvas(canvas, container);
			this.createParticipantElements(canvas, container);
			this.drawConnectingLines(ctx, canvas);
		});
	}

	resizeCanvas(canvas, container) {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }

	drawLine(ctx, from, to) {
		ctx.beginPath();
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		ctx.stroke();
	}

	createParticipantElements(canvas, container) {
        container.querySelectorAll('.participant').forEach(el => el.remove());
        this.tournamentConfig.rounds.forEach((round, roundIndex) => {
            this.roundsMidpoints[roundIndex] = [];
            
            round.matches.forEach((match, matchIndex) => {
                // Création des éléments
                match.participants.forEach((participant, pIndex) => {
                    const el = document.createElement('div');
                    el.className = 'participant';
                    el.textContent = participant;
					el.id = `round${roundIndex}match${matchIndex}p${pIndex}`;
                    
                    // Positionnement horizontal
                    const x = match.position.x * canvas.width;
                    const y = match.position.y * canvas.height  + (pIndex === 0 ? -40 : 40);
                    
                    el.style.left = x + 'px';
                    el.style.top = y + 'px';
                    container.appendChild(el);
                });

                // Calcul du midpoint
                const midpoint = {
                    x: match.position.x * canvas.width,
                    y: match.position.y * canvas.height
                };
                this.roundsMidpoints[roundIndex][matchIndex] = midpoint;
            });
        });
    }

	drawConnectingLines(ctx, canvas) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
	
		// Coordonnées des matches (en proportion)
		const round1Match1 = { 
			x: this.tournamentConfig.rounds[0].matches[0].position.x * canvas.width, 
			y: this.tournamentConfig.rounds[0].matches[0].position.y * canvas.height 
		};
		const round1Match2 = { 
			x: this.tournamentConfig.rounds[0].matches[1].position.x * canvas.width, 
			y: this.tournamentConfig.rounds[0].matches[1].position.y * canvas.height 
		};
		const finalMatch = { 
			x: this.tournamentConfig.rounds[1].matches[0].position.x * canvas.width, 
			y: this.tournamentConfig.rounds[1].matches[0].position.y * canvas.height 
		};
		const winner = { 
			x: this.tournamentConfig.rounds[2].matches[0].position.x * canvas.width, 
			y: this.tournamentConfig.rounds[2].matches[0].position.y * canvas.height 
		};
	
		// 1. Lignes verticales entre participants
		// Match 1 Round 1
		this.drawLine(ctx, 
			{ x: round1Match1.x, y: round1Match1.y - 40 },
			{ x: round1Match1.x, y: round1Match1.y + 40 }
		);
		// Match 2 Round 1
		this.drawLine(ctx, 
			{ x: round1Match2.x, y: round1Match2.y - 40 },
			{ x: round1Match2.x, y: round1Match2.y + 40 }
		);
		// Finale
		this.drawLine(ctx, 
			{ x: finalMatch.x, y: finalMatch.y - 40 },
			{ x: finalMatch.x, y: finalMatch.y + 40 }
		);
	
		// 2. Connexions entre rounds
		// Round 1 Match 1 -> Finale
		this.drawLine(ctx, round1Match1, { x: (round1Match1.x + finalMatch.x)/2, y: round1Match1.y });
		this.drawLine(ctx, 
			{ x: (round1Match1.x + finalMatch.x)/2, y: round1Match1.y },
			{ x: (round1Match1.x + finalMatch.x)/2, y: finalMatch.y }
		);
		this.drawLine(ctx, 
			{ x: (round1Match1.x + finalMatch.x)/2, y: finalMatch.y },
			finalMatch
		);
	
		// Round 1 Match 2 -> Finale
		this.drawLine(ctx, round1Match2, { x: (round1Match2.x + finalMatch.x)/2, y: round1Match2.y });
		this.drawLine(ctx, 
			{ x: (round1Match2.x + finalMatch.x)/2, y: round1Match2.y },
			{ x: (round1Match2.x + finalMatch.x)/2, y: finalMatch.y }
		);
		this.drawLine(ctx, 
			{ x: (round1Match2.x + finalMatch.x)/2, y: finalMatch.y },
			finalMatch
		);
	
		// 3. Finale -> Gagnant (ligne directe)
		
		this.drawLine(ctx, finalMatch, { x: winner.x, y: winner.y - 40});
	}
	
}


new TournamentGame();