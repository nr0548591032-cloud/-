/* Organic design line — behaviour layer.
   Loaded from index.html end of <body>. Touches nothing in the app's own code. */

/* ---- כרטסת מתקפלת בפלאפון ---- */
(function(){
  var MQ = window.matchMedia("(max-width:720px)");

  function decorate(tr){
    if(tr.classList.contains("total-row")) return;
    var cell = tr.querySelector("td.primary-field");
    if(!cell || cell.querySelector(".mob-toggle")) return;
    var tog = document.createElement("button");
    tog.type = "button";
    tog.className = "mob-toggle";
    tog.setAttribute("aria-label","פתיחה וסגירה");
    tog.textContent = tr.classList.contains("mob-open") ? "\u25B4" : "\u25BE";
    cell.appendChild(tog);
  }

  function scan(){
    if(!MQ.matches) return;
    var rows = document.querySelectorAll("table tbody tr");
    for(var i=0;i<rows.length;i++) decorate(rows[i]);
  }

  document.addEventListener("click", function(e){
    var tog = e.target.closest && e.target.closest(".mob-toggle");
    if(!tog) return;
    e.preventDefault(); e.stopPropagation();
    var tr = tog.closest("tr");
    if(!tr) return;
    tog.textContent = tr.classList.toggle("mob-open") ? "\u25B4" : "\u25BE";
  }, true);

  var pending = null;
  var mo = new MutationObserver(function(){
    if(pending) return;
    pending = requestAnimationFrame(function(){ pending = null; scan(); });
  });

  function start(){
    scan();
    mo.observe(document.body, { childList:true, subtree:true });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  if(MQ.addEventListener) MQ.addEventListener("change", scan);
})();

/* ---- קבוצות ומספרים בסרגל הצד ---- */
(function(){
  var GROUPS = [
    { before:"dashboard",   title:"שוטף" },
    { before:"procurement", title:"רכש וספקים" },
    { before:"accountant",  title:"כספים" },
    { before:"staff",       title:"תפעול" }
  ];

  function counts(){
    var out = {};
    try{
      var d = window.data;
      if(!d) return out;
      if(Array.isArray(d.tasks)){
        var open = d.tasks.filter(function(t){
          var s = (t && (t.status || t.state)) || "";
          return String(s).indexOf("בוצע") === -1 && String(s).indexOf("הושלם") === -1;
        }).length;
        if(open) out.tasks = { n:open, urgent:false };
      }
      if(Array.isArray(d.licensing)){
        var today = new Date();
        var late = d.licensing.filter(function(l){
          var x = l && (l.expiry || l.expiryDate || l.validUntil);
          if(!x) return false;
          var dt = new Date(x);
          return !isNaN(dt) && dt < today;
        }).length;
        if(late) out.licensing = { n:late, urgent:true };
      }
    }catch(err){}
    return out;
  }

  function apply(){
    var nav = document.getElementById("navBar");
    if(!nav) return;
    var btns = nav.querySelectorAll("button[data-tab]");
    if(!btns.length) return;

    GROUPS.forEach(function(g){
      var btn = nav.querySelector('button[data-tab="' + g.before + '"]');
      if(!btn) return;
      var prev = btn.previousElementSibling;
      if(prev && prev.classList.contains("nav-group-title")) return;
      var h = document.createElement("div");
      h.className = "nav-group-title";
      h.textContent = g.title;
      nav.insertBefore(h, btn);
    });

    var c = counts();
    btns.forEach(function(b){
      var old = b.querySelector(".nav-count");
      var info = c[b.dataset.tab];
      if(!info){ if(old) old.remove(); return; }
      var el = old || document.createElement("span");
      el.className = "nav-count" + (info.urgent ? " urgent" : "");
      el.textContent = info.n;
      if(!old) b.appendChild(el);
    });
  }

  var pending = null;
  function schedule(){
    if(pending) return;
    pending = requestAnimationFrame(function(){ pending = null; apply(); });
  }

  function start(){
    apply();
    var nav = document.getElementById("navBar");
    if(nav) new MutationObserver(schedule).observe(nav, { childList:true });
    setInterval(apply, 4000);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
