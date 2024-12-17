class Router {
    constructor(routes) {
        this.routes = routes;
        this.rootElement = document.getElementById('app');
        
        window.addEventListener('popstate', this.handleLocation.bind(this));
        this.initLinks();
    }

    initLinks() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('http')) {
                    e.preventDefault();
                    this.navigateTo(href);
                }
            }
        });
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
            // Charger le HTML
            const content = await route();
			console.log(content);
            this.rootElement.innerHTML = content;

            // Exécuter les scripts si nécessaire
            this.executeScripts(this.rootElement);
        } catch (error) {
            console.error('Erreur de chargement de la page', error);
            this.rootElement.innerHTML = '<h1>Erreur de chargement</h1>';
        }
    }

    // Méthode pour exécuter les scripts dans le HTML chargé
    executeScripts(container) {
        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // Copier les attributs
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            // Copier le contenu
            newScript.textContent = oldScript.textContent;
            
            // Remplacer l'ancien script
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    init() {
        this.handleLocation();
    }
}

// Définition des routes avec des fichiers HTML
const routes = {
    '/home': () => fetch('/static/backend/home.html').then(response => response.text()),
    '/404': () => '<h1>Page Non Trouvée</h1>'
};

// Instanciation du routeur
const router = new Router(routes);
router.init();