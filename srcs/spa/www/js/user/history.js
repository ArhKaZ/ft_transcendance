import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

const divHistory = document.getElementById("history");

async function fetchHistory() {
	try {
		await ensureValidToken();
		const response = await fetch('/api/get_history/', {
			method: 'GET',
			headers: {
				'Content-type' : 'application/json',
				'Authorization' : `Bearer ${sessionStorage.getItem('access_token')}`,
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
    try {
		await ensureValidToken();
        const response = await fetch('/api/logout/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            },
            credentials: 'include',
        });

        if (response.ok) {
            // Clear all client-side storage
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
            sessionStorage.removeItem('access_expires');
            sessionStorage.removeItem('refresh_expires');
            sessionStorage.clear();
            
            // Redirect to login
            window.location.href = '/home/';
        } else {
            console.error('Logout failed:', await response.json());
        }
    } catch (error) {
        console.error('Network error during logout:', error);
        window.location.href = '/home/';
    }
});

fetchHistory();