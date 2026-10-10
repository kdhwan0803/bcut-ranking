(function () {
  'use strict';
  var byId = function (id) { return document.getElementById(id); };
  var entries = [], running = false, controller, limit = 40, scheduled = false, loadFailed = false;
  var labels = { pending: '미점검', ok: '정상', error: '로드 실패', timeout: '시간 초과', invalid: '경로 없음' };
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function url(value) {
    if (!value) return '';
    try { var result = new URL(value, location.origin + '/'); return /^https?:$/.test(result.protocol) ? result.href : ''; } catch (e) { return ''; }
  }
  function target() {
    var query = byId('query').value.trim().toLocaleLowerCase();
    return entries.filter(function (entry) { return !query || [entry.id, entry.title, entry.model].join(' ').toLocaleLowerCase().includes(query); });
  }
  function issue(entry) { return ['error', 'timeout', 'invalid'].includes(entry.status); }
  function render() {
    scheduled = false;
    var selected = target(), done = selected.filter(function (entry) { return entry.status !== 'pending'; }).length;
    var failures = selected.filter(issue), good = selected.filter(function (entry) { return entry.status === 'ok'; }).length;
    if (loadFailed) byId('summary').textContent = '작품 목록을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.';
    else byId('summary').textContent = (running ? '점검 중 · ' : '') + '대상 ' + selected.length + '편 · 확인 ' + done + '편 · 정상 ' + good + '편 · 실패·시간 초과 ' + failures.length + '편';
    byId('progress').max = Math.max(1, selected.length); byId('progress').value = done;
    byId('start').disabled = running || (!selected.length && !loadFailed);
    byId('start').textContent = loadFailed ? '다시 불러오기' : done && !running ? '대상 다시 점검' : '대상 점검 시작';
    byId('stop').hidden = !running; byId('copy').disabled = !failures.length;
    byId('query').disabled = running; byId('filter').disabled = running;
    var filter = byId('filter').value;
    var visible = selected.filter(function (entry) { return filter === 'all' || (filter === 'issues' ? issue(entry) : entry.status === filter); });
    byId('more').hidden = visible.length <= limit;
    byId('results').innerHTML = visible.slice(0, limit).map(function (entry) {
      var src = entry.status === 'ok' ? entry.url : issue(entry) ? window.BCUTImages.placeholder : '';
      return '<article class="row" data-work-id="' + esc(entry.id) + '"><div class="cover">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(entry.title) + '" loading="lazy" width="72" height="96">' : '<span aria-hidden="true">—</span>') + '</div>' +
        '<div class="details"><span class="work-id">#' + esc(entry.id) + '</span><div class="title">' + esc(entry.title) + '</div><div class="meta">' + esc(entry.model) + (entry.pub ? ' · ' + esc(entry.pub) : '') + '</div>' +
        '<div class="links"><a href="/?w=' + encodeURIComponent(entry.id) + '&preview=1" target="_blank" rel="noopener">작품 정보</a>' + (entry.url ? '<a href="' + esc(entry.url) + '" target="_blank" rel="noopener noreferrer">원래 이미지</a>' : '') + '</div></div>' +
        '<div class="result-actions"><div class="state" data-result="' + entry.status + '">' + labels[entry.status] + '</div><button data-check="' + esc(entry.id) + '"' + (running ? ' disabled' : '') + '>' + (entry.status === 'pending' ? '이 작품 점검' : '다시 점검') + '</button></div></article>';
    }).join('') || '<p class="empty">' + (loadFailed ? '작품 목록을 다시 불러와 주세요.' : !selected.length ? '검색한 작품이 없습니다.' : running ? '선택한 결과가 아직 없습니다. 점검이 진행 중입니다.' : filter === 'issues' && !done ? '대상 점검 시작을 누르면 실패한 작품이 여기에 표시됩니다.' : filter === 'issues' ? '현재 확인된 실패·시간 초과 썸네일이 없습니다.' : '선택한 결과가 없습니다.') + '</p>';
  }
  function schedule() { if (!scheduled) { scheduled = true; setTimeout(render, 120); } }
  function probe(source, signal) {
    return new Promise(function (resolve) {
      if (!source) { resolve('invalid'); return; }
      if (signal.aborted) { resolve('pending'); return; }
      var img = new Image(), settled = false;
      function finish(status) {
        if (settled) return; settled = true; clearTimeout(timer);
        signal.removeEventListener('abort', cancel); img.onload = img.onerror = null; img.src = '';
        resolve(status);
      }
      function cancel() { finish('pending'); }
      var timer = setTimeout(function () { finish('timeout'); }, 10000);
      signal.addEventListener('abort', cancel, { once: true });
      img.onload = function () { finish(img.naturalWidth > 0 ? 'ok' : 'error'); };
      img.onerror = function () { finish('error'); }; img.src = source;
    });
  }
  async function check(list) {
    if (running || !list.length) return;
    running = true; controller = new AbortController();
    list.forEach(function (entry) { entry.status = 'pending'; });
    byId('export').hidden = true; byId('message').textContent = ''; render();
    var cursor = 0, signal = controller.signal;
    async function worker() {
      while (!signal.aborted && cursor < list.length) {
        var entry = list[cursor++]; entry.status = await probe(entry.url, signal); schedule();
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, list.length) }, worker));
    running = false; byId('message').textContent = signal.aborted ? '점검을 중지했습니다. 확인하지 못한 작품은 미점검으로 남습니다.' : '점검을 마쳤습니다. 실패한 이미지는 원래 링크를 확인하고 다시 점검할 수 있습니다.'; render();
  }
  async function load() {
    loadFailed = false; byId('start').disabled = true; byId('summary').textContent = '작품 목록을 불러오는 중…';
    try {
      var response = await fetch('./data.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Catalogue unavailable');
      var data = await response.json();
      if (!data || !data.works || typeof data.works !== 'object') throw new Error('Invalid catalogue');
      entries = Object.keys(data.works).map(function (id) {
        var work = data.works[id]; return { id: id, title: work.title || id, model: (Array.isArray(work.models) ? work.models : []).join(' · '), pub: work.pub || '', url: url(work.img), status: 'pending' };
      }).sort(function (a, b) { return b.pub.localeCompare(a.pub) || Number(b.id) - Number(a.id); });
    } catch (e) { loadFailed = true; }
    render();
  }
  byId('start').addEventListener('click', function () { if (loadFailed) load(); else check(target()); });
  byId('stop').addEventListener('click', function () { if (controller) controller.abort(); });
  byId('query').addEventListener('input', function () { limit = 40; render(); });
  byId('filter').addEventListener('change', function () { limit = 40; render(); });
  byId('more').addEventListener('click', function () { limit += 40; render(); });
  byId('results').addEventListener('click', function (event) {
    var button = event.target.closest('[data-check]'); if (!button) return;
    var entry = entries.find(function (item) { return item.id === button.dataset.check; }); if (entry) check([entry]);
  });
  byId('copy').addEventListener('click', async function () {
    var text = target().filter(issue).map(function (entry) { return [entry.id, entry.model, entry.title, labels[entry.status], entry.url].map(function (value) { return String(value).replace(/[\t\r\n]/g, ' '); }).join('\t'); }).join('\n');
    if (!text) return;
    try { await navigator.clipboard.writeText(text); byId('message').textContent = '실패 목록을 복사했습니다.'; }
    catch (e) { byId('export').value = text; byId('export').hidden = false; byId('export').focus(); byId('export').select(); byId('message').textContent = '아래 목록을 선택해 복사하세요.'; }
  });
  load();
})();
