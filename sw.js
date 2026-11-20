// Při každé změně souborů zvyš číslo verze, ať si telefon stáhne novou verzi.
const CACHE = "nakupy-v2";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];

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

  // Stránka: nejdřív síť (ať máš vždy nejnovější verzi), offline z cache
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put("index.html", res.clone()));
        return res;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }

  // Knihovny Firebase (verzované) a vlastní soubory: z cache, jinak ze sítě
  if (url.origin === location.origin || url.hostname === "www.gstatic.com") {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Vše ostatní (Firebase databáze, přihlášení) jde přímo, nesahat
});
