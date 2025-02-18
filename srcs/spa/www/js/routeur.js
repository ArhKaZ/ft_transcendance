class Router {
    constructor(routes) {
        // Prevent multiple router instances
        if (window.routerInstance) {
            return window.routerInstance;
        }

        this.routes = routes;
        this.rootElement = document.getElementById('app');
        this.loadedStylesheets = new Set();
        this.baseUrl = window.location.origin;
        // Only add event listeners if this is the first instance
        window.addEventListener('popstate', this.handleLocation.bind(this));
        this.initLinks();

        // Store the instance globally
        window.routerInstance = this;
    }

    initLinks() {
        // Remove previous event listeners to prevent multiple bindings
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

// NEW 
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

    async handleLocation() {
        const path = window.location.pathname;
        
        const route = this.routes[path] || this.routes['/404'];
        
        if (!route) {
            console.error('Route non trouvée');
            return;
        }

        try {
            const htmlContent = await route();
            const processedContent = await this.parseHTML(htmlContent);
            this.rootElement.innerHTML = processedContent;
            this.executeScripts(this.rootElement);
        } catch (error) {
            console.error('Erreur de chargement de la page', error);
            this.rootElement.innerHTML = '<h1>Erreur de chargement</h1>';
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
        // Only handle location if this is the first instance
        if (!window.routerInitialized) {
            this.handleLocation();
            window.routerInitialized = true;
        }
    }
}

// Définition des routes avec des fichiers HTML
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
    // '/user/invite/': () => '<h1>ERROR</h1>',
    '/404': () => '<h1>Page Non Trouvée</h1>'
};

// Instanciation du routeur
const router = new Router(routes);
router.init();