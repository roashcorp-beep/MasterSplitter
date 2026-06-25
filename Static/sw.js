// MasterSplitter Service Worker — Network-First with Cache Fallback
const CACHE_NAME = 'master-splitter-v4.22';

const PRE_CACHE_URLS = [
    '/',
    '/app',
    '/static/css/style.css',
    '/static/js/main.js',
    '/static/js/translations.js',
    '/static/icons/icon-192x192.png',
];

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching core assets');
            return cache.addAll(PRE_CACHE_URLS);
        })
    );
    // Activate immediately without waiting for old SW to finish
    self.skipWaiting();
});

// Activate: clean up old caches and claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all open clients immediately
    self.clients.claim();
});

// Fetch: Network-First strategy with cache fallback
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (fonts, analytics, etc.)
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Skip API calls — always go to network, never serve stale data
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Clone and cache the fresh response
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Network failed — try the cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If navigating and nothing cached, serve the cached /app shell
                    if (event.request.mode === 'navigate') {
                        return caches.match('/app');
                    }
                    return new Response('Offline', {
                        status: 503,
                        statusText: 'Service Unavailable',
                    });
                });
            })
    );
});

// Push: show a phone notification when the server sends a Web Push.
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { body: event.data ? event.data.text() : '' };
    }
    const title = data.title || 'MasterSplitter';
    const options = {
        body: data.body || '',
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/icon-192x192.png',
        dir: 'rtl',
        lang: 'he',
        vibrate: [80, 40, 80],
        data: { url: data.url || '/app' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: focus an open app tab or open one.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/app';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
