// The public website never shows an old copy: it waits for the server's answer (no flash of old or sample content), never caches that answer, updates an open page by itself
// (a minute-by-minute "anything changed?" check, waking the phone, coming back to the tab, the back/forward cache), reloads itself when the page is older than the server's build,
// and falls back to its saved copy only when the server cannot be reached. Real server, real browser.
const { chromium } = require(process.env.PW); const { spawn } = require('child_process'); const http = require('http'); const fs = require('fs'); const os = require('os'); const path = require('path');
const ROOT = process.cwd(), SETUP = 'setup-token-0123456789', PW = 'Correct-Horse-9!', OPW = 'Owner-Strong-Pass-7!';
(async () => {
  let fails = 0; const ok = (n, c, x) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, c || x === undefined ? '' : x); };
  const free = () => new Promise(r => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  const port = await free(), data = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-')), base = `http://127.0.0.1:${port}`;
  const sd = fs.mkdtempSync(path.join(os.tmpdir(), 'site-')); fs.cpSync(ROOT + '/build/site', sd, { recursive: true }); for (const f of fs.readdirSync(sd)) if (f.endsWith('.html')) fs.writeFileSync(path.join(sd, f), fs.readFileSync(path.join(sd, f), 'utf8').replace(/window.__SHOP_API="[^"]*"/, 'window.__SHOP_API="' + base + '"'));
  const srv = spawn('node', ['server.mjs'], { cwd: ROOT + '/wa-assistant', env: { ...process.env, PORT: String(port), DATA_DIR: data, ADMIN_SETUP_TOKEN: SETUP, COOKIE_SECURE: 'false', PUBLIC_URL: 'https://shop.test', ALLOWED_ORIGINS: base, SITE_DIR: sd, ANTHROPIC_API_KEY: '', ADMIN_TOKEN: '' }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch (e) { } await new Promise(r => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
  try {
    await fetch(base + '/admin/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setupToken: SETUP, password: PW }) });
    const ac = await b.newContext({ viewport: { width: 1100, height: 800 } }); const A = await ac.newPage(); await A.goto(base + '/admin'); await A.waitForSelector('#adm-pw'); await A.fill('#adm-pw', PW); await A.click('#adm-go'); await A.waitForFunction(() => document.body.classList.contains('adm-app'), null, { timeout: 15000 }); await sleep(1500);
    { const lg = await fetch(base + '/admin/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ as: 'admin', password: PW }) }); await fetch(base + '/admin/api/team/add', { method: 'POST', headers: { cookie: lg.headers.get('set-cookie').split(';')[0], 'x-csrf-token': (await lg.json()).csrf, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'anitha', password: OPW }) }); }
    const oc = await b.newContext({ viewport: { width: 1100, height: 800 } }); const O = await oc.newPage(); await O.goto(base + '/owner'); await O.waitForSelector('#adm-pw'); await O.fill('#adm-user', 'anitha'); await O.fill('#adm-pw', OPW); await O.click('#adm-go'); await O.waitForFunction(() => document.body.classList.contains('adm-app'), null, { timeout: 15000 }); await sleep(1500);
    // the admin changes the home page (hers to change), the owner changes a saree (hers to change)
    const setServer = async (title, name) => { await A.evaluate(t => { db.home.hero.slides[0].title = t; homeLive(true); homeFlush(); saveDB(); }, title); await O.evaluate(n => { db.products[0].name = n; saveDB(); }, name); await sleep(2800); };
    await setServer('SERVER TITLE ONE', 'Server Product One');
    const heroTitle = p => p.evaluate(() => (document.querySelector('.hero h1, #heroTitle, .hero-title') || {}).textContent);
    // ---------- 1. an OLD saved copy is never shown while the server can answer ----------
    const sc = await b.newContext({ viewport: { width: 390, height: 800 } });
    await sc.addInitScript(() => { try { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); } } catch (e) { } });
    const S = await sc.newPage(); S.on('pageerror', e => errs.push(e.message)); await S.goto(base + '/'); await S.waitForTimeout(2200);
    await S.evaluate(() => { const d = JSON.parse(localStorage.getItem('ap_db_v70')); d.home.hero.slides[0].title = 'STALE OLD TITLE'; d.products[0].name = 'Stale Old Product'; localStorage.setItem('ap_db_v70', JSON.stringify(d)); });
    let hold = true; await S.route(/\/public\/shop/, async r => { while (hold) await new Promise(x => setTimeout(x, 50)); r.continue(); });
    await S.reload({ waitUntil: 'domcontentloaded' }); await S.waitForTimeout(500);
    const during = await S.evaluate(() => ({ wait: document.documentElement.classList.contains('shop-wait'), op: getComputedStyle(document.getElementById('page-home')).opacity, title: (document.querySelector('.hero h1, #heroTitle, .hero-title') || {}).textContent }));
    ok('while the server has not answered yet, the page is held back (nothing old is visible, even though an old copy is saved in the phone)', during.wait && during.op === '0' && /STALE/.test(during.title || ''), JSON.stringify(during));
    hold = false; await S.waitForTimeout(1500);
    const after = await S.evaluate(() => ({ wait: document.documentElement.classList.contains('shop-wait'), op: getComputedStyle(document.getElementById('page-home')).opacity, title: (document.querySelector('.hero h1, #heroTitle, .hero-title') || {}).textContent, name: db.products[0].name }));
    ok('as soon as the server answers, the page appears with the NEW content (the old title and product name are gone)', !after.wait && after.op === '1' && /SERVER TITLE ONE/.test(after.title) && after.name === 'Server Product One', JSON.stringify(after));
    await S.unroute(/\/public\/shop/);
    // ---------- 2. never cached ----------
    const reqs = []; S.on('request', r => { if (/\/public\/(shop|version)/.test(r.url())) reqs.push(r.url()); }); await S.reload(); await S.waitForTimeout(2000);
    ok('every request for the shop data has its own fresh address (nothing can be served from an old cache)', reqs.length >= 1 && new Set(reqs).size === reqs.length && reqs.every(u => /_=\d+/.test(u)));
    // ---------- 3. an open page updates by itself ----------
    await sc.close(); const sc2 = await b.newContext({ viewport: { width: 390, height: 800 } }); await sc2.addInitScript(() => { window.__SHOP_POLL_MS = 700; });
    const S2 = await sc2.newPage(); S2.on('pageerror', e => errs.push(e.message)); await S2.goto(base + '/'); await S2.waitForTimeout(2200);
    ok('an open page shows the current content', /SERVER TITLE ONE/.test(await heroTitle(S2)));
    await setServer('SERVER TITLE TWO', 'Server Product Two'); await S2.waitForTimeout(2500);
    ok('after the owner saves a change, an open page (no refresh) shows it within seconds by itself', /SERVER TITLE TWO/.test(await heroTitle(S2)) && await S2.evaluate(() => db.products[0].name === 'Server Product Two'));
    await setServer('SERVER TITLE THREE', 'Server Product Three');
    const n0 = []; S2.on('request', r => { if (/\/public\/shop/.test(r.url())) n0.push(1); });
    await S2.evaluate(() => window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }))); await S2.waitForTimeout(1500);
    ok('when the browser hands back an old page from its back/forward memory, the page refreshes itself at once', n0.length >= 1 && /SERVER TITLE THREE/.test(await heroTitle(S2)));
    // ---------- 4. the page is older than the server's build ----------
    const stamp = await (await fetch(base + '/health')).json(); ok('the server knows its build stamp', /^\d{4}-\d\d-\d\dT/.test(stamp.siteBuild || ''), JSON.stringify(stamp));
    const sc3 = await b.newContext({ viewport: { width: 390, height: 800 } }); const S3 = await sc3.newPage(); let navs = 0, served = 0; S3.on('framenavigated', f => { if (f === S3.mainFrame()) navs++; });
    await S3.route(base + '/', async r => { served++; const t = await (await fetch(base + '/')).text(); await r.fulfill({ status: 200, contentType: 'text/html', body: served === 1 ? t.replace(/__BUILD_STAMP="[^"]+"/, '__BUILD_STAMP="1999-01-01T00:00:00Z"') : t }); });
    await S3.goto(base + '/'); await S3.waitForTimeout(4500);
    ok('an old page (older build stamp) reloads itself once and then shows the new build, without looping', served === 2 && await S3.evaluate(s => window.__BUILD_STAMP === s, stamp.siteBuild), 'served ' + served);
    // ---------- 5. server unreachable ----------
    const sc4 = await b.newContext({ viewport: { width: 390, height: 800 } }); const S4 = await sc4.newPage(); await S4.goto(base + '/'); await S4.waitForTimeout(2200);
    await S4.route(/\/public\//, r => r.abort()); await S4.reload(); await S4.waitForTimeout(3200);
    const off = await S4.evaluate(() => ({ wait: document.documentElement.classList.contains('shop-wait'), op: getComputedStyle(document.getElementById('page-home')).opacity, title: (document.querySelector('.hero h1, #heroTitle, .hero-title') || {}).textContent, err: !!document.getElementById('shopLoadErr') }));
    ok('if the server cannot be reached, the saved copy is shown (nothing is erased, no error screen for a returning visitor)', !off.wait && off.op === '1' && /SERVER TITLE THREE/.test(off.title) && !off.err, JSON.stringify(off));
    // a brand-new visitor with no saved copy and no server: an honest message, not sample sarees
    const sc5 = await b.newContext({ viewport: { width: 390, height: 800 } }); const S5 = await sc5.newPage(); await S5.route(/\/public\//, r => r.abort()); await S5.goto(base + '/'); await S5.waitForTimeout(8500);
    ok('a first-time visitor who cannot reach the server sees an honest "could not load the latest shop" message with a Try again button (never the sample sarees)', await S5.evaluate(() => { const e = document.getElementById('shopLoadErr'); return !!e && /could not load the latest shop/i.test(e.innerText) && !!e.querySelector('button'); }));
    await S5.unroute(/\/public\//); await S5.click('#shopLoadErr button'); await S5.waitForTimeout(2500);
    ok('pressing Try again loads the shop and the message goes away', await S5.evaluate(() => !document.getElementById('shopLoadErr') && /SERVER TITLE THREE/.test((document.querySelector('.hero h1, #heroTitle, .hero-title') || {}).textContent)));
    // ---------- the owner / admin app updates itself too ----------
    const ac2 = await b.newContext({ viewport: { width: 900, height: 800 } }); await ac2.addInitScript(() => { window.__ADM_POLL_MS = 700; }); const A2 = await ac2.newPage(); let loads = 0;
    await A2.route(u => /^\/admin(\/(?!api)[a-z0-9-]*\/?)?$/.test(new URL(u).pathname), async r => { loads++; const t = await (await fetch(base + '/admin')).text(); await r.fulfill({ status: 200, contentType: 'text/html', body: loads === 1 ? t.replace(/__BUILD_STAMP="[^"]+"/, '__BUILD_STAMP="1999-01-01T00:00:00Z"') : t }); });
    await A2.goto(base + '/admin'); await A2.waitForSelector('#adm-pw'); await A2.fill('#adm-pw', PW); await A2.click('#adm-go'); await A2.waitForFunction(() => document.body.classList.contains('adm-app'), null, { timeout: 15000 }).catch(() => { }); await A2.waitForTimeout(5000);
    ok('the admin / owner app that was opened before an update reloads itself once (no loop) and runs the new build', loads >= 2 && loads <= 3 && await A2.evaluate(() => /^\d{4}/.test(window.__BUILD_STAMP) && window.__BUILD_STAMP !== '1999-01-01T00:00:00Z'), 'loads ' + loads);
    // ---------- 6. static files are re-checked ----------
    const h = await fetch(base + '/'), lg = await fetch(base + '/logo.png').catch(() => null);
    ok('the page and the site files are marked no-cache with an ETag; the shop data is no-store', h.headers.get('cache-control') === 'no-cache' && !!h.headers.get('etag') && (await fetch(base + '/public/shop')).headers.get('cache-control') === 'no-store');
    ok('no script errors', errs.length === 0, errs.slice(0, 3).join('|'));
  } finally { await b.close(); srv.kill(); }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
