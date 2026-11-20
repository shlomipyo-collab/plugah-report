// Service worker מינימלי: מאפשר התקנה כאפליקציה.
// תמיד מנסה קודם רשת (כדי שכל עדכון יגיע מיד), ושומר עותק אחרון רק לגישה בלי קליטה.
// קריאות לשרת (script.google.com) לא עוברות כאן בכלל.
const CACHE = "pluga-shell-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./")))
  );
});
