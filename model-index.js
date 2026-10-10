(function () {
  'use strict';
  var api = window.BCUTModelData, grid = document.getElementById('grid'), input = document.getElementById('q');
  var config = JSON.parse(document.getElementById('model-directory-config').textContent);
  function filter() {
    var value = input.value.trim().toLowerCase(), shown = 0;
    grid.querySelectorAll('.card').forEach(function (card) {
      var match = card.textContent.toLowerCase().indexOf(value) >= 0;
      card.hidden = !match; card.style.display = match ? '' : 'none'; if (match) shown++;
    });
    document.getElementById('mcount').textContent = shown;
  }
  input.addEventListener('input', filter);
  function refresh() {
    fetch('../data.json', { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('data.json HTTP ' + response.status);
      return response.json();
    }).then(function (data) {
      if (!data.works || typeof data.works !== 'object') throw new Error('Invalid catalogue');
      var entries = api.directory(data, config);
      grid.innerHTML = api.directoryHTML(entries);
      var title = '맥심 B컷 모델 전체 ' + entries.length + '명 · 화보 랭킹';
      var description = '맥심 B컷 화보 모델 ' + entries.length + '명을 한눈에. 모델별 인기 화보와 신작을 MAXIM B컷 주간 랭킹에서 확인하세요.';
      document.title = title;
      document.querySelector('meta[property="og:title"]').content = title;
      document.querySelector('meta[name="description"]').content = description;
      document.querySelector('meta[property="og:description"]').content = description;
      document.querySelector('script[type="application/ld+json"]').textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: entries.length,
        itemListElement: entries.map(function (entry, i) { return { '@type': 'ListItem', position: i + 1, url: entry.url, name: entry.name }; })
      });
      filter();
    }).catch(function (error) { console.warn('모델 목록 갱신 실패: 정적 정보를 유지합니다.', error.message); });
  }
  refresh(); setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
})();
