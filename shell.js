/* ======================================================================
   השלד המשותף (נובמבר 2026)
   - סרגל עליון + סרגל תחתון בטלפון (משימות · רכש · + · רישוי · צוות)
   - כפתור + : פעולות של הטאב הנוכחי למעלה, פעולות כלליות מתחת
   - חיפוש אחד לכל המערכת (גם Ctrl+K במחשב)
   - מסך "כל הטאבים" עם מספרים
   - הודעה מעוצבת במקום חלון alert של הדפדפן
   שכבת תצוגה וניווט בלבד: לא קוראת ולא כותבת לענן, לא משנה שום רשומה.
   כל פעולה קוראת לפונקציה שכבר קיימת באפליקציה (כמו התפריט הצדדי).
   ====================================================================== */
(function(){
  "use strict";
  if (window.__shellLoaded) return;
  window.__shellLoaded = true;

  /* ---------- עזרים ---------- */
  var has = function(name){ try { return typeof eval(name) === "function"; } catch (e) { return false; } };
  var call = function(name){ var a = [].slice.call(arguments, 1); try { var f = eval(name); if (typeof f === "function") return f.apply(null, a); } catch (e) { console.warn("shell:", name, e); } };
  var D = function(){ try { return data; } catch (e) { return null; } };          // eslint-disable-line no-undef
  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var norm = function(s){ return String(s == null ? "" : s).toLowerCase().replace(/[֑-ׇ]/g, "").replace(/["'״׳`]/g, "").replace(/\s+/g, " ").trim(); };
  var role = function(){ try { return currentRole; } catch (e) { return "admin"; } };        // eslint-disable-line no-undef
  var isAdmin = function(){ return role() === "admin"; };
  var allowed = function(){ try { return allowedTabs(); } catch (e) { return []; } };      // eslint-disable-line no-undef
  var label = function(t){ try { return tabLabels[t] || t; } catch (e) { return t; } };      // eslint-disable-line no-undef
  var can = function(t){ return allowed().indexOf(t) !== -1; };
  var go = function(t){ if (can(t)) call("switchTab", t); };
  var cur = function(){ var s = document.querySelector("main section.tab.active"); return s ? s.id.replace(/^tab-/, "") : ""; };
  var col = function(t){ return "var(--m-" + t + ", #645c50)"; };
  var later = function(fn, ms){ setTimeout(function(){ try { fn(); } catch (e) { console.warn("shell:", e); } }, ms || 80); };

  var P = {
    home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    grid:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
    tasks:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cart:'<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L22 8H6"/>',
    shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    users:'<circle cx="9" cy="8" r="3.3"/><path d="M3.5 19c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3"/><circle cx="17" cy="8.5" r="2.6"/><path d="M16 13.8c2.7.1 4.6 2.2 4.6 5"/>',
    box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    wallet:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.2"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l2 2M15 8l2 2"/>',
    phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    file:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    wrench:'<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-5-5z"/>',
    receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'
  };
  var ic = function(n, s){ s = s || 20; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || P.file) + '</svg>'; };
  var TAB_IC = { dashboard:"home", tasks:"tasks", procurement:"cart", licensing:"shield", staff:"users", accountant:"receipt",
    finance:"wallet", keys:"key", equipment:"wrench", files:"file", projects:"folder", contacts:"phone" };
  var icoBox = function(name, t, size){ return '<span class="sh-ico" style="background:color-mix(in srgb,' + col(t) + ' 13%, transparent);color:' + col(t) + '">' + ic(name, size || 21) + '</span>'; };

  /* ---------- מספרים על טאבים (כמה דברים מחכים) ---------- */
  function counts(){
    var out = {}, d = D();
    if (!d) return out;
    try {
      if (Array.isArray(d.tasks)) {
        /* בדיוק כמו בלוח הבקרה: משימות השנה הנוכחית שלא בוצעו */
        var Y = null, st = function(t){ return t.status; };
        try { Y = currentSchoolYearStart(); } catch (e) {}                  // eslint-disable-line no-undef
        try { if (typeof tkStatus === "function") st = tkStatus; } catch (e) {} // eslint-disable-line no-undef
        var n = d.tasks.filter(function(t){ return t && (Y == null || Number(t.schoolYear || Y) === Y) && st(t) !== "בוצע"; }).length;
        if (n) out.tasks = { n: n, c: col("tasks") };
      }
      if (Array.isArray(d.licensing)) {
        var now = Date.now(), soon = now + 14 * 864e5;
        var m = d.licensing.filter(function(l){
          if (!l || l.renewedToId) return false;
          var x = Date.parse(l.expiry || ""); return !isNaN(x) && x < soon;
        }).length;
        if (m) out.licensing = { n: m, c: "var(--st-red)" };
      }
    } catch (e) {}
    return out;
  }

  /* ---------- חלונות ---------- */
  var openSheet = null;
  function sheet(html, opts){
    closeSheet(true);
    opts = opts || {};
    var scrim = document.createElement("div"); scrim.className = "sh-scrim";
    var sh = document.createElement("div"); sh.className = "sh-sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
    if (opts.z) { scrim.style.zIndex = opts.z; sh.style.zIndex = opts.z + 1; }
    sh.innerHTML = '<div class="sh-grab"></div>' + html;
    document.body.appendChild(scrim); document.body.appendChild(sh);
    scrim.addEventListener("click", function(){ closeSheet(); });
    sh.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest("[data-sh-close]"); if (b) closeSheet(); });
    requestAnimationFrame(function(){ scrim.classList.add("open"); sh.classList.add("open"); });
    openSheet = { scrim: scrim, sh: sh, onClose: opts.onClose };
    return sh;
  }
  function closeSheet(now){
    var o = openSheet; if (!o) return; openSheet = null;
    o.scrim.classList.remove("open"); o.sh.classList.remove("open");
    var rm = function(){ o.scrim.remove(); o.sh.remove(); };
    if (now) rm(); else setTimeout(rm, 230);
    if (o.onClose) try { o.onClose(); } catch (e) {}
  }
  var head = function(title, sub){ return '<div class="sh-head"><div><h3>' + esc(title) + '</h3>' + (sub ? '<div style="font-size:12.5px;color:var(--ink-soft,#645c50)">' + esc(sub) + '</div>' : '') + '</div><button class="sh-x" type="button" data-sh-close aria-label="סגירה">' + ic("x", 18) + '</button></div>'; };

  /* ---------- הודעה מעוצבת במקום alert ---------- */
  var noteQueue = [];
  function note(msg){
    noteQueue.push(String(msg == null ? "" : msg));
    if (noteQueue.length > 1) return;
    showNext();
  }
  function showNext(){
    if (!noteQueue.length) return;
    var prev = openSheet; if (prev) { prev.scrim.remove(); prev.sh.remove(); openSheet = null; }
    var sh = sheet('<div class="sh-note"><p></p><button class="sh-ok" type="button">הבנתי</button></div>', { z: 2000, onClose: function(){ noteQueue.shift(); setTimeout(showNext, 60); } });
    sh.querySelector("p").textContent = noteQueue[0];
    var ok = sh.querySelector(".sh-ok"); ok.addEventListener("click", function(){ closeSheet(); }); setTimeout(function(){ ok.focus(); }, 50);
  }
  window.shNote = note;
  try { window.alert = function(m){ note(m); }; } catch (e) {}

  /* ---------- פעולות (כפתור +) ---------- */
  var USAGE_KEY = "sh-usage";
  var usage = function(){ try { return JSON.parse(localStorage.getItem(USAGE_KEY) || "{}") || {}; } catch (e) { return {}; } };
  var bump = function(id){ try { var u = usage(); u[id] = (u[id] || 0) + 1; localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch (e) {} };

  var ACTIONS = [
    { id:"task", t:"tasks", ico:"tasks", l:"משימה חדשה", ok:function(){ return has("addTask"); }, run:function(){ go("tasks"); later(function(){ call("addTask"); }); } },
    { id:"mytask", t:"tasks", ico:"check", l:"משימה שלי", ok:function(){ return isAdmin() && has("mtSetMode"); },
      run:function(){ go("tasks"); later(function(){ call("mtSetMode", "mine"); later(function(){ var i = document.getElementById("mtQaInput"); if (i) { i.scrollIntoView({ block:"center" }); i.focus(); } }, 120); }); } },
    { id:"count", t:"procurement", ico:"box", l:"ספירת מלאי", ok:function(){ return !!(window.SP && SP.openCount); }, run:function(){ go("procurement"); later(function(){ SP.go("stock"); later(function(){ SP.openCount(); }, 120); }); } },
    { id:"order", t:"procurement", ico:"cart", l:"הזמנה לספק", ok:function(){ return !!(window.SP && SP.go) && isAdmin(); }, run:function(){ go("procurement"); later(function(){ SP.go("basket"); }); } },
    { id:"plist", t:"procurement", ico:"tag", l:"מחירון חדש", ok:function(){ return !!(window.SP && SP.openImport) && isAdmin(); }, run:function(){ go("procurement"); later(function(){ SP.go("lists"); later(function(){ SP.openImport(); }, 120); }); } },
    { id:"lic", t:"licensing", ico:"shield", l:"אישור חדש", ok:function(){ return has("addLic"); }, run:function(){ go("licensing"); later(function(){ call("addLic"); }); } },
    { id:"pay", t:"accountant", ico:"wallet", l:"תשלום חדש", ok:function(){ return has("acxOpenEdit") && isAdmin(); }, run:function(){ go("accountant"); later(function(){ call("acxOpenEdit", ""); }); } },
    { id:"loan", t:"keys", ico:"key", l:"מסירת מפתח", ok:function(){ return has("openLoanModal"); }, run:function(){ go("keys"); later(function(){ call("openLoanModal"); }); } },
    { id:"file", t:"files", ico:"file", l:"העלאת חשבונית", ok:function(){ try { return !!tabQuickLinks.files[0]; } catch (e) { return false; } }, run:function(){ go("files"); later(function(){ tabQuickLinks.files[0].action(); }); } },  // eslint-disable-line no-undef
    { id:"contact", t:"contacts", ico:"phone", l:"איש קשר חדש", ok:function(){ return has("addContact"); }, run:function(){ go("contacts"); later(function(){ call("addContact"); }); } },
    { id:"equip", t:"equipment", ico:"wrench", l:"פריט ציוד", ok:function(){ return has("eqNewEquip"); }, run:function(){ go("equipment"); later(function(){ call("eqNewEquip"); }); } }
  ];
  function availableActions(){
    var u = usage();
    return ACTIONS.filter(function(a){ return can(a.t) && a.ok(); })
      .map(function(a, i){ return { a:a, i:i, u:u[a.id] || 0 }; })
      .sort(function(x, y){ return (y.u - x.u) || (x.i - y.i); })
      .map(function(x){ return x.a; });
  }
  function contextLinks(t){
    var list = [];
    try { list = (tabQuickLinks[t] || []).slice(); } catch (e) {}                         // eslint-disable-line no-undef
    return list.filter(function(x){ return x && x.label && typeof x.action === "function"; })
      .map(function(x){ return { l: String(x.label).replace(/^[^\p{L}\p{N}]+/u, "").trim() || x.label, run: x.action }; });
  }
  function openPlus(){
    var t = cur(), html = head("מה עושים?");
    if (typeof window.shAI === "function" && isAdmin()) {
      html += '<button class="sh-ai" type="button" data-sh-ai><span class="sh-ico" style="background:#c67139;color:#fff;width:46px;height:46px">' + ic("spark", 23) + '</span><span style="flex:1"><b style="font-size:15px">צלם או העלה מסמך – הסוכן</b><small>חשבונית, אישור בודק, מחירון, הצעת מחיר – הוא יזהה ויציע, ואתה מאשר</small></span><span class="sh-ico" style="background:#ffffff1f;width:36px;height:36px">' + ic("camera", 18) + '</span></button>';
    }
    var ctx = t && t !== "dashboard" ? contextLinks(t) : [];
    if (ctx.length) {
      html += '<div class="sh-gt" style="color:' + col(t) + '">ב' + esc(label(t)) + '</div><div class="sh-grid">' +
        ctx.map(function(x, i){ return '<button class="sh-act" type="button" data-sh-ctx="' + i + '">' + icoBox(TAB_IC[t] || "file", t) + esc(x.l) + '</button>'; }).join("") + '</div>';
    }
    var acts = availableActions();
    if (acts.length) {
      html += '<div class="sh-gt">' + (ctx.length ? "בכל האפליקציה" : "פעולות") + '</div><div class="sh-grid">' +
        acts.map(function(a){ return '<button class="sh-act" type="button" data-sh-act="' + a.id + '">' + icoBox(a.ico, a.t) + esc(a.l) + '</button>'; }).join("") + '</div>' +
        '<div class="sh-hint">הפעולות שאתה משתמש בהן הכי הרבה עולות לראש</div>';
    }
    var sh = sheet(html);
    sh.addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-sh-ai")) { closeSheet(); later(function(){ window.shAI(t); }, 240); return; }
      if (b.hasAttribute("data-sh-ctx")) { var x = ctx[Number(b.getAttribute("data-sh-ctx"))]; closeSheet(); if (x) later(function(){ go(t); x.run(); }, 200); return; }
      if (b.hasAttribute("data-sh-act")) {
        var id = b.getAttribute("data-sh-act"), a = ACTIONS.filter(function(z){ return z.id === id; })[0];
        closeSheet(); if (a) { bump(id); later(a.run, 200); }
      }
    });
  }

  /* ---------- כל הטאבים ---------- */
  var GROUPS = [["שוטף", ["dashboard", "tasks", "equipment"]], ["רכש וספקים", ["procurement", "contacts", "files"]],
    ["כספים", ["accountant", "finance", "projects"]], ["תפעול", ["staff", "licensing", "keys"]]];
  function openAll(){
    var c = counts(), html = head("כל הטאבים", "המספר = כמה דברים מחכים בטאב");
    GROUPS.forEach(function(g){
      var ts = g[1].filter(can); if (!ts.length) return;
      html += '<div class="sh-gt">' + g[0] + '</div><div class="sh-tabs">' + ts.map(function(t){
        var n = c[t];
        return '<button class="sh-tab" type="button" data-sh-tab="' + t + '">' + icoBox(TAB_IC[t], t, 18) + '<span>' + esc(label(t)) + '</span>' +
          (n ? '<span class="sh-c" style="background:' + n.c + '">' + n.n + '</span>' : '') + '</button>';
      }).join("") + '</div>';
    });
    var links = [];
    [["backupLink", "openBackupModal"], ["importLink", "openImportModal"], ["downloadBackupLink", "downloadBackupFile"]].forEach(function(p){
      var el = document.getElementById(p[0]);
      if (el && el.style.display !== "none" && has(p[1])) links.push({ l: el.textContent.trim(), f: p[1] });
    });
    var ri = document.getElementById("roleIndicator");
    if (ri && has("switchUser")) links.push({ l: (ri.textContent.trim() || "החלפת משתמש"), f: "switchUser" });
    if (links.length) html += '<div class="sh-links">' + links.map(function(x, i){ return '<button class="sh-link" type="button" data-sh-link="' + i + '">' + esc(x.l) + '</button>'; }).join("") + '</div>';
    var sh = sheet(html);
    sh.addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-sh-tab")) { var t = b.getAttribute("data-sh-tab"); closeSheet(); go(t); return; }
      if (b.hasAttribute("data-sh-link")) { var x = links[Number(b.getAttribute("data-sh-link"))]; closeSheet(); if (x) later(function(){ call(x.f); }, 200); }
    });
  }

  /* ---------- חיפוש אחד לכל המערכת ---------- */
  function sources(){
    var d = D() || {}, out = [];
    var add = function(t, title, rows){ if (can(t) && rows && rows.length) out.push({ t: t, title: title, rows: rows }); };
    try { add("tasks", "משימות", (d.tasks || []).filter(Boolean).map(function(x){
      return { k: [x.taskNumber, x.desc, x.assignee, x.place, x.category, x.notes].join(" "), ico: "tasks",
        a: (x.taskNumber ? "#" + x.taskNumber + " " : "") + (x.desc || "משימה"), b: [x.assignee, x.place, x.status].filter(Boolean).join(" · "),
        go: function(){ go("tasks"); later(function(){ call("tkOpen", x.id); }); } }; })); } catch (e) {}
    try { if (isAdmin()) add("tasks", "המשימות שלי", (d.myTasks || []).filter(function(x){ return x && !x.done; }).map(function(x){
      return { k: x.title + " " + (x.notes || ""), ico: "check", a: x.title, b: x.due ? "עד " + x.due : "",
        go: function(){ go("tasks"); later(function(){ call("mtSetMode", "mine"); later(function(){ call("mtOpenEdit", x.id); }, 150); }); } }; })); } catch (e) {}
    try { add("contacts", "אנשי קשר וספקים", (d.contacts || []).filter(function(x){ return x && !x.archived; }).map(function(x){
      return { k: [x.name, x.specialty, x.phone, x.email, x.notes, x.contactType, x.vatId, x.companyId].join(" "), ico: "phone", a: x.name || "איש קשר",
        b: [x.specialty, x.phone].filter(Boolean).join(" · "), go: function(){ go("contacts"); later(function(){ call("ctOpen", x.id); }); } }; })); } catch (e) {}
    try { add("licensing", "רישוי ובטיחות", (d.licensing || []).filter(Boolean).map(function(x){
      return { k: [x.name, x.type, x.inspector, x.doc, x.item].join(" "), ico: "shield", a: x.name || x.type || "אישור",
        b: [x.inspector, x.expiry ? "תוקף " + x.expiry : ""].filter(Boolean).join(" · "),
        go: function(){ go("licensing"); later(function(){ call("lcOpenEdit", x); }); } }; })); } catch (e) {}
    try { if (window.SP && SP.S && Array.isArray(SP.S.lists)) {
      var rows = [];
      SP.S.lists.forEach(function(l){ (l.items || []).forEach(function(it){
        if (!it || !it.name) return;
        rows.push({ k: [it.name, it.sku, l.supplier].join(" "), ico: "tag", a: it.name, b: l.supplier || "",
          side: it.price > 0 ? "₪" + (Math.round(it.price * 100) / 100) : "", go: function(){ go("procurement"); later(function(){ SP.go("analyze"); }); } });
      }); });
      add("procurement", "מוצרים במחירונים", rows);
    } } catch (e) {}
    try { add("keys", "מפתחות", (d.keysInventory || []).filter(Boolean).map(function(x){
      return { k: [x.code, x.keyNum, x.location, x.type, x.floor].join(" "), ico: "key", a: (x.code || "") + (x.location ? " · " + x.location : ""),
        b: x.type || "", go: function(){ go("keys"); later(function(){ call("openKeyDetailModal", x.id); }); } }; })); } catch (e) {}
    try { add("keys", "מחזיקי מפתחות", (d.keysHolders || []).filter(Boolean).map(function(x){
      return { k: [x.name, x.phone].join(" "), ico: "user", a: x.name, b: x.phone || "",
        go: function(){ go("keys"); later(function(){ call("setKeysSubTab", "holders"); later(function(){ var i = document.getElementById("holderSearch"); if (i) { i.value = x.name; i.dispatchEvent(new Event("input", { bubbles: true })); } }); }); } }; })); } catch (e) {}
    try { add("equipment", "ציוד ותחזוקה", (d.equipment || []).filter(Boolean).map(function(x){
      return { k: [x.name, x.place, x.maker, x.model, x.serial].join(" "), ico: "wrench", a: x.name || "ציוד", b: x.place || "",
        go: function(){ go("equipment"); later(function(){ try { eqUi.view = "equip"; } catch (e) {} call("renderEquipment"); call("eqOpen", "equip", x.id); }); } }; })); } catch (e) {}  // eslint-disable-line no-undef
    try { add("files", "חשבוניות וקבלות", (d.files || []).filter(Boolean).map(function(x){
      return { k: [x.name, x.topic, x.desc, x.supplier, x.vendor].join(" "), ico: "file", a: x.name || "מסמך", b: [x.topic, x.supplier || x.vendor].filter(Boolean).join(" · "),
        go: function(){ go("files"); } }; })); } catch (e) {}
    try { add("projects", "פרויקטים", (d.projects || []).filter(Boolean).map(function(x){
      return { k: [x.name, x.category, x.desc].join(" "), ico: "folder", a: x.name || "פרויקט", b: x.status || "", go: function(){ go("projects"); } }; })); } catch (e) {}
    try { var staffRows = [], seen = {};
      (d.installments || []).forEach(function(arr){ (arr || []).forEach(function(r){ if (r && r.name && !seen[r.name]) { seen[r.name] = 1; staffRows.push({ k: [r.name, r.role, r.duty].join(" "), ico: "users", a: r.name, b: r.role || r.duty || "",
        go: function(){ go("staff"); later(function(){ var i = document.getElementById("staffSearchInput"); if (i) { i.value = r.name; i.dispatchEvent(new Event("input", { bubbles: true })); } }); } }); } }); });
      add("staff", "צוות ותורנים", staffRows); } catch (e) {}
    return out;
  }
  function mark(text, q){
    var s = String(text || ""), i = norm(s).indexOf(q);
    if (!q || i < 0 || norm(s).length !== s.toLowerCase().length) return esc(s);
    return esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + q.length)) + "</mark>" + esc(s.slice(i + q.length));
  }
  function openSearch(prefill){
    var html = head("חיפוש בכל המערכת") +
      '<label class="sh-sbox">' + ic("search", 20) + '<input type="search" id="shQ" autocomplete="off" enterkeyhint="search" placeholder="ספק, משימה, מוצר, מפתח, אישור…" aria-label="חיפוש בכל המערכת"></label>' +
      '<div id="shRes"></div>';
    var sh = sheet(html), inp = sh.querySelector("#shQ"), box = sh.querySelector("#shRes");
    var src = sources(), acts = availableActions(), flat = [], kb = -1;
    function render(){
      var q = norm(inp.value); flat = []; kb = -1;
      if (q.length < 2) {
        box.innerHTML = '<div class="sh-empty">כתוב לפחות שתי אותיות. אפשר לחפש שם של ספק, מספר משימה, מוצר, קוד מפתח או אישור.</div>';
        return;
      }
      var h = "";
      var am = acts.filter(function(a){ return norm(a.l).indexOf(q) !== -1; });
      if (am.length) {
        h += '<div class="sh-sgrp"><div class="sh-sgh"><i style="background:var(--sh-dark)"></i>פעולות</div>' + am.map(function(a){
          flat.push({ go: function(){ bump(a.id); a.run(); } });
          return '<button class="sh-res" type="button" data-i="' + (flat.length - 1) + '">' + icoBox(a.ico, a.t, 17) + '<span><b>' + mark(a.l, q) + '</b></span></button>';
        }).join("") + '</div>';
      }
      var total = 0;
      src.forEach(function(g){
        var hits = g.rows.filter(function(r){ return norm(r.k).indexOf(q) !== -1; });
        if (!hits.length) return;
        total += hits.length;
        h += '<div class="sh-sgrp"><div class="sh-sgh" style="color:' + col(g.t) + '"><i style="background:' + col(g.t) + '"></i>' + esc(g.title) + ' · ' + hits.length + '</div>' +
          hits.slice(0, 6).map(function(r){
            flat.push(r);
            return '<button class="sh-res" type="button" data-i="' + (flat.length - 1) + '">' + icoBox(r.ico, g.t, 17) + '<span style="min-width:0;flex:1"><b>' + mark(r.a, q) + '</b>' + (r.b ? '<small>' + esc(r.b) + '</small>' : '') + '</span>' + (r.side ? '<span class="sh-side">' + esc(r.side) + '</span>' : '') + '</button>';
          }).join("") + (hits.length > 6 ? '<div class="sh-hint" style="margin:6px 0 10px">ועוד ' + (hits.length - 6) + ' – כדאי לדייק את החיפוש</div>' : '') + '</div>';
      });
      box.innerHTML = h || '<div class="sh-empty">לא נמצא כלום עבור "' + esc(inp.value.trim()) + '"</div>';
    }
    function pick(i){ var r = flat[i]; if (!r) return; closeSheet(); later(r.go, 200); }
    inp.addEventListener("input", render);
    inp.addEventListener("keydown", function(e){
      var btns = box.querySelectorAll(".sh-res");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!btns.length) return;
        kb = e.key === "ArrowDown" ? Math.min(btns.length - 1, kb + 1) : Math.max(0, kb - 1);
        btns.forEach(function(b, i){ b.classList.toggle("kb", i === kb); }); btns[kb].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") { e.preventDefault(); pick(kb >= 0 ? Number(btns[kb].getAttribute("data-i")) : 0); }
    });
    box.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest(".sh-res"); if (b) pick(Number(b.getAttribute("data-i"))); });
    if (prefill) inp.value = prefill;
    render();
    setTimeout(function(){ inp.focus(); }, 60);
  }
  window.shOpenSearch = openSearch;
  window.shSheet = function(html){ return sheet(html); };
  window.shClose = function(){ closeSheet(); };

  /* ---------- "מה מחכה לך כאן" בראש כל טאב + כפתור ⋯ ---------- */
  /* מבוסס על אותן התראות של לוח הבקרה (dbAlerts) – קריאה בלבד */
  var alertsCache = { t: 0, list: [] };
  function alertsFor(t){
    var now = Date.now();
    if (now - alertsCache.t > 4000) {
      alertsCache.t = now;
      try { alertsCache.list = dbAlerts(dbCollect()) || []; } catch (e) { alertsCache.list = []; }   // eslint-disable-line no-undef
    }
    return alertsCache.list.filter(function(a){ return a && a.tab === t; });
  }
  var LVL = { 1: "#ff8a80", 2: "#ffd166", 3: "rgba(255,255,255,.75)" };
  function strip(t){
    var sec = document.getElementById("tab-" + t);
    if (!sec) return;
    if (t === "dashboard" || !isAdmin()) { var old0 = sec.querySelector(":scope > .sh-wait"); if (old0) old0.remove(); return; }
    var el = sec.querySelector(":scope > .sh-wait");
    if (!el) { el = document.createElement("div"); el.className = "sh-wait"; sec.insertBefore(el, sec.firstChild); }
    var list = alertsFor(t), shown = list.slice(0, 3);
    el.style.setProperty("--mc", col(t));
    var sig = t + "|" + list.map(function(a){ return a.title + a.n; }).join("|");
    if (el.getAttribute("data-sig") === sig) return;
    el.setAttribute("data-sig", sig);
    el.innerHTML = '<div class="sh-wh"><span class="sh-wi">' + ic(TAB_IC[t] || "file", 18) + '</span><b>' + (list.length ? "מה מחכה לך כאן · " + list.length : "הכל מסודר כאן") + '</b>' +
      '<button type="button" class="sh-more" data-sh-more="' + t + '" aria-label="כל הפעולות ב' + esc(label(t)) + '">⋯</button></div>' +
      shown.map(function(a, i){
        return '<div class="sh-wr"><i style="background:' + (LVL[a.lvl] || LVL[3]) + '"></i><span><b>' + esc(a.title) + '</b>' + (a.sub ? '<small>' + esc(a.sub) + '</small>' : '') + '</span>' +
          (typeof a.act === "function" ? '<button type="button" data-sh-wa="' + i + '">פתח</button>' : '') + '</div>';
      }).join("") +
      (list.length > 3 ? '<button type="button" class="sh-wall" data-sh-wall="' + t + '">ועוד ' + (list.length - 3) + '</button>' : '');
    el._list = list;
  }
  function openWaitAll(t){
    var list = alertsFor(t);
    var sh = sheet(head("מה מחכה לך ב" + label(t), list.length + " פריטים") + '<div class="sh-sgrp">' + list.map(function(a, i){
      return '<button class="sh-res" type="button" data-i="' + i + '"><span style="width:10px;height:10px;border-radius:50%;flex:0 0 auto;background:' + (a.lvl === 1 ? "var(--st-red)" : a.lvl === 2 ? "#e8a317" : "#c9bfb1") + '"></span><span style="flex:1;min-width:0"><b>' + esc(a.title) + '</b>' + (a.sub ? '<small>' + esc(a.sub) + '</small>' : '') + '</span></button>';
    }).join("") + '</div>');
    sh.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest(".sh-res"); if (!b) return; var a = list[Number(b.getAttribute("data-i"))]; closeSheet(); if (a && typeof a.act === "function") later(a.act, 200); });
  }
  function openMore(t){
    var ctx = contextLinks(t), acts = availableActions().filter(function(a){ return a.t === t; });
    var html = head("כל הפעולות ב" + label(t), "שום פונקציה לא הוסרה – הכל כאן ובכפתור +");
    if (ctx.length) html += '<div class="sh-sgrp">' + ctx.map(function(x, i){ return '<button class="sh-res" type="button" data-c="' + i + '">' + icoBox(TAB_IC[t] || "file", t, 17) + '<span><b>' + esc(x.l) + '</b></span></button>'; }).join("") + '</div>';
    if (acts.length) html += '<div class="sh-gt">פעולות מהירות</div><div class="sh-grid">' + acts.map(function(a){ return '<button class="sh-act" type="button" data-a="' + a.id + '">' + icoBox(a.ico, a.t) + esc(a.l) + '</button>'; }).join("") + '</div>';
    if (!ctx.length && !acts.length) html += '<div class="sh-empty">אין פעולות נוספות לטאב הזה</div>';
    var sh = sheet(html);
    sh.addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-c")) { var x = ctx[Number(b.getAttribute("data-c"))]; closeSheet(); if (x) later(function(){ go(t); x.run(); }, 200); }
      else if (b.hasAttribute("data-a")) { var a = ACTIONS.filter(function(z){ return z.id === b.getAttribute("data-a"); })[0]; closeSheet(); if (a) { bump(a.id); later(a.run, 200); } }
    });
  }
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-sh-more],[data-sh-wa],[data-sh-wall]"); if (!b) return;
    if (b.hasAttribute("data-sh-more")) { openMore(b.getAttribute("data-sh-more")); return; }
    if (b.hasAttribute("data-sh-wall")) { openWaitAll(b.getAttribute("data-sh-wall")); return; }
    var w = b.closest(".sh-wait"), a = w && w._list && w._list[Number(b.getAttribute("data-sh-wa"))];
    if (a && typeof a.act === "function") { try { a.act(); } catch (er) { console.warn("shell:", er); } }
  });

  /* ---------- בניית הסרגלים ---------- */
  var BAR = ["tasks", "procurement", "licensing", "staff"];
  var top, bar, lastSig = "";
  function build(){
    var nav = document.getElementById("navBar");
    var ready = nav && nav.querySelector("button[data-tab]");
    var al = allowed(), sig = role() + "|" + al.join(",");
    if (!ready) { document.body.classList.remove("sh-on", "sh-has-bar"); return; }
    document.body.classList.add("sh-on");
    if (sig === lastSig && top && bar) { refresh(); return; }
    lastSig = sig;

    if (!top) top = document.getElementById("shTop");
    if (!bar) bar = document.getElementById("shBar");
    if (!top) { top = document.createElement("div"); top.id = "shTop"; var shell = document.querySelector(".app-shell"); (shell || document.body).insertBefore(top, shell ? shell.firstChild : null); }
    if (!bar) { bar = document.createElement("nav"); bar.id = "shBar"; bar.setAttribute("aria-label", "ניווט ראשי"); document.body.appendChild(bar); }

    var tabsOnBar = isAdmin() ? BAR.filter(can) : al.slice(0, 4);
    var items = tabsOnBar.map(function(t){ return { t: t }; });
    if (isAdmin()) items.splice(Math.ceil(items.length / 2), 0, { fab: true });
    var showBar = items.length >= 2;
    document.body.classList.toggle("sh-has-bar", showBar);
    bar.innerHTML = items.map(function(x){
      if (x.fab) return '<div><button class="sh-fab" type="button" data-sh="plus" aria-label="פעולה חדשה">' + ic("plus", 28) + '</button></div>';
      return '<button class="sh-bi" type="button" data-sh-go="' + x.t + '" style="color:' + col(x.t) + '"><span class="sh-bic">' + ic(TAB_IC[x.t], 22) + '</span><span style="color:#5a524a">' + esc(label(x.t).split(" ")[0]) + '</span></button>';
    }).join("");

    var canHome = can("dashboard");
    top.innerHTML =
      (canHome ? '<button class="sh-ib" type="button" data-sh-go="dashboard" aria-label="בית – לוח בקרה">' + ic("home", 21) + '</button>' : '') +
      '<div class="sh-ttl"><b id="shTtl"></b><small id="shSub"></small></div>' +
      '<button class="sh-ib" type="button" data-sh="search" aria-label="חיפוש בכל המערכת">' + ic("search", 20) + '</button>' +
      '<button class="sh-ib" type="button" data-sh="all" aria-label="כל הטאבים">' + ic("grid", 20) + '<span class="sh-dot" id="shAllDot" style="display:none"></span></button>';

    var sb = document.getElementById("sidebar");
    if (sb && !sb.querySelector(".sh-side-tools")) {
      var tools = document.createElement("div"); tools.className = "sh-side-tools";
      tools.innerHTML = '<button class="sh-side-btn" type="button" data-sh="search">' + ic("search", 18) + '<span>חיפוש</span><kbd>Ctrl K</kbd></button>' +
        '<button class="sh-side-btn sh-new" type="button" data-sh="plus">' + ic("plus", 18) + '<span>חדש</span></button>';
      sb.insertBefore(tools, nav);
    }
    var nb = sb && sb.querySelector(".sh-new"); if (nb) nb.style.display = isAdmin() ? "" : "none";
    refresh();
  }
  function refresh(){
    if (!top || !bar) return;
    var t = cur() || "dashboard";
    var ttl = document.getElementById("shTtl"), sub = document.getElementById("shSub");
    if (ttl) ttl.textContent = t === "dashboard" ? "ניהול הבניין" : label(t);
    if (sub) { var dt = ""; try { dt = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }); } catch (e) {} sub.textContent = dt; }
    top.querySelectorAll("[data-sh-go='dashboard']").forEach(function(b){ b.classList.toggle("on", t === "dashboard"); });
    var c = counts();
    bar.querySelectorAll("[data-sh-go]").forEach(function(b){
      var bt = b.getAttribute("data-sh-go"); b.classList.toggle("on", bt === t);
      var old = b.querySelector(".sh-n"), n = c[bt];
      if (n && n.n) { if (!old) { old = document.createElement("span"); old.className = "sh-n"; b.appendChild(old); } old.textContent = n.n > 99 ? "99+" : n.n; }
      else if (old) old.remove();
    });
    try { strip(t); } catch (e) { console.warn("shell:", e); }
    var dot = document.getElementById("shAllDot");
    if (dot) { var other = Object.keys(c).filter(function(k){ return BAR.indexOf(k) === -1 && can(k); }); dot.style.display = other.length ? "" : "none"; if (other.length) dot.textContent = other.length; }
  }

  /* ---------- אירועים ---------- */
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-sh],[data-sh-go]");
    if (!b || (openSheet && openSheet.sh.contains(b))) return;
    if (b.hasAttribute("data-sh-go")) { go(b.getAttribute("data-sh-go")); return; }
    var k = b.getAttribute("data-sh");
    if (k === "plus") openPlus(); else if (k === "search") openSearch(); else if (k === "all") openAll();
  });
  document.addEventListener("keydown", function(e){
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K" || e.key === "ל")) {
      if (!document.body.classList.contains("sh-on")) return;
      e.preventDefault(); if (openSheet) closeSheet(true); openSearch();
    } else if (e.key === "Escape" && openSheet) { e.preventDefault(); e.stopPropagation(); closeSheet(); }
  }, true);

  var pend = null;
  /* setTimeout ולא requestAnimationFrame: גם כשהלשונית ברקע (rAF לא רץ ברקע) */
  function schedule(){ if (pend) return; pend = setTimeout(function(){ pend = null; try { build(); } catch (err) { console.warn("shell:", err); } }, 40); }
  function start(){
    build();
    var nav = document.getElementById("navBar");
    if (nav) new MutationObserver(schedule).observe(nav, { childList: true });
    var main = document.querySelector("main");
    if (main) new MutationObserver(function(ms){ for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t && t.classList && t.classList.contains("tab")) { schedule(); return; } } }).observe(main, { attributes: true, subtree: true, attributeFilter: ["class"] });
    setInterval(schedule, 3000);   /* גיבוי: אם משהו פספס את הבנייה (כניסה, החלפת משתמש) – נבנה שוב */
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
