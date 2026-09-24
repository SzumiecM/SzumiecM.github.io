/**
 * Fiszki Service Worker — Offline Cache & 0ms Startup
 * Enables 100% offline spaced repetition flashcard practice with minimal battery consumption.
 */

const CACHE_NAME = 'fiszki-cache-v1.0.2';

const STATIC_ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'logo.svg',
  'words.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key.startsWith('fiszki-'))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Handle local origin requests
  if (url.origin === self.location.origin) {
    // Strategy for words.json: Stale-While-Revalidate (instant 0ms response + background update)
    if (url.pathname.endsWith('words.json')) {
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.match(req).then((cachedResponse) => {
            const fetchPromise = fetch(req).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(req, networkResponse.clone());
              }
              return networkResponse;
            }).catch(() => {
              // Network failed (offline); cachedResponse will be returned
            });

            return cachedResponse || fetchPromise;
          });
        })
      );
      return;
    }

    // Strategy for App Shell & Static Assets: Cache First, fallback to Network
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req).then((networkRes) => {
          if (networkRes && networkRes.status === 200 && req.url.startsWith('http')) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        }).catch(() => {
          // If offline and navigating, return index.html fallback
          if (req.mode === 'navigate') {
            return caches.match('index.html');
          }
        });
      })
    );
  }
});
