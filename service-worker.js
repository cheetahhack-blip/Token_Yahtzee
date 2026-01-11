const CACHE_VERSION = "v2"; // 変更したら v2, v3... に上げる
const CACHE_NAME = `token-yahtzee-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./service-worker.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./src/app.js",
  "./src/game.js",
  "./src/scoring.js",
  "./src/cpu.js",
  "./src/storage.js",
  "./src/achievements.js",
  "./src/dialogues.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith("token-yahtzee-") && k !== CACHE_NAME)
      .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // 同一オリジンのGETだけキャッシュ
      const url = new URL(req.url);
      if (url.origin === self.location.origin && res.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // オフラインで未キャッシュの場合はトップに逃がす（最低限起動）
      return caches.match("./");
    }
  })());
});
