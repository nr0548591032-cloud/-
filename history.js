/* ======================================================================
   היסטוריה ושחזור (נובמבר 2026) – למנהל בלבד
   - קורא את הגיבויים האוטומטיים שכבר נשמרים בכל שמירה (X__backup, עד 10 גרסאות למסמך)
     ומשווה בין גרסה לגרסה: מה נוסף, מה נמחק ומה שונה, ומתי.
   - "החזר" מחזיר פריט אחד בלבד (משימה, איש קשר, מפתח...) – שאר הנתונים לא זזים.
     הוא קורא את המצב העדכני מהענן, משנה רק את הפריט הזה, ושומר בדרך הרגילה
     (כולל גיבוי לפני השמירה ובדיקת עדכון ממכשיר אחר), ואז מרענן את הדף.
   - המסך עצמו רק קורא. שום דבר לא נשמר בלי לחיצה על "החזר" ואישור.
   ====================================================================== */
(function(){
  "use strict";
  if (window.openHistory) return;

  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var isAdmin = function(){ try { return currentRole === "admin"; } catch (e) { return false; } };   // eslint-disable-line no-undef
  var tabLabel = function(t){ try { return tabLabels[t] || t; } catch (e) { return t; } };          // eslint-disable-line no-undef
  var keyLabel = function(k){ try { return BACKUP_KEY_LABELS[k] || k; } catch (e) { return k; } };  // eslint-disable-line no-undef
  var sheet = function(h){ return window.shSheet ? window.shSheet(h) : null; };
  var close = function(){ if (window.shClose) window.shClose(); };
  var note = function(m){ if (window.shNote) window.shNote(m); else console.info(m); };
  var X = '<button class="sh-x" type="button" data-sh-close aria-label="סגירה"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  var head = function(t, s){ return '<div class="sh-head"><div><h3>' + esc(t) + '</h3>' + (s ? '<div style="font-size:12.5px;color:#645c50">' + esc(s) + '</div>' : '') + '</div>' + X + '</div>'; };

  /* איזה מסמך שייך לאיזה טאב */
  var KEY_TAB = {
    "tasks-data": "tasks", "myTasks-data": "tasks",
    "procurement-data": "procurement", "supply-data": "procurement", "supplyOrders-data": "procurement", "supplyKitchen-data": "procurement", "supplyBasket-data": "procurement", "food-data": "procurement",
    "licensing-data": "licensing", "ttd-data": "licensing",
    "staff-data": "staff",
    "vendorPayments-data": "accountant", "acctSends-data": "accountant", "acctInbox-data": "accountant", "accountantContact-data": "accountant",
    "recurring-data": "finance", "keys-data": "keys", "files-data": "files", "projects-data": "projects", "contacts-data": "contacts",
    "equipment-data": "equipment", "serviceContracts-data": "equipment", "maintBudget-data": "equipment"
  };
  /* שם הפריט ביחיד, לפי מסמך ורשימה */
  var NOUN = {
    "tasks-data": "משימה", "myTasks-data": "משימה אישית", "procurement-data": "פריט רכש", "licensing-data": "בדיקת רישוי",
    "contacts-data": "איש קשר", "vendorPayments-data": "תשלום לספק", "recurring-data": "הוצאה קבועה", "files-data": "מסמך",
    "projects-data": "פרויקט", "equipment-data": "פריט ציוד", "serviceContracts-data": "חוזה שירות", "acctSends-data": "משלוח למנהל החשבונות",
    "staff-data.bank": "פרטי בנק", "staff-data.roleCatalog": "תפקיד", "staff-data.installmentMeta": "הגדרת תקופה",
    "keys-data.inventory": "מפתח", "keys-data.log": "השאלת מפתח", "keys-data.holders": "מחזיק מפתח", "keys-data.masters": "מפתח מאסטר",
    "supply-data.cats": "קטגוריה", "supply-data.lists": "מחירון", "supplyOrders-data.orders": "הזמנה", "supplyOrders-data.shortages": "חוסר",
    "supplyKitchen-data.dishes": "מנה", "supplyKitchen-data.menu": "תפריט", "supplyKitchen-data.requests": "בקשה",
    "supplyBasket-data.fams": "מוצר בסל", "food-data.priceList": "פריט במחירון", "food-data.orders": "הזמנת מזון", "ttd-data.years": "שנה בתיק נתונים ושטח"
  };
  var FIELD = { status: "סטטוס", desc: "תיאור", title: "כותרת", name: "שם", due: "תאריך יעד", date: "תאריך", expiry: "תוקף", last: "בדיקה אחרונה",
    assignee: "אחראי", amount: "סכום", price: "מחיר", qty: "כמות", notes: "הערות", note: "הערה", phone: "טלפון", email: "מייל", paid: "שולם",
    approved: "אושר", holder: "מחזיק", dateIn: "החזרה", dateOut: "השאלה", items: "פריטים", category: "קטגוריה", supplier: "ספק", done: "בוצע",
    location: "מיקום", inspector: "בודק", cost: "עלות", quotes: "הצעות מחיר", url: "קובץ", account: "חשבון", bank: "בנק", branch: "סניף", monthly: "חודשי" };
  var SKIP_KEYS = /^(uiPrefs-data|loginLog.*|mosheView-data|acctView-data)$/;

  function keysForTab(t){ return Object.keys(KEY_TAB).filter(function(k){ return !t || KEY_TAB[k] === t; }); }
  function itemName(x){
    if (!x || typeof x !== "object") return "";
    var f = ["title", "name", "desc", "item", "type", "vendor", "keyDesc", "label", "code", "no", "month", "year"];
    for (var i = 0; i < f.length; i++) { var v = x[f[i]]; if (v != null && v !== "" && typeof v !== "object") return String(v); }
    return "";
  }
  var isIdArr = function(a){ return Array.isArray(a) && a.every(function(x){ return x && typeof x === "object" && !Array.isArray(x) && x.id != null; }); };
  /* מפרק ערך שמור לרשימות של פריטים עם מזהה, ושארית */
  function split(j){
    var colls = {}, rest = null;
    if (Array.isArray(j)) { if (isIdArr(j)) colls[""] = j; else rest = j; }
    else if (j && typeof j === "object") {
      rest = {};
      Object.keys(j).forEach(function(k){ if (Array.isArray(j[k]) && j[k].length && isIdArr(j[k])) colls[k] = j[k]; else if (Array.isArray(j[k]) && !j[k].length) colls[k] = []; else rest[k] = j[k]; });
    } else rest = j;
    return { colls: colls, rest: rest };
  }
  function changedFields(a, b){
    var ks = {}; Object.keys(a || {}).forEach(function(k){ ks[k] = 1; }); Object.keys(b || {}).forEach(function(k){ ks[k] = 1; });
    return Object.keys(ks).filter(function(k){ return k !== "updated" && k !== "updatedAt" && JSON.stringify(a[k]) !== JSON.stringify(b[k]); });
  }
  /* השוואה בין גרסה ישנה לחדשה שאחריה */
  function diff(key, oldJ, newJ){
    var A = split(oldJ), B = split(newJ), out = [];
    var paths = {}; Object.keys(A.colls).forEach(function(p){ paths[p] = 1; }); Object.keys(B.colls).forEach(function(p){ paths[p] = 1; });
    Object.keys(paths).forEach(function(p){
      var o = A.colls[p] || [], n = B.colls[p] || [];
      if (!A.colls[p] && p !== "" && oldJ && oldJ[p] !== undefined && !Array.isArray(oldJ[p])) return;   // מבנה שונה – ייכנס לשארית
      var om = {}, nm = {};
      o.forEach(function(x, i){ om[String(x.id)] = { x: x, i: i }; });
      n.forEach(function(x){ nm[String(x.id)] = x; });
      var noun = NOUN[key + "." + p] || NOUN[key] || "פריט";
      o.forEach(function(x, i){ var id = String(x.id); if (!nm[id]) out.push({ kind: "del", key: key, path: p, id: id, item: x, idx: i, noun: noun }); });
      n.forEach(function(x){ var id = String(x.id); if (!om[id]) out.push({ kind: "add", key: key, path: p, id: id, item: x, noun: noun }); });
      n.forEach(function(x){ var id = String(x.id), was = om[id]; if (was && JSON.stringify(was.x) !== JSON.stringify(x)) out.push({ kind: "chg", key: key, path: p, id: id, item: was.x, now: x, idx: was.i, noun: noun, fields: changedFields(was.x, x) }); });
    });
    if (JSON.stringify(A.rest) !== JSON.stringify(B.rest)) out.push({ kind: "other", key: key });
    return out;
  }

  var cache = {};   // key -> { at, events }
  async function eventsFor(key){
    if (cache[key] && Date.now() - cache[key].at < 60000) return cache[key].events;
    var c = db.collection(APP_COLLECTION);                                                                   // eslint-disable-line no-undef
    var res = await Promise.all([c.doc(key).get({ source: "server" }), c.doc(key + "__backup").get({ source: "server" })]);
    var cur = res[0].exists ? res[0].data() : null, versions = res[1].exists && Array.isArray(res[1].data().versions) ? res[1].data().versions : [];
    var events = [];
    for (var i = 0; i < versions.length; i++) {
      var newer = i === 0 ? cur : versions[i - 1];
      if (!newer || newer.value == null || versions[i].value == null) continue;
      var oj, nj; try { oj = JSON.parse(versions[i].value); nj = JSON.parse(newer.value); } catch (e) { continue; }
      var d = diff(key, oj, nj);
      var by = newer.by || "";
      d.forEach(function(ev){ ev.at = versions[i].backedUpAt || 0; ev.by = by; ev.vi = i; ev.fresh = i === 0; events.push(ev); });
    }
    cache[key] = { at: Date.now(), events: events };
    return events;
  }

  function when(ts){
    if (!ts) return "";
    var d = new Date(ts), now = new Date(), t = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ts >= day) return "היום " + t;
    if (ts >= day - 864e5) return "אתמול " + t;
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }) + " " + t;
  }
  var KIND = {
    del: { l: "נמחק", c: "var(--red, #d6362f)", undo: "להחזיר" },
    add: { l: "נוסף", c: "var(--green, #18864c)", undo: "לבטל" },
    chg: { l: "שונה", c: "#2f6fd6", undo: "להחזיר כמו שהיה" },
    other: { l: "עודכן", c: "#8a7f70", undo: "" }
  };
  function row(ev, i){
    var k = KIND[ev.kind], name = ev.item ? itemName(ev.item) : "";
    var title = ev.kind === "other" ? "עדכון כללי ב" + keyLabel(ev.key) : k.l + " " + ev.noun + (name ? ": " + name : "");
    var sub = [when(ev.at), ev.by ? "על ידי " + ev.by : "", tabLabel(KEY_TAB[ev.key])].filter(Boolean).join(" · ");
    if (ev.kind === "chg" && ev.fields && ev.fields.length) {
      var f = ev.fields.map(function(x){ return FIELD[x]; }).filter(Boolean);
      sub = (f.length ? "שונה: " + f.slice(0, 3).join(", ") : "עודכנו פרטים") + " · " + sub;
    }
    return '<div class="hs-row"><i style="background:' + k.c + '"></i><span><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span>' +
      (k.undo ? '<button type="button" data-hs="' + i + '">' + k.undo + '</button>' : '') + '</div>';
  }

  var CSS = '.hs-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.hs-chips button{flex:0 0 auto;border:1px solid #e3dbcf;background:#fff;border-radius:999px;padding:6px 12px;font-family:inherit;font-size:12.5px;font-weight:700;color:#4a443c;cursor:pointer}' +
    '.hs-chips button.on{background:#2b2723;color:#fff;border-color:#2b2723}.hs-row{display:flex;align-items:center;gap:10px;padding:10px 2px;border-top:1px solid #efe8dd}.hs-row i{width:10px;height:10px;border-radius:50%;flex:0 0 auto}' +
    '.hs-row span{flex:1;min-width:0}.hs-row b{display:block;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hs-row small{display:block;font-size:11.5px;color:#7a7166;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.hs-row button{border:none;border-radius:10px;background:#eee7db;color:#201e1d;font-family:inherit;font-size:12px;font-weight:700;padding:7px 11px;cursor:pointer;white-space:nowrap}.hs-day{font-size:12px;font-weight:700;color:#8a7f70;margin:12px 0 2px}.hs-info{font-size:12.5px;color:#645c50;line-height:1.55;background:#f6f2ec;border-radius:12px;padding:9px 12px;margin-bottom:10px}';
  function css(){ if (!document.getElementById("hsCss")) { var s = document.createElement("style"); s.id = "hsCss"; s.textContent = CSS; document.head.appendChild(s); } }

  var current = [];
  window.openHistory = async function(tab){
    if (!isAdmin()) return;
    css();
    var t = tab && tab !== "dashboard" && keysForTab(tab).length ? tab : "";
    var tabsWith = []; Object.keys(KEY_TAB).forEach(function(k){ var x = KEY_TAB[k]; if (tabsWith.indexOf(x) === -1) tabsWith.push(x); });
    try { tabsWith.sort(function(a, b){ return tabs.indexOf(a) - tabs.indexOf(b); }); } catch (e) {}           // eslint-disable-line no-undef
    var sh = sheet(head("היסטוריה ושחזור", "מה השתנה לאחרונה – ואפשר להחזיר פריט אחד בלי לגעת בשאר") +
      '<div class="hs-chips">' + ['<button type="button" data-hs-t="" class="' + (t ? "" : "on") + '">הכל</button>'].concat(tabsWith.map(function(x){ return '<button type="button" data-hs-t="' + x + '" class="' + (x === t ? "on" : "") + '">' + esc(tabLabel(x)) + '</button>'; })).join("") + '</div>' +
      '<div class="hs-list"><div class="sh-empty">טוען היסטוריה…</div></div>');
    if (!sh) return;
    sh.addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-hs-t")) { sh.querySelectorAll("[data-hs-t]").forEach(function(x){ x.classList.toggle("on", x === b); }); load(sh, b.getAttribute("data-hs-t")); }
      else if (b.hasAttribute("data-hs")) { var ev = current[Number(b.getAttribute("data-hs"))]; if (ev) askUndo(ev); }
    });
    load(sh, t);
  };

  async function load(sh, t){
    var box = sh.querySelector(".hs-list"), my = (load.n = (load.n || 0) + 1);
    box.innerHTML = '<div class="sh-empty">טוען היסטוריה…</div>';
    var keys = keysForTab(t).filter(function(k){ return !SKIP_KEYS.test(k); }), all = [], failed = 0;
    await Promise.all(keys.map(function(k){ return eventsFor(k).then(function(ev){ all = all.concat(ev); }, function(e){ failed++; console.warn("היסטוריה:", k, e); }); }));
    if (my !== load.n) return;   // נבחר בינתיים טאב אחר
    all.sort(function(a, b){ return (b.at || 0) - (a.at || 0); });
    current = all.slice(0, 250);
    var html = '<div class="hs-info">כל שמירה באפליקציה שומרת את הגרסה הקודמת. כאן רואים את 10 השמירות האחרונות בכל נושא. "להחזיר" משנה רק את הפריט הזה.</div>', lastDay = "";
    current.forEach(function(ev, i){
      var d = ev.at ? new Date(ev.at).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }) : "";
      if (d !== lastDay) { html += '<div class="hs-day">' + esc(d) + '</div>'; lastDay = d; }
      html += row(ev, i);
    });
    if (!current.length) html += '<div class="sh-empty">' + (failed ? "לא הצלחתי לקרוא את ההיסטוריה. נסה שוב בעוד רגע." : "עוד אין שינויים שמורים כאן.") + '</div>';
    if (all.length > current.length) html += '<div class="sh-empty">מוצגים 250 השינויים האחרונים</div>';
    box.innerHTML = html;
  }

  function askUndo(ev){
    var name = itemName(ev.item) || ev.noun, msg;
    if (ev.kind === "del") msg = 'להחזיר את ' + ev.noun + ' "' + name + '" שנמחק/ה ב' + when(ev.at) + '? שאר הנתונים לא ישתנו.';
    else if (ev.kind === "add") msg = 'לבטל את ההוספה של ' + ev.noun + ' "' + name + '" (נוסף/ה ב' + when(ev.at) + ')? הפריט יוסר, ועדיין יישאר בגיבוי.';
    else msg = 'להחזיר את ' + ev.noun + ' "' + name + '" למצב שהיה לפני ' + when(ev.at) + '?' + (ev.fresh ? "" : " שים לב: אם שינית אותו שוב אחר כך, גם השינויים המאוחרים יוחלפו.") + " שאר הנתונים לא ישתנו.";
    close();
    setTimeout(function(){
      if (typeof openConfirmModal === "function") openConfirmModal(msg, function(){ doUndo(ev); }, { icon: "check", noLabel: "לא עכשיו" });   // eslint-disable-line no-undef
    }, 220);
  }

  async function doUndo(ev){
    try {
      var ref = db.collection(APP_COLLECTION).doc(ev.key);                                                  // eslint-disable-line no-undef
      var snap = await ref.get({ source: "server" });
      if (!snap.exists) { note("המסמך לא נמצא בענן – לא שיניתי כלום."); return; }
      var raw = snap.data().value, cur = JSON.parse(raw);
      var arr = ev.path === "" ? cur : (cur && cur[ev.path]);
      if (ev.path !== "" && arr === undefined) { cur[ev.path] = []; arr = cur[ev.path]; }
      if (!Array.isArray(arr)) { note("המבנה של הנתונים השתנה מאז – לא שיניתי כלום."); return; }
      var idx = -1; for (var i = 0; i < arr.length; i++) if (arr[i] && String(arr[i].id) === ev.id) { idx = i; break; }
      if (ev.kind === "del") { if (idx !== -1) { note("הפריט כבר קיים – אין מה להחזיר."); return; } arr.splice(Math.min(ev.idx || 0, arr.length), 0, ev.item); }
      else if (ev.kind === "add") { if (idx === -1) { note("הפריט כבר לא קיים – אין מה לבטל."); return; } arr.splice(idx, 1); }
      else if (ev.kind === "chg") { if (idx === -1) arr.splice(Math.min(ev.idx || 0, arr.length), 0, ev.item); else arr[idx] = ev.item; }
      else return;
      var value = JSON.stringify(cur);
      if (value === raw) { note("אין מה לשנות – זה כבר במצב הזה."); return; }
      /* הבסיס הוא מה שקראנו עכשיו מהענן (ולא מה שהדף טען קודם), כך שאין כאן דריסה של עדכון ממכשיר אחר */
      try { originalLoad[ev.key] = raw; } catch (e) {}                                                  // eslint-disable-line no-undef
      await appStorage.set(ev.key, value);                                                                 // eslint-disable-line no-undef
      /* הנתונים שבזיכרון של הדף ישנים עכשיו – חוסמים שמירה נוספת של המסמך הזה עד הרענון */
      try { loadStatus[ev.key] = "failed"; } catch (e) {}                                                 // eslint-disable-line no-undef
      cache = {};
      try { sessionStorage.setItem("hsDone", "הוחזר: " + (itemName(ev.item) || ev.noun)); } catch (e) {}
      location.reload();
    } catch (e) {
      if (/ממתינה לאישור/.test(String(e && e.message))) return;   // נפתחה שאלת אישור של מנגנון השמירה
      console.error(e);
      note("השחזור לא הצליח: " + ((e && e.message) || e) + "\nשום דבר לא השתנה.");
    }
  }

  /* אחרי רענון – הודעה קטנה שהשחזור בוצע */
  try {
    var done = sessionStorage.getItem("hsDone");
    if (done) { sessionStorage.removeItem("hsDone"); setTimeout(function(){ if (typeof showToast === "function") showToast(done); }, 2500); }   // eslint-disable-line no-undef
  } catch (e) {}
})();
