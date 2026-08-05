/*! MAXIM B컷 랭킹 배지 — 화보 상세페이지용 외부 스크립트 */
(function(){
  "use strict";
  var CFG = {
    dataUrl:  window.BCUT_RANK_DATAURL || "https://bcutrank.com/data.json",
    rankSite: window.BCUT_RANK_SITE    || "https://bcutrank.com/",
    mountId:  "bcut-rank",
    topN:     20,
    showLink: true
  };
  function getWorkId(){
    var m = (location.pathname||"").match(/\/work\/(\d+)/);
    if(m) return m[1];
    m = (location.href||"").match(/\/work\/(\d+)/);
    return m ? m[1] : "";
  }
  function todayStr(){
    var d=new Date(), z=function(n){return (n<10?"0":"")+n;};
    return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate());
  }
  function pickWeeks(weeks){
    var t=todayStr(), sorted=weeks.slice().filter(function(w){return w&&w.date;})
      .sort(function(a,b){return (a.date||"").localeCompare(b.date||"");});
    if(!sorted.length) return {cur:null,prev:null,all:[]};
    var idx=-1;
    for(var i=0;i<sorted.length;i++){ if((sorted[i].date||"")<=t) idx=i; }
    if(idx<0) idx=0;
    return {cur:sorted[idx], prev:idx>0?sorted[idx-1]:null, all:sorted, idx:idx};
  }
  function rankIn(week, id){
    if(!week||!week.ranking) return 0;
    var i=week.ranking.map(String).indexOf(String(id));
    return i>=0 ? i+1 : 0;
  }
  function streakOf(all, idx, id){
    var n=0;
    for(var i=idx;i>=0;i--){ if(rankIn(all[i],id)>0) n++; else break; }
    return n;
  }
  function el(tag, style, html){
    var e=document.createElement(tag);
    if(style) e.setAttribute("style", style);
    if(html!=null) e.innerHTML=html;
    return e;
  }
  function norm(s){ return (s||"").replace(/\s+/g,"").replace(/\(19\)/g,"").toLowerCase(); }
  function findTitleEl(title){
    var nt=norm(title); if(nt.length<4) return null;
    var best=null, bestLen=Infinity, els=document.body.getElementsByTagName("*");
    for(var i=0;i<els.length;i++){
      var e=els[i];
      if(e.id===CFG.mountId) continue;
      if(e.closest && e.closest("#"+CFG.mountId)) continue;
      if(e.children && e.children.length>3) continue;
      var tx=norm(e.textContent||"");
      if(!tx) continue;
      if(tx.indexOf(nt)>=0 && tx.length<=nt.length+40){
        if(tx.length<bestLen){ bestLen=tx.length; best=e; }
      }
    }
    return best;
  }
  function render(D){
    var id=getWorkId(); if(!id) return;
    var mount=document.getElementById(CFG.mountId);
    var weeks=(D&&D.weeks)||[]; var pk=pickWeeks(weeks); if(!pk.cur) return;
    var rank=rankIn(pk.cur, id);
    if(!rank || rank>CFG.topN) return;
    var prevRank=pk.prev?rankIn(pk.prev,id):0;
    var streak=streakOf(pk.all, pk.idx, id);
    var mv=null;
    if(prevRank===0) mv={t:"NEW",c:"#7c3aed"};
    else if(rank<prevRank) mv={t:"▲"+(prevRank-rank),c:"#12b76a"};
    else if(rank>prevRank) mv={t:"▼"+(rank-prevRank),c:"#f04438"};
    else mv={t:"—",c:"#9a9aa2"};
    var wrap=el("a", "display:inline-flex;align-items:center;gap:9px;text-decoration:none;font-family:inherit;vertical-align:middle;background:#fff;border:1px solid #f1c7cb;border-radius:999px;padding:5px 5px;box-shadow:0 2px 10px rgba(230,0,18,.10)");
    wrap.href=CFG.rankSite; wrap.target="_blank"; wrap.rel="noopener";
    wrap.setAttribute("aria-label","이번 주 주간 랭킹 "+rank+"위");
    wrap.appendChild(el("span",
      "display:inline-flex;align-items:center;gap:5px;background:#E60012;color:#fff;font-weight:800;font-size:13px;line-height:1;padding:7px 12px;border-radius:999px",
      "🏆 주간 <b style='font-size:14px'>"+rank+"위</b>"));
    if(mv) wrap.appendChild(el("span",
      "font-weight:800;font-size:12.5px;line-height:1;color:"+mv.c, mv.t));
    if(streak>=2) wrap.appendChild(el("span",
      "font-size:12px;font-weight:700;line-height:1;color:#8a6a1a;background:#fbeecb;border:1px solid #efd99a;padding:5px 9px;border-radius:999px",
      streak+"주 연속"));
    if(CFG.showLink) wrap.appendChild(el("span",
      "font-size:12px;font-weight:700;line-height:1;color:#E60012;padding-right:8px","전체 랭킹 ›"));
    try{ if(window.gtag) wrap.addEventListener("click",function(){gtag("event","rank_badge_click",{work_id:String(id),rank:rank});}); }catch(e){}
    var title = (D.works && D.works[id] && D.works[id].title) || "";
    var titleEl = title ? findTitleEl(title) : null;
    if(titleEl && titleEl.parentNode){
      var box=el("div","margin:10px 0 4px");
      box.appendChild(wrap);
      titleEl.parentNode.insertBefore(box, titleEl.nextSibling);
      if(mount) mount.innerHTML="";
    } else if(mount){
      mount.innerHTML=""; mount.appendChild(wrap);
    }
  }
  function boot(){
    if(!getWorkId()) return;
    try{
      fetch(CFG.dataUrl + (CFG.dataUrl.indexOf("?")>=0?"&":"?") + "v=" + Math.floor(Date.now()/3600000), {cache:"default"})
        .then(function(r){ if(!r.ok) throw 0; return r.json(); })
        .then(render)
        .catch(function(){});
    }catch(e){}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();