const fs = require('node:fs');
const path = require('node:path');
const api = require('../model-page-data.js');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const dateIndex = process.argv.indexOf('--date');
const date = dateIndex < 0 ? api.today() : process.argv[dateIndex + 1];
if (!api.validDate(date)) throw new Error('Use --date YYYY-MM-DD (KST)');
const escape = api.escape;
const BASE = api.BASE;

// Creator (work.photo) -> URL slug. Only creators listed here get a static page,
// so new creators are reviewed before publishing. Slugs must match /^[a-z0-9_-]+$/
// and be unique inside creators/. Keep this in sync with sitemap.xml;
// check-creator-pages.cjs fails the build if they drift.
const CREATOR_SLUGS = require('./creator-slugs.json');

// Authoritative model-name -> model-page slug map, read from the generated model
// pages (same source update-model-pages.cjs uses). Lets the creator intro link
// each participating model to her own page.
function modelSlugMap() {
  const map = {};
  for (const file of fs.readdirSync(path.join(root, 'models')).filter(f => f.endsWith('.html') && f !== 'models.html')) {
    const html = fs.readFileSync(path.join(root, 'models', file), 'utf8');
    const match = html.match(/var MODEL=("(?:[^"\\]|\\.)*")/) || html.match(/data-model="([^"]+)"/);
    if (!match) continue;
    const name = match[1].startsWith('"') ? JSON.parse(match[1]) : match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    map[name] = file.slice(0, -5);
  }
  return map;
}

function listedBy(creator) {
  const works = data.works || {};
  return Object.keys(works).filter(id => api.listed(works[id]) && String(works[id].photo || '').trim() === creator);
}

// Mirror of api.summary, keyed on the creator (work.photo) instead of the model.
function creatorState(creator, modelSlugs) {
  const works = data.works || {};
  const ids = listedBy(creator);
  const published = ids.filter(id => works[id].pub <= date)
    .sort((a, b) => works[b].pub.localeCompare(works[a].pub) || Number(b) - Number(a));
  const upcoming = ids.filter(id => works[id].pub > date)
    .sort((a, b) => works[a].pub.localeCompare(works[b].pub) || Number(a) - Number(b));
  const latestId = published[0] || '';
  const latest = works[latestId];
  // Participating models across this creator's published works, most-works first.
  const counts = {};
  published.forEach(id => api.models(works[id].models).forEach(m => { if (m) counts[m] = (counts[m] || 0) + 1; }));
  const models = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  const modelText = models.slice(0, 6).join('·');
  const title = creator + ' 화보 ' + published.length + '편 | 맥심 B컷';
  const latestText = latest ? '최신작은 ‘' + api.clean(latest.title) + '’(' + latest.pub + ' 공개)입니다.' : '현재 공개된 화보가 없습니다.';
  const description = creator + ' 작가의 B컷 화보 ' + published.length + '편.' + (modelText ? ' 참여 모델: ' + modelText + '.' : '') + ' ' + latestText + ' 맥심 B컷에서 인기 화보와 신작을 확인하세요.';
  const faq = [
    { question: creator + ' 작가의 화보는 몇 편인가요?', answer: '현재 ' + published.length + '편이 공개되어 있으며, 새 화보가 나오면 이 페이지에 자동으로 반영됩니다.' },
    { question: creator + ' 작가와 작업한 모델은 누구인가요?', answer: models.length ? models.slice(0, 10).join(', ') + ' 등이 ' + creator + ' 작가의 화보에 참여했습니다.' : '참여 모델 정보는 각 작품에서 확인할 수 있습니다.' },
    { question: creator + ' 작가의 화보는 어디에서 볼 수 있나요?', answer: '맥심 B컷에서 감상할 수 있습니다. 작품별 구매 방식과 현재 구독 열람 여부는 B컷에서 확인하세요. 성인 작품은 판매 사이트의 로그인·성인인증 후 이용할 수 있습니다.' }
  ];
  return {
    model: creator, creator: creator, date: date, works: works, published: published, upcoming: upcoming,
    count: published.length, title: title, description: description, latestId: latestId, latestText: latestText,
    latestUrl: latestId ? BASE + '/?w=' + encodeURIComponent(latestId) : BASE + '/?photo=' + encodeURIComponent(creator),
    image: latest ? api.image(latest.img, true) : '', faq: faq, models: models, modelSlugs: modelSlugs
  };
}

function creatorIntro(state) {
  const chips = state.models.map(name => {
    const slug = state.modelSlugs[name];
    return slug
      ? '<a class="chip" href="' + BASE + '/models/' + slug + '.html">' + escape(name) + '</a>'
      : '<span class="chip">' + escape(name) + '</span>';
  }).join('');
  return '<p><b>' + escape(state.creator) + '</b> 작가의 화보는 현재 <b>' + state.count + '편</b>이 공개되어 있습니다.</p>'
    + '<p>' + escape(state.latestText) + '</p>'
    + (state.models.length ? '<p>참여 모델</p><div class="chips">' + chips + '</div>' : '')
    + '<p>작품별 구매 방식과 현재 구독 열람 여부는 B컷에서 확인하세요. 성인 작품은 판매 사이트의 로그인·성인인증 후 이용할 수 있습니다.</p>';
}

const STYLE = fs.readFileSync(path.join(__dirname, 'creator-page.css'), 'utf8').trim();

function render(state, slug) {
  const canonical = BASE + '/creators/' + slug + '.html';
  const schema = api.schema(state, canonical, [{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: '작가 전체', item: BASE + '/creators/creators.html' },
      { '@type': 'ListItem', position: 3, name: state.creator + ' 화보', item: canonical }
    ]
  }]);
  const saleUrl = 'https://bcut.maximkorea.net/work/' + encodeURIComponent(state.latestId)
    + '?utm_source=bcutrank&utm_medium=creator_latest&utm_campaign=creator_pages_v1&utm_content=' + encodeURIComponent(slug);
  const up = state.upcoming.length
    ? '<div id="upwrap"><div class="seclbl soon">곧 공개 예정 <small id="upcnt">' + state.upcoming.length + '편</small></div><div class="grid" id="upgrid">' + api.cards(state, true) + '</div></div>\n'
    : '<div id="upwrap" hidden><div class="seclbl soon">곧 공개 예정 <small id="upcnt">0편</small></div><div class="grid" id="upgrid"></div></div>\n';
  return '<!doctype html><html lang="ko"><head>\n'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + escape(state.title) + '</title>\n'
    + '<meta name="description" content="' + escape(state.description) + '">\n'
    + '<link rel="canonical" href="' + canonical + '">\n'
    + '<meta name="robots" content="index,follow">\n'
    + '<meta property="og:type" content="website">\n'
    + '<meta property="og:title" content="' + escape(state.title) + '">\n'
    + '<meta property="og:description" content="' + escape(state.description) + '">\n'
    + '<meta property="og:image" content="' + escape(state.image) + '">\n'
    + '<meta property="og:url" content="' + canonical + '">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
    + '<style>\n' + STYLE + '\n</style>\n'
    + '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>\n'
    + '<script src="../thumbnail-fallback.js" defer></script>\n'
    + '</head><body data-creator="' + escape(state.creator) + '">\n'
    + '<header class="top"><div class="in"><a class="brand" href="' + BASE + '/"><b>MAXIM</b> B컷 랭킹</a><a class="topcta" data-latest-work href="' + escape(state.latestUrl) + '">최신 화보 보기 →</a></div></header>\n'
    + '<div class="wrap">\n'
    + '<nav class="crumb"><a href="' + BASE + '/">홈</a> › <a href="' + BASE + '/creators/creators.html">작가 전체</a> › ' + escape(state.creator) + ' 화보</nav>\n'
    + '<section class="hero"><div class="eyebrow">MAXIM B컷 · 작가 화보</div><h1>' + escape(state.creator) + ' 화보</h1><p class="sub">현재 공개된 화보 <b id="cnt">' + state.count + '</b>편 <a class="all-works" href="#grid">전체 목록 보기</a></p></section>\n'
    + '<section class="intro">' + creatorIntro(state) + '</section>\n'
    + up
    + '<div class="seclbl">' + escape(state.creator) + ' 화보 목록 <small id="cnt2">' + state.count + '편</small></div>\n'
    + '<div class="grid" id="grid" data-creator="' + escape(state.creator) + '" data-count="' + state.count + '">' + api.cards(state, false) + '</div>\n'
    + '<section class="faq">' + api.faqHTML(state) + '</section>\n'
    + '<div class="endcta">\n<div class="t">' + escape(state.creator) + ' 작가의 더 많은 화보가 기다려요</div>\n'
    + '<div class="d">주간 랭킹·신작·풀버전까지, 맥심 B컷에서 지금 확인하세요.</div>\n'
    + '<a class="btn pri" data-latest-sale href="' + escape(saleUrl) + '" target="_blank" rel="noopener">▶ ' + escape(state.creator) + ' 최신작 보러 가기</a>\n</div>\n'
    + '</div>\n'
    + '<footer class="ft">© MAXIM KOREA · B컷 · <a href="' + BASE + '/">전체 랭킹 보기</a> · <a href="' + BASE + '/creators/creators.html">작가 전체</a><br>본 페이지는 성인(19+) 콘텐츠를 포함할 수 있습니다.</footer>\n'
    + '</body></html>\n';
}

function renderDirectory(entries) {
  const canonical = BASE + '/creators/creators.html';
  const title = '맥심 B컷 작가 전체 ' + entries.length + '명 · 화보 랭킹';
  const description = '맥심 B컷 화보 작가 ' + entries.length + '명을 한눈에. 작가별 참여 화보와 모델을 MAXIM B컷 주간 랭킹에서 확인하세요.';
  const cards = entries.map(e =>
    '<a class="card" href="' + BASE + '/creators/' + e.slug + '.html"><div class="thumb"><img loading="lazy" src="' + escape(e.image) + '" alt="' + escape(e.creator) + ' 화보"></div><div class="meta"><div class="mt">' + escape(e.creator) + '</div><div class="mp">화보 ' + e.count + '편 · ' + escape(e.date) + '</div></div></a>'
  ).join('\n');
  const schema = {
    '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: BASE + '/creators/' + e.slug + '.html', name: e.creator }))
  };
  return '<!doctype html><html lang="ko"><head>\n'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + escape(title) + '</title>\n'
    + '<meta name="description" content="' + escape(description) + '">\n'
    + '<link rel="canonical" href="' + canonical + '">\n'
    + '<meta name="robots" content="index,follow">\n'
    + '<meta property="og:type" content="website"><meta property="og:title" content="' + escape(title) + '"><meta property="og:description" content="' + escape(description) + '"><meta property="og:url" content="' + canonical + '">\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
    + '<style>\n' + STYLE + '\n</style>\n'
    + '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>\n'
    + '<script src="../thumbnail-fallback.js" defer></script>\n'
    + '</head><body>\n'
    + '<header class="top"><div class="in"><a class="brand" href="' + BASE + '/"><b>MAXIM</b> B컷 랭킹</a><a class="topcta" href="' + BASE + '/">전체 랭킹 →</a></div></header>\n'
    + '<div class="wrap">\n'
    + '<nav class="crumb"><a href="' + BASE + '/">홈</a> › 작가 전체</nav>\n'
    + '<section class="hero"><div class="eyebrow">MAXIM B컷 · 작가 화보</div><h1>작가 전체</h1><p class="sub">B컷 화보 작가 <b id="mcount">' + entries.length + '</b>명. 작가별 참여 화보와 모델을 확인하세요.</p></section>\n'
    + '<div class="seclbl">작가 목록</div>\n'
    + '<div class="grid" id="grid">\n' + cards + '\n</div>\n'
    + '<footer class="ft">© MAXIM KOREA · B컷 · <a href="' + BASE + '/">전체 랭킹 보기</a> · <a href="' + BASE + '/models/models.html">모델 전체</a><br>본 페이지는 성인(19+) 콘텐츠를 포함할 수 있습니다.</footer>\n'
    + '</body></html>\n';
}

function build() {
  const modelSlugs = modelSlugMap();
  const dir = path.join(root, 'creators');
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  const emitted = [];
  const skipped = [];
  for (const [creator, slug] of Object.entries(CREATOR_SLUGS)) {
    if (!/^[a-z0-9_-]+$/.test(slug)) throw new Error('Invalid creator slug: ' + slug);
    const state = creatorState(creator, modelSlugs);
    if (!state.count) { skipped.push(creator); continue; }
    fs.writeFileSync(path.join(dir, slug + '.html'), render(state, slug));
    emitted.push({ creator, slug, count: state.count, date: state.works[state.latestId].pub, image: state.image });
    count++;
  }
  emitted.sort((a, b) => b.count - a.count || b.date.localeCompare(a.date) || a.creator.localeCompare(b.creator));
  fs.writeFileSync(path.join(dir, 'creators.html'), renderDirectory(emitted));
  return { date, creatorPages: count, skipped, directory: emitted.length, emitted };
}

module.exports = { date, data, CREATOR_SLUGS, modelSlugMap, listedBy, creatorState, creatorIntro, render, renderDirectory, build };

if (require.main === module) {
  const result = build();
  console.log(JSON.stringify({ date: result.date, creatorPages: result.creatorPages, skipped: result.skipped, directory: result.directory, pages: result.emitted.map(e => ({ creator: e.creator, slug: e.slug, count: e.count })) }));
}
