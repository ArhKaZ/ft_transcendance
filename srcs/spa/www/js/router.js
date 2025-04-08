import { ensureValidToken, getCSRFToken } from '/js/utils.js';

class Router {
    constructor(routes) {
      this.routes = routes;
      this.currentCleanup = null;
      this.rootElement = document.getElementById('app');
      this.currentAssets = { scripts: [], styles: [] };
      this.publicPaths = ['/home/', '/user/login/', '/user/add/', '/oauth_callback/', '/404/'];
      this.scriptCache = new Map();
      window.addEventListener('popstate', this.handleLocation.bind(this));
      this.initLinks();
    }

    async handReload(path) {
      window.history.replaceState({}, '', path);
      await this.handleLocation();
    }
  
    async navigateTo(path) {
      window.history.pushState({}, '', path);
      await this.handleLocation();
    }
  
    async handleLocation() {
      if (this.currentCleanup) {
        this.currentCleanup();
        this.currentCleanup = null;
      }
      const path = window.location.pathname;
      const route = this.resolveRoute(path);
  
      if (!route) {
        this.navigateTo('/404/');
        return;
      }
  
      if (!this.publicPaths.includes(path) && !(await this.isAuthenticated())) {
        this.navigateTo('/home/');
        return;
      }
  
      await this.loadRoute(route);
    }
  
    async loadRoute(route) {
      const newStyles = [];
      if (route.css) {
        const cssFiles = Array.isArray(route.css) ? route.css : [route.css];
        const cssPromises = cssFiles.map(href => {
          return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
            newStyles.push(link);
            link.onload = resolve;
            link.onerror = reject;
          });
        });
        await Promise.all(cssPromises);
      }
    
      const html = await fetch(route.html).then(res => res.text());
    
      this.clearAssets();
      this.currentAssets.styles = newStyles;
    
      this.rootElement.innerHTML = html;
    
      if (route.js) {
        const scripts = Array.isArray(route.js) ? route.js : [route.js];
        for (const src of scripts) {
          try {
            if (this.currentCleanup) {
              this.currentCleanup();
              this.currentCleanup = null;
            }
  
            let modulePromise;
            if (!this.scriptCache.has(src)) {
              modulePromise = import(src);
              this.scriptCache.set(src, modulePromise);
            } else {
              modulePromise = this.scriptCache.get(src);
            }
            const module = await modulePromise;
            if (typeof module.init === 'function') {
              const cleanup = await module.init();
              this.currentCleanup = cleanup;
            }
          } catch (error) {
            console.error(`Error loading script: ${src}`, error);
          }
        }
      }
    }
  
    clearAssets() {
      this.currentAssets.styles.forEach(style => style.remove());
      this.currentAssets.styles = [];
    }
  
    resolveRoute(path) {
      if (path.startsWith('/tournament/game/')) {
        return this.routes['/tournament/game/:code'];
      }
      if (path.startsWith('/user/profile/')) {
        return this.routes['/user/profile/:userName'];
      }
      return this.routes[path] || this.routes['/404/'];
    }
  
    async isAuthenticated() {
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
      if (response.ok)
        return true;
      return false;
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
      css: '/css/oauth.css',
      js: '/js/user/oauth.js',
      isPublic: true
    },
  
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
      css: '/css/global.css',
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
    '/user/edit_user/': {
      html: '/html/user/edit_user.html',
      css: ['/css/useredit.css', '/css/global.css'],
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
  
    '/user/profile/:userName': {
      html: '/html/user/profile.html',
      css: '/css/profiles.css',
      js: '/js/user/profile.js'
    },
  
    '/user_not_found/': {
      html: '/html/user_not_found.html',
      css: '/css/user_not_found.css',
      js: '/js/not_found.js',
    },
    '/404/': {
      html: '/html/not_found.html',
      css: '/css/user_not_found.css',
      js: '/js/not_found.js',
      isPublic: true
    }
  };
  
  
  export const router = new Router(routes);
  router.handleLocation();