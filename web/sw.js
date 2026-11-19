// ============================================================
// SmartCare 360 – Service Worker
// ============================================================
// Caches the app shell so the web app opens even with weak
// or no internet (after the first visit).
// ============================================================

const CACHE_NAME = "sc360-v1";

// Files to cache on install (the app shell)
const APP_SHELL = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/config.js",
  "/js/connection.js",
  "/js/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install: cache the app shell
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately (don't wait for old SW to die)
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  // Claim all open tabs immediately
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for everything else
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // Don't cache MQTT library or external resources
  if (url.origin !== self.location.origin) {
    return;
  }

  // Don't cache /dispense or /status (ESP32 API calls)
  if (url.pathname.startsWith("/dispense") || url.pathname.startsWith("/status")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        // Cache successful GET responses
        if (event.request.method === "GET" && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
