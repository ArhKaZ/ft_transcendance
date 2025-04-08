import { router } from './router.js';

export function init() {
    document.getElementById('return-button').addEventListener('click', () => {
        router.navigateTo("/home/");
    });
    
    return () => {
        document.getElementById('return-button').removeEventListener('click', () => {
            router.navigateTo("/home/");
        });
    };
}
