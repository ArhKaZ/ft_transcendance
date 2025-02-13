class Router {
    constructor(routes) {
        if (window.routerInstance) {
            return window.routerInstance;
        }

        this.routes = routes;
        this.rootElement = document.getElementById('app');
        this.loadedStylesheets = new Set();
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
                if (href && !href.startsWith('https')) {
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
        
        // Check for dynamic tournament game route
        const tournamentGameMatch = path.match(/^\/tournament\/game\/([a-zA-Z0-9-]+)\/?$/);
        if (tournamentGameMatch) {
            const tournamentCode = tournamentGameMatch[1];
            // Use the dynamic tournament game route handler
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
        
        // Handle regular routes
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
}

// Route definitions with HTML files
const routes = {
    '/home/': async () => {
        const response = await fetch('/html/home.html');
        return await response.text();
    },
    '/onlinePong/': async (params) => {
        const response = await fetch('/html/onlinePong/index.html');
        return await response.text();
    },
    '/localPong/': async () => {
        const response = await fetch('/html/localPong/index.html');
        return await response.text();
    },
    '/localPongIa/': async () => {
        const response = await fetch('/html/localPongIa/index.html');
        return await response.text();
    },
    '/magicDuel/': async () => {
        const response = await fetch('/html/magicDuel/index.html');
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
    // New dynamic route for tournament game
    '/tournament/game/:code': async (tournamentCode) => {
        const response = await fetch('/html/tournament/tournament_game.html');
        return await response.text();
    },
    '/404': () => '<h1>Page Not Found</h1>'
};

// Router instantiation
const router = new Router(routes);
router.init();