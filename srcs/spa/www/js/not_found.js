import { router } from './router.js';

let cleanupFunctions = [];

export async function init() {
    const returnButton = document.getElementById('return-button');
    
    if (!returnButton) {
        console.warn('Return button not found');
        return;
    }

    const handleReturnClick = () => {
        router.navigateTo("/home/");
    };

    returnButton.addEventListener('click', handleReturnClick);

    cleanupFunctions.push(() => {
        returnButton.removeEventListener('click', handleReturnClick);
    });

    return () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };
}
