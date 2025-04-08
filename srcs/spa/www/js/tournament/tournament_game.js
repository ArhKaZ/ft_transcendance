import { sleep, getCSRFToken, ensureValidToken, getUserFromBack } from '/js/utils.js';
import { router } from '../router.js';

class TournamentGame {
    constructor() {
        this.tournamentCode = window.location.pathname.split('/').filter(Boolean)[2];
        this.players = [];
        this.currentPlayer;
        this.pollingInterval = null;
        this.cleanupFunctions = [];
		if (!this.tournamentCode) {
            console.error("No tournament code in URL");
            this.cleanupAndNavigate('/home/');
            return;
        }
        sessionStorage.setItem('tournament_code', this.tournamentCode);
        this.user = null;
        this.tournamentConfig = {
            rounds: [
                {
                    matches: [
                        { participants: ['Joueur 1', 'Joueur 2'], position: { x: 0.1, y: 0.3 }, nextMatch: 0 },
                        { participants: ['Joueur 3', 'Joueur 4'], position: { x: 0.1, y: 0.7 }, nextMatch: 0 }
                    ]
                },
                {
                    matches: [
                        { participants: ['Vainqueur 1', 'Vainqueur 2'], position: { x: 0.5, y: 0.5 }, nextMatch: null }
                    ]
                },
                {
                    matches: [
                        { participants: ['Champion'], position: { x: 0.9, y: 0.6 }, nextMatch: null }
                    ]
                }
            ]
        };
        this.roundsMidpoints = [];
    }

    async init() {
        try {
            this.user = await getUserFromBack();
            this.setupElements();
            this.setupEventListeners();

            sessionStorage.setItem('tournament_code', this.tournamentCode);

            if (await this.checkLeft(this.tournamentCode)) {
                this.cleanupAndNavigate('/home/');
                return;
            }
            await this.startTournamentPolling();
        } catch (error) {
            console.error("Initialization error:", error);
            this.displayError("Failed to initialize tournament");
        }
    }

    setupElements() {
        this.quitButton = document.getElementById('quit-button');
        this.messageDiv = document.getElementById('messageDiv');
    }

    setupEventListeners() {
        const handleQuit = () => this.quitTournament();
        const handleBeforeUnload = (event) => this.handleBeforeUnload(event);
        const handlePopState = (event) => this.handlePopState(event);

        if (this.quitButton) {
            this.quitButton.addEventListener('click', handleQuit);
            this.cleanupFunctions.push(() =>
                this.quitButton.removeEventListener('click', handleQuit)
            );
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        this.cleanupFunctions.push(() =>
            window.removeEventListener('beforeunload', handleBeforeUnload)
        );

        window.addEventListener('popstate', handlePopState);
        this.cleanupFunctions.push(() =>
            window.removeEventListener('popstate', handlePopState)
        );
    }

    cleanup() {
        this.stopTournamentPolling();
        this.cleanupFunctions.forEach(fn => fn());
        this.cleanupFunctions = [];
    }

    async startTournamentPolling() {
		let oldData = null;
		const user = await getUserFromBack();
		const isOnTournamentPage = () => {
			return window.location.pathname.includes('/tournament/game/');
		};
	
		const isDataDifferent = (a, b) => { 
            console.debug('both :', JSON.stringify(a), JSON.stringify(b));
            return (JSON.stringify(a) !== JSON.stringify(b));
        }
		
		this.pollingInterval = setInterval(async () => {
			try {
				if (!isOnTournamentPage()) {
					this.stopTournamentPolling();
					return;
				}
	
				const data = await this.tournamentPlayers();
				
				if (!oldData || isDataDifferent(data, oldData)) {
                    this.canvasTournament();
					this.displayTournamentInfo(data);
					
					if (sessionStorage.getItem('finalDone') || data.winner?.length > 0) {
						await this.handleTournamentEnd(data, user);
						return;
					}
					if (data.finalists?.length > 0) {
						const inFinal = this.verifUserInFinal(data);
						if (inFinal) {
							this.stopTournamentPolling();
							this.cleanupAndNavigate('/onlinePong/?tournament=true');
							return;
						}
					}
					else if (this.verifUserNeedPlay(data)) {
						this.stopTournamentPolling();
						this.cleanupAndNavigate('/onlinePong/?tournament=true');
						return;
					}
				}
				
				oldData = data;
			} catch (error) {
				console.error("Polling error:", error);
				this.stopTournamentPolling();
			}
		}, 3000);
	}

    stopTournamentPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async handleTournamentEnd(data) {
        this.stopTournamentPolling();
        
        if (data.winner[0]?.id === this.user.id) {
            await this.recordMatch();
        }
        
        this.cleanupSessionStorage();
    }

    cleanupSessionStorage() {
        ['asWin', 'tournament_code', 'finalDone', 'inFinal'].forEach(key => {
            sessionStorage.removeItem(key);
        });
    }

    cleanupAndNavigate(path) {
        this.cleanup();
        router.navigateTo(path);
    }

    handleBeforeUnload(event) {
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
                headers: this.getAuthHeaders()
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
        try {
            await ensureValidToken();
            await fetch(`/api/forfeit_tournament/${this.tournamentCode}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } finally {
            this.cleanupAndNavigate('/home/', true);
        }
    }

    async tournamentPlayers() {
        try {
            await ensureValidToken();
            const response = await fetch(`/api/tournament/${this.tournamentCode}/tournament_players/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

        
            if (!response.ok) {
                throw new Error('Failed to load tournament data');
            }
            return await response.json();
        } catch (error) {
            console.error('error : ', error);
        }
    }

    verifUserInFinal(data) {
        const isFinalist = data.finalists.some(finalist => finalist.id === this.user.id);
        if (!isFinalist) { 
            return false;
        }

        const canPlay = data.matches.every(match => {
            if (match.is_final) return true;
            return match.winner != null || match.score != null;
        });

        if (canPlay) {
            sessionStorage.setItem('inFinal', 'true');
            return true;
        }
        return false;
    }

    verifUserNeedPlay(data) {
        return data.matches.some(match => {
            return match.winner === null &&
                  (match.player1.id === this.user.id || match.player2.id === this.user.id);
        });
    }

    displayTournamentInfo(data) {
        if (data.players.length >= 4) {
            document.getElementById('round0match0p0').textContent = data.matches[0].player1.pseudo;
            document.getElementById('round0match0p1').textContent = data.matches[0].player2.pseudo;
            document.getElementById('round0match1p0').textContent = data.matches[1].player1.pseudo;
            document.getElementById('round0match1p1').textContent = data.matches[1].player2.pseudo;
        } else {
            console.error("Not enough players");
        }
        if (data.finalists.length >= 2) {
            document.getElementById('round1match0p0').textContent = data.matches[0].winner.pseudo;
            document.getElementById('round1match0p1').textContent = data.matches[1].winner.pseudo;
        }
        if (data.winner.length >= 1) {
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
                match.participants.forEach((participant, pIndex) => {
                    const el = document.createElement('div');
                    el.className = 'participant';
                    el.textContent = participant;
                    el.id = `round${roundIndex}match${matchIndex}p${pIndex}`;

                    const x = match.position.x * canvas.width;
                    const y = match.position.y * canvas.height + (pIndex === 0 ? -40 : 40);

                    el.style.left = x + 'px';
                    el.style.top = y + 'px';
                    container.appendChild(el);
                });

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

        this.drawLine(ctx,
            { x: round1Match1.x, y: round1Match1.y - 40 },
            { x: round1Match1.x, y: round1Match1.y + 40 }
        );

        this.drawLine(ctx,
            { x: round1Match2.x, y: round1Match2.y - 40 },
            { x: round1Match2.x, y: round1Match2.y + 40 }
        );

        this.drawLine(ctx,
            { x: finalMatch.x, y: finalMatch.y - 40 },
            { x: finalMatch.x, y: finalMatch.y + 40 }
        );

        this.drawLine(ctx, round1Match1, { x: (round1Match1.x + finalMatch.x) / 2, y: round1Match1.y });
        this.drawLine(ctx,
            { x: (round1Match1.x + finalMatch.x) / 2, y: round1Match1.y },
            { x: (round1Match1.x + finalMatch.x) / 2, y: finalMatch.y }
        );
        this.drawLine(ctx,
            { x: (round1Match1.x + finalMatch.x) / 2, y: finalMatch.y },
            finalMatch
        );

        this.drawLine(ctx, round1Match2, { x: (round1Match2.x + finalMatch.x) / 2, y: round1Match2.y });
        this.drawLine(ctx,
            { x: (round1Match2.x + finalMatch.x) / 2, y: round1Match2.y },
            { x: (round1Match2.x + finalMatch.x) / 2, y: finalMatch.y }
        );
        this.drawLine(ctx,
            { x: (round1Match2.x + finalMatch.x) / 2, y: finalMatch.y },
            finalMatch
        );

        this.drawLine(ctx, finalMatch, { x: winner.x, y: winner.y - 40 });
    }

    async recordMatch() {
        try {
            await ensureValidToken();
            await fetch(`/api/record_match/${this.tournamentCode}/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error in record_match API call:", error);
        }
    }

    displayError(message) {
        const container = document.querySelector('.tournament-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                </div>
            `;
        }
    }

    getAuthHeaders(contentType = 'application/json') {
        const headers = {
            'X-CSRFToken': getCSRFToken(),
            'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
        };

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        return headers;
    }
}

let tournamentGame;

export async function init() {
    tournamentGame = new TournamentGame();
    await tournamentGame.init();
}

export async function cleanup() {
    if (tournamentGame) {
        tournamentGame.cleanup();
        tournamentGame = null;
    }
}