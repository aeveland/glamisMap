/* Glamis Map — service worker
 *
 * Three jobs:
 *   1. Precache the app shell + point data + symbol icons so the UI works fully
 *      offline (sanctioned — these are our own assets).
 *   2. Runtime-cache Mapbox requests (tiles, style JSON, glyphs, sprite, DEM)
 *      and location photos as they are viewed/warmed, so areas you've looked at
 *      keep working offline.
 *   3. Respond to messages from the page to ensure the shell is cached, report
 *      cache size, and clear the offline tile/photo cache.
 *
 * NOTE: bump SHELL_VERSION whenever the precache list changes. The shell list
 * references `./script.js?v=69`, which MUST match the <script> tag in
 * index.html (a paired edit, guarded by tests/validate.mjs).
 */
// Bump SHELL_VERSION whenever a precached shell asset (HTML/CSS/JS/icons/data)
// changes. TILES_VERSION is separate so a shell update does NOT wipe the user's
// downloaded offline map tiles.
const SHELL_VERSION = 'v14';
const TILES_VERSION = 'v1';
const SHELL_CACHE = `glamis-shell-${SHELL_VERSION}`;
const RUNTIME_CACHE = `glamis-tiles-${TILES_VERSION}`;
const KEEP = [SHELL_CACHE, RUNTIME_CACHE];

// Cap the runtime cache so it can't grow without bound (rough FIFO eviction).
const RUNTIME_MAX_ENTRIES = 3000;

// Same-origin assets that must be present for the app to boot offline.
const SHELL_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js?v=69',
  './manifest.webmanifest',
  './data/glamis_tileset.geojson',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // Symbol icons (default + selected variants)
  './images/adjust.png', './images/adjustSelected.png',
  './images/alt_route.png', './images/alt_routeSelected.png',
  './images/badge.png', './images/badgeSelected.png',
  './images/bolt.png', './images/boltSelected.png',
  './images/campaign.png', './images/campaignSelected.png',
  './images/camping.png', './images/campingSelected.png',
  './images/default.png',
  './images/explosion.png', './images/explosionSelected.png',
  './images/flag.png', './images/flagSelected.png',
  './images/flyover.png', './images/flyoverSelected.png',
  './images/fort.png', './images/fortSelected.png',
  './images/icecream.png', './images/icecreamSelected.png',
  './images/landscape.png', './images/landscapeSelected.png',
  './images/light_mode.png', './images/light_modeSelected.png',
  './images/local_fire_department.png', './images/local_fire_departmentSelected.png',
  './images/local_florist.png', './images/local_floristSelected.png',
  './images/local_police.png', './images/local_policeSelected.png',
  './images/microwave.png', './images/microwaveSelected.png',
  './images/military_tech.png', './images/military_techSelected.png',
  './images/pets.png', './images/petsSelected.png',
  './images/restaurant.png', './images/restaurantSelected.png',
  './images/roofing.png', './images/roofingSelected.png',
  './images/school.png', './images/schoolSelected.png',
  './images/science.png', './images/scienceSelected.png',
  './images/selected.png',
  './images/skull.png', './images/skullSelected.png',
  './images/south.png', './images/southSelected.png',
  './images/sports_bar.png', './images/sports_barSelected.png',
  './images/sports_volleyball.png', './images/sports_volleyballSelected.png',
  './images/store.png', './images/storeSelected.png',
  './images/storefront.png', './images/storefrontSelected.png',
  './images/target.png', './images/targetSelected.png',
  './images/terrain.png', './images/terrainSelected.png',
  './images/train.png', './images/trainSelected.png',
  './images/trophy.png', './images/trophySelected.png',
  './images/two_wheeler.png', './images/two_wheelerSelected.png',
  './images/water.png', './images/waterSelected.png',
  './images/water_drop.png', './images/water_dropSelected.png'
];

// Cross-origin CDN deps — cached best-effort (opaque responses are fine).
const CDN_URLS = [
  'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
  'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.14.0/dist/shoelace.js',
  'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.14.0/dist/themes/light.css'
];

// Add the app shell to the cache. Same-origin assets are added atomically;
// cross-origin CDN assets are fetched individually so one failure (or an
// opaque response) can't abort the whole install.
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL_URLS.map((u) => new Request(u, { cache: 'reload' })));
  await Promise.all(
    CDN_URLS.map(async (u) => {
      try {
        const res = await fetch(u, { mode: 'no-cors' });
        await cache.put(u, res);
      } catch (_) {
        /* tolerate CDN hiccups; runtime fetch will retry later */
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// Trim the runtime cache to a rough size cap (FIFO — oldest keys first).
async function trimRuntimeCache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  if (keys.length <= RUNTIME_MAX_ENTRIES) return;
  const excess = keys.length - RUNTIME_MAX_ENTRIES;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

// Cache-first: serve from cache, otherwise fetch + store. Used for immutable
// resources (map tiles, symbol images, photos).
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) {
    cache.put(request, res.clone()).then(() => {
      if (cacheName === RUNTIME_CACHE) trimRuntimeCache();
    });
  }
  return res;
}

// Stale-while-revalidate: serve cache immediately, refresh in the background.
// Used for style JSON / glyphs / sprite which can change over time.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await networkPromise) || fetch(request);
}

function isMapboxStyleAsset(pathname) {
  // style JSON, glyphs, sprite
  return (
    pathname.startsWith('/styles/v1/') ||
    pathname.startsWith('/fonts/v1/') ||
    pathname.includes('/sprite')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Mapbox runtime assets
  if (url.hostname === 'api.mapbox.com') {
    if (isMapboxStyleAsset(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    } else {
      // tiles (/v4, /raster/v1, .../{z}/{x}/{y}) — immutable by URL
      event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    }
    return;
  }

  // Same-origin requests
  if (url.origin === self.location.origin) {
    // Location photos — cache on view (covers the `images/IMG_*.jpeg` outlier too)
    if (url.pathname.includes('/popupImages/') || /\/images\/IMG_[^/]+\.jpe?g$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, RUNTIME_CACHE));
      return;
    }
    // App shell — cache-first, fall back to the cached index for navigations
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const hit = await cache.match(request, { ignoreSearch: false });
        if (hit) return hit;
        try {
          return await fetch(request);
        } catch (err) {
          if (request.mode === 'navigate') {
            const index = await cache.match('./index.html');
            if (index) return index;
          }
          throw err;
        }
      })()
    );
    return;
  }

  // Other cross-origin (CDNs) — cache-first best effort
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// Page → SW messaging
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'ENSURE_SHELL') {
    event.waitUntil(precacheShell());
  } else if (data.type === 'CLEAR_TILES') {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  } else if (data.type === 'CLEAR_ALL') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});
