/* GEJFA Rules service worker — cache-first for full offline use on the sideline.
   The cache name comes from GEJFA_VERSION in version.js — bump it there whenever
   rules data or app files change so clients update (browsers re-check imported
   scripts on every registration.update(), so a version.js change is enough).
   Update triggers: every open/resume of the app (app.js calls registration.update()),
   and a Periodic Background Sync every 24 h (see "periodicsync" below). */

importScripts("./version.js");
const CACHE_VERSION = "gejfa-rules-v" + GEJFA_VERSION;
const SYNC_TAG = "gejfa-rulebook-sync";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./tailwind.css",
  "./app.js",
  "./version.js",
  "./search.js",
  "./flows.js",
  "./vendor/minisearch.min.js",
  "./fonts/graduate-400.woff2",
  "./fonts/barlow-400.woff2",
  "./fonts/barlow-600.woff2",
  "./fonts/barlow-700.woff2",
  "./data/rules.js",
  "./data/situations.js",
  "./data/synonyms.js",
  "./data/diagrams.js",
  "./data/flows.js",
  "./manifest.webmanifest",
  "./2026-gejfa-rules.pdf",
  "./icons/logo.png",
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

/* Periodic Background Sync (Chrome/Edge, installed PWA only): fires roughly
   every 24 h while the phone is online, even with the app closed. Two jobs:
   1. registration.update() — re-fetch sw.js; a bumped CACHE_VERSION installs
      the new version (precaching everything fresh) so the next open is current.
   2. Re-fetch every precached asset straight from the network (bypassing the
      HTTP cache) into the current cache, so content stays current even if a
      deploy went out without a version bump. Failures are tolerated — the
      existing cached copy stays in place. */
function refreshAssets() {
  return caches.open(CACHE_VERSION).then((cache) =>
    Promise.allSettled(
      ASSETS.map((url) =>
        fetch(url, { cache: "no-cache" }).then((resp) => {
          if (resp && resp.ok) return cache.put(url, resp);
        })
      )
    )
  );
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    Promise.allSettled([self.registration.update(), refreshAssets()])
  );
});
