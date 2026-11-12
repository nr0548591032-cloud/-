/* ======================================================================
   משתמשים והרשאות (נובמבר 2026) – למנהל בלבד
   - רשימת משתמשים: המובנים (משה, מנהל החשבונות) ומי שהמנהל הוסיף.
   - הוספת משתמש: נוצר חשבון כניסה, נשלח לו מייל לבחירת סיסמה, והודעת ווטסאפ.
   - לכל טאב: צפייה או עריכה. צוות ותורנים ודוח למנהל חשבונות לא ניתנים כאן.
   - אין מחיקה: רק "השבתה" (והחזרה). שום נתון של האפליקציה לא משתנה כאן.
   ====================================================================== */
(function(){
  "use strict";
  if (window.openUsersAdmin) return;

  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var isAdmin = function(){ try { return currentRole === "admin"; } catch (e) { return false; } };   // eslint-disable-line no-undef
  var label = function(t){ try { return tabLabels[t] || t; } catch (e) { return t; } };               // eslint-disable-line no-undef
  var TABS = ["tasks", "procurement", "licensing", "equipment", "keys", "contacts", "files", "projects", "finance"];
  var COL = function(t){ return "var(--m-" + t + ", #645c50)"; };
  var TEMPLATES = [
    { l: "איש תחזוקה", tabs: { tasks: "edit", equipment: "edit", licensing: "view" } },
    { l: "טבח", tabs: { procurement: "edit" } },
    { l: "בודק בטיחות", tabs: { licensing: "edit" } },
    { l: "צופה במשימות", tabs: { tasks: "view" } }
  ];
  var APP_URL = location.origin + "/";
  var col = function(){ return db.collection("appUsers"); };                                       // eslint-disable-line no-undef
  var sheet = function(h){ return window.shSheet ? window.shSheet(h) : null; };
  var close = function(){ if (window.shClose) window.shClose(); };
  var note = function(m){ if (window.shNote) window.shNote(m); };
  var X = '<button class="sh-x" type="button" data-sh-close aria-label="סגירה"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  var head = function(t, s){ return '<div class="sh-head"><div><h3>' + esc(t) + '</h3>' + (s ? '<div style="font-size:12.5px;color:#645c50">' + esc(s) + '</div>' : '') + '</div>' + X + '</div>'; };
  var chip = function(t, lv){ return '<span style="display:inline-flex;gap:4px;align-items:center;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:color-mix(in srgb,' + COL(t) + ' 13%, transparent);color:' + COL(t) + '">' + esc(label(t)) + (lv ? ' · ' + (lv === "edit" ? "עריכה" : "צפייה") : '') + '</span>'; };
  var btn = function(attr, txt, dark, extra){ return '<button type="button" ' + attr + ' style="' + (extra || "") + 'min-height:42px;border:none;border-radius:12px;padding:0 14px;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;' + (dark ? "background:#2b2723;color:#fff" : "background:#eee7db;color:#201e1d") + '">' + txt + '</button>'; };

  async function list(){
    var snap = await col().get();
    var out = []; snap.forEach(function(d){ var v = d.data() || {}; v.uid = d.id; out.push(v); });
    out.sort(function(a, b){ return (b.active === true) - (a.active === true) || String(a.name || "").localeCompare(String(b.name || ""), "he"); });
    return out;
  }

  window.openUsersAdmin = async function(){
    if (!isAdmin()) return;
    var sh = sheet(head("משתמשים והרשאות", "רק אתה רואה את המסך הזה") + '<div class="sh-empty">טוען…</div>');
    var users = [];
    try { users = await list(); } catch (e) { if (sh) sh.innerHTML = '<div class="sh-grab"></div>' + head("משתמשים והרשאות") + '<div class="sh-note"><p>לא הצלחתי לטעון את רשימת המשתמשים: ' + esc(e && e.message || e) + '</p></div>'; return; }
    if (!sh || !document.body.contains(sh)) return;
    var h = head("משתמשים והרשאות", "רק אתה רואה את המסך הזה") +
      '<div style="background:#e1ecfb;color:#1d4f9e;border-radius:14px;padding:10px 12px;font-size:12.5px;font-weight:600;margin-bottom:10px">כל משתמש רואה רק את הטאבים שסימנת. הנתונים של שאר הטאבים לא נטענים אליו בכלל, וגם חוקי האבטחה בענן חוסמים אותם.</div>';
    /* משתמשים מובנים */
    try {
      Object.keys(UID_TO_ROLE).forEach(function(uid){                                             // eslint-disable-line no-undef
        var r = UID_TO_ROLE[uid]; if (r === "admin") return;                                       // eslint-disable-line no-undef
        var R = ROLES[r] || {};                                                                    // eslint-disable-line no-undef
        h += '<div class="sh-sgrp" style="padding:10px 12px"><div style="display:flex;align-items:center;gap:10px"><span class="sh-ico" style="background:#2b2723;color:#fff;border-radius:50%;width:40px;height:40px;font-weight:700">' + esc(String(R.label || r).charAt(0)) + '</span><div style="flex:1"><b>' + esc(R.label || r) + '</b><div style="font-size:12px;color:#645c50">משתמש מובנה · ההרשאות שלו קבועות</div></div></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + (R.tabs || []).map(function(t){ return chip(t); }).join("") + '</div></div>';
      });
    } catch (e) {}
    users.forEach(function(u, i){
      var on = u.active === true, tabs = u.tabs || {};
      h += '<div class="sh-sgrp" style="padding:10px 12px;' + (on ? "" : "opacity:.6") + '"><div style="display:flex;align-items:center;gap:10px"><span class="sh-ico" style="background:#6c4fd8;color:#fff;border-radius:50%;width:40px;height:40px;font-weight:700">' + esc(String(u.name || "?").charAt(0)) + '</span>' +
        '<div style="flex:1;min-width:0"><b>' + esc(u.name || "משתמש") + '</b><div style="font-size:12px;color:#645c50">' + esc(u.email || "") + (on ? "" : " · מושבת") + '</div></div>' +
        btn('data-u-edit="' + i + '"', "עריכה") + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + TABS.filter(function(t){ return tabs[t]; }).map(function(t){ return chip(t, tabs[t]); }).join("") + '</div></div>';
    });
    if (!users.length) h += '<div class="sh-empty">עדיין לא הוספת משתמשים</div>';
    h += '<div style="margin-top:12px">' + btn("data-u-new", "+ הוספת משתמש", true, "width:100%;") + '</div>';
    sh.innerHTML = '<div class="sh-grab"></div>' + h;
    sh.onclick = function(e){
      var b = e.target.closest && e.target.closest("[data-u-edit],[data-u-new]"); if (!b) return;
      if (b.hasAttribute("data-u-new")) form(null); else form(users[Number(b.getAttribute("data-u-edit"))]);
    };
  };

  function form(u){
    var isNew = !u; u = u || { name: "", email: "", phone: "", tabs: {}, active: true };
    var lv = Object.assign({}, u.tabs || {});
    var inp = function(id, lab, val, type, dis){ return '<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#645c50">' + lab + '<input id="' + id + '" type="' + (type || "text") + '" value="' + esc(val) + '"' + (dis ? " disabled" : "") + ' dir="auto" style="height:44px;border-radius:12px;border:1.5px solid rgba(32,30,29,.16);padding:0 12px;font-family:inherit;font-size:15px;background:' + (dis ? "#eee7db" : "#fff") + '"></label>'; };
    function rows(){
      return TABS.map(function(t){
        var v = lv[t] || "";
        var seg = function(val, txt){ return '<button type="button" data-lv="' + t + '|' + val + '" style="border:none;border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;' + (v === val ? "background:#fff;color:#201e1d;box-shadow:0 1px 3px rgba(0,0,0,.12)" : "background:none;color:#645c50") + '">' + txt + '</button>'; };
        return '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid rgba(32,30,29,.08)"><span style="width:10px;height:10px;border-radius:50%;background:' + COL(t) + '"></span><b style="flex:1;font-size:13.5px">' + esc(label(t)) + '</b>' +
          '<span style="display:inline-flex;background:#eee7db;border-radius:10px;padding:3px">' + seg("", "אין") + seg("view", "צפייה") + seg("edit", "עריכה") + '</span></div>';
      }).join("");
    }
    var h = head(isNew ? "משתמש חדש" : "עריכת משתמש", "בלי לגעת בקוד – הכל מכאן") +
      (isNew ? '<div style="font-size:12px;font-weight:700;color:#645c50;margin-bottom:6px">התחל מתבנית</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + TEMPLATES.map(function(x, i){ return '<button type="button" data-tpl="' + i + '" style="border:1.5px solid rgba(32,30,29,.14);background:#fff;border-radius:999px;padding:6px 12px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">' + esc(x.l) + '</button>'; }).join("") + '</div>' : '') +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' + inp("uName", "שם", u.name) + inp("uPhone", "טלפון (לווטסאפ)", u.phone, "tel") + '</div>' +
      '<div style="margin-top:8px">' + inp("uEmail", "אימייל (לכניסה)", u.email, "email", !isNew) + '</div>' +
      '<div class="sh-gt">מה הוא יראה</div><div id="uRows" style="background:#fff;border-radius:14px;padding:0 12px">' + rows() + '</div>' +
      '<div style="font-size:12px;color:#645c50;margin-top:6px">צוות ותורנים ודוח למנהל חשבונות לא ניתנים למשתמשים נוספים (שכר ופרטי בנק). "צפייה" – רואה ולא יכול לשמור שינויים.</div>' +
      (!isNew ? '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-weight:700;font-size:13.5px"><input type="checkbox" id="uActive"' + (u.active === true ? " checked" : "") + ' style="width:20px;height:20px">המשתמש פעיל (הורדת הסימון חוסמת לו את הכניסה)</label>' : '') +
      '<div style="display:flex;gap:8px;margin-top:14px">' + btn("data-u-save", isNew ? "צור משתמש ושלח הזמנה" : "שמירה", true, "flex:1;") + btn("data-u-back", "חזרה") + '</div>' +
      '<div id="uMsg" style="font-size:13px;margin-top:8px;color:#b86e00"></div>';
    var sh = sheet(h); if (!sh) return;
    sh.onclick = async function(e){
      var t = e.target.closest && e.target.closest("[data-lv],[data-tpl],[data-u-save],[data-u-back]"); if (!t) return;
      if (t.hasAttribute("data-u-back")) { close(); setTimeout(window.openUsersAdmin, 250); return; }
      if (t.hasAttribute("data-lv")) { var p = t.getAttribute("data-lv").split("|"); if (p[1]) lv[p[0]] = p[1]; else delete lv[p[0]]; document.getElementById("uRows").innerHTML = rows(); return; }
      if (t.hasAttribute("data-tpl")) { lv = Object.assign({}, TEMPLATES[Number(t.getAttribute("data-tpl"))].tabs); document.getElementById("uRows").innerHTML = rows(); if (!document.getElementById("uName").value) document.getElementById("uName").value = TEMPLATES[Number(t.getAttribute("data-tpl"))].l; return; }
      if (t.hasAttribute("data-u-save")) {
        var msg = document.getElementById("uMsg");
        var name = document.getElementById("uName").value.trim(), phone = document.getElementById("uPhone").value.trim();
        var email = (document.getElementById("uEmail").value || "").trim().toLowerCase();
        var tabs = {}; TABS.forEach(function(k){ if (lv[k] === "view" || lv[k] === "edit") tabs[k] = lv[k]; });
        if (!name) { msg.textContent = "צריך שם"; return; }
        if (!Object.keys(tabs).length) { msg.textContent = "צריך לבחור לפחות טאב אחד"; return; }
        if (isNew && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "כתובת אימייל לא תקינה"; return; }
        t.disabled = true; msg.textContent = "שומר…";
        try {
          if (isNew) {
            var r = await createAccount(email);
            await col().doc(r.uid).set({ name: name, email: email, phone: phone, tabs: tabs, active: true, createdAt: Date.now(), createdBy: "admin" });
            close(); setTimeout(function(){ invited({ name: name, phone: phone, email: email }); }, 250);
          } else {
            var act = document.getElementById("uActive");
            await col().doc(u.uid).update({ name: name, phone: phone, tabs: tabs, active: !!(act && act.checked), updatedAt: Date.now() });
            close(); setTimeout(window.openUsersAdmin, 250);
            if (window.showToast) try { showToast("ההרשאות נשמרו. הן חלות מהכניסה הבאה שלו"); } catch (er) {} // eslint-disable-line no-undef
          }
        } catch (er) {
          console.error(er); t.disabled = false;
          var c = er && er.code || "";
          msg.textContent = c === "auth/email-already-in-use" ? "המייל הזה כבר רשום במערכת. אם זה משתמש שהושבת – פתח אותו ברשימה וסמן 'פעיל'." :
            c === "auth/invalid-email" ? "כתובת אימייל לא תקינה" : "השמירה נכשלה: " + (er && er.message || er);
        }
      }
    };
  }

  /* יצירת חשבון כניסה בלי להוציא את המנהל מהחשבון שלו: מופע נפרד של Firebase */
  async function createAccount(email){
    var name = "usersAdmin";
    var app = (firebase.apps || []).filter(function(a){ return a.name === name; })[0] || firebase.initializeApp(firebaseConfig, name); // eslint-disable-line no-undef
    var a = app.auth();
    var pw = Array.from(crypto.getRandomValues(new Uint8Array(18))).map(function(x){ return ("0" + x.toString(16)).slice(-2); }).join("") + "Aa1!";
    var cred = await a.createUserWithEmailAndPassword(email, pw);
    var uid = cred.user.uid;
    try { a.languageCode = "he"; await a.sendPasswordResetEmail(email); } catch (e) { console.warn("מייל בחירת סיסמה לא נשלח", e); }
    try { await a.signOut(); } catch (e) {}
    return { uid: uid };
  }

  function invited(u){
    var text = "שלום " + u.name + ", הוספתי אותך לאפליקציית ניהול הבניין.\n" +
      "1. במייל " + u.email + " קיבלת הודעה לבחירת סיסמה (כדאי לבדוק גם בספאם).\n" +
      "2. אחרי שבחרת סיסמה, נכנסים כאן: " + APP_URL + "\nעם המייל והסיסמה שבחרת.";
    var ph = String(u.phone || "").replace(/\D/g, "").replace(/^0/, "972");
    var wa = "https://wa.me/" + (ph || "") + "?text=" + encodeURIComponent(text);
    var sh = sheet(head("המשתמש נוצר") + '<div class="sh-note"><p>נשלח ל-' + esc(u.email) + ' מייל לבחירת סיסמה.\nעכשיו שלח לו את ההודעה בווטסאפ כדי שידע מה לעשות.</p></div>' +
      '<a href="' + esc(wa) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;height:48px;border-radius:14px;background:#18864c;color:#fff;font-weight:700;text-decoration:none;font-size:15px">שליחת הודעה בווטסאפ</a>' +
      '<div style="margin-top:8px">' + btn("data-sh-close", "סיום", false, "width:100%;") + '</div>');
    if (sh) sh.addEventListener("click", function(e){ if (e.target.closest && e.target.closest("[data-sh-close]")) setTimeout(window.openUsersAdmin, 250); });
  }
})();
