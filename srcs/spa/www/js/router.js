class Router {
    constructor(routes) {
      this.routes = routes;
      this.rootElement = document.getElementById('app');
      this.currentAssets = { scripts: [], styles: [] };
      this.publicPaths = ['/home/', '/user/login/', '/user/add/', '/oauth_callback/'];
      this.scriptCache = new Map();
      window.addEventListener('popstate', this.handleLocation.bind(this));
      this.initLinks();
    }
  
    // Public methods
    async navigateTo(path) {
      window.history.pushState({}, '', path);
      await this.handleLocation();
    }
  
    // Private methods
    async handleLocation() {
      const path = window.location.pathname;
      const route = this.resolveRoute(path);
  
      if (!route) {
        this.navigateTo('/404/');
        return;
      }
  
      // Auth check for protected routes
      if (!this.publicPaths.includes(path) && !(await this.isAuthenticated())) {
        this.navigateTo('/user/login/');
        return;
      }
  
      // Load route assets
      await this.loadRoute(route);
    }
  
    async loadRoute(route) {
      // 1. Clear old assets (only styles now, scripts are managed via cache)
      this.clearAssets();
    
      // 2. Load HTML
      const html = await fetch(route.html).then(res => res.text());
      this.rootElement.innerHTML = html;
    
      // 3. Load CSS (array support)
      if (route.css) {
        const cssFiles = Array.isArray(route.css) ? route.css : [route.css];
        cssFiles.forEach(href => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
          this.currentAssets.styles.push(link);
        });
      }
    
      // 4. Load JS using dynamic imports and cache
      if (route.js) {
        const scripts = Array.isArray(route.js) ? route.js : [route.js];
        for (const src of scripts) {
          try {
            let modulePromise;
            if (!this.scriptCache.has(src)) {
              modulePromise = import(src);
              this.scriptCache.set(src, modulePromise);
            } else {
              modulePromise = this.scriptCache.get(src);
            }
            const module = await modulePromise;
            if (typeof module.init === 'function') {
              await module.init(); // Execute init function every time
            }
          } catch (error) {
            console.error(`Error loading script: ${src}`, error);
          }
        }
      }
    }
  
    clearAssets() {
      // Only clear styles; scripts are managed by the cache
      this.currentAssets.styles.forEach(style => style.remove());
      this.currentAssets.styles = [];
    }
  
    resolveRoute(path) {
      // Handle dynamic routes (e.g., :code, :userName)
      if (path.startsWith('/tournament/game/')) {
        return this.routes['/tournament/game/:code'];
      }
      if (path.startsWith('/user/profile/')) {
        return this.routes['/user/profile/:userName'];
      }
      return this.routes[path] || this.routes['/404/'];
    }
  
    async isAuthenticated() {
      try {
        const response = await fetch('/api/auth/check', {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` }
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    }
  
    initLinks() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href.startsWith(window.location.origin)) {
          e.preventDefault();
          this.navigateTo(link.pathname);
        }
      });
    }
  }
  
  const routes = {
    // ================= PUBLIC ROUTES =================
    '/home/': {
      html: '/html/home.html',
      css: '/css/global.css',
      js: '/js/home.js',
      isPublic: true
    },
    '/user/login/': {
      html: '/html/user/login.html',
      css: '/css/login.css',
      js: '/js/user/login_user.js',
      isPublic: true
    },
    '/user/add/': {
      html: '/html/user/add.html',
      css: ['/css/global.css', '/css/register.css'],
      js: '/js/user/add_user.js',
      isPublic: true
    },
    '/oauth_callback/': {
      html: '/html/user/oauth_callback.html',
      js: '/js/user/oauth.js',
      isPublic: true
    },
  
    // ================= PROTECTED ROUTES =================
    // Game Routes
    '/game/': {
      html: '/html/game/game.html',
      css: '/css/global.css',
      js: '/js/game.js'
    },
    '/gambling/' :{
      html: '/html/gambling.html',
      css: ['/css/global.css', '/css/gambling.css'],
      js: '/js/gambling.js'
    },
    '/pong/': {
      html: '/html/game/pong/pong.html',
      css: '/css/pong.css',
      js: '/js/pong.js'
    },
    '/onlinePong/': {
      html: '/html/game/pong/onlinePong/index.html',
      css: '/css/onlinePong/styles.css',
      js: '/js/onlinePong/main.js'
    },
    '/localPong/': {
      html: '/html/game/pong/localPong/index.html',
      css: '/css/localPong/styles.css',
      js: '/js/localPong/main.js'
    },
    '/localPongIa/': {
      html: '/html/game/pong/localPongIa/index.html',
      css: '/css/localPongIa/styles.css',
      js: '/js/localPongIa/main.js'
    },
    '/magicDuel/': {
      html: '/html/game/magicDuel/index.html',
      css: '/css/magicDuel/styles.css',
      js: '/js/magicDuel/main.js'
    },
  
    // User Routes
    // '/logged/': {
    //   html: '/html/user/logged.html',
    //   css: '/css/logged.css',
    //   js: '/js/logged.js'
    // },
    // '/user/edit/': {
    //   html: '/html/user/edit.html',
    //   css: '/css/edit.css',
    //   js: '/js/edit.js''/css/pong.css
    // },
    '/user/edit_user/': {
      html: '/html/user/edit_user.html',
      css: '/css/edit_user.css',
      js: '/js/user/edit_user.js'
    },
    '/user/history/': {
      html: '/html/user/history.html',
      css: '/css/history.css',
      js: '/js/user/history.js'
    },
    '/user/friend/': {
      html: '/html/user/friend.html',
      css: '/css/friend.css',
      js: '/js/user/friend.js'
    },
  
    // Tournament Routes
    '/tournament/': {
      html: '/html/tournament/tournament.html',
      css: '/css/tournament.css',
      js: '/js/tournament/tournament.js'
    },
    '/tournament/game/:code': {
      html: '/html/tournament/tournament_game.html',
      css: '/css/tournament_game.css',
      js: '/js/tournament/tournament_game.js'
    },
  
    // Profile Route
    '/user/profile/:userName': {
      html: '/html/user/profile.html',
      css: '/css/profile.css',
      js: '/js/user/profile.js'
    },
  
    // Error Routes
    '/user_not_found/': {
      html: '/html/user_not_found.html',
      css: '/css/user_not_found.css',
      isPublic: true
    },
    '/404/': {
      html: '/html/not_found.html',
      css: '/css/not_found.css',
      isPublic: true
    }
  };
  
  
  export const router = new Router(routes);
  router.handleLocation(); // Initial load