/* Glamis Map — service worker KILL SWITCH
 *
 * Offline support has been disabled. This self-unregistering worker replaces
 * the previous caching worker. The browser automatically re-checks sw.js on
 * each visit; because this file differs from the old one, it installs, and on
 * activation it: clears all caches, unregisters itself, and reloads any open
 * pages so they load fresh (non-cached) assets.
 *
 * To re-enable offline, restore the caching service worker from git history
 * (and re-enable the registration in script.js + initOffline()).
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) {}
    try {
      await self.registration.unregister();
    } catch (_) {}
    // Reload controlled pages so they fetch fresh assets without the worker.
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      try { client.navigate(client.url); } catch (_) {}
    });
  })());
});

// No fetch handler — this worker never serves cached content.
