/* ======================================================================
   הקלטה קולית (נובמבר 2026) – למנהל בלבד
   - מקליטים משפט ("יש נזילה בשירותים בקומה 2, לשלוח לשלמה חיים, דחוף, להזכיר לי ביום ראשון").
   - התמלול נעשה בדפדפן עצמו (זיהוי דיבור של הטלפון). ההקלטה לא נשמרת ולא נשלחת – רק הטקסט.
   - הסוכן (שרת /api/ai) מבין מה זה: משימת תפעול, משימה שלי, או רכש – ומציע.
   - שום דבר לא נשמר עד שלוחצים "צור". אפשר לתקן כל שדה לפני.
   - אם הטלפון לא תומך בזיהוי דיבור – אפשר להקליד את אותו משפט, והסוכן מבין באותה דרך.
   ====================================================================== */
(function(){
  "use strict";
  if (window.shVoice) return;

  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var isAdmin = function(){ try { return currentRole === "admin"; } catch (e) { return false; } };   // eslint-disable-line no-undef
  var sheet = function(h){ return window.shSheet ? window.shSheet(h) : null; };
  var close = function(){ if (window.shClose) window.shClose(); };
  var note = function(m){ if (window.shNote) window.shNote(m); };
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var X = '<button class="sh-x" type="button" data-sh-close aria-label="סגירה"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  var IC = {
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    who: '<circle cx="9" cy="8" r="3.3"/><path d="M3.5 19c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3"/><circle cx="17" cy="8.5" r="2.6"/><path d="M16 13.8c2.7.1 4.6 2.2 4.6 5"/>',
    place: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.6l1.2-1.1 1.8.9-.4 1.5c-3.6.3-7.6-3.7-7.3-7.3l1.5-.4.9 1.8z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  var ic = function(n, s){ return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || "") + '</svg>'; };

  function css(){
    if (document.getElementById("vcCss")) return;
    var s = document.createElement("style"); s.id = "vcCss";
    s.textContent =
      '.vc-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}.vc-h b{font-family:"Suez One",Rubik,serif;font-weight:400;font-size:20px}.vc-h span{font-weight:700;color:#645c50;font-variant-numeric:tabular-nums}' +
      '.vc-bars{display:flex;justify-content:center;align-items:center;gap:4px;height:64px;margin:6px 0}.vc-bars i{width:5px;border-radius:5px;background:#c67139;height:8px;transition:height .12s}' +
      '.vc-bars.idle i{background:#d9d1c4}' +
      '.vc-tx{width:100%;min-height:76px;background:#fff;border-radius:14px;padding:12px;font:inherit;font-size:15px;line-height:1.5;border:1.5px solid rgba(32,30,29,.12);resize:vertical;box-sizing:border-box;color:#201e1d}' +
      '.vc-tip{font-size:12px;color:#7a7166;margin:6px 2px 0}' +
      '.vc-row{display:flex;gap:8px;margin-top:12px}.vc-btn{flex:1;height:50px;border:none;border-radius:14px;font-family:inherit;font-size:14.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}' +
      '.vc-btn.dark{background:#2b2723;color:#fff}.vc-btn.soft{background:#eee7db;color:#201e1d;flex:0 0 auto;padding:0 16px}.vc-btn[disabled]{opacity:.55;cursor:default}' +
      '.vc-mic{width:72px;height:72px;border-radius:50%;border:none;background:#c67139;color:#fff;display:flex;align-items:center;justify-content:center;margin:8px auto 0;cursor:pointer;box-shadow:0 8px 20px rgba(198,113,57,.35)}' +
      '.vc-mic.rec{animation:vcPulse 1.2s ease-in-out infinite}@keyframes vcPulse{50%{box-shadow:0 0 0 12px rgba(198,113,57,.15)}}' +
      '.vc-sec{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#645c50;margin:14px 2px 8px}' +
      '.vc-card{background:#fff;border-radius:16px;padding:4px 12px;box-shadow:0 1px 2px rgba(46,43,37,.10)}' +
      '.vc-f{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid rgba(32,30,29,.08)}.vc-f:first-child{border-top:none}' +
      '.vc-fi{width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}' +
      '.vc-f label{width:66px;font-size:12px;color:#645c50;flex:0 0 auto}' +
      '.vc-f input,.vc-f select{flex:1;min-width:0;height:38px;border:1.5px solid rgba(32,30,29,.12);border-radius:10px;padding:0 10px;font:inherit;font-size:14px;font-weight:600;background:#fbf7f0;color:#201e1d}' +
      '.vc-seg{display:flex;background:#eee7db;border-radius:12px;padding:3px;gap:2px}.vc-seg button{flex:1;border:none;background:none;border-radius:9px;padding:7px 4px;font:inherit;font-size:12.5px;font-weight:700;color:#645c50;cursor:pointer}' +
      '.vc-seg button.on{background:#fff;color:#201e1d;box-shadow:0 1px 3px rgba(0,0,0,.1)}' +
      '.vc-urg{display:flex;gap:6px;flex:1}.vc-urg button{flex:1;height:36px;border-radius:10px;border:1.5px solid rgba(32,30,29,.12);background:#fbf7f0;font:inherit;font-size:13px;font-weight:700;color:#645c50;cursor:pointer}' +
      '.vc-urg button.on{background:#fde3e1;border-color:#f3b8b2;color:#d6362f}.vc-urg button.on.n{background:#e8f3ec;border-color:#bfe0cb;color:#18864c}' +
      '.vc-wait{display:flex;align-items:center;gap:10px;justify-content:center;padding:24px 0;color:#645c50;font-weight:600}' +
      '.vc-spin{width:22px;height:22px;border-radius:50%;border:3px solid #eee7db;border-top-color:#c67139;animation:vcSpin .8s linear infinite}@keyframes vcSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  function contacts(){ try { return getContactNames() || []; } catch (e) { return []; } }   // eslint-disable-line no-undef
  function todayIso(){ try { return tkToday(); } catch (e) { return new Date().toISOString().slice(0, 10); } }   // eslint-disable-line no-undef
  function contactOf(name){ try { return name ? findContactByName(name) : null; } catch (e) { return null; } }   // eslint-disable-line no-undef

  /* ---------- שלב 1: הקלטה ---------- */
  window.shVoice = function(){
    if (!isAdmin()) return;
    css();
    var bars = ""; for (var i = 0; i < 22; i++) bars += "<i></i>";
    var sh = sheet('<div class="sh-head"><div><h3>הקלטה קולית</h3><div style="font-size:12.5px;color:#645c50">אמור מה צריך לעשות – הסוכן יציע, ואתה מאשר</div></div>' + X + '</div>' +
      '<div class="vc-h"><b id="vcState">' + (SR ? "מקליט…" : "כתוב מה רצית להגיד") + '</b><span id="vcTime">0:00</span></div>' +
      (SR ? '<div class="vc-bars" id="vcBars">' + bars + '</div>' : '') +
      '<textarea class="vc-tx" id="vcText" placeholder="' + (SR ? "מה שתגיד יופיע כאן. אפשר גם לתקן בכתב." : "למשל: יש נזילה בשירותים בקומה 2, לשלוח לשלמה חיים, דחוף, להזכיר לי ביום ראשון") + '"></textarea>' +
      '<div class="vc-tip">' + (SR ? "למשל: \"נזילה בשירותים קומה 2, לשלוח לשלמה חיים, דחוף, להזכיר לי ביום ראשון\"" : "הטלפון הזה לא תומך בהקלטה – אפשר להקליד או ללחוץ על המיקרופון במקלדת") + '</div>' +
      (SR ? '<button type="button" class="vc-mic rec" id="vcMic" aria-label="עצירה">' + ic("mic", 30) + '</button>' : '') +
      '<div class="vc-row"><button type="button" class="vc-btn dark" id="vcGo">' + ic("spark", 18) + 'הסוכן יבין</button><button type="button" class="vc-btn soft" data-sh-close>ביטול</button></div>');
    if (!sh) return;
    var ta = sh.querySelector("#vcText"), mic = sh.querySelector("#vcMic"), barsEl = sh.querySelector("#vcBars");
    var rec = null, on = false, finalTx = "", t0 = Date.now(), timer = null, levels = null, stream = null, raf = null;

    function setState(t){ var el = sh.querySelector("#vcState"); if (el) el.textContent = t; }
    function stop(){
      on = false;
      try { rec && rec.stop(); } catch (e) {}
      clearInterval(timer); cancelAnimationFrame(raf);
      try { stream && stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
      if (mic) { mic.classList.remove("rec"); mic.setAttribute("aria-label", "המשך הקלטה"); }
      if (barsEl) { barsEl.classList.add("idle"); barsEl.querySelectorAll("i").forEach(function(b){ b.style.height = "8px"; }); }
      setState(ta.value.trim() ? "אפשר לתקן ואז להמשיך" : "לא נקלט דיבור – נסה שוב או כתוב");
    }
    function start(){
      if (!SR) return;
      on = true; finalTx = ta.value.trim() ? ta.value.trim() + " " : "";
      if (mic) { mic.classList.add("rec"); mic.setAttribute("aria-label", "עצירה"); }
      if (barsEl) barsEl.classList.remove("idle");
      setState("מקליט…"); t0 = Date.now();
      clearInterval(timer);
      timer = setInterval(function(){ var s = Math.floor((Date.now() - t0) / 1000), el = sh.querySelector("#vcTime"); if (el) el.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); if (!document.body.contains(sh)) stop(); }, 500);
      rec = new SR(); rec.lang = "he-IL"; rec.continuous = true; rec.interimResults = true;
      rec.onresult = function(ev){
        var interim = "";
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) finalTx += ev.results[i][0].transcript.trim() + " ";
          else interim += ev.results[i][0].transcript;
        }
        ta.value = (finalTx + interim).trim();
      };
      rec.onerror = function(ev){
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed" || ev.error === "audio-capture") {
          on = false; stop(); setState("אין גישה למיקרופון");
          var tip = sh.querySelector(".vc-tip"); if (tip) { tip.textContent = "צריך לאשר לדפדפן גישה למיקרופון (בהגדרות האתר). בינתיים אפשר להקליד כאן, או ללחוץ על המיקרופון שבמקלדת."; tip.style.color = "#b86e00"; }
          try { ta.focus(); } catch (e) {}
        }
      };
      rec.onend = function(){ if (on && document.body.contains(sh)) { try { rec.start(); } catch (e) { stop(); } } };   // אנדרואיד עוצר אחרי שקט – ממשיכים
      try { rec.start(); } catch (e) { stop(); }
      /* גלים לפי עוצמת הקול (רק להצגה – הקול לא נשמר) */
      try {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(st){
          if (!on) { st.getTracks().forEach(function(t){ t.stop(); }); return; }
          stream = st; var ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 64;
          ctx.createMediaStreamSource(st).connect(an); levels = new Uint8Array(an.frequencyBinCount);
          var bs = barsEl ? barsEl.querySelectorAll("i") : [];
          (function loop(){ if (!on) { try { ctx.close(); } catch (e) {} return; } an.getByteFrequencyData(levels); bs.forEach(function(b, i){ b.style.height = Math.max(6, Math.min(56, levels[(i % 16) + 1] / 4.5)) + "px"; }); raf = requestAnimationFrame(loop); })();
        }).catch(function(){});
      } catch (e) {}
    }
    if (mic) mic.addEventListener("click", function(){ if (on) stop(); else start(); });
    sh.querySelector("#vcGo").addEventListener("click", function(){
      if (on) stop();
      var text = ta.value.trim();
      if (!text) { setState("לא נקלט כלום עדיין"); return; }
      understand(text);
    });
    if (SR) start(); else setTimeout(function(){ ta.focus(); }, 200);
  };

  /* ---------- שלב 2: הסוכן מבין ---------- */
  async function understand(text){
    var sh = sheet('<div class="sh-head"><div><h3>הסוכן מבין…</h3></div>' + X + '</div><div style="background:#fff;border-radius:14px;padding:12px;font-size:15px;line-height:1.5">"' + esc(text) + '"</div><div class="vc-wait"><span class="vc-spin"></span>רגע אחד</div>');
    var d = new Date(), wd = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"][d.getDay()];
    var hint = "התאריך היום: " + todayIso() + " (יום " + wd + "). אנשי הקשר במערכת: " + contacts().slice(0, 150).join(" | ");
    var res = null;
    try { res = await window.aiCall("voice", [{ type: "text", text: text }], hint); } catch (e) { res = { ok: false, error: e.message }; }
    if (!document.body.contains(sh)) return;   // נסגר בינתיים
    var v = res && res.ok && res.data ? res.data : null;
    if (!v) {
      /* בלי סוכן: משימה עם הטקסט כמו שהוא – עדיין אפשר לתקן ולאשר */
      v = { kind: "ops_task", title: text.slice(0, 80), notes: "" };
      review(text, v, (res && res.error) || "הסוכן לא זמין כרגע");
    } else review(text, v, "");
  }

  /* ---------- שלב 3: "הסוכן הבין" – אפשר לתקן, ואז צור ---------- */
  function review(text, v, warn){
    var names = contacts(), kind = v.kind || "ops_task";
    var urgent = !!v.urgent;
    var opt = function(n){ return '<option value="' + esc(n) + '"' + (n === v.assignee ? " selected" : "") + '>' + esc(n) + '</option>'; };
    var items = Array.isArray(v.items) ? v.items : [];
    var title = v.title || "";
    if (kind === "purchase" && items.length && !title) title = "להזמין: " + items.map(function(x){ return x.name + (x.qty ? " " + x.qty + (x.unit ? " " + x.unit : "") : ""); }).join(", ");
    var sh = sheet('<div class="sh-head"><div><h3>הסוכן הבין</h3><div style="font-size:12.5px;color:#645c50">תקן אם צריך – שום דבר לא נשמר עד שתלחץ "צור"</div></div>' + X + '</div>' +
      '<div style="background:#fff;border-radius:14px;padding:10px 12px;font-size:13.5px;line-height:1.5;color:#645c50">"' + esc(text) + '"</div>' +
      (warn ? '<div class="vc-tip" style="color:#b86e00">' + esc(warn) + ' – מילאתי מהטקסט, אפשר לתקן.</div>' : '') +
      '<div class="vc-sec">' + ic("spark", 15) + ' מה ליצור</div>' +
      '<div class="vc-seg" id="vcKind"><button type="button" data-k="ops_task">משימת תפעול</button><button type="button" data-k="my_task">משימה שלי</button><button type="button" data-k="purchase">רכש</button></div>' +
      '<div class="vc-card" style="margin-top:10px">' +
        '<div class="vc-f"><span class="vc-fi" style="background:#6c4fd81c;color:#6c4fd8">' + ic("task", 16) + '</span><label>מה</label><input id="vcTitle" value="' + esc(title) + '"></div>' +
        '<div class="vc-f vc-ops"><span class="vc-fi" style="background:#5f7f3a1c;color:#5f7f3a">' + ic("place", 16) + '</span><label>איפה</label><input id="vcPlace" value="' + esc(v.place || "") + '" placeholder="לא נאמר"></div>' +
        '<div class="vc-f vc-ops"><span class="vc-fi" style="background:#e07a1f1c;color:#e07a1f">' + ic("who", 16) + '</span><label>איש מקצוע</label><select id="vcWho"><option value="">לא שובץ</option>' + names.map(opt).join("") + '</select></div>' +
        '<div class="vc-f"><span class="vc-fi" style="background:#d6362f1c;color:#d6362f">' + ic("alert", 16) + '</span><label>דחיפות</label><div class="vc-urg" id="vcUrg"><button type="button" class="n" data-u="0">רגיל</button><button type="button" data-u="1">דחוף</button></div></div>' +
        '<div class="vc-f"><span class="vc-fi" style="background:#2f74d01c;color:#2f74d0">' + ic("cal", 16) + '</span><label>עד מתי</label><input id="vcDue" type="date" value="' + esc(v.due || "") + '"></div>' +
        '<div class="vc-f vc-ops"><span class="vc-fi" style="background:#d991001c;color:#d99100">' + ic("clock", 16) + '</span><label>תזכורת לי</label><input id="vcRemind" type="date" value="' + esc(v.remind || "") + '"></div>' +
      '</div>' +
      (v.notes ? '<div class="vc-tip">פרטים נוספים שייכנסו להערות: ' + esc(v.notes) + '</div>' : '') +
      '<div class="vc-row" id="vcActs"></div>');
    if (!sh) return;
    function setKind(k){
      kind = k;
      sh.querySelectorAll("#vcKind button").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-k") === k); });
      sh.querySelectorAll(".vc-ops").forEach(function(r){ r.style.display = k === "ops_task" ? "" : "none"; });
      acts();
    }
    function setUrg(u){ urgent = u; sh.querySelectorAll("#vcUrg button").forEach(function(b){ b.classList.toggle("on", (b.getAttribute("data-u") === "1") === u); }); }
    function acts(){
      var who = sh.querySelector("#vcWho").value, c = contactOf(who), first = who ? who.split(/\s+/)[0] : "";
      var box = sh.querySelector("#vcActs");
      box.innerHTML = kind === "ops_task" && c && c.phone
        ? '<button type="button" class="vc-btn dark" data-go="send">' + ic("wa", 18) + 'צור ושלח ל' + esc(first) + '</button><button type="button" class="vc-btn soft" data-go="make">' + ic("check", 17) + 'רק צור</button>'
        : '<button type="button" class="vc-btn dark" data-go="make">' + ic("check", 18) + 'צור</button><button type="button" class="vc-btn soft" data-sh-close>ביטול</button>';
    }
    sh.querySelector("#vcKind").addEventListener("click", function(e){ var b = e.target.closest("button"); if (b) setKind(b.getAttribute("data-k")); });
    sh.querySelector("#vcUrg").addEventListener("click", function(e){ var b = e.target.closest("button"); if (b) setUrg(b.getAttribute("data-u") === "1"); });
    sh.querySelector("#vcWho").addEventListener("change", acts);
    sh.querySelector("#vcActs").addEventListener("click", function(e){
      var b = e.target.closest("[data-go]"); if (!b) return;
      b.disabled = true;
      create(kind, {
        title: sh.querySelector("#vcTitle").value.trim(), place: sh.querySelector("#vcPlace").value.trim(), who: sh.querySelector("#vcWho").value,
        urgent: urgent, due: sh.querySelector("#vcDue").value, remind: sh.querySelector("#vcRemind").value,
        notes: v.notes || "", myType: v.my_type, said: text
      }, b.getAttribute("data-go") === "send");
    });
    setKind(["ops_task", "my_task", "purchase"].indexOf(kind) >= 0 ? kind : "ops_task");
    setUrg(urgent);
  }

  /* ---------- שלב 4: יצירה – דרך הפונקציות הרגילות של האפליקציה ---------- */
  function create(kind, f, send){
    if (!f.title) { note("צריך לכתוב מה המשימה"); return; }
    try {
      if (kind === "ops_task") {
        var c = contactOf(f.who);
        var t = tkNewTask({ desc: f.title, due: f.due, prio: f.urgent ? 1 : 2, assignee: f.who, place: f.place,   // eslint-disable-line no-undef
          category: c && c.specialty ? c.specialty : "", notes: f.notes, schoolYear: tkCurrentYearValue() });   // eslint-disable-line no-undef
        t.log = [{ d: todayIso(), t: "נפתחה בהקלטה קולית: \"" + f.said.slice(0, 200) + "\"" }];
        tkSave();                                                                                    // eslint-disable-line no-undef
        if (f.remind) mtAdd({ title: "לבדוק: " + f.title + (f.who ? " (" + f.who + ")" : ""), type: "general", due: f.remind });   // eslint-disable-line no-undef
        close();
        try { renderTasks(); } catch (e) {}                                                         // eslint-disable-line no-undef
        try { renderDashboard(); } catch (e) {}                                                     // eslint-disable-line no-undef
        if (send) {
          if (tkWhatsApp(t, buildTaskMessageText(t), "נשלחה הודעת וואטסאפ ל" + t.assignee)) { t.sentAt = todayIso(); tkSave(); }   // eslint-disable-line no-undef
        }
        try { jobToast("נוספה משימה " + tkCode(t)); } catch (e) {}                                  // eslint-disable-line no-undef
      } else {
        var type = kind === "purchase" ? "buy" : (f.myType || "general");
        mtAdd({ title: f.title, type: type, due: f.due || f.remind || "", star: f.urgent });         // eslint-disable-line no-undef
        close();
        try { mtRender(); } catch (e) {}                                                            // eslint-disable-line no-undef
        try { showToast(kind === "purchase" ? "נוסף לרשימה שלך: " + f.title : "נוספה משימה שלך"); } catch (e) {}   // eslint-disable-line no-undef
      }
    } catch (e) {
      console.error(e);
      note("היצירה לא הצליחה: " + (e.message || e) + "\nשום דבר לא נשמר.");
    }
  }
})();
