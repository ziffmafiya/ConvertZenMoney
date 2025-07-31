// Service Worker for caching
const CACHE_NAME = 'finance-app-v1';
const STATIC_CACHE = 'finance-static-v1';
const API_CACHE = 'finance-api-v1';

// Static assets to cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/index-optimized.html',
    '/js/app.js',
    '/js/data-manager.js',
    '/js/ui-manager.js',
    '/js/chart-manager.js',
    '/js/cache-manager.js',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0',
    'https://unpkg.com/i18next/dist/umd/i18next.min.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/get-transactions',
    '/api/get-monthly-summary',
    '/api/analyze-habits'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(error => {
                console.error('Error caching static assets:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
    );
    self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static assets
    if (request.method === 'GET') {
        event.respondWith(handleStaticRequest(request));
        return;
    }
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Check if cache is still valid (5 minutes)
        const cacheTime = new Date(cachedResponse.headers.get('sw-cache-time'));
        const now = new Date();
        const cacheAge = now - cacheTime;

        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
            console.log('Serving API from cache:', request.url);
            return cachedResponse;
        }
    }

    try {
        // Fetch from network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Clone response and add cache timestamp
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cache-time', new Date().toISOString());
            
            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });

            // Cache the response
            await cache.put(request, cachedResponse);
            console.log('Cached API response:', request.url);
        }

        return networkResponse;
    } catch (error) {
        console.error('Network error, trying cache:', error);
        
        // Return cached response if available, even if expired
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        console.log('Serving static asset from cache:', request.url);
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache the response
            await cache.put(request, networkResponse.clone());
            console.log('Cached static asset:', request.url);
        }

        return networkResponse;
    } catch (error) {
        console.error('Network error for static asset:', error);
        
        // Return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return cache.match('/index.html');
        }
        
        return new Response('Offline', { status: 503 });
    }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Sync any pending data when connection is restored
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                timestamp: new Date().toISOString()
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications (if needed in the future)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                if (clientList.length > 0) {
                    clientList[0].focus();
                } else {
                    clients.openWindow('/');
                }
            })
    );
});

// Message handling for cache management
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(clearAllCaches());
    } else if (event.data && event.data.type === 'GET_CACHE_STATS') {
        event.waitUntil(getCacheStats().then(stats => {
            event.ports[0].postMessage(stats);
        }));
    }
});

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
}

async function getCacheStats() {
    const cacheNames = await caches.keys();
    const stats = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        stats[cacheName] = keys.length;
    }
    
    return stats;
} 