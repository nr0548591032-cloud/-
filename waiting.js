/* =====================================================================
   ממתינים לתשובה (נובמבר 2026) – מנגנון אחד לכל האפליקציה
   ---------------------------------------------------------------------
   מחליף את "לא חזרו אליך" בלוח הבקרה. אוסף מכל הטאבים את מה ששלחת ועוד לא ענו:
   משימות שנשלחו לאנשי מקצוע · בקשות להצעת מחיר (פרויקטים) · בקשת מסמך מספק (אנשי קשר)
   · הזמנות רכש שלא סומנו כהתקבלו · רישוי שממתין לבודק · משלוחים למנהל החשבונות שלא נצפו.
   - מסודר לפי אדם (ברירת מחדל) או לפי סוג. לאדם עם כמה דברים – תזכורת אחת מרוכזת.
   - הגדרה אחת: "להזכיר אחרי N ימים" = אותו שדה של הנוסח הקבוע להודעות (uiPrefs.proMsg.followDays).
   - "פס ממתין" אחיד שכל טאב מציג: window.wtStrip(key).
   עקרון בטיחות: המודול רק קורא נתונים. הוא כותב רק סימונים קטנים:
   uiPrefs.waiting (דחייה / "חזרו אליי" / מתי נשלחה תזכורת), t.lastNudge במשימה, q.nudgedAt בהצעה.
   הוא לא מוחק ולא משנה שום רשומה אחרת.
   ===================================================================== */
(function(){
  "use strict";
  const has = n => { try { return typeof eval(n) === "function"; } catch (e) { return false; } };   // eslint-disable-line no-eval
  const call = (n, ...a) => { try { const f = eval(n); if (typeof f === "function") return f(...a); } catch (e) { console.warn("wt:", n, e); } }; // eslint-disable-line no-eval
  const D = () => { try { return data; } catch (e) { return {}; } };                                       // eslint-disable-line no-undef
  const esc = s => (typeof escHtml === "function" ? escHtml(s == null ? "" : String(s)) : String(s == null ? "" : s));
  const today = () => { try { return tkToday(); } catch (e) { return new Date().toISOString().slice(0, 10); } }; // eslint-disable-line no-undef
  const d10 = s => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(s || "")); return m ? m[1] : ""; };
  const daysSince = iso => { iso = d10(iso); if (!iso) return 0; try { const n = tkDaysTo(iso); return n === null ? 0 : -n; } catch (e) { return 0; } }; // eslint-disable-line no-undef
  const sdate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || "")); return m ? `${Number(m[3])}.${Number(m[2])}` : ""; };
  const norm = s => String(s || "").replace(/["'״׳`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const maxD = (...a) => a.map(d10).filter(Boolean).sort().pop() || "";
  const isAdmin = () => { try { return currentRole === "admin"; } catch (e) { return true; } };            // eslint-disable-line no-undef
  const canTab = t => { try { return allowedTabs().includes(t); } catch (e) { return true; } };           // eslint-disable-line no-undef
  const toast = (m, ms) => { try { jobToast(m, ms); } catch (e) {} };                                   // eslint-disable-line no-undef
  const money = n => { try { return fmtMoney(n); } catch (e) { return "₪" + n; } };                     // eslint-disable-line no-undef
  const first = n => String(n || "").replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] || "";

  const I = {
    task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    quote: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    doc: '<path d="M12 21c4-1.5 7-4.5 7-9V6l-7-3-7 3v6c0 4.5 3 7.5 7 9z"/><path d="m9 12 2 2 4-4"/>',
    order: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    lic: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    acct: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', wa: '<path d="M7.5 20.5 2 22l1.6-5.3A9 9 0 1 1 7.5 20.5z"/>',
    check: '<path d="m5 12 5 5 9-10"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
  };
  const ic = (n, s) => `<svg viewBox="0 0 24 24" width="${s || 16}" height="${s || 16}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

  const SRC = {
    task:  { l: "משימות",             full: "משימות שנשלחו לאנשי מקצוע", c: "#8c491a", bg: "#ffe1d0", dot: "#c67139", tab: "tasks" },
    quote: { l: "הצעות מחיר",        full: "בקשות להצעת מחיר",          c: "#5a3fc0", bg: "#ece7fd", dot: "#6c4fd8", tab: "projects" },
    doc:   { l: "מסמכים מספקים",     full: "בקשת מסמך מספק",             c: "#3f4a2c", bg: "#e1eecc", dot: "#5f7f3a", tab: "contacts" },
    order: { l: "הזמנות רכש",        full: "הזמנות שלא סומנו כהתקבלו",   c: "#0b6e6e", bg: "#d6f1ef", dot: "#0e8a8a", tab: "procurement" },
    lic:   { l: "רישוי",              full: "רישוי – ממתין לבודק",        c: "#9a3412", bg: "#ffd9cc", dot: "#b4441a", tab: "licensing" },
    acct:  { l: "מנהל החשבונות",     full: "משלוחים למנהל החשבונות",     c: "#2563c4", bg: "#e1ecfb", dot: "#2f74d0", tab: "accountant" }
  };

  /* ---------- הגדרות (uiPrefs.waiting) ---------- */
  function W(){
    const d = D(); d.uiPrefs = d.uiPrefs && typeof d.uiPrefs === "object" ? d.uiPrefs : {};
    const w = d.uiPrefs.waiting && typeof d.uiPrefs.waiting === "object" ? d.uiPrefs.waiting : (d.uiPrefs.waiting = {});
    ["src", "snooze", "done", "nudged"].forEach(k => { if (!w[k] || typeof w[k] !== "object") w[k] = {}; });
    if (w.quiet === undefined) w.quiet = true;
    return w;
  }
  const saveW = () => { try { saveUiPrefs(); } catch (e) { console.error(e); } };                       // eslint-disable-line no-undef
  const srcOn = k => W().src[k] !== false;
  const follow = () => { try { return proMsgCfg().followDays || 3; } catch (e) { return 3; } };          // eslint-disable-line no-undef
  function quietNow(){
    if (!W().quiet) return "";
    const n = new Date(), h = n.getHours(), dw = n.getDay();
    if (dw === 6 && h < 20) return "שבת – תזכורות יוצעו אחרי צאת השבת";
    if (dw === 5 && h >= 15) return "ערב שבת – תזכורות יוצעו אחרי צאת השבת";
    if (h >= 22 || h < 7) return "שעות מנוחה – תזכורות יוצעו מ-07:00";
    return "";
  }

  /* ---------- איסוף ---------- */
  function contactFor(name){ try { return name ? (findContactByName(name) || (D().contacts || []).find(c => c && norm(c.name) === norm(name)) || null) : null; } catch (e) { return null; } } // eslint-disable-line no-undef
  function phoneOf(c){ if (!c) return ""; if (c.phone) return c.phone; const p = (Array.isArray(c.people) ? c.people : []).find(x => x && x.phone); return p ? p.phone : ""; }
  let CACHE = null, CACHE_AT = 0;
  function invalidate(){ CACHE = null; CACHE_AT = 0; }
  function collect(){
    if (CACHE && Date.now() - CACHE_AT < 1500) return CACHE;
    const out = [], d = D(), w = W(), N = follow();
    const push = it => {
      const since = d10(it.since);
      if (!since) return;
      const key = it.key;
      const dn = w.done[key];
      if (dn && dn >= since) return;                                  // "חזרו אליי" אחרי הפנייה האחרונה
      it.since = since; it.days = daysSince(since); it.over = it.days >= N; it.hot = it.days >= N * 2;
      const sz = w.snooze[key]; it.snoozed = !!(sz && sz > today());
      out.push(it);
    };
    if (!isAdmin()) { CACHE = out; CACHE_AT = Date.now(); return out; }
    /* משימות – אותה לוגיקה של "לא חזרו אליך" (נשלחה, לא בוצעה, מאז הקשר האחרון) */
    if (srcOn("task") && canTab("tasks")) (d.tasks || []).forEach(t => {
      try {
        if (!t || !t.assignee || !t.sentAt || tkStatus(t) === "בוצע") return;                                // eslint-disable-line no-undef
        if (typeof tkArchived === "function" && tkArchived(t)) return;                                       // eslint-disable-line no-undef
        const since = has("proLastContact") ? proLastContact(t) : maxD(t.sentAt, t.lastNudge);                 // eslint-disable-line no-undef
        push({ key: "t" + t.id, src: "task", person: t.assignee, title: t.desc || "משימה",
          meta: [(() => { try { return "משימה " + tkCode(t); } catch (e) { return "משימה"; } })(), t.place, t.lastNudge && t.lastNudge >= t.sentAt ? "תזכורת " + sdate(t.lastNudge) : "נשלחה " + sdate(t.sentAt)].filter(Boolean).join(" · "), // eslint-disable-line no-undef
          since, ask: "עדכון ביצוע", line: t.desc || "משימה", ref: { id: t.id } });
      } catch (e) {}
    });
    /* הצעות מחיר שלא הגיעו – רק בפרויקט שעוד מחליטים בו */
    if (srcOn("quote") && canTab("projects")) (d.projects || []).forEach(p => {
      if (!p || !(p.status === "פתוח" || p.status === "בבדיקה") || p.chosenQuoteId) return;
      (p.quotes || []).forEach(q => {
        if (!q || !q.requestedAt || parseFloat(q.price) > 0 || q.fileUrl || q.declined) return;
        push({ key: "q" + p.id + "_" + q.id, src: "quote", person: q.vendor || "ספק", title: "הצעת מחיר: " + (p.name || "פרויקט"),
          meta: ["פרויקטים", q.nudgedAt ? "תזכורת " + sdate(q.nudgedAt) : "בקשה " + sdate(q.requestedAt)].join(" · "),
          since: maxD(q.requestedAt, q.nudgedAt), ask: "הצעת המחיר", line: "הצעת מחיר עבור " + (p.name || "העבודה"), ref: { pid: p.id, qid: q.id } });
      });
    });
    /* מסמך שביקשת מספק (נרשם מעכשיו בלחיצה על "בקשת מסמך") */
    if (srcOn("doc") && canTab("contacts")) (d.contacts || []).forEach(c => {
      if (!c || c.archived) return;
      (Array.isArray(c.docs) ? c.docs : []).forEach((doc, i) => {
        if (!doc || !doc.requestedAt || (doc.answeredAt && doc.answeredAt >= doc.requestedAt)) return;
        const key = "d" + c.id + "_" + (doc.id || i);
        push({ key, src: "doc", person: c.name, title: "עותק מעודכן: " + (doc.name || "מסמך"), meta: ["אנשי קשר", "בקשה " + sdate(doc.requestedAt)].join(" · "),
          since: maxD(doc.requestedAt, w.nudged[key]), ask: "עותק מעודכן", line: "עותק מעודכן של " + (doc.name || "המסמך"), ref: { cid: c.id, i } });
      });
    });
    /* הזמנות רכש: נשלחו ולא סומנו כהתקבלו, ותאריך האספקה עבר */
    if (srcOn("order") && canTab("procurement")) {
      let orders = []; try { orders = (window.SP && SP.S && SP.S.orders) || []; } catch (e) {}
      orders.forEach(o => {
        if (!o || o.status !== "sent") return;
        const due = d10(o.delivery) || d10(o.date);
        if (!due || due >= today()) return;
        const key = "o" + o.id;
        push({ key, src: "order", person: o.supplier || "ספק", title: `הזמנה${o.no ? " #" + o.no : ""} – לא סומנה כהתקבלה`,
          meta: ["רכש ואספקה", "אספקה צפויה " + sdate(due), o.total ? money(o.total) : ""].filter(Boolean).join(" · "),
          since: maxD(due, w.nudged[key]), ask: "ההזמנה", line: `ההזמנה${o.no ? " #" + o.no : ""} מ-${sdate(o.date)}`, lateLabel: true, ref: { id: o.id } });
      });
    }
    /* רישוי: ממתין לביקור / בדיקה */
    if (srcOn("lic") && canTab("licensing")) (d.licensing || []).forEach(r => {
      if (!r || r.renewedToId || r.processStatus !== "ממתין לביקור/בדיקה") return;
      const log = Array.isArray(r.statusLog) ? r.statusLog : [];
      let since = "";
      for (const l of log) { if (l && l.status === "ממתין לביקור/בדיקה" && l.date) since = l.date; else if (since) break; }
      since = since || d10(r.updatedAt) || (log[0] && log[0].date) || "";
      const key = "l" + r.id;
      let who = ""; try { who = lcInspectorName(r); } catch (e) { who = r.inspector || ""; }                // eslint-disable-line no-undef
      push({ key, src: "lic", person: who || "בודק – " + (r.type || "רישוי"), title: "תיאום ביקור: " + (r.type || "אישור"),
        meta: ["רישוי ובטיחות", "ממתין לביקור/בדיקה"].join(" · "), since: maxD(since, w.nudged[key]), ask: "תיאום ביקור", line: "תיאום ביקור עבור " + (r.type || "האישור"), ref: { id: r.id } });
    });
    /* משלוחים למנהל החשבונות שלא נצפו */
    if (srcOn("acct") && canTab("accountant")) {
      const seen = (d.acctInbox && d.acctInbox.seen) || {};
      (d.acctSends || []).forEach(s => {
        if (!s || seen[s.id]) return;
        let st = { paid: 0, total: 1 }; try { st = acxSendStats(s); } catch (e) {}                         // eslint-disable-line no-undef
        if (st.total && st.paid >= st.total) return;
        const key = "a" + s.id;
        push({ key, src: "acct", person: "מנהל החשבונות", title: `משלוח ${st.total || ""} תשלומים – עוד לא נצפה`.replace("  ", " "),
          meta: ["נשלח " + sdate(s.at), s.total ? money(s.total) : ""].filter(Boolean).join(" · "), since: maxD(s.at, w.nudged[key]),
          ask: "מעבר על התשלומים", line: `${st.total || ""} תשלומים ששלחתי ב-${sdate(s.at)}`, ref: { id: s.id }, acct: true });
      });
    }
    out.sort((a, b) => b.days - a.days);
    CACHE = out; CACHE_AT = Date.now();
    return out;
  }
  function groupsOf(L){
    const G = new Map();
    L.forEach(it => { const k = it.acct ? "__acct" : norm(it.person) || it.key; if (!G.has(k)) G.set(k, { person: it.person, items: [] }); G.get(k).items.push(it); });
    return [...G.values()].map(g => Object.assign(g, { days: Math.max(...g.items.map(x => x.days)), over: g.items.some(x => x.over) })).sort((a, b) => b.days - a.days);
  }

  /* ---------- הודעות ---------- */
  function phoneFor(it){
    if (it.acct) { const a = D().accountantContact || {}; return a.phone || ""; }
    if (it.src === "order") { try { const s = SP.supInfo(it.person); if (s && s.phone) return s.phone; } catch (e) {} }
    return phoneOf(contactFor(it.person));
  }
  function cfg(){ try { return proMsgCfg(); } catch (e) { return { open: "שלום {שם}", update: "", bye: "תודה" }; } } // eslint-disable-line no-undef
  function fill(s, name){ return String(s || "").replace(/\{שם\}/g, first(name)).trim(); }
  function msgFor(items){
    const c = cfg(), name = items[0].acct ? "" : items[0].person;
    const lines = [fill(c.open, name) || ("שלום " + first(name)).trim()];
    if (items.length === 1) lines.push(`רציתי לבדוק לגבי ${items[0].line} (מ-${sdate(items[0].since)}).`);
    else { lines.push("רציתי לבדוק לגבי:"); items.forEach((it, i) => lines.push(`${i + 1}. ${it.line}`)); }
    const hasTask = items.some(x => x.src === "task");
    lines.push(hasTask ? (fill(c.update, name) || "אשמח לעדכון 🙏") : items.length === 1 ? askLine(items[0]) : "אשמח לעדכון 🙏");
    const bye = fill(c.bye, name); if (bye) lines.push(bye);
    return lines.join("\n");
  }
  function askLine(it){
    return { quote: "אשמח לקבל את הצעת המחיר בהקדם 🙏", doc: "אשמח לקבל עותק מעודכן 🙏", order: "האם ההזמנה בדרך? 🙏", lic: "אשמח לתאם מועד לביקור 🙏", acct: "אשמח שתעבור על התשלומים באפליקציה 🙏" }[it.src] || "אשמח לעדכון 🙏";
  }
  function markNudged(items){
    const w = W(), t = today(); let tasks = false, proj = false;
    items.forEach(it => {
      if (it.src === "task") { const x = (D().tasks || []).find(y => y.id === it.ref.id); if (x) { x.lastNudge = t; try { tkLog(x, "נשלחה תזכורת (ממתינים לתשובה)"); } catch (e) {} tasks = true; } } // eslint-disable-line no-undef
      else if (it.src === "quote") { const p = (D().projects || []).find(y => y.id === it.ref.pid); const q = p && (p.quotes || []).find(y => y.id === it.ref.qid); if (q) { q.nudgedAt = t; p.log = (p.log || []).concat([{ d: t, t: `נשלחה תזכורת ל${q.vendor}` }]); proj = true; } }
      else w.nudged[it.key] = t;
    });
    if (tasks) { try { tkSave(); } catch (e) {} }                                                       // eslint-disable-line no-undef
    if (proj) { try { scheduleSave("projects", "projectsSaved"); } catch (e) {} }                       // eslint-disable-line no-undef
    saveW();
  }
  function remind(items){
    if (!items.length) return;
    const ph = phoneFor(items[0]);
    if (!ph) { toast(`אין מספר טלפון ל${items[0].acct ? "מנהל החשבונות" : items[0].person}. אפשר להוסיף באנשי קשר וספקים.`, 4200); return; }
    const url = `https://wa.me/${call("formatPhoneForWhatsApp", ph) || String(ph).replace(/\D/g, "")}?text=${encodeURIComponent(msgFor(items))}`;
    try { openOutLink(url); } catch (e) { window.open(url, "_blank", "noopener"); }                       // eslint-disable-line no-undef
    markNudged(items);
    toast(items.length > 1 ? `נשלחה תזכורת אחת על ${items.length} דברים` : "נשלחה תזכורת");
    refresh();
  }
  function answered(it){
    const w = W();
    if (it.src === "task") { const t = (D().tasks || []).find(y => y.id === it.ref.id); if (t && has("tkGotUpdate")) { call("tkGotUpdate", t); return; } }
    if (it.src === "quote" && window.pjAnswer) { window.pjAnswer(it.ref.pid, it.ref.qid); return; }
    if (it.src === "order") {
      if (canTab("procurement")) { call("switchTab", "procurement"); setTimeout(() => { try { SP.setTab("orders"); SP.openReceipt(it.ref.id); } catch (e) { console.error(e); } }, 120); }
      return;
    }
    if (it.src === "doc") {
      const c = (D().contacts || []).find(x => x.id === it.ref.cid); const doc = c && Array.isArray(c.docs) ? (c.docs.find(x => x && x.id === it.ref.i) || c.docs[it.ref.i]) : null;
      if (doc) { doc.answeredAt = today(); try { scheduleSave("contacts", "contactsSaved"); } catch (e) {} } // eslint-disable-line no-undef
      toast("סומן שהתקבל · אפשר לעדכן את המסמך והתוקף בכרטיס", 3500);
      if (c && canTab("contacts")) { call("switchTab", "contacts"); setTimeout(() => call("ctOpen", c.id, "docs"), 120); }
      refresh(); return;
    }
    w.done[it.key] = today(); saveW();
    toast("סומן שחזרו אליך");
    refresh();
  }
  function snooze(items, n){
    const w = W(); let dt = today(); try { dt = tkAddDays(today(), n || 3); } catch (e) {}                // eslint-disable-line no-undef
    items.forEach(it => { w.snooze[it.key] = dt; });
    saveW(); toast(`נדחה עד ${sdate(dt)}`); refresh();
  }
  function openItem(it){
    if (!canTab(SRC[it.src].tab)) return;
    if (it.src === "task") { call("switchTab", "tasks"); setTimeout(() => { call("renderTasks"); call("tkOpen", it.ref.id); }, 80); return; }
    if (it.src === "quote" && window.pjGoto) { window.pjGoto(it.ref.pid, "quotes"); return; }
    if (it.src === "doc") { call("switchTab", "contacts"); setTimeout(() => call("ctOpen", it.ref.cid, "docs"), 100); return; }
    if (it.src === "order") { call("switchTab", "procurement"); setTimeout(() => { try { SP.setTab("orders"); } catch (e) {} }, 100); return; }
    if (it.src === "lic") { call("switchTab", "licensing"); setTimeout(() => call("lcGoto", it.ref.id), 100); return; }
    if (it.src === "acct") { call("switchTab", "accountant"); setTimeout(() => call("acxHandleDeepLink", it.ref.id), 100); }
  }
  function refresh(){
    invalidate();
    try { const db = document.getElementById("tab-dashboard"); if (db && db.classList.contains("active")) renderDashboard(); } catch (e) {} // eslint-disable-line no-undef
    try { const h = document.getElementById("shHome"); if (h) { h.removeAttribute("data-sig"); if (window.shHomeRefresh) window.shHomeRefresh(); } } catch (e) {}
    document.querySelectorAll("[data-wt-strip]").forEach(el => { const k = el.getAttribute("data-wt-strip"); el.outerHTML = strip(k); });
    try { if (window.renderProjects && document.getElementById("tab-projects").classList.contains("active")) renderProjects(); } catch (e) {} // eslint-disable-line no-undef
  }

  /* ---------- CSS ---------- */
  function css(){
    if (document.getElementById("wtCss")) return;
    const st = document.createElement("style"); st.id = "wtCss";
    st.textContent = `
.wt-sec{display:flex;flex-direction:column;gap:12px}
.wt-h{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.wt-h .t{flex:1 1 220px;min-width:0}
.wt-h .t small{display:block;font-size:12.5px;color:#645c50;font-weight:500;margin-top:2px}
.wt-pills{display:flex;gap:6px;flex-wrap:wrap}
.wt-pill{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:#eee7db;color:#4d463c}.wt-pill.over{background:#ffd9cc;color:#8c491a}
.wt-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.wt-seg{display:inline-flex;background:#eee7db;border-radius:999px;padding:3px;gap:2px}
.wt-seg button{border:0;background:transparent;min-height:32px;padding:0 12px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:600;color:#4d463c;cursor:pointer}
.wt-seg button.on{background:#fff;color:#201e1d;box-shadow:0 1px 3px rgba(46,43,37,.18)}
.wt-chip{min-height:32px;padding:0 11px;border-radius:999px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;background:transparent;border:1px solid var(--wc,#201e1d);color:var(--wc,#201e1d)}
.wt-chip.on{background:#201e1d;border-color:#201e1d;color:#f9f4ed}
.wt-x{width:36px;height:36px;border-radius:11px;border:0;background:#eee7db;color:#4d463c;display:inline-grid;place-items:center;cursor:pointer}
.wt-grp{background:#fbf7f0;border-radius:18px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;border:1px solid rgba(32,30,29,.08)}
.wt-gh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wt-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:13px;color:#fff9f2;flex:0 0 auto}
.wt-gh .n{flex:1 1 160px;min-width:0;display:flex;flex-direction:column}.wt-gh .n b{font-size:15px}.wt-gh .n span{font-size:12px;color:#645c50}
.wt-it{display:flex;align-items:center;gap:10px;background:#fff;border-radius:13px;padding:8px 10px;flex-wrap:wrap;border:1px solid rgba(32,30,29,.07)}
.wt-ic{flex:0 0 34px;height:34px;border-radius:10px;display:grid;place-items:center}
.wt-it .tx{flex:1 1 220px;min-width:0;text-align:right;border:0;background:transparent;padding:0;font:inherit;color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:1px}
.wt-it .tx b{font-size:14px;font-weight:600}.wt-it .tx small{font-size:12px;color:#645c50}
.wt-age{display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:96px}
.wt-days{font-size:12px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap;background:#e1eecc;color:#3f4a2c}
.wt-days.over{background:#ffefd6;color:#9a5a00}.wt-days.hot{background:#ffd9cc;color:#8c491a}
.wt-meter{width:96px;height:5px;border-radius:999px;background:#eee7db;overflow:hidden}.wt-meter span{display:block;height:100%;border-radius:999px;background:#5f7f3a}
.wt-meter.over span{background:#c98a1b}.wt-meter.hot span{background:#8c491a}
.wt-btns{display:flex;gap:6px;flex-wrap:wrap}
.wt-b{min-height:36px;padding:0 11px;border-radius:11px;border:0;font:inherit;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap}
.wt-b.wa{background:#dff3e4;color:#1f6a3a}.wt-b.ok{background:#e1eecc;color:#3f4a2c}.wt-b.sn{background:#eee7db;color:#4d463c}.wt-b.main{background:#2b2723;color:#fff;border-radius:999px;min-height:38px;padding:0 14px}
.wt-quiet{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#4d463c;background:#eee7db;border-radius:12px;padding:7px 10px}
.wt-more{align-self:flex-start;border:0;background:transparent;color:#8c491a;font:inherit;font-weight:600;font-size:13px;min-height:36px;cursor:pointer}
.wt-strip{display:flex;align-items:center;gap:10px;background:#fff6ee;border:1px dashed #e0a24a;border-radius:14px;padding:8px 10px;flex-wrap:wrap;margin:6px 0;font-family:inherit}
.wt-strip.hot{border-color:#c4703a;background:#fff0e6}
.wt-strip .tx{flex:1 1 150px;min-width:0;font-size:13px;line-height:1.35;color:#201e1d}.wt-strip .tx span{color:#645c50}
#wtModal{position:fixed;inset:0;background:rgba(32,30,29,.4);z-index:760;display:none;align-items:center;justify-content:center;padding:16px;direction:rtl}
#wtModal.show{display:flex}
#wtModal .bx{background:#fbf7f0;border-radius:22px;width:min(520px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 24px 60px rgba(46,43,37,.25);font-family:inherit}
#wtModal h3{margin:0;font-family:var(--font-heading,"Suez One",serif);font-weight:400;font-size:20px}
#wtModal label.row{display:flex;align-items:center;gap:10px;font-size:14px;background:#fff;border-radius:12px;padding:8px 10px;cursor:pointer}
#wtModal input[type=checkbox]{width:19px;height:19px;accent-color:#c67139;flex:0 0 auto}
#wtModal input[type=number]{width:62px;min-height:40px;border-radius:12px;border:1px solid rgba(32,30,29,.18);background:#fff;font:inherit;text-align:center}
#wtModal .bubble{background:#dcf5d9;border-radius:14px 14px 4px 14px;padding:10px 12px;font-size:13.5px;line-height:1.5;white-space:pre-line}
@media (max-width:760px){.wt-it .wt-btns{width:100%}.wt-it .wt-btns .wt-b{flex:1;justify-content:center}.wt-age{min-width:0}#wtModal{align-items:flex-end;padding:12px 0 0}#wtModal .bx{border-radius:22px 22px 0 0}}
@media print{#wtModal{display:none !important}}`;
    document.head.appendChild(st);
  }

  /* ---------- לוח בקרה ---------- */
  const U = { view: "person", src: "", all: false, showSnoozed: false };
  try { const v = localStorage.getItem("wt-view"); if (v === "type" || v === "person") U.view = v; } catch (e) {}
  /* כל כפתור נושא את המפתחות של הפריטים שלו (data-wt-i="t12,q3_4"), והפריטים נשלפים מחדש בלחיצה */
  const reg = x => esc(x.map(it => it.key).join(","));
  const fromKeys = s => { const K = String(s || "").split(",").filter(Boolean); invalidate(); const all = collect(); return K.map(k => all.find(x => x.key === k)).filter(Boolean); };
  const avColor = n => { try { return tkAvaColor(n); } catch (e) { return "#c67139"; } };              // eslint-disable-line no-undef
  const initials = n => { try { return tkInitials(n); } catch (e) { return String(n || "?").charAt(0); } }; // eslint-disable-line no-undef
  function daysTxt(it){ if (it.lateLabel) return it.days <= 1 ? "יום באיחור" : it.days + " ימים באיחור"; return it.days === 0 ? "היום" : it.days === 1 ? "יום אחד" : it.days + " ימים"; }
  function itemHtml(it, quiet, withRemind){
    const s = SRC[it.src], N = follow(), pct = Math.min(100, Math.round(it.days / (N * 2) * 100));
    const cls = it.hot ? "hot" : it.over ? "over" : "";
    return `<div class="wt-it">
      <span class="wt-ic" style="background:${s.bg};color:${s.c}">${ic(it.src, 17)}</span>
      <button type="button" class="tx" data-wt="open" data-wt-i="${reg([it])}"><b>${esc(it.title)}</b><small>${esc(it.meta)}${it.snoozed ? " · נדחה עד " + sdate(W().snooze[it.key]) : ""}</small></button>
      <span class="wt-age"><span class="wt-days ${cls}">${esc(daysTxt(it))}</span><span class="wt-meter ${cls}"><span style="width:${Math.max(6, pct)}%"></span></span></span>
      <span class="wt-btns">
        ${withRemind && !quiet ? `<button type="button" class="wt-b wa" data-wt="remind" data-wt-i="${reg([it])}">${ic("wa", 14)}תזכורת</button>` : ""}
        <button type="button" class="wt-b ok" data-wt="answered" data-wt-i="${reg([it])}">${ic("check", 14)}חזרו אליי</button>
        <button type="button" class="wt-b sn" data-wt="snooze" data-wt-i="${reg([it])}" title="דחייה ל-3 ימים">דחייה</button>
      </span></div>`;
  }
  function dashHtml(){
    if (!isAdmin()) return "";
    css();
    const all = collect();
    if (!all.length) return "";
    const N = follow(), quiet = quietNow();
    const vis = all.filter(x => !x.snoozed), snoozedN = all.length - vis.length;
    const base = U.showSnoozed ? all : vis;
    const L = U.src ? base.filter(x => x.src === U.src) : base;
    const over = vis.filter(x => x.over).length;
    const cnt = k => base.filter(x => x.src === k).length;
    const chips = [`<button type="button" class="wt-chip ${!U.src ? "on" : ""}" data-wt="src" data-v="">הכל ${base.length}</button>`]
      .concat(Object.keys(SRC).filter(k => cnt(k)).map(k => `<button type="button" class="wt-chip ${U.src === k ? "on" : ""}" style="--wc:${SRC[k].c}" data-wt="src" data-v="${k}">${SRC[k].l} ${cnt(k)}</button>`)).join("");
    let body = "";
    if (U.view === "type") {
      const rows = L.slice(0, U.all ? 999 : 6);
      body = `<div class="wt-grp">${rows.map(it => itemHtml(it, quiet, true).replace('<b>', `<b><span style="color:${SRC[it.src].c}">${esc(it.person)}</span> · `)).join("")}</div>`;
      if (L.length > rows.length || U.all) body += `<button type="button" class="wt-more" data-wt="all">${U.all ? "הצגת פחות" : "הצגת כל " + L.length}</button>`;
    } else {
      const G = groupsOf(L), gs = G.slice(0, U.all ? 999 : 4);
      body = gs.map(g => {
        const a = g.items[0].acct;
        const subs = [...new Set(g.items.map(x => SRC[x.src].l))].join(" · ");
        const multi = g.items.length > 1;
        return `<div class="wt-grp"><div class="wt-gh"><span class="wt-av" style="background:${a ? "#2f74d0" : avColor(g.person)}">${esc(initials(g.person))}</span>
          <span class="n"><b>${esc(g.person)}</b><span>${multi ? g.items.length + " דברים פתוחים · " : ""}${esc(subs)}</span></span>
          ${multi && !quiet ? `<button type="button" class="wt-b main" data-wt="remind" data-wt-i="${reg(g.items)}">${ic("wa", 15)}תזכורת אחת על ${g.items.length === 2 ? "שניהם" : "כולם"}</button>` : ""}</div>
          ${g.items.map(it => itemHtml(it, quiet, !multi)).join("")}</div>`;
      }).join("");
      if (G.length > gs.length || U.all) body += `<button type="button" class="wt-more" data-wt="all">${U.all ? "הצגת פחות" : "הצגת כל " + G.length + " האנשים"}</button>`;
    }
    if (!L.length) body = `<div class="wt-grp" style="font-size:13.5px;color:#645c50">אין כאן כרגע.</div>`;
    return `<section class="db-sec db-in wt-sec" style="--i:2">
      <div class="wt-h"><div class="db-sec-h t" style="margin:0">${ic("clock", 18)}ממתינים לתשובה<small>כל מה ששלחת ועוד לא חזרו אליך · מזכירים אחרי ${N} ימים</small></div>
        <span class="wt-pills"><span class="wt-pill">${vis.length} ממתינים</span>${over ? `<span class="wt-pill over">${over} עבר הזמן</span>` : ""}${snoozedN ? `<button type="button" class="wt-pill" style="border:0;cursor:pointer;font:inherit;font-size:12px;font-weight:700" data-wt="snoozed">${U.showSnoozed ? "הסתרת" : ""} ${snoozedN} נדחו</button>` : ""}</span>
        <button type="button" class="wt-x" data-wt="settings" aria-label="הגדרות מעקב">${ic("gear", 17)}</button></div>
      ${quiet ? `<div class="wt-quiet">${ic("moon", 15)}${esc(quiet)}</div>` : ""}
      <div class="wt-bar"><span class="wt-seg"><button type="button" class="${U.view === "person" ? "on" : ""}" data-wt="view" data-v="person">לפי אדם</button><button type="button" class="${U.view === "type" ? "on" : ""}" data-wt="view" data-v="type">לפי סוג</button></span>${chips}</div>
      ${body}
    </section>`;
  }

  /* ---------- פס "ממתין" בתוך הטאבים ---------- */
  function strip(key){
    if (!isAdmin()) return "";
    const it = collect().find(x => x.key === key);
    if (!it) return `<span data-wt-strip="${esc(key)}" hidden></span>`;
    css();
    const quiet = quietNow();
    const i = reg([it]);
    return `<div class="wt-strip ${it.hot ? "hot" : ""}" data-wt-strip="${esc(key)}">${ic("clock", 18).replace('stroke="currentColor"', 'stroke="#b86e00"')}
      <span class="tx"><b>ממתין ל${esc(it.ask)} · ${esc(daysTxt(it))}</b><br><span>${esc(it.meta)}${it.snoozed ? " · נדחה עד " + sdate(W().snooze[it.key]) : ""}</span></span>
      ${quiet ? "" : `<button type="button" class="wt-b wa" data-wt="remind" data-wt-i="${i}">${ic("wa", 14)}תזכורת</button>`}
      <button type="button" class="wt-b ok" data-wt="answered" data-wt-i="${i}">${ic("check", 14)}חזרו אליי</button></div>`;
  }

  /* ---------- מסך הבית בטלפון + חלון תזכורת מרוכזת לאדם ---------- */
  function homeHtml(){
    if (!isAdmin()) return "";
    css();
    const vis = collect().filter(x => !x.snoozed);
    if (!vis.length) return "";
    const G = groupsOf(vis), over = vis.filter(x => x.over).length;
    return `<section class="wt-home" style="background:#fff;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 2px rgba(46,43,37,.08)">
      <div style="display:flex;align-items:center;gap:8px"><span style="color:#b86e00;display:inline-flex">${ic("clock", 17)}</span><b style="flex:1;font-size:15px">ממתינים לתשובה · ${vis.length}</b>${over ? `<span class="wt-pill over">${over} עבר הזמן</span>` : ""}</div>
      ${G.slice(0, 3).map(g => { const a = g.items[0].acct; const top = g.items.reduce((m, x) => x.days > m.days ? x : m, g.items[0]);
        return `<button type="button" data-wt="person" data-wt-i="${reg(g.items)}" style="display:flex;align-items:center;gap:10px;border:0;background:#fbf7f0;border-radius:14px;padding:9px 10px;text-align:right;font:inherit;color:#201e1d;cursor:pointer;width:100%">
          <span class="wt-av" style="width:36px;height:36px;font-size:12.5px;background:${a ? "#2f74d0" : avColor(g.person)}">${esc(initials(g.person))}</span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><b style="font-size:14px">${esc(g.person)}</b><span style="font-size:12px;color:#645c50;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.items.length > 1 ? g.items.length + " דברים · " + g.items.map(x => SRC[x.src].l).filter((v, i, z) => z.indexOf(v) === i).join(", ") : top.title)}</span></span>
          <span class="wt-days ${top.hot ? "hot" : top.over ? "over" : ""}">${esc(daysTxt(top))}</span></button>`; }).join("")}
      ${G.length > 3 ? `<button type="button" class="wt-more" data-wt="home-all">כל ${G.length} האנשים</button>` : ""}
    </section>`;
  }
  function personSheet(items){
    if (!items.length) return;
    const a = items[0].acct, name = a ? "מנהל החשבונות" : items[0].person, quiet = quietNow();
    const html = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="wt-av" style="width:42px;height:42px;background:${a ? "#2f74d0" : avColor(name)}">${esc(initials(name))}</span>
        <div style="flex:1;display:flex;flex-direction:column"><b style="font-size:16px">${esc(name)}</b><span style="font-size:12.5px;color:#645c50">${items.length > 1 ? items.length + " דברים מחכים לתשובה" : "מחכה לתשובה"}</span></div>
        <button class="sh-x" type="button" data-sh-close aria-label="סגירה">${ic("x", 18)}</button></div>
      <div style="display:flex;flex-direction:column;gap:6px" id="wtPsItems">${items.map(it => `<label style="display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:9px 11px;font-size:13.5px"><input type="checkbox" checked data-wt-pk="${esc(it.key)}" style="width:19px;height:19px;accent-color:#c67139;flex:0 0 auto"><span style="flex:1;min-width:0">${esc(it.title)}<small style="display:block;color:#645c50;font-size:11.5px">${esc(it.meta)}</small></span><span class="wt-days ${it.hot ? "hot" : it.over ? "over" : ""}">${esc(daysTxt(it))}</span></label>`).join("")}</div>
      <div class="bubble" id="wtPsMsg" style="background:#dcf5d9;border-radius:14px 14px 4px 14px;padding:10px 12px;font-size:13.5px;line-height:1.5;white-space:pre-line;margin-top:10px">${esc(msgFor(items))}</div>
      ${quiet ? `<div class="wt-quiet" style="margin-top:10px">${ic("moon", 15)}${esc(quiet)}</div>` : `<button type="button" data-wt="p-send" style="margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;border:0;background:#1f8a4c;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer">${ic("wa", 18)}${items.length > 1 ? "שליחת תזכורת אחת בוואטסאפ" : "שליחת תזכורת בוואטסאפ"}</button>`}
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px">
        <button type="button" data-wt="p-ok" class="wt-b ok" style="justify-content:center;min-height:44px">${items.length > 1 ? "סימון שחזרו אליי" : "חזרו אליי"}</button>
        <button type="button" data-wt="p-snooze" class="wt-b sn" style="justify-content:center;min-height:44px">דחייה ל-3 ימים</button></div>`;
    if (window.shSheet) { const sh = window.shSheet(html); if (sh) sh.addEventListener("change", () => { const m = document.getElementById("wtPsMsg"); const L = pickedKeys(); if (m) m.textContent = L.length ? msgFor(fromKeys(L.join(","))) : "לא נבחר כלום"; }); }
    else { const L = items; if (confirm(msgFor(L))) remind(L); }   // גיבוי – לא אמור לקרות (במחשב הכל בלוח הבקרה)
  }
  function pickedKeys(){ return [...document.querySelectorAll("[data-wt-pk]:checked")].map(x => x.getAttribute("data-wt-pk")); }
  function closeSheet(){ try { if (window.shClose) window.shClose(); } catch (e) {} }
  function allSheet(){
    const G = groupsOf(collect().filter(x => !x.snoozed));
    if (!window.shSheet) return;
    window.shSheet(`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><b style="flex:1;font-size:16px">ממתינים לתשובה</b><button class="sh-x" type="button" data-sh-close aria-label="סגירה">${ic("x", 18)}</button></div>
      <div style="display:flex;flex-direction:column;gap:6px">${G.map(g => { const top = g.items.reduce((m, x) => x.days > m.days ? x : m, g.items[0]);
        return `<button type="button" data-wt="person" data-wt-i="${reg(g.items)}" style="display:flex;align-items:center;gap:10px;border:0;background:#fff;border-radius:12px;padding:9px 10px;text-align:right;font:inherit;color:#201e1d;cursor:pointer"><span class="wt-av" style="width:34px;height:34px;font-size:12px;background:${g.items[0].acct ? "#2f74d0" : avColor(g.person)}">${esc(initials(g.person))}</span><span style="flex:1;min-width:0"><b style="font-size:14px">${esc(g.person)}</b><small style="display:block;color:#645c50;font-size:12px">${esc(g.items.map(x => x.title).join(" · "))}</small></span><span class="wt-days ${top.hot ? "hot" : top.over ? "over" : ""}">${esc(daysTxt(top))}</span></button>`; }).join("")}</div>`);
  }

  /* ---------- הגדרות ---------- */
  function settings(){
    css();
    let m = document.getElementById("wtModal");
    if (!m) { m = document.createElement("div"); m.id = "wtModal"; document.body.appendChild(m); }
    const w = W(), N = follow();
    const sample = msgFor([{ src: "task", person: "שלמה חיים", line: "תיקון נזילה בשירותים קומה 2", since: today() }, { src: "task", person: "שלמה חיים", line: "החלפת נורות במסדרון", since: today() }]);
    m.innerHTML = `<div class="bx" role="dialog" aria-modal="true" aria-label="הגדרות מעקב">
      <div style="display:flex;align-items:flex-start;gap:10px"><div style="flex:1"><h3>הגדרה אחת לכל האפליקציה</h3><div style="font-size:12.5px;color:#645c50">חלה על לוח הבקרה ועל הפס "ממתין" בכל הטאבים</div></div><button type="button" class="wt-x" data-wt="m-close" aria-label="סגירה">${ic("x", 16)}</button></div>
      <label style="display:flex;align-items:center;gap:8px;font-size:14px;flex-wrap:wrap">להזכיר אחרי <input type="number" id="wtDays" min="1" max="30" value="${N}"> ימים בלי תשובה</label>
      <div style="font-size:12.5px;font-weight:700;color:#645c50">מה נכנס למעקב</div>
      ${Object.keys(SRC).map(k => `<label class="row"><input type="checkbox" data-wt-src="${k}" ${w.src[k] !== false ? "checked" : ""}><span style="width:10px;height:10px;border-radius:50%;background:${SRC[k].dot}"></span><span style="flex:1">${SRC[k].full}</span></label>`).join("")}
      <label class="row"><input type="checkbox" id="wtQuiet" ${w.quiet ? "checked" : ""}>לא להציע תזכורות בשבת ובין 22:00–07:00</label>
      <div style="font-size:12.5px;font-weight:700;color:#645c50">כך נראית תזכורת מרוכזת</div>
      <div class="bubble">${esc(sample)}</div>
      <div style="font-size:12px;color:#645c50;line-height:1.5">הפתיחה והסיום לקוחים מהנוסח הקבוע של ההודעות לאנשי מקצוע (בחלון השליחה במשימות).</div>
      <div style="display:flex;gap:8px"><button type="button" class="wt-b main" data-wt="m-save">שמירה</button><button type="button" class="wt-b sn" data-wt="m-close">ביטול</button></div>
    </div>`;
    m.classList.add("show");
  }
  function saveSettings(){
    const w = W();
    const n = Math.round(Number((document.getElementById("wtDays") || {}).value));
    document.querySelectorAll("#wtModal [data-wt-src]").forEach(cb => { w.src[cb.getAttribute("data-wt-src")] = cb.checked; });
    w.quiet = !!(document.getElementById("wtQuiet") || {}).checked;
    if (n >= 1 && n <= 30 && n !== follow()) { try { wsTplStore(Object.assign({}, proMsgCfg(), { followDays: n })); } catch (e) { console.error(e); } } // eslint-disable-line no-undef
    saveW();
    document.getElementById("wtModal").classList.remove("show");
    toast("ההגדרות נשמרו · חלות על כל האפליקציה");
    refresh();
  }

  /* ---------- אירועים ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-wt]");
    if (!b) { const m = document.getElementById("wtModal"); if (m && e.target === m) m.classList.remove("show"); return; }
    const a = b.getAttribute("data-wt"), items = b.hasAttribute("data-wt-i") ? fromKeys(b.getAttribute("data-wt-i")) : [];
    e.stopPropagation();
    switch (a) {
      case "remind": remind(items); break;
      case "answered": if (items[0]) answered(items[0]); break;
      case "snooze": snooze(items, 3); break;
      case "open": if (items[0]) openItem(items[0]); break;
      case "view": U.view = b.getAttribute("data-v"); try { localStorage.setItem("wt-view", U.view); } catch (er) {} refresh(); break;
      case "src": U.src = b.getAttribute("data-v"); refresh(); break;
      case "all": U.all = !U.all; refresh(); break;
      case "snoozed": U.showSnoozed = !U.showSnoozed; refresh(); break;
      case "settings": settings(); break;
      case "person": personSheet(items); break;   // החלון החדש סוגר את הקודם בעצמו
      case "home-all": allSheet(); break;
      case "p-send": { const L = fromKeys(pickedKeys().join(",")); if (!L.length) { toast("לא נבחר כלום"); break; } closeSheet(); remind(L); break; }
      case "p-ok": { const L = fromKeys(pickedKeys().join(",")); closeSheet(); if (L.length === 1) answered(L[0]); else { const w = W(); L.forEach(it => { if (it.src === "task" || it.src === "quote") return; w.done[it.key] = today(); }); saveW(); const rest = L.filter(it => it.src === "task" || it.src === "quote"); if (rest.length) answered(rest[0]); else { toast("סומן שחזרו אליך"); refresh(); } } break; }
      case "p-snooze": { const L = fromKeys(pickedKeys().join(",")); closeSheet(); snooze(L, 3); break; }
      case "m-close": document.getElementById("wtModal").classList.remove("show"); break;
      case "m-save": saveSettings(); break;
    }
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { const m = document.getElementById("wtModal"); if (m && m.classList.contains("show")) m.classList.remove("show"); } });

  window.wtDashHtml = dashHtml;
  window.wtHomeHtml = homeHtml;
  window.wtStrip = strip;
  window.wtCollect = () => { invalidate(); return collect(); };
  window.wtOverdue = () => collect().filter(x => x.over && !x.snoozed);
  window.wtRefresh = refresh;
  window.wtRemind = keys => { const L = fromKeys(keys); if (!L.length) return false; remind(L); return true; };
})();
