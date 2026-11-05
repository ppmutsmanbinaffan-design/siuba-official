/**
 * SIUBA Service Worker (v1.10.0-pwa)
 * Caches static shell assets, handles offline fallback, routes write endpoints to Network Only
 */

const CACHE_NAME = 'siuba-static-v1.16';
const STATIC_ASSETS = [
  '/beranda',
  '/app.html',
  '/registrasi-rfid.html',
  '/manifest.webmanifest',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Initial static asset cache error:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key.startsWith('siuba-static-'))
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API Write Endpoints (POST / PUT / DELETE) -> NETWORK ONLY (Never cache mutations as success)
  if (request.method !== 'GET' || url.pathname.includes('/api/')) {
    return;
  }

  // 2. Static Assets (JS, CSS, Images, Fonts) -> Cache First with Network Fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2|woff|ttf|ico)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return caches.match(request);
        });
      })
    );
    return;
  }

  // 3. Navigation / HTML Shell -> Network First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
  }
});
