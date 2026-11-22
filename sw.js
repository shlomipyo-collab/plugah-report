// Service worker מינימלי: מאפשר התקנה כאפליקציה.
// תמיד מנסה קודם רשת (כדי שכל עדכון יגיע מיד), ושומר עותק אחרון רק לגישה בלי קליטה.
// קריאות לשרת (script.google.com) לא עוברות כאן בכלל.
const CACHE = "pluga-shell-v3";
self.addEventListener("install", () => self.skipWaiting());
// עדכון: כל שינוי בקובץ הזה גורם לטלפונים להתקין את הגרסה החדשה ברענון הבא
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    // no-cache: תמיד בודק מול השרת אם יש גרסה חדשה (בלי זה הדפדפן מחזיק עותק ישן עד 10 דקות)
    fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./")))
  );
});

// ===== התראות פוש (Firebase Cloud Messaging, הודעות data) =====
self.addEventListener("push", e => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j.notification || j; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "מסייעת 8109";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "", icon: "icons/icon-192.png", dir: "rtl", lang: "he",
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
