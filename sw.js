// ============================================================
// NEURODISK — Service Worker NEUTRALISÉ (kill-switch)
// ------------------------------------------------------------
// Le cache hors-ligne causait des versions cassées (connexion
// bloquée sur mobile). Ce service worker ne fait plus QUE :
//   1. supprimer tous les caches,
//   2. se désinscrire,
//   3. recharger les pages ouvertes pour repartir propre.
// Aucune interception réseau → le site fonctionne normalement.
// ============================================================
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
    try { await self.registration.unregister(); } catch {}
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.navigate(c.url));
    } catch {}
  })());
});
// Pas de gestionnaire 'fetch' : toutes les requêtes vont au réseau normalement.
