import { getCSRFToken } from '/js/utils.js';

export function redirectTo42OAuth()
{
    console.log("redirect");
    const clientId = 'u-s4t2ud-c3aad960cd36ac0f5ca04a7d2780e4d8f1dbc27481baec5b5cb571eceb694a81'; // Louis: c'est normal que le user ai acces a cette information car il est public
    const redirectUri = 'https%3A%2F%2F127.0.0.1%3A8443%2Foauth_callback%2F';
    const scope = 'public';
    const state = generateRandomString();
    const responseType = 'code';

    const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}`;
    
    sessionStorage.setItem('oauth_state', state);
    window.location.href = authUrl;
}

export function handle42OAuthCallback()
{
    console.log('Handling OAuth callback at path:', window.location.pathname);
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('oauth_state');

    if (state === storedState)
    {
        sessionStorage.removeItem('oauth_state');
        exchangeCodeForToken(code);
    } 
    else
    {
        alert('State mismatch');
        const state = sessionStorage.getItem('oauth_state');
        if (state)
            sessionStorage.removeItem('oauth_state');
        window.location.href = '/login';
    }
}

function generateRandomString(length = 32)
{
    console.log("random");
    let str = '';
    const alphanum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++)
        str += alphanum.charAt(Math.floor(Math.random() * alphanum.length));

    return str;
}

async function exchangeCodeForToken(code)
{
    try
    {
        console.log("exchange");
        const response = await fetch('/api/oauth/', {
            method: 'POST',
            headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken(),
			},
            body: JSON.stringify({ code: code })
        });

		if (response.ok) {
			const data = await response.json();
            const state = sessionStorage.getItem('oauth_state');
            if (state)
                sessionStorage.removeItem('oauth_state');
            window.location.href = '/login/';
        }
 
    }
    catch (error)
    {
        alert('Error: ' + error);
    }
}