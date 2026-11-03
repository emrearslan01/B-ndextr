// BINDEX — service worker: makes the site work offline after the first visit
// (fair Wi-Fi is unreliable). Bump VERSION whenever you deploy new assets.
const VERSION = 'bindex-v1';

const PRECACHE = [
  './',
  'index.html',
  'css/style.css',
  'js/main.js',
  'js/config.js',
  'js/scroll-fx.js',
  'js/showroom.js',
  'vendor/three.min.js',
  'vendor/qrcode.mjs',
  'assets/fonts/inter-latin-300-normal.woff2',
  'assets/fonts/inter-latin-400-normal.woff2',
  'assets/fonts/inter-latin-500-normal.woff2',
  'assets/fonts/inter-latin-600-normal.woff2',
  'assets/fonts/inter-latin-700-normal.woff2',
  'assets/fonts/inter-latin-ext-300-normal.woff2',
  'assets/fonts/inter-latin-ext-400-normal.woff2',
  'assets/fonts/inter-latin-ext-500-normal.woff2',
  'assets/fonts/inter-latin-ext-600-normal.woff2',
  'assets/fonts/inter-latin-ext-700-normal.woff2',
  'assets/icons/favicon.svg',
  'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Fingerprint-free but rarely changing files: cache first.
  const cacheFirst = /\/(assets|vendor)\//.test(url.pathname);

  if (cacheFirst) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // HTML / CSS / JS: network first so updates show up, cache when offline.
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
