import { getCSRFToken } from '/js/utils.js';

document.getElementById('logout-button').addEventListener('click', async () => {
	console.log('Logging out...');
    // Remove the token from sessionStorage
    sessionStorage.removeItem('token_key');

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

    // Reload the page
    window.location.reload();
});


document.getElementById('erase-button').addEventListener('click', async () => {
	console.log('Erasing...');
    // Remove the token from sessionStorage
    
    // Optional: Make a backend call to invalidate the token if needed
    const response = await fetch('/api/erase/', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
        },
        credentials: 'include',
    });
    sessionStorage.removeItem('token_key');

    if (response.ok) {
        console.log('Erased successfully');
    } else {
        console.error('Error erasing:', response);
    }

    // Reload the page
    window.location.reload();
});

document.getElementById('loseLp').addEventListener('click', async () => {
	fetch('/api/change_lp/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
            'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
        },
        credentials: 'include',
        body: JSON.stringify({
            'won': false
        })
    }).then(response => response.json())
	.then(data => {
		const lps = document.getElementById('lps').innerText = `Ligue Points: ${data}`;
	});
})

document.getElementById('user-avatar').addEventListener('click', () => {
    window.location.href = "/user/edit_user/";
});


document.getElementById('addLp').addEventListener('click', async () => {
	fetch('/api/change_lp/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
            'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
        },
        credentials: 'include',
        body: JSON.stringify({
            'won': true
        })
    }).then(response => response.json())
	.then(data => {
		const lps = document.getElementById('lps').innerText = `Ligue Points: ${data}`;
	});
})

const response = await fetch('/api/get-my-info/', {
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
		'X-CSRFToken': getCSRFToken(),
		'Authorization': `Token ${sessionStorage.getItem('token_key')}`,
	},
	credentials: 'include',
});

if (response.ok) {
	const data = await response.json();
	console.log(data);

	const loginbtn = document.getElementById('login-button');
	const registerbtn = document.getElementById('register-button');
	const bottomBtns = document.getElementById('bottom-buttons');


	bottomBtns.style.display = 'flex';
	loginbtn.style.display = 'none';
	registerbtn.style.display = 'none';

	const welcomemsg = document.getElementById('welcome-msg');
	welcomemsg.innerText = `Bienvenue, ${data.username} !`;
	const avatarImg = document.getElementById('user-avatar');
	avatarImg.src = data.avatar;
	avatarImg.alt = 'avatar';
	const lps = document.getElementById('lps');
	lps.innerText += data.ligue_points;
} else {
	const bottomBtns = document.getElementById('bottom-buttons')
	// const localbtn = document.getElementById('local-button');
	const gamebtn = document.getElementById('Game-button');
	const historybtn = document.getElementById('history-button');
	const logoutbtn = document.getElementById('logout-button');

	// const editbtn = document.getElementById('edit-button');
	// const pixelbtn = document.getElementById('pixel-button');

	const erasebtn = document.getElementById('erase-button');

	const friendsbtn = document.getElementById('friend-button');
	const avatarImg = document.getElementById('user-avatar');
	const tournamentbtn = document.getElementById('tournament-button');

	bottomBtns.style.display = 'none';
	// localbtn.style.display = 'none';
	gamebtn.style.display = 'none';
	historybtn.style.display = 'none';
	logoutbtn.style.display = 'none';

	erasebtn.style.display = 'none';
	friendsbtn.style.display = 'none';
	avatarImg.style.display = 'none';
	tournamentbtn.style.display = 'none';

	
	console.error('Erreur lors de la requête de récupération des informations :', response);
}