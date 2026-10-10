const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../model-page-data.js');
const browse = require('../model-browse-pilot.js');
const root = path.resolve(__dirname, '..');
const dateArg = process.argv.indexOf('--date');
const date = dateArg < 0 ? api.today() : process.argv[dateArg + 1];
const fixture = { works: {
  1: { models: ['테스트'], pub: '2026-10-01', title: '사진', vid: 0 },
  2: { models: ['테스트'], pub: '2026-10-10', title: '영상', vid: 1 },
  3: { models: ['테스트'], pub: '2026-10-10', title: '사진 + 영상', vid: true },
  4: { models: ['테스트'], pub: '2026-10-11', title: '예정작', vid: 0 },
  5: { models: ['테스트'], pub: '2026-10-10', title: '비공개', status: 'hidden', vid: 1 }
}, weeks: [
  { date: '2026-10-01', ranking: ['4', '1', '2'] },
  { date: '2026-10-05', ranking: ['1', '2'] },
  { date: '2026-10-12', ranking: ['3'] },
  { date: 'invalid', ranking: ['3'] }
] };
const state = api.summary(fixture, '테스트', '2026-10-10');
const info = browse.seed(state, fixture), before = JSON.stringify(info);
const ids = items => items.map(item => item.id);
assert.deepEqual(ids(info.items), ['3', '2', '1']);
assert.deepEqual(ids(browse.ordered(info.items, 'photo', 'latest')), ['1']);
assert.deepEqual(ids(browse.ordered(info.items, 'video', 'latest')), ['3', '2']);
assert.deepEqual(ids(browse.ordered(info.items, 'all', 'popular')), ['1', '2', '3']);
assert.equal(info.items.find(item => item.id === '1').rank, 1);
assert.equal(info.items.find(item => item.id === '3').rank, null, 'future/invalid weekly records do not rank released works');
assert.deepEqual(ids(browse.ordered(info.items.map(item => ({ ...item, rank: 2 })), 'all', 'popular')), ['3', '2', '1']);
assert.equal(JSON.stringify(info), before, 'filtering and sorting do not change the catalogue or seed');
assert.equal(browse.video({ vid: '1' }), true);
assert.equal(browse.video({ vid: '0', title: 'VIDEO' }), false, 'use the same explicit video flag as gallery badges');
assert.deepEqual(browse.ordered([], 'video', 'popular'), []);
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const pilots = { donggeuran: '동그란', seuli: '슬이', bakseoi: '박서이' };
const counts = {};
for (const file of fs.readdirSync(path.join(root, 'models')).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, 'models', file), 'utf8');
  const slug = file.slice(0, -5);
  if (Object.hasOwn(pilots, slug)) {
    const real = browse.seed(api.summary(data, pilots[slug], date), data);
    counts[slug] = { total: real.items.length, photos: real.items.filter(item => !item.video).length, videoIncluding: real.items.filter(item => item.video).length };
    const seed = JSON.parse(html.match(/<script id="model-browse-state" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(seed, real);
    assert.equal((html.match(/id="model-browse"/g) || []).length, 1);
    assert.equal((html.match(/id="model-browse-css"/g) || []).length, 1);
    assert.equal((html.match(/src="\.\.\/model-browse-pilot\.js"/g) || []).length, 1);
    assert.equal((html.match(/data-work-id="/g) || []).length, real.items.length);
    assert(html.includes('aria-label="화보 필터와 정렬" hidden'), 'without JS the full static gallery remains available');
    assert(html.indexOf('src="../model-browse-pilot.js"') < html.indexOf('src="../model-page.js"'), 'bind controls before the existing refresh');
    assert(html.includes('href="#grid"'), 'the static gallery shortcut works without JavaScript');
    assert(html.includes('data-model-pilot="' + slug + '"'), 'existing latest-work pilot remains enabled');
    assert(html.includes('src="../thumbnail-fallback.js"'), 'thumbnail failure handling remains enabled');
    if (slug === 'bakseoi') assert(html.includes('data-model-speed="1"'), 'mobile speed pilot remains enabled');
  } else assert(!html.includes('model-browse-pilot.js') && !html.includes('id="model-browse"'), file + ': pilot scope');
}
assert.deepEqual(Object.keys(counts).sort(), Object.keys(pilots).sort(), 'all three representative model pages are generated');
console.log(JSON.stringify({ result: 'PASS', modelBrowsePilots: counts, scenarios: ['photo/video flags', 'published only', 'future and invalid rankings', 'best weekly rank', 'rank/date ties', 'immutable sorting', 'empty results', 'no-JS gallery', 'three-model scope and existing features'] }));
