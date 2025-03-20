import { router } from './router.js';


document.getElementById('return-button').addEventListener('click', () => {
    router.navigateTo("/home/");
});
