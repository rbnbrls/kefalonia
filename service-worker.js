// ═══════════════════════════════════════════════════════
//  SERVICE WORKER — Kefalonia Vakantie App
//  Strategie:
//    - Lokale bestanden: pre-cache bij install, cache-first bij fetch
//    - CDN (Leaflet, fonts): cache-first met network-fallback
//    - Weather API (Open-Meteo): network-first met cache-fallback
//    - OSRM routing: pass-through (app heeft haversine-fallback)
// ═══════════════════════════════════════════════════════

const CACHE_VERSION = 'kefalonia-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/activities.generated.js',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: pre-cache lokale bestanden ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: verwijder verouderde cache-versies ─────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: caching-strategie per request-type ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Alleen GET-requests cachen
  if (request.method !== 'GET') return;

  // Weather API: network-first, bij fout cache-fallback
  if (url.hostname === 'api.open-meteo.com') {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // OSRM routing: pass-through (app heeft eigen fallback)
  if (url.hostname === 'router.project-osrm.org') {
    return;
  }

  // Alles anders (lokale bestanden + CDN): cache-first
  event.respondWith(cacheFirstWithNetwork(request));
});

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return new Response('Offline — geen cache beschikbaar', { status: 503 });
  }
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    return cached || new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
