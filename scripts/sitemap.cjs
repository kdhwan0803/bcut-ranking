const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const api = require('../model-page-data.js');
const SITE = 'https://bcutrank.com';
const STATE_FILE = 'sitemap-state.json';
const decode = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function pageFile(url) {
  const parsed = new URL(url);
  if (parsed.origin !== SITE || parsed.search || parsed.hash) throw new Error('Invalid sitemap URL: ' + url);
  const file = decodeURIComponent(parsed.pathname).slice(1) || 'index.html';
  if (file.includes('\\') || file.split('/').includes('..') || !file.endsWith('.html')) throw new Error('Invalid page path: ' + url);
  return file;
}
function readEntries(xml) {
  const seen = new Set();
  const entries = [...xml.matchAll(/<url>\s*([\s\S]*?)\s*<\/url>/g)].map(match => {
    const loc = match[1].match(/<loc>([^<]+)<\/loc>/);
    const date = match[1].match(/<lastmod>([^<]+)<\/lastmod>/);
    if (!loc || !date || !api.validDate(date[1])) throw new Error('Invalid sitemap entry');
    const url = decode(loc[1]);
    const file = pageFile(url);
    if (seen.has(url)) throw new Error('Duplicate sitemap URL: ' + url);
    seen.add(url);
    return { url, file, lastmod: date[1] };
  });
  if (!entries.length) throw new Error('Empty sitemap');
  return entries;
}
function dependencies(root, file) {
  const found = new Set([file]);
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href|content)="([^"]+)"/g)) {
    let url;
    try { url = new URL(decode(match[1]), SITE + '/' + file); } catch { continue; }
    if (url.origin !== SITE) continue;
    const name = decodeURIComponent(url.pathname).slice(1);
    if (!/\.(?:js|css|woff2?|ttf|webp|png|jpe?g|svg)$/i.test(name) || name.includes('\\') || name.split('/').includes('..')) continue;
    if (fs.existsSync(path.join(root, name))) found.add(name);
  }
  // The home app renders its catalogue from JSON. Model pages already contain
  // their own generated, model-specific catalogue, so unrelated data edits do
  // not change every model's lastmod.
  if (file === 'index.html') for (const name of ['data.json', 'recs.json']) {
    if (fs.existsSync(path.join(root, name))) found.add(name);
  }
  return [...found].sort();
}
function fingerprint(root, files, releaseDate) {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    let bytes = fs.readFileSync(path.join(root, file));
    if (/\.(?:html|js|css|json)$/i.test(file)) {
      let text = bytes.toString('utf8').replace(/\r\n/g, '\n');
      // Counts in the secondary related-model chips are not a significant
      // change to this model's own catalogue. Keep the link targets and names.
      if (file.endsWith('.html')) text = text.replace(/(<a class="chip"[^>]*>[^<]+<b>화보 )\d+(<\/b>)/g, '$1#$2');
      bytes = Buffer.from(text);
    }
    hash.update(file + '\0').update(bytes).update('\0');
  }
  if (releaseDate && files.includes('data.json')) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
    const released = Object.keys(data.works || {}).filter(id => api.listed(data.works[id]) && data.works[id].pub <= releaseDate).sort();
    hash.update('published-work-ids\0' + JSON.stringify(released));
  }
  return hash.digest('hex');
}
function validateState(state, date) {
  if (!state || state.version !== 1 || state.site !== SITE || !state.pages || Array.isArray(state.pages)) throw new Error('Invalid previous sitemap state');
  for (const [url, page] of Object.entries(state.pages)) {
    pageFile(url);
    if (!page || !/^[a-f0-9]{64}$/.test(page.hash) || !api.validDate(page.lastmod) || page.lastmod > date) throw new Error('Invalid previous page state: ' + url);
  }
  return state;
}
function bootstrapDate(root, entry, files, date) {
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() !== 'false') throw new Error('Full Git history is required for sitemap migration (fetch-depth: 0)');
  const committed = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files], { cwd: root, encoding: 'utf8' }).trim();
  if (!committed) throw new Error('Missing Git history for ' + entry.file);
  const gitDate = api.today(Date.parse(committed));
  const result = [entry.lastmod, gitDate].sort().at(-1);
  if (result > date) throw new Error('Future lastmod for ' + entry.file);
  return result;
}
function generate(root, xml, previous, date) {
  if (!api.validDate(date)) throw new Error('Invalid build date');
  if (previous) validateState(previous, date);
  const entries = readEntries(xml);
  const state = { version: 1, site: SITE, pages: {} };
  let changed = 0;
  for (const entry of entries) {
    const files = dependencies(root, entry.file);
    const hash = fingerprint(root, files, date);
    const old = previous?.pages[entry.url];
    const lastmod = old ? (old.hash === hash ? old.lastmod : date) : (previous ? date : bootstrapDate(root, entry, files, date));
    if (!old || old.hash !== hash) changed++;
    entry.lastmod = lastmod;
    state.pages[entry.url] = { hash, lastmod };
  }
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.map(entry =>
    '  <url>\n    <loc>' + api.escape(entry.url) + '</loc>\n    <lastmod>' + entry.lastmod + '</lastmod>\n  </url>'
  ).join('\n') + '\n</urlset>\n';
  return { sitemap, state, pages: entries.length, changed };
}
async function loadPrevious(file, offline) {
  if (file) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (offline) return null;
  const response = await fetch(SITE + '/' + STATE_FILE + '?build=' + Date.now(), { signal: AbortSignal.timeout(20000), cache: 'no-store' });
  if (response.status === 404) return null; // One-time migration from branch-based Pages.
  if (!response.ok) throw new Error('Previous sitemap state fetch failed: HTTP ' + response.status);
  return response.json();
}
module.exports = { SITE, STATE_FILE, pageFile, readEntries, dependencies, fingerprint, validateState, generate, loadPrevious };
