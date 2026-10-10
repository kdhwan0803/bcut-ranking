(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model-page-data.js'));
  else { root.BCUTModelBrowse = factory(root.BCUTModelData); root.BCUTModelBrowse.init(); }
})(typeof window === 'object' ? window : this, function (api) {
  'use strict';
  var slugs = ['donggeuran', 'seuli', 'bakseoi'], view;
  function video(work) { return work.vid === true || String(work.vid) === '1'; }
  function ranks(data, date) {
    var best = Object.create(null), works = data.works || {};
    (Array.isArray(data.weeks) ? data.weeks : []).forEach(function (week) {
      if (!api.validDate(week.date) || week.date > date || !Array.isArray(week.ranking)) return;
      var end = new Date(week.date + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() + 6);
      var endDate = end.toISOString().slice(0, 10);
      // The home search also uses each work's best recorded weekly position.
      var eligible = week.ranking.filter(function (id) { return works[id] && works[id].pub <= endDate; });
      eligible.forEach(function (id, index) {
        if (!best[id] || index + 1 < best[id]) best[id] = index + 1;
      });
    });
    return best;
  }
  function seed(state, data) {
    var best = ranks(data, state.date);
    return { model: state.model, items: state.published.map(function (id) {
      var work = state.works[id]; return { id: id, pub: work.pub, video: video(work), rank: best[id] || null };
    }) };
  }
  function latest(a, b) { return b.pub.localeCompare(a.pub) || Number(b.id) - Number(a.id); }
  function ordered(items, filter, sort) {
    return items.filter(function (item) { return filter === 'video' ? item.video : filter === 'photo' ? !item.video : true; })
      .sort(function (a, b) { return (sort === 'popular' ? (a.rank || Infinity) - (b.rank || Infinity) : 0) || latest(a, b); });
  }
  function fromURL(href) {
    var query = new URL(href).searchParams;
    return { filter: ['photo', 'video'].indexOf(query.get('format')) >= 0 ? query.get('format') : 'all',
      sort: query.get('sort') === 'popular' ? 'popular' : 'latest' };
  }
  function listURL(href, filter, sort) {
    var url = new URL(href);
    url.searchParams.delete('format'); url.searchParams.delete('sort');
    if (filter === 'photo' || filter === 'video') url.searchParams.set('format', filter);
    if (sort === 'popular') url.searchParams.set('sort', sort);
    url.hash = 'model-browse'; return url.href;
  }
  function selection() {
    return view ? { browse_format: view.filter, browse_sort: view.sort,
      visible_count: ordered(view.info.items, view.filter, view.sort).length } : {};
  }
  function workURL(href, slug, filter, sort, preview) {
    var url = new URL(href);
    if (url.hostname !== 'bcutrank.com' || !/^\d+$/.test(url.searchParams.get('w') || '') || slugs.indexOf(slug) < 0) return href;
    url.searchParams.set('mb_model', slug); url.searchParams.set('mb_format', filter); url.searchParams.set('mb_sort', sort);
    ['admin', 'preview', 'measure'].forEach(function (key) { if (preview.get(key) === '1') url.searchParams.set(key, '1'); });
    return url.href;
  }
  function change(filter, sort, kind) {
    if (filter === view.filter && sort === view.sort) return;
    var previous = { previous_format: view.filter, previous_sort: view.sort };
    view.filter = filter; view.sort = sort; render();
    try { history.pushState(history.state, '', listURL(location.href, filter, sort)); } catch (e) {}
    if (window.BCUT_ANALYTICS_DISABLED || window.IS_ADMIN || typeof window.gtag !== 'function') return;
    try { window.gtag('event', 'model_browse_change', Object.assign({ module_id: 'model_browse_v1',
      model: view.info.model, model_slug: document.body.dataset.modelPilot, change_type: kind,
      total_count: view.info.items.length, transport_type: 'beacon' }, previous, selection())); } catch (e) {}
  }
  async function copyList() {
    var status = document.getElementById('model-browse-share-status');
    try {
      var url = new URL(listURL(location.href, view.filter, view.sort));
      ['admin', 'preview', 'measure'].forEach(function (key) { url.searchParams.delete(key); });
      await navigator.clipboard.writeText(url.href);
      status.textContent = '현재 조건의 목록 링크를 복사했습니다.';
    } catch (e) { status.textContent = '주소창의 링크를 복사해 주세요.'; }
  }
  function controls(info) {
    var esc = api.escape, photos = info.items.filter(function (item) { return !item.video; }).length;
    return '<section id="model-browse" aria-label="화보 필터와 정렬" hidden><div class="model-browse-controls">' +
      '<div class="model-browse-filters" role="group" aria-label="화보 종류">' +
      [['all', '전체', info.items.length], ['photo', '사진', photos], ['video', '영상 포함', info.items.length - photos]].map(function (item) {
        return '<button type="button" data-model-format="' + item[0] + '" aria-controls="grid" aria-pressed="' + (item[0] === 'all') + '">' + item[1] + ' <span>' + item[2] + '</span></button>';
      }).join('') + '</div><div class="model-browse-actions"><button type="button" id="model-browse-share">목록 링크 복사</button><label class="model-browse-sort">정렬<select id="model-browse-sort" aria-controls="grid"><option value="latest">최신순</option><option value="popular">인기순</option></select></label></div></div>' +
      '<p id="model-browse-share-status" role="status" aria-live="polite"></p>' +
      '<p id="model-browse-status" role="status" aria-live="polite" aria-atomic="true">' + esc(info.items.length) + '편 중 ' + esc(info.items.length) + '편 · 최신순</p>' +
      '<p id="model-browse-hint" hidden>인기순은 역대 주간 랭킹의 최고 순위 기준입니다. 동률이거나 순위 기록이 없는 작품은 최신순으로 표시합니다.</p>' +
      '<div id="model-browse-empty" hidden><p>이 조건에 맞는 공개 화보가 없습니다.</p><button type="button" id="model-browse-reset">전체 화보 보기</button></div></section>';
  }
  function decorate(html, state, data, pageSlug, css) {
    if (slugs.indexOf(pageSlug) === -1) return html;
    var info = seed(state, data);
    html = html.replace(/<section id="model-browse"[\s\S]*?<\/section>\n?/g, '')
      .replace(/<style id="model-browse-css">[\s\S]*?<\/style>\n?/g, '')
      .replace(/<script id="model-browse-state"[\s\S]*?<\/script>\n?/g, '')
      .replace(/<script src="\.\.\/model-browse-pilot\.js" defer><\/script>\n?/g, '');
    html = html.replace(/<body([^>]*)>/, function (_, attrs) { return '<body' + attrs.replace(/ data-model-browse="[^"]*"/g, '') + ' data-model-browse="1">'; });
    html = html.replace(/<div class="grid" id="grid"[^>]*>[\s\S]*?(?=<section class="(?:mtop|faq|rel)")/,
      controls(info) + '\n<div class="grid" id="grid" data-model="' + api.escape(state.model) + '" data-count="' + state.count + '">' + api.cards(state, false, true) + '</div>\n');
    html = html.replace('</head>', '<style id="model-browse-css">' + css.trim() + '</style>\n</head>');
    return html.replace('<script src="../model-page.js" defer>',
      '<script id="model-browse-state" type="application/json">' + JSON.stringify(info).replace(/</g, '\\u003c') + '</script>\n<script src="../model-browse-pilot.js" defer></script>\n<script src="../model-page.js" defer>');
  }
  function render() {
    var items = ordered(view.info.items, view.filter, view.sort), selected = new Set(items.map(function (item) { return item.id; }));
    var focused = document.activeElement, focusedId = focused && focused.dataset.workId;
    var order = items.concat(view.info.items.filter(function (item) { return !selected.has(item.id); }));
    order.forEach(function (item, index) {
      var card = view.nodes.get(item.id); if (!card) return;
      if (!view.hrefs.has(card)) view.hrefs.set(card, card.getAttribute('href'));
      card.setAttribute('href', workURL(view.hrefs.get(card), document.body.dataset.modelPilot, view.filter, view.sort, new URLSearchParams(location.search)));
      card.hidden = !selected.has(item.id);
      if (view.grid.children[index] !== card) view.grid.insertBefore(card, view.grid.children[index] || null);
    });
    var photos = view.info.items.filter(function (item) { return !item.video; }).length;
    var counts = { all: view.info.items.length, photo: photos, video: view.info.items.length - photos };
    view.toolbar.querySelectorAll('[data-model-format]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.modelFormat === view.filter));
      button.querySelector('span').textContent = counts[button.dataset.modelFormat];
    });
    document.getElementById('model-browse-status').textContent = view.info.items.length + '편 중 ' + items.length + '편 · ' + (view.sort === 'popular' ? '인기순' : '최신순');
    document.getElementById('model-browse-hint').hidden = view.sort !== 'popular';
    document.getElementById('model-browse-empty').hidden = !!items.length;
    document.getElementById('model-browse-sort').value = view.sort;
    if (focusedId && selected.has(focusedId) && document.activeElement !== focused) view.nodes.get(focusedId).focus({ preventScroll: true });
  }
  function comparable(card) {
    var copy = card.cloneNode(true); copy.removeAttribute('hidden');
    if (view.hrefs.has(card)) copy.setAttribute('href', view.hrefs.get(card));
    if (window.BCUTImages) {
      var images = card.querySelectorAll('img'), copies = copy.querySelectorAll('img');
      images.forEach(function (img, index) { copies[index].setAttribute('src', window.BCUTImages.original(img)); });
    }
    return copy.outerHTML;
  }
  function update(state, data) {
    if (!view || state.model !== view.info.model) return false;
    var focused = document.activeElement, focusedId = focused && focused.dataset.workId;
    var template = document.createElement('template'); template.innerHTML = api.cards(state, false, true);
    var next = new Map();
    template.content.querySelectorAll('[data-work-id]').forEach(function (card) {
      var id = card.dataset.workId, existing = view.nodes.get(id);
      next.set(id, existing && comparable(existing) === card.outerHTML ? existing : card);
    });
    view.nodes.forEach(function (card, id) { if (next.get(id) !== card) card.remove(); });
    view.info = seed(state, data); view.nodes = next; render();
    if (focusedId && document.activeElement !== focused) {
      var card = next.get(focusedId);
      if (card && !card.hidden) card.focus({ preventScroll: true });
      else view.toolbar.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
    }
    return true;
  }
  function init() {
    if (!api || document.body.dataset.modelBrowse !== '1' || view) return;
    var toolbar = document.getElementById('model-browse'), grid = document.getElementById('grid'), info;
    try { info = JSON.parse(document.getElementById('model-browse-state').textContent); } catch (e) { return; }
    if (!toolbar || !grid || !Array.isArray(info.items) || info.model !== grid.dataset.model) return;
    var initial = fromURL(location.href);
    view = { info: info, grid: grid, toolbar: toolbar, nodes: new Map(), hrefs: new WeakMap(), filter: initial.filter, sort: initial.sort };
    grid.querySelectorAll('[data-work-id]').forEach(function (card) { view.nodes.set(card.dataset.workId, card); });
    var empty = grid.querySelector('.empty'); if (empty) empty.remove();
    toolbar.addEventListener('click', function (event) {
      var button = event.target.closest('[data-model-format]'); if (!button) return;
      change(button.dataset.modelFormat, view.sort, 'format');
    });
    document.getElementById('model-browse-sort').addEventListener('change', function (event) { change(view.filter, event.target.value === 'popular' ? 'popular' : 'latest', 'sort'); });
    document.getElementById('model-browse-reset').addEventListener('click', function () { change('all', view.sort, 'reset'); toolbar.querySelector('[data-model-format="all"]').focus(); });
    document.getElementById('model-browse-share').addEventListener('click', copyList);
    window.addEventListener('popstate', function () {
      var current = fromURL(location.href); view.filter = current.filter; view.sort = current.sort; render();
    });
    render(); toolbar.hidden = false;
    var shortcut = document.querySelector('.all-works'); if (shortcut) shortcut.setAttribute('href', '#model-browse');
  }
  return { video: video, ranks: ranks, seed: seed, ordered: ordered, fromURL: fromURL, listURL: listURL, workURL: workURL, selection: selection, decorate: decorate, init: init, update: update };
});
