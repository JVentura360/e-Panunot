export function renderWorker(files, version) {
  return `/* Generated production static shell. No user data belongs in this cache. */
const CACHE = 'epanunot-shell-${version}';
const ROOT = self.registration.scope;
const FILES = ${JSON.stringify(files)}.map(path => new URL(path, ROOT).href);
const ALLOWED = new Set(FILES);
const SHELL = new URL('index.html', ROOT).href;
function privatePath(url) {
  const path = url.pathname.slice(new URL(ROOT).pathname.length);
  return /^(api|auth|sanctum|login|logout|register|uploads|storage)(\\/|$)/i.test(path);
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('epanunot-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(ROOT) || privatePath(url) || url.search) return;
  if (ALLOWED.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.href)).then(cached => cached || fetch(request)));
  } else if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match(SHELL))));
  }
});
`;
}
