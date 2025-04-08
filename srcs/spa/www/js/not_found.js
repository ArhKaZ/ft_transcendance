import { router } from './router.js';

export function init () {
    const popstateHandler = () => {
        if (window.location.pathname === "/user_not_found/") {
            router.handReload("/home/");
        }
        return ;
    };
	window.addEventListener('popstate', popstateHandler);
    document.getElementById('return-button').addEventListener('click', () => {
        router.navigateTo("/home/");
    });
}
