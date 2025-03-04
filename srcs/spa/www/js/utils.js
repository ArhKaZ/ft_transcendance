export function getCSRFToken()
{
    let csrfToken = null;

    if (document.cookie && document.cookie !== '')
	{
        const cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++)
		{
            const cookie = cookies[i].trim();

            if (cookie.substring(0, 'csrftoken='.length) === 'csrftoken=')
			{
                csrfToken = decodeURIComponent(cookie.substring('csrftoken='.length));
                break;
            }
        }
    }

    return csrfToken;
}

export function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

export async function ensureValidToken() {
    await checkTokenExpiry();
}

async function checkTokenExpiry() {
    const accessExpiry = sessionStorage.getItem('access_expires');
    const refreshToken = sessionStorage.getItem('refresh_token');
    if (!accessExpiry || !refreshToken) {
        redirectToLogin();
        return;
    }
    if (new Date(accessExpiry) < new Date()) {
        try {
            const response = await fetch('/api/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                sessionStorage.setItem('access_token', data.access_token);
                sessionStorage.setItem('access_expires', data.access_expires);
                return;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        
        sessionStorage.clear();
        redirectToLogin();
    }
}

function redirectToLogin() {
    if (window.location.pathname !== '/home/') {
        window.location.href = '/home/';
    }
}