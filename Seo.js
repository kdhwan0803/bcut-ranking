/* MAXIM B컷 랭킹 · SEO 구조화 데이터(JSON-LD) 자동 주입
   index.html <head> 에 <script src="./seo.js" defer></script> 한 줄만 추가하면 됩니다.
   앱 로직과 독립적으로 동작하며, data.json의 최신 주차 랭킹을 읽어 검색엔진에
   "이번 주 인기 화보 랭킹" 목록(ItemList)을 알려줍니다. */
(function () {
  function addLD(obj) {
    try {
      var s = document.createElement('script');
      s.type = 'application/ld+json';
      s.text = JSON.stringify(obj);
      document.head.appendChild(s);
    } catch (e) {}
  }

  // 1) 사이트 정체성 (고정)
  addLD({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "MAXIM B컷 랭킹",
    "alternateName": ["Bcut Rank", "맥심 B컷 랭킹", "MAXIM B컷"],
    "url": "https://bcutrank.com/",
    "inLanguage": "ko",
    "description": "이번 주 인기 화보 랭킹 · 신작 · 구독 화보를 한눈에. MAXIM B컷 주간 랭킹."
  });
  addLD({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MAXIM B컷",
    "url": "https://bcutrank.com/",
    "logo": "https://i.ibb.co/WpB1gcLw/opt.webp"
  });

  // 2) 최신 주차 랭킹을 ItemList로 (data.json 기준 자동 갱신)
  var srcs = ['data.json', './data.json', '/data.json'];
  (function tryFetch(i) {
    if (i >= srcs.length) return;
    fetch(srcs[i], { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        var wks = (d.weeks || []).slice().sort(function (a, b) {
          return (a.date || '').localeCompare(b.date || '');
        });
        var last = wks[wks.length - 1];
        if (!last || !last.ranking || !last.ranking.length) return;
        var works = d.works || {};
        var items = last.ranking.slice(0, 20).map(function (id, idx) {
          var w = works[id] || {};
          var nm = (w.title || ('화보 ' + id));
          if (w.models && w.models[0]) nm += ' - ' + w.models[0];
          return {
            "@type": "ListItem",
            "position": idx + 1,
            "url": "https://bcut.maximkorea.net/work/" + id,
            "name": nm
          };
        });
        addLD({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "이번 주 인기 화보 랭킹 · MAXIM B컷",
          "description": last.label ? (last.label + ' 화보 인기 랭킹') : '주간 화보 인기 랭킹',
          "numberOfItems": items.length,
          "itemListOrder": "https://schema.org/ItemListOrderDescending",
          "itemListElement": items
        });
      })
      .catch(function () { tryFetch(i + 1); });
  })(0);
})();