import { getCSRFToken, ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';

let cleanupFunctions = [];

export async function init() {
    // Initialisation des éléments
    const returnButton = document.getElementById('return-button');
    const logoutButton = document.getElementById('logout-button');
    const historyDiv = document.getElementById('history');

    // Handlers d'événements
    const handleReturnClick = () => router.navigateTo('/home/');
    const handleLogout = async () => {
        await performLogout();
    };

    // Ajout des listeners
    if (returnButton) {
        returnButton.addEventListener('click', handleReturnClick);
        cleanupFunctions.push(() => returnButton.removeEventListener('click', handleReturnClick));
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
        cleanupFunctions.push(() => logoutButton.removeEventListener('click', handleLogout));
    }

    // Chargement de l'historique
    try {
        await loadHistory();
    } catch (error) {
        console.error("Failed to initialize history:", error);
        displayHistoryError();
    }

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}

// Fonctions métier
async function loadHistory() {
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
            renderHistory(data);
        } else {
            throw new Error('Failed to fetch history');
        }
    } catch (error) {
        console.error("History load failed:", error);
        throw error;
    }
}

function renderHistory(historyData) {
    const sortedData = historyData.reverse().slice(0, 5);
    const historyDiv = document.getElementById('history');
    
    if (!historyDiv) {
        console.error("History div not found");
        return;
    }

    // Création du tableau
    const table = document.createElement('table');
    table.className = 'history-table';

    // En-tête du tableau
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

    // Corps du tableau
    const tbody = document.createElement('tbody');
    sortedData.forEach(item => {
        const row = document.createElement('tr');
        
        [
            item.date,
            item.opponent_name,
            item.type,
            item.won ? "Won" : "Lost"
        ].forEach(text => {
            const cell = document.createElement('td');
            cell.textContent = text;
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Mise à jour du DOM
    historyDiv.innerHTML = '';
    historyDiv.appendChild(table);
}

async function performLogout() {
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
            clearSessionStorage();
            router.navigateTo('/home/');
        } else {
            console.error('Logout failed:', await response.json());
            displayMessage('Logout failed', 'error');
        }
    } catch (error) {
        console.error('Network error during logout:', error);
        router.navigateTo('/home/');
    }
}

function clearSessionStorage() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_expires');
    sessionStorage.removeItem('refresh_expires');
    sessionStorage.clear();
}

function displayHistoryError() {
    const historyDiv = document.getElementById('history');
    if (historyDiv) {
        historyDiv.innerHTML = '<p class="error">Failed to load history</p>';
    }
}

function displayMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.color = type === 'error' ? 'red' : 'green';
    }
}