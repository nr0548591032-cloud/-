/* Service worker (נובמבר 2026) – רק לספירת מלאי בלי קליטה.
   לא שומר את האפליקציה ולא נתונים: כל בקשה הולכת לרשת כרגיל.
   רק כשפותחים דף ואין רשת בכלל – מוצג דף הספירה (count.html) מהעותק שנשמר. */
var CACHE = "offline-count-v1";
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(["/count.html"]); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var r = e.request;
  if (r.method !== "GET" || r.mode !== "navigate") return;   // רק פתיחת דף; כל השאר – רגיל לגמרי
  e.respondWith(fetch(r).then(function(res){
    if (new URL(r.url).pathname === "/count.html" && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put("/count.html", copy); }); }
    return res;
  }).catch(function(){ return caches.match("/count.html"); }));
});
