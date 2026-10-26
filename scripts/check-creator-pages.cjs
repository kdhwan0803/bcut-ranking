const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../model-page-data.js');
const gen = require('./update-creator-pages.cjs');
const root = path.resolve(__dirname, '..');
const date = gen.date;
const data = gen.data;

function decode(text) { return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

let checked = 0;
const slugs = new Set();
const modelSlugs = gen.modelSlugMap();
const expectedUrls = new Set();

for (const [creator, slug] of Object.entries(gen.CREATOR_SLUGS)) {
  assert(/^[a-z0-9_-]+$/.test(slug), 'slug shape: ' + slug);
  assert(!slugs.has(slug), 'duplicate creator slug: ' + slug);
  slugs.add(slug);
  const state = gen.creatorState(creator, modelSlugs);
  const file = path.join(root, 'creators', slug + '.html');
  if (!state.count) { assert(!fs.existsSync(file), creator + ': empty creator must not have a page'); continue; }
  const label = 'creators/' + slug + '.html:';
  assert(fs.existsSync(file), label + ' missing page file (run update-creator-pages.cjs)');
  const html = fs.readFileSync(file, 'utf8');

  // The committed page must match the deterministic generator exactly.
  assert.equal(html, gen.render(state, slug), label + ' page content out of date');

  // Spot-check the SEO-critical regions explicitly for clear failures.
  assert.equal(decode(html.match(/<title>([^<]*)<\/title>/)[1]), state.title, label + ' title');
  assert.equal(decode(html.match(/<meta name="description" content="([^"]*)"/)[1]), state.description, label + ' description');
  assert.equal(decode(html.match(/<link rel="canonical" href="([^"]+)"/)[1]), api.BASE + '/creators/' + slug + '.html', label + ' canonical');
  assert(html.includes('<section class="faq">' + api.faqHTML(state) + '</section>'), label + ' FAQ');
  const grid = html.match(/<div class="grid" id="grid"[^>]*>([\s\S]*?)<\/div>\n<section class="faq">/)[1];
  assert.equal([...grid.matchAll(/<a class="card/g)].length, state.count, label + ' grid count');
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const collection = json.find(item => item['@type'] === 'CollectionPage');
  const faq = json.find(item => item['@type'] === 'FAQPage');
  assert.equal(collection.mainEntity.numberOfItems, state.count, label + ' schema count');
  assert.deepEqual(faq.mainEntity.map(i => i.acceptedAnswer.text), state.faq.map(i => i.answer), label + ' schema FAQ');
  const latest = [...html.matchAll(/data-latest-(?:work|sale) href="([^"]+)"/g)];
  assert(latest.length >= 1, label + ' latest link');
  // No central age overlay or thumbnail blur on indexable pages.
  assert(!/(?:^|[;{])filter:blur\(/m.test(html), label + ' thumbnail blur');
  assert(!html.includes('class="lock"'), label + ' age overlay');
  // Local (../) asset references must exist.
  for (const m of html.matchAll(/(?:src|href)="(\.\.\/[^"]+)"/g)) {
    assert(fs.existsSync(path.resolve(root, 'creators', decode(m[1]))), label + ' local asset exists: ' + m[1]);
  }
  expectedUrls.add(api.BASE + '/creators/' + slug + '.html');
  checked++;
}

// Directory page present and current.
const dirFile = path.join(root, 'creators', 'creators.html');
assert(fs.existsSync(dirFile), 'creators/creators.html missing');
const result = gen.build();
assert.equal(fs.readFileSync(dirFile, 'utf8'), gen.renderDirectory(result.emitted), 'creators/creators.html out of date');
expectedUrls.add(api.BASE + '/creators/creators.html');

// Sitemap must list exactly the generated creator pages — no missing, no stale.
const sitemapXml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const creatorLocs = new Set([...sitemapXml.matchAll(/<loc>([^<]*\/creators\/[^<]+)<\/loc>/g)].map(m => decode(m[1])));
for (const url of expectedUrls) assert(creatorLocs.has(url), 'sitemap missing: ' + url);
for (const url of creatorLocs) assert(expectedUrls.has(url), 'sitemap has stale creator URL: ' + url);

console.log(JSON.stringify({ result: 'PASS', date, checkedCreatorPages: checked, directory: expectedUrls.size - checked, sitemapCreatorUrls: creatorLocs.size }));
