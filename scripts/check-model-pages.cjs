const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const api = require('../model-page-data.js');
const pilot = require('../model-cta-pilot.js');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const arg = process.argv.indexOf('--date');
const date = arg < 0 ? api.today() : process.argv[arg + 1];
assert(api.validDate(date));
function decode(text) { return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
const fixture = { works: {
  1: { models: ['테스트'], pub: '2026-10-09', title: '<script>"제목"</script>', img: 'assets/covers/example.webp' },
  2: { models: "['테스트']", pub: '2026-10-10', title: '공개작', img: 'https://example.com/cover.webp' },
  3: { models: ['테스트'], pub: '2026-10-11', title: '예정작' },
  4: { models: ['테스트'], pub: '2026-10-10', status: 'draft', title: '초안' },
  5: { models: ['테스트'], pub: '2026-02-30', title: '잘못된 날짜' },
  6: { models: ['테스트'], pub: '2026-10-10', published: false, title: '미공개' }
} };
assert.deepEqual(api.summary(fixture, '테스트', '2026-10-09').published, ['1']);
assert.deepEqual(api.summary(fixture, '테스트', '2026-10-10').published, ['2', '1']);
assert.deepEqual(api.summary(fixture, '테스트', '2026-10-10').upcoming, ['3']);
assert.equal(api.summary(fixture, '테스트', '2026-10-11').latestId, '3');
assert.equal(api.summary(fixture, '없음', '2026-10-10').count, 0);
assert.equal(api.today(Date.parse('2026-10-09T14:59:59Z')), '2026-10-09');
assert.equal(api.today(Date.parse('2026-10-09T15:00:00Z')), '2026-10-10');
assert.deepEqual(api.models('5'), []);
assert(!api.cards(api.summary(fixture, '테스트', '2026-10-10')).includes('<script>'));
assert.equal(api.image('assets/covers/example.webp'), '../assets/covers/example.webp');
assert.equal(api.image('javascript:alert(1)'), '');
assert.equal(api.summary(data, '쥬', '2026-10-10').count, 16);
assert.equal(api.summary(data, '쥬', '2026-10-10').latestId, '2394');
assert.equal(api.summary(data, '박보름', '2026-10-09').count, 3);
assert.equal(api.summary(data, '박보름', '2026-10-10').count, 4);
assert.equal(api.summary(data, '박보름', '2026-10-10').latestId, '2340');
assert(!api.summary(data, '죠야끼', '2026-10-10').published.includes('2395'));
assert(api.summary(data, '죠야끼', '2026-10-10').upcoming.includes('2395'));
assert.equal(api.summary(data, '죠야끼', '2026-10-11').latestId, '2395');
let checked = 0, pilotChecked = 0;
for (const file of fs.readdirSync(path.join(root, 'models')).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, 'models', file), 'utf8');
  const match = html.match(/data-model="([^"]+)"/);
  if (!match) continue;
  const state = api.summary(data, decode(match[1]), date);
  const label = file + ':';
  assert.equal(decode(html.match(/<title>([^<]*)<\/title>/)[1]), state.title, label + 'title');
  assert.equal(decode(html.match(/<meta name="description" content="([^"]*)"/)[1]), state.description, label + 'description');
  assert(html.includes('<section class="intro">' + api.intro(state) + '</section>'), label + 'intro');
  assert(html.includes('<section class="faq">' + api.faqHTML(state) + '</section>'), label + 'FAQ');
  const links = [...html.matchAll(/<a[^>]+data-latest-work[^>]+href="([^"]+)"/g)];
  assert.equal(links.length, 3, label + 'latest button count');
  links.forEach(link => assert.equal(decode(link[1]), state.latestUrl, label + 'latest button'));
  if (pilot.selected(file.slice(0, -5))) {
    const sale = new URL(decode(html.match(/data-latest-sale href="([^"]+)"/)[1]));
    assert.equal(sale.hostname, 'bcut.maximkorea.net', label + 'sale destination');
    assert.equal(sale.pathname, '/work/' + state.latestId, label + 'latest sale ID');
    assert.equal(sale.searchParams.get('utm_campaign'), pilot.version, label + 'campaign');
    assert(html.includes('<time datetime="' + state.works[state.latestId].pub + '">'), label + 'release date');
    assert(!/onclick="[^"]*model_(?:cta|top3)_click/.test(html), label + 'duplicate legacy tracking removed');
    pilotChecked++;
  } else assert(!html.includes('data-model-pilot'), label + 'pilot scope');
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const collection = json.find(item => item['@type'] === 'CollectionPage');
  const faq = json.find(item => item['@type'] === 'FAQPage');
  assert.equal(collection.mainEntity.numberOfItems, state.count, label + 'schema count');
  assert.deepEqual(faq.mainEntity.map(item => item.acceptedAnswer.text), state.faq.map(item => item.answer), label + 'schema FAQ');
  const grid = html.match(/<div class="grid" id="grid"[^>]*>([\s\S]*?)(?=<section class="(?:mtop|faq|rel)")/)[1];
  assert.equal([...grid.matchAll(/<a class="card/g)].length, state.count, label + 'grid count');
  assert(!/(?:^|[;{])filter:blur\(/m.test(html), label + 'thumbnail blur');
  assert(!html.includes("class='lock'") && !html.includes('class="lock"'), label + 'central age overlay');
  assert.equal((html.match(/src="\.\.\/model-page\.js"/g) || []).length, 1, label + 'shared script');
  for (const image of html.matchAll(/<img[^>]+src="(\.\.\/[^\"]+)"/g)) {
    assert(fs.existsSync(path.resolve(root, 'models', decode(image[1]))), label + 'image exists: ' + image[1]);
  }
  // A popular work keeps its original destination and order.
  const before = execFileSync('git', ['show', 'HEAD:models/' + file], { cwd: root, encoding: 'utf8' });
  const popularLinks = source => {
    const section = source.match(/<section class="mtop">([\s\S]*?)<\/section>/);
    return section ? [...section[1].matchAll(/<a href="([^"]+)"/g)].map(item => item[1]) : [];
  };
  assert.deepEqual(popularLinks(html), popularLinks(before), label + 'popular destinations');
  checked++;
}
assert.equal(fs.readFileSync(path.join(root, 'data.json'), 'utf8').replace(/\r\n/g, '\n'), execFileSync('git', ['show', 'HEAD:data.json'], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n'));
assert.equal(pilotChecked, pilot.slugs.length);
for (const file of ['index.html', 'worldcup.html']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert(source.includes("blurOf(){return 'none';}"), file + ': clear image policy');
  assert(!/lockShow:.*age==='minor'/.test(source), file + ': central age overlay');
  assert(!source.includes('blur(7px)'), file + ': upcoming thumbnail blur');
}
console.log(JSON.stringify({ result: 'PASS', date, checkedModelPages: checked, pilotPages: pilotChecked, scenarios: ['KST midnight', 'published/upcoming', 'draft/invalid date', 'zero works', 'HTML escaping', 'all latest buttons', 'metadata/FAQ/schema', 'existing local image paths', 'TOP3 links preserved', 'data.json unchanged', 'thumbnail blur removed', 'pilot sale destination/date/scope'] }));
