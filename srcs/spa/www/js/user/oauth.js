export function redirectTo42OAuth()
{
    console.log("redirect");
    const clientId = 'u-s4t2ud-c3aad960cd36ac0f5ca04a7d2780e4d8f1dbc27481baec5b5cb571eceb694a81'; // Louis: c'est normal que le user ai acces a cette information car il est public
    const redirectUri = encodeURIComponent('https://127.0.0.1:8443/oauth_callback/');
    const scope = 'public';
    const state = generateRandomString();
    const responseType = 'code';

    const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}`;
    
    console.log("Full Auth URL:", authUrl);
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
        window.location.href = '/home/';
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
        const response = await fetch('/api/oauth_callback/', {
            method: 'POST',
            headers: {
				'Content-Type': 'application/json',
			},
            body: JSON.stringify({ code: code }),
        });

        console.log("response", response);
		if (response.ok) {
			const data = await response.json();
            console.log("data", data);
            const formData = new FormData();
            formData.append('username', data.username);
            formData.append('password', data.username);
            formData.append('description', data.description);
            formData.append('pseudo', data.username);
            try {
                const response = await fetch('/api/add_user/', {
                    method: 'POST',
                    body: formData,
                });
                const responseText = await response.text();
                console.log('Server response:', responseText);

                if (response.ok) {
                    try {
                        // const data = JSON.parse(response.JSON);
                        window.location.href = '/home/';
                    } catch (parseError) {
                        displayMessage('JSON parsing error: ' + parseError.message, 'error');
                        console.error('Response content:', responseText);
                    }
            } else {
                displayMessage('HTTP error: ' + response.status + ' ' + response.statusText, 'error');
                console.error('Error response content:', responseText);
            }
            } catch (error) {
                displayMessage('A network error occurred: ' + error.message, 'error');
                console.error('Error details:', error);
            }
            // sessionStorage.setItem('access_token', data.access_token);
            // sessionStorage.setItem('refresh_token', data.refresh_token);
            // sessionStorage.setItem('access_expires', data.access_expires);
            // sessionStorage.setItem('refresh_expires', data.refresh_expires);
            // sessionStorage.setItem('username', data.user.username);
            // const state = sessionStorage.getItem('oauth_state');
            // if (state)
            //     sessionStorage.removeItem('oauth_state');
            window.location.href = '/home/';
        }
 
    }
    catch (error)
    {
        console.error('Error: ' + error);
    }
}