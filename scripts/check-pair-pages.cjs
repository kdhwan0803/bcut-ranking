const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../model-page-data.js');
const creators = require('./update-creator-pages.cjs');
const gen = require('./update-pair-pages.cjs');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'pairs');

function decode(text) { return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

const pairs = gen.pairList();
const works = gen.data.works || {};
const slugs = new Set();
const titles = new Set();
const modelSlugs = creators.modelSlugMap();

for (const pair of pairs) {
  const label = 'pairs/' + pair.slug + '.html:';
  assert(/^[a-z0-9_-]+$/.test(pair.slug), label + ' slug shape');
  assert(!slugs.has(pair.slug), label + ' duplicate slug');
  slugs.add(pair.slug);
  assert.equal(creators.CREATOR_SLUGS[pair.creator], pair.creatorSlug, label + ' creator slug');
  assert.equal(modelSlugs[pair.model], pair.modelSlug, label + ' model slug');

  // Every listed work really belongs to this creator and model, and is public.
  assert(pair.published.length >= gen.MIN_WORKS, label + ' below minimum works');
  for (const id of pair.published) {
    const work = works[id];
    assert(api.listed(work) && work.pub <= gen.date, label + ' unpublished work ' + id);
    assert.equal(String(work.photo || '').trim(), pair.creator, label + ' creator of work ' + id);
    assert(api.models(work.models).includes(pair.model), label + ' model of work ' + id);
  }
  for (const id of pair.upcoming) assert(works[id].pub > gen.date, label + ' upcoming work ' + id);

  const file = path.join(dir, pair.slug + '.html');
  assert(fs.existsSync(file), label + ' missing page file (run update-pair-pages.cjs)');
  const html = fs.readFileSync(file, 'utf8');
  const state = gen.pairState(pair);
  assert.equal(html, gen.render(state), label + ' page content out of date');

  assert.equal(decode(html.match(/<title>([^<]*)<\/title>/)[1]), state.title, label + ' title');
  assert(state.title.startsWith(pair.creator + ' ' + pair.model + ' 화보 '), label + ' title names creator and model');
  assert(!titles.has(state.title), label + ' duplicate title');
  titles.add(state.title);
  assert.equal(decode(html.match(/<meta name="description" content="([^"]*)"/)[1]), state.description, label + ' description');
  assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)[1], api.BASE + '/pairs/' + pair.slug + '.html', label + ' canonical');
  const grid = html.match(/<div class="grid" id="grid"[^>]*>([\s\S]*?)<\/div>\n<section class="faq">/)[1];
  assert.equal([...grid.matchAll(/<a class="card/g)].length, state.count, label + ' grid count');
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(json.find(item => item['@type'] === 'CollectionPage').mainEntity.numberOfItems, state.count, label + ' schema count');
  assert.deepEqual(json.find(item => item['@type'] === 'FAQPage').mainEntity.map(i => i.acceptedAnswer.text), state.faq.map(i => i.answer), label + ' schema FAQ');
  assert(!/(?:^|[;{])filter:blur\(/m.test(html), label + ' thumbnail blur');
  assert(!html.includes('class="lock"'), label + ' age overlay');

  // Local assets exist, and every internal page link points at a real page.
  for (const m of html.matchAll(/(?:src|href)="(\.\.\/[^"]+)"/g)) {
    assert(fs.existsSync(path.resolve(dir, decode(m[1]))), label + ' local asset exists: ' + m[1]);
  }
  for (const m of html.matchAll(/href="https:\/\/bcutrank\.com\/((?:models|creators|pairs)\/[^"#?]+\.html)"/g)) {
    assert(fs.existsSync(path.join(root, m[1])), label + ' internal link target exists: ' + m[1]);
  }

  // The model page and the creator page both link to this pair page.
  const modelHtml = fs.readFileSync(path.join(root, 'models', pair.modelSlug + '.html'), 'utf8');
  assert(modelHtml.includes('<a class="pl-a" href="' + pair.url + '">'), label + ' link from model page');
  const creatorHtml = fs.readFileSync(path.join(root, 'creators', pair.creatorSlug + '.html'), 'utf8');
  assert(creatorHtml.includes('<a class="chip" href="' + pair.url + '">'), label + ' link from creator page');
}

// No stale pair files, and the directory page is current.
const expected = new Set(pairs.map(pair => pair.slug + '.html').concat('pairs.html'));
for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.html'))) assert(expected.has(file), 'stale pair page: pairs/' + file);
assert.equal(fs.readFileSync(path.join(dir, 'pairs.html'), 'utf8'), gen.renderDirectory(), 'pairs/pairs.html out of date');

// Model pages carry the link block exactly when they have a pair page or a
// creator with a creator page, and every creator link points at a real page.
let creatorLinks = 0;
for (const [model, slug] of Object.entries(modelSlugs)) {
  const html = fs.readFileSync(path.join(root, 'models', slug + '.html'), 'utf8');
  const shooters = gen.creatorsOfModel(model);
  assert.equal(html.includes('<section class="pairlinks">'), gen.pairsOfModel(model).length > 0 || shooters.length > 0, 'models/' + slug + '.html: link block');
  for (const item of shooters) {
    assert.equal(creators.CREATOR_SLUGS[item.creator], item.creatorSlug, 'models/' + slug + '.html: creator slug ' + item.creator);
    assert(fs.existsSync(path.join(root, 'creators', item.creatorSlug + '.html')), 'models/' + slug + '.html: creator page exists ' + item.creatorSlug);
    assert(html.includes('<a class="pl-a" href="' + item.url + '">'), 'models/' + slug + '.html: link to creator ' + item.creator);
    creatorLinks++;
  }
}

// Pair URLs are added to the sitemap by build-site.cjs, never by hand.
assert(!/\/pairs\//.test(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8')), 'sitemap.xml must not list pairs/ pages');

console.log(JSON.stringify({ result: 'PASS', date: gen.date, checkedPairPages: pairs.length, minWorks: gen.MIN_WORKS, sitemapUrlsAddedAtBuild: gen.urls().length, modelToCreatorLinks: creatorLinks }));
