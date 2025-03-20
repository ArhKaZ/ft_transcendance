import { handle42OAuthCallback } from '/js/user/oauth.js';
import { router } from './router.js';


try {
    handle42OAuthCallback();
} catch (error) {
    console.error('OAuth Handling Error:', error);
    router.navigateTo('/home/');
}