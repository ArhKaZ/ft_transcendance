import { loginUser } from "./login_user.js";
import { router } from '../router.js';

let cleanupFunctions = [];

export async function init() {
    if (sessionStorage.username) {
		router.navigateTo('/home/');
		return ;
	}
    const userForm = document.getElementById('userForm');
    const returnButton = document.getElementById('return-button');
    const avatarInput = document.getElementById('avatar');
    const fileChosenDisplay = document.getElementById('file-chosen');

    const handleFormSubmit = async (event) => {
        event.preventDefault();

        const formData = new FormData();
        formData.append('username', document.getElementById('username').value);
        formData.append('password', document.getElementById('password').value);
        formData.append('description', document.getElementById('description').value);
        
        const pseudo = document.getElementById('pseudo').value;
        formData.append('pseudo', pseudo || document.getElementById('username').value);

        if (avatarInput.files.length > 0) {
            formData.append('avatar', avatarInput.files[0]);
        }

        try {
            const response = await fetch('/api/add_user/', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                await loginUser();
            } else {
                await handleErrorResponse(response);
            }
        } catch (error) {
            handleNetworkError(error);
        }
    };

    const handleReturnClick = () => {
        router.navigateTo('/home/');
    };

    const handleAvatarChange = () => {
        const fileName = avatarInput.files[0] ? avatarInput.files[0].name : "No file chosen";
        fileChosenDisplay.textContent = fileName;
    };

    if (userForm) {
        userForm.addEventListener('submit', handleFormSubmit);
        cleanupFunctions.push(() => userForm.removeEventListener('submit', handleFormSubmit));
    }

    if (returnButton) {
        returnButton.addEventListener('click', handleReturnClick);
        cleanupFunctions.push(() => returnButton.removeEventListener('click', handleReturnClick));
    }

    if (avatarInput && fileChosenDisplay) {
        avatarInput.addEventListener('change', handleAvatarChange);
        cleanupFunctions.push(() => avatarInput.removeEventListener('change', handleAvatarChange));
    }

    async function handleErrorResponse(response) {
        const data = await response.json();
        let errorMessage = 'An error occurred';
        
        if (data.error) {
            const cleanError = data.error
                .replace(/duplicate key value violates unique constraint "[^"]+"\n/, '')
                .replace(/DETAIL: /, '')
                .replace(/Key \((.+?)\)=\((.+?)\)/, '$1 "$2"')
                .replace(/\\n/g, ' ');
            errorMessage = `Error: ${cleanError}`;
        } else {
            const errorParts = Object.entries(data).map(
                ([field, messages]) => `${field
                    .replace('username', 'Username')
                    .replace('password', 'Password')
                    .replace('description', 'Description')
                    .replace('pseudo', 'Tournament pseudo')}: ${messages[0]}`
            );
            errorMessage = errorParts.length > 0
                ? `Error:<br>${errorParts.join('<br>')}`
                : 'Unknown error occurred';
        }
        
        displayMessage(errorMessage, 'error');
    }

    function handleNetworkError(error) {
        const message = error instanceof SyntaxError
            ? 'Invalid server response format'
            : 'Network error occurred';
        displayMessage(message, 'error');
        console.error('Error details:', error);
    }

    function displayMessage(message, type) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.innerHTML = message;
            messageDiv.style.color = type === 'error' ? 'red' : 'green';
        }
    }

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}