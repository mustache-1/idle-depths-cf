// Idle Depths — service worker
//
// What this is for: letting the game install to a home screen and open instantly, even on
// a dead signal. It is deliberately conservative, because the game already has its own
// update mechanism (checkBuild polls /api/version every 10s and prompts a reload) and a
// cache that fought it would leave players stuck on an old build with no way forward.
//
// The rules, in the order the fetch handler applies them:
//   1. /api/*            never touched. Saves, board, crew, version — always the network.
//   2. navigations       network first, cache as fallback. A reload therefore always gets
//                        the newest index.html when there is signal, which keeps the
//                        build-hash prompt working; with no signal you still get the game.
//   3. same-origin files  stale-while-revalidate. Icons and the manifest render instantly
//                        and quietly refresh behind you.
//   4. fonts and icons    cache first. Figtree and Tabler are versioned URLs that never
//                        change contents, and they are what makes an offline load look
//                        broken when they are missing.
//
// Bump CACHE when you change this file — the old caches are dropped on activate.
const CACHE = "idle-depths-v1";
const SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/icon-180.png", "/icon.svg"];

self.addEventListener("install", e => {
  // addAll fails the whole install if any one entry 404s, so each is added on its own and
  // allowed to fail. A missing icon should not stop the game caching.
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const CDN = /^https:\/\/(fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com)/;

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1. anything live stays live
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  // 2. the page itself
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(CACHE);
        c.put("/", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("/")) || new Response(
          "<h1>Idle Depths</h1><p>No connection, and the mine hasn't been saved to this device yet. Open it once with signal and it will work offline after that.</p>",
          { headers: { "content-type": "text/html" }, status: 503 });
      }
    })());
    return;
  }

  // 3. our own static files
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
        return r;
      }).catch(() => hit);
      return hit || net;
    })());
    return;
  }

  // 4. fonts and the icon set
  if (CDN.test(req.url)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        // Cross-origin responses come back opaque; they still serve fine from cache.
        if (r.status === 200 || r.type === "opaque") (await caches.open(CACHE)).put(req, r.clone());
        return r;
      } catch {
        return new Response("", { status: 504 });
      }
    })());
  }
});

// The page asks for this when its own build check spots a new version, so the worker
// doesn't sit in "waiting" until every tab is closed.
self.addEventListener("message", e => { if (e.data === "skip-waiting") self.skipWaiting(); });
