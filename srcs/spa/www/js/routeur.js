import { getCSRFToken } from '/js/utils.js';
import { ensureValidToken } from '/js/utils.js';

class Router {
    constructor(routes) {
        if (window.routerInstance) {
            return window.routerInstance;
        }

        this.routes = routes;
        this.rootElement = document.getElementById('app');
        this.loadedStylesheets = new Set();
        this.baseUrl = window.location.origin;
        // Only add event listeners if this is the first instance
        this.publicPaths = ['/home/', '/user/login/', '/user/add/'];
        window.addEventListener('popstate', this.handleLocation.bind(this));
        this.initLinks();

        window.routerInstance = this;
    }

    initLinks() {
        document.removeEventListener('click', this.linkHandler);
        
        this.linkHandler = (e) => {
            const link = e.target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/') && href.startsWith('//')) {
                    e.preventDefault();
                    this.navigateTo(href);
                }
            }
        };
        
        document.addEventListener('click', this.linkHandler);
    }

    navigateTo(url) {
        const fullUrl = new URL(url, this.baseUrl).href;
        window.history.pushState({}, '', fullUrl);
        this.handleLocation();
    }

    async loadStylesheet(href) {
        if (this.loadedStylesheets.has(href)) {
            return;
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                this.loadedStylesheets.add(href);
                resolve();
            };
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async parseHTML(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        const stylePromises = Array.from(styleLinks).map(link => 
            this.loadStylesheet(link.getAttribute('href'))
        );

        await Promise.all(stylePromises);

        return doc.body.innerHTML;
    }

    isAuthenticated() {
        return sessionStorage.getItem('access_token') !== null;
    }

    isPublicPath(path) {
        return this.publicPaths.includes(path);
    }

    async handleLocation() {
        const path = window.location.pathname;
    
        if (!this.isPublicPath(path)) {
            const isAuthenticated = await this.checkUserAuth();
            if (!isAuthenticated) return;
        }
        
        if (!this.isPublicPath(path) && !this.isAuthenticated()) {
            console.log('Unauthorized access, redirecting to login');
            window.history.pushState({}, '', '/user/login/');
            const loginRoute = this.routes['/user/login/'];
            const htmlContent = await loginRoute();
            const processedContent = await this.parseHTML(htmlContent);
            this.rootElement.innerHTML = processedContent;
            this.executeScripts(this.rootElement);
            return;
        }
    
        const tournamentGameMatch = path.match(/^\/tournament\/game\/([a-zA-Z0-9-]+)\/?$/);
        if (tournamentGameMatch) {
            const tournamentCode = tournamentGameMatch[1];
            const route = this.routes['/tournament/game/:code'];
            if (route) {
                try {
                    const htmlContent = await route(tournamentCode);
                    const processedContent = await this.parseHTML(htmlContent);
                    this.rootElement.innerHTML = processedContent;
                    this.executeScripts(this.rootElement);
                    return;
                } catch (error) {
                    console.error('Error loading tournament game page:', error);
                }
            }
        }
        
        const userProfileMatch = path.match(/^\/user\/profile\/([a-zA-Z0-9_-]+)\/?$/);
        if (userProfileMatch) {
            const userName = userProfileMatch[1];
            const route = this.routes['/user/profile/:userName'];
            if (route) {
                try {
                    const htmlContent = await route(userName);
                    const processedContent = await this.parseHTML(htmlContent);
                    this.rootElement.innerHTML = processedContent;
                    this.executeScripts(this.rootElement);
                    return;
                } catch (error) {
                    console.error('Error loading user profile page:', error);
                }
            }
        }
        
        const route = this.routes[path] || this.routes['/404'];
        
        if (!route) {
            console.error('Route not found');
            return;
        }
    
        try {
            const htmlContent = await route();
            const processedContent = await this.parseHTML(htmlContent);
            this.rootElement.innerHTML = processedContent;
            this.executeScripts(this.rootElement);
        } catch (error) {
            console.error('Error loading page', error);
            this.rootElement.innerHTML = '<h1>Loading Error</h1>';
        }
    }

    executeScripts(container) {
        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            newScript.textContent = oldScript.textContent;
            
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    init() {
        if (!window.routerInitialized) {
            this.handleLocation();
            window.routerInitialized = true;
        }
    }
    async checkUserAuth() {
        try {
            await ensureValidToken();
            const response = await fetch('/api/get-my-info/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                },
                credentials: 'include',
            });
        
            if (!response.ok) {
                console.log('User not authenticated, redirecting to /home/');
                this.navigateTo('/home/');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error checking user authentication:', error);
            this.navigateTo('/home/');
            return false;
        }
    }
}


// Route definitions with HTML files
const routes = {
    // '/': async () => {
    //     router.navigateTo('/home/');
    //     return '';
    // },
	'/home/': async () => {
    	const response = await fetch('/html/home.html');
    	return await response.text();
	},
    '/game/': async () => {
    	const response = await fetch('/html/game/game.html');
    	return await response.text();
	},
    '/pong/': async () => {
    	const response = await fetch('/html/game/pong/pong.html');
    	return await response.text();
	},
	'/onlinePong/': async () => {
    	const response = await fetch('/html/game/pong/onlinePong/index.html');
    	return await response.text();
	},

    '/localPong/': async () => {
        const response = await fetch('/html/game/pong/localPong/index.html');
        return await response.text();
    },
    '/localPongIa/': async () => {
        const response = await fetch('/html/game/pong/localPongIa/index.html');
        return await response.text();
    },
	'/magicDuel/': async () => {
    	const response = await fetch('/html/game/magicDuel/index.html');
    	return await response.text();
	},
	'/logged/': async () => {
    	const response = await fetch('/html/user/logged.html');
    	return await response.text();
	},
	'/user/add/': async () => {
    	const response = await fetch('/html/user/add.html');
    	return await response.text();
	},
	'/user/edit/': async () => {
    	const response = await fetch('/html/user/edit.html');
    	return await response.text();
	},
	'/user/edit_user/': async () => {
    	const response = await fetch('/html/user/edit_user.html');
    	return await response.text();
	},
	'/user/history/': async () => {
    	const response = await fetch('/html/user/history.html');
    	return await response.text();
	},
	'/user/friend/': async () => {
    	const response = await fetch('/html/user/friend.html');
    	return await response.text();
	},
	'/user/login/': async () => {
		const response = await fetch('/html/user/login.html');
		return await response.text();
	},

    '/tournament/': async () => {
        const response = await fetch('/html/tournament/tournament.html');
        return await response.text();
    },
    '/tournament/game/:code': async (tournamentCode) => {
        const response = await fetch('/html/tournament/tournament_game.html');
        return await response.text();
    },
    '/user/profile/:userName': async (userName) => {
        const response = await fetch('/html/user/profile.html');
        return await response.text();
    },
    '/user_not_found/':  async () => {	
        const response = await fetch('/html/user_not_found.html');
        return await response.text();
        },
    '/404':  async () => {	
    const response = await fetch('/html/not_found.html');
    return await response.text();
    },
};

// Router instantiation
const router = new Router(routes);
router.init();