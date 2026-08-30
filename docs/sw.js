/* GEJFA Rules service worker — cache-first for full offline use on the sideline.
   Bump CACHE_VERSION whenever rules data or app files change so clients update. */

const CACHE_VERSION = "gejfa-rules-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./search.js",
  "./vendor/minisearch.min.js",
  "./fonts/graduate-400.woff2",
  "./fonts/barlow-400.woff2",
  "./fonts/barlow-600.woff2",
  "./fonts/barlow-700.woff2",
  "./data/rules.js",
  "./data/situations.js",
  "./data/synonyms.js",
  "./data/diagrams.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first, falling back to network (and updating the cache when online). */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchAndUpdate = fetch(event.request)
        .then((resp) => {
          if (resp && resp.ok && new URL(event.request.url).origin === location.origin) {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});
