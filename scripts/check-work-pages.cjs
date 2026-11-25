const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../model-page-data.js');
const workPages = require('./update-work-pages.cjs');
const root = path.resolve(__dirname, '..');
const data = workPages.data;
const date = workPages.date;
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Page list rule, on a fixed fixture so later catalogue changes stay valid.
assert.equal(typeof api.workPages, 'function', 'model-page-data.js provides the work page list');
assert.equal(typeof api.workLink, 'function', 'model-page-data.js provides work links');
const fixture = { workPages: { enabled: true, ids: ['1', '2', '3', '4', '5', '9', 'x'] }, works: {
  1: { pub: '2026-10-09', safe: true, img: 'assets/covers/a.webp', title: '공개작' },
  2: { pub: '2026-10-11', safe: true, img: 'assets/covers/b.webp', title: '예정작' },
  3: { pub: '2026-10-09', safe: false, img: 'https://example.com/c.webp', title: '공개 표지 없음' },
  4: { pub: '2026-10-09', safe: true, img: 'assets/covers/d.webp', status: 'draft', title: '초안' },
  5: { pub: '2026-10-09', safe: true, img: '', title: '표지 없음' },
  6: { pub: '2026-10-09', safe: true, img: 'assets/covers/f.webp', title: '목록 밖' }
} };
assert.deepEqual(Object.keys(api.workPages(fixture, '2026-10-10')), ['1'], 'published, listed, safe cover, in the list');
assert.deepEqual(Object.keys(api.workPages(fixture, '2026-10-11')), ['1', '2'], 'release date');
assert.deepEqual(Object.keys(api.workPages(Object.assign({}, fixture, { workPages: { enabled: true, all: true } }), '2026-10-10')), ['1', '6'], 'whole catalogue mode');
assert.deepEqual(Object.keys(api.workPages(Object.assign({}, fixture, { workPages: { enabled: false, ids: ['1'] } }), '2026-10-10')), [], 'disabled');
assert.deepEqual(Object.keys(api.workPages({ works: fixture.works }, '2026-10-10')), [], 'no configuration');
const fixturePages = api.workPages(fixture, '2026-10-10');
assert.equal(api.workLink('1', fixturePages), 'https://bcutrank.com/works/1.html');
assert.equal(api.workLink('3', fixturePages), 'https://bcutrank.com/?w=3');
assert.equal(api.workLink('1'), 'https://bcutrank.com/?w=1', 'callers without a page list keep the catalogue link');
assert.equal(workPages.displayTitle('Taste Me (사진) [P.S]', 'photo'), 'Taste Me');
assert.equal(workPages.displayTitle('Loves in her night(사진 + 영상)', 'combined'), 'Loves in her night(사진 + 영상)');
assert.equal(workPages.displayTitle('[태그]', ''), '[태그]');
assert.equal(workPages.displayTitle('チョコ大好き[ 초코좋아]', 'combined'), 'チョコ大好き[ 초코좋아]', 'translated titles keep their bracket');
assert.equal(workPages.displayTitle('Daybreak [MANO]', ''), 'Daybreak');

const pages = workPages.listed();
const ids = Object.keys(pages).sort((a, b) => Number(a) - Number(b));
const dir = path.join(root, 'works');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith('.html')).sort() : [];
assert.deepEqual(files, ids.map(id => id + '.html').sort(), 'one page for every listed work, and no others');

// Buyer counts, sales figures and similar internal numbers never belong on a public page.
const forbidden = /판매\s*건수|판매\s*수량|구매자\s*수|구매\s*인원|\d+\s*명이\s*(?:구매|선택)|매출|sales_count/;
const exists = (from, reference) => fs.existsSync(path.resolve(root, from, decode(reference).split(/[?#]/)[0]));
let checked = 0, withPhotos = 0, coverOnly = 0, paired = 0;
for (const id of ids) {
  const label = 'works/' + id + '.html: ';
  const html = fs.readFileSync(path.join(dir, id + '.html'), 'utf8');
  const page = workPages.pageState(id, pages), work = data.works[id];
  assert.equal(html, workPages.render(page), label + 'stable generation');
  assert(work.pub <= date && work.safe === true, label + 'published work with a public cover');
  assert.equal(decode(html.match(/<link rel="canonical" href="([^"]+)"/)[1]), 'https://bcutrank.com/works/' + id + '.html', label + 'canonical');
  assert(decode(html.match(/<title>([^<]*)<\/title>/)[1]).endsWith(' | 맥심 B컷'), label + 'title');
  assert(html.match(/<meta name="description" content="([^"]{20,})"/), label + 'description');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, label + 'single heading');
  assert(html.includes('<meta name="robots" content="index,follow">'), label + 'robots');
  const sale = 'https://bcut.maximkorea.net/work/' + id + '?bn=rank_work_' + id;
  const outbound = [...html.matchAll(/<a class="work-preview-cta[^"]*"[^>]*data-out="([^"]+)" href="([^"]+)"/g)];
  assert(outbound.length >= 3, label + 'purchase buttons');
  outbound.forEach(link => assert.equal(decode(link[2]), sale, label + 'purchase destination (' + link[1] + ')'));
  ['hero', 'bottom', 'sticky'].forEach(origin => assert(outbound.some(link => link[1] === origin), label + origin + ' button'));
  for (const link of html.matchAll(/href="(https:\/\/bcut\.maximkorea\.net[^"]*)"/g)) assert.equal(decode(link[1]), sale, label + 'no other sale destination');
  const og = decode(html.match(/<meta property="og:image" content="([^"]+)"/)[1]);
  assert.equal(og, api.image(work.img, true), label + 'share image is the public cover');
  assert(page.slides[0].cover && page.slides[0].exists, label + 'public cover file');
  const gallery = Array.isArray(work.gallery) ? work.gallery : [];
  gallery.forEach(file => assert(typeof file === 'string' && /^assets\/works\/[a-z0-9._-]+\.webp$/i.test(file) && fs.existsSync(path.join(root, file)), label + 'approved photo exists: ' + file));
  assert.equal(page.slides.length, 1 + gallery.length, label + 'cover plus approved photos');
  assert.equal((html.match(/<figure class="wp-slide/g) || []).length, page.slides.length, label + 'slide count');
  assert.equal(html.includes('class="wp-gallery wp-single"'), page.slides.length === 1, label + 'single image hides the gallery controls');
  for (const image of html.matchAll(/<img[^>]+src="(\.\.\/[^"]+)"/g)) assert(exists('works', image[1]), label + 'image exists: ' + image[1]);
  for (const set of html.matchAll(/srcset="([^"]+)"/g)) decode(set[1]).split(',').map(part => part.trim().split(' ')[0]).filter(part => part.startsWith('../')).forEach(part => assert(exists('works', part), label + 'srcset image exists: ' + part));
  for (const link of html.matchAll(/href="(\d+\.html)"/g)) assert(pages[link[1].slice(0, -5)] === true, label + 'linked work page exists: ' + link[1]);
  for (const link of html.matchAll(/href="(\.\.\/(?:models|creators)\/[^"]+\.html)"/g)) assert(exists('works', link[1]), label + 'linked page exists: ' + link[1]);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert(schema.some(item => item['@type'] === 'CreativeWork' && item.url === page.url), label + 'schema');
  assert(schema.some(item => item['@type'] === 'BreadcrumbList'), label + 'breadcrumb');
  const visible = html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  assert(!forbidden.test(visible), label + 'internal figures');
  if (page.price) assert(visible.includes('<strong>' + page.price + '</strong>'), label + 'confirmed price');
  else assert(visible.includes('가격과 구성은 B컷에서 확인'), label + 'unknown price is not invented');
  if (page.summary) assert(visible.includes(api.escape(page.summary)), label + 'confirmed composition');
  assert.equal(visible.includes('wp-badge19'), work.b19 === true || String(work.b19) === '1', label + '19 badge');
  if (page.offers.length) {
    assert.equal(page.offers.length, 2, label + 'photo and video editions');
    assert(visible.includes('사진판과 영상판은 별도 판매됩니다.'), label + 'separate sale notice');
    paired++;
  }
  assert(html.includes("track('bcut_work_view'") && html.includes("track('bcut_work_outbound'"), label + 'measurement');
  if (gallery.length) withPhotos++; else coverOnly++;
  checked++;
}

// Model page cards point at the work page when one exists, and stay on the catalogue link otherwise.
const sample = ids.find(id => api.models(data.works[id].models).filter(Boolean).length);
if (sample) {
  const model = api.models(data.works[sample].models).filter(Boolean)[0];
  const state = api.summary(data, model, date), cards = api.cards(state, false);
  assert(cards.includes('href="https://bcutrank.com/works/' + sample + '.html"'), 'model card links to the work page');
  const other = state.published.find(id => pages[id] !== true);
  if (other) assert(cards.includes('href="https://bcutrank.com/?w=' + other + '" rel="nofollow"'), 'other cards keep the catalogue link');
  assert(!api.cards(state, false, true).includes('/works/'), 'browse pilot cards unchanged');
}
console.log(JSON.stringify({ result: 'PASS', date, workPages: checked, withApprovedPhotos: withPhotos, coverOnly, pairedEditions: paired,
  scenarios: ['page list rule', 'release date', 'one page per listed work', 'stable generation', 'canonical/title/description', 'purchase destination', 'public cover share image', 'approved photos exist', 'local images and links', 'schema', 'no internal figures', 'confirmed price or none', 'model card links'] }));
