// ============================================================
// NEURODISK — Service Worker (PWA)
//   Rend le site installable + accès hors-ligne aux pages/ressources
//   déjà consultées. N'intercepte QUE le même origine en GET :
//   Supabase, Gemini, fonts et CDN passent normalement (jamais cachés).
//   Respecte le cache-bust ?v= : une nouvelle version = nouvelle URL.
// ============================================================
const CACHE = 'neurodisk-v5';
const CORE = [
  '/', '/index.html', '/library.html', '/404.html',
  '/css/library.css?v=13', '/js/library.js?v=38', '/js/proms.js?v=1',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
  '/assets/icon-192.png', '/assets/icon-512.png', '/assets/logo-neurodisk.png',
];

self.addEventListener('install', (e) => {
  // best-effort, fichier par fichier : un échec n'empêche pas les autres
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
  );
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

  // Hors origine : seulement images publiques Supabase + polices + scripts CDN.
  // Réseau d'abord, cache en secours hors-ligne. Le reste passe sans interception.
  if (url.origin !== self.location.origin) {
    const cacheable =
      url.hostname === 'cdn.jsdelivr.net' ||  // supabase-js + modules ESM (boot)
      (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/')) ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
    if (cacheable) {
      e.respondWith(
        fetch(req)
          .then((r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })
          .catch(() => caches.match(req))
      );
    }
    return;
  }

  // Même origine (pages, css, js, images) : RÉSEAU D'ABORD — en ligne on a
  // toujours la vraie version (jamais une version cassée en cache) ; le cache
  // ne sert qu'en secours hors-ligne.
  e.respondWith(
    fetch(req)
      .then((r) => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('/library.html') : undefined)))
  );
});
