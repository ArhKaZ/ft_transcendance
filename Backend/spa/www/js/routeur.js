class Router {
    constructor(routes) {
        // Prevent multiple router instances
        if (window.routerInstance) {
            return window.routerInstance;
        }

        this.routes = routes;
        this.rootElement = document.getElementById('app');
        
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
                if (href && !href.startsWith('http')) {
                    e.preventDefault();
                    this.navigateTo(href);
                }
            }
        };
        
        document.addEventListener('click', this.linkHandler);
    }

    navigateTo(url) {
        window.history.pushState({}, '', url);
        this.handleLocation();
    }

    async handleLocation() {
        const path = window.location.pathname;
        
        const route = this.routes[path] || this.routes['/404'];
        
        if (!route) {
            console.error('Route non trouvée');
            return;
        }

        try {
            const content = await route();
            console.log(content);
            this.rootElement.innerHTML = content;

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
	'/home/': async () => {
    	const response = await fetch('/static/home.html');
    	return await response.text();
	},
	'/onlinePong/': async () => {
    	const response = await fetch('/static/onlinePong/index.html');
    	return await response.text();
	},
	'/pixelPaws/': async () => {
    	const response = await fetch('/static/pixelPaws/index.html');
    	return await response.text();
	},
	'/logged/': async () => {
    	const response = await fetch('/static/user/logged.html');
    	return await response.text();
	},
	'/user/add/': async () => {
    	const response = await fetch('/static/user/add.html');
    	return await response.text();
	},
	'/user/edit/': async () => {
    	const response = await fetch('/static/user/edit.html');
    	return await response.text();
	},
	'/user/edit_user/': async () => {
    	const response = await fetch('/static/user/edit_user.html');
    	return await response.text();
	},
	'/user/history/': async () => {
    	const response = await fetch('/static/user/history.html');
    	return await response.text();
	},
	'/user/invite/': async () => {
    	const response = await fetch('/static/user/invite.html');
    	return await response.text();
	},
	'/user/login/': async () => {
		const response = await fetch('/static/user/login.html');
		return await response.text();
	},
    '/404': () => '<h1>Page Non Trouvée</h1>'
};

// Instanciation du routeur
const router = new Router(routes);
router.init();