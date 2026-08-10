/*! MAXIM B컷 랭킹 배지 — 화보 상세페이지용 외부 스크립트
   사용법: 상세페이지에 아래 두 줄만 넣으면 됩니다.
     <div id="bcut-rank"></div>
     <script src="https://bcutrank.com/rank-badge.js" defer></script>
   - #bcut-rank 자리에 배지가 자동으로 뜹니다(순위권 화보만).
   - data.json은 매주 갱신되므로 순위도 자동으로 최신입니다. */
(function(){
  "use strict";
  var CFG = {
    dataUrl:  window.BCUT_RANK_DATAURL || "https://bcutrank.com/data.json", // 공개 랭킹 데이터
    rankSite: window.BCUT_RANK_SITE    || "https://bcutrank.com/",          // 전체 랭킹 링크
    mountId:  "bcut-rank",                        // 배지가 들어갈 요소 id
    topN:     10,                                 // 이 순위 안이면 배지 표시
    topExact: 5,                                  // 이 순위까지는 정확한 순위, 그 아래는 "TOP{topN}"
    showLink: true,                               // "전체 랭킹 ›" 링크 표시
    showMove: false,                              // 등락(NEW/▲/▼) 표시 여부
    showStreak: false                             // "N주 연속" 표시 여부
  };
  // 화보 ID 추출: /work/2008 → "2008"
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
  // 이번 주 = 오늘 이하 날짜 중 가장 최근 주차 (없으면 첫 주차)
  function pickWeeks(weeks){
    var t=todayStr(), sorted=weeks.slice().filter(function(w){return w&&w.date;})
      .sort(function(a,b){return (a.date||"").localeCompare(b.date||"");});
    if(!sorted.length) return {cur:null,prev:null,all:[]};
    var idx=-1;
    for(var i=0;i<sorted.length;i++){ if((sorted[i].date||"")<=t) idx=i; }
    if(idx<0) idx=0; // 전부 미래면 첫 주차
    return {cur:sorted[idx], prev:idx>0?sorted[idx-1]:null, all:sorted, idx:idx};
  }
  function rankIn(week, id){
    if(!week||!week.ranking) return 0;
    var i=week.ranking.map(String).indexOf(String(id));
    return i>=0 ? i+1 : 0;
  }
  function streakOf(all, idx, id){ // 최근부터 연속 랭크인 주 수
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
  // 제목 글자를 화면에서 찾아 그 요소를 반환 (게시판 본문이 아래에 있어도 제목 밑에 배지를 올려붙이기 위함)
  function norm(s){ return (s||"").replace(/\s+/g,"").replace(/\(19\)/g,"").toLowerCase(); }
  function findTitleEl(title){
    var nt=norm(title); if(nt.length<3) return null;
    var els=document.body.getElementsByTagName("*"), cands=[];
    for(var i=0;i<els.length;i++){
      var e=els[i];
      if(e.id===CFG.mountId) continue;
      if(e.closest && e.closest("#"+CFG.mountId)) continue;
      if(e.children && e.children.length>3) continue;      // 큰 컨테이너 제외
      var tx=norm(e.textContent||"");
      if(!tx) continue;
      if(tx.indexOf(nt)>=0 && tx.length<=nt.length+40){     // 대략 제목만 담은 요소
        var top; try{ top=e.getBoundingClientRect().top + (window.pageYOffset||0); }catch(_){ top=1e9; }
        var tag=(e.tagName||"").toLowerCase();
        var isHead=/^h[1-4]$/.test(tag)?0:1;               // 헤딩 태그 우선
        cands.push({e:e, top:top, isHead:isHead, len:tx.length});
      }
    }
    if(!cands.length) return null;
    // 우선순위: 페이지에서 가장 위 → 헤딩 태그 → 짧은 텍스트 (상단 큰 제목을 고르기 위함)
    cands.sort(function(a,b){ return (a.top-b.top) || (a.isHead-b.isHead) || (a.len-b.len); });
    return cands[0].e;
  }
  function render(D){
    var id=getWorkId(); if(!id) return;
    var mount=document.getElementById(CFG.mountId);
    var weeks=(D&&D.weeks)||[]; var pk=pickWeeks(weeks); if(!pk.cur) return;
    var rank=rankIn(pk.cur, id);
    if(!rank || rank>CFG.topN) return; // 순위권 밖이면 아무것도 안 함
    var prevRank=pk.prev?rankIn(pk.prev,id):0;
    var streak=streakOf(pk.all, pk.idx, id);

    // 등락
    var mv=null;
    if(prevRank===0) mv={t:"NEW",c:"#7c3aed"};
    else if(rank<prevRank) mv={t:"▲"+(prevRank-rank),c:"#12b76a"};
    else if(rank>prevRank) mv={t:"▼"+(rank-prevRank),c:"#f04438"};
    else mv={t:"—",c:"#9a9aa2"};

    var wrap=el("a", "display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-family:inherit;vertical-align:middle;background:#fff;border:1px solid #f1c7cb;border-radius:999px;padding:4px 6px 4px 4px;box-shadow:0 2px 10px rgba(230,0,18,.10);line-height:1");
    wrap.href=CFG.rankSite; wrap.target="_blank"; wrap.rel="noopener";
    wrap.setAttribute("aria-label","이번 주 주간 랭킹 "+rank+"위");

    var label = (rank<=CFG.topExact) ? ("주간 "+rank+"위") : ("주간 TOP"+CFG.topN);
    wrap.appendChild(el("span",
      "display:inline-flex;align-items:center;gap:5px;background:#E60012;color:#fff;font-weight:800;font-size:13px;line-height:1;padding:8px 13px;border-radius:999px;white-space:nowrap",
      "<span style='font-size:12px'>🏆</span><span>"+label+"</span>"));

    if(CFG.showMove && mv) wrap.appendChild(el("span",
      "display:inline-flex;align-items:center;font-weight:800;font-size:12.5px;line-height:1;color:"+mv.c, mv.t));

    if(CFG.showStreak && streak>=2) wrap.appendChild(el("span",
      "display:inline-flex;align-items:center;font-size:11.5px;font-weight:700;line-height:1;color:#8a6a1a;background:#fbeecb;border:1px solid #efd99a;padding:6px 9px;border-radius:999px;white-space:nowrap",
      streak+"주 연속"));

    if(CFG.showLink) wrap.appendChild(el("span",
      "display:inline-flex;align-items:center;font-size:12px;font-weight:700;line-height:1;color:#E60012;padding-right:6px;white-space:nowrap","전체 랭킹 ›"));

    try{ if(window.gtag) wrap.addEventListener("click",function(){gtag("event","rank_badge_click",{work_id:String(id),rank:rank});}); }catch(e){}

    // 배치: 제목을 찾으면 그 바로 아래로 올려붙이고, 못 찾으면 넣어둔 #bcut-rank 자리에 표시
    var title = (D.works && D.works[id] && D.works[id].title) || "";
    var titleEl = title ? findTitleEl(title) : null;
    if(titleEl && titleEl.parentNode){
      var box=el("div","margin:10px 0 4px");
      box.appendChild(wrap);
      titleEl.parentNode.insertBefore(box, titleEl.nextSibling);
      if(mount) mount.innerHTML=""; // 본문에 넣어둔 자리 비우기(중복 방지)
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
        .catch(function(){ /* 조용히 무시 */ });
    }catch(e){}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
