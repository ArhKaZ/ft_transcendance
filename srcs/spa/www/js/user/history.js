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
            const data = await response.json();

            const sortedData = data.reverse().slice(0, 5);

            const table = document.createElement('table');
            table.className = 'history-table';

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Mode</th>
                    <th>Results</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            sortedData.forEach(item => {
                const row = document.createElement('tr');

                const dateCell = document.createElement('td');
                dateCell.textContent = item.date;
                row.appendChild(dateCell);

                const opponentCell = document.createElement('td');
                opponentCell.textContent = item.opponent_name;
                row.appendChild(opponentCell);

                const typeCell = document.createElement('td');
                typeCell.textContent = item.type;
                row.appendChild(typeCell);

                const resultCell = document.createElement('td');
                resultCell.textContent = item.won ? "Won" : "Lost";
                row.appendChild(resultCell);

                tbody.appendChild(row);
            });

            table.appendChild(tbody);

            const historyDiv = document.getElementById('history');
            if (historyDiv) {
                historyDiv.innerHTML = ''; 
                historyDiv.appendChild(table);
            } else {
                console.error("History div not found");
            }
		} else {
		}
	} catch (error) {
		console.error("History call failed", error);
	}
}


document.getElementById('return-button').addEventListener('click', () => {
    routeur.navigateTo('/home/'); 
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
            
            
            routeur.navigateTo('/home/');
        } else {
            console.error('Logout failed:', await response.json());
        }
    } catch (error) {
        console.error('Network error during logout:', error);
        routeur.navigateTo('/home/');
    }
});

fetchHistory();