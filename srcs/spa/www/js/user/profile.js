import { getCSRFToken } from '../utils.js';
import { ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';

let selectedBadgeSlot = null;


const goToPong = async (username) => {
	const response = await api_get_profile(username);		
	const data = await response.json();
	if (data.game_mode === 'Pong' && data.is_waiting_for_game)
		router.navigateTo('/onlinePong/');
	else if (!data.game_mode || !data.is_waiting_for_game){
		const action = document.getElementById('action-container');
		const profileHeader = document.getElementById('profile-header');
		action.style.display = 'none';
		let error = document.createElement('span');
		error.innerText = "Friend no more joinable";
		error.style.color = 'Red';
		profileHeader.appendChild(error);
	}
}

const goToMD = async (username) => {
	const response = await api_get_profile(username);	
	const data = await response.json();
	if (data.game_mode === 'MagicDuel' && data.is_waiting_for_game)
		router.navigateTo('/magicDuel/');
	else if (!data.game_mode || !data.is_waiting_for_game){
		const action = document.getElementById('action-container');
		const profileHeader = document.getElementById('profile-header');
		action.style.display = 'none';
		let error = document.createElement('span');
		error.innerText = "Friend no more joinable";
		error.style.color = 'Red';
		profileHeader.appendChild(error);
	}
}

const goToTournament = async (username) => {
	const response = await api_get_profile(username);		
	const data = await response.json();
	if (data.code_current_tournament && !data.tournament_start)
		router.navigateTo('/tournament/');
	else if (!data.is_in_tournament || data.tournament_start){
		const action = document.getElementById('action-container');
		const profileHeader = document.getElementById('profile-header');
		action.style.display = 'none';
		let error = document.createElement('span');
		error.innerText = "Friend no more joinable";
		error.style.color = 'Red';
		profileHeader.appendChild(error);
	}
}

export async function init() {
	document.getElementById('return-button').addEventListener('click', () => {
		window.history.back();
	});
	
	fetch_user();
}

async function isUserFriend(userName) {
	try {
		await ensureValidToken();
		const response = await fetch('/api/get_friends/', {
			method: 'GET',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
			}
		});

		if (!response.ok) {
			console.error("Error while fetching friends");
			return false;
		}

		const data = await response.json();
		if (!Array.isArray(data)) {
			console.error("Friends format is incorrect:", data);
			return false;
		}

		const friendNames = data.map(friend => friend.username || friend.name);

		return friendNames.includes(userName);
	} catch (error) {
		console.error("Failed fetching friends", error);
		return false;
	}
}
async function isFriendRequestPending(userName) {
	try {
		await ensureValidToken();
		const response = await fetch(`/api/get_pending_friends_another/${userName}/`, {
			method: 'GET',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
			},
		});

		if (!response.ok) {
			console.error("Error while trying to fetch pending friend requests");
			return false;
		}

		const data = await response.json();
		if (!Array.isArray(data)) {
			console.error("Incorrect format for pending friends:", data);
			return false;
		}

		const currentUser = sessionStorage.getItem('username');
		
		return data.some(user => user.username === currentUser);
	} catch (error) {
		console.error("Failed to fetch pending friend requests", error);
		return false;
	}
}

async function api_get_profile(userName) {
	const response = await fetch(`/api/user/profile/${userName}/`, {
		method: 'GET',
		headers: {
			'Content-type': 'application/json',
			'X-CSRFToken': getCSRFToken(),
			'Authorization' : `Bearer ${sessionStorage.getItem('access_token')}`,
		}
	});
	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('User not found');
		}
		throw new Error('Failed to fetch user data');
	}
	return response;
}

async function fetch_user() {
	const pathSegments = window.location.pathname.split('/');
	const userName = pathSegments[3];
	const currentUser = sessionStorage.getItem('username');
    const isOwnProfile = userName === currentUser;
	try {
		await ensureValidToken();
		const response = await api_get_profile(userName);		
		const data = await response.json();
		document.getElementById('username').textContent = data.username;
		document.getElementById('user-pseudo').textContent = data.pseudo;
		document.getElementById('ligue-points').textContent = data.ligue_points;
		document.getElementById('user-description').textContent = data.description || "No description provided";
		document.getElementById('user-avatar').src = data.avatar || '/avatars/default.png';
		document.getElementById('user-wins').textContent = data.wins;
		document.getElementById('user-looses').textContent = data.looses;

		const avatarContainer = document.querySelector('.avatar-container');
        if (!isOwnProfile) {
            avatarContainer.classList.add('not-mine');
        } else {
            avatarContainer.classList.remove('not-mine');
        }
		
		if (data.username === sessionStorage.getItem('username')) {
			const modifBtn = document.getElementById('modif-btn');
			modifBtn.style.display = 'block';
			modifBtn.onclick = () => router.navigateTo('/user/edit_user/')	
		}


		await updateFriendButton(userName);

		const wins = parseInt(data.wins, 10) || 0;
		const looses = parseInt(data.looses, 10) || 0;
		let winrate = wins + looses > 0 ? (wins / (wins + looses)) * 100 : 0;

		const winrateSpan = document.getElementById('user-winrate');
		winrateSpan.textContent = `${winrate.toFixed(2)}%`;

		winrateSpan.classList.remove("green", "red");
		winrateSpan.classList.add(winrate > 49 ? "green" : "red");
		if (await isUserFriend(data.username)) {
			if (data.is_in_tournament || data.game_mode) {
				joinButton(data);
			}
		}
		setupBadgeModal(data.username);
		fetchActiveBadges();
		fetchHistory();
		
	} catch (error) {
		console.error("API call failed", error);
		router.handReload('/user_not_found/');
		return ;
	}
}

function joinButton(data) {
	let profile = document.getElementById('profile-header');
	let action = document.createElement('div');
	let header = document.createElement('div');
	header.innerHTML = 'Status:';
	header.classList.add('head-text');
	action.appendChild(header);
	action.classList.add('action-section');
	action.id = 'action-container';

	let currentAction = document.createElement('span');
	let button = null;
	if (data.game_mode) {
		if (data.is_waiting_for_game) {
			currentAction.innerText = `wait for a ${data.game_mode} game`;
			button = document.createElement('button');
			button.innerText = 'Join';
		} else {
			currentAction.innerText = `playing in a ${data.game_mode} game`;
		}
	} else {
		if (!data.tournament_start) {
			currentAction.innerText = `wait for ${data.code_current_tournament} tournament to start`;
			button = document.createElement('button');
			button.innerText = 'Join';
		} else {
			currentAction.innerText = `playing in ${data.code_current_tournament} tournament`;
		}
	}
	action.appendChild(currentAction);
	if (button) {
		button.classList.add('buttons');
		button.id = 'join-button';
		addListener(button, data);
		action.appendChild(button);
	}
	profile.appendChild(action);
}

function addListener(button, data) {
	if (data.game_mode) {
		if (data.game_mode === 'Pong') {
			button.addEventListener('click', () => goToPong(data.username));
		} else if (data.game_mode === 'MagicDuel') {
			button.addEventListener('click', () => goToMD(data.username));
		}
	} else if (data.code_current_tournament) {
		sessionStorage.setItem('tournament_code_from_profile', data.code_current_tournament);
		button.addEventListener('click',() => goToTournament(data.username));
	}
}

async function removeFriend(userName) {
	const removeFriendBtn = document.getElementById('remove-friend-btn');
	try {
		await ensureValidToken();
		const response = await fetch('/api/remove_friend/', {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
			},
			body: JSON.stringify({ 'friend_name': userName })
		});

		if (response.ok) {
			removeFriendBtn.style.display = 'none';
			removeFriendBtn.onclick = null;
			await updateFriendButton(userName);
			return;
		} else {
			const data = await response.json();
			displayMessage(data.error, 'error');
			await updateFriendButton(userName);
			console.error("Error while trying to remove a friend :", data.error || response.status);
		}
	} catch (error) {
		displayMessage('A network error occurred.', 'error');
		console.error("Failed to remove a friend", error);
	}
}

async function addFriend(userName) {
	const addFriendBtn = document.getElementById('add-friend-btn');

	try {
		await ensureValidToken();
		const response = await fetch('/api/add_friend/', {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
				'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
			},
			body: JSON.stringify({ 'friend_name': userName })
		});

		if (response.ok) {
			await updateFriendButton(userName);
			return;
		} else {
			const data = await response.json();
			console.error("Error while trying to add a friend :", data.error || response.status);
		}
	} catch (error) {
		console.error("Failed adding a friend", error);
	}
}

async function updateFriendButton(userName) {
	const addFriendBtn = document.getElementById('add-friend-btn');
	const currentUser = sessionStorage.getItem('username');
	const removeFriendBtn = document.getElementById('remove-friend-btn');
	if (currentUser === userName) {
		addFriendBtn.style.display = 'none';
		return;
	}

	const isFriend = await isUserFriend(userName);
	const isPending = await isFriendRequestPending(userName);

	if (isFriend) {
		removeFriendBtn.style.display = 'block';
		removeFriendBtn.onclick = () => removeFriend(userName);
	}
	if (isFriend || isPending) {
		addFriendBtn.src = isFriend ? "/css/ico/friend_added_ico.png" : "/css/ico/friend_pending_ico.png";
		addFriendBtn.classList.add("disabled");
		addFriendBtn.onclick = null;
	} else {
		removeFriendBtn.style.display = 'none';
		addFriendBtn.src = "/css/ico/add_friend_ico.png";
		addFriendBtn.classList.remove("disabled");
		addFriendBtn.onclick = () => addFriend(userName);
	}
}

async function fetchHistory() {
	const pathSegments = window.location.pathname.split('/');
	const userName = pathSegments[3];
	try {
		await ensureValidToken();
		const response = await fetch(`/api/user/profile/get_history/${userName}/`, {
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
		}
	} catch (error) {
		console.error("History call failed", error);
	}
}

async function fetchAndDisplayBadges(currentBadgeAlt) {
  try {
    await ensureValidToken();
    const response = await fetch('/api/list_badge/', {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
      }
    });

    if (!response.ok) {
      console.error("Error while fetching badges");
      return;
    }

    const data = await response.json();
    displayBadgesInModal(data.badges, currentBadgeAlt);
  } catch (error) {
    console.error("Failed fetching badges", error);
  }
}

function displayBadgesInModal(badges, currentBadgeAlt) {
	const badgeCollection = document.getElementById('badge-collection');
	badgeCollection.innerHTML = '';
  
	if (badges.length === 0) {
	  badgeCollection.innerHTML = `
      <div class="no-badges-message">
        <h3>No badges yet!</h3>
      </div>
    `;
	  return;
	}
  
	badges.forEach(badge => {
	  const badgeItem = document.createElement('div');
	  badgeItem.className = 'badge-item';
	  badgeItem.innerHTML = `
		<img src="${badge.image}" alt="${badge.name}" title="${badge.description}">
		<p>${badge.name}</p>
	  `;
	  badgeItem.addEventListener('click', () => selectBadgeForSlot(badge, currentBadgeAlt));
	  badgeCollection.appendChild(badgeItem);
	});
  }

function selectBadgeForSlot(badge, currentBadgeAlt) {
	if (!selectedBadgeSlot) return;
	updateActiveBadge(selectedBadgeSlot.dataset.slotIndex, badge.name, currentBadgeAlt);

	document.getElementById('badge-modal').style.display = 'none';
	selectedBadgeSlot = null;
}

async function updateActiveBadge(slotIndex, badgeName, currentBadgeAlt) {
  try {
    await ensureValidToken();
    const response = await fetch('/api/change_active_badge/', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({
        old_badge_name: currentBadgeAlt,
        new_badge_name: badgeName
      })
    });

    if (!response.ok) {
      console.error("Error while updating active badge");
      return;
    }

    fetchActiveBadges();
  } catch (error) {
    console.error("Failed updating active badge", error);
  }
}

async function fetchActiveBadges() {
  try {
	const pathSegments = window.location.pathname.split('/');
    const userName = pathSegments[3];

    await ensureValidToken();
    const response = await fetch(`/api/list_active_badge/${userName}/`, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
      }
    });

    if (!response.ok) {
      console.error("Error while fetching active badges");
      return;
    }

    const data = await response.json();
    updateDisplayedActiveBadges(data.actives_badges);
  } catch (error) {
    console.error("Failed fetching active badges", error);
  }
}

function updateDisplayedActiveBadges(activeBadges) {
	const badgeButtons = document.querySelectorAll('.profile-badge');
	const pathSegments = window.location.pathname.split('/');
    const userName = pathSegments[3];
    const currentUser = sessionStorage.getItem('username');
    const isOwnProfile = userName === currentUser;
	
	badgeButtons.forEach(button => {
	  const badgeImg = button.querySelector('img');
	  badgeImg.src = '/css/ico/badge_placeholder.png';
	  badgeImg.alt = 'Badge placeholder';
	  if (!isOwnProfile) {
		button.classList.add('not-mine');
	} else {
		button.classList.remove('not-mine');
	}
	});
  
	activeBadges.forEach((badge, index) => {
        if (index < badgeButtons.length) {
            const badgeImg = badgeButtons[index].querySelector('img');
            if (badge.image.startsWith('data:image')) {
                badgeImg.src = badge.image;
            } else {
                badgeImg.src = badge.image.startsWith('/') ? badge.image : `/${badge.image}`;
            }
            badgeImg.alt = badge.name;
        }
    });
  }

function setupBadgeModal(username) {
  const modal = document.getElementById('badge-modal');
  const closeBtn = document.querySelector('.close');
  const badgeButtons = document.querySelectorAll('.profile-badge');

  if (username === sessionStorage.getItem('username')) {
	badgeButtons.forEach((button, index) => {
		button.dataset.slotIndex = index;
		button.addEventListener('click', () => {
			selectedBadgeSlot = button;
			const badgeImg = button.querySelector('img');
			const currentBadgeAlt = badgeImg.alt;
			fetchAndDisplayBadges(currentBadgeAlt);
			modal.style.display = 'block';
			});
		});
  	} else {
		badgeButtons.forEach(button => {
		  button.style.cursor = 'default';
		  button.onclick = null;
		});
	}
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    selectedBadgeSlot = null;
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
      selectedBadgeSlot = null;
    }
  });
}

function displayMessage(message, type) {
	const messageDiv = document.getElementById('message');
	if (messageDiv) {
		messageDiv.innerHTML = message;
		messageDiv.style.color = type === 'error' ? 'red' : 'green';
	} else {
		console.error('Message div not found');
	}
}