const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const api = require('../model-page-data.js');
const sitemap = require('./sitemap.cjs');
const root = path.resolve(__dirname, '..');
const option = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };

async function main() {
  const date = option('--date') || api.today();
  assert(api.validDate(date), 'Use --date YYYY-MM-DD (KST)');
  const previous = await sitemap.loadPrevious(option('--previous'), process.argv.includes('--offline'));
  if (previous) sitemap.validateState(previous, date);
  const before = fs.readFileSync(path.join(root, 'data.json'));
  const run = file => execFileSync(process.execPath, [path.join(__dirname, file), '--date', date], { cwd: root, stdio: 'inherit' });
  run('update-model-pages.cjs');
  run('check-model-pages.cjs');
  run('check-model-browse.cjs');
  run('check-work-detail.cjs');
  const modelFiles = ['index.html', ...fs.readdirSync(path.join(root, 'models')).filter(file => file.endsWith('.html')).map(file => 'models/' + file)];
  const generatedHash = sitemap.fingerprint(root, modelFiles);
  run('update-model-pages.cjs');
  assert.equal(sitemap.fingerprint(root, modelFiles), generatedHash, 'Repeated generation must be stable');
  assert(before.equals(fs.readFileSync(path.join(root, 'data.json'))), 'Build must not edit catalogue data');
  const result = sitemap.generate(root, fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), previous, date);
  const output = path.join(root, '_site');
  if (fs.existsSync(output)) throw new Error('_site already exists. Use a clean checkout for each build.');
  fs.mkdirSync(output);
  // Only tracked public files are published. Git, workflows, build scripts and
  // untracked local files never enter the Pages artifact.
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of files) {
    if (file.startsWith('.') || file.startsWith('scripts/') || file.startsWith('_site/')) continue;
    const source = path.join(root, file);
    if (!fs.statSync(source).isFile()) throw new Error('Non-file public path: ' + file);
    const target = path.join(output, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  fs.writeFileSync(path.join(output, 'sitemap.xml'), result.sitemap);
  fs.writeFileSync(path.join(output, sitemap.STATE_FILE), JSON.stringify(result.state) + '\n');
  fs.writeFileSync(path.join(output, '.nojekyll'), '');
  const report = { result: 'PASS', date, sitemapPages: result.pages, changedPages: result.changed, previousState: previous ? 'published' : 'git-bootstrap', publishedFiles: files.length };
  console.log(JSON.stringify(report));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### Catalogue build passed\n\n- KST date: ' + date + '\n- Model pages verified.\n- Sitemap URLs: ' + result.pages + '\n- Changed page fingerprints: ' + result.changed + '\n- Catalogue data preserved; latest links, counts, schema and local images verified.\n');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
