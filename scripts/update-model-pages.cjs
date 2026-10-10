const fs = require('node:fs');
const path = require('node:path');
const api = require('../model-page-data.js');
const pilot = require('../model-cta-pilot.js');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const dateIndex = process.argv.indexOf('--date');
const date = dateIndex < 0 ? api.today() : process.argv[dateIndex + 1];
if (!api.validDate(date)) throw new Error('Use --date YYYY-MM-DD (KST)');
const escape = api.escape;
function replace(html, regex, value, label) {
  if (!regex.test(html)) throw new Error('Missing HTML region: ' + label);
  return html.replace(regex, () => value);
}
function meta(html, key, value) {
  return replace(html, new RegExp('<meta (?:name|property)="' + key + '" content="[^"]*">'),
    '<meta ' + (key.startsWith('og:') ? 'property' : 'name') + '="' + key + '" content="' + escape(value) + '">', key);
}
function clearThumbs(html) {
  return html.replace(/\.card(?:\.up)?(?:\.b19)? \.thumb img\{filter:blur\([^}]+\}/g, '')
    .replace(/<div class=["']lock["']>🔞<\/div>/g, '');
}
function improveInitialRender(html, slug) {
  if (slug !== 'bakseoi') return html;
  html = html.replace(/<noscript data-model-speed-fonts>[\s\S]*?<\/noscript>\n?/g, '');
  html = html.replace(/<link\b(?=[^>]*href="https:\/\/fonts\.googleapis\.com\/css2\?)[^>]*>/g, tag => {
    const url = tag.match(/href="([^"]+)"/)[1].replace(/display=(?:swap|optional)/, 'display=optional');
    return '<link href="' + url + '" rel="stylesheet" media="print" onload="this.media=\'all\'">\n' +
      '<noscript data-model-speed-fonts><link href="' + url + '" rel="stylesheet"></noscript>';
  });
  const css = fs.readFileSync(path.join(root, 'model-cta-pilot.css'), 'utf8').replace(/\r\n/g, '\n').trim();
  html = html.replace(/<style id="model-pilot-critical">[\s\S]*?<\/style>\n?/g, '')
    .replace(/<link rel="stylesheet" href="\.\.\/model-cta-pilot\.css">\n?/g, '')
    .replace('</head>', '<style id="model-pilot-critical">' + css + '</style>\n</head>');
  return html.replace(/<body([^>]*)>/, (_, attrs) => '<body' + attrs.replace(/ data-model-speed="[^"]*"/g, '') + ' data-model-speed="1">');
}
let count = 0;
const slugs = {};
for (const file of fs.readdirSync(path.join(root, 'models')).filter(file => file.endsWith('.html') && file !== 'models.html')) {
  const filePath = path.join(root, 'models', file);
  let html = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const match = html.match(/var MODEL=("(?:[^"\\]|\\.)*")/) || html.match(/data-model="([^"]+)"/);
  if (!match) continue; // Two older layouts have no dynamic model template.
  const model = match[1].startsWith('"') ? JSON.parse(match[1]) : match[1];
  slugs[model] = file.slice(0, -5);
  const state = api.summary(data, model, date);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
  if (!html.includes('<section class="intro">')) {
    html = html.replace('<div id="upwrap"', '<section class="intro"></section>\n<div id="upwrap"');
  }
  if (!html.includes('<section class="faq">')) {
    html = html.replace('<section class="rel">', '<section class="faq"></section>\n<section class="rel">');
  }
  if (!html.includes('id="grid"')) {
    html = html.replace(/<div class="empty">[^<]*<\/div>/, '<div class="grid" id="grid" data-model="' + escape(model) + '"></div>');
  }
  html = replace(html, /<title>[^<]*<\/title>/, '<title>' + escape(state.title) + '</title>', file + ':title');
  html = meta(html, 'description', state.description);
  html = meta(html, 'og:title', state.title);
  html = meta(html, 'og:description', state.description);
  html = meta(html, 'og:image', state.image);
  html = replace(html, /<section class="intro">[\s\S]*?<\/section>/, '<section class="intro">' + api.intro(state) + '</section>', file + ':intro');
  html = replace(html, /<section class="faq">[\s\S]*?<\/section>/, '<section class="faq">' + api.faqHTML(state) + '</section>', file + ':faq');
  html = replace(html, /<div id="upwrap"[\s\S]*?(?=<div class="seclbl">)/,
    '<div id="upwrap"' + (state.upcoming.length ? '' : ' hidden') + '><div class="seclbl soon">곧 공개 예정 <small id="upcnt">' + state.upcoming.length + '편</small></div><div class="grid" id="upgrid">' + api.cards(state, true) + '</div></div>\n', file + ':upcoming');
  html = replace(html, /<div class="grid" id="grid"[^>]*>[\s\S]*?(?=<section class="(?:mtop|faq|rel)")/,
    '<div class="grid" id="grid" data-model="' + escape(model) + '" data-count="' + state.count + '">' + api.cards(state, false) + '</div>\n', file + ':grid');
  html = html.replace(/(<b id="cnt">)[^<]*(<\/b>)/, '$1' + state.count + '$2')
    .replace(/(<small id="cnt2">)[^<]*(<\/small>)/, '$1' + state.count + '편$2');
  html = html.replace(/<a([^>]*(?:class="topcta"|id="latestBtn"|data-latest-work)[^>]*)>/g, (_, attrs) =>
    '<a' + attrs.replace(/ href="[^"]*"/, '').replace(/ data-latest-work(?:="[^"]*")?/, '') + ' data-latest-work href="' + escape(state.latestUrl) + '">');
  html = html.replace(/(<div class="endcta">[\s\S]*?)<a([^>]*)>/, (_, before, attrs) =>
    before + '<a' + attrs.replace(/ href="[^"]*"/, '').replace(/ data-latest-work(?:="[^"]*")?/, '') + ' data-latest-work href="' + escape(state.latestUrl) + '">');
  html = html.replace(/<a class="chip"([^>]*)>([^<]+)<b>화보 \d+<\/b><\/a>/g, (_, attrs, name) =>
    '<a class="chip"' + attrs + '>' + name + '<b>화보 ' + api.summary(data, name, date).count + '</b></a>');
  html = html.replace(/(<a href="https:\/\/bcut\.maximkorea\.net\/work\/(\d+)[\s\S]*?<img src=")[^"]*"/g,
    (original, before, id) => data.works[id] ? before + escape(api.image(data.works[id].img)) + '"' : original);
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, start, json, end) =>
    start + JSON.stringify(api.schema(state, canonical, JSON.parse(json))).replace(/</g, '\\u003c') + end);
  html = html.replace(/<script>[\s\S]*?<\/script>/g, script => /var MODEL=/.test(script) ? '' : script);
  html = html.replace(/<script src="\.\.\/model-page(?:-data)?\.js" defer><\/script>\n?/g, '');
  html = html.replace('</body>', '<script src="../model-page-data.js" defer></script>\n<script src="../model-page.js" defer></script>\n</body>');
  html = clearThumbs(html);
  html = pilot.decorate(html, state, file.slice(0, -5));
  html = improveInitialRender(html, file.slice(0, -5));
  fs.writeFileSync(filePath, html);
  count++;
}
const directoryPath = path.join(root, 'models', 'models.html');
let html = fs.readFileSync(directoryPath, 'utf8').replace(/\r\n/g, '\n');
let config;
const configMatch = html.match(/<script id="model-directory-config" type="application\/json">([\s\S]*?)<\/script>/);
if (configMatch) config = JSON.parse(configMatch[1]);
else {
  const oldConfig = html.match(/var SLUG=(\{[^\n]*?\}), MIMG=(\{[^\n]*?\});/);
  if (!oldConfig) throw new Error('Missing directory config');
  config = { slugs: JSON.parse(oldConfig[1]), portraits: JSON.parse(oldConfig[2]) };
}
Object.assign(config.slugs, slugs);
const entries = api.directory(data, config, date);
const title = '맥심 B컷 모델 전체 ' + entries.length + '명 · 화보 랭킹';
const description = '맥심 B컷 화보 모델 ' + entries.length + '명을 한눈에. 모델별 인기 화보와 신작을 MAXIM B컷 주간 랭킹에서 확인하세요.';
html = replace(html, /<title>[^<]*<\/title>/, '<title>' + escape(title) + '</title>', 'directory:title');
html = meta(html, 'description', description); html = meta(html, 'og:title', title); html = meta(html, 'og:description', description);
html = html.replace(/(<b id="mcount">)[^<]*(<\/b>)/, '$1' + entries.length + '$2');
html = replace(html, /<div class="grid" id="grid">[\s\S]*?(?=<div class="endcta">)/,
  '<div class="grid" id="grid">\n' + api.directoryHTML(entries) + '\n</div>\n', 'directory:grid');
html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">' + JSON.stringify({
  '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: entries.length,
  itemListElement: entries.map((entry, i) => ({ '@type': 'ListItem', position: i + 1, url: entry.url, name: entry.name }))
}).replace(/</g, '\\u003c') + '</script>');
html = html.replace(/<script>[\s\S]*?<\/script>/g, script => /var SLUG=/.test(script) ? '' : script)
  .replace(/<script id="model-directory-config"[\s\S]*?<\/script>\n?/g, '')
  .replace(/<script src="\.\.\/(?:model-page-data|model-index)\.js" defer><\/script>\n?/g, '');
html = html.replace('</body>', '<script id="model-directory-config" type="application/json">' + JSON.stringify(config).replace(/</g, '\\u003c') + '</script>\n<script src="../model-page-data.js" defer></script>\n<script src="../model-index.js" defer></script>\n</body>');
fs.writeFileSync(directoryPath, clearThumbs(html));
console.log(JSON.stringify({ date, modelPages: count, directoryModels: entries.length }));
