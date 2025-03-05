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
            console.log("get history call worked");
            const data = await response.json();

            const sortedData = data.reverse().slice(0, 5);

            // Create the table element
            const table = document.createElement('table');
            table.className = 'history-table';

            // Create the table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Date</th>
                    <th>Adversaire</th>
                    <th>Mode</th>
                    <th>Résultat</th>
                </tr>
            `;
            table.appendChild(thead);

            // Create the table body
            const tbody = document.createElement('tbody');
            sortedData.forEach(item => {
                const row = document.createElement('tr');

                // Create and append the date cell
                const dateCell = document.createElement('td');
                dateCell.textContent = item.date; // Safe
                row.appendChild(dateCell);

                // Create and append the opponent cell
                const opponentCell = document.createElement('td');
                opponentCell.textContent = item.opponent_name; // Safe
                row.appendChild(opponentCell);

                // Create and append the type cell
                const typeCell = document.createElement('td');
                typeCell.textContent = item.type; // Safe
                row.appendChild(typeCell);

                // Create and append the result cell
                const resultCell = document.createElement('td');
                resultCell.textContent = item.won ? "Gagné" : "Perdu"; // Safe
                row.appendChild(resultCell);

                // Append the row to the table body
                tbody.appendChild(row);
            });

            // Append the table body to the table
            table.appendChild(tbody);

            // Insert the table into the history div
            const historyDiv = document.getElementById('history');
            if (historyDiv) {
                historyDiv.innerHTML = ''; // Clear existing content
                historyDiv.appendChild(table); // Append the new table
            } else {
                console.error("History div not found");
            }
		} else {
			console.log("Error fetching history:", response.status);
		}
	} catch (error) {
		console.error("History call failed", error);
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
            
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
            sessionStorage.removeItem('access_expires');
            sessionStorage.removeItem('refresh_expires');
            sessionStorage.clear();
            
            
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