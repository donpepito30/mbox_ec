/**
 * StreamShield Service Worker (sw.js)
 * Caches the core App Shell for offline resilience and fast loads
 * Ignores third-party video iframes to avoid caching unbounded media chunks
 */

const CACHE_NAME = 'mbox-ec-shell-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
];

// 1. Install Event: Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[StreamShield SW] Precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: App Shell caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude non-GET requests, chrome-extension, and external streaming providers
  if (event.request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Bypass service worker for cross-origin third-party video iframe embeds and APIs
  if (url.origin !== self.location.origin) {
    // Let network handle cross-origin streaming and external assets directly
    return;
  }

  // Network-First with Cache Fallback for navigation (HTML documents)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Stale-While-Revalidate for local assets (JS, CSS, static images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
