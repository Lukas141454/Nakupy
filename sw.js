// Vlastní soubory se berou vždy nejdřív ze sítě (aktualizace se projeví hned),
// offline z cache. Číslo verze stačí zvýšit jen výjimečně.
const CACHE = "nakupy-v3";
const SHELL = ["./", "index.html", "config.js", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Vlastní soubory: síť → při výpadku cache
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "index.html" : req, copy));
        }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || caches.match("index.html")))
    );
    return;
  }

  // Knihovny Firebase (verzované, nemění se): z cache, jinak ze sítě
  if (url.hostname === "www.gstatic.com") {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Vše ostatní (databáze, přihlášení, ntfy) jde přímo
});
