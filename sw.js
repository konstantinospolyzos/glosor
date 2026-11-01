// Offline support: the newest files when online, the saved copies when offline (practising on the
// underground works). Google Drive and Google sign-in always go to the network.
// The Savings Tracker lives on the same website, so only this app's own caches are touched here.
const PREFIX = "glosor-";
const CACHE = `${PREFIX}v9`;
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/app.js", "js/core.js", "js/data.js", "js/store.js", "js/ui.js", "js/speech.js", "js/config.js",
  "js/pages/common.js", "js/pages/practise.js", "js/pages/words.js", "js/pages/quiz.js", "js/pages/timed.js", "js/pages/settings.js", "js/pages/welcome.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((resp) => {
    if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(event.request, copy)); }
    return resp;
  }).catch(() => caches.match(event.request, { ignoreSearch: true })));
});
