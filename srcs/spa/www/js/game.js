import { getCSRFToken, ensureValidToken } from '/js/utils.js';
import { router } from './router.js';

let cleanupFunctions = [];

export async function init() {
    const elements = {
        logoutButton: document.getElementById('logout-button'),
        userAvatar: document.getElementById('user-avatar'),
        returnButton: document.getElementById('return-button'),
        bottomBtns: document.getElementById('bottom-buttons'),
        welcomeMsg: document.getElementById('welcome-msg'),
        avatarImg: document.getElementById('user-avatar'),
        lps: document.getElementById('lps'),
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

    const handleAvatarClick = () => router.navigateTo(`/user/profile/${sessionStorage.getItem('username')}/`);
    const handleReturnClick = () => router.navigateTo("/home/");

    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', handleLogout);
        cleanupFunctions.push(() => elements.logoutButton.removeEventListener('click', handleLogout));
    }

    if (elements.userAvatar) {
        elements.userAvatar.addEventListener('click', handleAvatarClick);
        cleanupFunctions.push(() => elements.userAvatar.removeEventListener('click', handleAvatarClick));
    }

    if (elements.returnButton) {
        elements.returnButton.addEventListener('click', handleReturnClick);
        cleanupFunctions.push(() => elements.returnButton.removeEventListener('click', handleReturnClick));
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
            const data = await response.json();
            updateUserInterface(elements, data, true);
        } else {
            updateUserInterface(elements, null, false);
            console.error('Error while fetching informations:', response);
        }
    } catch (error) {
        updateUserInterface(elements, null, false);
        console.error('Network error:', error);
    }

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}

function updateUserInterface(elements, userData, isAuthenticated) {
    if (isAuthenticated && userData) {
        if (elements.welcomeMsg) elements.welcomeMsg.textContent = `Welcome, ${userData.username}`;
        if (elements.avatarImg) {
            elements.avatarImg.src = userData.avatar;
            elements.avatarImg.alt = 'avatar';
        }
        if (elements.lps) elements.lps.textContent = `League Points: ${userData.ligue_points}`;
        if (elements.bottomBtns) elements.bottomBtns.style.display = 'flex';
    } else {
        const elementsToHide = [
            'bottom-buttons', 'logout-button', 'user-avatar',
            'localbtn', 'pongbtn', 'historybtn',
            'editbtn', 'pixelbtn', 'friendsbtn'
        ];

        elementsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
}