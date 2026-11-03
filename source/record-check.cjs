// Fails (exit 1) when PROJECT_RECORD.md / HOW-IT-WORKS are behind the project. Run via ./check-record.sh after EVERY change.
// Usage: node record-check.cjs [--run]   (--run also executes the server tests and compares the check count)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const HERE = __dirname, SRC = HERE;                                // this folder IS the project: anitha-store.html, wa-assistant/, tests/
const read = f => fs.readFileSync(f, 'utf8');
const record = read(path.join(HERE, 'PROJECT_RECORD.md'));
const how = fs.readdirSync(path.join(HERE, 'HOW-IT-WORKS')).map(f => read(path.join(HERE, 'HOW-IT-WORKS', f))).join('\n');
const all = record + '\n' + how;
const problems = [];
const need = (cond, msg) => { if (!cond) problems.push(msg); };

const html = read(path.join(SRC, 'anitha-store.html'));
try { require('child_process').execFileSync('python3', [path.join(SRC, 'tools', 'join-parts.py'), '--check'], { stdio: 'pipe' }); } catch (e) { console.error('anitha-store.html is not exactly the joined src/ parts. Edit the parts in src/, then run: python3 tools/join-parts.py'); process.exit(1); }
const ver = (html.match(/LEGAL_VERSION = '(\d+\.\d+) \(([^)]*)\)'/) || [])[1];
need(ver && record.includes(`version in the shop:** ${ver}`), `Record does not state the current Terms/Privacy version ${ver}`);

// every browser suite and every assistant source file is described
for (const f of fs.readdirSync(path.join(SRC, 'tests')).filter(f => /\.cjs$/.test(f))) need(record.includes(f), `Test suite ${f} is not listed in PROJECT_RECORD.md §6`);
for (const f of fs.readdirSync(path.join(SRC, 'wa-assistant/src'))) need(all.includes(f), `wa-assistant/src/${f} is not mentioned in the record or HOW-IT-WORKS`);
// every assistant tool is documented
const tools = [...read(path.join(SRC, 'wa-assistant/src/assistant.mjs')).matchAll(/name: '([a-z_]+)',\n\s+description/g)].map(m => m[1]);
for (const t of tools) need(how.includes(t), `Assistant tool ${t} is not documented in HOW-IT-WORKS/06`);
// every admin tab is documented
const tabs = [...html.matchAll(/data-tab="([a-z]+)" onclick="switchAdminTab/g)].map(m => m[1]);
const labels = { dashboard: 'Dashboard', home: 'Home Page', products: 'Products', categories: 'Categories', studio: 'Image Studio', drafts: 'Saved Drafts', orders: 'Orders', reviews: 'Reviews', whatsapp: 'WhatsApp Assistant', delivery: 'Delivery & Gifting', alerts: 'Stock Alerts', invoices: 'Invoices', customers: 'Customers', statements: 'Statements', coupons: 'Coupons', bundles: 'Bundles', ai: 'AI Helper', logs: 'Audit Logs', settings: 'Settings' };
for (const t of new Set(tabs)) need(!labels[t] || how.includes(labels[t]), `Admin tab "${t}" is not described in HOW-IT-WORKS/03`);

// shared code (PIN check, delivery dates, packing slip) must be identical in the source, the store and the server
for (const [name, mjs] of [['pincode-core', 'pincode.mjs'], ['slip-core', 'slip.mjs']]) {
  const core = read(path.join(SRC, `shared/${name}.js`)).trimEnd() + '\n';
  const m = html.match(new RegExp(`// <shared:${name}>\\n([\\s\\S]*?)// </shared:${name}>`));
  need(m && m[1] === core, `The copy of shared/${name}.js inside anitha-store.html is out of date: run python3 tools/sync-shared.py`);
  need(read(path.join(SRC, 'wa-assistant/src', mjs)).includes(core), `wa-assistant/src/${mjs} is out of date: run python3 tools/sync-shared.py`);
}
// freshness by date: the newest change-log entry must be on/after the day the code last changed
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const dates = [...record.matchAll(/^\*\*(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})/gm)].map(m => Date.UTC(+m[3], MON[m[2]], +m[1]));
const last = (record.match(/\*\*Last updated:\*\* (\d{1,2}) ([A-Z][a-z]{2}) (\d{4})/) || []);
const lastUpdated = last[1] ? Date.UTC(+last[3], MON[last[2]], +last[1]) : 0;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' || e.name === 'data' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = [path.join(SRC, 'anitha-store.html'), ...walk(path.join(SRC, 'wa-assistant')), ...fs.readdirSync(path.join(SRC, 'tests')).map(f => path.join(SRC, 'tests', f)), ...fs.readdirSync(path.join(SRC, 'shared')).map(f => path.join(SRC, 'shared', f)), path.join(SRC, 'PROJECT_RECORD.md').replace('PROJECT_RECORD.md', 'wa-assistant/knowledge/persona.md')];
const newest = Math.max(...files.map(f => fs.statSync(f).mtimeMs)), day = t => Math.floor((t + 330 * 60000) / 864e5) * 864e5;
need(dates.length && Math.max(...dates) >= day(newest), `Newest Change Log entry (${new Date(Math.max(...dates)).toISOString().slice(0, 10)}) is older than the last code change (${new Date(day(newest)).toISOString().slice(0, 10)}): add an entry`);
need(lastUpdated >= day(newest), '"Last updated" in PROJECT_RECORD.md is older than the last code change');

if (process.argv.includes('--run')) {
  const out = cp.spawnSync('npm', ['test'], { cwd: path.join(SRC, 'wa-assistant'), encoding: 'utf8' }).stdout || '';
  const n = (out.match(/(\d+)\/(\d+) passed/) || [])[2];
  need(n && record.includes(`${n} automated checks`), `Record says a different server test count than the real one (${n})`);
  need(/ALL PASSED/.test(out), 'Server tests are not all passing');
}
if (problems.length) { console.error('RECORD IS OUT OF DATE:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('Record check OK: record and HOW-IT-WORKS match the code (Terms v' + ver + ', ' + tools.length + ' assistant tools, ' + new Set(tabs).size + ' admin tabs).');
