import { router } from '../router.js';
import { getCSRFToken } from '/js/utils.js';

let cleanupFunctions = [];

export async function init() {
    if (window.location.pathname === '/oauth_callback/') {
        handle42OAuthCallback();
    }

    const oauthButton = document.getElementById('oauth-button');
    if (oauthButton) {
        const handleOAuthClick = (e) => {
            e.preventDefault();
            redirectTo42OAuth();
        };
        
        oauthButton.addEventListener('click', handleOAuthClick);
        cleanupFunctions.push(() => {
            oauthButton.removeEventListener('click', handleOAuthClick);
        });
    }

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}

export async function redirectTo42OAuth()
{
    const response = await fetch('/api/get_env_address/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    const data = await response.json();
    const address = data.address;
    const clientId = 'u-s4t2ud-c3aad960cd36ac0f5ca04a7d2780e4d8f1dbc27481baec5b5cb571eceb694a81';
    const redirectUri = encodeURIComponent(`${address}/oauth_callback/`);
    const scope = 'public';
    const responseType = 'code';

    const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`;

    window.location.href = authUrl;
}

export function handle42OAuthCallback()
{
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    exchangeCodeForToken(code);
}

async function exchangeCodeForToken(code)
{
    try
    {
        const response = await fetch('/api/oauth_callback/', {
            method: 'POST',
            headers: {
				'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
			},
            body: JSON.stringify({code: code}),
        });

		if (response.ok) {
			const data = await response.json();
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('refresh_token', data.refresh_token);
            sessionStorage.setItem('access_expires', data.access_expires);
            sessionStorage.setItem('refresh_expires', data.refresh_expires);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('is_oauth', true);
        }
        else
        {
            const responseText = await response.text();
            console.error('Error response content: ', responseText);
        }
        router.navigateTo('/home/');
    }
    catch (error)
    {
        console.error('Error: ' + error);
    }
}