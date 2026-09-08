/* MAXIM B컷 · 함께 보면 좋은 화보 임베드 (외부 로더용) */
(function(){
  window.__bcutVer='ROT-FINAL-2';
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
   +'@media(max-width:640px){.bctg{padding:16px 14px 14px;border-radius:12px}.bctg-g{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.bctg-ti{font-size:15.5px}.bctg-m{font-size:13px}}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  var box=document.createElement('div'); box.id='bcut-recs';
  // '모델의 다른 화보'(MORE MODEL) 섹션 바로 위에 삽입
  var anchor=null, ts=document.querySelectorAll('.section-title');
  for(var ai=0;ai<ts.length;ai++){ var tx=ts[ai].textContent||''; if(tx.indexOf('MORE MODEL')>=0||tx.indexOf('모델의 다른')>=0){ anchor=ts[ai]; break; } }
  if(anchor&&anchor.parentNode){ anchor.parentNode.insertBefore(box, anchor); }
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
  function pub(w){return w&&w.pub&&w.pub<=TODAY;}
  Promise.all([
    fetch(BASE+'/recs.json',{cache:'no-cache'}).then(function(r){return r.json();}).catch(function(){return {};}),
    fetch(BASE+'/data.json',{cache:'no-cache'}).then(function(r){return r.json();})
  ]).then(function(a){
    var RECS=a[0]||{}, W=(a[1]&&a[1].works)||{};
    var cur=W[id]||{}, moA=modelOf(cur), paA=(cur.photo||'').toString().trim();
    function ok(k){ return k&&k!==id&&W[k]&&pub(W[k])&&modelOf(W[k])!==moA; }  // 같은 모델 제외
    var POOL=12; var picked=[], seen={}; seen[id]=1;
    function add(k){ if(!ok(k)||seen[k]) return; seen[k]=1; picked.push(k); }
    (RECS[id]||[]).forEach(function(k){ if(picked.length<POOL) add(k); });     // 1) recs.json(다른 모델만)
    var keys=Object.keys(W);
    if(picked.length<COUNT && paA){                                            // 2) 같은 작가(다른 모델) 최신
      keys.filter(function(k){return (W[k].photo||'').toString().trim()===paA&&ok(k)&&!seen[k];})
        .sort(function(x,y){return (W[y].pub||'').localeCompare(W[x].pub||'');})
        .forEach(function(k){ if(picked.length<POOL) add(k); });
    }
    if(picked.length<COUNT){                                                   // 3) 같은 유형+등급 다른 모델 최신(회전)
      var pool=keys.filter(function(k){return ok(k)&&!seen[k]&&W[k].buy===cur.buy&&String(W[k].b19)===String(cur.b19);})
        .sort(function(x,y){return (W[y].pub||'').localeCompare(W[x].pub||'');});
      var off=pool.length?(parseInt(id,10)%pool.length):0;
      pool.slice(off).concat(pool.slice(0,off)).forEach(function(k){ if(picked.length<POOL) add(k); });
    }
    var ordered;
    if(picked.length<=COUNT){ ordered=picked.slice(); }
    else {
      var head=picked.slice(0,1), rest=picked.slice(1);           // 1순위 고정
      for(var ri=rest.length-1;ri>0;ri--){ var rj=Math.floor(Math.random()*(ri+1)); var tmp=rest[ri]; rest[ri]=rest[rj]; rest[rj]=tmp; }
      ordered=head.concat(rest);                                  // 나머지 랜덤
    }
    var ids=[], usedM={};                                         // 표시 4개는 모델 중복 없이
    for(var oi=0;oi<ordered.length&&ids.length<COUNT;oi++){ var mm=modelOf(W[ordered[oi]]); if(usedM[mm])continue; usedM[mm]=1; ids.push(ordered[oi]); }
    for(var oj=0;oj<ordered.length&&ids.length<COUNT;oj++){ if(ids.indexOf(ordered[oj])<0) ids.push(ordered[oj]); }
    if(!ids.length){ box.remove(); return; }
    var cards=ids.map(function(k){var w=W[k];
      return '<a class="bctg-c" href="'+SITE+k+'" data-to="'+k+'">'+
        '<span class="bctg-img" style="background-image:url(\''+esc(w.img)+'\')"></span>'+
        '<span class="bctg-i"><span class="bctg-m">'+esc(modelOf(w))+'</span><span class="bctg-t">'+esc(clean(w.title))+'</span></span>'+
        '<span class="bctg-b">'+(w.buy==='구독'?'구독':'코인')+'</span></a>';
    }).join('');
    box.className='bctg';
    box.innerHTML='<div class="bctg-h"><div><span class="bctg-eye">MAXIM B컷 · 추천</span>'+
      '<span class="bctg-ti">함께 보면 <b>좋은 화보</b></span></div>'+
      '<span class="bctg-su">취향·모델·작가로 고른 추천</span></div>'+
      '<div class="bctg-g">'+cards+'</div>';
    box.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.bctg-c'); if(!t)return;
      try{gtag('event','together_click',{from_id:id,to_id:t.getAttribute('data-to')});}catch(x){}});
  }).catch(function(){ box.remove(); });
})();
