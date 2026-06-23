// ============================================================
// NEURODISK — Service Worker (PWA)
//   Rend le site installable + accès hors-ligne aux pages/ressources
//   déjà consultées. N'intercepte QUE le même origine en GET :
//   Supabase, Gemini, fonts et CDN passent normalement (jamais cachés).
//   Respecte le cache-bust ?v= : une nouvelle version = nouvelle URL.
// ============================================================
const CACHE = 'neurodisk-v2';
const CORE = [
  '/', '/index.html', '/library.html', '/404.html',
  '/assets/icon-192.png', '/assets/icon-512.png', '/assets/logo-neurodisk.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Hors origine : on met en cache UNIQUEMENT les images/fichiers publics
  // (Supabase Storage public) et les polices, pour l'affichage hors-ligne.
  // Tout le reste (API Supabase, Gemini, YouTube) passe sans interception.
  if (url.origin !== self.location.origin) {
    const cacheable =
      (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/')) ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
    if (cacheable) {
      e.respondWith(
        caches.match(req).then((m) =>
          m || fetch(req).then((r) => {
            if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
            return r;
          }).catch(() => m)
        )
      );
    }
    return;
  }

  // Navigation : réseau d'abord (toujours à jour), cache en secours hors-ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('/index.html')))
    );
    return;
  }

  // Statique (css/js/images) : cache d'abord, puis réseau (et on met en cache)
  e.respondWith(
    caches.match(req).then((m) =>
      m || fetch(req).then((r) => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return r;
      }).catch(() => m)
    )
  );
});
