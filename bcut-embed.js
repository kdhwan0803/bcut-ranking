/* MAXIM B컷 · 함께 보면 좋은 화보 임베드 (외부 로더용) */
(function(){
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
  var wrap=document.getElementById('wrap'), f=document.querySelector('footer');
  if(wrap) wrap.appendChild(box); else if(f) f.parentNode.insertBefore(box,f); else document.body.appendChild(box);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function series(t){var mm=/^\s*(?:\(19\)\s*)?\[([^\]]+)\]/.exec(t||'');return mm?mm[1].trim():'';}
  function modelOf(w){return (w&&w.models&&w.models[0])||series(w&&w.title)||'';}
  function clean(t){t=String(t||'').replace(/^\(19\)\s*/,'').replace(/^🔞\s*/,'');
    t=t.replace(/\[[^\]]*\]/g,function(mm){var i=mm.slice(1,-1).trim();return /[가-힣぀-ヿ一-鿿]/.test(i)?' '+i+' ':' ';});
    return t.replace(/\s{2,}/g,' ').replace(/^[\s·-]+|[\s·-]+$/g,'').trim()||String(t||'');}
  var TODAY=(new Date(Date.now()+324e5)).toISOString().slice(0,10);
  function pub(w){return w&&w.pub&&w.pub<=TODAY;}
  // recs.json에 없으면 data.json만으로 즉석 추천 (같은 모델→같은 작가→같은 유형 최신)
  function fallback(W){
    var cur=W[id]; if(!cur) return [];
    var moA=modelOf(cur), paA=(cur.photo||'').toString().trim();
    var seen={}; seen[id]=1; var picked=[];
    function add(k){ if(seen[k]||!W[k]||!pub(W[k])) return false; seen[k]=1; picked.push(k); return true; }
    var keys=Object.keys(W);
    var same=keys.filter(function(k){return k!==id&&modelOf(W[k])===moA&&pub(W[k]);})
      .sort(function(a,b){return (W[b].pub||'').localeCompare(W[a].pub||'');});
    for(var i=0,sc=0;i<same.length&&sc<2;i++){ if(add(same[i])) sc++; }
    if(paA){ var art=keys.filter(function(k){return (W[k].photo||'').toString().trim()===paA&&modelOf(W[k])!==moA&&pub(W[k])&&!seen[k];})
      .sort(function(a,b){return (W[b].pub||'').localeCompare(W[a].pub||'');}); if(art.length) add(art[0]); }
    var pool=keys.filter(function(k){return !seen[k]&&pub(W[k])&&modelOf(W[k])!==moA&&W[k].buy===cur.buy&&String(W[k].b19)===String(cur.b19);})
      .sort(function(a,b){return (W[b].pub||'').localeCompare(W[a].pub||'');});
    var off=pool.length?(parseInt(id,10)%pool.length):0;
    var rot=pool.slice(off).concat(pool.slice(0,off));
    for(var j=0;j<rot.length&&picked.length<COUNT;j++) add(rot[j]);
    return picked.slice(0,COUNT);
  }
  Promise.all([
    fetch(BASE+'/recs.json',{cache:'no-cache'}).then(function(r){return r.json();}).catch(function(){return {};}),
    fetch(BASE+'/data.json',{cache:'no-cache'}).then(function(r){return r.json();})
  ]).then(function(a){
    var RECS=a[0]||{}, W=(a[1]&&a[1].works)||{};
    var ids=(RECS[id]||[]).filter(function(x){return W[x]&&pub(W[x]);}).slice(0,COUNT);
    if(!ids.length) ids=fallback(W);        // ← 신작 자동추천
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
