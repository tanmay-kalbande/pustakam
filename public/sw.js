const SW_VERSION = 'pustakam-v0.1.4';
const APP_SHELL_CACHE = `${SW_VERSION}-app-shell`;
const STATIC_CACHE = `${SW_VERSION}-static`;
const IMAGE_CACHE = `${SW_VERSION}-images`;
const ALL_CACHES = [APP_SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE];
const APP_SHELL_URLS = ['/', '/index.html', '/pustakam-logo.png', '/manifest.json'];
const MAX_IMAGE_ENTRIES = 40;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length <= maxEntries) {
    return;
  }

  await cache.delete(keys[0]);
  await trimCache(cacheName, maxEntries);
}

async function networkFirst(request, fallbackUrl = '/index.html') {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response?.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match(fallbackUrl);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(response => {
      if (response?.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function cacheFirstWithLimit(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response?.ok) {
    cache.put(request, response.clone()).catch(() => {});
    trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES).catch(() => {});
  }
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => Promise.allSettled(APP_SHELL_URLS.map(url => cache.add(url))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (!ALL_CACHES.includes(cacheName) && cacheName.startsWith('pustakam-')) {
          return caches.delete(cacheName);
        }
        return Promise.resolve(false);
      })
    ))
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (/\.(js|css|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstWithLimit(event.request));
    return;
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
