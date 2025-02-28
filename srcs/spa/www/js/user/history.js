import { getCSRFToken } from '/js/utils.js';

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
			const data = await response.json();

			const sortedData = data.reverse();
			let historyHtml = `
				<table class="history-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Adversaire</th>
							<th>Mode</th>
							<th>Résultat</th>
						</tr>
					</thead>
					<tbody>
			`;
			
			sortedData.forEach(item => {
				historyHtml += `
					<tr>
						<td>${item.date}</td>
						<td>${item.opponent_name}</td>
						<td>${item.type}</td>
						<td>${item.won ? "Gagné" : "Perdu"}</td>
					</tr>
				`;
			});
			
			historyHtml += `
					</tbody>
				</table>
			`;
			
			divHistory.innerHTML = historyHtml;
		} else {
			console.log("Erreur lors de la récupération de l'historique :", response.status);
		}
	} catch (error) {
		console.log("history call failed", error);
	}
}

document.getElementById('return-button').addEventListener('click', () => {
    window.location.href = "/home/"; 
});

document.getElementById('logout-button').addEventListener('click', async () => {
	console.log('Logging out...');

	sessionStorage.removeItem('token_key');

	const response = await fetch('/api/logout/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken(),
		},
		credentials: 'include',
	});

	if (response.ok) {
		console.log('Logged out successfully');
	} else {
		console.error('Error logging out:', response);
	}
	window.location.href = "/home/";
});

fetchHistory();