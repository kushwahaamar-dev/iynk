const params = new URL(self.location.href).searchParams;
const MODE = params.get('mode');
const RT = params.get('rt') === '1';
const PAGE = '/en/about';
const CACHE = 'spike-' + MODE + (RT ? '-rt' : '');

async function scan(c) {
  const res = await fetch(PAGE, { credentials: 'same-origin' });
  const text = await res.clone().text();
  await c.put(PAGE, res);
  const urls = new Set(text.match(/\/[A-Za-z0-9_\-.~%\/]+\.(?:webp|png|jpe?g|svg|woff2|css|js|ico|json|avif)(?:\?[A-Za-z0-9_=&.%-]*)?/g) || []);
  for (const u of ['/icon.svg']) urls.add(u);
  const css = [...urls].filter((u) => u.endsWith('.css'));
  for (const u of css) {
    const body = await (await fetch(u)).text();
    for (const m of body.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      if (m[1].startsWith('/')) urls.add(m[1]);
      else if (m[1].startsWith('../')) urls.add('/_next/static/' + m[1].slice(3));
    }
  }
  return [...urls];
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    let urls;
    if (MODE === 'B') urls = await scan(c);
    else urls = await (await fetch('/sw-list-' + (MODE === 'A-all' ? 'all' : 'manifest') + '.json')).json();
    const results = await Promise.all(urls.map((u) => c.add(new Request(u, { credentials: 'same-origin' })).then(() => 1, () => 0)));
    await self.skipWaiting();
    self.__precached = { total: urls.length, ok: results.reduce((a, b) => a + b, 0) };
  })());
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreVary: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (RT && res.ok) c.put(req, res.clone());
      return res;
    } catch {
      return new Response('offline-miss', { status: 504, headers: { 'x-sw-miss': '1' } });
    }
  })());
});
