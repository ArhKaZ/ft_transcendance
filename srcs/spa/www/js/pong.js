import { getCSRFToken, ensureValidToken } from '/js/utils.js';
import { router } from './router.js';

let cleanupFunctions = [];

export async function init() {
    const elements = {
        logoutButton: document.getElementById('logout-button'),
        returnButton: document.getElementById('return-button'),
        userAvatar: document.getElementById('user-avatar'),
        bottomBtns: document.getElementById('bottom-buttons'),
        welcomeMsg: document.getElementById('welcome-msg'),
        avatarImg: document.getElementById('user-avatar'),
        lps: document.getElementById('lps'),
        tournamentBtn: document.getElementById('tournament-button')
    };

    const handleLogout = async () => {
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
                sessionStorage.clear();
                router.navigateTo('/home/');
            } else {
                console.error('Logout failed:', await response.json());
            }
        } catch (error) {
            console.error('Network error during logout:', error);
            router.navigateTo('/home/');
        }
    };

    const handleReturnClick = () => router.navigateTo("/game/");
    const handleAvatarClick = () =>  router.navigateTo(`/user/profile/${sessionStorage.getItem('username')}/`);

    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', handleLogout);
        cleanupFunctions.push(() => elements.logoutButton.removeEventListener('click', handleLogout));
    }

    if (elements.returnButton) {
        elements.returnButton.addEventListener('click', handleReturnClick);
        cleanupFunctions.push(() => elements.returnButton.removeEventListener('click', handleReturnClick));
    }

    if (elements.userAvatar) {
        elements.userAvatar.addEventListener('click', handleAvatarClick);
        cleanupFunctions.push(() => elements.userAvatar.removeEventListener('click', handleAvatarClick));
    }

    try {
        await ensureValidToken();
        const response = await fetch('/api/get-my-info/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            credentials: 'include',
        });

        if (response.ok) {
            const userData = await response.json();
            updateUIForAuthenticatedUser(elements, userData);
        } else {
            updateUIForUnauthenticatedUser(elements);
            console.error('Error while fetching user info:', response);
        }
    } catch (error) {
        updateUIForUnauthenticatedUser(elements);
        console.error('Network error:', error);
    }

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}

function updateUIForAuthenticatedUser(elements, userData) {
    if (elements.welcomeMsg) elements.welcomeMsg.textContent = `Welcome, ${userData.username}`;
    if (elements.avatarImg) {
        elements.avatarImg.src = userData.avatar;
        elements.avatarImg.alt = 'avatar';
    }
    if (elements.lps) elements.lps.textContent = `League Points: ${userData.ligue_points}`;
    if (elements.bottomBtns) elements.bottomBtns.style.display = 'flex';
}

function updateUIForUnauthenticatedUser(elements) {
    const elementsToHide = [
        'bottom-buttons', 'logout-button', 'user-avatar',
        'tournament-button', 'localbtn', 'pongbtn',
        'historybtn', 'editbtn', 'pixelbtn', 'friendsbtn'
    ];

    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const userInfo = document.querySelector('.user-info');
    if (userInfo) userInfo.style.display = 'none';
}
