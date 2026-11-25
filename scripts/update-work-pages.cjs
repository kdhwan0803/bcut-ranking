const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../model-page-data.js');
const creators = require('./update-creator-pages.cjs');
const root = path.resolve(__dirname, '..');
const data = creators.data;
const date = creators.date;
const escape = api.escape;
const BASE = api.BASE;
const SALE = 'https://bcut.maximkorea.net/work/';

// Static work pages, e.g. works/2575.html: the landing page for mail, banner and
// social links, so a visitor sees the work before B컷 asks for a login.
//   - Which works get a page is decided by api.workPages() (data.json workPages),
//     limited to published works with a public-safe cover.
//   - Photos are never chosen here. A page shows the public cover (works[id].img)
//     and, when data.json lists works[id].gallery, the already approved promo
//     cuts after it.
//   - Price and composition come from work-facts.js through work-shopping.js,
//     the same helpers the catalogue dialog uses. Missing facts are left out.
//   - No buyer counts, sales figures or ranking mutation.
// Pages are build artifacts like creators/ and pairs/: generated here, added to
// the sitemap by build-site.cjs, never committed.

const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
// The page list rule lives in model-page-data.js so model cards and this generator agree.
const listed = () => typeof api.workPages === 'function' ? api.workPages(data, date) : {};
const numeric = (a, b) => Number(a) - Number(b);

let helpers;
function catalogue() {
  if (helpers) return helpers;
  const window = {};
  const context = vm.createContext({ window, console });
  vm.runInContext(read('work-facts.js'), context);
  vm.runInContext(read('work-shopping.js'), context);
  vm.runInContext(read('work-intensity.js'), context);
  // The title/format helper lives in the home page; reuse it instead of a copy
  // (check-home-loading.cjs reads it the same way).
  const ui = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])
    .find(code => code.includes('window.BCUTCatalogueUI ='));
  if (!ui) throw new Error('Catalogue title helper not found in index.html');
  vm.runInContext(ui, context);
  for (const name of ['BCUTWorkFacts', 'BCUTShopping', 'BCUTIntensity', 'BCUTCatalogueUI']) {
    if (!window[name]) throw new Error('Missing catalogue helper: ' + name);
  }
  helpers = { facts: window.BCUTWorkFacts, shopping: window.BCUTShopping, intensity: window.BCUTIntensity, ui: window.BCUTCatalogueUI };
  return helpers;
}

// Repository-relative path of a site image, or '' for external images.
function localFile(value) {
  let file = String(value || '');
  if (file.startsWith(BASE + '/')) file = file.slice(BASE.length + 1);
  if (!file || /^[a-z][a-z0-9+.-]*:/i.test(file) || file.startsWith('//')) return '';
  file = file.replace(/^(?:\.\/|\/)/, '');
  return file.includes('\\') || file.split('/').includes('..') ? '' : file;
}
function webpSize(file) {
  try {
    const bytes = fs.readFileSync(file);
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return null;
    const kind = bytes.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') { const bits = bytes.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
  } catch (_) {}
  return null;
}
function picture(source, cover) {
  const file = localFile(source);
  const exists = file && fs.existsSync(path.join(root, file));
  const size = exists && /\.webp$/i.test(file) ? webpSize(path.join(root, file)) : null;
  const small = exists && /\.webp$/i.test(file) && fs.existsSync(path.join(root, file.replace(/\.webp$/i, '-540.webp'))) ? file.replace(/\.webp$/i, '-540.webp') : '';
  return { source, cover, file, exists, url: api.image(source), absolute: api.image(source, true),
    width: size ? size.width : 0, height: size ? size.height : 0, small: small ? '../' + small : '' };
}
function pictures(work) {
  const list = [picture(work.img, true)];
  for (const source of Array.isArray(work.gallery) ? work.gallery : []) {
    if (typeof source === 'string' && localFile(source)) list.push(picture(source, false));
  }
  return list;
}

function duration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return '';
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
  return ((h ? h + '시간 ' : '') + (m ? m + '분 ' : '') + (r ? r + '초' : '')).trim();
}
// Same conditions as BCUTShopping.summary(), split into rows.
function composition(work, fact, kind) {
  const rows = [];
  if (kind !== 'video' && !(work.vid && fact.photos <= 1)) {
    if (Number.isInteger(fact.photoPages) && fact.photoPages > 0) rows.push(['사진', fact.photoPages.toLocaleString('ko-KR') + 'p', '표지 포함']);
    else if (Number.isInteger(fact.photos) && fact.photos > 0) rows.push(['사진', fact.photos.toLocaleString('ko-KR') + '장', '표지 제외 내지 기준']);
  }
  if (Number.isInteger(fact.videos) && fact.videos > 0) rows.push(['영상', fact.videos + '편', duration(fact.seconds) ? '총 ' + duration(fact.seconds) : '']);
  return rows;
}
// The page shows the edition in its own tab, and the creator in the credit line,
// so the heading drops the edition marker and a trailing Latin bracket tag such as
// [MANO]. Brackets with Korean or Japanese text are part of the title and stay.
function displayTitle(name, kind) {
  let text = String(name || '');
  if (kind === 'photo' || kind === 'video') text = text.replace(/\s*[（(]\s*(?:사진|영상)\s*[)）]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  const trimmed = text.replace(/\s*\[[^\]가-힣ぁ-んァ-ヴー一-龥]{1,14}\]\s*$/, '').trim();
  return trimmed || text || String(name || '');
}
// Completed weeks only: a week still in progress is not a ranking record yet.
function rankHistory(id) {
  const found = [];
  for (const week of Array.isArray(data.weeks) ? data.weeks : []) {
    if (!week || !api.validDate(week.date) || !Array.isArray(week.ranking) || !week.label) continue;
    const end = new Date(Date.parse(week.date + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10);
    if (end > date) continue;
    const position = week.ranking.map(String).indexOf(String(id));
    if (position >= 0) found.push({ label: String(week.label), rank: position + 1, date: week.date });
  }
  found.sort((a, b) => b.date.localeCompare(a.date));
  // Best completed week first, then the most recent one when it is a different week.
  const best = found.slice().sort((a, b) => a.rank - b.rank || b.date.localeCompare(a.date))[0];
  return best ? [best].concat(found[0] !== best ? [found[0]] : []) : [];
}
function koreanDate(value) {
  const part = value.split('-').map(Number);
  return part[0] + '년 ' + part[1] + '월 ' + part[2] + '일';
}

let modelSlugs;
function pageState(id, pages) {
  id = String(id);
  const cat = catalogue();
  const works = data.works || {}, work = works[id];
  if (!work) throw new Error('Unknown work: ' + id);
  if (!modelSlugs) modelSlugs = creators.modelSlugMap();
  const names = [...new Set(api.models(work.models).filter(Boolean))];
  const creator = String(work.photo || '').trim();
  const kind = cat.shopping.editionKind(work);
  const editionLabel = kind === 'photo' ? '사진판' : kind === 'video' ? '영상판' : '';
  const editions = cat.shopping.editions(data, id, date).map(edition => ({ id: String(edition.id), kind: edition.kind, current: String(edition.id) === id }));
  const offer = target => {
    const info = cat.ui.purchase(target, data, false);
    return { id: target, price: info.price || '', priceNote: info.price ? info.priceNote : '', format: info.format, summary: cat.shopping.summary(target, data) || '' };
  };
  const info = cat.ui.purchase(id, data, false);
  const fact = cat.facts.works[id] || {};
  const name = displayTitle(cat.ui.title(work.title || id, data).name, kind);
  const modelText = names.join(' · ');
  const named = names.some(model => name.includes(model));
  const adult = work.b19 === true || String(work.b19) === '1';
  const paired = new Set(editions.map(edition => edition.id).concat(id));
  const listedIds = Object.keys(works).filter(key => !paired.has(key) && api.listed(works[key]) && works[key].pub <= date);
  const newest = (a, b) => works[b].pub.localeCompare(works[a].pub) || Number(b) - Number(a);
  const sameModel = listedIds.filter(key => api.models(works[key].models).some(model => names.includes(model))).sort(newest);
  const sameCreator = creator ? listedIds.filter(key => String(works[key].photo || '').trim() === creator).sort(newest) : [];
  const relatedIds = (names.length ? sameModel : sameCreator).slice(0, 6);
  const intensity = cat.intensity.describe(work);
  const slides = pictures(work);
  return {
    id, work, names, modelText, creator, kind, editionLabel, editions, adult, name, named,
    original: info.original,
    format: info.format,
    price: info.price || '', priceNote: info.price ? info.priceNote : '',
    summary: cat.shopping.summary(id, data) || '',
    verification: info.price || fact.checkedAt ? cat.shopping.verification(id) : '',
    rows: composition(work, fact, kind),
    offers: editions.length > 1 ? editions.map(edition => Object.assign(offer(edition.id), { kind: edition.kind, current: edition.current })) : [],
    slides, photos: slides.filter(slide => !slide.cover),
    ranks: rankHistory(id),
    intensity: intensity.level === null ? null : intensity,
    relatedHeading: names.length ? modelText + '의 다른 화보' : creator ? creator + ' 작가의 다른 화보' : '',
    related: relatedIds.map(key => ({ id: key, title: cat.ui.title(works[key].title || key, data).name, kind: cat.ui.format(works[key]),
      date: works[key].pub, image: api.image(works[key].img), href: pages[key] === true ? key + '.html' : BASE + '/?w=' + encodeURIComponent(key) })),
    modelLinks: names.map(model => ({ name: model, href: modelSlugs[model] ? '../models/' + modelSlugs[model] + '.html' : BASE + '/?model=' + encodeURIComponent(model) + '#/search',
      absolute: modelSlugs[model] ? BASE + '/models/' + modelSlugs[model] + '.html' : '' })),
    creatorHref: creator ? (creators.CREATOR_SLUGS[creator] ? '../creators/' + creators.CREATOR_SLUGS[creator] + '.html' : BASE + '/?creator=' + encodeURIComponent(creator) + '#/search') : '',
    editionHref: other => pages[other] === true ? other + '.html' : BASE + '/?w=' + encodeURIComponent(other),
    url: BASE + '/works/' + id + '.html',
    sale: SALE + id + '?bn=rank_work_' + id
  };
}

function imageTag(slide, options) {
  const attrs = ['src="' + escape(options.small && slide.small ? slide.small : slide.url) + '"'];
  if (slide.small) attrs.push('srcset="' + escape(slide.small) + ' 540w, ' + escape(slide.url) + ' ' + (slide.width || 1080) + 'w"', 'sizes="' + options.sizes + '"');
  if (slide.width && slide.height) attrs.push('width="' + slide.width + '"', 'height="' + slide.height + '"');
  attrs.push('alt="' + escape(options.alt) + '"', 'decoding="async"', options.eager ? 'fetchpriority="high"' : 'loading="lazy"');
  if (options.className) attrs.unshift('class="' + options.className + '"');
  return '<img ' + attrs.join(' ') + '>';
}
function priceHTML(price, note) {
  if (!price) return '<p class="wp-price-unknown">가격과 구성은 B컷에서 확인</p>';
  return '<strong>' + escape(price) + '</strong>' + (note ? '<small>' + note.split(' · ').map(part => '<span>' + escape(part) + '</span>').join(' · ') + '</small>' : '');
}
function intensityHTML(item) {
  if (!item) return '';
  return '<section class="work-intensity-pilot" data-level="' + item.level + '" aria-label="수위 안내 (시범)">'
    + '<h3>수위 안내 (시범)</h3>'
    + '<div class="work-intensity-display"><span class="work-intensity-badge" aria-label="' + escape(item.ariaLabel) + '"><span>수위</span><span class="work-intensity-score">' + item.level + '<small class="work-intensity-unit">/5</small></span></span>'
    + '<span class="work-intensity-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="work-intensity-status">' + escape(item.statusLabel) + '</span></div>'
    + (item.scopeSummary ? '<p>확인 범위: ' + escape(item.scopeSummary) + '</p>' : '')
    + (item.exposure ? '<p>노출: ' + escape(item.exposure) + '</p>' : '')
    + (item.presentation ? '<p>연출: ' + escape(item.presentation) + '</p>' : '')
    + '<p class="work-intensity-note">공식 연령 등급이나 작품 품질 점수가 아닙니다. 19+ 표시는 별도입니다. 미리보기·일부 사진 확인은 전체 화보·영상 검토를 뜻하지 않습니다.</p>'
    + '<details><summary>시범 기준 보기</summary><p>노출 정도를 우선하며, 연출 강도는 별도로 설명합니다.</p>'
    + '<ol><li>1단계: 의상 착용 중심 · 낮은 노출</li><li>2단계: 수영복·란제리 중심</li><li>3단계: 가림이 있는 노출</li><li>4단계: 직접적인 노출</li><li>5단계: 노출 범위가 특히 크거나, 직접 노출과 매우 강한 연출이 겹침</li></ol>'
    + '<p>소품만으로 5단계를 부여하지 않습니다. 기재한 확인 범위에 한정한 시범 안내입니다.</p></details></section>';
}

function render(page) {
  const work = page.work, id = page.id;
  const heading = (page.named || !page.modelText ? '' : page.modelText + ' ') + page.name + (page.editionLabel ? ' ' + page.editionLabel : '');
  const title = heading + ' | 맥심 B컷';
  const quoted = (page.named || !page.modelText ? '' : page.modelText + ' ') + '‘' + page.name + '’' + (page.editionLabel ? ' ' + page.editionLabel : '');
  const facts = [page.summary, page.price, work.pub + ' 공개', page.creator ? '촬영 ' + page.creator : ''].filter(Boolean).join(' · ');
  const description = quoted + ' 미리보기. ' + facts + '.' + (page.offers.length ? ' 사진판과 영상판은 별도 판매됩니다.' : '') + ' 전체 화보는 맥심 B컷에서 로그인 후 볼 수 있습니다.';
  const cover = page.slides[0];
  const single = page.slides.length < 2;
  const count = page.slides.length;
  const label = (page.modelText ? page.modelText + ' ' : '') + page.name;
  const previewNote = page.kind === 'video' && page.photos.length ? '미리보기 사진은 같은 촬영의 사진 컷이에요. 영상은 B컷에서 볼 수 있어요.' : '전체 화보 중 일부를 미리 볼 수 있어요.';
  const slideAlt = (slide, index) => slide.cover ? label + ' 표지' : label + ' 미리보기 사진 ' + index;
  const slides = page.slides.map((slide, index) => slide.cover
    ? '<figure class="wp-slide cover"><img class="wp-slide-bg" src="' + escape(slide.url) + '" alt="" aria-hidden="true" decoding="async"' + (index ? ' loading="lazy"' : '') + '>'
      + imageTag(slide, { className: 'wp-slide-main', alt: slideAlt(slide, index), eager: index === 0, sizes: '(min-width:900px) 520px, 100vw' }) + '</figure>'
    : '<figure class="wp-slide">' + imageTag(slide, { alt: slideAlt(slide, index), eager: index === 0, sizes: '(min-width:900px) 520px, 100vw' }) + '</figure>').join('\n        ');
  const thumbs = page.slides.map((slide, index) => '<button class="work-preview-thumb' + (slide.cover ? ' cover' : '') + '" type="button" data-go="' + index + '" aria-label="' + (slide.cover ? '표지 보기' : '미리보기 사진 ' + index + ' 보기') + '" aria-pressed="' + (index === 0) + '">'
    + imageTag(slide, { alt: '', small: true, sizes: '64px' }).replace(/ (?:srcset|sizes)="[^"]*"/g, '') + '</button>').join('');
  const dots = page.slides.map((_, index) => '<i' + (index ? '' : ' class="on"') + '></i>').join('');
  const shots = page.photos.length >= 2
    ? '<section class="wp-section wp-preview-mobile" id="preview" aria-labelledby="wp-preview-title">\n        <h2 id="wp-preview-title">미리보기 사진</h2>\n        <p class="wp-section-note">' + previewNote + ' 사진을 누르면 크게 볼 수 있어요.</p>\n        <div class="wp-shots' + (page.photos.length === 2 ? ' two' : '') + '">'
      + page.photos.map((slide, index) => '<button type="button" class="wp-shot" data-zoom="' + index + '" aria-label="미리보기 사진 ' + (index + 1) + ' 크게 보기">' + imageTag(slide, { alt: label + ' 미리보기 사진 ' + (index + 1), small: true, sizes: '(min-width:600px) 280px, 46vw' }) + '</button>').join('')
      + '</div>\n      </section>\n'
    : '';
  const editionTabs = page.offers.length
    ? '<nav class="work-edition-links" aria-label="사진판과 영상판 선택">' + page.offers.map(offer => {
        const text = offer.kind === 'photo' ? '사진판' : '영상판';
        return offer.current ? '<a href="' + id + '.html" aria-current="true">' + text + ' · 현재 선택</a>'
          : '<a href="' + escape(page.editionHref(offer.id)) + '" data-edition-link="' + offer.kind + '">' + text + ' 보기</a>';
      }).join('') + '</nav>'
    : '';
  const products = page.offers.map(offer => {
    const text = offer.kind === 'photo' ? '사진판' : '영상판', other = offer.kind === 'photo' ? '영상판' : '사진판';
    const amount = offer.price ? '<p class="work-preview-option-price">' + escape(offer.price.replace(/코인$/, '')) + '<span>코인</span></p>' : '';
    return '<section class="work-preview-product" aria-labelledby="wp-' + offer.kind + '-title">'
      + '<div class="work-preview-option-heading"><h3 id="wp-' + offer.kind + '-title">' + text + (offer.current ? ' <small class="wp-current">지금 보는 상품</small>' : '') + '</h3>' + amount + '</div>'
      + (offer.summary ? '<p class="work-preview-option-composition">' + escape(offer.summary) + '</p>' : '<p class="work-preview-option-composition">가격과 구성은 B컷에서 확인</p>')
      + '<p class="work-preview-option-note">' + text + '을 구매해도 ' + other + '은 별도 구매해야 해요.</p>'
      + (offer.current ? '<a class="work-preview-cta" data-out="products" href="' + escape(page.sale) + '" target="_blank" rel="noopener">B컷에서 ' + text + ' 보기 ›</a>'
        : '<a class="work-preview-cta secondary" href="' + escape(page.editionHref(offer.id)) + '" data-edition-link="' + offer.kind + '">' + text + ' 페이지 보기</a>')
      + '</section>';
  }).join('\n        ');
  const check = work.buy === '코인'
    ? '로그인 후 작품의 최종 가격과 구성을 확인하고 구매해 주세요. 이 작품은 코인을 충전해 개별 구매하는 방식입니다.'
    : '로그인 후 최종 가격과 구성을 확인해 주세요. 작품별 구매 방식과 현재 구독 열람 여부는 B컷에서 확인하세요.';
  const modelLine = page.modelLinks.length ? '<p class="work-preview-model">' + page.modelLinks.map(link => '<a href="' + escape(link.href) + '">' + escape(link.name) + '</a>').join(' · ') + '</p>' : '';
  const credit = [page.creator ? '촬영 ' + page.creator : '', koreanDate(work.pub) + ' 공개'].filter(Boolean).join(' · ');
  const ranks = page.ranks.length ? '<p class="wp-rank">주간 랭킹 ' + page.ranks.map(item => escape(item.label) + ' ' + item.rank + '위').join(' · ') + '</p>' : '';
  const related = page.related.length
    ? '<section class="wp-section work-related" aria-labelledby="wp-rel-title">\n      <h2 id="wp-rel-title">' + escape(page.relatedHeading) + '</h2>\n      <p class="wp-section-note">최근 공개순 ' + page.related.length + '편</p>\n      <div class="work-related-grid">\n        '
      + page.related.map(item => '<a class="work-related-card" data-work-id="' + escape(item.id) + '" href="' + escape(item.href) + '" aria-label="' + escape(item.title) + ' · ' + escape(item.date) + ' 공개 · 작품 정보 보기">'
        + '<span class="work-related-cover"><img src="' + escape(item.image) + '" alt="' + escape(item.title) + '" loading="lazy" decoding="async"><span class="work-related-kind">' + escape(item.kind) + '</span></span>'
        + '<span class="work-related-title">' + escape(item.title) + '</span><time datetime="' + escape(item.date) + '">' + escape(item.date) + ' 공개</time></a>').join('\n        ')
      + '\n      </div>\n    </section>'
    : '';
  const chips = page.modelLinks.map(link => '<a href="' + escape(link.href) + '">' + escape(link.name) + ' 화보 전체 보기</a>')
    .concat(page.creatorHref ? ['<a href="' + escape(page.creatorHref) + '">' + escape(page.creator) + ' 작가의 다른 화보</a>'] : [])
    .concat(['<a href="' + BASE + '/">주간 랭킹 보기</a>']).join('');
  const crumbs = [{ name: '홈', item: BASE + '/' }, { name: '모델 전체', item: BASE + '/models/models.html' }];
  if (page.modelLinks[0] && page.modelLinks[0].absolute) crumbs.push({ name: page.modelLinks[0].name + ' 화보', item: page.modelLinks[0].absolute });
  crumbs.push({ name: page.name + (page.editionLabel ? ' ' + page.editionLabel : ''), item: page.url });
  const creative = { '@context': 'https://schema.org', '@type': 'CreativeWork', name: heading, alternateName: page.original, url: page.url, description,
    image: page.slides.map(slide => slide.absolute), datePublished: work.pub, inLanguage: 'ko' };
  if (page.names.length) creative.about = page.modelLinks.map(link => Object.assign({ '@type': 'Person', name: link.name }, link.absolute ? { url: link.absolute } : {}));
  if (page.creator) creative.creator = { '@type': 'Person', name: page.creator };
  creative.publisher = { '@type': 'Organization', name: 'MAXIM KOREA', url: BASE + '/' };
  const schema = [creative, { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.item })) }];
  const config = { work_id: id, edition: page.kind === 'photo' || page.kind === 'video' ? page.kind : 'single', model: page.names.join(', '), creator: page.creator };
  const endTitle = (page.named || !page.modelText ? '' : page.modelText + ' ') + '「' + page.name + '」' + (page.editionLabel ? ' ' + page.editionLabel : '');
  const stickyNote = [page.editionLabel || page.format, page.summary.replace(' (표지 제외)', '')].filter(Boolean).join(' · ');
  const preload = '<link rel="preload" as="image" href="' + escape(cover.url) + '" fetchpriority="high">';

  return '<!doctype html><html lang="ko"><head>\n'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    + '<title>' + escape(title) + '</title>\n'
    + '<meta name="description" content="' + escape(description) + '">\n'
    + '<link rel="canonical" href="' + escape(page.url) + '">\n'
    + '<meta name="robots" content="index,follow">\n'
    + '<meta property="og:type" content="website">\n'
    + '<meta property="og:site_name" content="맥심 B컷 랭킹">\n'
    + '<meta property="og:title" content="' + escape(title) + '">\n'
    + '<meta property="og:description" content="' + escape(description) + '">\n'
    + '<meta property="og:image" content="' + escape(cover.absolute) + '">\n'
    + (cover.width && cover.height ? '<meta property="og:image:width" content="' + cover.width + '"><meta property="og:image:height" content="' + cover.height + '">\n' : '')
    + '<meta property="og:url" content="' + escape(page.url) + '">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n'
    + '<script>(function(){try{var t=localStorage.getItem(\'bcut_theme\');document.documentElement.setAttribute(\'data-theme\',t===\'dark\'?\'dark\':\'light\');}catch(e){document.documentElement.setAttribute(\'data-theme\',\'light\');}})();</script>\n'
    + preload + '\n'
    + '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" media="print" onload="this.media=\'all\'"><link href="https://fonts.googleapis.com/css2?family=Anton&display=optional" rel="stylesheet" media="print" onload="this.media=\'all\'">\n'
    + '<script>\n/* GA4: same measurement ID as the home page. Sent on the production host only, never for admin/preview/measure URLs (same rule as model-page.js). */\n'
    + 'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}\n'
    + 'window.BCUT_WORK_PAGE=' + JSON.stringify(config).replace(/</g, '\\u003c') + ';\n'
    + 'window.BCUT_ANALYTICS_DISABLED=!/^https?:$/.test(location.protocol)||[\'bcutrank.com\',\'www.bcutrank.com\',\'kdhwan0803.github.io\'].indexOf(location.hostname)<0||/[?&](admin|preview|measure)=1(?:&|$)/.test(location.search);\n'
    + 'if(!window.BCUT_ANALYTICS_DISABLED){gtag(\'js\',new Date());gtag(\'config\',\'G-0M1DPCT33G\');var ga=document.createElement(\'script\');ga.async=true;ga.src=\'https://www.googletagmanager.com/gtag/js?id=G-0M1DPCT33G\';document.head.appendChild(ga);}\n'
    + '</script>\n'
    + '<style>\n' + read('scripts/work-page.css') + '</style>\n'
    + '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>\n'
    + '</head>\n'
    + '<body data-work-id="' + escape(id) + '" data-edition="' + escape(config.edition) + '">\n'
    + '<header class="wp-header"><div class="wp-header-in">\n'
    + '  <a class="wp-logo" href="' + BASE + '/" title="MAXIM B컷 랭킹"><span class="wp-logo-box">Bcut</span><span class="wp-logo-dot"></span><span class="wp-logo-tag">MAXIM</span><span class="wp-logo-tag rank">RANKING</span></a>\n'
    + '  <div class="wp-header-actions"><button type="button" class="wp-theme" id="wpTheme" aria-label="화면 테마 바꾸기">☾ 다크</button><a class="wp-rank-link" href="' + BASE + '/">주간 랭킹 ›</a></div>\n'
    + '</div></header>\n'
    + '<main>\n'
    + '  <div class="wp-top">\n'
    + '    <section class="wp-gallery' + (single ? ' wp-single' : '') + '" aria-label="' + (single ? '표지' : '표지와 미리보기 사진') + '">\n'
    + '      <div class="wp-stage">\n'
    + '      <div class="wp-carousel" id="wpCar" tabindex="0"' + (single ? '' : ' aria-roledescription="carousel"') + ' aria-label="' + escape(label) + (single ? ' 표지' : ' 표지와 미리보기 사진 ' + count + '장') + '">\n        '
    + slides + '\n      </div>\n'
    + (page.adult ? '      <span class="wp-badge19" aria-label="19세 이상 작품">19</span>\n' : '')
    + '      <span class="wp-count" aria-live="polite"><b id="wpNow">1</b> / ' + count + '</span>\n'
    + '      <div class="wp-dots" id="wpDots" aria-hidden="true">' + dots + '</div>\n'
    + '      <button type="button" class="work-preview-arrow prev" id="wpPrev" aria-label="이전 사진" aria-disabled="true">‹</button>\n'
    + '      <button type="button" class="work-preview-arrow next" id="wpNext" aria-label="다음 사진" aria-disabled="' + single + '">›</button>\n'
    + '      </div>\n'
    + '      <div class="work-preview-caption"><span>' + previewNote + '</span></div>\n'
    + '      <div class="work-preview-thumbs" id="wpThumbs" aria-label="사진 선택">' + thumbs + '</div>\n'
    + '    </section>\n'
    + '    <div class="wp-info">\n'
    + '      ' + modelLine + '\n'
    + '      <h1 class="work-preview-title">' + escape(page.name) + '</h1>\n'
    + '      <p class="work-preview-credit">' + escape(credit) + '</p>\n'
    + (ranks ? '      ' + ranks + '\n' : '')
    + (editionTabs ? '      ' + editionTabs + '\n' : '')
    + '      <div class="work-purchase-info">\n'
    + '        <div class="work-purchase-format">' + escape(page.format) + (page.summary ? '<small>' + escape(page.summary) + '</small>' : '') + '</div>\n'
    + '        <div class="work-purchase-price">' + priceHTML(page.price, page.priceNote) + '</div>\n'
    + '      </div>\n'
    + '      <a class="work-preview-cta" id="wpCta" data-out="hero" href="' + escape(page.sale) + '" target="_blank" rel="noopener">B컷에서 보기 ›</a>\n'
    + '      <p class="work-preview-help">B컷은 로그인 후 볼 수 있어요.' + (page.adult ? '<br>성인 작품 감상은 B컷의 로그인·성인인증 후 이용할 수 있습니다.' : '') + '</p>\n\n'
    + (shots ? '      ' + shots + '\n' : '')
    + '      <section class="wp-section work-preview-composition" aria-labelledby="wp-comp-title">\n'
    + '        <h2 id="wp-comp-title">구매하면 볼 수 있는 구성</h2>\n'
    + (page.rows.length ? '        <dl>' + page.rows.map(row => '<div><dt>' + row[0] + '</dt><dd>' + escape(row[1]) + (row[2] ? '<small>' + escape(row[2]) + '</small>' : '') + '</dd></div>').join('') + '</dl>\n'
      : '        <p class="wp-section-note">가격과 구성은 B컷에서 확인해 주세요.</p>\n')
    + (page.offers.length ? '        <p class="work-preview-separate-note" style="margin-top:14px">사진판과 영상판은 별도 판매됩니다. 각 상품의 구성과 가격을 확인하세요.</p>\n        ' + products + '\n' : '')
    + '        <p class="work-preview-help" style="margin-top:12px">작품 페이지로 이동해요. 클릭만으로 결제되지 않아요.</p>\n'
    + '        <div class="work-preview-check"><h3>구매 전에 확인해 주세요</h3><p>' + check + '</p>' + (page.verification ? '<small>' + escape(page.verification) + '</small>' : '') + '</div>\n'
    + (page.intensity ? '        ' + intensityHTML(page.intensity) + '\n' : '')
    + (page.original && page.original !== page.name ? '        <details class="work-original-title"><summary>원제 보기</summary><p>' + escape(page.original) + '</p></details>\n' : '')
    + '      </section>\n'
    + '    </div>\n'
    + '  </div>\n\n'
    + '  <div class="wp-more">\n'
    + (related ? '    ' + related + '\n' : '')
    + '    <div class="work-related-models">' + chips + '</div>\n'
    + '    <section class="wp-end" aria-label="B컷에서 전체 화보 보기">\n'
    + '      <strong>' + escape(endTitle) + '</strong>\n'
    + '      <a class="work-preview-cta" data-out="bottom" href="' + escape(page.sale) + '" target="_blank" rel="noopener">B컷에서 보기 ›</a>\n'
    + '      <p>무삭제 원본 · 전체 컷은 B컷에서 볼 수 있어요</p>\n'
    + '    </section>\n'
    + '  </div>\n'
    + '</main>\n'
    + '<footer class="wp-footer">© MAXIM KOREA · B컷 · <a href="' + BASE + '/">전체 랭킹 보기</a> · <a href="' + BASE + '/models/models.html">모델 전체</a><br>본 페이지는 성인(19+) 콘텐츠를 포함할 수 있습니다.</footer>\n\n'
    + '<div class="wp-sticky" id="wpSticky" aria-hidden="true"><div class="wp-sticky-in">\n'
    + '  <div class="wp-sticky-price">' + (page.price ? escape(page.price) : 'B컷에서 확인') + (stickyNote ? '<small>' + escape(stickyNote) + '</small>' : '') + '</div>\n'
    + '  <a class="work-preview-cta" data-out="sticky" href="' + escape(page.sale) + '" target="_blank" rel="noopener" tabindex="-1">B컷에서 보기 ›</a>\n'
    + '</div></div>\n'
    + '<dialog class="wp-zoom" id="wpZoom" aria-label="미리보기 사진 크게 보기"><img id="wpZoomImg" alt=""><button type="button" class="wp-zoom-close" id="wpZoomClose" aria-label="닫기">✕</button></dialog>\n\n'
    + '<script>\n' + read('scripts/work-page.js') + '</script>\n'
    + '</body></html>\n';
}

const ids = () => Object.keys(listed()).sort(numeric);
const urls = () => ids().map(id => BASE + '/works/' + id + '.html');

function build() {
  const pages = listed();
  const list = Object.keys(pages).sort(numeric);
  const dir = path.join(root, 'works');
  fs.mkdirSync(dir, { recursive: true });
  const keep = new Set(list.map(id => id + '.html'));
  for (const file of fs.readdirSync(dir)) if (file.endsWith('.html') && !keep.has(file)) fs.unlinkSync(path.join(dir, file));
  const emitted = list.map(id => {
    const page = pageState(id, pages);
    fs.writeFileSync(path.join(dir, id + '.html'), render(page));
    return { id, model: page.modelText, title: page.name + (page.editionLabel ? ' ' + page.editionLabel : ''), images: page.slides.length };
  });
  return { date, workPages: emitted.length, pages: emitted };
}

module.exports = { date, data, SALE, listed, catalogue, localFile, pictures, displayTitle, rankHistory, pageState, render, ids, urls, build };

if (require.main === module) console.log(JSON.stringify(build()));
