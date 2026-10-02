/*
 * Service worker d'Ardoise — rend l'app utilisable hors ligne.
 *
 * Stratégies :
 * - pages et données RSC : réseau d'abord (les déploiements sont visibles
 *   immédiatement), copie en cache servie si le réseau est indisponible ;
 * - /_next/static : cache d'abord (fichiers hachés, donc immuables) ;
 * - /api/* (synchro) et requêtes tierces : jamais interceptées.
 *
 * Changer VERSION invalide tous les caches au prochain chargement.
 */
const VERSION = "v1";
const PAGES_CACHE = `ardoise-pages-${VERSION}`;
const STATIC_CACHE = `ardoise-static-${VERSION}`;
const PAGES = ["/", "/transactions", "/categories", "/settings"];
const ASSETS = [
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

// Au moment de l'installation : met en cache les 4 pages, les icônes et les
// fichiers /_next/static référencés par le HTML, pour que l'app s'ouvre hors
// ligne dès la première visite.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES_CACHE);
      const statics = await caches.open(STATIC_CACHE);
      const staticUrls = new Set();
      await Promise.all(
        PAGES.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) return;
            const html = await res.clone().text();
            await pages.put(url, res);
            for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) {
              staticUrls.add(m[0]);
            }
          } catch {
            // Hors ligne pendant l'installation : la page sera mise en cache
            // à la prochaine visite.
          }
        })
      );
      await Promise.all(
        [...ASSETS, ...staticUrls].map((url) =>
          statics.add(url).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES_CACHE, STATIC_CACHE]);
      for (const key of await caches.keys()) {
        if (key.startsWith("ardoise-") && !keep.has(key)) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_vercel/")) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(req));
    return;
  }
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    // Navigation vers une page jamais visitée : on retombe sur l'accueil.
    if (req.mode === "navigate") {
      const home = await cache.match("/");
      if (home) return home;
    }
    throw err;
  }
}
