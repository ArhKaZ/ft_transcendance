import Web3 from 'web3';

function parseTournamentData(data) {
    let tournamentCode = data.tournament_code || "";
    
    let players = data.players ? data.players.map(player => player.pseudo) : [];
    let finalists = data.finalists ? data.finalists.map(finalist => finalist.pseudo) : [];
    let winner = data.winner && data.winner.length > 0 ? data.winner[0].pseudo : "";

    return { tournamentCode, players, finalists, winner };
}
