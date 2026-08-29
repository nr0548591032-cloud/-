/* Organic design line — mobile record controls (collapsible card).
   Loaded from index.html end of <body>. Safe to replace wholesale. */

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
