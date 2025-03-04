import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

const divHistory = document.getElementById("history");

async function fetchHistory() {
	try {
		await ensureValidToken();
		const response = await fetch('/api/get_history/', {
			method: 'GET',
			headers: {
				'Content-type': 'application/json',
				'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
			}
		});

		if (response.ok) {
			console.log("Get history call worked");
			const data = await response.json();

			const sortedData = data.reverse();
			const table = document.createElement("table");
			table.classList.add("history-table");

			// Create the header
			const thead = document.createElement("thead");
			thead.innerHTML = `
				<tr>
					<th>Date</th>
					<th>Opponent</th>
					<th>Mode</th>
					<th>Result</th>
				</tr>
			`;
			table.appendChild(thead);

			// Create the body
			const tbody = document.createElement("tbody");
			sortedData.forEach(item => {
				const tr = document.createElement("tr");

				const tdDate = document.createElement("td");
				tdDate.textContent = item.date;

				const tdOpponent = document.createElement("td");
				tdOpponent.textContent = item.opponent_name;

				const tdMode = document.createElement("td");
				tdMode.textContent = item.type;

				const tdResult = document.createElement("td");
				tdResult.textContent = item.won ? "Won" : "Lost";

				tr.appendChild(tdDate);
				tr.appendChild(tdOpponent);
				tr.appendChild(tdMode);
				tr.appendChild(tdResult);

				tbody.appendChild(tr);
			});
			table.appendChild(tbody);

			// Safely append to the div
			const divHistory = document.getElementById("divHistory");
			divHistory.innerHTML = ""; // Clear previous content safely
			divHistory.appendChild(table);

		} else {
			console.log("Error fetching history:", response.status);
		}
	} catch (error) {
		console.log("History call failed", error);
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