// Απλός service worker: πρώτα δίκτυο, αλλιώς ό,τι υπάρχει στην cache (για χρήση χωρίς internet στο iPhone/web).
const CACHE = 'protypa-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/files/')) return; // τα PDF δεν μπαίνουν στην cache
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
