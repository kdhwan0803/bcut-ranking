/* Work page runtime. Inlined by scripts/update-work-pages.cjs; no catalogue fetch, no framework. */
(function(){
  'use strict';
  var info=window.BCUT_WORK_PAGE||{};
  /* --- 측정: 페이지 조회(bcut_work_view)와 B컷 이동(bcut_work_outbound). ?measure=1 이면 전송하지 않고 화면에 기록만 보여 줍니다. --- */
  var dry=/[?&]measure=1(?:&|$)/.test(location.search),panel;
  function log(name,p){if(!dry)return;if(!panel){panel=document.createElement('details');panel.id='bcut-measure-log';panel.open=true;panel.style.cssText='position:fixed;right:12px;top:64px;z-index:600;width:min(420px,90vw);max-height:220px;overflow:auto;background:#152032;color:#fff;padding:12px;border-radius:10px;font:12px/1.5 monospace;box-shadow:0 4px 20px #0006';var s=document.createElement('summary');s.textContent='측정 확인 · GA4 전송 안 함';panel.appendChild(s);document.body.appendChild(panel);}var row=document.createElement('div');row.textContent=name+' '+JSON.stringify(p);panel.appendChild(row);}
  function track(name,p){log(name,p);try{if(!window.BCUT_ANALYTICS_DISABLED&&typeof window.gtag==='function')window.gtag('event',name,p);}catch(e){}}
  var base={work_id:info.work_id,edition:info.edition,model:info.model,page_type:'work_page',measurement_version:'1'};
  track('bcut_work_view',base);
  /* 들어올 때 붙은 utm_* 는 B컷으로 넘어갈 때도 그대로 이어 붙입니다(bn 은 유지). */
  var carry=[];try{new URLSearchParams(location.search).forEach(function(v,k){if(/^utm_(source|medium|campaign|content|term)$/.test(k))carry.push([k,v]);});}catch(e){}
  document.querySelectorAll('a[data-out]').forEach(function(a){
    if(carry.length){try{var u=new URL(a.href);carry.forEach(function(kv){u.searchParams.set(kv[0],kv[1]);});a.href=u.href;}catch(e){}}
    a.addEventListener('click',function(){track('bcut_work_outbound',Object.assign({},base,{link_origin:a.getAttribute('data-out'),link_url:a.href,transport_type:'beacon'}));});
  });
  document.querySelectorAll('a[data-edition-link]').forEach(function(a){
    if(carry.length){try{var u=new URL(a.href,location.href);carry.forEach(function(kv){u.searchParams.set(kv[0],kv[1]);});a.href=u.href;}catch(e){}}
    a.addEventListener('click',function(){track('bcut_work_edition_switch',Object.assign({},base,{to_edition:a.getAttribute('data-edition-link')}));});
  });
  /* --- 테마: 홈과 같은 저장 키(bcut_theme) --- */
  var themeBtn=document.getElementById('wpTheme');
  function paintTheme(){var dark=document.documentElement.getAttribute('data-theme')==='dark';themeBtn.textContent=dark?'☀ 라이트':'☾ 다크';}
  themeBtn.addEventListener('click',function(){var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',next);try{localStorage.setItem('bcut_theme',next);}catch(e){}paintTheme();});
  paintTheme();
  /* --- 미리보기 넘기기 --- */
  var car=document.getElementById('wpCar'),now=document.getElementById('wpNow'),dots=document.getElementById('wpDots').children,thumbs=document.querySelectorAll('#wpThumbs [data-go]'),prev=document.getElementById('wpPrev'),next=document.getElementById('wpNext'),count=car.children.length,index=0,target=null,targetTimer=0;
  function paint(i){index=i;now.textContent=String(i+1);for(var d=0;d<dots.length;d++)dots[d].className=d===i?'on':'';thumbs.forEach(function(t,k){t.setAttribute('aria-pressed',String(k===i));});prev.setAttribute('aria-disabled',String(i===0));next.setAttribute('aria-disabled',String(i===count-1));}
  function go(i){i=Math.max(0,Math.min(count-1,i));target=i;clearTimeout(targetTimer);targetTimer=setTimeout(function(){target=null;},900);car.scrollTo({left:car.clientWidth*i,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});paint(i);}
  car.addEventListener('scroll',function(){var i=Math.max(0,Math.min(count-1,Math.round(car.scrollLeft/Math.max(1,car.clientWidth))));if(target!==null){if(i!==target)return;target=null;}if(i!==index)paint(i);},{passive:true});
  prev.addEventListener('click',function(){go(index-1);});next.addEventListener('click',function(){go(index+1);});
  thumbs.forEach(function(t){t.addEventListener('click',function(){go(+t.getAttribute('data-go'));});});
  car.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();go(index+1);}else if(e.key==='ArrowLeft'){e.preventDefault();go(index-1);}});
  /* --- 크게 보기 --- */
  var zoom=document.getElementById('wpZoom'),zoomImg=document.getElementById('wpZoomImg');
  document.querySelectorAll('[data-zoom]').forEach(function(b){b.addEventListener('click',function(){var img=b.querySelector('img');zoomImg.src=img.currentSrc.replace('-540.webp','.webp');zoomImg.alt=img.alt;if(zoom.showModal)zoom.showModal();});});
  document.getElementById('wpZoomClose').addEventListener('click',function(){zoom.close();});
  zoom.addEventListener('click',function(e){if(e.target===zoom)zoom.close();});
  /* --- 고정 구매 바: 첫 화면 버튼이 안 보일 때만 --- */
  var sticky=document.getElementById('wpSticky'),cta=document.getElementById('wpCta');
  function setSticky(on){sticky.classList.toggle('on',on);sticky.setAttribute('aria-hidden',String(!on));sticky.querySelector('a').tabIndex=on?0:-1;}
  function checkSticky(){setSticky(cta.getBoundingClientRect().bottom<0);}
  window.addEventListener('scroll',checkSticky,{passive:true});window.addEventListener('resize',checkSticky);checkSticky();
})();
