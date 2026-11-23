/* =====================================================================
   פרויקטים והצעות מחיר (נובמבר 2026) – טאב חדש בקו העיצוב של אנשי קשר וספקים
   ---------------------------------------------------------------------
   מסלול: איסוף הצעות → השוואה והחלטה → בביצוע → הושלם (או בוטל).
   סנכרון עם שאר האפליקציה:
   - אנשי קשר: בקשת הצעות לספקים (וואטסאפ / Gmail, באותו נוסח פתיחה וסיום של הודעות המשימות),
     ההצעות מופיעות גם בהיסטוריה של הספק בכרטיס איש הקשר.
   - משימות: פתיחת משימת ביצוע לספק שנבחר (t.projectId), או קישור משימה קיימת.
   - חשבוניות וקבלות / דוח למנהל חשבונות: העלות בפועל נספרת רק מהחשבוניות שכבר קיימות שם
     (משימות הפרויקט + תשלומים ששויכו לפרויקט). הפרויקט לא יוצר תשלום משלו – אין כפל עלויות.
   - לוח בקרה: מונים לפי שלב + התראות (הצעה שלא חזרה, הצעה שפג תוקפה, יעד שעבר).
   - סוכן ה-AI: קריאת קובץ הצעה (ספק, סכום, מע"מ, פריטים, תוקף) וניתוח השוואתי של כל ההצעות.
   עקרון בטיחות: רק מוסיפים שדות. שום שדה ישן לא נמחק (name, category, desc, status, quotes[vendor,price,notes,fileUrl]).
   מחיקה רק בלחיצה מפורשת + חלון אישור. מחיקת פרויקט לא מוחקת משימות, חשבוניות או קבצים.
   ===================================================================== */
(function(){
  "use strict";

  /* ---------- כלים ---------- */
  const has = n => { try { return typeof eval(n) === "function"; } catch (e) { return false; } };   // eslint-disable-line no-eval
  const esc = s => (typeof escHtml === "function" ? escHtml(s == null ? "" : String(s)) : String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const money = n => fmtMoney(Math.round((Number(n) || 0) * 100) / 100);                                  // eslint-disable-line no-undef
  const today = () => tkToday();                                                                          // eslint-disable-line no-undef
  const daysTo = iso => { try { return tkDaysTo(String(iso || "").slice(0, 10)); } catch (e) { return null; } }; // eslint-disable-line no-undef
  const daysSince = iso => { const n = daysTo(iso); return n === null ? null : -n; };
  const fdate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || "")); return m ? `${m[3]}.${m[2]}.${m[1]}` : ""; };
  const sdate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || "")); return m ? `${Number(m[3])}.${Number(m[2])}` : ""; };
  const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/[,₪\s]/g, "")); return isFinite(n) ? n : 0; };
  const norm = s => String(s || "").replace(/["'״׳`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const isAdmin = () => { try { return currentRole === "admin"; } catch (e) { return true; } };          // eslint-disable-line no-undef
  const canEdit = () => { try { return roleCanWrite("projects-data"); } catch (e) { return true; } };      // eslint-disable-line no-undef
  const canTab = t => { try { return canOpenTab(t); } catch (e) { return true; } };                        // eslint-disable-line no-undef
  const toast = (m, ms) => { try { jobToast(m, ms); } catch (e) { console.log(m); } };                    // eslint-disable-line no-undef
  const VAT = () => { try { return (window.SP && SP.VAT_RATE) || 0.18; } catch (e) { return 0.18; } };
  const save = () => { try { scheduleSave("projects", "projectsSaved"); } catch (e) { console.error(e); } }; // eslint-disable-line no-undef
  const D = () => { try { return data; } catch (e) { return {}; } };                                      // eslint-disable-line no-undef
  const list = () => { const d = D(); if (!Array.isArray(d.projects)) d.projects = []; return d.projects; };
  const getP = id => list().find(p => p && String(p.id) === String(id)) || null;
  const newId = add => nextId() + add;                                                                     // eslint-disable-line no-undef

  const I = {
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    hammer: '<path d="m15 12-8.4 8.4a2 2 0 0 1-2.8-2.8L12.2 9"/><path d="M17.6 15 22 10.6M20 8.6l-6.4-6.4a2 2 0 0 0-2.8 0l-1.6 1.6 7.2 7.2"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.6l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h9.1a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0Z"/><path d="M12 17v5"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8"/><path d="M14.7 6.3 13 4.6a4 4 0 0 0-5.6 5.6l1.7 1.7"/>',
    shield: '<path d="M12 21c4-1.5 7-4.5 7-9V6l-7-3-7 3v6c0 4.5 3 7.5 7 9z"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>', wa: '<path d="M7.5 20.5 2 22l1.6-5.3A9 9 0 1 1 7.5 20.5z"/><path d="M8.5 9.5c.5 2.5 3.5 5.5 6 6l1.5-1.5-2-1-1 1c-1-.5-2.5-2-3-3l1-1-1-2Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', check: '<path d="m5 12 5 5 9-10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2a3.3 3.3 0 0 1-3-1.6M12 6v12"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13 7 4 4"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
    printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4.5A1.5 1.5 0 0 1 3 16.5v-5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H18"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', alert: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    note: '<path d="M5 4h14v12l-4 4H5Z"/><path d="M15 20v-4h4"/>', star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
    open: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>', chev: '<path d="m6 9 6 6 6-6"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'
  };
  const ic = (n, s) => `<svg viewBox="0 0 24 24" width="${s || 18}" height="${s || 18}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

  /* ---------- שלבים וקטגוריות ---------- */
  const STAGES = [
    { v: "פתוח",   l: "איסוף הצעות",   c: "#c67139", bg: "#ffe1d0", fg: "#8c491a" },
    { v: "בבדיקה", l: "השוואה והחלטה", c: "#6c4fd8", bg: "#ece7fd", fg: "#5a3fc0" },
    { v: "בביצוע", l: "בביצוע",        c: "#2f74d0", bg: "#e1ecfb", fg: "#2563c4" },
    { v: "הושלם",  l: "הושלם",         c: "#5f7f3a", bg: "#e1eecc", fg: "#3f4a2c" },
    { v: "בוטל",   l: "בוטל / נדחה",   c: "#82796a", bg: "#eee7db", fg: "#4d463c" }
  ];
  const stage = p => STAGES.find(s => s.v === (p && p.status)) || STAGES[0];
  const stageIdx = p => Math.max(0, STAGES.indexOf(stage(p)));
  const isArch = p => p && (p.status === "הושלם" || p.status === "בוטל");
  const CATS = ["שיפוץ", "רכש חדש", "מוצר חשמלי חדש", "תחזוקה", "בטיחות", "ריהוט וציוד", "אחר"];
  const catIco = c => /שיפוץ|בנ|צבע/.test(c || "") ? "hammer" : /חשמל/.test(c || "") ? "plug" : /רכש|ריהוט|ציוד/.test(c || "") ? "cart" : /תחזוק/.test(c || "") ? "wrench" : /בטיחות|רישוי/.test(c || "") ? "shield" : "folder";
  const allCats = () => [...new Set(CATS.concat(list().map(p => p && p.category).filter(Boolean)))];

  /* ---------- הצעות ---------- */
  const qPrice = q => num(q && q.price);
  const qGross = q => { const p = qPrice(q); return q && q.vat === "ex" ? Math.round(p * (1 + VAT()) * 100) / 100 : p; };
  const qWaiting = q => !!(q && q.requestedAt && !(qPrice(q) > 0) && !q.fileUrl && !q.declined);
  const qReal = q => q && (q.vendor || qPrice(q) > 0 || q.fileUrl || q.requestedAt || q.notes);
  function calc(p){
    const quotes = (p.quotes || []).filter(qReal);
    const recv = quotes.filter(q => qPrice(q) > 0 && !q.declined);
    const waiting = quotes.filter(qWaiting);
    const min = recv.length ? Math.min(...recv.map(qGross)) : 0;
    const max = recv.length ? Math.max(...recv.map(qGross)) : 0;
    const chosen = quotes.find(q => String(q.id) === String(p.chosenQuoteId)) || null;
    const expiring = isArch(p) || p.status === "בביצוע" ? [] : recv.filter(q => { const n = daysTo(q.validUntil); return n !== null && n <= 7; });
    /* ממתינים "פעילים": רק כל עוד מחליטים. אחרי בחירה / ביצוע – לא מתריעים על ספק שלא ענה */
    const pending = (p.status === "פתוח" || p.status === "בבדיקה") && !chosen ? waiting : [];
    return { quotes, recv, waiting, pending, min, max, chosen, expiring };
  }
  function lastActivity(p){
    let last = String(p.created || "").slice(0, 10);
    const bump = d => { d = String(d || "").slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d > last) last = d; };
    (p.log || []).forEach(l => bump(l && l.d));
    (p.quotes || []).forEach(q => { if (q) { bump(q.receivedAt); bump(q.requestedAt); bump(q.date); } });
    if (!last) { const id = Number(p.id); if (id > 1e15) { try { last = tkIso(new Date(Math.floor(id / 1000))); } catch (e) {} } } // eslint-disable-line no-undef
    return last;
  }
  function log(p, t){ p.log = (Array.isArray(p.log) ? p.log : []).concat([{ d: today(), t: String(t).slice(0, 300) }]).slice(-300); }

  /* ---------- עלויות בפועל: רק מהחשבוניות שכבר קיימות (בלי כפל) ---------- */
  let JOBS = null;
  function jobsMap(){
    if (JOBS) return JOBS;
    JOBS = new Map();
    if (!isAdmin() || !has("collectJobs")) return JOBS;
    let jobs = [];
    try { jobs = collectJobs(); } catch (e) { console.error(e); }               // eslint-disable-line no-undef
    jobs.forEach(j => {
      const pid = (j.task && j.task.projectId) || (j.vp && j.vp.projectId) || (j.proc && j.proc.projectId);
      if (!pid) return;
      const k = String(pid);
      if (!JOBS.has(k)) JOBS.set(k, []);
      JOBS.get(k).push(j);
    });
    return JOBS;
  }
  function costs(p){
    const jobs = jobsMap().get(String(p.id)) || [];
    const spent = jobs.reduce((a, j) => a + (Number(j.amount) || 0), 0);
    const paid = jobs.filter(j => j.paid).reduce((a, j) => a + (Number(j.amount) || 0), 0);
    const tasks = (D().tasks || []).filter(t => t && String(t.projectId) === String(p.id));
    return { jobs, spent, paid, tasks };
  }

  /* ---------- מצב ממשק ---------- */
  const U = { view: "active", cat: "", q: "", sort: "recent", openId: null, tab: "over", allAlerts: false, aiBusy: false };
  try { const s = localStorage.getItem("pj-sort"); if (s) U.sort = s; } catch (e) {}

  /* ---------- CSS (משלים את סגנון אנשי קשר – ct-*) ---------- */
  function css(){
    if (document.getElementById("pjCss")) return;
    const st = document.createElement("style"); st.id = "pjCss";
    st.textContent = `
#pjDrawer{display:none}#pjDrawer.show{display:block}
#pjDrawer *,#pjModal *{box-sizing:border-box}#pjDrawer button,#pjModal button{font-family:inherit;cursor:pointer}
#pjModal{position:fixed;inset:0;background:rgba(32,30,29,.40);z-index:700;display:none;align-items:center;justify-content:center;padding:16px;direction:rtl}
#pjModal.show{display:flex}
#pjModal textarea{width:100%;min-width:0;border-radius:12px;border:1px solid rgba(32,30,29,.18);background:#fbf7f0;padding:10px 12px;font:inherit;font-size:14px;line-height:1.5;color:#201e1d;resize:vertical}
#pjModal input[type=search]{min-height:0}
#pjModal .ct-f input:focus,#pjModal textarea:focus{outline:2px solid #c67139;outline-offset:1px}
.pj-ic{flex:0 0 44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--sbg,#ffe1d0);color:var(--sfg,#8c491a)}
.pj-st{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--sbg);color:var(--sfg);white-space:nowrap}
.pj-st::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--sc)}
.pj-steps{display:flex;gap:4px}.pj-steps i{flex:1;height:5px;border-radius:999px;background:#eee7db}.pj-steps i.on{background:var(--sc)}
.pj-card{border-top:4px solid var(--sc,#c67139)}
.pj-card.arch{opacity:.8}
.pj-bars{display:flex;flex-direction:column;gap:6px}
.pj-bar{display:grid;grid-template-columns:minmax(0,7.5em) minmax(0,1fr) auto;align-items:center;gap:8px;font-size:12.5px}
.pj-bar .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#4d463c;font-weight:600}
.pj-bar .t{height:9px;border-radius:999px;background:#eee7db;overflow:hidden}.pj-bar .t span{display:block;height:100%;border-radius:999px;background:#c9b9a3;transform-origin:right;animation:pjGrow .6s ease both}
.pj-bar.best .t span{background:#5f7f3a}.pj-bar.pick .t span{background:#2f74d0}
.pj-bar .v{font-weight:700;color:#201e1d;white-space:nowrap}.pj-bar.wait .t{background:repeating-linear-gradient(-45deg,#eee7db 0 6px,#f8f2e9 6px 12px)}.pj-bar.wait .v{font-weight:500;color:#8c491a}
@keyframes pjGrow{from{transform:scaleX(0)}to{transform:none}}
.pj-flags{display:flex;flex-wrap:wrap;gap:6px}
.pj-qs{display:flex;flex-direction:column;gap:12px}
.pj-q{background:#fff;border-radius:18px;border:1.5px solid rgba(32,30,29,.10);padding:13px;display:flex;flex-direction:column;gap:9px;position:relative;animation:ctIn .3s ease both}
.pj-q.best{border-color:#7a8a5e}.pj-q.pick{border-color:#2f74d0;box-shadow:0 0 0 3px #e1ecfb}.pj-q.wait{border-style:dashed;background:#fffaf4}.pj-q.dec{opacity:.6}
.pj-q-top{display:flex;gap:10px;align-items:flex-start}
.pj-q-top .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.pj-q-top .nm{font-weight:700;font-size:15px;color:#201e1d;overflow-wrap:anywhere;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pj-q-top .sb{font-size:12px;color:#645c50}
.pj-q-pr{text-align:left;display:flex;flex-direction:column;align-items:flex-end;gap:1px;flex:0 0 auto}
.pj-q-pr b{font-family:var(--font-heading,"Suez One",serif);font-weight:400;font-size:21px;color:#201e1d;white-space:nowrap}
.pj-q-pr small{font-size:11.5px;color:#645c50;white-space:nowrap}
.pj-diff{font-size:12.5px;font-weight:600;color:#8c491a}.pj-diff.ok{color:#3f4a2c}
.pj-items{background:#fbf7f0;border-radius:12px;padding:4px 10px}
.pj-items summary{cursor:pointer;font-size:13px;font-weight:600;color:#4d463c;min-height:34px;display:flex;align-items:center}
.pj-items div{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:5px 0;border-top:1px solid rgba(32,30,29,.07)}
.pj-items div span{overflow-wrap:anywhere;min-width:0}.pj-items div b{white-space:nowrap}
.pj-qa{display:flex;flex-wrap:wrap;gap:6px}
.pj-qa .ab{flex:0 1 auto;min-height:38px;border-radius:12px;border:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;font-size:13px;font-weight:600;text-decoration:none}
.pj-qa .ab.pri{background:#2b2723;color:#fff}
.pj-money{display:flex;flex-direction:column;gap:10px}
.pj-mrow{display:grid;grid-template-columns:7.5em minmax(0,1fr) auto;gap:10px;align-items:center;font-size:13px}
.pj-mrow .t{height:12px;border-radius:999px;background:#eee7db;overflow:hidden}.pj-mrow .t span{display:block;height:100%;border-radius:999px;animation:pjGrow .6s ease both;transform-origin:right}
.pj-mrow b{white-space:nowrap}
.pj-ai{background:linear-gradient(135deg,#fff6ee,#f4efff);border:1.5px solid #e6dcfb}
.pj-ai h4::before{background:#6c4fd8 !important}
.pj-ai ul{margin:0;padding:0 18px 0 0;display:flex;flex-direction:column;gap:4px;font-size:13.5px;line-height:1.45}
.pj-rec{background:#fff;border-radius:12px;padding:10px 12px;font-size:13.5px;line-height:1.5;border-right:4px solid #6c4fd8}
.pj-ask{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;line-height:1.45;padding:6px 0;border-top:1px solid rgba(32,30,29,.07)}
.pj-ask div{flex:1;min-width:0}.pj-ask small{display:block;color:#645c50;font-size:12px}
.pj-ven{display:flex;flex-direction:column;gap:6px;max-height:44vh;overflow-y:auto;padding:2px}
.pj-ven label{display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:9px 12px;cursor:pointer;border:1.5px solid transparent}
.pj-ven label:has(input:checked){border-color:#c67139;background:#fff6ee}
.pj-ven input{width:20px;height:20px;accent-color:#c67139;flex:0 0 auto}
.pj-ven .t{flex:1;min-width:0;display:flex;flex-direction:column;font-size:14px}.pj-ven .t span{font-size:12px;color:#645c50}
.pj-ven .why{font-size:11px;font-weight:700;color:#3f4a2c;background:#e1eecc;border-radius:999px;padding:2px 8px;white-space:nowrap}
.pj-sendrow{display:flex;align-items:center;gap:8px;background:#fff;border-radius:12px;padding:8px 12px;flex-wrap:wrap}
.pj-sendrow .t{flex:1 1 140px;min-width:0;font-size:14px;font-weight:600}.pj-sendrow .t small{display:block;font-weight:400;color:#645c50;font-size:12px}
.pj-sendrow.sent{background:#f0f6e8}
.pj-unc{background:#fff8e8 !important;border-color:#f0c56a !important}
.pj-hint{font-size:12.5px;color:#645c50;line-height:1.5}
.pj-prog{display:flex;flex-direction:column;gap:6px}
.pj-prog div{display:flex;gap:8px;align-items:center;font-size:13.5px;background:#fff;border-radius:10px;padding:8px 10px}
.pj-tag-ai{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:#ece7fd;color:#5a3fc0}
#pjDrawer .ct-acts.wide .ab{white-space:nowrap;padding:0 10px}
.pj-empty-cta{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:6px}
@media (max-width:760px){body.sh-on .ct-card.pj-card{flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:8px;padding:12px 13px}
  body.sh-on .pj-card .ct-card-t .nm{white-space:normal}body.sh-on .pj-card .pj-bars > :nth-child(n+3):not(.wait){display:none}
  body.sh-on .pj-card .pj-flags .pj-tag-ai{display:none}body.sh-on #pjRoot .ct-head{flex-wrap:nowrap;gap:6px}
  body.sh-on #pjRoot .ct-head .ct-btn{padding:8px 10px !important;font-size:12.5px !important;white-space:nowrap}}
@media (max-width:640px){.pj-bar{grid-template-columns:minmax(0,6em) minmax(0,1fr) auto}.pj-mrow{grid-template-columns:6.5em minmax(0,1fr) auto}.pj-q-pr b{font-size:19px}#pjModal{padding:12px 0 0;align-items:flex-end}}
@media print{#pjDrawer,#pjModal{display:none !important}}`;
    document.head.appendChild(st);
  }
  function hosts(){
    css();
    if (!document.getElementById("pjDrawer")) { const d = document.createElement("div"); d.id = "pjDrawer"; document.body.appendChild(d); }
    if (!document.getElementById("pjModal")) { const m = document.createElement("div"); m.id = "pjModal"; document.body.appendChild(m); }
  }

  /* =====================================================================
     רשימה ראשית
     ===================================================================== */
  function visible(){ return list().filter(p => p && (String(p.name || "").trim() || String(p.desc || "").trim() || (p.quotes || []).some(qReal))); }
  function filtered(){
    const q = norm(U.q);
    let L = visible().filter(p => {
      if (U.view === "active" && isArch(p)) return false;
      if (U.view === "arch" && !isArch(p)) return false;
      if (["פתוח", "בבדיקה", "בביצוע"].includes(U.view) && p.status !== U.view) return false;
      if (U.cat && (p.category || "") !== U.cat) return false;
      if (q){ const hay = norm([p.name, p.category, p.desc, p.location].concat((p.quotes || []).map(x => x && x.vendor)).join(" ")); if (!hay.includes(q)) return false; }
      return true;
    });
    const by = {
      recent: (a, b) => lastActivity(b).localeCompare(lastActivity(a)),
      due: (a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
      name: (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "he"),
      budget: (a, b) => num(b.budget) - num(a.budget)
    };
    L.sort(by[U.sort] || by.recent);
    return L;
  }
  /* אותו מרווח מעקב כמו בהודעות לאנשי מקצוע (נוסח קבוע → "לא חזרו אליך") */
  function followDays(){ try { return proMsgCfg().followDays || 3; } catch (e) { return 3; } } // eslint-disable-line no-undef
  function alerts(){
    const A = [];
    visible().forEach(p => {
      if (isArch(p)) return;
      const c = calc(p);
      c.pending.forEach(q => { const n = daysSince(q.requestedAt); if (n !== null && n >= followDays()) A.push({ lvl: 2, tone: "w", ico: "clock", t: `${q.vendor || "ספק"} עוד לא שלח הצעה`, s: `${p.name || "פרויקט"} · נשלחה בקשה לפני ${n} ימים`, act: "nudge", id: p.id, q: q.id, btn: "תזכורת" }); });
      c.expiring.forEach(q => { const n = daysTo(q.validUntil); A.push({ lvl: n < 0 ? 2 : 3, tone: n < 0 ? "d" : "w", ico: "cal", t: `הצעה של ${q.vendor || "ספק"} ${n < 0 ? "פגה" : n === 0 ? "פגה היום" : "פגה בעוד " + n + " ימים"}`, s: p.name || "פרויקט", act: "open", id: p.id, tab: "quotes", btn: "פתיחה" }); });
      const due = daysTo(p.dueDate);
      if (due !== null && due < 0) A.push({ lvl: 2, tone: "d", ico: "cal", t: `${p.name || "פרויקט"} – היעד עבר`, s: `יעד: ${fdate(p.dueDate)} · ${stage(p).l}`, act: "open", id: p.id, btn: "פתיחה" });
      if (p.status === "פתוח" && c.recv.length >= 2 && !c.waiting.length) A.push({ lvl: 3, tone: "i", ico: "check", t: `${p.name || "פרויקט"}: התקבלו ${c.recv.length} הצעות`, s: "אפשר לעבור להשוואה ולבחור", act: "stage", id: p.id, v: "בבדיקה", btn: "להשוואה" });
      if (p.status === "בביצוע" && isAdmin() && !costs(p).tasks.length) A.push({ lvl: 3, tone: "i", ico: "task", t: `${p.name || "פרויקט"} בביצוע בלי משימה`, s: "משימה מאפשרת לשלוח לספק, לעקוב ולשייך חשבונית", act: "open", id: p.id, tab: "exec", btn: "פתיחה" });
    });
    A.sort((a, b) => a.lvl - b.lvl);
    return A;
  }

  function render(){
    hosts();
    JOBS = null;
    const root = document.getElementById("pjRoot");
    if (!root) return;
    const all = visible();
    const act = all.filter(p => !isArch(p));
    const cnt = v => all.filter(p => p.status === v).length;
    const waitingQ = act.reduce((a, p) => a + calc(p).pending.length, 0);
    const chosenSum = act.reduce((a, p) => { const c = calc(p).chosen; return a + (c ? qGross(c) : 0); }, 0);
    const budgetSum = act.reduce((a, p) => a + num(p.budget), 0);
    const yearStart = (() => { try { return currentSchoolYearStart() + "-09-01"; } catch (e) { return ""; } })(); // eslint-disable-line no-undef
    const yearL = all.filter(p => p.status !== "בוטל" && (!isArch(p) || lastActivity(p) >= yearStart));
    const spent = isAdmin() ? yearL.reduce((a, p) => a + costs(p).spent, 0) : 0;
    const paidAll = isAdmin() ? yearL.reduce((a, p) => a + costs(p).paid, 0) : 0;
    const A = alerts();
    const ed = canEdit();

    const head = `<div class="ct-head"><div class="ct-head-t"><h1 class="ct-h1">פרויקטים והצעות מחיר</h1><div class="ct-sub">מבקשים הצעות, משווים, בוחרים ועוקבים עד הביצוע והתשלום</div></div>
      <div class="ct-head-a">
        ${ed ? `<button type="button" class="ct-btn pri" data-pj="new">${ic("plus", 17)}פרויקט חדש</button>` : ""}
        ${ed && isAdmin() && window.aiRead ? `<button type="button" class="ct-btn" data-pj="ai-file">${ic("spark", 17)}הצעה מקובץ (AI)</button>` : ""}
      </div></div>`;

    const kpis = `<div class="ct-kpis">
      <div class="ct-kpi"><span class="l">פרויקטים פעילים</span><span class="v">${act.length}</span><span class="s">${[cnt("פתוח") && cnt("פתוח") + " באיסוף", cnt("בבדיקה") && cnt("בבדיקה") + " בהחלטה", cnt("בביצוע") && cnt("בביצוע") + " בביצוע"].filter(Boolean).join(" · ") || "אין פרויקטים פתוחים"}</span></div>
      <div class="ct-kpi ${waitingQ ? "bad" : "ok"}"><span class="l">ממתינים להצעות</span><span class="v">${waitingQ}</span><span class="s">${waitingQ ? "ספקים שעוד לא שלחו מחיר" : "כל הבקשות נענו"}</span></div>
      <div class="ct-kpi idle"><span class="l">הצעות שנבחרו (פעילים)</span><span class="v ${chosenSum >= 100000 ? "sm" : ""}">${money(chosenSum)}</span><span class="s">${budgetSum ? "מול תקציב " + money(budgetSum) : "לא הוגדר תקציב"}</span></div>
      ${isAdmin() ? `<div class="ct-kpi ok"><span class="l">הוצאה בפועל השנה</span><span class="v ${spent >= 100000 ? "sm" : ""}">${money(spent)}</span><span class="s">מחשבוניות שמשויכות · שולם ${money(paidAll)}</span></div>` : ""}
    </div>`;

    const shown = U.allAlerts ? A : A.slice(0, 4);
    const alertsHtml = A.length ? `<section class="ct-sec"><div class="ct-sec-h"><h2 class="ct-h2">דורש תשומת לב</h2><span>${A.length} פריטים</span></div>
      <div class="ct-alerts">${shown.map(a => `<div class="ct-alert"><span class="ic ${a.tone}">${ic(a.ico, 18)}</span><div class="tx">${esc(a.t)}<small>${esc(a.s)}</small></div>
        <div class="ct-alert-a"><button type="button" class="ct-act" data-pj="${a.act}" data-id="${a.id}" ${a.q ? `data-q="${a.q}"` : ""} ${a.tab ? `data-tab="${a.tab}"` : ""} ${a.v ? `data-v="${esc(a.v)}"` : ""}>${esc(a.btn)}</button></div></div>`).join("")}</div>
      ${A.length > 4 ? `<button type="button" class="ct-more" data-pj="more-alerts">${U.allAlerts ? "פחות" : "עוד " + (A.length - 4)}</button>` : ""}</section>` : "";

    const segs = [["active", "פעילים", act.length], ["פתוח", "איסוף הצעות", cnt("פתוח")], ["בבדיקה", "החלטה", cnt("בבדיקה")], ["בביצוע", "ביצוע", cnt("בביצוע")], ["arch", "ארכיון", all.length - act.length]];
    const cats = [...new Set(all.map(p => p.category).filter(Boolean))];
    const bar = `<div class="ct-bar"><div class="ct-bar-r">
        <label class="ct-srch">${ic("search", 17)}<input type="search" id="pjSearch" placeholder="חיפוש פרויקט, ספק או מיקום" value="${esc(U.q)}" autocomplete="off" aria-label="חיפוש"></label>
        <div class="ct-seg" role="tablist">${segs.map(s => `<button type="button" class="${U.view === s[0] ? "on" : ""}" data-pj="view" data-v="${esc(s[0])}">${s[1]} <span class="cnt">${s[2]}</span></button>`).join("")}</div>
        <span class="ct-flex"></span>
        <label class="ct-sort">מיון<select id="pjSort">${[["recent", "פעילות אחרונה"], ["due", "יעד קרוב"], ["budget", "תקציב"], ["name", "שם"]].map(o => `<option value="${o[0]}" ${U.sort === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></label>
      </div>
      ${cats.length > 1 ? `<div class="ct-chips"><button type="button" class="ct-chip sm ${!U.cat ? "on" : ""}" data-pj="cat" data-v="">הכל</button>${cats.map(c => `<button type="button" class="ct-chip sm ${U.cat === c ? "on" : ""}" data-pj="cat" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
    </div>`;

    const L = filtered();
    let body;
    if (!all.length) body = `<div class="ct-empty">${ic("folder", 34)}<b>עוד אין פרויקטים</b><span>פרויקט הוא כל דבר שצריך עליו הצעות מחיר: שיפוץ, מזגן חדש, ריהוט. פותחים, שולחים בקשה לכמה ספקים, וההשוואה נבנית לבד.</span>
      ${ed ? `<div class="pj-empty-cta"><button type="button" class="ct-btn pri" data-pj="new">${ic("plus", 17)}פרויקט ראשון</button>${isAdmin() && window.aiRead ? `<button type="button" class="ct-btn" data-pj="ai-file">${ic("spark", 17)}יש לי כבר הצעה בקובץ</button>` : ""}</div>` : ""}</div>`;
    else if (!L.length) body = `<div class="ct-empty"><b>לא נמצאו פרויקטים</b><span>אפשר לשנות את החיפוש או לבחור "ארכיון".</span></div>`;
    else body = `<div class="ct-count">${L.length === 1 ? "פרויקט אחד" : L.length + " פרויקטים"}</div><div class="ct-grid">${L.map(cardHtml).join("")}</div>`;

    root.innerHTML = head + kpis + alertsHtml + `<section class="ct-sec">${bar}<div>${body}</div></section>`;
    if (U.openId != null) renderDrawer();
  }

  function stVars(p){ const s = stage(p); return `--sc:${s.c};--sbg:${s.bg};--sfg:${s.fg}`; }
  function stPill(p){ return `<span class="pj-st" style="${stVars(p)}">${esc(stage(p).l)}</span>`; }
  function steps(p){ const i = stageIdx(p); return p.status === "בוטל" ? "" : `<div class="pj-steps" style="${stVars(p)}" aria-hidden="true">${[0, 1, 2, 3].map(k => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>`; }
  function barsHtml(p, c, limit){
    const items = c.recv.slice().sort((a, b) => qGross(a) - qGross(b)).slice(0, limit || 4);
    const waits = c.waiting.slice(0, Math.max(0, (limit || 4) - items.length));
    if (!items.length && !waits.length) return `<div class="ct-soft" style="font-size:13px">${p.status === "בוטל" ? "" : "עוד אין הצעות מחיר"}</div>`;
    const max = c.max || 1;
    return `<div class="pj-bars">${items.map(q => {
      const best = c.recv.length > 1 && qGross(q) === c.min, pick = c.chosen && c.chosen.id === q.id;
      return `<div class="pj-bar ${pick ? "pick" : best ? "best" : ""}"><span class="n">${pick ? "✓ " : ""}${esc(q.vendor || "ספק")}</span><span class="t"><span style="width:${Math.max(6, Math.round(qGross(q) / max * 100))}%"></span></span><span class="v">${money(qGross(q))}</span></div>`; }).join("")}
      ${waits.map(q => `<div class="pj-bar wait"><span class="n">${esc(q.vendor || "ספק")}</span><span class="t"></span><span class="v">ממתין${daysSince(q.requestedAt) ? " · " + daysSince(q.requestedAt) + " ימ׳" : ""}</span></div>`).join("")}
      ${c.recv.length + c.waiting.length > items.length + waits.length ? `<div class="ct-soft" style="font-size:12px">ועוד ${c.recv.length + c.waiting.length - items.length - waits.length}</div>` : ""}</div>`;
  }
  function cardHtml(p, i){
    const c = calc(p);
    const due = daysTo(p.dueDate);
    const flags = [
      c.chosen ? `<span class="ct-tag ok">${ic("trophy", 12)}נבחר: ${esc(c.chosen.vendor || "ספק")}</span>` : "",
      c.expiring.length ? `<span class="ct-tag warn">${ic("cal", 12)}${c.expiring.length === 1 ? "הצעה פגה בקרוב" : c.expiring.length + " הצעות פגות בקרוב"}</span>` : "",
      due !== null && !isArch(p) ? `<span class="ct-tag ${due < 0 ? "warn" : "both"}">${ic("cal", 12)}${due < 0 ? "היעד עבר" : "יעד " + sdate(p.dueDate)}</span>` : "",
      p.ai && p.ai.data ? `<span class="pj-tag-ai">${ic("spark", 12)}נותח</span>` : ""
    ].filter(Boolean).join("");
    const cs = isAdmin() ? costs(p) : null;
    const m3 = cs && (cs.spent || p.status === "בביצוע" || p.status === "הושלם")
      ? `<div><b>${money(cs.spent)}</b><span>הוצא בפועל</span></div>`
      : `<div><b>${c.recv.length}${c.waiting.length ? "+" + c.waiting.length : ""}</b><span>${c.waiting.length ? "הצעות + ממתינות" : "הצעות"}</span></div>`;
    return `<article class="ct-card pj-card ${isArch(p) ? "arch" : ""}" style="${stVars(p)};animation-delay:${Math.min(i, 10) * 0.03}s">
      <button type="button" class="ct-hit" data-pj="open" data-id="${p.id}" aria-label="פתיחת ${esc(p.name || "פרויקט")}"></button>
      <div class="ct-card-top"><span class="pj-ic">${ic(catIco(p.category), 22)}</span>
        <div class="ct-card-t"><div class="nm">${esc(p.name || "פרויקט ללא שם")}</div><div class="sp">${esc([p.category, p.location].filter(Boolean).join(" · ") || "ללא קטגוריה")}</div></div>
        ${stPill(p)}</div>
      ${steps(p)}
      ${barsHtml(p, c, 3)}
      ${flags ? `<div class="pj-flags">${flags}</div>` : ""}
      <div class="ct-mets"><div><b>${num(p.budget) ? money(p.budget) : "—"}</b><span>תקציב</span></div><div><b>${c.chosen ? money(qGross(c.chosen)) : c.min ? money(c.min) : "—"}</b><span>${c.chosen ? "ההצעה שנבחרה" : "ההצעה הזולה"}</span></div>${m3}</div>
    </article>`;
  }

  /* =====================================================================
     מגירת פרויקט
     ===================================================================== */
  function open(id, tab){
    hosts();
    U.openId = id; U.tab = tab || "over";
    document.body.classList.add("ct-lock");
    renderDrawer(true);
  }
  function closeDrawer(){
    U.openId = null;
    const d = document.getElementById("pjDrawer"); if (d) { d.classList.remove("show"); d.innerHTML = ""; }
    const m = document.getElementById("pjModal");
    if (!m || !m.classList.contains("show")) document.body.classList.remove("ct-lock");
  }
  function renderDrawer(fresh){
    const dr = document.getElementById("pjDrawer");
    const p = getP(U.openId);
    if (!dr) return;
    if (!p) { closeDrawer(); return; }
    const oldB = dr.querySelector(".ct-dr-b"); const scroll = !fresh && oldB ? oldB.scrollTop : 0;
    const c = calc(p), ed = canEdit();
    const tabs = [["over", "סקירה"], ["quotes", `הצעות מחיר (${c.quotes.length})`], ["exec", "ביצוע ועלויות"], ["log", "יומן"]];
    let b = "";
    if (U.tab === "quotes") b = quotesTab(p, c, ed);
    else if (U.tab === "exec") b = execTab(p, c, ed);
    else if (U.tab === "log") b = logTab(p, ed);
    else b = overTab(p, c, ed);
    const stepper = `<div class="ct-seg" role="radiogroup" aria-label="שלב" style="align-self:flex-start">${STAGES.slice(0, 4).map(s => `<button type="button" role="radio" aria-checked="${p.status === s.v}" class="${p.status === s.v ? "on" : ""}" ${ed ? `data-pj="stage" data-id="${p.id}" data-v="${s.v}"` : "disabled"} style="min-height:34px;padding:0 11px;font-size:12.5px"><span style="width:8px;height:8px;border-radius:50%;background:${s.c};display:inline-block"></span>${s.l}</button>`).join("")}</div>`;
    dr.innerHTML = `<button type="button" class="ct-ov" data-pj="close" aria-label="סגירה"></button>
      <aside class="ct-dr" role="dialog" aria-modal="true" aria-label="${esc(p.name || "פרויקט")}">
        <div class="ct-dr-h" style="background:${stage(p).bg}55">
          <div class="ct-dr-top"><span class="pj-ic" style="${stVars(p)}">${ic(catIco(p.category), 22)}</span>
            <div class="t"><h2 class="ct-h2 big">${esc(p.name || "פרויקט ללא שם")}</h2>${esc([p.category, p.location].filter(Boolean).join(" · "))}${p.status === "בוטל" ? " · בוטל" : ""}</div>
            <button type="button" class="ct-x big" data-pj="close" aria-label="סגירה">${ic("x", 20)}</button></div>
          ${p.status === "בוטל" ? "" : stepper}
          ${ed ? `<div class="ct-acts wide">
            <button type="button" class="ab m" data-pj="request" data-id="${p.id}">${ic("send", 16)}בקשת הצעות</button>
            <button type="button" class="ab c" data-pj="q-new" data-id="${p.id}">${ic("plus", 16)}הצעה</button>
            ${isAdmin() && window.aiRead ? `<button type="button" class="ab x" style="flex:0 0 auto;padding:0 12px" data-pj="q-files" data-id="${p.id}" title="העלאת קבצי הצעה – הסוכן קורא אותם">${ic("spark", 16)}AI</button>` : ""}
            <button type="button" class="ab x" data-pj="edit" data-id="${p.id}" aria-label="עריכת הפרויקט">${ic("edit", 16)}</button>
          </div>` : ""}
        </div>
        <div class="ct-tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" class="${U.tab === t[0] ? "on" : ""}" data-pj="tab" data-v="${t[0]}">${t[1]}</button>`).join("")}</div>
        <div class="ct-dr-b">${b}</div>
      </aside>`;
    dr.classList.add("show");
    const nb = dr.querySelector(".ct-dr-b"); if (nb) nb.scrollTop = scroll;
  }

  function kv(l, v){ return v ? `<div class="ct-kv"><span>${l}</span><b>${v}</b></div>` : ""; }
  function overTab(p, c, ed){
    const cs = isAdmin() ? costs(p) : null;
    const sorted = c.recv.slice().sort((a, b) => qGross(a) - qGross(b));
    const details = `<div class="ct-box"><h4>פרטי הפרויקט</h4>
      ${kv("קטגוריה", esc(p.category || "—"))}${kv("מיקום בבניין", esc(p.location || ""))}
      ${kv("תקציב", num(p.budget) ? money(p.budget) : "")}${kv("יעד לביצוע", p.dueDate ? fdate(p.dueDate) + (daysTo(p.dueDate) < 0 && !isArch(p) ? " · עבר" : "") : "")}
      ${kv("נפתח", fdate(p.created))}
      ${p.desc ? `<div class="ct-note-fixed">${esc(p.desc)}</div>` : ed ? `<button type="button" class="ct-lnk" style="align-self:flex-start" data-pj="edit" data-id="${p.id}">הוספת תיאור – מה צריך לבצע (נכנס גם לבקשת ההצעה)</button>` : ""}
    </div>`;
    const qs = `<div class="ct-box"><h4>מצב ההצעות</h4>
      ${c.quotes.length ? barsHtml(p, c, 6) : `<div class="ct-soft">עוד אין הצעות. הדרך הכי מהירה: "בקשת הצעות" – בוחרים ספקים מאנשי הקשר ושולחים בוואטסאפ.</div>`}
      <div class="ct-row-btns">
        ${c.quotes.length ? `<button type="button" class="ct-btn" data-pj="tab" data-v="quotes">${ic("doc", 16)}להשוואה המלאה</button>` : ""}
        ${ed && !c.quotes.length ? `<button type="button" class="ct-btn pri" data-pj="request" data-id="${p.id}">${ic("send", 16)}בקשת הצעות מספקים</button>` : ""}
        ${c.recv.length ? `<button type="button" class="ct-btn" data-pj="pdf" data-id="${p.id}">${ic("printer", 16)}סיכום להדפסה / PDF</button>` : ""}
      </div></div>`;
    let money3 = "";
    if (cs && (num(p.budget) || c.chosen || cs.spent)) money3 = `<div class="ct-box"><h4>כסף במבט אחד</h4>${moneyBars(p, c, cs)}</div>`;
    return details + aiBox(p, c, ed) + qs + money3 +
      (sorted.length >= 2 && !c.chosen && ed ? `<div class="pj-hint">כשמחליטים – ב"הצעות מחיר" לוחצים "בחירה בהצעה". אפשר לפתוח באותו רגע משימה לביצוע אצל הספק.</div>` : "");
  }
  function moneyBars(p, c, cs){
    const rows = [["תקציב", num(p.budget), "#c9b9a3"], ["ההצעה שנבחרה", c.chosen ? qGross(c.chosen) : 0, "#2f74d0"], ["הוצא בפועל", cs.spent, "#c67139"], ["שולם", cs.paid, "#5f7f3a"]].filter(r => r[1] > 0 || r[0] === "הוצא בפועל");
    const max = Math.max(1, ...rows.map(r => r[1]));
    const over = num(p.budget) && cs.spent > num(p.budget);
    return `<div class="pj-money">${rows.map(r => `<div class="pj-mrow"><span>${r[0]}</span><span class="t"><span style="width:${Math.max(r[1] ? 4 : 0, Math.round(r[1] / max * 100))}%;background:${r[2]}"></span></span><b>${money(r[1])}</b></div>`).join("")}</div>
      ${over ? `<div class="ct-tag warn" style="align-self:flex-start">${ic("alert", 12)}חריגה מהתקציב ב-${money(cs.spent - num(p.budget))}</div>` : ""}
      ${c.chosen && cs.spent > qGross(c.chosen) * 1.02 ? `<div class="ct-soft">שולם/חויב יותר מההצעה שנבחרה ב-${money(cs.spent - qGross(c.chosen))}. כדאי לבדוק תוספות.</div>` : ""}`;
  }
  function aiBox(p, c, ed){
    if (!isAdmin() || !window.aiCall) return "";
    const a = p.ai && p.ai.data;
    if (U.aiBusy === p.id) return `<div class="ct-box pj-ai"><h4>ניתוח AI של ההצעות</h4><div class="ct-soft">${ic("spark", 15)} הסוכן קורא את ההצעות ומשווה… (כ-20 שניות)</div></div>`;
    if (!a) {
      if (c.recv.length < 1) return "";
      return `<div class="ct-box pj-ai"><h4>ניתוח AI של ההצעות</h4><div class="ct-soft">הסוכן משווה מה כלול בכל הצעה, מה חסר, מע"מ, תוקף והיסטוריית הספק אצלך – וממליץ, עם שאלות לשלוח לספקים לפני שמחליטים.</div>
        ${ed ? `<button type="button" class="ct-btn pri" style="align-self:flex-start;background:#6c4fd8;border-color:#6c4fd8" data-pj="ai-compare" data-id="${p.id}">${ic("spark", 16)}${c.recv.length === 1 ? "ניתוח ההצעה" : "השוואה וניתוח " + c.recv.length + " הצעות"}</button>` : ""}</div>`;
    }
    const stale = (p.quotes || []).filter(qReal).length !== (p.ai.n || 0) || (p.ai.sig && p.ai.sig !== aiSig(p));
    const per = Array.isArray(a.quotes) ? a.quotes : [];
    const qs = Array.isArray(a.questions) ? a.questions : [];
    return `<div class="ct-box pj-ai"><h4>ניתוח AI · ${fdate(p.ai.at)}</h4>
      ${a.summary ? `<div style="font-size:14px;line-height:1.55">${esc(a.summary)}</div>` : ""}
      ${a.recommendation && a.recommendation.vendor ? `<div class="pj-rec"><b>המלצה: ${esc(a.recommendation.vendor)}</b><br>${esc(a.recommendation.reason || "")}</div>` : ""}
      ${(a.warnings || []).length ? `<div><b style="font-size:13px">שים לב</b><ul>${a.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
      ${per.length ? `<details class="pj-items"><summary>פירוט לכל ספק (${per.length})</summary>${per.map(x => `<div style="display:block"><b>${esc(x.vendor || "")}</b>${x.price_with_vat ? " · " + money(x.price_with_vat) + " כולל מע\"מ" : ""}
          ${(x.includes || []).length ? `<div style="border:0;padding:2px 0;display:block;font-size:12.5px"><span style="color:#3f4a2c">כלול:</span> ${esc(x.includes.join(" · "))}</div>` : ""}
          ${(x.missing_or_unclear || []).length ? `<div style="border:0;padding:2px 0;display:block;font-size:12.5px"><span style="color:#8c491a">חסר / לא ברור:</span> ${esc(x.missing_or_unclear.join(" · "))}</div>` : ""}
          ${(x.pros || []).length ? `<div style="border:0;padding:2px 0;display:block;font-size:12.5px">👍 ${esc(x.pros.join(" · "))}</div>` : ""}
          ${(x.cons || []).length ? `<div style="border:0;padding:2px 0;display:block;font-size:12.5px">👎 ${esc(x.cons.join(" · "))}</div>` : ""}</div>`).join("")}</details>` : ""}
      ${qs.length ? `<div><b style="font-size:13px">שאלות לספקים לפני החלטה</b>${qs.map((x, i) => `<div class="pj-ask"><div>${esc(x.question || "")}<small>${esc(x.vendor || "")}</small></div>${ed && x.vendor ? `<button type="button" class="ct-act" data-pj="ask" data-id="${p.id}" data-i="${i}">${ic("wa", 14)}שאל</button>` : ""}</div>`).join("")}</div>` : ""}
      ${a.next_step ? `<div class="ct-soft"><b>הצעד הבא:</b> ${esc(a.next_step)}</div>` : ""}
      ${ed ? `<button type="button" class="ct-lnk" style="align-self:flex-start" data-pj="ai-compare" data-id="${p.id}">${stale ? "ההצעות השתנו מאז – ניתוח מחדש" : "ניתוח מחדש"}</button>` : ""}
      <div class="pj-hint">הניתוח הוא עזרה בלבד. ההחלטה ובדיקת המסמכים – שלך.</div></div>`;
  }

  function quotesTab(p, c, ed){
    const qs = c.quotes.slice().sort((a, b) => {
      const ka = a.declined ? 3 : qWaiting(a) ? 2 : 1, kb = b.declined ? 3 : qWaiting(b) ? 2 : 1;
      return (ka - kb) || (qGross(a) - qGross(b));
    });
    /* הוספה ובקשת הצעות נמצאות בראש המגירה – כאן רק מה שייחודי להשוואה */
    const top = c.recv.length ? `<div class="ct-row-btns" style="align-items:center"><span class="ct-soft" style="flex:1">${c.recv.length > 1 ? `${c.recv.length} הצעות · פער ${money(c.max - c.min)} בין הזולה ליקרה` : "הצעה אחת עם מחיר"}</span>
      <button type="button" class="ct-btn" data-pj="pdf" data-id="${p.id}">${ic("printer", 16)}PDF להשוואה</button></div>` : "";
    if (!qs.length) return top + `<div class="ct-empty"><b>עוד אין הצעות</b><span>מוסיפים ידנית, מעלים קובץ (הסוכן ימלא את הפרטים), או שולחים בקשה לספקים – וכל ספק שנשלחה אליו בקשה מופיע כאן כ"ממתין".</span></div>`;
    const vatNote = c.recv.some(q => q.vat === "ex") ? `<div class="pj-hint">הצעות "לפני מע"מ" מוצגות כאן כבר עם מע"מ (${Math.round(VAT() * 100)}%), כדי שההשוואה תהיה הוגנת. המחיר המקורי כתוב מתחת.</div>` : "";
    const thanks = c.chosen && c.recv.length > 1 && ed ? `<button type="button" class="ct-lnk" style="align-self:flex-start" data-pj="thanks" data-id="${p.id}">הודעת תודה לספקים שלא נבחרו</button>` : "";
    return top + vatNote + `<div class="pj-qs">${qs.map(q => quoteCard(p, c, q, ed)).join("")}</div>` + thanks;
  }
  function contactOf(name){ try { return name ? findContactByName(name) || (D().contacts || []).find(x => x && norm(x.name) === norm(name)) : null; } catch (e) { return null; } } // eslint-disable-line no-undef
  function quoteCard(p, c, q, ed){
    const g = qGross(q), wait = qWaiting(q), pick = c.chosen && c.chosen.id === q.id, best = !wait && !q.declined && c.recv.length > 1 && g === c.min;
    const ct = contactOf(q.vendor);
    const diff = !wait && !q.declined && c.recv.length > 1 && g > c.min ? `<span class="pj-diff">+${money(g - c.min)} (${Math.round((g - c.min) / c.min * 100)}%) מהזולה</span>` : best ? `<span class="pj-diff ok">ההצעה הזולה</span>` : "";
    const vn = Math.round(daysTo(q.validUntil));
    const chips = [
      q.date ? `<span class="ct-pill">${ic("cal", 11)} ${fdate(q.date)}</span>` : "",
      q.validUntil ? `<span class="ct-tag ${vn < 0 ? "warn" : vn <= 7 ? "warn" : "both"}">${vn < 0 ? "פגה ב-" : "בתוקף עד "}${fdate(q.validUntil)}</span>` : "",
      q.aiCheck ? `<span class="pj-tag-ai">${ic("spark", 11)}מולא ע״י הסוכן – לבדיקה</span>` : "",
      q.declined ? `<span class="ct-tag both">הספק לא מגיש</span>` : ""
    ].filter(Boolean).join("");
    const items = Array.isArray(q.items) && q.items.length ? `<details class="pj-items"><summary>${q.items.length} סעיפים בהצעה</summary>${q.items.map(x => `<div><span>${esc(x.text || "")}</span><b>${num(x.amount) ? money(x.amount) : ""}</b></div>`).join("")}</details>` : "";
    const acts = [];
    if (q.fileUrl) acts.push(`<button type="button" class="ab m" data-pj="q-file" data-id="${p.id}" data-q="${q.id}">${ic("doc", 15)}הקובץ</button>`);
    if (ed && wait) acts.push(`<button type="button" class="ab pri" data-pj="q-edit" data-id="${p.id}" data-q="${q.id}">${ic("coin", 15)}הזנת המחיר</button>`, `<button type="button" class="ab w" data-pj="nudge" data-id="${p.id}" data-q="${q.id}">${ic("wa", 15)}תזכורת</button>`);
    if (ed && !wait && !q.declined && !pick && p.status !== "בוטל") acts.push(`<button type="button" class="ab pri" data-pj="choose" data-id="${p.id}" data-q="${q.id}">${ic("trophy", 15)}בחירה בהצעה</button>`);
    if (ed && pick) acts.push(`<button type="button" class="ab x" style="flex:0 1 auto;padding:0 12px" data-pj="unchoose" data-id="${p.id}">ביטול הבחירה</button>`);
    if (ct && !wait) acts.push(`<button type="button" class="ab w" data-pj="wa" data-id="${p.id}" data-q="${q.id}" aria-label="וואטסאפ ל${esc(q.vendor)}">${ic("wa", 15)}</button>`);
    if (ed) acts.push(`<button type="button" class="ab x" data-pj="q-edit" data-id="${p.id}" data-q="${q.id}" aria-label="עריכת ההצעה">${ic("edit", 15)}</button>`);
    return `<div class="pj-q ${pick ? "pick" : best ? "best" : ""} ${wait ? "wait" : ""} ${q.declined ? "dec" : ""}">
      <div class="pj-q-top">
        <span class="ct-av ${ct ? (ct.contactType === "ספק" ? "sup" : ct.contactType === "שניהם" ? "both" : "pro") : "both"}" style="width:40px;height:40px;font-size:14px">${esc((typeof ctInitials === "function" ? ctInitials(q.vendor) : String(q.vendor || "?").charAt(0)))}</span>
        <div class="t"><div class="nm">${esc(q.vendor || "ספק ללא שם")}${pick ? `<span class="ct-tag ok">${ic("trophy", 12)}נבחרה</span>` : ""}</div>
          <div class="sb">${ct ? `${typeof ctStars === "function" && ct.rating ? ctStars(ct.rating, 12) + " · " : ""}${esc(ct.specialty || "")}` : "לא באנשי הקשר"}</div></div>
        <div class="pj-q-pr">${wait ? `<b style="font-size:15px;color:#8c491a">ממתין</b><small>נשלחה בקשה ${q.requestedAt ? "ב-" + sdate(q.requestedAt) + (daysSince(q.requestedAt) ? " (לפני " + daysSince(q.requestedAt) + " ימים)" : "") : ""}</small>`
          : q.declined ? `<b style="font-size:15px">—</b>` : `<b>${money(g)}</b><small>${q.vat === "ex" ? `${money(qPrice(q))} + מע"מ` : q.vat === "inc" ? "כולל מע\"מ" : "מע\"מ לא צוין"}</small>`}</div>
      </div>
      ${diff}
      ${chips ? `<div class="pj-flags">${chips}</div>` : ""}
      ${q.subject ? `<div class="ct-soft">${esc(q.subject)}</div>` : ""}
      ${q.notes ? `<div class="ct-note-fixed">${esc(q.notes)}</div>` : ""}
      ${items}
      ${acts.length ? `<div class="pj-qa ct-acts">${acts.join("")}</div>` : ""}
    </div>`;
  }

  function execTab(p, c, ed){
    if (!isAdmin()) return `<div class="ct-box"><h4>ביצוע</h4>${c.chosen ? kv("ספק שנבחר", esc(c.chosen.vendor || "")) + kv("סכום ההצעה", money(qGross(c.chosen))) : `<div class="ct-soft">עוד לא נבחרה הצעה.</div>`}</div>`;
    const cs = costs(p);
    const chosen = c.chosen ? `<div class="ct-box"><h4>ההצעה שנבחרה</h4>${kv("ספק", esc(c.chosen.vendor || ""))}${kv("סכום", money(qGross(c.chosen)) + (c.chosen.vat === "ex" ? " (כולל מע\"מ)" : ""))}${kv("נבחרה ב", fdate(p.chosenAt))}</div>`
      : `<div class="ct-box"><h4>ההצעה שנבחרה</h4><div class="ct-soft">עוד לא נבחרה הצעה. בוחרים בטאב "הצעות מחיר".</div></div>`;
    const tasksHtml = `<div class="ct-box"><h4>משימות ביצוע</h4>
      ${cs.tasks.length ? cs.tasks.map(t => { const st = (() => { try { return tkStatus(t); } catch (e) { return t.status || ""; } })(); // eslint-disable-line no-undef
        return `<button type="button" class="ct-tl" data-pj="task" data-v="${t.id}"><span class="dot t">${ic("task", 15)}</span><span class="tx">${esc(t.desc || "משימה")}<small>${esc([(() => { try { return taskCodeDisplay(t); } catch (e) { return ""; } })(), st, t.assignee].filter(Boolean).join(" · "))}</small></span></button>`; }).join("") // eslint-disable-line no-undef
        : `<div class="ct-soft">עוד אין משימה. משימה מאפשרת לשלוח לספק בוואטסאפ, לעקוב, לצלם לפני/אחרי ולשייך חשבונית.</div>`}
      ${ed && canTab("tasks") ? `<div class="ct-row-btns"><button type="button" class="ct-btn ${cs.tasks.length ? "" : "pri"}" data-pj="task-new" data-id="${p.id}">${ic("plus", 16)}משימה חדשה${c.chosen ? " ל" + esc(c.chosen.vendor || "") : ""}</button><button type="button" class="ct-btn" data-pj="task-link" data-id="${p.id}">${ic("link", 16)}קישור משימה קיימת</button></div>` : ""}</div>`;
    const jobsHtml = `<div class="ct-box"><h4>חשבוניות ותשלומים</h4>
      ${cs.jobs.length ? cs.jobs.map(j => { let st = { text: "" }; try { st = jobStatus(j); } catch (e) {} // eslint-disable-line no-undef
        return `<button type="button" class="ct-tl" data-pj="job" data-v="${esc(j.pro || j.title || "")}"><span class="dot f">${ic("coin", 15)}</span><span class="tx">${esc(j.title || "")}<small>${esc([j.pro, j.amount ? money(j.amount) : j.noCharge ? "ללא תשלום" : "ללא סכום", st.text].filter(Boolean).join(" · "))}</small></span></button>`; }).join("")
        : `<div class="ct-soft">עוד אין חשבוניות. חשבונית שמשויכת למשימה של הפרויקט נכנסת לכאן לבד, וממשיכה כרגיל לדוח למנהל החשבונות. רכישה בלי משימה – בוחרים את הפרויקט בחלון השיוך בחשבוניות וקבלות.</div>`}
      ${ed ? `<button type="button" class="ct-lnk" style="align-self:flex-start" data-pj="pay-link" data-id="${p.id}">קישור תשלום קיים לפרויקט</button>` : ""}
      ${cs.jobs.length ? `<div style="border-top:1px solid rgba(32,30,29,.1);padding-top:8px">${moneyBars(p, c, cs)}</div>` : ""}</div>`;
    const done = ed && p.status === "בביצוע" ? `<button type="button" class="ct-btn" style="align-self:flex-start" data-pj="stage" data-id="${p.id}" data-v="הושלם">${ic("check", 16)}סימון הפרויקט כהושלם</button>` : "";
    return chosen + tasksHtml + jobsHtml + done;
  }
  function logTab(p, ed){
    const L = (p.log || []).slice().reverse();
    return `${ed ? `<form class="ct-addnote" data-pj-form="note"><input type="text" id="pjNote" placeholder="הערה, שיחה עם ספק, החלטה…" aria-label="הערה חדשה"><button type="submit" class="ct-btn">הוספה</button></form>` : ""}
      <div class="ct-box">${L.length ? L.map(l => `<div class="ct-lognote"><div>${esc(l.t)}<span>${fdate(l.d)}</span></div></div>`).join("") : `<div class="ct-soft">כאן נרשם כל מה שקורה בפרויקט: בקשות, הצעות שהתקבלו, בחירה ושינויי שלב.</div>`}</div>`;
  }

  /* =====================================================================
     חלונות
     ===================================================================== */
  let MD = null;
  function modal(html, size){
    const m = document.getElementById("pjModal");
    m.innerHTML = `<div class="ct-modal ${size || ""}" role="dialog" aria-modal="true">${html}</div>`;
    m.classList.add("show"); document.body.classList.add("ct-lock");
    const f = m.querySelector("[autofocus]"); if (f) setTimeout(() => { try { f.focus(); } catch (e) {} }, 60);
  }
  function closeModal(){
    const m = document.getElementById("pjModal"); if (!m) return;
    m.classList.remove("show"); m.innerHTML = ""; MD = null;
    if (U.openId == null) document.body.classList.remove("ct-lock");
  }
  const mh = (title, sub) => `<div class="ct-modal-h"><div class="t"><h2 class="ct-h2">${title}</h2>${sub ? esc(sub) : ""}</div><button type="button" class="ct-x" data-pj="m-close" aria-label="סגירה">${ic("x", 18)}</button></div>`;
  const val = id => { const e = document.getElementById(id); return e ? String(e.value || "").trim() : ""; };

  /* ---------- פרויקט: חדש / עריכה ---------- */
  function editProject(id, preset){
    if (!canEdit()) return;
    const p = id != null ? getP(id) : null;
    const f = p ? p : Object.assign({ name: "", category: "שיפוץ", location: "", budget: "", dueDate: "", desc: "", status: "פתוח" }, preset || {});
    MD = { kind: "proj", id: p ? p.id : null, after: preset && preset.after };
    modal(mh(p ? "עריכת פרויקט" : "פרויקט חדש", p ? "" : "אחרי השמירה אפשר לבקש הצעות מספקים או להעלות הצעה שכבר יש לך") + `<div class="ct-modal-b">
      <label class="ct-f">שם הפרויקט *<input type="text" id="pjfName" value="${esc(f.name)}" placeholder="למשל: החלפת מזגנים בחדר האוכל" autofocus></label>
      <div class="ct-g2">
        <label class="ct-f">קטגוריה<input type="text" id="pjfCat" list="pjfCatList" value="${esc(f.category || "")}"><datalist id="pjfCatList">${allCats().map(x => `<option value="${esc(x)}"></option>`).join("")}</datalist></label>
        <label class="ct-f">מיקום בבניין<input type="text" id="pjfLoc" value="${esc(f.location || "")}" placeholder="למשל: קומה 2, חדר אוכל"></label>
      </div>
      <div class="ct-g2">
        <label class="ct-f">תקציב משוער (₪)<input type="number" id="pjfBudget" inputmode="decimal" min="0" step="any" value="${num(f.budget) || ""}" placeholder="לא חובה"></label>
        <label class="ct-f">יעד לביצוע<input type="date" id="pjfDue" value="${esc(f.dueDate || "")}"></label>
      </div>
      <label class="ct-f">מה צריך לבצע<textarea id="pjfDesc" rows="4" style="min-height:96px" placeholder="פירוט קצר. הטקסט הזה נכנס אוטומטית להודעת בקשת ההצעה לספקים">${esc(f.desc || "")}</textarea></label>
      ${p ? `<label class="ct-f">שלב<select id="pjfStatus">${STAGES.map(s => `<option value="${s.v}" ${p.status === s.v ? "selected" : ""}>${s.l}</option>`).join("")}</select></label>` : ""}
    </div><div class="ct-modal-f">
      <button type="button" class="ct-btn pri" data-pj="p-save">${p ? "שמירה" : "יצירת הפרויקט"}</button>
      <button type="button" class="ct-btn" data-pj="m-close">ביטול</button><span class="ct-flex"></span>
      ${p ? `<button type="button" class="ct-lnk red" data-pj="p-del" data-id="${p.id}">מחיקת הפרויקט</button>` : ""}
    </div>`, "sm");
  }
  function saveProject(){
    const name = val("pjfName");
    if (!name) { toast("יש לתת לפרויקט שם"); const n = document.getElementById("pjfName"); if (n) n.focus(); return; }
    let p = MD.id != null ? getP(MD.id) : null;
    const fields = { name, category: val("pjfCat") || "אחר", location: val("pjfLoc"), budget: num(val("pjfBudget")) || "", dueDate: val("pjfDue"), desc: val("pjfDesc") };
    if (p) {
      const st = val("pjfStatus") || p.status;
      Object.assign(p, fields);
      if (st !== p.status) setStage(p, st, true);
      log(p, "פרטי הפרויקט עודכנו");
    } else {
      p = Object.assign({ id: newId(14000), status: "פתוח", quotes: [], created: today(), log: [] }, fields);
      log(p, "הפרויקט נפתח");
      list().push(p);
    }
    const after = MD.after;
    save(); closeModal(); render();
    if (typeof after === "function") { after(p); return; }
    open(p.id, "over");
  }
  function deleteProject(id){
    const p = getP(id); if (!p) return;
    const linked = isAdmin() ? costs(p) : { tasks: [], jobs: [] };
    const extra = linked.tasks.length || linked.jobs.length ? ` המשימות והחשבוניות שקשורות אליו לא יימחקו – הן נשארות בטאבים שלהן.` : "";
    openConfirmModal(`למחוק את הפרויקט "${p.name || "ללא שם"}" עם ${(p.quotes || []).filter(qReal).length} ההצעות שבו? לא ניתן לשחזר.${extra}`, () => { // eslint-disable-line no-undef
      const d = D(); d.projects = list().filter(x => x !== p);
      save(); closeModal(); closeDrawer(); render(); refreshOthers();
      toast("הפרויקט נמחק");
    });
  }
  function setStage(p, v, silent){
    if (!p || !STAGES.some(s => s.v === v) || p.status === v) return;
    const from = stage(p).l;
    p.status = v;
    if (v === "הושלם") p.doneAt = today();
    log(p, `שלב: ${from} ← ${stage(p).l}`);
    if (!silent) { save(); render(); refreshOthers(); toast(`הפרויקט עבר ל"${stage(p).l}"`); }
  }

  /* ---------- הצעה: חדשה / עריכה ---------- */
  function editQuote(pid, qid, preset){
    if (!canEdit()) return;
    const p = getP(pid); if (!p) return;
    const q = qid != null ? (p.quotes || []).find(x => String(x.id) === String(qid)) : null;
    const f = q || Object.assign({ vendor: "", price: "", vat: "", date: today(), validUntil: "", notes: "", items: [], fileUrl: "" }, preset || {});
    const unc = (f.aiUnc || []).map(String);
    const u = k => unc.includes(k) ? "pj-unc" : "";
    const names = [...new Set((D().contacts || []).filter(c => c && !c.archived).map(c => c.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
    MD = { kind: "quote", pid: p.id, qid: q ? q.id : null, fileUrl: f.fileUrl || "", aiData: preset && preset.aiData };
    const items = (Array.isArray(f.items) ? f.items : []).map(x => `${x.text || ""}${num(x.amount) ? " | " + num(x.amount) : ""}`).join("\n");
    modal(mh(q ? "עריכת הצעת מחיר" : "הצעת מחיר חדשה", p.name || "") + `<div class="ct-modal-b">
      ${f.aiCheck || unc.length ? `<div class="ct-alert" style="background:#f4efff"><span class="ic i">${ic("spark", 18)}</span><div class="tx">הסוכן מילא את הפרטים מהקובץ<small>${unc.length ? "שדות בצהוב היה קשה לקרוא – כדאי לבדוק" : "כדאי לעבור במהירות ולוודא"}</small></div></div>` : ""}
      <label class="ct-f">ספק *<input type="text" id="pjqVendor" class="${u("supplier")}" list="pjqVendors" value="${esc(f.vendor || "")}" placeholder="שם הספק / בעל המקצוע" autofocus><datalist id="pjqVendors">${names.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist></label>
      <div class="ct-g2">
        <label class="ct-f">סכום ההצעה (₪)<input type="number" id="pjqPrice" class="${u("total")}" inputmode="decimal" min="0" step="any" value="${qPrice(f) || ""}" placeholder="0"></label>
        <label class="ct-f">מע"מ<select id="pjqVat" class="${u("total_includes_vat")}"><option value="" ${!f.vat ? "selected" : ""}>לא צוין</option><option value="inc" ${f.vat === "inc" ? "selected" : ""}>הסכום כולל מע"מ</option><option value="ex" ${f.vat === "ex" ? "selected" : ""}>הסכום לפני מע"מ</option></select></label>
      </div>
      <div class="ct-g2">
        <label class="ct-f">תאריך ההצעה<input type="date" id="pjqDate" class="${u("date")}" value="${esc(String(f.date || "").slice(0, 10))}"></label>
        <label class="ct-f">בתוקף עד<input type="date" id="pjqValid" class="${u("valid_until")}" value="${esc(String(f.validUntil || "").slice(0, 10))}"></label>
      </div>
      <label class="ct-f">הערות (מה כלול, אחריות, זמן ביצוע)<textarea id="pjqNotes" rows="3" style="min-height:72px">${esc(f.notes || "")}</textarea></label>
      <label class="ct-f">סעיפים בהצעה – שורה לכל סעיף, אפשר "תיאור | סכום"<textarea id="pjqItems" rows="3" style="min-height:72px" placeholder="פירוק המזגן הישן | 400">${esc(items)}</textarea></label>
      <div class="ct-box" style="padding:12px"><h4>קובץ ההצעה</h4>
        <div id="pjqFileNow">${MD.fileUrl ? `<div class="ct-doc"><span class="dot f">${ic("doc", 15)}</span><span class="t">יש קובץ מצורף</span><button type="button" class="ct-act" data-pj="m-file">פתיחה</button><button type="button" class="ct-lnk red" data-pj="m-file-rm">הסרה</button></div>` : ""}</div>
        <label class="ct-f">${MD.fileUrl ? "החלפת הקובץ" : "צירוף קובץ (PDF או תמונה)"}<input type="file" id="pjqFile" accept="image/*,application/pdf"></label>
        ${isAdmin() && window.aiRead ? `<label class="ct-check"><input type="checkbox" id="pjqAi" checked> הסוכן ימלא את השדות מהקובץ (רק שדות ריקים)</label>` : ""}
        <div class="pj-hint" id="pjqStat"></div>
      </div>
      ${q ? `<label class="ct-check"><input type="checkbox" id="pjqDecl" ${q.declined ? "checked" : ""}> הספק לא מגיש הצעה</label>` : ""}
    </div><div class="ct-modal-f">
      <button type="button" class="ct-btn pri" data-pj="q-save" id="pjqSave">שמירה</button>
      <button type="button" class="ct-btn" data-pj="m-close">ביטול</button><span class="ct-flex"></span>
      ${q ? `<button type="button" class="ct-lnk red" data-pj="q-del">מחיקת ההצעה</button>` : ""}
    </div>`, "sm");
  }
  async function uploadFile(file){
    const ref = storage.ref().child(`uploads/project-quotes/${Date.now()}_${file.name}`);   // eslint-disable-line no-undef
    await ref.put(file);
    return ref.getDownloadURL();
  }
  async function aiReadQuote(file, onStep){
    if (typeof window.aiRead !== "function" || !isAdmin()) return null;
    if (!/^image\//.test(file.type || "") && !/pdf/.test(file.type || "") && !/\.(pdf|jpe?g|png|webp|heic)$/i.test(file.name || "")) return null;
    const res = await window.aiRead({ task: "document", file, hint: "המשתמש בטאב פרויקטים – זו כנראה הצעת מחיר של ספק / בעל מקצוע לעבודה או רכישה בבניין", onStep });
    if (!res || !res.ok || !res.data) throw new Error((res && res.error) || "הקריאה לא הצליחה");
    return mapAi(res.data);
  }
  function mapAi(d){
    return {
      vendor: String(d.supplier || "").trim(), price: Number(d.total) || 0,
      vat: d.total_includes_vat === true ? "inc" : d.total_includes_vat === false ? "ex" : "",
      date: /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") ? d.date : "", validUntil: /^\d{4}-\d{2}-\d{2}$/.test(d.valid_until || "") ? d.valid_until : "",
      subject: String(d.subject || "").slice(0, 200),
      items: (Array.isArray(d.line_items) ? d.line_items : []).filter(x => x && x.text).slice(0, 60).map(x => ({ text: String(x.text).slice(0, 200), amount: Number(x.amount) || 0 })),
      aiUnc: Array.isArray(d.uncertain_fields) ? d.uncertain_fields.map(String) : [], docType: d.doc_type || ""
    };
  }
  function parseItems(txt){
    return String(txt || "").split(/\n+/).map(l => l.trim()).filter(Boolean).slice(0, 80).map(l => {
      const m = /^(.*?)[|\t]\s*₪?\s*([\d.,]+)\s*₪?$/.exec(l);
      return m ? { text: m[1].trim(), amount: num(m[2]) } : { text: l, amount: 0 };
    });
  }
  async function saveQuote(){
    const p = getP(MD.pid); if (!p) { closeModal(); return; }
    const btn = document.getElementById("pjqSave"), stat = document.getElementById("pjqStat");
    const fileIn = document.getElementById("pjqFile"), file = fileIn && fileIn.files && fileIn.files[0];
    const useAi = !!(document.getElementById("pjqAi") && document.getElementById("pjqAi").checked);
    let vendor = val("pjqVendor"), price = num(val("pjqPrice")), vat = val("pjqVat"), date = val("pjqDate"), valid = val("pjqValid"), notes = val("pjqNotes"), items = parseItems(val("pjqItems"));
    let fileUrl = MD.fileUrl || "", ai = null;
    if (file) {
      btn.disabled = true;
      try {
        stat.textContent = "מעלה את הקובץ…";
        fileUrl = await uploadFile(file);
        if (useAi) {
          try { ai = await aiReadQuote(file, t => { stat.textContent = t; }); } catch (e) { stat.textContent = "הסוכן לא הצליח לקרוא: " + e.message + ". הקובץ נשמר, אפשר למלא ידנית."; }
          if (ai) {
            if (!vendor) vendor = ai.vendor; if (!(price > 0)) price = ai.price; if (!vat) vat = ai.vat;
            if (!valid) valid = ai.validUntil; if (!items.length) items = ai.items;
            if (!date || (date === today() && ai.date)) date = ai.date || date;
          }
        }
      } catch (e) { btn.disabled = false; stat.textContent = "שגיאה בהעלאה: " + e.message; return; }
      btn.disabled = false;
    }
    if (!vendor) { toast("יש למלא שם ספק"); const n = document.getElementById("pjqVendor"); if (n) n.focus(); if (file && fileUrl) { MD.fileUrl = fileUrl; } return; }
    let q = MD.qid != null ? (p.quotes || []).find(x => String(x.id) === String(MD.qid)) : null;
    /* הצעה חדשה מספק שכבר מחכים לו – ממלאים את השורה הממתינה במקום ליצור כפילות */
    if (!q) q = (p.quotes || []).find(x => qWaiting(x) && norm(x.vendor) && norm(x.vendor) === norm(vendor)) || null;
    const wasWaiting = q && qWaiting(q);
    const fields = { vendor, price, vat, date, validUntil: valid, notes, items, fileUrl };
    if (ai && ai.subject) fields.subject = ai.subject;
    if (ai) { fields.aiCheck = true; fields.aiUnc = ai.aiUnc; }
    if (MD.aiData) { fields.aiCheck = true; }
    const decl = document.getElementById("pjqDecl");
    if (q) {
      Object.assign(q, fields);
      if (decl) q.declined = decl.checked;
      if (q.aiCheck && !ai && !MD.aiData) { q.aiCheck = false; q.aiUnc = []; }   // המשתמש עבר ושמר – נבדק
      if (price > 0 && !q.receivedAt) q.receivedAt = today();
      log(p, wasWaiting && price > 0 ? `התקבלה הצעה מ${vendor}: ${money(qGross(q))}` : `הצעה של ${vendor} עודכנה`);
    } else {
      q = Object.assign({ id: newId(15000), receivedAt: price > 0 ? today() : "" }, MD.aiData ? { aiUnc: MD.aiData.aiUnc || [] } : {}, fields);
      p.quotes = (p.quotes || []).concat([q]);
      log(p, `נוספה הצעה מ${vendor}${price > 0 ? ": " + money(qGross(q)) : ""}`);
    }
    if (p.status === "פתוח" && calc(p).recv.length >= 2 && !calc(p).waiting.length) toast("כל ההצעות הגיעו – אפשר לעבור להשוואה", 3500);
    save(); closeModal(); render();
    if (U.openId == null) open(p.id, "quotes"); else { U.tab = "quotes"; renderDrawer(); }
    refreshOthers();
  }
  function deleteQuote(){
    const p = getP(MD.pid); const q = p && (p.quotes || []).find(x => String(x.id) === String(MD.qid)); if (!q) return;
    openConfirmModal(`למחוק את ההצעה של ${q.vendor || "הספק"}? לא ניתן לשחזר. (הקובץ עצמו נשאר באחסון)`, () => { // eslint-disable-line no-undef
      p.quotes = (p.quotes || []).filter(x => x !== q);
      if (String(p.chosenQuoteId) === String(q.id)) p.chosenQuoteId = null;
      log(p, `ההצעה של ${q.vendor || "ספק"} נמחקה`);
      save(); closeModal(); render(); refreshOthers();
    });
  }

  /* ---------- העלאת כמה קבצים בבת אחת – הסוכן קורא כל אחד ---------- */
  function pickFiles(multi){
    return new Promise(res => {
      const i = document.createElement("input"); i.type = "file"; i.accept = "image/*,application/pdf"; i.multiple = !!multi; i.style.display = "none";
      i.addEventListener("change", () => { const f = [...(i.files || [])]; i.remove(); res(f); });
      document.body.appendChild(i); i.click();
    });
  }
  async function uploadMany(pid){
    const p = getP(pid); if (!p) return;
    const files = await pickFiles(true); if (!files.length) return;
    MD = { kind: "busy" };
    const rows = files.map((f, i) => `<div id="pjpr${i}"><span>${ic("doc", 15)}</span><span style="flex:1;min-width:0;overflow-wrap:anywhere">${esc(f.name)}</span><span class="st">ממתין…</span></div>`).join("");
    modal(mh("קורא את ההצעות", p.name || "") + `<div class="ct-modal-b"><div class="pj-prog">${rows}</div><div class="pj-hint">כל קובץ נשמר ונקרא. בסוף תראה את ההצעות בהשוואה – מסומנות "לבדיקה" עד שתעבור עליהן.</div></div>`, "sm");
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const st = document.querySelector(`#pjpr${i} .st`), set = t => { if (st) st.textContent = t; };
      try {
        set("מעלה…");
        const url = await uploadFile(files[i]);
        let ai = null;
        try { ai = await aiReadQuote(files[i], set); } catch (e) { set("לא נקרא – יש למלא ידנית"); }
        const q = { id: newId(15000), vendor: (ai && ai.vendor) || files[i].name.replace(/\.[a-z0-9]{2,5}$/i, ""), price: (ai && ai.price) || 0, vat: (ai && ai.vat) || "",
          date: (ai && ai.date) || today(), validUntil: (ai && ai.validUntil) || "", notes: "", items: (ai && ai.items) || [], subject: (ai && ai.subject) || "",
          fileUrl: url, aiCheck: true, aiUnc: (ai && ai.aiUnc) || [], receivedAt: today() };
        const same = (p.quotes || []).find(x => qWaiting(x) && norm(x.vendor) && norm(x.vendor) === norm(q.vendor));
        if (same) { Object.assign(same, q, { id: same.id, requestedAt: same.requestedAt }); }
        else p.quotes = (p.quotes || []).concat([q]);
        log(p, `נקלטה הצעה מקובץ: ${q.vendor}${q.price ? " · " + money(qGross(q)) : ""}`);
        ok++;
        if (ai) set(`✓ ${q.vendor}${q.price ? " · " + money(qGross(q)) : ""}`);
        save();
      } catch (e) { set("שגיאה: " + e.message); }
    }
    const m = document.querySelector("#pjModal .ct-modal-b");
    if (m) m.insertAdjacentHTML("beforeend", `<button type="button" class="ct-btn pri" data-pj="m-close-quotes" data-id="${p.id}">${ok ? "להשוואת ההצעות" : "סגירה"}</button>`);
    MD = { kind: "done", pid: p.id };
    render(); refreshOthers();
  }

  /* ---------- בקשת הצעות מספקים ---------- */
  const KEYS = { "חשמל": ["חשמל", "מזגן", "מיזוג", "תאורה", "מנורה"], "אינסטלציה": ["אינסטלצ", "צנרת", "ברז", "ביוב", "מים", "דוד"], "צבע": ["צבע", "שפכטל", "טיח"],
    "מיזוג": ["מזגן", "מיזוג"], "נגרות": ["נגר", "ארון", "דלת", "עץ", "ריהוט"], "מסגרות": ["מסגר", "סורג", "שער", "מעקה", "ברזל"], "ריצוף": ["ריצוף", "אריח", "קרמיקה"], "גבס": ["גבס", "תקרה"], "איטום": ["איטום", "רטיבות", "גג"] };
  function suggested(p){
    const txt = norm([p.name, p.category, p.desc].join(" "));
    const already = new Set((p.quotes || []).map(q => norm(q.vendor)));
    const quotedBefore = new Map();
    list().forEach(x => (x.quotes || []).forEach(q => { const k = norm(q && q.vendor); if (k) quotedBefore.set(k, (quotedBefore.get(k) || 0) + 1); }));
    return (D().contacts || []).filter(c => c && !c.archived && c.name).map(c => {
      const sp = norm([c.specialty, c.notes, c.tags && c.tags.join ? c.tags.join(" ") : ""].join(" "));
      let score = 0, why = "";
      if (c.specialty && txt.includes(norm(c.specialty))) { score += 5; why = c.specialty; }
      Object.keys(KEYS).forEach(k => { if (KEYS[k].some(w => txt.includes(w)) && (sp.includes(norm(k)) || KEYS[k].some(w => sp.includes(w)))) { score += 4; why = why || c.specialty || k; } });
      if (quotedBefore.get(norm(c.name))) { score += 1; why = why || "הגיש בעבר"; }
      if (Number(c.rating) >= 4) score += 1;
      if (c.avoid) score -= 5;
      return { c, score, why, done: already.has(norm(c.name)) };
    }).sort((a, b) => (b.score - a.score) || String(a.c.name).localeCompare(String(b.c.name), "he"));
  }
  function requestMsg(p, name, deadline){
    let cfg = { open: "שלום {שם}", bye: "תודה רבה" };
    try { cfg = proMsgCfg(); } catch (e) {}                                       // eslint-disable-line no-undef
    const fill = s => String(s || "").replace(/\{שם\}/g, name || "").trim();
    return [fill(cfg.open), "", `אשמח לקבל הצעת מחיר עבור: *${p.name || "עבודה"}*`, p.desc ? p.desc : "", p.location ? `מיקום: ${p.location}` : "",
      p.dueDate ? `נדרש לביצוע עד ${fdate(p.dueDate)}` : "", "",
      `אשמח לקבל את ההצעה${deadline ? " עד " + fdate(deadline) : ""}, עם פירוט מה כלול, זמן ביצוע, ואם המחיר כולל מע"מ.`, "", fill(cfg.bye)]
      .filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
  }
  function requestQuotes(pid){
    const p = getP(pid); if (!p || !canEdit()) return;
    const S = suggested(p);
    MD = { kind: "req", pid: p.id, step: 1, sel: new Set(), sent: new Set(), deadline: (() => { try { return tkAddDays(today(), 7); } catch (e) { return ""; } })() }; // eslint-disable-line no-undef
    reqRender(S);
  }
  function reqRender(S){
    const p = getP(MD.pid); if (!p) return;
    if (MD.step === 1) {
      S = S || suggested(p);
      MD.S = S;
      const top = S.filter(x => x.score > 0), rest = S.filter(x => x.score <= 0);
      const row = x => `<label><input type="checkbox" data-pj-sel="${x.c.id}" ${MD.sel.has(x.c.id) ? "checked" : ""}><span class="t">${esc(x.c.name)}<span>${esc([x.c.specialty, x.c.phone ? "" : "אין טלפון", x.done ? "כבר ברשימת ההצעות" : ""].filter(Boolean).join(" · "))}</span></span>${x.why && x.score > 0 ? `<span class="why">${esc(x.why)}</span>` : ""}</label>`;
      modal(mh("בקשת הצעות מחיר", p.name || "") + `<div class="ct-modal-b">
        <label class="ct-srch" style="max-width:none">${ic("search", 16)}<input type="search" id="pjReqQ" placeholder="חיפוש באנשי הקשר" autocomplete="off"></label>
        <div class="pj-ven" id="pjReqList">${top.length ? `<div class="pj-hint">מתאימים לפרויקט</div>${top.map(row).join("")}` : ""}${rest.length ? `<div class="pj-hint" style="margin-top:6px">כל אנשי הקשר</div>${rest.map(row).join("")}` : ""}${!S.length ? `<div class="ct-soft">אין אנשי קשר. אפשר להוסיף בטאב אנשי קשר וספקים.</div>` : ""}</div>
        <div class="ct-g2"><label class="ct-f">לבקש תשובה עד<input type="date" id="pjReqDl" value="${esc(MD.deadline || "")}"></label><div></div></div>
      </div><div class="ct-modal-f"><button type="button" class="ct-btn pri" data-pj="req-next" id="pjReqNext">${MD.sel.size ? `המשך עם ${MD.sel.size} ספקים` : "בחירת ספקים"}</button><button type="button" class="ct-btn" data-pj="m-close">ביטול</button></div>`, "sm");
      return;
    }
    const chosen = MD.S.filter(x => MD.sel.has(x.c.id));
    const tmpl = MD.msg != null ? MD.msg : requestMsg(p, "{שם}", MD.deadline);
    MD.msg = tmpl;
    modal(mh("שליחת הבקשה", "לוחצים על כל ספק – ההודעה נפתחת מוכנה בוואטסאפ או ב-Gmail") + `<div class="ct-modal-b">
      <label class="ct-f">נוסח ההודעה ({שם} מתחלף בשם של כל ספק)<textarea id="pjReqMsg" rows="8" style="min-height:170px">${esc(tmpl)}</textarea></label>
      <div class="pj-ven">${chosen.map(x => { const c = x.c, sent = MD.sent.has(c.id);
        const em = c.email || ((c.people || []).find(z => z && z.email) || {}).email;
        return `<div class="pj-sendrow ${sent ? "sent" : ""}"><span class="t">${sent ? "✓ " : ""}${esc(c.name)}<small>${esc(c.phone || "אין טלפון")}${em ? " · " + esc(em) : ""}</small></span>
          <span class="ct-acts" style="flex:0 0 auto"><button type="button" class="ab w" data-pj="req-wa" data-v="${c.id}" ${c.phone ? "" : "disabled"} style="padding:0 12px">${ic("wa", 15)}וואטסאפ</button><button type="button" class="ab m" data-pj="req-mail" data-v="${c.id}" ${em ? "" : "disabled"} style="padding:0 12px">${ic("mail", 15)}Gmail</button></span></div>`; }).join("")}</div>
      <div class="pj-hint">כל ספק שנשלחה אליו בקשה נכנס להשוואה כ"ממתין", ותקבל התראה אם לא חזר אליך תוך ${followDays()} ימים (כמו בהודעות המשימות).</div>
    </div><div class="ct-modal-f"><button type="button" class="ct-btn pri" data-pj="req-done">סיום (${MD.sent.size} נשלחו)</button><button type="button" class="ct-btn" data-pj="req-back">חזרה לבחירה</button></div>`, "sm");
  }
  function reqSend(cid, channel){
    const p = getP(MD.pid); const c = (D().contacts || []).find(x => String(x.id) === String(cid)); if (!p || !c) return;
    const ta = document.getElementById("pjReqMsg"); if (ta) MD.msg = ta.value;
    const msg = String(MD.msg || "").replace(/\{שם\}/g, String(c.name || "").split(/\s+/)[0] || c.name || "");
    let url;
    if (channel === "wa") {
      const ph = c.phone || ((c.people || []).find(z => z && z.phone) || {}).phone;
      if (!ph) { toast("אין טלפון לספק"); return; }
      url = `https://wa.me/${formatPhoneForWhatsApp(ph)}?text=${encodeURIComponent(msg)}`;          // eslint-disable-line no-undef
    } else {
      const em = c.email || ((c.people || []).find(z => z && z.email) || {}).email;
      if (!em) { toast("אין כתובת מייל לספק"); return; }
      url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(em)}&su=${encodeURIComponent("בקשה להצעת מחיר – " + (p.name || ""))}&body=${encodeURIComponent(msg)}`;
    }
    try { openOutLink(url); } catch (e) { window.open(url, "_blank", "noopener"); }                  // eslint-disable-line no-undef
    if (!MD.sent.has(c.id)) {
      MD.sent.add(c.id);
      let q = (p.quotes || []).find(x => norm(x.vendor) === norm(c.name));
      if (!q) { q = { id: newId(15000), vendor: c.name, price: 0, notes: "", fileUrl: "", items: [], requestedAt: today(), requestVia: channel === "wa" ? "וואטסאפ" : "Gmail" }; p.quotes = (p.quotes || []).concat([q]); }
      else if (!(qPrice(q) > 0)) { q.requestedAt = today(); q.requestVia = channel === "wa" ? "וואטסאפ" : "Gmail"; }
      log(p, `נשלחה בקשה להצעת מחיר ל${c.name} (${channel === "wa" ? "וואטסאפ" : "Gmail"})`);
      try { c.lastContactAt = today(); scheduleSave("contacts", "contactsSaved"); } catch (e) {}       // eslint-disable-line no-undef
      save();
    }
    reqRender();
  }
  function nudge(pid, qid){
    const p = getP(pid); const q = p && (p.quotes || []).find(x => String(x.id) === String(qid)); if (!q) return;
    const c = contactOf(q.vendor);
    const ph = c && (c.phone || ((c.people || []).find(z => z && z.phone) || {}).phone);
    if (!ph) { toast(`אין טלפון ל${q.vendor || "ספק"} באנשי הקשר`); return; }
    const first = String(q.vendor || "").split(/\s+/)[0];
    const msg = `שלום ${first} 🙂\nרציתי לבדוק לגבי הצעת המחיר עבור *${p.name || ""}* ששלחתי${q.requestedAt ? " ב-" + fdate(q.requestedAt) : ""}.\nאשמח לקבל אותה בהקדם.\nתודה!`;
    try { openOutLink(`https://wa.me/${formatPhoneForWhatsApp(ph)}?text=${encodeURIComponent(msg)}`); } catch (e) {} // eslint-disable-line no-undef
    q.nudgedAt = today(); q.requestedAt = q.requestedAt || today();
    log(p, `נשלחה תזכורת ל${q.vendor}`);
    save(); render();
  }
  function waVendor(pid, qid, text){
    const p = getP(pid); const q = p && (p.quotes || []).find(x => String(x.id) === String(qid));
    const name = q ? q.vendor : qid; const c = contactOf(name);
    const ph = c && (c.phone || ((c.people || []).find(z => z && z.phone) || {}).phone);
    if (!ph) { toast(`אין טלפון ל${name || "ספק"} באנשי הקשר`); return false; }
    try { openOutLink(`https://wa.me/${formatPhoneForWhatsApp(ph)}${text ? "?text=" + encodeURIComponent(text) : ""}`); } catch (e) {} // eslint-disable-line no-undef
    return true;
  }

  /* ---------- בחירת הצעה ---------- */
  function choose(pid, qid){
    const p = getP(pid); const q = p && (p.quotes || []).find(x => String(x.id) === String(qid)); if (!q || !canEdit()) return;
    const canTask = isAdmin() && canTab("tasks") && has("tkNewTask");
    MD = { kind: "choose", pid: p.id, qid: q.id };
    modal(mh("בחירה בהצעה", p.name || "") + `<div class="ct-modal-b">
      <div class="ct-alert" style="background:#eef5ff"><span class="ic i">${ic("trophy", 18)}</span><div class="tx"><b>${esc(q.vendor || "ספק")}</b> · ${money(qGross(q))}<small>${q.vat === "ex" ? "כולל מע\"מ (" + money(qPrice(q)) + " לפני מע\"מ)" : ""}</small></div></div>
      ${num(p.budget) && qGross(q) > num(p.budget) ? `<div class="ct-tag warn" style="align-self:flex-start">${ic("alert", 12)}גבוה מהתקציב ב-${money(qGross(q) - num(p.budget))}</div>` : ""}
      <label class="ct-check"><input type="checkbox" id="pjcStage" ${p.status === "פתוח" || p.status === "בבדיקה" ? "checked" : ""}> להעביר את הפרויקט לשלב "בביצוע"</label>
      ${canTask ? `<label class="ct-check"><input type="checkbox" id="pjcTask" ${costs(p).tasks.length ? "" : "checked"}> לפתוח משימה לביצוע אצל ${esc(q.vendor || "הספק")} (משם שולחים לו הודעה, עוקבים ומשייכים חשבונית)</label>` : ""}
      <div class="pj-hint">שום תשלום לא נוצר עכשיו. העלות תיכנס לחשבוניות ולדוח למנהל החשבונות רק כשתגיע חשבונית – כמו תמיד.</div>
    </div><div class="ct-modal-f"><button type="button" class="ct-btn pri" data-pj="choose-ok">בחירה</button><button type="button" class="ct-btn" data-pj="m-close">ביטול</button></div>`, "sm");
  }
  function chooseOk(){
    const p = getP(MD.pid); const q = p && (p.quotes || []).find(x => String(x.id) === String(MD.qid)); if (!q) { closeModal(); return; }
    const toStage = document.getElementById("pjcStage") && document.getElementById("pjcStage").checked;
    const mkTask = document.getElementById("pjcTask") && document.getElementById("pjcTask").checked;
    p.chosenQuoteId = q.id; p.chosenAt = today();
    log(p, `נבחרה ההצעה של ${q.vendor}: ${money(qGross(q))}`);
    if (toStage) setStage(p, "בביצוע", true);
    save(); closeModal();
    if (mkTask) { newTask(p, q); return; }
    render(); refreshOthers(); U.tab = "exec"; renderDrawer();
    toast(`נבחרה ההצעה של ${q.vendor}`);
  }
  function unchoose(pid){
    const p = getP(pid); if (!p) return;
    const q = calc(p).chosen;
    openConfirmModal(`לבטל את הבחירה בהצעה של ${q ? q.vendor : "הספק"}? ההצעה עצמה נשארת.`, () => { // eslint-disable-line no-undef
      p.chosenQuoteId = null; log(p, "הבחירה בוטלה"); save(); render(); refreshOthers();
    });
  }
  function newTask(p, q){
    if (!has("tkNewTask") || !canTab("tasks")) return;
    q = q || calc(p).chosen;
    const t = tkNewTask({ schoolYear: currentSchoolYearStart(), desc: p.name || "ביצוע פרויקט", assignee: (q && q.vendor) || "", place: p.location || "", // eslint-disable-line no-undef
      category: p.category || "", due: p.dueDate || "", projectId: p.id,
      notes: [p.desc, q ? `לפי הצעת מחיר: ${money(qGross(q))}${q.date ? " מ-" + fdate(q.date) : ""}` : ""].filter(Boolean).join("\n") });
    t.log = [{ d: today(), t: `נפתחה מפרויקט "${p.name || ""}"` }];
    if (q && q.fileUrl) t.docs = (t.docs || []).concat([{ name: "הצעת מחיר", topic: p.category || "", docType: "אחר", fileUrl: q.fileUrl, uploadedAt: today() }]);
    try { tkFreshIds.add(t.id); } catch (e) {}                                                   // eslint-disable-line no-undef
    try { tkSave(); } catch (e) { scheduleSave("tasks", "tasksSaved"); }                          // eslint-disable-line no-undef
    log(p, `נפתחה משימה לביצוע${q ? " אצל " + q.vendor : ""}`);
    save(); closeDrawer(); render();
    switchTab("tasks");                                                                          // eslint-disable-line no-undef
    try { renderTasks(); tkOpen(t.id, "desc"); } catch (e) {}                                    // eslint-disable-line no-undef
    toast("נפתחה משימה – אפשר לשלוח לספק מכאן");
  }
  function linkTask(pid){
    const p = getP(pid); if (!p) return;
    const T = (D().tasks || []).filter(t => t && String(t.projectId) !== String(p.id)).slice().sort((a, b) => {
      const da = (() => { try { return tkStatus(a) === "בוצע" ? 1 : 0; } catch (e) { return 0; } })(), db = (() => { try { return tkStatus(b) === "בוצע" ? 1 : 0; } catch (e) { return 0; } })(); // eslint-disable-line no-undef
      return (da - db) || String(b.created || "").localeCompare(String(a.created || ""));
    }).slice(0, 300);
    MD = { kind: "linktask", pid: p.id };
    modal(mh("קישור משימה קיימת", p.name || "") + `<div class="ct-modal-b">
      <label class="ct-srch" style="max-width:none">${ic("search", 16)}<input type="search" id="pjLtQ" placeholder="חיפוש משימה, איש מקצוע או מספר" autocomplete="off" autofocus></label>
      <div class="pj-ven" id="pjLtList">${T.map(t => `<label data-k="${esc(norm([t.desc, t.assignee, t.place, t.taskNumber].join(" ")))}"><input type="radio" name="pjLt" value="${t.id}"><span class="t">${esc(t.desc || "משימה")}<span>${esc([(() => { try { return taskCodeDisplay(t); } catch (e) { return ""; } })(), t.assignee, (() => { try { return tkStatus(t); } catch (e) { return ""; } })(), t.projectId && getP(t.projectId) ? "משויכת ל: " + getP(t.projectId).name : ""].filter(Boolean).join(" · "))}</span></span></label>`).join("") || `<div class="ct-soft">אין משימות.</div>`}</div>
    </div><div class="ct-modal-f"><button type="button" class="ct-btn pri" data-pj="lt-ok">קישור</button><button type="button" class="ct-btn" data-pj="m-close">ביטול</button></div>`, "sm");
  }
  function linkTaskOk(){
    const p = getP(MD.pid); const r = document.querySelector('input[name="pjLt"]:checked');
    if (!p || !r) { toast("יש לבחור משימה"); return; }
    const t = (D().tasks || []).find(x => String(x.id) === r.value); if (!t) return;
    t.projectId = p.id;
    t.log = (t.log || []).concat([{ d: today(), t: `קושרה לפרויקט "${p.name || ""}"` }]);
    try { tkSave(); } catch (e) {}                                                               // eslint-disable-line no-undef
    log(p, `קושרה משימה: ${t.desc || ""}`);
    save(); closeModal(); render(); refreshOthers(); U.tab = "exec"; renderDrawer();
  }
  function linkPay(pid){
    const p = getP(pid); if (!p) return;
    const V = (D().vendorPayments || []).filter(v => v && !v.projectId && !(D().tasks || []).some(t => t && t.vendorPayId === v.id)).slice().sort((a, b) => b.id - a.id).slice(0, 200);
    MD = { kind: "linkpay", pid: p.id };
    modal(mh("קישור תשלום לפרויקט", "רכישות ותשלומים מחשבוניות וקבלות שלא שייכים למשימה") + `<div class="ct-modal-b">
      <div class="pj-ven">${V.map(v => `<label><input type="checkbox" data-pj-pay="${v.id}"><span class="t">${esc(v.desc || "תשלום")}<span>${esc([v.vendor, num(v.amount) ? money(v.amount) : "", v.jobTopic].filter(Boolean).join(" · "))}</span></span></label>`).join("") || `<div class="ct-soft">אין תשלומים פנויים לקישור.</div>`}</div>
      <div class="pj-hint">הקישור רק מסמן לאיזה פרויקט שייך התשלום. שום סכום לא משתנה ושום דבר לא נוסף לדוח למנהל החשבונות.</div>
    </div><div class="ct-modal-f"><button type="button" class="ct-btn pri" data-pj="lp-ok">קישור</button><button type="button" class="ct-btn" data-pj="m-close">ביטול</button></div>`, "sm");
  }
  function linkPayOk(){
    const p = getP(MD.pid); if (!p) return;
    const ids = [...document.querySelectorAll("[data-pj-pay]:checked")].map(x => x.getAttribute("data-pj-pay"));
    if (!ids.length) { toast("יש לבחור תשלום"); return; }
    let n = 0;
    (D().vendorPayments || []).forEach(v => { if (v && ids.includes(String(v.id))) { v.projectId = p.id; n++; } });
    try { scheduleSave("vendorPayments", "vendorPaySaved"); } catch (e) {}                       // eslint-disable-line no-undef
    log(p, `קושרו ${n} תשלומים`);
    save(); closeModal(); render(); refreshOthers(); U.tab = "exec"; renderDrawer();
  }
  function thanks(pid){
    const p = getP(pid); if (!p) return;
    const c = calc(p);
    const others = c.recv.filter(q => !c.chosen || q.id !== c.chosen.id);
    MD = { kind: "thanks", pid: p.id };
    const msg = n => `שלום ${String(n || "").split(/\s+/)[0]} 🙂\nתודה על הצעת המחיר עבור *${p.name || ""}*.\nהפעם החלטנו להתקדם עם הצעה אחרת. אשמח לפנות אליך שוב בפעם הבאה.\nתודה רבה!`;
    MD.msg = msg;
    modal(mh("הודעת תודה לספקים", "שומר על קשר טוב לפעם הבאה") + `<div class="ct-modal-b"><div class="ct-note-fixed">${esc(msg("{שם}"))}</div>
      <div class="pj-ven">${others.map(q => `<div class="pj-sendrow ${q.thankedAt ? "sent" : ""}"><span class="t">${q.thankedAt ? "✓ " : ""}${esc(q.vendor || "")}<small>${money(qGross(q))}</small></span><span class="ct-acts" style="flex:0 0 auto"><button type="button" class="ab w" data-pj="thx-wa" data-q="${q.id}" style="padding:0 12px">${ic("wa", 15)}וואטסאפ</button></span></div>`).join("")}</div>
    </div><div class="ct-modal-f"><button type="button" class="ct-btn" data-pj="m-close">סגירה</button></div>`, "sm");
  }

  /* ---------- ניתוח AI השוואתי ---------- */
  function aiSig(p){ return (p.quotes || []).filter(qReal).map(q => [q.id, qPrice(q), q.vat, (q.items || []).length, q.declined ? 1 : 0].join(":")).join("|"); }
  async function aiCompare(pid){
    const p = getP(pid); if (!p || !window.aiCall || U.aiBusy) return;
    const c = calc(p);
    if (!c.recv.length) { toast("צריך לפחות הצעה אחת עם מחיר"); return; }
    let st = null; try { st = has("ctCollect") ? ctCollect().stats : null; } catch (e) {}          // eslint-disable-line no-undef
    const info = {
      today: today(), vat_rate: VAT(),
      project: { name: p.name || "", category: p.category || "", location: p.location || "", description: p.desc || "", budget: num(p.budget) || null, due: p.dueDate || "" },
      quotes: c.quotes.filter(q => !q.declined).map(q => {
        const ct = contactOf(q.vendor), s = ct && st ? st.get(ct.id) : null;
        return { vendor: q.vendor || "", status: qWaiting(q) ? "waiting – no price yet" : "received", price: qPrice(q) || null,
          vat: q.vat === "inc" ? "includes VAT" : q.vat === "ex" ? "before VAT" : "not stated", price_with_vat_calculated: qPrice(q) ? qGross(q) : null,
          date: q.date || "", valid_until: q.validUntil || "", summary: q.subject || "", notes: q.notes || "",
          items: (q.items || []).slice(0, 40).map(x => x.text + (num(x.amount) ? " – " + num(x.amount) : "")),
          vendor_history: ct ? { specialty: ct.specialty || "", rating_1to5: Number(ct.rating) || null, jobs_done_for_us: s ? s.jobs.length : null, avg_job_price: s && s.avg ? Math.round(s.avg) : null, notes: String(ct.notes || "").slice(0, 200) } : "not in contacts" };
      })
    };
    U.aiBusy = p.id; if (U.openId === p.id) renderDrawer();
    let res;
    try { res = await window.aiCall("quotes", [{ type: "text", text: JSON.stringify(info) }], "השוואת הצעות מחיר לפרויקט בבניין"); }
    catch (e) { res = { ok: false, error: e.message }; }
    U.aiBusy = false;
    if (!res || !res.ok || !res.data) {
      const err = (res && res.error) || "הניתוח נכשל";
      toast(/סוג משימה לא מוכר/.test(err) ? "שרת הסוכן עוד מתעדכן – נסה שוב בעוד דקה-שתיים" : err, 4500);
      if (U.openId === p.id) renderDrawer();
      return;
    }
    p.ai = { at: today(), n: c.quotes.length, sig: aiSig(p), data: res.data };
    log(p, "בוצע ניתוח AI של ההצעות" + (res.data.recommendation && res.data.recommendation.vendor ? " · המלצה: " + res.data.recommendation.vendor : ""));
    if (p.status === "פתוח" && c.recv.length >= 2) setStage(p, "בבדיקה", true);
    save(); render();
    if (U.openId === p.id) { U.tab = "over"; renderDrawer(); }
  }
  function ask(pid, i){
    const p = getP(pid); const x = p && p.ai && p.ai.data && (p.ai.data.questions || [])[Number(i)]; if (!x) return;
    const q = (p.quotes || []).find(z => norm(z.vendor) === norm(x.vendor)) || (p.quotes || []).find(z => norm(z.vendor).includes(norm(x.vendor)) || norm(x.vendor).includes(norm(z.vendor)));
    const name = q ? q.vendor : x.vendor;
    const msg = `שלום ${String(name || "").split(/\s+/)[0]} 🙂\nלגבי הצעת המחיר עבור *${p.name || ""}*:\n${x.question}\nתודה!`;
    if (waVendor(p.id, q ? q.id : name, msg)) { log(p, `נשאלה שאלה ל${name}: ${x.question}`); save(); }
  }

  /* ---------- סיכום להדפסה / PDF ---------- */
  function pdf(pid){
    const p = getP(pid); if (!p) return;
    const c = calc(p);
    if (!c.recv.length) { toast("אין עדיין הצעות עם מחיר"); return; }
    const S = c.recv.slice().sort((a, b) => qGross(a) - qGross(b));
    const a = p.ai && p.ai.data;
    const row = q => { const pick = c.chosen && c.chosen.id === q.id, best = qGross(q) === c.min;
      return `<tr class="${pick ? "pick" : best ? "best" : ""}"><td><b>${esc(q.vendor || "—")}</b>${pick ? ' <span class="tg b">נבחרה</span>' : best && S.length > 1 ? ' <span class="tg g">הזולה</span>' : ""}${q.subject ? `<div class="s">${esc(q.subject)}</div>` : ""}</td>
        <td class="n"><b>${money(qGross(q))}</b>${q.vat === "ex" ? `<div class="s">${money(qPrice(q))} + מע"מ</div>` : q.vat === "inc" ? '<div class="s">כולל מע"מ</div>' : ""}</td>
        <td class="n">${best ? "—" : "+" + money(qGross(q) - c.min)}</td><td>${q.validUntil ? fdate(q.validUntil) : "—"}</td>
        <td>${esc(q.notes || "")}${(q.items || []).length ? `<div class="s">${q.items.slice(0, 8).map(x => esc(x.text) + (num(x.amount) ? " (" + money(x.amount) + ")" : "")).join(" · ")}</div>` : ""}</td></tr>`; };
    const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>השוואת הצעות מחיר – ${esc(p.name || "")}</title>
      <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&family=Suez+One&display=swap" rel="stylesheet">
      <style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Rubik,Arial,sans-serif;color:#201e1d;margin:0;font-size:12.5px}
      .hd{background:linear-gradient(135deg,#c67139,#a35a1f);color:#fff;border-radius:16px;padding:18px 20px;display:flex;justify-content:space-between;gap:16px;align-items:flex-end}
      h1{font-family:"Suez One",serif;font-weight:400;margin:0;font-size:24px}.hd .k{opacity:.9;font-size:12px}
      .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.meta div{background:#fbf7f0;border-radius:12px;padding:9px 11px}.meta span{display:block;color:#645c50;font-size:11px}.meta b{font-size:14px}
      table{width:100%;border-collapse:separate;border-spacing:0;margin-top:6px}th{background:#2b2723;color:#fff;text-align:right;padding:8px;font-size:11.5px}th:first-child{border-radius:0 10px 0 0}th:last-child{border-radius:10px 0 0 0}
      td{padding:9px 8px;border-bottom:1px solid #eee7db;vertical-align:top}td.n{white-space:nowrap}tr.best td{background:#f0f6e8}tr.pick td{background:#eaf2ff}
      .s{color:#645c50;font-size:11px;margin-top:2px}.tg{font-size:10px;font-weight:700;border-radius:999px;padding:1px 7px}.tg.g{background:#e1eecc;color:#3f4a2c}.tg.b{background:#e1ecfb;color:#2563c4}
      .ai{margin-top:14px;background:#f6f2ff;border-radius:14px;padding:12px 14px;border-right:4px solid #6c4fd8}.ai h3{margin:0 0 6px;font-size:13.5px}.ai ul{margin:4px 0;padding-right:18px}
      .desc{background:#fbf7f0;border-radius:12px;padding:10px 12px;white-space:pre-line}.ft{margin-top:18px;color:#82796a;font-size:10.5px;text-align:center}</style></head><body>
      <div class="hd"><div><div class="k">השוואת הצעות מחיר</div><h1>${esc(p.name || "פרויקט")}</h1></div><div class="k">${esc([p.category, p.location].filter(Boolean).join(" · "))}<br>הופק ${fdate(today())}</div></div>
      <div class="meta"><div><span>הצעות</span><b>${S.length}</b></div><div><span>הזולה</span><b>${money(c.min)}</b></div><div><span>פער בין הזולה ליקרה</span><b>${money(c.max - c.min)}</b></div><div><span>תקציב</span><b>${num(p.budget) ? money(p.budget) : "—"}</b></div></div>
      ${p.desc ? `<div class="desc">${esc(p.desc)}</div>` : ""}
      <table><thead><tr><th>ספק</th><th>מחיר (כולל מע"מ)</th><th>מעל הזולה</th><th>בתוקף עד</th><th>פירוט והערות</th></tr></thead><tbody>${S.map(row).join("")}</tbody></table>
      ${a ? `<div class="ai"><h3>ניתוח AI (${fdate(p.ai.at)})</h3>${a.summary ? `<div>${esc(a.summary)}</div>` : ""}${a.recommendation && a.recommendation.vendor ? `<div style="margin-top:6px"><b>המלצה: ${esc(a.recommendation.vendor)}</b> – ${esc(a.recommendation.reason || "")}</div>` : ""}${(a.warnings || []).length ? `<ul>${a.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}</div>` : ""}
      ${c.chosen ? `<div style="margin-top:14px;font-size:13.5px"><b>ההחלטה:</b> ${esc(c.chosen.vendor)} · ${money(qGross(c.chosen))}${p.chosenAt ? " · " + fdate(p.chosenAt) : ""}</div>` : ""}
      <div class="ft">ניהול הבניין · מחירים לפני מע"מ הוצגו בתוספת מע"מ ${Math.round(VAT() * 100)}% לצורך השוואה</div></body></html>`;
    try { openPrintWindow(html); } catch (e) { const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); } } // eslint-disable-line no-undef
  }

  /* ---------- מהסוכן (כפתור +) ומ"הצעה מקובץ" ---------- */
  async function fromFile(){
    const files = await pickFiles(false); if (!files.length) return;
    const file = files[0];
    MD = { kind: "busy" };
    modal(mh("הסוכן קורא את ההצעה", file.name) + `<div class="ct-modal-b"><div class="ct-soft" id="pjFfStep">${ic("spark", 15)} מכין את הקובץ…</div></div>`, "sm");
    let ai = null, err = "";
    try { ai = await aiReadQuote(file, t => { const e = document.getElementById("pjFfStep"); if (e) e.textContent = t; }); } catch (e) { err = e.message; }
    if (!document.getElementById("pjModal").classList.contains("show")) return;
    pickProject(file, ai, err);
  }
  function pickProject(file, ai, err){
    const act = visible().filter(p => !isArch(p));
    const guess = ai ? act.map(p => ({ p, s: (norm(ai.subject).split(" ").filter(w => w.length > 2 && norm([p.name, p.desc].join(" ")).includes(w)).length) + ((p.quotes || []).some(q => qWaiting(q) && norm(q.vendor) === norm(ai.vendor)) ? 5 : 0) })).sort((a, b) => b.s - a.s) : act.map(p => ({ p, s: 0 }));
    MD = { kind: "pick", file, ai };
    modal(mh("לאיזה פרויקט להוסיף?", ai ? `${ai.vendor || "ספק"}${ai.price ? " · " + money(ai.vat === "ex" ? ai.price * (1 + VAT()) : ai.price) : ""}` : file.name) + `<div class="ct-modal-b">
      ${err ? `<div class="ct-alert"><span class="ic w">${ic("alert", 18)}</span><div class="tx">הסוכן לא הצליח לקרוא<small>${esc(err)} · הקובץ יישמר ותמלא ידנית</small></div></div>` : ""}
      ${ai && ai.subject ? `<div class="ct-soft">${esc(ai.subject)}</div>` : ""}
      <div class="pj-ven">${guess.map((g, i) => `<label><input type="radio" name="pjPick" value="${g.p.id}" ${i === 0 && g.s > 0 ? "checked" : ""}><span class="t">${esc(g.p.name || "פרויקט")}<span>${esc([stage(g.p).l, calc(g.p).quotes.length + " הצעות"].join(" · "))}</span></span>${g.s > 0 && i === 0 ? `<span class="why">נראה מתאים</span>` : ""}</label>`).join("")}
        <label><input type="radio" name="pjPick" value="new" ${!guess.length || !(guess[0] && guess[0].s > 0) ? "checked" : ""}><span class="t"><b>+ פרויקט חדש</b><span>${ai && ai.subject ? esc(ai.subject.slice(0, 60)) : "פתיחת פרויקט מההצעה הזו"}</span></span></label></div>
    </div><div class="ct-modal-f"><button type="button" class="ct-btn pri" data-pj="pick-ok">המשך</button><button type="button" class="ct-btn" data-pj="m-close">ביטול</button></div>`, "sm");
  }
  async function pickOk(){
    const r = document.querySelector('input[name="pjPick"]:checked'); if (!r) { toast("יש לבחור פרויקט"); return; }
    const { file, ai } = MD;
    const go = async p => {
      MD = { kind: "busy" };
      modal(mh("שומר את הקובץ", file.name) + `<div class="ct-modal-b"><div class="ct-soft">מעלה…</div></div>`, "sm");
      let url = "";
      try { url = await uploadFile(file); } catch (e) { closeModal(); toast("שגיאה בהעלאה: " + e.message, 4000); return; }
      const same = ai && (p.quotes || []).find(q => qWaiting(q) && norm(q.vendor) === norm(ai.vendor));
      const preset = Object.assign({ fileUrl: url, aiCheck: !!ai, aiData: ai }, ai ? { vendor: ai.vendor, price: ai.price, vat: ai.vat, date: ai.date || today(), validUntil: ai.validUntil, items: ai.items, aiUnc: ai.aiUnc, subject: ai.subject } : { vendor: "", date: today() });
      if (U.openId == null) open(p.id, "quotes"); else { U.openId = p.id; U.tab = "quotes"; renderDrawer(); }
      editQuote(p.id, same ? same.id : null, same ? null : preset);
      if (same) { MD.fileUrl = url; MD.aiData = ai; const s = (id, v) => { const e = document.getElementById(id); if (e && v && !e.value) e.value = v; };
        s("pjqPrice", ai.price); s("pjqDate", ai.date); s("pjqValid", ai.validUntil); if (ai.vat) document.getElementById("pjqVat").value = ai.vat;
        s("pjqItems", (ai.items || []).map(x => x.text + (x.amount ? " | " + x.amount : "")).join("\n"));
        const fn = document.getElementById("pjqFileNow"); if (fn) fn.innerHTML = `<div class="ct-doc"><span class="dot f">${ic("doc", 15)}</span><span class="t">${esc(file.name)} – נשמר</span></div>`; }
    };
    if (r.value === "new") {
      closeModal();
      editProject(null, { name: ai && ai.subject ? ai.subject.slice(0, 80) : "", desc: ai && ai.subject ? ai.subject : "", after: p => go(p) });
      return;
    }
    const p = getP(r.value); if (p) go(p);
  }
  window.pjFromAgent = function(file, d){
    if (!file || !canEdit()) return;
    hosts();
    let ai = null; try { ai = d ? mapAi(d) : null; } catch (e) {}
    pickProject(file, ai, "");
  };

  /* =====================================================================
     סנכרון לשאר האפליקציה
     ===================================================================== */
  function refreshOthers(){ try { if (document.getElementById("tab-dashboard") && document.getElementById("tab-dashboard").classList.contains("active")) renderDashboard(); } catch (e) {} } // eslint-disable-line no-undef
  window.pjName = id => { const p = id != null ? getP(id) : null; return p ? (p.name || "פרויקט") : ""; };
  window.pjOptionsHtml = cur => `<option value="">בלי פרויקט</option>` + visible().filter(p => !isArch(p) || String(p.id) === String(cur)).map(p => `<option value="${p.id}" ${String(p.id) === String(cur) ? "selected" : ""}>${esc(p.name || "פרויקט")}</option>`).join("");
  window.pjGoto = function(id, tab){ if (!canTab("projects")) return; try { switchTab("projects"); } catch (e) {} render(); setTimeout(() => open(id, tab || "over"), 60); }; // eslint-disable-line no-undef
  window.pjDash = function(){
    const L = visible();
    return { open: L.filter(p => p.status === "פתוח").length, review: L.filter(p => p.status === "בבדיקה").length, exec: L.filter(p => p.status === "בביצוע").length,
      done: L.filter(p => p.status === "הושלם").length, waiting: L.filter(p => !isArch(p)).reduce((a, p) => a + calc(p).pending.length, 0), alerts: alerts() };
  };
  window.pjQuotesFor = function(names){
    const N = (names || []).map(norm).filter(Boolean); const out = [];
    list().forEach(p => (p.quotes || []).forEach(q => { if (q && N.includes(norm(q.vendor))) out.push({ p, q, d: String(q.date || q.receivedAt || q.requestedAt || p.created || "").slice(0, 10),
      t: `הצעת מחיר: ${p.name || "פרויקט"}`, s: ["פרויקטים", qWaiting(q) ? "ממתין להצעה" : qPrice(q) ? money(qGross(q)) : "", String(p.chosenQuoteId) === String(q.id) ? "נבחרה" : ""].filter(Boolean).join(" · ") }); }));
    return out;
  };

  /* =====================================================================
     אירועים
     ===================================================================== */
  document.addEventListener("click", e => {
    const el = e.target.closest && e.target.closest("[data-pj]");
    if (!el || el.disabled) return;
    const inRoot = el.closest("#pjRoot, #pjDrawer, #pjModal");
    if (!inRoot) return;
    const a = el.getAttribute("data-pj"), id = el.getAttribute("data-id"), v = el.getAttribute("data-v"), q = el.getAttribute("data-q");
    switch (a) {
      case "new": editProject(null); break;
      case "ai-file": fromFile(); break;
      case "open": open(Number(id) || id, el.getAttribute("data-tab") || "over"); break;
      case "close": closeDrawer(); break;
      case "tab": U.tab = v; renderDrawer(true); break;
      case "view": U.view = v; render(); break;
      case "cat": U.cat = v; render(); break;
      case "more-alerts": U.allAlerts = !U.allAlerts; render(); break;
      case "stage": { const p = getP(id); if (p && canEdit()) { if (v === "הושלם" && p.status !== "הושלם") { openConfirmModal(`לסמן את "${p.name || "הפרויקט"}" כהושלם? הוא יעבור לארכיון.`, () => setStage(p, v)); } else setStage(p, v); } break; } // eslint-disable-line no-undef
      case "edit": editProject(id); break;
      case "p-save": saveProject(); break;
      case "p-del": deleteProject(id); break;
      case "q-new": editQuote(id, null); break;
      case "q-edit": editQuote(id, q); break;
      case "q-save": saveQuote(); break;
      case "q-del": deleteQuote(); break;
      case "q-files": uploadMany(id); break;
      case "q-file": { const p = getP(id); const x = p && (p.quotes || []).find(z => String(z.id) === String(q)); if (x && x.fileUrl) { try { openFileViewer(x.fileUrl, { title: "הצעת מחיר – " + (x.vendor || ""), meta: p.name }); } catch (er) { window.open(x.fileUrl, "_blank", "noopener"); } } break; } // eslint-disable-line no-undef
      case "m-file": if (MD && MD.fileUrl) { try { openFileViewer(MD.fileUrl, { title: "הצעת מחיר" }); } catch (er) { window.open(MD.fileUrl, "_blank", "noopener"); } } break; // eslint-disable-line no-undef
      case "m-file-rm": if (MD) { MD.fileUrl = ""; const n = document.getElementById("pjqFileNow"); if (n) n.innerHTML = `<div class="pj-hint">הקובץ יוסר מההצעה בשמירה (הוא נשאר באחסון)</div>`; } break;
      case "m-close": closeModal(); break;
      case "m-close-quotes": closeModal(); if (U.openId == null) open(Number(id) || id, "quotes"); else { U.tab = "quotes"; renderDrawer(); } break;
      case "request": requestQuotes(id); break;
      case "req-next": { if (!MD.sel.size) { toast("יש לבחור לפחות ספק אחד"); return; } const dl = document.getElementById("pjReqDl"); MD.deadline = dl ? dl.value : ""; MD.msg = null; MD.step = 2; reqRender(); break; }
      case "req-back": { const ta = document.getElementById("pjReqMsg"); if (ta) MD.msg = ta.value; MD.step = 1; reqRender(MD.S); break; }
      case "req-wa": reqSend(v, "wa"); break;
      case "req-mail": reqSend(v, "mail"); break;
      case "req-done": { const n = MD.sent.size, pid = MD.pid; closeModal(); render(); if (U.openId != null) { U.tab = "quotes"; renderDrawer(); } else open(pid, "quotes"); if (n) toast(`נשלחו ${n} בקשות – הספקים מופיעים כ"ממתין"`); refreshOthers(); break; }
      case "nudge": nudge(id, q); break;
      case "wa": waVendor(id, q, ""); break;
      case "choose": choose(id, q); break;
      case "choose-ok": chooseOk(); break;
      case "unchoose": unchoose(id); break;
      case "task-new": { const p = getP(id); if (p) newTask(p); break; }
      case "task-link": linkTask(id); break;
      case "lt-ok": linkTaskOk(); break;
      case "pay-link": linkPay(id); break;
      case "lp-ok": linkPayOk(); break;
      case "task": { const tid = Number(v); if (!canTab("tasks")) break; closeDrawer(); switchTab("tasks"); try { renderTasks(); tkOpen(tid); } catch (er) {} break; } // eslint-disable-line no-undef
      case "job": { if (!canTab("files")) break; closeDrawer(); switchTab("files"); try { const s = document.getElementById("jobsSearch"); if (s) s.value = v || ""; onJobsSearch(v || ""); } catch (er) {} break; } // eslint-disable-line no-undef
      case "thanks": thanks(id); break;
      case "thx-wa": { const p = getP(MD.pid); const x = p && (p.quotes || []).find(z => String(z.id) === String(q)); if (x && waVendor(p.id, x.id, MD.msg(x.vendor))) { x.thankedAt = today(); log(p, `נשלחה הודעת תודה ל${x.vendor}`); save(); thanks(p.id); } break; }
      case "ai-compare": aiCompare(id); break;
      case "ask": ask(id, el.getAttribute("data-i")); break;
      case "pdf": pdf(id); break;
      case "pick-ok": pickOk(); break;
    }
  });
  document.addEventListener("change", e => {
    const t = e.target; if (!t) return;
    if (t.id === "pjSort") { U.sort = t.value; try { localStorage.setItem("pj-sort", t.value); } catch (er) {} render(); }
    if (t.matches && t.matches("[data-pj-sel]") && MD && MD.kind === "req") {
      const cid = Number(t.getAttribute("data-pj-sel")) || t.getAttribute("data-pj-sel");
      if (t.checked) MD.sel.add(cid); else MD.sel.delete(cid);
      const b = document.getElementById("pjReqNext"); if (b) b.textContent = MD.sel.size ? `המשך עם ${MD.sel.size} ספקים` : "בחירת ספקים";
    }
  });
  document.addEventListener("input", e => {
    const t = e.target; if (!t) return;
    if (t.id === "pjSearch") { U.q = t.value; clearTimeout(U._t); U._t = setTimeout(() => { render(); const s = document.getElementById("pjSearch"); if (s) { s.focus(); try { s.setSelectionRange(s.value.length, s.value.length); } catch (er) {} } }, 160); }
    if (t.id === "pjReqQ" || t.id === "pjLtQ") {
      const qv = norm(t.value), box = document.getElementById(t.id === "pjReqQ" ? "pjReqList" : "pjLtList"); if (!box) return;
      box.querySelectorAll("label").forEach(l => { const k = l.getAttribute("data-k") || norm(l.textContent); l.style.display = !qv || k.includes(qv) ? "" : "none"; });
    }
  });
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches || !f.matches("[data-pj-form]")) return;
    e.preventDefault();
    const p = getP(U.openId); const inp = document.getElementById("pjNote");
    if (p && inp && inp.value.trim()) { log(p, inp.value.trim()); save(); renderDrawer(); setTimeout(() => { const i = document.getElementById("pjNote"); if (i) i.focus(); }, 30); }
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const m = document.getElementById("pjModal");
    if (m && m.classList.contains("show")) { if (MD && MD.kind === "busy") return; closeModal(); return; }
    if (U.openId != null) closeDrawer();
  });
  document.addEventListener("click", e => { const m = document.getElementById("pjModal"); if (m && e.target === m && MD && MD.kind !== "busy") closeModal(); });

  /* ---------- חשיפה גלובלית ---------- */
  window.renderProjects = render;
  window.addProject = () => editProject(null);
  window.pjNew = () => editProject(null);
  window.pjOpen = (id, tab) => open(id, tab);
  window.pjFromFile = fromFile;
  window.pjRequest = () => { const act = visible().filter(p => !isArch(p)); if (act.length === 1) requestQuotes(act[0].id); else toast("פותחים פרויקט ולוחצים \"בקשת הצעות\""); };
})();
