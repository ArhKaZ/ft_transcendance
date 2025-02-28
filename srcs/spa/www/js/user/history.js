import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

const divHistory = document.getElementById("history");

async function fetchHistory() {
	try {
		const response = await fetch('/api/get_history/', {
			method: 'GET',
			headers: {
				'Content-type' : 'application/json',
				'Authorization' : `Token ${sessionStorage.getItem('access_token')}`,
			}
		});
		
		if (response.ok) {
			console.log("get history call worked");
			const data = await response.json();

			const sortedData = data.reverse();
			// Génération du tableau HTML
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
    window.location.href = "/home/"; // ou une autre URL qui gère correctement l'accès
});

document.getElementById('logout-button').addEventListener('click', async () => {
	console.log('Logging out...');
	// Remove the token from sessionStorage
	localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('access_expires');
    localStorage.removeItem('refresh_expires');
    sessionStorage.removeItem('username');

	// Optional: Make a backend call to invalidate the token if needed
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