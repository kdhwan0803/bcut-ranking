/* MAXIM B컷 · 함께 산 화보 / 함께 보면 좋은 화보 임베드 (외부 로더용) · ROT-FINAL-8: recs.json(동시구매) 있으면 '함께 산 화보'로 표시 · ROT-FINAL-9: data.json에 없는 화보(공개 전)에서도 최근작으로 채움 · ROT-FINAL-10: MORE 섹션이 없는 화보에서 블록이 상단으로 튀던 문제 수정(로더 스니펫 위치에 삽입) */
(function(){
  window.__bcutVer='ROT-FINAL-12-PAIR-COMING-1';
  if(document.getElementById('bcut-recs')) return;
  var COUNT=4, BASE='https://bcutrank.com', SITE='https://bcut.maximkorea.net/work/';
  var m=location.pathname.match(/\/work\/(\d{2,6})/); var id=m?m[1]:'';
  if(!id) return;
  var css='.bctg{margin:26px auto;max-width:1000px;background:#14141a;border-radius:16px;padding:20px 20px 18px;color:#fff;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.18)}'
   +'.bctg-h{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}'
   +'.bctg-eye{display:block;font-size:10.5px;font-weight:900;letter-spacing:2.5px;color:#ff5a66;margin-bottom:5px}'
   +'.bctg-ti{display:block;font-size:18px;font-weight:900;letter-spacing:-.4px;line-height:1.25;color:#fff}'
   +'.bctg-ti b{color:#ff5a66}.bctg-su{font-size:11.5px;font-weight:600;color:#9a9aa6;white-space:nowrap}'
   +'.bctg-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'
   +'.bctg-c{position:relative;display:block;text-decoration:none;color:#fff;border-radius:12px;overflow:hidden;background:#1e1e26;transition:transform .15s,box-shadow .2s}'
   +'.bctg-c:hover{transform:translateY(-3px);box-shadow:0 14px 28px rgba(0,0,0,.45)}'
   +'.bctg-img{display:block;aspect-ratio:5/7;background:#2a2a33 center/cover no-repeat}'
   +'.bctg-i{position:absolute;left:0;right:0;bottom:0;padding:28px 11px 11px;background:linear-gradient(180deg,rgba(20,20,26,0),rgba(20,20,26,.92) 70%)}'
   +'.bctg-m{display:block;font-size:14px;font-weight:900}'
   +'.bctg-t{display:block;font-size:11.5px;font-weight:600;color:#c9c9d2;margin-top:3px;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}'
   +'.bctg-b{position:absolute;top:9px;left:9px;font-size:10px;font-weight:900;border-radius:5px;padding:3px 7px;background:rgba(20,20,26,.78);color:#fff;border:1px solid rgba(255,255,255,.18)}'
   +'@media(max-width:640px){.bctg{padding:16px 14px 14px;border-radius:12px}.bctg-g{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.bctg-ti{font-size:15.5px}.bctg-m{font-size:13px}}'
   +'.bcrk{display:flex;align-items:center;gap:14px;max-width:1000px;margin:26px auto 0;text-decoration:none;color:#fff;background:linear-gradient(135deg,#1a1a22,#101015);border:1px solid rgba(255,255,255,.09);border-left:4px solid #ff5a66;border-radius:16px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.18);transition:transform .15s,box-shadow .2s,border-color .2s;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif}'
   +'.bcrk:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(0,0,0,.4);border-color:rgba(230,181,69,.5)}'
   +'.bcrk-th{flex:0 0 auto;width:52px;height:68px;border-radius:9px;background:#2a2a33 center/cover no-repeat;box-shadow:0 3px 10px rgba(0,0,0,.4)}'
   +'.bcrk-tx{flex:1;min-width:0}'
   +'.bcrk-eye{display:block;font-size:10px;font-weight:900;letter-spacing:2px;color:#e6b545;margin-bottom:4px}'
   +'.bcrk-ti{display:block;font-size:15.5px;font-weight:900;letter-spacing:-.3px;color:#fff;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
   +'.bcrk-ti b{color:#ff5a66}'
   +'.bcrk-su{display:block;font-size:11.5px;font-weight:600;color:#9a9aa6;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
   +'.bcrk-cta{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;background:#ff5a66;color:#fff;font-size:13px;font-weight:800;padding:11px 17px;border-radius:8px;white-space:nowrap;box-shadow:0 6px 16px rgba(255,90,102,.3)}'
   +'@media(max-width:560px){.bcrk{flex-wrap:wrap;gap:11px;padding:13px}.bcrk-cta{flex:1 1 100%;justify-content:center;padding:10px}}';

  var pairedCss='.bcvp{max-width:1000px;margin:26px auto 0;padding:18px 0 20px;background:transparent;color:#24242c;border:0;border-bottom:1px solid #ededf0;border-radius:0;box-shadow:none;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;box-sizing:border-box}'
    +'.bcvp *{box-sizing:border-box}.bcvp-row{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:18px;align-items:center}'
    +'.bcvp-img{display:block;width:60px;height:82px;object-fit:cover;object-position:top;border-radius:4px;background:#f0f0f3}.bcvp-img-empty{font-size:10px;color:#888;text-align:center;line-height:82px}'
    +'.bcvp-text{min-width:0}.bcvp-meta{display:block;font-size:10.5px;font-weight:600;letter-spacing:.25px;color:#8b8b96;margin-bottom:6px}'
    +'.bcvp-title{display:block;font-size:19px;line-height:1.35;font-weight:750;letter-spacing:-.6px;color:#22222a}.bcvp-desc{display:block;font-size:12px;color:#81818d;line-height:1.5;margin-top:6px}'
    +'.bcvp-link{display:inline-flex;align-items:center;gap:14px;justify-self:end;text-decoration:none!important;white-space:nowrap;background:transparent;color:#cf3c4b!important;font-size:12px;font-weight:800;border:0;border-bottom:1px solid #e8a5ac;border-radius:0;padding:9px 0 8px;box-shadow:none;line-height:1.5}'
    +'.bcvp-link:hover{background:transparent;color:#a92030!important;border-color:#a92030}.bcvp-link:focus-visible{outline:2px solid #cf3c4b;outline-offset:5px}'
    +'.bcvp-foot{font-size:10px;color:#a1a1ac;padding-left:78px;margin-top:9px;line-height:1.5}'
    +'@media(max-width:640px){.bcvp{padding:15px 0 18px}.bcvp-row{grid-template-columns:48px minmax(0,1fr);gap:12px 14px}.bcvp-img{width:48px;height:66px;grid-row:1 / span 2}.bcvp-img-empty{line-height:66px}.bcvp-text{grid-column:2}.bcvp-title{font-size:16px}.bcvp-desc{font-size:11px}.bcvp-meta{font-size:10px}.bcvp-link{grid-column:2;justify-self:start;padding:5px 0 7px;margin-top:-1px}.bcvp-foot{padding-left:62px;font-size:9px}}';

  var st=document.createElement('style'); st.textContent=css+pairedCss; document.head.appendChild(st);
  var box=document.createElement('div'); box.id='bcut-recs';
  // '모델의 다른 화보'(MORE MODEL) 섹션 바로 위에 삽입
  var anchor=null, ts=document.querySelectorAll('.section-title');
  for(var ai=0;ai<ts.length;ai++){ var tx=ts[ai].textContent||''; if(tx.indexOf('MORE MODEL')>=0||tx.indexOf('모델의 다른')>=0){ anchor=ts[ai]; break; } }
  // ROT-FINAL-10: MORE 섹션이 없는 화보(모델·작가의 다른 화보가 없는 경우)에서
  // 예전에는 ts[0] 또는 #work-top 뒤로 밀려 블록이 '작품 정보' 탭 위에 떴다.
  // 이제는 CONTENT 안에 박아둔 로더 스니펫(img[onerror*="__bcutRecs"]) 바로 뒤에 넣어
  // 항상 본문 끝에 오도록 한다.
  var ldr=document.querySelector('img[onerror*="__bcutRecs"]');
  if(anchor&&anchor.parentNode){ anchor.parentNode.insertBefore(box, anchor); }
  else if(ldr&&ldr.parentNode){ ldr.parentNode.insertBefore(box, ldr.nextSibling); }
  else {
    var wt=document.getElementById('work-top');
    var wrap=document.getElementById('wrap'), f=document.querySelector('footer');
    if(wt&&wt.parentNode){ wt.parentNode.insertBefore(box, wt.nextSibling); }
    else if(wrap){ wrap.appendChild(box); }
    else if(f){ f.parentNode.insertBefore(box,f); }
    else { document.body.appendChild(box); }
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function series(t){var mm=/^\s*(?:\(19\)\s*)?\[([^\]]+)\]/.exec(t||'');return mm?mm[1].trim():'';}
  function modelOf(w){return (w&&w.models&&w.models[0])||series(w&&w.title)||'';}
  function clean(t){t=String(t||'').replace(/^\(19\)\s*/,'').replace(/^🔞\s*/,'');
    t=t.replace(/\[[^\]]*\]/g,function(mm){var i=mm.slice(1,-1).trim();return /[가-힣぀-ヿ一-鿿]/.test(i)?' '+i+' ':' ';});
    return t.replace(/\s{2,}/g,' ').replace(/^[\s·-]+|[\s·-]+$/g,'').trim()||String(t||'');}
  var TODAY=(new Date(Date.now()+324e5)).toISOString().slice(0,10);

  // PAIR-COMING-1: match separate PHOTO / VIDEO editions, including scheduled works.
  // Same base title, full model list, creator and release date. Bundles excluded.
  function pairNorm(s){
    s=String(s==null?'':s);
    if(s.normalize) s=s.normalize('NFKC');
    return s.toLowerCase();
  }
  function pairMeta(w){
    if(!w||!Array.isArray(w.models)||!w.models.length||!w.photo) return null;
    var t=pairNorm(w.title), types=[];
    // A PHOTO+VIDEO bundle is never a separate VIDEO edition.
    if((/(?:^|[^a-z])photo(?:$|[^a-z])/.test(t)&&/(?:^|[^a-z])video(?:$|[^a-z])/.test(t))||
       /photo\s*[+&/]\s*video|photo\s+video|포토\s*[+&/]\s*비디오|사진\s*[+&/]\s*영상/.test(t)) return null;
    t=t.replace(/[([{]\s*(?:only\s*)?(photo|video|포토|비디오|사진|영상)(?:\s*only)?\s*[)\]}]/g,function(_,v){
      types.push(/photo|포토|사진/.test(v)?'photo':'video'); return ' ';
    });
    t=t.replace(/_\s*(photo|video)(?:\s*only)?\b/g,function(_,v){types.push(v);return ' ';});
    if(!types.length) return null;
    var type=types[0];
    for(var ti=1;ti<types.length;ti++) if(types[ti]!==type) return null;
    // Cross-check with the site's video flag. Missing/contradictory flags are rejected.
    if(w.vid==null||w.vid===''||Number(w.vid)!==(type==='video'?1:0)) return null;
    var base=t.replace(/^\s*(?:\(19\)|🔞|19\s*)\s*/,'')
      .replace(/[\s_'"“”‘’()[\]{}.,:;·\-–—]+/g,'').trim();
    var models=w.models.map(function(v){return pairNorm(v).replace(/\s+/g,'');}).sort();
    var creator=pairNorm(w.photo).replace(/\s+/g,'');
    if(!base||!creator||models.some(function(v){return !v;})||
       !/^\d{4}-\d{2}-\d{2}$/.test(String(w.pub||''))) return null;
    return {type:type,key:JSON.stringify([base,models,creator,String(w.pub)])};
  }
  function pairedWork(works,currentId){
    currentId=String(currentId);
    var current=works&&works[currentId], meta=pairMeta(current);
    if(!meta) return null;
    var group=[];
    Object.keys(works).forEach(function(k){
      var w=works[k], p=pairMeta(w);
      if(p&&p.key===meta.key) group.push({id:String(k),work:w,type:p.type});
    });
    // Do not guess when there are duplicates or multiple candidate editions.
    if(group.length!==2) return null;
    var other=group[0].id===currentId?group[1]:group[0];
    if(other.id===currentId||other.type===meta.type||
       !/^\d{2,6}$/.test(other.id)) return null;
    return other;
  }
  function addPairedVersion(works){
    if(document.getElementById('bcut-paired-version')) return;
    var other=pairedWork(works,id);
    if(!other) return;
    var target=document.getElementById('bcut-rankbanner')||box;
    if(!target||!target.parentNode) return;
    var type=other.type==='video'?'VIDEO':'PHOTO';
    var title=other.type==='video'?'사진 속 순간을, 영상으로.':'영상의 순간을, 사진으로.';
    var upcoming=String(other.work.pub)>TODAY;
    var desc=other.type==='video'?'같은 촬영의 영상 버전도 만나보세요.':'같은 촬영의 사진 버전도 만나보세요.';
    if(upcoming) desc=other.type==='video'?'같은 촬영의 영상 버전도 공개 예정입니다.':'같은 촬영의 사진 버전도 공개 예정입니다.';
    var dateParts=String(other.work.pub).split('-');
    var upcomingLabel=upcoming?' · '+Number(dateParts[1])+'월 '+Number(dateParts[2])+'일 공개 예정':'';
    var linkLabel=type+(upcoming?' 상세 보기':' 버전 보기');
    var section=document.createElement('section');
    section.id='bcut-paired-version';section.className='bcvp';
    section.setAttribute('aria-label','이 화보의 다른 버전');
    var image=String(other.work.img||'');
    var thumb=/^https:\/\//i.test(image)?
      '<img class="bcvp-img" src="'+esc(image)+'" alt="'+esc(modelOf(other.work)+' '+type+' 버전 표지')+'" width="60" height="82" loading="lazy" decoding="async">':
      '<span class="bcvp-img bcvp-img-empty" aria-hidden="true">'+type+'</span>';
    section.innerHTML='<div class="bcvp-row">'+thumb+
      '<div class="bcvp-text"><span class="bcvp-meta">'+esc(modelOf(other.work))+' · '+type+upcomingLabel+'</span>'+
      '<strong class="bcvp-title">'+title+'</strong><span class="bcvp-desc">'+desc+'</span></div>'+
      '<a class="bcvp-link" href="'+SITE+other.id+'" data-to="'+other.id+'" aria-label="'+esc(other.work.title+' 상세페이지로 이동')+'">'+linkLabel+' <span aria-hidden="true">›</span></a></div>'+
      '<div class="bcvp-foot">PHOTO / VIDEO는 각각 별도 작품으로 제공됩니다.</div>';
    section.addEventListener('click',function(e){
      var link=e.target.closest&&e.target.closest('.bcvp-link');if(!link)return;
      try{gtag('event','paired_version_click',{from_id:String(id),to_id:other.id,to_type:type});}catch(x){}
    });
    target.parentNode.insertBefore(section,target);
  }

  function pub(w){return w&&w.pub&&w.pub<=TODAY;}
  Promise.all([
    fetch(BASE+'/recs.json',{cache:'no-cache'}).then(function(r){return r.json();}).catch(function(){return {};}),
    fetch(BASE+'/data.json',{cache:'no-cache'}).then(function(r){return r.json();})
  ]).then(function(a){
    var RECS=a[0]||{}, W=(a[1]&&a[1].works)||{};
    // 이번 주 랭킹 진입 배너 (추천 블록 위) — 실제 1위 화보를 자동 노출
    try{
      if(!document.getElementById('bcut-rankbanner')){
        var WK=(a[1]&&a[1].weeks)||[], top1='';
        for(var wi=WK.length-1; wi>=0 && !top1; wi--){ var rk=(WK[wi]&&WK[wi].ranking)||[];
          for(var ri2=0; ri2<rk.length; ri2++){ if(W[rk[ri2]]&&pub(W[rk[ri2]])){ top1=rk[ri2]; break; } } }
        var bn=document.createElement('a'); bn.id='bcut-rankbanner'; bn.className='bcrk';
        bn.href=BASE+'/?utm_source=bcut&utm_medium=detail&utm_campaign=crosslink'; bn.target='_blank'; bn.rel='noopener';
        var _th='', _ti='이번 주 화보 <b>랭킹 TOP</b>';
        if(top1){ var tw=W[top1];
          _th='<span class="bcrk-th" style="background-image:url(\''+esc(tw.img)+'\')"></span>';
          _ti='지금 <b>1위</b> · '+esc(modelOf(tw))+' '+esc(clean(tw.title)); }
        bn.innerHTML=_th+'<span class="bcrk-tx"><span class="bcrk-eye">🏆 MAXIM B컷 · 이번 주 랭킹</span>'+
          '<span class="bcrk-ti">'+_ti+'</span>'+
          '<span class="bcrk-su">판매·조회·평점 종합 TOP · 랭킹 전체 보기</span></span>'+
          '<span class="bcrk-cta">랭킹 보러가기 ›</span>';
        bn.addEventListener('click',function(){try{gtag('event','rank_banner_click',{from_id:id});}catch(x){}});
        if(box&&box.parentNode) box.parentNode.insertBefore(bn, box);
      }
    }catch(x){}
    // Independent from recommendation results; no pair means no additional UI.
    try{addPairedVersion(W);}catch(x){}
    // 이번 주 랭킹 순위 뱃지 — 화보명 아래 (순위권 TOP10 화보만, 자동)
    try{
      if(!document.getElementById('bcut-rankbadge')){
        var WKb=(a[1]&&a[1].weeks)||[];
        var sw=WKb.filter(function(w){return w&&w.date;}).sort(function(x,y){return (x.date||'').localeCompare(y.date||'');});
        var cwk=null; for(var sj=0;sj<sw.length;sj++){ if((sw[sj].date||'')<=TODAY) cwk=sw[sj]; }
        if(!cwk && sw.length) cwk=sw[0];
        var rnk=0; if(cwk&&cwk.ranking){ var ix=cwk.ranking.map(String).indexOf(String(id)); rnk=ix>=0?ix+1:0; }
        if(rnk>0 && rnk<=10){
          var lbl=rnk<=5?('주간 '+rnk+'위'):'주간 TOP10';
          var bd=document.createElement('a'); bd.id='bcut-rankbadge';
          bd.href=BASE+'/?utm_source=bcut&utm_medium=detail&utm_campaign=rankbadge'; bd.target='_blank'; bd.rel='noopener';
          bd.setAttribute('style','display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-family:inherit;vertical-align:middle;background:#fff;border:1px solid #f1c7cb;border-radius:999px;padding:4px 6px 4px 4px;box-shadow:0 2px 10px rgba(230,0,18,.10);line-height:1');
          bd.innerHTML='<span style="display:inline-flex;align-items:center;gap:5px;background:#E60012;color:#fff;font-weight:800;font-size:13px;line-height:1;padding:8px 13px;border-radius:999px;white-space:nowrap"><span style="font-size:12px">🏆</span><span>'+lbl+'</span></span><span style="display:inline-flex;align-items:center;font-size:12px;font-weight:700;line-height:1;color:#E60012;padding-right:6px;white-space:nowrap">전체 랭킹 ›</span>';
          bd.addEventListener('click',function(){try{gtag('event','rank_badge_click',{work_id:String(id),rank:rnk});}catch(e){}});
          var _nm=function(s){return String(s||'').replace(/\s+/g,'').replace(/\(19\)/g,'').toLowerCase();};
          var ttl=(W[id]&&W[id].title)||'', nt=_nm(ttl), te=null;
          if(nt.length>=4){ var best=null,bl=1/0,els=document.body.getElementsByTagName('*');
            for(var ei=0;ei<els.length;ei++){ var e=els[ei];
              if(e.id==='bcut-rankbadge'||(e.closest&&e.closest('#bcut-recs'))) continue;
              if(e.children&&e.children.length>3) continue;
              var tx=_nm(e.textContent||''); if(!tx) continue;
              if(tx.indexOf(nt)>=0 && tx.length<=nt.length+40 && tx.length<bl){ bl=tx.length; best=e; } }
            te=best;
          }
          if(te&&te.parentNode){ var bx=document.createElement('div'); bx.setAttribute('style','margin:10px 0 4px'); bx.appendChild(bd); te.parentNode.insertBefore(bx, te.nextSibling); }
        }
      }
    }catch(x){}
    var cur=W[id]||{}, moA=modelOf(cur), paA=(cur.photo||'').toString().trim();
    function ok(k){ return k&&k!==id&&W[k]&&pub(W[k])&&modelOf(W[k])!==moA; }  // 같은 모델 제외
    var POOL=12; var picked=[], seen={}; seen[id]=1;
    function add(k){ if(!ok(k)||seen[k]) return; seen[k]=1; picked.push(k); }
    var fromRecs={}; (RECS[id]||[]).forEach(function(k){ k=String(k); if(picked.length<POOL&&!seen[k]&&ok(k)){ fromRecs[k]=1; } add(k); });     // 1) recs.json(동시구매, 다른 모델만)
    var nRecs=Object.keys(fromRecs).length;
    var keys=Object.keys(W);
    if(picked.length<POOL && paA){                                            // 2) 같은 작가(다른 모델) 최신
      keys.filter(function(k){return (W[k].photo||'').toString().trim()===paA&&ok(k)&&!seen[k];})
        .sort(function(x,y){return (W[y].pub||'').localeCompare(W[x].pub||'');})
        .forEach(function(k){ if(picked.length<POOL) add(k); });
    }
    if(picked.length<POOL){                                                   // 3) 같은 유형+등급 다른 모델 최신(회전)
      var pool=keys.filter(function(k){return ok(k)&&!seen[k]&&W[k].buy===cur.buy&&String(W[k].b19)===String(cur.b19);})
        .sort(function(x,y){return (W[y].pub||'').localeCompare(W[x].pub||'');});
      var off=pool.length?(parseInt(id,10)%pool.length):0;
      pool.slice(off).concat(pool.slice(0,off)).forEach(function(k){ if(picked.length<POOL) add(k); });
    }
    if(picked.length<COUNT){                                                  // 4) 현재 화보가 data.json에 없거나 후보 부족 → 최근 공개작(다른 모델)으로 채움
      keys.filter(function(k){return ok(k)&&!seen[k];})
        .sort(function(x,y){return (W[y].pub||'').localeCompare(W[x].pub||'')||(parseInt(y,10)-parseInt(x,10));})
        .forEach(function(k){ if(picked.length<POOL) add(k); });
    }
    var ordered;
    if(nRecs>=COUNT){ ordered=picked.slice(); }                 // 동시구매 추천이 4개 이상이면 순서 고정(데이터 순)
    else if(picked.length<=COUNT){ ordered=picked.slice(); }
    else {
      var head=picked.slice(0,1), rest=picked.slice(1);           // 1순위 고정
      for(var ri=rest.length-1;ri>0;ri--){ var rj=Math.floor(Math.random()*(ri+1)); var tmp=rest[ri]; rest[ri]=rest[rj]; rest[rj]=tmp; }
      ordered=head.concat(rest);                                  // 나머지 랜덤
    }
    var ids=[], usedM={};                                         // 표시 4개는 모델 중복 없이
    for(var oi=0;oi<ordered.length&&ids.length<COUNT;oi++){ var mm=modelOf(W[ordered[oi]]); if(usedM[mm])continue; usedM[mm]=1; ids.push(ordered[oi]); }
    for(var oj=0;oj<ordered.length&&ids.length<COUNT;oj++){ if(ids.indexOf(ordered[oj])<0) ids.push(ordered[oj]); }
    if(!ids.length){ box.remove(); return; }
    var bought=ids.every(function(k){return fromRecs[k];});      // 표시 4개 전부 동시구매 데이터면 '함께 산 화보'
    var _eye=bought?'MAXIM B컷 · TOGETHER':'MAXIM B컷 · 추천';
    var _ttl=bought?'이 화보를 본 분들이 <b>함께 산 화보</b>':'함께 보면 <b>좋은 화보</b>';
    var _sub=bought?'실제 구매 데이터 기준':'취향·모델·작가로 고른 추천';
    var cards=ids.map(function(k){var w=W[k];
      return '<a class="bctg-c" href="'+SITE+k+'" data-to="'+k+'">'+
        '<span class="bctg-img" style="background-image:url(\''+esc(w.img)+'\')"></span>'+
        '<span class="bctg-i"><span class="bctg-m">'+esc(modelOf(w))+'</span><span class="bctg-t">'+esc(clean(w.title))+'</span></span>'+
        '</a>';
    }).join('');
    box.className='bctg';
    box.innerHTML='<div class="bctg-h"><div><span class="bctg-eye">'+_eye+'</span>'+
      '<span class="bctg-ti">'+_ttl+'</span></div>'+
      '<span class="bctg-su">'+_sub+'</span></div>'+
      '<div class="bctg-g">'+cards+'</div>';
    box.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.bctg-c'); if(!t)return;
      try{gtag('event','together_click',{from_id:id,to_id:t.getAttribute('data-to'),kind:bought?'bought':'similar'});}catch(x){}});
  }).catch(function(){ box.remove(); });
})();
