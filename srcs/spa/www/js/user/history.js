const divHistory = document.getElementById("history");

async function fetchHistory() {
	try {
		const response = await fetch('/api/get_history/', {
			method: 'GET',
			headers: {
				'Content-type' : 'application/json',
				'Authorization' : `Token ${sessionStorage.getItem('token_key')}`,
			}
		});
		
		if (response.ok) {
			console.log("get history call worked");
			const data =  await response.json();
			const historyHtml = data.map(item => `
				<p>Opponent: ${item.opponent_name}, Date: ${item.date}, Won: ${item.won ? "Yes" : "No"}</p>
			`).join('');
			divHistory.innerHTML = historyHtml;
		} else {
			console.log("Erreur lors de la récupération de l'historique :", response.status);
		}
	}
	catch {
		console.log("history call failed");
	}
}

fetchHistory();