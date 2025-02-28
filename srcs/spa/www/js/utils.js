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

// let tokenRefreshInProgress = false;

// async function checkTokenExpiry() {
//     const accessExpiry = localStorage.getItem('access_expires');
//     const refreshToken = localStorage.getItem('refresh_token');
    
//     if (!accessExpiry || !refreshToken) {
//         redirectToLogin();
//         return;
//     }
    
//     // Check if access token is expired
//     if (new Date(accessExpiry) < new Date()) {
//         if (tokenRefreshInProgress) return;
//         tokenRefreshInProgress = true;
        
//         try {
//             const response = await fetch('/api/refresh_token/', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     refresh_token: refreshToken
//                 })
//             });
            
//             if (response.ok) {
//                 const data = await response.json();
//                 localStorage.setItem('access_token', data.access_token);
//                 localStorage.setItem('access_expires', data.access_expires);
//                 tokenRefreshInProgress = false;
//                 return;
//             }
//         } catch (error) {
//             console.error('Token refresh failed:', error);
//         }
        
//         // If refresh failed, clear tokens and redirect
//         localStorage.removeItem('access_token');local
//         localStorage.removeItem('refresh_token');
//         localStorage.removeItem('access_expires');
//         redirectToLogin();
//     }
// }

// function redirectToLogin() {
//     window.location.href = '/user/login/';
// }

// // Call this before making API requests
// async function ensureValidToken() {
//     await checkTokenExpiry();
// }

// Add these helper functions
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
    window.location.href = '/user/login/';
}