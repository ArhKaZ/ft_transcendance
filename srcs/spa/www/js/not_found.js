import { router } from './router.js';

export function init () {
    document.getElementById('return-button').addEventListener('click', () => {
        router.navigateTo("/home/");
    });
}
