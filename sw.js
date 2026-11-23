// Service worker: פתיחה מיידית מהעותק השמור, ועדכון ברקע.
// אם הורדה גרסה חדשה של האפליקציה - הדף מקבל הודעה ומציע "רענון".
// קריאות לשרת (script.google.com) לא עוברות כאן בכלל.
const CACHE = "pluga-shell-v6";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
let updateReady = false; // אם הדף עוד לא האזין כשהעדכון זוהה - נודיע לו כשיאמר "ready"
self.addEventListener("message", e => {
  if (e.data && e.data.type === "ready" && updateReady && e.source) { updateReady = false; e.source.postMessage({ type: "app-updated" }); }
});
const tagOf = r => r && (r.headers.get("etag") || r.headers.get("last-modified") || "");
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = isPage ? "./" : req;
    const cached = await cache.match(key, { ignoreSearch: isPage });
    const net = fetch(isPage ? new URL("./", self.registration.scope).href : req.url, { cache: "no-cache", credentials: "same-origin" }).then(async res => {
      if (res && res.ok) {
        await cache.put(key, res.clone());
        if (isPage && cached && tagOf(cached) && tagOf(res) && tagOf(cached) !== tagOf(res)) {
          updateReady = true;
          const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
          list.forEach(c => c.postMessage({ type: "app-updated" }));
        }
      }
      return res;
    });
    if (cached) { e.waitUntil(net.catch(() => {})); return cached; }
    try { return await net; } catch (err) { return (await cache.match("./")) || Response.error(); }
  })());
});

// ===== התראות פוש (Firebase Cloud Messaging, הודעות data) =====
self.addEventListener("push", e => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j.notification || j; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "מסייעת 8109";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/badge-96.png?v=2", dir: "rtl", lang: "he",
    tag: d.tag || undefined, renotify: Boolean(d.tag), data: { go: d.go || "" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.go) || "";
  const url = new URL(go ? "./?go=" + encodeURIComponent(go) : "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) { if (go) c.postMessage({ type: "go", go }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
