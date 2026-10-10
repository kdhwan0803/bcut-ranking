(function () {
  'use strict';
  var api = window.BCUTModelData, grid = document.getElementById('grid');
  if (!api || !grid || !grid.dataset.model) return;
  var model = grid.dataset.model;
  function text(id, value) { var element = document.getElementById(id); if (element) element.textContent = value; }
  function meta(selector, value) { var element = document.querySelector(selector); if (element) element.setAttribute('content', value); }
  function html(element, value) {
    if (!element) return;
    if (window.BCUTImages) { if (!window.BCUTImages.matches(element, value)) element.innerHTML = value; return; }
    var template = document.createElement('template'); template.innerHTML = value;
    // Compare browser-normalized HTML so an unchanged refresh keeps loaded
    // images and the user's focused element instead of replacing the DOM.
    if (element.innerHTML !== template.innerHTML) element.innerHTML = value;
  }
  function apply(data) {
    var state = api.summary(data, model);
    document.title = state.title;
    meta('meta[name="description"]', state.description);
    meta('meta[property="og:title"]', state.title);
    meta('meta[property="og:description"]', state.description);
    meta('meta[property="og:image"]', state.image);
    text('cnt', state.count); text('cnt2', state.count + '편'); text('upcnt', state.upcoming.length + '편');
    grid.dataset.count = state.count;
    if (!window.BCUTModelBrowse || !window.BCUTModelBrowse.update(state, data)) html(grid, api.cards(state, false));
    var upwrap = document.getElementById('upwrap'), upgrid = document.getElementById('upgrid');
    if (upwrap && upgrid) { html(upgrid, api.cards(state, true)); upwrap.hidden = !state.upcoming.length; }
    var intro = document.querySelector('.intro'), faq = document.querySelector('.faq');
    html(intro, api.intro(state));
    html(faq, api.faqHTML(state));
    document.querySelectorAll('[data-latest-work]').forEach(function (link) { link.href = state.latestUrl; });
    document.querySelectorAll('.rel .chip').forEach(function (link) {
      var count = link.querySelector('b'); if (!count) return;
      var related = link.childNodes[0].textContent.trim();
      count.textContent = '화보 ' + api.summary(data, related, state.date).count;
    });
    // Keep popularity ordering and destinations; refresh only their existing image IDs.
    document.querySelectorAll('.mtop a').forEach(function (link) {
      var match = link.href.match(/\/work\/(\d+)/), img = link.querySelector('img');
      var work = match && data.works[match[1]];
      if (work && img) {
        var original = window.BCUTImages ? window.BCUTImages.original(img) : img.getAttribute('src');
        if (original !== api.image(work.img)) img.src = api.image(work.img);
      }
    });
    var schema = document.querySelector('script[type="application/ld+json"]');
    var canonical = document.querySelector('link[rel="canonical"]');
    if (schema && canonical) {
      var existing; try { existing = JSON.parse(schema.textContent); } catch (e) { existing = []; }
      schema.textContent = JSON.stringify(api.schema(state, canonical.href, existing));
    }
    document.dispatchEvent(new CustomEvent('bcut:model-update', { detail: state }));
  }
  var pending;
  function refresh() {
    if (pending) return pending;
    pending = fetch('../data.json', { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('data.json HTTP ' + response.status);
      return response.json();
    }).then(function (data) {
      if (!data || !data.works || typeof data.works !== 'object') throw new Error('Invalid catalogue');
      apply(data);
    }).catch(function (error) { console.warn('모델 정보 갱신 실패: 정적 정보를 유지합니다.', error.message); })
      .finally(function () { pending = null; });
    return pending;
  }
  if (document.body.dataset.modelSpeed === '1') {
    function initialRefresh() {
      if (window.requestIdleCallback) window.requestIdleCallback(refresh, { timeout: 2000 });
      else setTimeout(refresh, 0);
    }
    if (document.readyState === 'complete') initialRefresh();
    else window.addEventListener('load', initialRefresh, { once: true });
  } else refresh();
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
})();
