/* ======================================================================
   סוכן ה-AI בתוך האפליקציה (נובמבר 2026)
   - aiRead(): שולח קובץ (PDF / תמונה / סריקה) לשרת /api/ai ומחזיר הצעה.
     הקובץ לא נשמר בשרת. מפתח ה-AI נמצא רק ב-Netlify.
   - shAI(): הכפתור "צלם או העלה מסמך" בכפתור + : קורא, מציג "כך זה יישמר",
     ורק אחרי לחיצה של המשתמש שומר – בדיוק כמו העלאה רגילה בחשבוניות וקבלות
     (ואז נפתח חלון השיוך הרגיל). מחירון עובר לייבוא המחירון הרגיל.
   הסוכן עצמו לא שומר, לא מוחק ולא משנה שום רשומה.
   ====================================================================== */
(function(){
  "use strict";
  if (window.aiRead) return;

  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var norm = function(s){ return String(s == null ? "" : s).toLowerCase().replace(/[֑-ׇ"'״׳`.,\-()]/g, " ").replace(/\s+/g, " ").trim(); };
  var D = function(){ try { return data; } catch (e) { return null; } };                     // eslint-disable-line no-undef
  var isAdmin = function(){ try { return currentRole === "admin"; } catch (e) { return false; } }; // eslint-disable-line no-undef
  var fn = function(name){ try { var f = eval(name); return typeof f === "function" ? f : null; } catch (e) { return null; } };

  /* ---------- הכנת הקובץ לשליחה ---------- */
  function toB64(buf){
    var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf), s = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function imageToJpeg(file, maxSide){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function(){
        var k = Math.min(1, (maxSide || 1800) / Math.max(img.width, img.height));
        var cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        var g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function(b){ if (!b) return rej(new Error("img")); b.arrayBuffer().then(function(ab){ res(toB64(ab)); }); }, "image/jpeg", 0.85);
      };
      img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error("לא הצלחתי לפתוח את התמונה")); };
      img.src = url;
    });
  }
  async function pdfPageCount(buf){
    var load = fn("loadPdfJs"); if (!load) return 0;
    try { var lib = await load(); var pdf = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise; var n = pdf.numPages; try { pdf.destroy(); } catch (e) {} return n; } catch (e) { return 0; }
  }
  /* מחזיר רשימת "חבילות" – כל חבילה היא בקשה אחת לשרת (עמוד אחד-שניים, כדי שכל בקשה תסתיים מהר) */
  async function chunks(file, task, step){
    var type = (file.type || "").toLowerCase(), name = (file.name || "").toLowerCase();
    if (/^image\//.test(type) || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) {
      step("מכין את התמונה…");
      return [[{ type: "image", mediaType: "image/jpeg", data: await imageToJpeg(file, 2000) }]];
    }
    if (type === "application/pdf" || /\.pdf$/.test(name)) {
      var buf = await file.arrayBuffer();
      var pages = await pdfPageCount(buf);
      var small = file.size < 3.2e6 && pages > 0 && pages <= (task === "document" ? 4 : 2);
      if (small || !fn("ttdPdfToJpegs")) {
        if (file.size > 4.2e6) throw new Error("קובץ ה-PDF גדול מדי. נסה לצלם את העמודים או לשלוח קובץ קטן יותר");
        return [[{ type: "pdf", data: toB64(buf) }]];
      }
      step("מכין " + pages + " עמודים…");
      var r = await fn("ttdPdfToJpegs")(buf);
      var imgs = r.pages.map(function(p){ return { type: "image", mediaType: "image/jpeg", data: toB64(p.buf) }; });
      if (task === "document") return [imgs.slice(0, 4)];
      var out = []; for (var i = 0; i < imgs.length; i += 2) out.push(imgs.slice(i, i + 2));
      return out;
    }
    throw new Error("אפשר לשלוח לסוכן PDF או תמונה. קובץ אקסל נקרא ישירות ב'קובץ אקסל / PDF'");
  }

  async function callServer(task, parts, hint){
    var u = null; try { u = firebase.auth().currentUser; } catch (e) {}                        // eslint-disable-line no-undef
    if (!u) return { ok: false, error: "צריך להיות מחובר לאפליקציה" };
    var token = await u.getIdToken();
    var r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json", "authorization": "Bearer " + token },
      body: JSON.stringify({ task: task, parts: parts, hint: hint || "" }) });
    var txt = (await r.text()).trim();
    try { return JSON.parse(txt); } catch (e) { return { ok: false, error: r.status === 504 ? "הקריאה לקחה יותר מדי זמן. נסה עמוד אחד בכל פעם" : "תשובה לא תקינה מהשרת (" + r.status + ")" }; }
  }

  /* aiRead({task:'pricelist'|'document', file, hint, onStep}) → {ok, data, error} */
  window.aiRead = async function(o){
    var step = o.onStep || function(){};
    var task = o.task === "document" ? "document" : "pricelist";
    var list;
    try { list = await chunks(o.file, task, step); } catch (e) { return { ok: false, error: e.message || "לא הצלחתי להכין את הקובץ" }; }
    if (task === "document") { step("הסוכן קורא את המסמך…"); return callServer(task, list[0], o.hint); }
    var results = new Array(list.length), done = 0, next = 0;
    step(list.length > 1 ? "הסוכן קורא " + list.length + " חלקים במקביל…" : "הסוכן קורא את המחירון…");
    async function worker(){
      while (next < list.length) {
        var i = next++;
        var res = await callServer(task, list[i], o.hint);
        if (!res.ok) res = await callServer(task, list[i], o.hint);   // ניסיון שני אחד
        results[i] = res; done++;
        if (list.length > 1) step("נקראו " + done + " מתוך " + list.length + " חלקים…");
      }
    }
    var workers = []; for (var w = 0; w < Math.min(3, list.length); w++) workers.push(worker());
    await Promise.all(workers);
    var bad = results.filter(function(r){ return !r || !r.ok; });
    if (bad.length === results.length) return bad[0] || { ok: false, error: "הקריאה נכשלה" };
    var merged = { supplier: "", list_date: "", prices_include_vat: null, items: [] }, seen = {};
    results.forEach(function(r){
      if (!r || !r.ok || !r.data) return;
      var d = r.data;
      if (!merged.supplier && d.supplier) merged.supplier = d.supplier;
      if (!merged.list_date && d.list_date) merged.list_date = d.list_date;
      if (merged.prices_include_vat === null && typeof d.prices_include_vat === "boolean") merged.prices_include_vat = d.prices_include_vat;
      (d.items || []).forEach(function(it){
        if (!it || !it.name || !(Number(it.price) > 0)) return;
        var k = norm(it.name) + "|" + (it.sku || "") + "|" + it.price;
        if (seen[k]) return; seen[k] = 1; merged.items.push(it);
      });
    });
    return { ok: true, data: merged, partial: bad.length ? bad.length + " מתוך " + results.length + " חלקים לא נקראו" : "" };
  };

  /* ---------- מחירון → שורות טבלה לייבוא הרגיל ---------- */
  window.aiPriceRows = function(d){
    var rows = [["תיאור פריט", "מק\"ט", "ברקוד", "כמות בקרטון", "מחיר ליחידה", "מחיר לקרטון", "יחידת מידה"]];
    (d.items || []).forEach(function(it){
      var price = Number(it.price) || 0; if (!(price > 0) || !it.name) return;
      var su = it.sell_unit || "יחידה", pack = Number(it.units_per_pack) || 0;
      var isPack = su === "קרטון" || su === "מארז";
      var unit = su === "ק\"ג" || su === "ליטר" ? su : "יחידה";
      rows.push([String(it.name).trim(), it.sku || "", it.barcode || "",
        isPack && pack > 1 ? String(pack) : "", isPack ? "" : String(price), isPack ? String(price) : "", unit]);
    });
    return rows;
  };

  /* ---------- הכפתור בכפתור + : צלם או העלה מסמך ---------- */
  var DOC_TYPES = { invoice: "חשבונית", receipt: "קבלה", invoice_receipt: "קבלה", work_confirmation: "אחר" };
  var TOPICS = ["בטיחות", "ביטחון", "מטבח", "רכוש כללי", "תחזוקה", "אחר"];
  var TAB_TOPIC = { licensing: "בטיחות", procurement: "מטבח", equipment: "תחזוקה", tasks: "תחזוקה" };

  function pickFile(){
    return new Promise(function(res){
      var i = document.createElement("input"); i.type = "file"; i.accept = "image/*,application/pdf"; i.style.display = "none";
      i.addEventListener("change", function(){ var f = i.files && i.files[0]; i.remove(); res(f || null); });
      document.body.appendChild(i); i.click();
    });
  }
  function sheet(html){ return window.shSheet ? window.shSheet(html) : null; }
  function close(){ if (window.shClose) window.shClose(); }
  var X = '<button class="sh-x" type="button" data-sh-close aria-label="סגירה"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';

  function similar(a, b){ a = norm(a); b = norm(b); if (!a || !b) return false; if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
    var wa = a.split(" ").filter(function(w){ return w.length > 2; }); return wa.some(function(w){ return b.split(" ").indexOf(w) !== -1; }); }

  window.shAI = async function(tab){
    if (!isAdmin()) return;
    var file = await pickFile(); if (!file) return;
    var sh = sheet('<div class="sh-head"><h3>הסוכן קורא…</h3>' + X + '</div><div class="sh-empty" id="aiStep">מכין את הקובץ…</div>');
    var setStep = function(t){ var e = document.getElementById("aiStep"); if (e) e.textContent = t; };
    var hint = tab === "licensing" ? "המשתמש נמצא בטאב רישוי ובטיחות – סביר שזה אישור בודק או דוח ליקויים"
      : tab === "procurement" ? "המשתמש נמצא בטאב רכש ואספקה – סביר שזה מחירון או חשבונית של ספק" : "";
    var res = await window.aiRead({ task: "document", file: file, hint: hint, onStep: setStep });
    if (!sh || !document.body.contains(sh)) return;          // המשתמש סגר בינתיים
    if (!res || !res.ok) { sh.innerHTML = '<div class="sh-head"><h3>הקריאה לא הצליחה</h3>' + X + '</div><div class="sh-note"><p>' + esc((res && res.error) || "שגיאה") + '</p></div>'; return; }
    review(sh, res.data || {}, file, tab);
  };

  function review(sh, d, file, tab){
    var unc = (d.uncertain_fields || []).map(String);
    var f = function(lab, key, val){
      if (val == null || val === "") return "";
      var u = unc.indexOf(key) !== -1;
      return '<div style="background:' + (u ? "#fff8e8" : "#fff") + ';border:1.5px solid ' + (u ? "#f0c56a" : "rgba(32,30,29,.12)") + ';border-radius:12px;padding:7px 10px">' +
        '<div style="font-size:11px;font-weight:700;color:#645c50">' + esc(lab) + (u ? ' · <span style="color:#b86e00">בדוק</span>' : '') + '</div><div style="font-weight:600;font-size:14px">' + esc(val) + '</div></div>';
    };
    var money = function(n){ return n == null || n === "" ? "" : "₪" + Number(n).toLocaleString("he-IL", { maximumFractionDigits: 2 }); };
    var t = d.doc_type || "other";
    var html = '<div class="sh-head"><div><h3>הסוכן קרא את המסמך</h3><div style="font-size:12.5px;color:#645c50">שום דבר לא נשמר עד שתלחץ על כפתור למטה</div></div>' + X + '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><span class="sh-ico" style="background:#fde8f2;color:#d63f8c;width:38px;height:38px">✦</span><div><b>' + esc(d.doc_type_he || "מסמך") + '</b><div style="font-size:12px;color:#645c50">' + esc(file.name || "") + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' +
        f("ספק / גורם", "supplier", d.supplier) + f("תאריך", "date", d.date) + f("סכום", "total", money(d.total)) + f("מספר מסמך", "doc_number", d.doc_number) +
        f("בתוקף עד", "valid_until", d.valid_until) + f("בודק", "inspector", d.inspector) + '</div>' +
      (d.subject ? '<div style="margin-top:8px;font-size:13.5px;background:#fff;border-radius:12px;padding:8px 10px">' + esc(d.subject) + '</div>' : '');
    if (Array.isArray(d.defects) && d.defects.length) html += '<div class="sh-gt">ליקויים שנמצאו (' + d.defects.length + ')</div><div style="background:#fff;border-radius:12px;padding:6px 12px;font-size:13px">' + d.defects.map(function(x){ return '<div style="padding:5px 0;border-top:1px solid rgba(32,30,29,.08)">• ' + esc(x) + '</div>'; }).join("") + '</div>';

    var acts = [];
    var dd = D() || {};
    if (DOC_TYPES[t]) {
      var tasks = (dd.tasks || []).filter(function(x){ return x && x.status !== "בוצע" && similar(x.assignee, d.supplier); }).slice(0, 3);
      if (tasks.length) html += '<div class="sh-gt">משימות פתוחות של הספק</div><div style="background:#fff;border-radius:12px;padding:4px 12px;font-size:13px">' + tasks.map(function(x){ return '<div style="padding:6px 0;border-top:1px solid rgba(32,30,29,.08)"><b>#' + esc(x.taskNumber || "") + '</b> ' + esc(x.desc || "") + '</div>'; }).join("") + '<div style="font-size:12px;color:#645c50;padding:4px 0 6px">בשלב הבא ייפתח חלון השיוך הרגיל, ושם תבחר את המשימה</div></div>';
      var topic = TAB_TOPIC[tab] || "תחזוקה";
      html += '<div class="sh-gt">איך לשמור</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#645c50">נושא<select id="aiTopic" style="height:42px;border-radius:12px;border:1.5px solid rgba(32,30,29,.16);padding:0 8px;font-family:inherit;font-size:14px">' + TOPICS.map(function(x){ return '<option' + (x === topic ? " selected" : "") + '>' + x + '</option>'; }).join("") + '</select></label>' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#645c50">סוג המסמך<select id="aiDocType" style="height:42px;border-radius:12px;border:1.5px solid rgba(32,30,29,.16);padding:0 8px;font-family:inherit;font-size:14px">' +
          [["חשבונית", "חשבונית (דורש תשלום)"], ["קבלה", "קבלה (כבר שולם)"], ["אחר", "אחר (למשל אישור עבודה)"]].map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === DOC_TYPES[t] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select></label></div>';
      acts.push({ id: "save", l: "שמור בחשבוניות וקבלות ושייך", main: true });
    } else if (t === "price_list") {
      html += '<div class="sh-gt">זה מחירון</div><div style="font-size:13px">אפשר להעביר אותו לייבוא המחירון. שם תראה כל פריט לפני שמירה.</div>';
      acts.push({ id: "plist", l: "לקרוא כמחירון", main: true });
    } else if (t === "inspection_certificate" || t === "defects_report") {
      var lic = (dd.licensing || []).filter(function(r){ return r && !r.renewedToId && (similar(r.inspector, d.inspector || d.supplier) || similar(r.name, d.subject) || similar(r.type, d.subject)); }).slice(0, 3);
      if (lic.length) html += '<div class="sh-gt">אישורים שנראים קשורים</div>' + lic.map(function(r, i){ return '<button class="sh-res" type="button" data-ai-lic="' + i + '" style="background:#fff;border-radius:12px;margin-bottom:6px"><span style="flex:1"><b>' + esc(r.name || r.type || "אישור") + '</b><small>' + esc([r.inspector, r.expiry ? "תוקף נוכחי " + r.expiry : ""].filter(Boolean).join(" · ")) + '</small></span><span class="sh-side">פתח</span></button>'; }).join("");
      html += '<div style="font-size:12.5px;color:#645c50;margin-top:6px">בשלב זה פותחים את האישור ומעדכנים בו את התוקף. עדכון אוטומטי של התוקף יגיע בשלב הבא.</div>';
      acts.push({ id: "lic", l: "לטאב רישוי ובטיחות" });
      acts.push({ id: "saveOther", l: "שמור את הקובץ בחשבוניות וקבלות" });
      sh._lic = lic;
    } else if (t === "quote") {
      html += '<div class="sh-gt">הצעת מחיר</div><div style="font-size:13px">הצעה של ספק עם רשימת מוצרים ומחירים אפשר לייבא למחירונים, כמו מחירון רגיל.</div>';
      acts.push({ id: "plist", l: "לייבא למחירונים", main: true });
      acts.push({ id: "proj", l: "לטאב פרויקטים" });
      acts.push({ id: "saveOther", l: "שמור את הקובץ בחשבוניות וקבלות" });
    } else {
      acts.push({ id: "saveOther", l: "שמור בחשבוניות וקבלות", main: true });
    }
    /* "למקום אחר": כל יעד באפליקציה, גם אם הסוכן חשב שזה סוג אחר */
    var used = acts.map(function(a){ return a.id; });
    var other = [
      { id: "plist", l: "מחירונים (ייבוא מחירון)", ico: "🏷" },
      { id: used.indexOf("save") !== -1 ? "save" : "saveOther", l: "חשבוניות וקבלות", ico: "🧾" },
      { id: "lic", l: "רישוי ובטיחות", ico: "🛡" },
      { id: "proj", l: "פרויקטים", ico: "📁" },
      { id: "contact", l: "אנשי קשר וספקים", ico: "📇" },
      { id: "tasks", l: "משימות", ico: "✅" }
    ].filter(function(o){ return used.indexOf(o.id) === -1; });
    var needSel = !document.getElementById("aiTopic") && html.indexOf('id="aiTopic"') === -1;
    var otherHtml = '<details style="margin-top:12px;background:#fff;border-radius:14px;padding:4px 12px"><summary style="cursor:pointer;font-weight:700;font-size:13.5px;padding:9px 0">לייבא למקום אחר באפליקציה…</summary>' +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:4px 0 10px">' + other.map(function(o){
        return '<button type="button" data-ai-act="' + o.id + '" style="min-height:44px;border:1.5px solid rgba(32,30,29,.14);background:#fbf7f0;border-radius:12px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;justify-content:center"><span aria-hidden="true">' + o.ico + '</span>' + esc(o.l) + '</button>'; }).join("") + '</div>' +
      (needSel ? '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding-bottom:10px"><label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#645c50">נושא (לחשבוניות)<select id="aiTopic" style="height:40px;border-radius:12px;border:1.5px solid rgba(32,30,29,.16);padding:0 8px;font-family:inherit;font-size:14px">' + TOPICS.map(function(x){ return '<option' + (x === (TAB_TOPIC[tab] || "אחר") ? " selected" : "") + '>' + x + '</option>'; }).join("") + '</select></label>' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#645c50">סוג המסמך<select id="aiDocType" style="height:40px;border-radius:12px;border:1.5px solid rgba(32,30,29,.16);padding:0 8px;font-family:inherit;font-size:14px"><option value="אחר" selected>אחר</option><option value="חשבונית">חשבונית (דורש תשלום)</option><option value="קבלה">קבלה (כבר שולם)</option></select></label></div>' : '') +
      '</details>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">' + acts.map(function(a){
      return '<button type="button" data-ai-act="' + a.id + '" style="height:48px;border:none;border-radius:14px;font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer;' +
        (a.main ? "background:#2b2723;color:#fff" : "background:#eee7db;color:#201e1d") + '">' + esc(a.l) + '</button>'; }).join("") + '</div>' + otherHtml;
    sh.innerHTML = '<div class="sh-grab"></div>' + html;

    sh.onclick = async function(e){
      var lb = e.target.closest && e.target.closest("[data-ai-lic]");
      if (lb) { var row = (sh._lic || [])[Number(lb.getAttribute("data-ai-lic"))]; close(); setTimeout(function(){ try { switchTab("licensing"); fn("lcOpenEdit") && fn("lcOpenEdit")(row); } catch (er) {} }, 240); return; } // eslint-disable-line no-undef
      var b = e.target.closest && e.target.closest("[data-ai-act]"); if (!b || b.disabled) return;
      var id = b.getAttribute("data-ai-act");
      if (id === "lic") { close(); setTimeout(function(){ try { switchTab("licensing"); } catch (er) {} }, 240); return; }    // eslint-disable-line no-undef
      if (id === "contact") { close(); setTimeout(function(){ try { switchTab("contacts"); } catch (er) {} if (d.supplier && window.shOpenSearch) window.shOpenSearch(String(d.supplier).split(/[-–,]/)[0].trim()); }, 240); return; } // eslint-disable-line no-undef
      if (id === "tasks") { close(); setTimeout(function(){ try { switchTab("tasks"); } catch (er) {} if (d.supplier && window.shOpenSearch) window.shOpenSearch(String(d.supplier).split(/[-–,]/)[0].trim()); }, 240); return; } // eslint-disable-line no-undef
      if (id === "proj") { close(); setTimeout(function(){ try { switchTab("projects"); } catch (er) {} }, 240); return; }    // eslint-disable-line no-undef
      if (id === "plist") { close(); setTimeout(function(){ if (window.SP && SP.impAiStart) SP.impAiStart(file); }, 240); return; }
      if (id === "save" || id === "saveOther") {
        var topicEl = document.getElementById("aiTopic"), typeEl = document.getElementById("aiDocType");
        var topic = topicEl ? topicEl.value : (TAB_TOPIC[tab] || "אחר"), docType = typeEl ? typeEl.value : "אחר";
        b.disabled = true; b.textContent = "מעלה…";
        try {
          var path = "uploads/" + Date.now() + "_" + file.name;
          var ref = storage.ref().child(path);                                                   // eslint-disable-line no-undef
          await ref.put(file);
          var url = await ref.getDownloadURL();
          var rec = { id: nextId() + 13000, name: file.name, category: topic, docType: docType, url: url, uploadedAt: new Date().toISOString().slice(0, 10) }; // eslint-disable-line no-undef
          /* פרטים שהסוכן קרא – שדות נוספים בלבד, לא משנים שום שדה קיים */
          if (d.supplier) rec.aiSupplier = String(d.supplier);
          if (d.total != null && d.total !== "") rec.aiTotal = Number(d.total) || 0;
          if (d.date) rec.aiDate = String(d.date);
          if (d.doc_number) rec.aiDocNumber = String(d.doc_number);
          if (d.doc_type_he) rec.aiType = String(d.doc_type_he);
          data.files.unshift(rec);                                                               // eslint-disable-line no-undef
          scheduleSave("files", "filesSaved");                                                   // eslint-disable-line no-undef
          try { renderFiles(); } catch (er) {}                                                   // eslint-disable-line no-undef
          close();
          setTimeout(function(){
            try { switchTab("files"); } catch (er) {}                                            // eslint-disable-line no-undef
            if ((docType === "חשבונית" || docType === "קבלה") && fn("openJobAssignModal")) fn("openJobAssignModal")(rec.id);
            else if (fn("showToast")) fn("showToast")("הקובץ נשמר בחשבוניות וקבלות");
          }, 260);
        } catch (er) {
          console.error(er); b.disabled = false; b.textContent = "שמירה נכשלה – נסה שוב";
          if (window.shNote) window.shNote("ההעלאה נכשלה: " + (er && er.message || er));
        }
      }
    };
  }
})();
