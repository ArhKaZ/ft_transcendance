import { handle42OAuthCallback } from '/js/user/oauth.js';

try {
    handle42OAuthCallback();
} catch (error) {
    console.error('OAuth Handling Error:', error);
    window.location.href = '/home/';
}