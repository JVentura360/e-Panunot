export function renderWorker(files, version, lazy = []) {
  return `/* Generated production static shell. No user data belongs in this cache. */
const CACHE = 'epanunot-shell-${version}';
const ROOT = self.registration.scope;
const CORE = ${JSON.stringify(files)}.map(path => new URL(path, ROOT).href);
const LATER = ${JSON.stringify(lazy)}.map(path => new URL(path, ROOT).href);
const ALLOWED = new Set([...CORE, ...LATER]);
const SHELL = new URL('index.html', ROOT).href;
function privatePath(url) {
  const path = url.pathname.slice(new URL(ROOT).pathname.length);
  return /^(api|auth|sanctum|login|logout|register|uploads|storage)(\\/|$)/i.test(path);
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('epanunot-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
  // Page chunks are saved after activation so they don't compete with the first screen.
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(LATER.map(href => cache.match(href).then(hit => hit || cache.add(href)).catch(() => {})))));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(ROOT) || privatePath(url) || url.search) return;
    if (ALLOWED.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.href).then(cached => cached || fetch(request).then(response => {
      if (response.ok) cache.put(url.href, response.clone());
      return response;
    }))));
  } else if (request.mode === 'navigate') {
});
`;
}
