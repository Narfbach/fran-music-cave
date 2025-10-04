const CACHE_VERSION = 'v2'; // Incrementar versión para limpiar cache vieja
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/fran-music-cave/',
    '/fran-music-cave/index.html',
    '/fran-music-cave/styles.min.css',
    '/fran-music-cave/script.min.js',
    '/fran-music-cave/chat.min.js',
    '/fran-music-cave/upload.min.js',
    '/fran-music-cave/custom-alert.js'
];

// Install - cache static assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch - network first for HTML, cache first for assets
self.addEventListener('fetch', e => {
    const { request } = e;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Firebase and external APIs - always fetch fresh
    if (request.url.includes('firebase') ||
        request.url.includes('gstatic') ||
        request.url.includes('firestore')) {
        return;
    }

    const isHTMLPage = request.url.endsWith('.html') ||
                       request.url.endsWith('/') ||
                       !request.url.match(/\./);

    if (isHTMLPage) {
        // Network first for HTML pages to avoid stale content
        e.respondWith(
            fetch(request)
                .then(response => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
    } else {
        // Cache first for static assets (CSS, JS, images)
        e.respondWith(
            caches.match(request)
                .then(cached => {
                    if (cached) return cached;

                    return fetch(request).then(response => {
                        if (response && response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(STATIC_CACHE)
                                .then(cache => cache.put(request, responseClone));
                        }
                        return response;
                    });
                })
        );
    }
});
