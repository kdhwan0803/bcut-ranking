(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model-page-data.js'));
  else { root.BCUTModelPilot = factory(root.BCUTModelData); root.BCUTModelPilot.init(); }
})(typeof window === 'object' ? window : this, function (api) {
  'use strict';
  var slugs = ['donggeuran', 'seuli', 'bakseoi'], version = 'model_cta_pilot_v1';
  function selected(slug) { return slugs.indexOf(slug) >= 0; }
  function saleURL(id, slug) {
    return 'https://bcut.maximkorea.net/work/' + encodeURIComponent(id) + '?utm_source=bcutrank&utm_medium=model_latest&utm_campaign=' + version + '&utm_content=' + encodeURIComponent(slug + '_latest_card');
  }
  function format(work) {
    if (/photo\s*\+\s*video|사진\s*\+\s*영상/i.test(work.title || '')) return '사진 + 영상';
    if (/photo\s*(?:only)?|사진/i.test(work.title || '')) return '사진';
    return work.vid === true || String(work.vid) === '1' || /video|영상/i.test(work.title || '') ? '영상' : '사진';
  }
  function feature(state, slug) {
    var id = state.latestId, work = state.works[id], esc = api.escape;
    if (!work) return '<div class="empty">현재 공개된 화보가 없습니다.</div>';
    var title = api.clean(work.title), adult = work.b19 === true || String(work.b19) === '1';
    return '<article class="latest-feature" aria-labelledby="latest-title">' +
      '<a class="latest-cover" data-pilot-position="latest_cover" href="' + esc(state.latestUrl) + '" aria-label="' + esc(title + ' 작품 정보 보기') + '">' +
      '<img src="' + esc(api.image(work.img)) + '" alt="' + esc(title) + '" width="300" height="400" fetchpriority="high" decoding="async"></a>' +
      '<div class="latest-detail"><p class="latest-label">최신 공개 화보</p><h2 id="latest-title">' + esc(title) + '</h2>' +
      '<p class="latest-meta"><time datetime="' + esc(work.pub) + '">' + esc(work.pub) + ' 공개</time><span>' + format(work) + '</span>' + (adult ? '<span class="latest-age">19</span>' : '') + '</p>' +
      '<div class="latest-actions"><a class="btn pri" data-pilot-position="latest_card" data-latest-sale href="' + esc(saleURL(id, slug)) + '" target="_blank" rel="noopener">B컷에서 이 작품 보기</a>' +
      '<a class="btn sec" id="latestBtn" data-pilot-position="latest_info" data-latest-work href="' + esc(state.latestUrl) + '">작품 정보 보기</a></div>' +
      '<p class="latest-note">구매 방식과 가격은 B컷에서 확인하세요.' + (adult ? ' 성인 작품은 로그인·성인인증 후 이용할 수 있습니다.' : '') + '</p></div></article>';
  }
  function hero(state, slug) {
    return '<section class="hero"><div class="eyebrow">MAXIM B컷 · 모델 화보</div><h1>' + api.escape(state.model) + ' 화보</h1>' +
      '<p class="sub">현재 공개된 화보 <b id="cnt">' + state.count + '</b>편 <a class="all-works" href="#grid">전체 목록 보기</a></p>' +
      '<div id="latest-feature">' + feature(state, slug) + '</div></section>';
  }
  var analytics = '<script id="model-pilot-analytics">window.BCUT_ANALYTICS_DISABLED=!/^https?:$/.test(location.protocol)||!["bcutrank.com","www.bcutrank.com","kdhwan0803.github.io"].includes(location.hostname)||/[?&](admin|preview|measure)=1(?:&|$)/.test(location.search)||!!window.IS_ADMIN;window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}if(!window.BCUT_ANALYTICS_DISABLED){gtag("js",new Date());gtag("config","G-0M1DPCT33G",{content_group:"' + version + '"});var ga=document.createElement("script");ga.async=true;ga.src="https://www.googletagmanager.com/gtag/js?id=G-0M1DPCT33G";document.head.appendChild(ga);}</script>';
  function decorate(html, state, slug) {
    if (!selected(slug)) return html;
    html = html.replace(/<section class="hero">[\s\S]*?<\/section>/, hero(state, slug));
    html = html.replace(/<body(?: data-model-pilot="[^"]*")?>/, '<body data-model-pilot="' + slug + '">');
    html = html.replace(/<link rel="stylesheet" href="\.\.\/model-cta-pilot\.css">\n?/g, '')
      .replace('</head>', '<link rel="stylesheet" href="../model-cta-pilot.css">\n</head>');
    html = html.replace(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-0M1DPCT33G"><\/script>\n?/g, '')
      .replace(/<script>(?=window\.dataLayer=window\.dataLayer\|\|\[\])[\s\S]*?<\/script>/g, '')
      .replace(/<script id="model-pilot-analytics">[\s\S]*?<\/script>\n?/g, '')
      .replace('</head>', analytics + '\n</head>');
    // Replace pilot inline click handlers with one delegated outbound event.
    html = html.replace(/ onclick="[^"]*gtag\('event','model_(?:top3|cta)_click'[^"]*"/g, '');
    html = html.replace(/<script src="\.\.\/model-cta-pilot\.js" defer><\/script>\n?/g, '')
      .replace('<script src="../model-page.js" defer>', '<script src="../model-cta-pilot.js" defer></script>\n<script src="../model-page.js" defer>');
    return html;
  }
  function init() {
    var slug = document.body.dataset.modelPilot;
    if (!api || !selected(slug) || document.body.dataset.pilotTrackingBound) return;
    document.body.dataset.pilotTrackingBound = '1';
    var model = document.getElementById('grid').dataset.model;
    function track(name, params) {
      if (window.BCUT_ANALYTICS_DISABLED || window.IS_ADMIN || typeof window.gtag !== 'function') return;
      try { window.gtag('event', name, params); } catch (e) {}
    }
    function params(workId, origin) {
      return { module_id: version, list_id: version, model: model, model_slug: slug, work_id: workId || '', link_origin: origin, transport_type: 'beacon' };
    }
    function update(state) {
      var host = document.getElementById('latest-feature');
      if (!host) return;
      var work = state.works[state.latestId] || {};
      var key = JSON.stringify([state.latestId, work.title, work.img, work.pub, work.vid, work.b19]);
      if (host.dataset.stateKey === key) return;
      var focused = document.activeElement, position = host.contains(focused) && focused.dataset.pilotPosition;
      host.innerHTML = feature(state, slug); host.dataset.stateKey = key;
      if (position) { var target = host.querySelector('[data-pilot-position="' + position + '"]'); if (target) target.focus({preventScroll:true}); }
    }
    document.addEventListener('bcut:model-update', function (event) { update(event.detail); });
    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href]'); if (!link) return;
      var url; try { url = new URL(link.href); } catch (e) { return; }
      var idMatch = url.pathname.match(/^\/work\/(\d+)/), id = idMatch ? idMatch[1] : url.searchParams.get('w') || '';
      var origin = link.dataset.pilotPosition || (link.closest('.mtop') ? 'popular_top3' : link.closest('.mcta') ? 'sticky_model' : link.closest('.endcta') ? 'bottom_latest' : link.closest('header') ? 'header_latest' : link.closest('#grid') ? 'work_list' : 'other_link');
      if (url.hostname === 'bcut.maximkorea.net') {
        var values = params(id, origin); values.link_url = url.href;
        track('go_bcut', values);
      } else if (url.hostname === 'bcutrank.com' && id) track('model_work_open', params(id, origin));
    });
    track('model_pilot_view', params('', 'model_page'));
  }
  return { slugs: slugs, version: version, selected: selected, saleURL: saleURL, format: format, feature: feature, decorate: decorate, init: init };
});
