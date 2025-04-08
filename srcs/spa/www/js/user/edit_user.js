import { ensureValidToken } from '/js/utils.js';
import { router } from '../router.js';

let cleanupFunctions = [];

export async function init() {
    const userForm = document.getElementById('userForm');
    const eraseButton = document.getElementById('erase-button');
    const avatarInput = document.getElementById('avatar');
    const returnButton = document.getElementById('return-button');
    const modalErase = document.getElementById('modal-erase');
    const modalBtnYes = document.getElementById('modal-btn-yes');
    const modalBtnNo = document.getElementById('modal-btn-no');

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        await handleUserUpdate(event.target);
    };

    const handleEraseClick = () => {
        modalErase.style.display = 'flex';
    };

    const handleModalYesClick = async () => {
        await handleAccountErase();
        modalErase.style.display = 'none';
    };

    const handleModalNoClick = () => {
        modalErase.style.display = 'none';
    };

    const handleAvatarChange = () => {
        const fileName = avatarInput.files[0]?.name || "No file chosen";
        document.getElementById('file-chosen').textContent = `[${fileName}]`;
    };

    const handleReturnClick = () => {
        router.navigateTo('/home/');
    };

    if (userForm) {
        userForm.addEventListener('submit', handleFormSubmit);
        cleanupFunctions.push(() => userForm.removeEventListener('submit', handleFormSubmit));
    }

    if (eraseButton) {
        eraseButton.addEventListener('click', handleEraseClick);
        cleanupFunctions.push(() => eraseButton.removeEventListener('click', handleEraseClick));
    }

    if (modalBtnYes) {
        modalBtnYes.addEventListener('click', handleModalYesClick);
        cleanupFunctions.push(() => modalBtnYes.removeEventListener('click', handleModalYesClick));
    }

    if (modalBtnNo) {
        modalBtnNo.addEventListener('click', handleModalNoClick);
        cleanupFunctions.push(() => modalBtnNo.removeEventListener('click', handleModalNoClick));
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarChange);
        cleanupFunctions.push(() => avatarInput.removeEventListener('change', handleAvatarChange));
    }

    if (returnButton) {
        returnButton.addEventListener('click', handleReturnClick);
        cleanupFunctions.push(() => returnButton.removeEventListener('click', handleReturnClick));
    }

    handleOAuthRestrictions();

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}

async function handleUserUpdate(form) {
    const formData = new FormData(form);

    try {
        await ensureValidToken();
        const response = await fetch('/api/edit_user_api/', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            body: formData,
        });

        const data = await response.json();
        
        if (response.ok) {
            displayMessage(data.message, 'success');
            setTimeout(() => router.navigateTo('/home/'), 2000);
        } else {
            handleUpdateError(data);
        }
    } catch (error) {
        displayMessage('A network error occurred.', 'error');
        console.error('Error details:', error);
    }
}

async function handleAccountErase() {
    try {
        await ensureValidToken();
        const response = await fetch('/api/erase/', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
            },
            credentials: 'include',
        });

        sessionStorage.removeItem('access_token');
        
        if (!response.ok) {
            console.error('Error erasing:', response);
        }
        window.location.reload();
    } catch (error) {
        console.error('Error during account erase:', error);
    }
}

function handleUpdateError(data) {
    let errorMessage = 'An error occurred';
    
    if (data.error) {
        const cleanError = data.error
            .replace('[ErrorDetail(string=\'', '')
            .replace('\', code=\'invalid\')]', '');
        errorMessage = `Error: ${cleanError}`;
    } else {
        errorMessage = `Error:<br>${data.error}`;
    }
    
    displayMessage(errorMessage, 'error');
}

function handleOAuthRestrictions() {
    if (sessionStorage.getItem('is_oauth') === 'true') {
        ['password-container', 'avatar-container'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    }
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