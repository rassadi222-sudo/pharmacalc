/* PharmaCalc service worker v1.7
   Provides offline support by caching the HTML shell.
   Cache name is versioned - bump on each release to force refresh. */

const CACHE_NAME = 'pharmacalc-v1.28';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './splash-logo.png'
];

/* Install: precache the shell */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS).catch(function() {
        /* Some icon files may not exist yet during initial deployment - ignore */
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* Activate: clean up old caches */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* Fetch: network-first for HTML (so updates are seen),
   cache-first for static assets (icons, manifest). */
self.addEventListener('fetch', function(event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Only handle same-origin requests */
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' ||
                 req.headers.get('Accept').indexOf('text/html') >= 0;

  if (isHTML) {
    /* Network-first: try fresh, fall back to cache */
    event.respondWith(
      fetch(req).then(function(res) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, copy); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(hit) {
          return hit || caches.match('./index.html') || caches.match('./');
        });
      })
    );
  } else {
    /* Cache-first for assets */
    event.respondWith(
      caches.match(req).then(function(hit) {
        return hit || fetch(req).then(function(res) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, copy); });
          return res;
        });
      })
    );
  }
});
