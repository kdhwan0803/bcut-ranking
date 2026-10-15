(function (root) {
  'use strict';
  const ID = 'subscription-benefit-v1';
  const ASSIGNMENT = 'bcut_sub_ab_assignment_v1';
  const METRICS = 'bcut_sub_ab_local_metrics_v1';
  const valid = value => value === 'A' || value === 'B';
  function assign(storage, draw) {
    try { const saved = storage.getItem(ASSIGNMENT); if (valid(saved)) return saved; } catch (_) {}
    const variant = draw() < .5 ? 'A' : 'B';
    try { storage.setItem(ASSIGNMENT, variant); } catch (_) {}
    return variant;
  }
  function read(storage) {
    const empty = () => ({experiment:ID,A:{impressions:0,clicks:0},B:{impressions:0,clicks:0}});
    try {
      const data = JSON.parse(storage.getItem(METRICS));
      if (data?.experiment !== ID) return empty();
      for (const variant of ['A','B']) for (const field of ['impressions','clicks']) {
        if (!Number.isSafeInteger(data[variant]?.[field]) || data[variant][field] < 0) return empty();
      }
      return data;
    } catch (_) { return empty(); }
  }
  function record(storage, variant, action) {
    if (!valid(variant) || !['impressions','clicks'].includes(action)) return;
    const data = read(storage); data[variant][action]++;
    try { storage.setItem(METRICS, JSON.stringify(data)); } catch (_) {}
    return data;
  }
  const api = {ID,ASSIGNMENT,METRICS,assign,read,record};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;
  const query = new URLSearchParams(location.search);
  const local = ['localhost','127.0.0.1'].includes(location.hostname);
  const forced = local && valid(query.get('sub_ab')) ? query.get('sub_ab') : null;
  let storage;
  try { storage = localStorage; } catch (_) { storage = {getItem:()=>null,setItem:()=>{}}; }
  const draw = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; } catch (_) { return Math.random(); } };
  const variant = forced || assign(storage, draw);
  const diagnostic = local || /[?&](admin|preview|measure)=1(?:&|$)/.test(location.search);
  const production = ['bcutrank.com','www.bcutrank.com','kdhwan0803.github.io'].includes(location.hostname);
  api.variant = variant;
  api.content = count => ({
    variant,
    line1:variant === 'A' ? '지금 열려 있는 화보,' : '구독으로 열람한 화보,',
    line2:variant === 'A' ? '구독으로 만나보세요.' : '구독 중엔 계속 다시.',
    subtitle:variant === 'A' ? `현재 열람 ${count}편 · 월 19,900원` : '코인 판매로 바뀌어도 · 월 19,900원',
    href:(local?'subscription-preview.html':'subscription.html')+'?utm_source=bcutrank&utm_medium=subscription_banner&utm_campaign=subscription_202610&utm_content='+ (variant === 'A' ? 'a_now' : 'b_revisit')
  });
  root.BCUTSubscriptionAB = api;
  let element = null, ratio = 0, since = 0, impression = false, click = false, scrolled = false;
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.target === element) {
      ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
      if (ratio < .5) since = 0;
    }
  }, {threshold:[0,.5,1]}) : null;
  function emit(action, reason) {
    if (action === 'impressions' && impression || action === 'clicks' && click) return;
    if (action === 'impressions') impression = true; else click = true;
    const params = {experiment_id:ID,variant_id:variant,placement_id:'subscription_banner',exposure_reason:reason,measurement_version:'1',transport_type:'beacon'};
    if (diagnostic) {
      record(storage,variant,action);
      element?.setAttribute('data-ab-'+action,'recorded');
      document.dispatchEvent(new CustomEvent('bcut-sub-ab-local',{detail:{event:action,variant}}));
    } else if (production && !root.BCUT_ANALYTICS_DISABLED && !root.IS_ADMIN && typeof root.track === 'function') {
      root.track(action === 'impressions' ? 'bcut_sub_ab_impression' : 'bcut_sub_ab_click',params);
      root.track('bcut_sub_'+variant.toLowerCase()+'_'+(action === 'impressions' ? 'impression' : 'click'),params);
    }
  }
  function visible() {
    if (!element?.isConnected || document.visibilityState !== 'visible' || !element.getClientRects().length) return false;
    const rect=element.getBoundingClientRect();
    if (!rect.width || !rect.height || getComputedStyle(element).visibility !== 'visible') return false;
    const left=Math.max(0,rect.left),top=Math.max(0,rect.top),right=Math.min(innerWidth,rect.right),bottom=Math.min(innerHeight,rect.bottom);
    if (right<=left || bottom<=top || (right-left)*(bottom-top)/(rect.width*rect.height)<.5) return false;
    let hits=0;
    for (const [x,y] of [[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8]]) {
      const hit=document.elementFromPoint(left+(right-left)*x,top+(bottom-top)*y);
      if (hit && element.contains(hit)) hits++;
    }
    return hits>=3;
  }
  function bind() {
    const next=[...document.querySelectorAll('[data-subscription-ab-banner]')].find(el=>el.getAttribute('data-variant')===variant)||null;
    if (next === element) return;
    if (element && observer) observer.unobserve(element);
    element=next;ratio=0;since=0;
    if (!element) return;
    element.setAttribute('data-ab-mode',diagnostic?'local-check':'live');
    if (impression) element.setAttribute('data-ab-impressions','recorded');
    if (click) element.setAttribute('data-ab-clicks','recorded');
    if (observer) observer.observe(element);
    if (forced && !scrolled) { scrolled=true; requestAnimationFrame(()=>requestAnimationFrame(()=>element?.scrollIntoView({block:'center'}))); }
  }
  function start() {
    bind();
    new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('visibilitychange',()=>{since=0;});
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('[data-subscription-ab-banner]');
      if (!link || event.defaultPrevented || event.button !== 0 || document.visibilityState !== 'visible') return;
      bind();
      // An intentional click is also a confirmed exposure, even before one second.
      if (!impression) emit('impressions','click');
      emit('clicks','click');
    });
    setInterval(()=>{
      if (impression || !element) return;
      if (observer && ratio<.5 || !visible()) { since=0;return; }
      const now=performance.now();
      if (!since) since=now;
      if (now-since>=1000) emit('impressions','view');
    },200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window === 'undefined' ? globalThis : window);
