const fs = require('node:fs');
const path = require('node:path');
const api = require('../model-page-data.js');
const creators = require('./update-creator-pages.cjs');
const root = path.resolve(__dirname, '..');
const data = creators.data;
const date = creators.date;
const escape = api.escape;
const BASE = api.BASE;

// Creator x model "pair" pages, e.g. pairs/exbao-seuli.html for the search
// "엑스바오 슬이". A pair is published automatically when
//   - the creator has a reviewed slug in creator-slugs.json,
//   - the model has her own page in models/, and
//   - they share at least MIN_WORKS published works (thinner pairs stay unlisted).
// Pages are build artifacts like creators/: generated here, added to the sitemap
// by build-site.cjs, never committed. New pairs appear on their own after a
// data.json update; nothing has to be edited by hand.
const MIN_WORKS = 3;
const CAMPAIGN = 'pair_pages_v1';

let cache;
function pairList() {
  if (cache) return cache;
  const works = data.works || {};
  const modelSlugs = creators.modelSlugMap();
  const found = {};
  for (const id of Object.keys(works)) {
    const work = works[id];
    if (!api.listed(work)) continue;
    const creator = String(work.photo || '').trim();
    const creatorSlug = creators.CREATOR_SLUGS[creator];
    if (!creatorSlug) continue;
    for (const model of new Set(api.models(work.models))) {
      const modelSlug = modelSlugs[model];
      if (!model || !modelSlug) continue;
      const key = creatorSlug + '-' + modelSlug;
      const pair = found[key] || (found[key] = { creator, model, creatorSlug, modelSlug, slug: key, published: [], upcoming: [] });
      if (pair.creator !== creator || pair.model !== model) throw new Error('Pair slug collision: ' + key);
      (work.pub <= date ? pair.published : pair.upcoming).push(id);
    }
  }
  cache = Object.values(found).filter(pair => pair.published.length >= MIN_WORKS);
  for (const pair of cache) {
    pair.published.sort((a, b) => works[b].pub.localeCompare(works[a].pub) || Number(b) - Number(a));
    pair.upcoming.sort((a, b) => works[a].pub.localeCompare(works[b].pub) || Number(a) - Number(b));
    pair.url = BASE + '/pairs/' + pair.slug + '.html';
  }
  cache.sort((a, b) => b.published.length - a.published.length || a.creator.localeCompare(b.creator) || a.model.localeCompare(b.model));
  return cache;
}
const pairsOfCreator = creator => pairList().filter(pair => pair.creator === creator);
const pairsOfModel = model => pairList().filter(pair => pair.model === model);

function pairState(pair) {
  const works = data.works || {};
  const latestId = pair.published[0];
  const latest = works[latestId];
  const name = pair.creator + ' ' + pair.model;
  const count = pair.published.length;
  const title = name + ' 화보 ' + count + '편 | 맥심 B컷';
  const latestText = '최신작은 ‘' + api.clean(latest.title) + '’(' + latest.pub + ' 공개)입니다.';
  const description = pair.creator + ' × ' + pair.model + ' 화보 ' + count + '편을 한곳에 모았습니다. ' + latestText + ' 맥심 B컷에서 인기 화보와 신작을 확인하세요.';
  const faq = [
    { question: name + ' 화보는 몇 편인가요?', answer: '현재 ' + count + '편이 공개되어 있으며, 새 화보가 나오면 이 페이지에 자동으로 반영됩니다.' },
    { question: name + '의 최신 화보는 무엇인가요?', answer: '가장 최근 공개된 화보는 ‘' + api.clean(latest.title) + '’(' + latest.pub + ' 공개)입니다.' },
    { question: name + ' 화보는 어디에서 볼 수 있나요?', answer: '맥심 B컷에서 감상할 수 있습니다. 작품별 구매 방식과 현재 구독 열람 여부는 B컷에서 확인하세요. 성인 작품은 판매 사이트의 로그인·성인인증 후 이용할 수 있습니다.' }
  ];
  return {
    pair, model: name, date, works, published: pair.published, upcoming: pair.upcoming, count, title, description,
    latestId, latestText, latestUrl: BASE + '/?w=' + encodeURIComponent(latestId), image: api.image(latest.img, true), faq
  };
}

const chip = other => '<a class="chip" href="' + other.url + '">' + escape(other.creator) + ' × ' + escape(other.model) + '</a>';
function pairIntro(state) {
  const pair = state.pair;
  const sameCreator = pairsOfCreator(pair.creator).filter(other => other !== pair).slice(0, 8);
  const sameModel = pairsOfModel(pair.model).filter(other => other !== pair).slice(0, 8);
  return '<p><b>' + escape(pair.creator) + '</b> × <b>' + escape(pair.model) + '</b> 화보는 현재 <b>' + state.count + '편</b>이 공개되어 있습니다.</p>'
    + '<p>' + escape(state.latestText) + '</p>'
    + '<div class="chips"><a class="chip" href="' + BASE + '/models/' + pair.modelSlug + '.html">' + escape(pair.model) + ' 화보 전체</a>'
    + '<a class="chip" href="' + BASE + '/creators/' + pair.creatorSlug + '.html">' + escape(pair.creator) + ' 화보 전체</a></div>'
    + (sameModel.length ? '<p>' + escape(pair.model) + '의 다른 조합</p><div class="chips">' + sameModel.map(chip).join('') + '</div>' : '')
    + (sameCreator.length ? '<p>' + escape(pair.creator) + '의 다른 조합</p><div class="chips">' + sameCreator.map(chip).join('') + '</div>' : '')
    + '<p>작품별 구매 방식과 현재 구독 열람 여부는 B컷에서 확인하세요. 성인 작품은 판매 사이트의 로그인·성인인증 후 이용할 수 있습니다.</p>';
}

const STYLE = fs.readFileSync(path.join(__dirname, 'creator-page.css'), 'utf8').trim();
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">\n';
// Same property and admin/preview exclusions as the home page.
const ANALYTICS = '<script>window.BCUT_ANALYTICS_DISABLED=!/^https?:$/.test(location.protocol)||!["bcutrank.com","www.bcutrank.com","kdhwan0803.github.io"].includes(location.hostname)||/[?&](admin|preview|measure)=1(?:&|$)/.test(location.search);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}if(!window.BCUT_ANALYTICS_DISABLED){gtag("js",new Date());gtag("config","G-0M1DPCT33G",{content_group:"' + CAMPAIGN + '"});var ga=document.createElement("script");ga.async=true;ga.src="https://www.googletagmanager.com/gtag/js?id=G-0M1DPCT33G";document.head.appendChild(ga);}</script>\n';

function render(state) {
  const pair = state.pair;
  const label = escape(pair.creator) + ' × ' + escape(pair.model);
  const schema = api.schema(state, pair.url, [{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: '작가 전체', item: BASE + '/creators/creators.html' },
      { '@type': 'ListItem', position: 3, name: pair.creator + ' 화보', item: BASE + '/creators/' + pair.creatorSlug + '.html' },
      { '@type': 'ListItem', position: 4, name: state.model + ' 화보', item: pair.url }
    ]
  }]);
  const saleUrl = 'https://bcut.maximkorea.net/work/' + encodeURIComponent(state.latestId)
    + '?utm_source=bcutrank&utm_medium=pair_latest&utm_campaign=' + CAMPAIGN + '&utm_content=' + encodeURIComponent(pair.slug);
  const up = state.upcoming.length
    ? '<div id="upwrap"><div class="seclbl soon">곧 공개 예정 <small id="upcnt">' + state.upcoming.length + '편</small></div><div class="grid" id="upgrid">' + api.cards(state, true) + '</div></div>\n'
    : '';
  return '<!doctype html><html lang="ko"><head>\n'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + escape(state.title) + '</title>\n'
    + '<meta name="description" content="' + escape(state.description) + '">\n'
    + '<link rel="canonical" href="' + pair.url + '">\n'
    + '<meta name="robots" content="index,follow">\n'
    + '<meta property="og:type" content="website">\n'
    + '<meta property="og:title" content="' + escape(state.title) + '">\n'
    + '<meta property="og:description" content="' + escape(state.description) + '">\n'
    + '<meta property="og:image" content="' + escape(state.image) + '">\n'
    + '<meta property="og:url" content="' + pair.url + '">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n'
    + FONTS
    + '<style>\n' + STYLE + '\n</style>\n'
    + '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>\n'
    + ANALYTICS
    + '<script src="../thumbnail-fallback.js" defer></script>\n'
    + '</head><body data-pair="' + pair.slug + '">\n'
    + '<header class="top"><div class="in"><a class="brand" href="' + BASE + '/"><b>MAXIM</b> B컷 랭킹</a><a class="topcta" data-latest-work href="' + escape(state.latestUrl) + '">최신 화보 보기 →</a></div></header>\n'
    + '<div class="wrap">\n'
    + '<nav class="crumb"><a href="' + BASE + '/">홈</a> › <a href="' + BASE + '/creators/creators.html">작가 전체</a> › <a href="' + BASE + '/creators/' + pair.creatorSlug + '.html">' + escape(pair.creator) + '</a> › ' + escape(pair.model) + '</nav>\n'
    + '<section class="hero"><div class="eyebrow">MAXIM B컷 · 작가 × 모델</div><h1>' + label + ' 화보</h1><p class="sub">현재 공개된 화보 <b id="cnt">' + state.count + '</b>편 <a class="all-works" href="#grid">전체 목록 보기</a></p></section>\n'
    + '<section class="intro">' + pairIntro(state) + '</section>\n'
    + up
    + '<div class="seclbl">' + label + ' 화보 목록 <small id="cnt2">' + state.count + '편</small></div>\n'
    + '<div class="grid" id="grid" data-count="' + state.count + '">' + api.cards(state, false) + '</div>\n'
    + '<section class="faq">' + api.faqHTML(state) + '</section>\n'
    + '<div class="endcta">\n<div class="t">' + label + '의 화보를 B컷에서 만나보세요</div>\n'
    + '<div class="d">주간 랭킹·신작·풀버전까지, 맥심 B컷에서 지금 확인하세요.</div>\n'
    + '<a class="btn pri" data-latest-sale href="' + escape(saleUrl) + '" target="_blank" rel="noopener">▶ ' + label + ' 최신작 보러 가기</a>\n</div>\n'
    + '</div>\n'
    + '<footer class="ft">© MAXIM KOREA · B컷 · <a href="' + BASE + '/">전체 랭킹 보기</a> · <a href="' + BASE + '/pairs/pairs.html">작가×모델 전체</a><br>본 페이지는 성인(19+) 콘텐츠를 포함할 수 있습니다.</footer>\n'
    + '</body></html>\n';
}

function renderDirectory() {
  const pairs = pairList();
  const canonical = BASE + '/pairs/pairs.html';
  const title = '맥심 B컷 작가×모델 조합 ' + pairs.length + '개 · 화보 랭킹';
  const description = '맥심 B컷 작가와 모델 조합 ' + pairs.length + '개를 한눈에. 좋아하는 작가와 모델이 함께한 화보만 모아서 확인하세요.';
  const works = data.works || {};
  const cards = pairs.map(pair => {
    const latest = works[pair.published[0]];
    return '<a class="card" href="' + pair.url + '"><div class="thumb"><img loading="lazy" src="' + escape(api.image(latest.img)) + '" alt="' + escape(pair.creator + ' ' + pair.model) + ' 화보"></div><div class="meta"><div class="mt">' + escape(pair.creator) + ' × ' + escape(pair.model) + '</div><div class="mp">화보 ' + pair.published.length + '편 · ' + escape(latest.pub) + '</div></div></a>';
  }).join('\n');
  const schema = {
    '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: pairs.length,
    itemListElement: pairs.map((pair, i) => ({ '@type': 'ListItem', position: i + 1, url: pair.url, name: pair.creator + ' ' + pair.model }))
  };
  return '<!doctype html><html lang="ko"><head>\n'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + escape(title) + '</title>\n'
    + '<meta name="description" content="' + escape(description) + '">\n'
    + '<link rel="canonical" href="' + canonical + '">\n'
    + '<meta name="robots" content="index,follow">\n'
    + '<meta property="og:type" content="website"><meta property="og:title" content="' + escape(title) + '"><meta property="og:description" content="' + escape(description) + '"><meta property="og:url" content="' + canonical + '">\n'
    + FONTS
    + '<style>\n' + STYLE + '\n</style>\n'
    + '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>\n'
    + ANALYTICS
    + '<script src="../thumbnail-fallback.js" defer></script>\n'
    + '</head><body>\n'
    + '<header class="top"><div class="in"><a class="brand" href="' + BASE + '/"><b>MAXIM</b> B컷 랭킹</a><a class="topcta" href="' + BASE + '/">전체 랭킹 →</a></div></header>\n'
    + '<div class="wrap">\n'
    + '<nav class="crumb"><a href="' + BASE + '/">홈</a> › 작가×모델 전체</nav>\n'
    + '<section class="hero"><div class="eyebrow">MAXIM B컷 · 작가 × 모델</div><h1>작가 × 모델 조합</h1><p class="sub">함께한 화보가 ' + MIN_WORKS + '편 이상인 조합 <b id="mcount">' + pairs.length + '</b>개.</p></section>\n'
    + '<div class="seclbl">조합 목록</div>\n'
    + '<div class="grid" id="grid">\n' + cards + '\n</div>\n'
    + '<footer class="ft">© MAXIM KOREA · B컷 · <a href="' + BASE + '/">전체 랭킹 보기</a> · <a href="' + BASE + '/models/models.html">모델 전체</a> · <a href="' + BASE + '/creators/creators.html">작가 전체</a><br>본 페이지는 성인(19+) 콘텐츠를 포함할 수 있습니다.</footer>\n'
    + '</body></html>\n';
}

// Links from an existing model or creator page into its pair pages.
const MODEL_LINK_STYLE = '<style id="pair-links-css">.pairlinks{margin:14px 0 4px}.pairlinks .pl-t{font-size:13px;font-weight:700;color:var(--muted);margin:0 0 9px}.pairlinks .pl-c{display:flex;flex-wrap:wrap;gap:9px}.pairlinks .pl-a{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:9px 15px;font-size:13px;font-weight:600;color:var(--ink2)}.pairlinks .pl-a:hover{border-color:var(--accent2);color:var(--ink)}</style>\n';
function modelLinksHTML(model) {
  const pairs = pairsOfModel(model);
  if (!pairs.length) return '';
  return '<section class="pairlinks"><p class="pl-t">작가별로 모아 보기</p><div class="pl-c">'
    + pairs.map(pair => '<a class="pl-a" href="' + pair.url + '">' + escape(pair.creator) + ' × ' + escape(pair.model) + ' 화보</a>').join('')
    + '</div></section>';
}
function creatorLinksHTML(creator) {
  const pairs = pairsOfCreator(creator);
  if (!pairs.length) return '';
  return '<p>모델별로 모아 보기</p><div class="chips">' + pairs.map(chip).join('') + '</div>';
}

function build() {
  const dir = path.join(root, 'pairs');
  fs.mkdirSync(dir, { recursive: true });
  const pairs = pairList();
  const keep = new Set(pairs.map(pair => pair.slug + '.html').concat('pairs.html'));
  for (const file of fs.readdirSync(dir)) if (file.endsWith('.html') && !keep.has(file)) fs.unlinkSync(path.join(dir, file));
  for (const pair of pairs) fs.writeFileSync(path.join(dir, pair.slug + '.html'), render(pairState(pair)));
  fs.writeFileSync(path.join(dir, 'pairs.html'), renderDirectory());
  return { date, pairPages: pairs.length, minWorks: MIN_WORKS };
}
const urls = () => pairList().map(pair => pair.url).concat(BASE + '/pairs/pairs.html');

module.exports = { date, data, MIN_WORKS, MODEL_LINK_STYLE, pairList, pairsOfCreator, pairsOfModel, pairState, pairIntro, render, renderDirectory, modelLinksHTML, creatorLinksHTML, urls, build };

if (require.main === module) console.log(JSON.stringify(build()));
