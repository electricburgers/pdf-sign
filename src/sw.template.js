// Service worker template: vite.config.js fills in the version and file list.
// Plain script (not bundled) so it can be served as /sw.js.
const CACHE = 'pdfsign-__CACHE_VERSION__';
const PRECACHE = __PRECACHE__;
const NAVIGATION_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pdfsign-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pages: try the network first (so updates arrive), but fall back to the saved
// copy quickly when the server is down or unreachable.
function networkFirst(request) {
  const network = fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put('/', copy));
    }
    return response;
  });
  const timeout = new Promise((_, reject) => setTimeout(reject, NAVIGATION_TIMEOUT_MS));
  return Promise.race([network, timeout]).catch(() =>
    caches.match('/').then((cached) => cached || network),
  );
}

// Built files have content hashes in their names, so a saved copy is always right.
function cacheFirst(request) {
  return caches.match(request).then(
    (cached) =>
      cached ||
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }),
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/healthz') return;
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});
