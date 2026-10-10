(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BCUTModelData = factory();
})(typeof window === 'object' ? window : this, function () {
  'use strict';
  var BASE = 'https://bcutrank.com';
  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function models(value) {
    if (Array.isArray(value)) return value.map(function (v) { return String(v).trim(); });
    try { var parsed = JSON.parse(String(value || '').replace(/'/g, '"')); return Array.isArray(parsed) ? models(parsed) : []; }
    catch (e) { return []; }
  }
  function today(now) { return new Date((now == null ? Date.now() : now) + 32400000).toISOString().slice(0, 10); }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    var date = new Date(value + 'T00:00:00Z');
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function listed(work) {
    return validDate(work.pub) && work.hidden !== true && work.published !== false &&
      !/^(draft|hidden|deleted|unpublished)$/i.test(work.status || '');
  }
  function clean(value) {
    var text = String(value || '').replace(/^\s*(?:\(19\)|🔞|19(?=[^\d]))\s*/, '');
    text = text.replace(/\[([^\]]*)\]/g, function (_, inner) {
      return /[가-힣ぁ-んァ-ヴー一-龥]/.test(inner) ? ' ' + inner.trim() + ' ' : ' ';
    });
    return text.replace(/\(\s*PHOTO\s*\+\s*VIDEO\s*\)\)+/gi, '(사진 + 영상)')
      .replace(/\s{2,}/g, ' ').trim() || String(value || '');
  }
  function image(value, absolute) {
    var path = String(value || '');
    if (/^https?:\/\//i.test(path)) return path;
    if (!path || /^(?:javascript|data|file):/i.test(path) || path.indexOf('//') === 0) return '';
    path = path.replace(/^(?:\.\/|\/)/, '');
    return (absolute ? BASE + '/' : '../') + path;
  }
  function workLink(id) { return BASE + '/?w=' + encodeURIComponent(id); }
  function summary(data, model, date) {
    date = date || today();
    var works = data.works || {};
    var ids = Object.keys(works).filter(function (id) {
      return listed(works[id]) && models(works[id].models).indexOf(model) >= 0;
    });
    var published = ids.filter(function (id) { return works[id].pub <= date; });
    var upcoming = ids.filter(function (id) { return works[id].pub > date; });
    published.sort(function (a, b) { return works[b].pub.localeCompare(works[a].pub) || Number(b) - Number(a); });
    upcoming.sort(function (a, b) { return works[a].pub.localeCompare(works[b].pub) || Number(a) - Number(b); });
    var latestId = published[0] || '', latest = works[latestId];
    var title = model + ' 화보 ' + published.length + '편 | 맥심 B컷';
    var latestText = latest ? '최신작은 ‘' + clean(latest.title) + '’(' + latest.pub + ' 공개)입니다.' : '현재 공개된 화보가 없습니다.';
    var description = model + ' 화보는 현재 ' + published.length + '편이 공개되어 있습니다. ' + latestText + ' 맥심 B컷에서 인기 화보와 신작을 확인하세요.';
    var faq = [
      { question: model + ' 화보는 몇 편인가요?', answer: '현재 ' + published.length + '편이 공개되어 있으며, 새 화보가 나오면 이 페이지에 자동으로 반영됩니다.' },
      { question: model + '의 최신 화보는 무엇인가요?', answer: latest ? '가장 최근 공개된 화보는 ‘' + clean(latest.title) + '’(' + latest.pub + ' 공개)입니다.' : latestText },
      { question: model + ' 화보는 어디에서 볼 수 있나요?', answer: '맥심 B컷에서 감상할 수 있습니다. 작품별 구매 방식과 현재 구독 열람 여부는 B컷에서 확인하세요. 성인 작품은 판매 사이트의 로그인·성인인증 후 이용할 수 있습니다.' }
    ];
    return { model: model, date: date, works: works, published: published, upcoming: upcoming, count: published.length,
      title: title, description: description, latestId: latestId, latestText: latestText,
      latestUrl: latestId ? workLink(latestId) : BASE + '/?model=' + encodeURIComponent(model),
      image: latest ? image(latest.img, true) : '', faq: faq };
  }
  function cards(state, upcoming) {
    var ids = upcoming ? state.upcoming : state.published;
    if (!ids.length && !upcoming) return '<div class="empty">현재 공개된 화보가 없습니다.</div>';
    return ids.map(function (id) {
      var work = state.works[id], name = clean(work.title), adult = work.b19 === true || String(work.b19) === '1';
      var video = work.vid === true || String(work.vid) === '1';
      var badge = (upcoming ? '<span class="bd up">🗓 예정</span>' : '') + (adult ? '<span class="bd b19">19</span>' : '') + (video ? '<span class="bd vid">▶ 영상</span>' : '');
      var tag = upcoming ? 'div' : 'a';
      var attrs = upcoming ? '' : ' href="' + escape(workLink(id)) + '" rel="nofollow"';
      return '<' + tag + ' class="card' + (upcoming ? ' up' : '') + (adult ? ' b19' : '') + '"' + attrs + '><div class="thumb"><img loading="lazy" src="' + escape(image(work.img)) + '" alt="' + escape(name) + '"><div class="badges">' + badge + '</div></div><div class="meta"><div class="mt">' + escape(name) + '</div><div class="mp">' + escape(work.pub) + (upcoming ? ' 공개 예정' : '') + '</div></div></' + tag + '>';
    }).join('\n');
  }
  function intro(state) {
    var names = [];
    state.published.forEach(function (id) { var name = state.works[id].photo; if (name && names.indexOf(name) < 0) names.push(name); });
    return '<p><b>' + escape(state.model) + '</b> 화보는 현재 <b>' + state.count + '편</b>이 공개되어 있습니다.</p><p>' + escape(state.latestText) + '</p>' +
      (names.length ? '<p>참여 작가: ' + names.map(escape).join(' · ') + '</p>' : '') +
      '<p>작품별 구매 방식과 현재 구독 열람 여부는 B컷에서 확인하세요. 성인 작품은 판매 사이트의 로그인·성인인증 후 이용할 수 있습니다.</p>';
  }
  function faqHTML(state) {
    return '<div class="seclbl">자주 묻는 질문</div>' + state.faq.map(function (entry) {
      return '<div class="q"><div class="qt">Q. ' + escape(entry.question) + '</div><div class="qa">' + escape(entry.answer) + '</div></div>';
    }).join('');
  }
  function schema(state, url, existing) {
    var list = Array.isArray(existing) ? existing : existing ? [existing] : [];
    list = list.filter(function (entry) { return entry['@type'] !== 'CollectionPage' && entry['@type'] !== 'FAQPage'; });
    list.unshift({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: state.title, description: state.description, url: url,
      mainEntity: { '@type': 'ItemList', numberOfItems: state.count, itemListElement: state.published.map(function (id, i) {
        return { '@type': 'ListItem', position: i + 1, url: workLink(id), name: clean(state.works[id].title) };
      }) } });
    list.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: state.faq.map(function (entry) {
      return { '@type': 'Question', name: entry.question, acceptedAnswer: { '@type': 'Answer', text: entry.answer } };
    }) });
    return list;
  }
  function directory(data, config, date) {
    date = date || today();
    var names = {};
    Object.keys(data.works || {}).forEach(function (id) {
      var work = data.works[id];
      if (listed(work) && work.pub <= date) models(work.models).forEach(function (name) { if (name) names[name] = true; });
    });
    return Object.keys(names).map(function (name) {
      var state = summary(data, name, date), latest = state.works[state.latestId];
      var portrait = ((data.models || {})[name] || {}).img || config.portraits[name] || latest.img;
      var slug = config.slugs[name];
      return { name: name, count: state.count, date: latest.pub, image: image(portrait),
        url: slug ? BASE + '/models/' + slug + '.html' : BASE + '/?model=' + encodeURIComponent(name) };
    }).sort(function (a, b) { return b.count - a.count || b.date.localeCompare(a.date) || a.name.localeCompare(b.name); });
  }
  function directoryHTML(entries) {
    return entries.map(function (entry) {
      return '<a class="card" href="' + escape(entry.url) + '"><div class="thumb"><img loading="lazy" src="' + escape(entry.image) + '" alt="' + escape(entry.name) + ' 화보"></div><div class="meta"><div class="mt">' + escape(entry.name) + '</div><div class="mp">화보 ' + entry.count + '편 · ' + escape(entry.date) + '</div></div></a>';
    }).join('\n');
  }
  return { BASE: BASE, escape: escape, models: models, today: today, validDate: validDate, listed: listed, clean: clean, image: image,
    summary: summary, cards: cards, intro: intro, faqHTML: faqHTML, schema: schema, directory: directory, directoryHTML: directoryHTML };
});
