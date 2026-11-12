/* ======================================================================
   קישור לבעלי מקצוע (נובמבר 2026) – למנהל בלבד
   - בהודעה לאיש מקצוע נוסף קישור אישי למשימה אחת (pro.html#קוד). בלי סיסמה.
   - הקישור מציג רק את פרטי המשימה הזו (עותק ב-proLinks/{קוד}), לא שום נתון אחר.
   - איש המקצוע מדווח: נפתח / התחלתי / בוצע + תמונה / הערה (נשמר ב-proUpdates).
   - כאן המנהל רואה את הדיווחים ומחליט: "אשר וסגור" (התמונה נשמרת כתמונת ביצוע והמשימה נסגרת)
     או "החזר" (הודעה בוואטסאפ). שום דבר לא משתנה במשימה בלי לחיצה של המנהל.
   - הקישורים נכנסים להודעות רק אחרי שחוקי האבטחה פורסמו (בדיקה אוטומטית).
   ====================================================================== */
(function(){
  "use strict";
  if (window.proLinkFor) return;

  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var isAdmin = function(){ try { return currentRole === "admin"; } catch (e) { return false; } };   // eslint-disable-line no-undef
  var DB = function(){ try { return db; } catch (e) { return null; } };                              // eslint-disable-line no-undef
  var ORIGIN = location.origin;
  var OK = false, updates = [], opened = {}, lastLoad = 0;

  function rnd(n){ var a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", s = "", b = new Uint8Array(n); crypto.getRandomValues(b); for (var i = 0; i < n; i++) s += a[b[i] % a.length]; return s; }
  function taskByToken(tok){ try { return data.tasks.find(function(t){ return t && t.proToken === tok; }) || null; } catch (e) { return null; } }   // eslint-disable-line no-undef

  /* האם הקישורים פעילים? קריאה של מסמך בדיקה בלי התחברות – מצליחה רק אחרי שהחוקים פורסמו */
  async function probe(){
    if (!isAdmin() || !DB()) return;
    try {
      var ref = DB().collection("proLinks").doc("_probe");
      var s = await ref.get(); if (!s.exists) await ref.set({ probe: true });
      var r = await fetch("https://firestore.googleapis.com/v1/projects/naftali-menael/databases/(default)/documents/proLinks/_probe?key=" + encodeURIComponent(firebase.app().options.apiKey));   // eslint-disable-line no-undef
      OK = r.ok;
    } catch (e) { OK = false; }
    window.PRO_LINKS_OK = OK;
    if (OK) loadUpdates();
  }

  /* יצירת/עדכון הקישור למשימה. מחזיר כתובת, או "" אם הקישורים עוד לא פעילים */
  window.proLinkFor = function(t){
    if (!OK || !t || !isAdmin()) return "";
    if (!t.proToken) { t.proToken = rnd(20); try { tkSave(); } catch (e) {} }                       // eslint-disable-line no-undef
    var photos = (t.docs || []).filter(function(d){ return d && d.fileUrl && /\.(jpe?g|png|webp|heic)(\?|$)/i.test(d.fileUrl + "") && d.docType !== "תמונת ביצוע"; }).map(function(d){ return d.fileUrl; }).slice(0, 4);
    var doc = { taskId: t.id, code: (function(){ try { return tkCode(t); } catch (e) { return ""; } })(), title: t.desc || "", place: t.place || "",   // eslint-disable-line no-undef
      notes: t.notes || "", due: t.due || "", dueHe: (function(){ try { return t.due ? fmtDateHe(t.due) : ""; } catch (e) { return t.due || ""; } })(),   // eslint-disable-line no-undef
      assignee: t.assignee || "", photos: photos, from: "נפתלי רוזנברג", updatedAt: Date.now(), closed: false };
    DB().collection("proLinks").doc(t.proToken).set(doc).catch(function(e){ console.warn("proLink:", e); });
    return ORIGIN + "/pro.html#" + t.proToken;
  };

  /* הוספת הקישור להודעות לאיש מקצוע (ההודעה הרגילה + תזכורת) */
  function hook(){
    try {
      if (typeof buildProMessage === "function" && !buildProMessage.__pro) {                        // eslint-disable-line no-undef
        var o1 = buildProMessage;                                                                    // eslint-disable-line no-undef
        buildProMessage = function(list, who){                                                       // eslint-disable-line no-global-assign, no-undef
          var m = o1.apply(this, arguments);
          if (!OK) return m;
          var L = (list || []).filter(function(r){ return r && data.tasks.indexOf(r) >= 0; });     // eslint-disable-line no-undef
          if (!L.length) return m;
          var links = L.map(function(r){ var u = window.proLinkFor(r); return u ? (L.length > 1 ? "🔖 " + (function(){ try { return tkCode(r); } catch (e) { return ""; } })() + ": " : "") + u : ""; }).filter(Boolean);   // eslint-disable-line no-undef
          return links.length ? m + "\n\n📲 לעדכון \"בוצע\" ושליחת תמונה:\n" + links.join("\n") : m;
        };
        buildProMessage.__pro = true;                                                                // eslint-disable-line no-undef
      }
      if (typeof proNudgeText === "function" && !proNudgeText.__pro) {                              // eslint-disable-line no-undef
        var o2 = proNudgeText;                                                                       // eslint-disable-line no-undef
        proNudgeText = function(t){ var m = o2.apply(this, arguments); var u = OK ? window.proLinkFor(t) : ""; return u ? m + "\n📲 לעדכון בקישור: " + u : m; };   // eslint-disable-line no-global-assign, no-undef
        proNudgeText.__pro = true;                                                                   // eslint-disable-line no-undef
      }
      if (typeof dbAlerts === "function" && !dbAlerts.__pro) {                                      // eslint-disable-line no-undef
        var o3 = dbAlerts;                                                                           // eslint-disable-line no-undef
        dbAlerts = function(){                                                                       // eslint-disable-line no-global-assign, no-undef
          var A = o3.apply(this, arguments) || [];
          if (!isAdmin()) return A;
          var add = reports().filter(function(u){ return u.kind === "done" || u.kind === "note"; }).map(function(u){
            return { lvl: 2, ico: "tasks", tab: "tasks", n: null, title: (u.t.assignee || "איש המקצוע") + (u.kind === "done" ? " דיווח: בוצע" : " שלח הערה"), sub: (function(){ try { return tkCode(u.t); } catch (e) { return ""; } })() + " " + (u.t.desc || ""),   // eslint-disable-line no-undef
              act: function(){ try { switchTab("tasks"); } catch (e) {} setTimeout(function(){ var b = document.getElementById("proInbox"); if (b) b.scrollIntoView({ behavior: "smooth", block: "start" }); }, 250); } };   // eslint-disable-line no-undef
          });
          return add.concat(A);
        };
        dbAlerts.__pro = true;                                                                       // eslint-disable-line no-undef
      }
    } catch (e) { console.warn("pro hook:", e); }
  }

  /* ---------- דיווחים שהגיעו ---------- */
  async function loadUpdates(){
    if (!OK || !isAdmin()) return;
    lastLoad = Date.now();
    try {
      var snap = await DB().collection("proUpdates").orderBy("at", "desc").limit(150).get();
      var list = []; opened = {};
      snap.forEach(function(d){ var v = d.data() || {}; v._id = d.id; if (v.kind === "open") { if (!opened[v.token] || opened[v.token] < v.at) opened[v.token] = v.at; } if (!v.handled && v.kind !== "open") list.push(v); });
      updates = list;
    } catch (e) { console.warn("proUpdates:", e); }
    render();
  }
  function reports(){
    return updates.map(function(u){ var t = taskByToken(u.token); return t ? Object.assign({ t: t }, u) : null; }).filter(Boolean);
  }
  function ago(ms){
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 2) return "עכשיו"; if (m < 60) return "לפני " + m + " דקות";
    var h = Math.round(m / 60); if (h < 24) return h === 1 ? "לפני שעה" : "לפני " + h + " שעות";
    var d = Math.round(h / 24); return d === 1 ? "אתמול" : "לפני " + d + " ימים";
  }
  function beforePhoto(t){ var d = (t.docs || []).find(function(x){ return x && x.fileUrl && x.docType !== "תמונת ביצוע" && /\.(jpe?g|png|webp)(\?|$)/i.test(x.fileUrl); }); return d ? d.fileUrl : ""; }

  function render(){
    var sec = document.getElementById("tab-tasks"); if (!sec || !isAdmin()) return;
    var box = document.getElementById("proInbox");
    if (!box) { box = document.createElement("div"); box.id = "proInbox"; var w = sec.querySelector(".sh-wait"); sec.insertBefore(box, w ? w.nextSibling : sec.firstChild); }
    var R = reports();
    var waiting = [];
    try {
      waiting = data.tasks.filter(function(t){ return t && t.proToken && tkStatus(t) !== "בוצע"; }).map(function(t){   // eslint-disable-line no-undef
        var o = opened[t.proToken], sentDays = t.sentAt ? Math.max(0, Math.round((Date.now() - new Date(t.sentAt).getTime()) / 864e5)) : null;
        return { t: t, o: o, days: sentDays };
      });
    } catch (e) {}
    if (!R.length && !waiting.length) { box.innerHTML = ""; return; }
    var code = function(t){ try { return tkCode(t); } catch (e) { return ""; } };   // eslint-disable-line no-undef
    var first = function(n){ return String(n || "").split(/\s+/)[0] || "איש המקצוע"; };
    box.innerHTML = R.map(function(u, i){
      var t = u.t, bp = beforePhoto(t);
      var head = u.kind === "done" ? " דיווח: בוצע" : u.kind === "start" ? " התחיל לעבוד" : " שלח הערה";
      return '<div class="pi-card ' + u.kind + '"><div class="pi-h"><span class="pi-i">' + (u.kind === "done" ? "✓" : u.kind === "start" ? "▶" : "✎") + '</span><div><b>' + esc((t.assignee || "איש המקצוע") + head) + '</b><small>' + esc(code(t) + " " + (t.desc || "") + " · " + ago(u.at)) + '</small></div></div>' +
        (u.photo ? '<div class="pi-ph">' + (bp ? '<a href="' + esc(bp) + '" target="_blank" rel="noopener"><img src="' + esc(bp) + '" alt=""><span>לפני</span></a>' : '') + '<a href="' + esc(u.photo) + '" target="_blank" rel="noopener"><img src="' + esc(u.photo) + '" alt=""><span>אחרי – מהטלפון של ' + esc(first(t.assignee)) + '</span></a></div>' : '') +
        (u.note ? '<div class="pi-note">"' + esc(u.note) + '"</div>' : '') +
        '<div class="pi-a">' + (u.kind === "done" ? '<button type="button" class="ok" data-pi="ok" data-i="' + i + '">✓ אשר וסגור</button><button type="button" data-pi="back" data-i="' + i + '">החזר ל' + esc(first(t.assignee)) + '</button>'
          : u.kind === "start" ? '<button type="button" class="ok" data-pi="start" data-i="' + i + '">סמן "בביצוע"</button><button type="button" data-pi="dismiss" data-i="' + i + '">הבנתי</button>'
          : '<button type="button" data-pi="open" data-i="' + i + '">פתח משימה</button><button type="button" data-pi="dismiss" data-i="' + i + '">הבנתי</button>') + '</div>' +
        (u.kind === "done" ? '<div class="pi-sub">אחרי אישור: המשימה נסגרת, התמונה נשמרת בה' + ((t.docs || []).some(function(d){ return d && d.docType && /חשבונית/.test(d.docType); }) ? "" : ", ונפתחת תזכורת לחשבונית") + '</div>' : '') + '</div>';
    }).join("") +
    (waiting.length ? '<div class="pi-wait"><div class="pi-wh">משימות ששלחת בקישור ומחכות לאיש מקצוע</div>' + waiting.slice(0, 8).map(function(w){
      var p = w.o ? '<span class="pill open">פתח את הקישור ' + esc(ago(w.o)) + '</span>' : (w.days !== null && w.days >= 2 ? '<span class="pill late">לא פתח ' + w.days + ' ימים</span>' : '<span class="pill">עוד לא פתח</span>');
      return '<div class="pi-wr"><span>' + esc(code(w.t) + " " + (w.t.desc || "")) + '</span>' + p + '</div>';
    }).join("") + '</div>' : '');
    box._R = R;
  }
  document.addEventListener("click", async function(e){
    var b = e.target.closest && e.target.closest("#proInbox [data-pi]"); if (!b) return;
    var box = document.getElementById("proInbox"), u = box._R[Number(b.getAttribute("data-i"))]; if (!u) return;
    var k = b.getAttribute("data-pi"), t = u.t;
    var handled = function(){ updates = updates.filter(function(x){ return x._id !== u._id; }); DB().collection("proUpdates").doc(u._id).update({ handled: true, photo: firebase.firestore.FieldValue.delete() }).catch(function(er){ console.warn(er); }); render(); };   // eslint-disable-line no-undef
    try {
      if (k === "ok") {
        b.disabled = true; b.textContent = "שומר…";
        if (u.photo) {
          var blob = await (await fetch(u.photo)).blob();
          var path = "uploads/tasks-photos/" + t.id + "_" + Date.now() + "_pro.jpg";
          var ref = storage.ref().child(path); await ref.put(blob, { contentType: "image/jpeg" });   // eslint-disable-line no-undef
          var url = await ref.getDownloadURL();
          t.docs = t.docs || []; var n = t.docs.filter(function(d){ return d && d.docType === "תמונת ביצוע"; }).length;
          t.docs.push({ name: n ? "תמונת ביצוע " + (n + 1) : "תמונת ביצוע", topic: "", docType: "תמונת ביצוע", fileUrl: url, uploadedAt: new Date().toISOString().slice(0, 10) });
        }
        try { tkLog(t, (t.assignee || "איש המקצוע") + " דיווח בוצע בקישור" + (u.note ? ": " + u.note : "")); } catch (er) {}   // eslint-disable-line no-undef
        tkSetStatus(t, "בוצע");                                                                      // eslint-disable-line no-undef
        try { tkSave(); renderTasks(); } catch (er) {}                                              // eslint-disable-line no-undef
        if (!(t.docs || []).some(function(d){ return d && d.docType && /חשבונית/.test(d.docType); })) { try { mtAdd({ title: "לקבל חשבונית מ" + (t.assignee || "איש המקצוע") + " – " + (t.desc || ""), type: "doc", due: "" }); } catch (er) {} }   // eslint-disable-line no-undef
        DB().collection("proLinks").doc(t.proToken).update({ closed: true }).catch(function(){});
        handled();
      } else if (k === "back") {
        var text = "שלום " + (String(t.assignee || "").split(/\s+/)[0]) + ", לגבי " + (function(){ try { return tkCode(t); } catch (er) { return ""; } })() + " " + (t.desc || "") + " – זה עוד לא סגור אצלנו. אפשר לבדוק שוב? 🙏";   // eslint-disable-line no-undef
        var link = window.proLinkFor(t); if (link) text += "\n📲 " + link;
        if (tkWhatsApp(t, text, "הוחזר ל" + (t.assignee || "איש המקצוע") + " אחרי הדיווח בקישור")) handled();   // eslint-disable-line no-undef
      } else if (k === "start") {
        tkSetStatus(t, "בביצוע"); try { tkSave(); renderTasks(); } catch (er) {} handled();          // eslint-disable-line no-undef
      } else if (k === "open") {
        try { tkOpen(t.id); } catch (er) {} handled();                                              // eslint-disable-line no-undef
      } else handled();
    } catch (er) {
      console.error(er); b.disabled = false;
      if (window.shNote) window.shNote("הפעולה לא הצליחה: " + (er.message || er) + "\nשום דבר לא השתנה במשימה.");
    }
  });

  var st = document.createElement("style");
  st.textContent = '#proInbox{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}#proInbox:empty{display:none}' +
    '.pi-card{background:#fbf7f0;border-radius:18px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 2px rgba(46,43,37,.10),0 8px 22px rgba(46,43,37,.08);border:2px solid #eee7db}.pi-card.done{border-color:#18864c}' +
    '.pi-h{display:flex;align-items:center;gap:10px}.pi-h b{display:block;font-size:15px}.pi-h small{display:block;font-size:12px;color:#7a7166}' +
    '.pi-i{width:38px;height:38px;border-radius:12px;background:#2f74d0;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex:0 0 auto}.done .pi-i{background:#18864c}' +
    '.pi-ph{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pi-ph a{position:relative;display:block}.pi-ph img{width:100%;height:120px;object-fit:cover;border-radius:12px;background:#d9d1c4;display:block}.pi-ph span{position:absolute;bottom:6px;right:6px;background:#ffffffd9;border-radius:8px;padding:2px 7px;font-size:11px;font-weight:700;color:#3f4a2c}' +
    '.pi-note{font-size:13.5px;background:#fff;border-radius:10px;padding:8px 10px}' +
    '.pi-a{display:flex;gap:8px}.pi-a button{flex:0 0 auto;height:44px;border:none;border-radius:13px;background:#eee7db;color:#201e1d;font-family:inherit;font-size:14px;font-weight:700;padding:0 14px;cursor:pointer}.pi-a button.ok{flex:1;background:#18864c;color:#fff}' +
    '.pi-sub{font-size:12px;color:#7a7166}' +
    '.pi-wait{background:#fbf7f0;border-radius:18px;padding:10px 14px;box-shadow:0 1px 2px rgba(46,43,37,.10)}.pi-wh{font-size:12.5px;font-weight:700;color:#645c50;margin-bottom:4px}' +
    '.pi-wr{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(32,30,29,.08);font-size:13.5px;font-weight:600}.pi-wr:nth-child(2){border-top:none}.pi-wr span:first-child{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.pi-wr .pill{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:#eee7db;color:#645c50;white-space:nowrap}.pi-wr .pill.open{background:#e1ecfb;color:#2563c4}.pi-wr .pill.late{background:#fde3e1;color:#d6362f}';
  document.head.appendChild(st);

  /* הפעלה אחרי שהאפליקציה נטענה */
  var tries = 0;
  (function wait(){
    tries++;
    var ready = false; try { ready = isAdmin() && typeof cloudReady !== "undefined" && cloudReady; } catch (e) {}   // eslint-disable-line no-undef
    if (ready) { hook(); probe(); return; }
    if (tries < 120) setTimeout(wait, 1000);
  })();
  setInterval(function(){ if (OK && document.visibilityState === "visible" && Date.now() - lastLoad > 90000) loadUpdates(); }, 30000);
  document.addEventListener("visibilitychange", function(){ if (OK && document.visibilityState === "visible" && Date.now() - lastLoad > 20000) loadUpdates(); });
  /* כל פעם שהמשימות מצוירות מחדש – לצייר גם את התיבה */
  setInterval(function(){ if (OK) { var b = document.getElementById("proInbox"); if (!b || !b.isConnected) render(); } }, 3000);
})();
