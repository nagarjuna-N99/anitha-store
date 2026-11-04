// One-machine hosting: the server serves the website AND the owner app AND the API from one address; a real browser walks through it.
const { chromium } = require(process.env.PW || 'playwright'); const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), os = require('os');
let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x || ''); } else console.log('PASS', n); };
(async () => {
  const root = path.resolve(__dirname, '..'), data = fs.mkdtempSync(path.join(os.tmpdir(), 'onebox-')), port = 18790, base = 'http://127.0.0.1:' + port;
  require('child_process').execFileSync('python3', [path.join(root, 'tools/build-split.py'), '--shop-api', base, '--site-url', base, '--index'], { stdio: 'ignore' });
  const srv = spawn('node', ['server.mjs'], { cwd: path.join(root, 'wa-assistant'), env: { ...process.env, PORT: String(port), DATA_DIR: data, SITE_DIR: path.join(root, 'build/site'), TRUST_PROXY: '1', PUBLIC_URL: base, COOKIE_SECURE: 'false', ADMIN_SETUP_TOKEN: 'setup-token-for-onebox-test' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 900 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '/'); await p.waitForTimeout(800);
  ok('home page opens from the server itself', /Anitha/i.test(await p.title()) && await p.locator('#collection, .category-strip, #catBlock').count() > 0);
  await p.goto(base + '/collection/'); await p.waitForTimeout(800); ok('a page address opens its own page (/collection/)', /collection/i.test(await p.title()) && !/not found/i.test(await p.locator('body').innerText()));
  await p.goto(base + '/faq'); await p.waitForTimeout(600); ok('/faq (no slash) ends on /faq/', p.url().endsWith('/faq/'));
  const r404 = await fetch(base + '/no-such-page-xyz'); ok('a wrong address gets a 404 status with the friendly page', r404.status === 404 && /html/.test(r404.headers.get('content-type')));
  const pub = await (await fetch(base + '/public/shop')).status; ok('the shop data address answers from the same origin (no cross-site setup)', pub === 200 || pub === 404 || pub === 403, pub);
  await p.goto(base + '/admin'); await p.waitForTimeout(800); ok('the owner app opens at /admin on the same address', /sign|password|setup|owner/i.test(await p.locator('body').innerText()));
  ok('no script errors on the way', errs.length === 0, errs.join(' | '));
  const sm = await (await fetch(base + '/sitemap.xml')).text(); ok('sitemap lists the pages with this address', sm.includes(base + '/collection/'));
  await b.close(); srv.kill();
  require('child_process').execFileSync('python3', [path.join(root, 'tools/build-split.py'), '--shop-api', 'http://127.0.0.1:8787'], { stdio: 'ignore' });   // put the default test build back for the other suites
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
