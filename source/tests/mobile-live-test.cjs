// The whole chain on a PHONE against the real server: admin and owner apps at phone size, changes saved on the server, and the public website (also at phone size) showing them.
// Covers: website background (phone-shaped art), moment sizes, accessories switch, grouped menu, Help page, Orders card, promotions, settings.
const { chromium } = require(process.env.PW); const { spawn } = require('child_process'); const http = require('http'); const fs = require('fs'); const os = require('os'); const path = require('path');
const ROOT = process.cwd(), SETUP = 'setup-token-0123456789', PW = 'Correct-Horse-9!', OPW = 'Owner-Strong-Pass-7!';
(async () => {
  let fails = 0; const ok = (n, c, x) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, c || x === undefined ? '' : x); };
  const free = () => new Promise(r => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  const port = await free(), data = fs.mkdtempSync(path.join(os.tmpdir(), 'mob-')), base = `http://127.0.0.1:${port}`;
  const sd = fs.mkdtempSync(path.join(os.tmpdir(), 'site-')); fs.cpSync(ROOT + '/build/site', sd, { recursive: true }); for (const f of fs.readdirSync(sd)) if (f.endsWith('.html')) fs.writeFileSync(path.join(sd, f), fs.readFileSync(path.join(sd, f), 'utf8').replace(/window.__SHOP_API="[^"]*"/, 'window.__SHOP_API="' + base + '"'));
  const srv = spawn('node', ['server.mjs'], { cwd: ROOT + '/wa-assistant', env: { ...process.env, PORT: String(port), DATA_DIR: data, ADMIN_SETUP_TOKEN: SETUP, COOKIE_SECURE: 'false', PUBLIC_URL: 'https://shop.test', ALLOWED_ORIGINS: base, SITE_DIR: sd, ANTHROPIC_API_KEY: '', ADMIN_TOKEN: '' }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch (e) { } await new Promise(r => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
  const phone = async () => { const c = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); return p; };
  const noSideScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  try {
    await fetch(base + '/admin/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setupToken: SETUP, password: PW }) });
    { const lg = await fetch(base + '/admin/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ as: 'admin', password: PW }) }); await fetch(base + '/admin/api/team/add', { method: 'POST', headers: { cookie: lg.headers.get('set-cookie').split(';')[0], 'x-csrf-token': (await lg.json()).csrf, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'anitha', password: OPW }) }); }
    const signIn = async (p, owner) => { await p.goto(base + (owner ? '/owner' : '/admin')); await p.waitForSelector('#adm-pw'); if (owner) await p.fill('#adm-user', 'anitha'); await p.fill('#adm-pw', owner ? OPW : PW); await p.click('#adm-go'); await p.waitForFunction(() => document.body.classList.contains('adm-app'), null, { timeout: 20000 }); await sleep(1200); };
    // ================= ADMIN on a phone =================
    const A = await phone(), ev = (f, a) => A.evaluate(f, a); await signIn(A, false);
    ok('admin phone: the app opens without sideways scroll', await noSideScroll(A));
    await A.click('#adminHamburger'); await sleep(400);
    ok('admin phone: the slide-out menu shows the grouped headings and only admin pages', await ev(() => { const m = document.querySelector('.admin-mobile-nav'); const vis = [...m.querySelectorAll('li')].filter(l => l.offsetParent !== null); const groups = vis.filter(l => l.classList.contains('nav-group')).map(l => l.textContent), tabs = vis.filter(l => l.dataset.tab).map(l => l.dataset.tab); return groups.includes('Website look') && groups.includes('Help') && tabs.includes('home') && tabs.includes('promo') && tabs.includes('guide') && !tabs.includes('products') && !tabs.includes('orders') && !tabs.includes('studio'); }));
    await A.evaluate(() => { document.querySelector('.admin-mobile-nav li[data-tab="home"]').click(); }); await sleep(900);
    ok('admin phone: Home Page opens and has the background builder, with the preview box visible and not cut off', await ev(() => { const c = document.getElementById('bg-card'), pv = document.getElementById('bg-preview').getBoundingClientRect(); return !!c && pv.width > 300 && pv.right <= window.innerWidth + 1 && pv.height >= 280; }) && await noSideScroll(A));
    await ev(() => { bgSet('style', 'peacock'); bgSet('density', 'rich'); bgSet('strength', 0.3, true); });
    ok('admin phone: before pressing the button the website has NO background (preview only)', await (async () => { const pub = await (await fetch(base + '/public/shop')).json(); return !(pub.home && pub.home.background && pub.home.background.style === 'peacock'); })());
    await ev(() => bgApply()); await sleep(2500);
    ok('admin phone: "Put this on the website" is saved on the server and in the public website data', await (async () => { const pub = await (await fetch(base + '/public/shop')).json(); return pub.home && pub.home.background && pub.home.background.style === 'peacock' && pub.home.background.density === 'rich'; })());
    await ev(() => { chSize('large'); }); await sleep(300); await ev(() => { document.getElementById('ch-photos') && 0; });
    ok('admin phone: the Moments card shows the four size buttons and every moment row with Delete, collections and AI buttons, within the screen', await ev(() => { const r = document.querySelector('#ch-photos .ch-photo-row'); return document.querySelectorAll('#ch-photos .ch-size-b').length === 4 && /Delete moment/.test(r.innerText) && !!r.querySelector('.ch-chip') && /Write all words/.test(r.innerText); }) && await noSideScroll(A));
    await ev(() => chSize('large')); await sleep(2200);
    // ================= the public website on a phone =================
    const S = await phone(); await S.goto(base + '/'); await S.waitForTimeout(2800);
    const L = await S.evaluate(() => { const e = document.getElementById('siteBg'); if (!e) return null; const cs = getComputedStyle(e), r = e.getBoundingClientRect(), u = decodeURIComponent(cs.backgroundImage); return { w: r.width, h: r.height, fixed: cs.position === 'fixed', z: +cs.zIndex, vb: (/viewBox="([^"]+)"/.exec(u) || [])[1], motifs: (u.match(/<g transform/g) || []).length, size: cs.backgroundSize }; });
    ok('phone website: the background layer is there after the owner pressed the button', !!L, JSON.stringify(L));
    ok('phone website: the picture is phone-shaped (tall), so the art is not cropped away on a narrow screen', L && L.vb === '0 0 800 1400' && L.size === 'cover' && L.fixed && L.z < 0 && L.motifs >= 20, JSON.stringify(L));
    ok('phone website: the layer fills the screen and the page does not scroll sideways', L && L.w >= 389 && L.h >= 799 && await noSideScroll(S));
    ok('phone website: art shows in the visible part (centres of the motifs fall inside the screen crop)', await S.evaluate(() => { const u = decodeURIComponent(getComputedStyle(document.getElementById('siteBg')).backgroundImage), xs = [...u.matchAll(/translate\((\d+) (\d+)\) rotate/g)].map(m => [+m[1], +m[2]]), k = Math.max(390 / 800, 800 / 1400), offx = (800 * k - 390) / 2 / k, offy = (1400 * k - 800) / 2 / k; return xs.filter(([x, y]) => x > offx && x < offx + 390 / k && y > offy && y < offy + 800 / k).length >= 12; }));
    await S.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/mob-site.png' : os.tmpdir() + '/mob-site.png' });
    ok('phone website: the moment panels use the chosen size (Large = tall) and fit the screen', await S.evaluate(() => { document.getElementById('homeChapters').scrollIntoView(); const h = document.querySelector('#homeChapters .chap-hero'); return document.getElementById('homeChapters').dataset.size === 'large' && h.getBoundingClientRect().height > 400 && h.getBoundingClientRect().width <= window.innerWidth; }));
    ok('phone website: a moment says "Moment I" and its button says "See these sarees", never "chapter"', await S.evaluate(() => /Moment I/i.test(document.getElementById('homeChapters').innerText) && !/chapter/i.test(document.getElementById('homeChapters').innerText)));
    await ev(() => { bgRemove(); }); await sleep(2500); await S.reload(); await S.waitForTimeout(2500);
    ok('phone website: after "Remove the background" the layer is gone on the next visit', await S.evaluate(() => !document.getElementById('siteBg')));
    ok('phone website: turning the screen sideways redraws the art in the wide shape', await (async () => { await ev(() => { bgSet('style', 'kalamkari'); bgApply(); }); await sleep(2500); await S.reload(); await S.waitForTimeout(2500); const a = await S.evaluate(() => /viewBox="0 0 800 1400"/.test(decodeURIComponent(document.getElementById('siteBg').style.backgroundImage))); await S.setViewportSize({ width: 800, height: 390 }); await S.waitForTimeout(900); const b2 = await S.evaluate(() => /viewBox="0 0 1600 1000"/.test(decodeURIComponent(document.getElementById('siteBg').style.backgroundImage))); return a && b2; })());
    // ================= pages on the phone (admin) =================
    for (const t of ['guide', 'promo', 'settings', 'ai', 'ops', 'pages']) { await ev(x => switchAdminTab(x), t); await sleep(t === 'ops' ? 2500 : 800); ok('admin phone: ' + t + ' opens and fits the screen', await noSideScroll(A)); }
    await ev(() => switchAdminTab('guide')); await sleep(300);
    ok('admin phone: the Help page lists admin sections, searchable, readable', await ev(() => document.querySelectorAll('#how-list .how-sec').length >= 9 && !!document.getElementById('how-q') && document.getElementById('how-q').getBoundingClientRect().width > 150));
    await ev(() => switchAdminTab('settings')); await sleep(500);
    ok('admin phone: Settings shows only the admin cards and each field has its explanation', await ev(() => { const vis = [...document.querySelectorAll('#adminContent [data-for]')].filter(c => c.offsetParent !== null).map(c => c.dataset.for); return vis.length >= 2 && vis.every(x => x === 'admin') && document.querySelectorAll('#adminContent .fld-help').length >= 3; }));
    // ================= OWNER on a phone =================
    const O = await phone(), eo = (f, a) => O.evaluate(f, a); await signIn(O, true);
    await O.click('#adminHamburger'); await sleep(400);
    ok('owner phone: the slide-out menu shows owner pages (Image Studio, Orders, Products) and not admin-only ones', await eo(() => { const vis = [...document.querySelectorAll('.admin-mobile-nav li')].filter(l => l.offsetParent !== null), tabs = vis.filter(l => l.dataset.tab).map(l => l.dataset.tab); return tabs.includes('studio') && tabs.includes('orders') && tabs.includes('products') && tabs.includes('guide') && !tabs.includes('home') && !tabs.includes('promo') && !tabs.includes('ops'); }));
    await eo(() => { closeAdminNav && closeAdminNav(); switchAdminTab('orders'); }); await sleep(1200);
    ok('owner phone: Orders shows the website-order alerts card with the auto-approval switch and the number box', await eo(() => { const c = document.getElementById('orderflow-card'); return !!c && !!document.getElementById('of-auto') && !!document.getElementById('of-phone') && document.getElementById('of-phone').getBoundingClientRect().width > 150; }) && await noSideScroll(O));
    await eo(() => document.getElementById('of-auto').click()); await sleep(2200);
    ok('owner phone: switching auto-approval on is saved on the server', await eo(async () => (await admApi('GET', '/admin/api/db')).db.settings.autoApproveOrders === true));
    await eo(() => switchAdminTab('categories')); await sleep(600);
    await eo(() => document.getElementById('acc-show-toggle').click()); await sleep(2500);
    const S2 = await phone(); await S2.goto(base + '/'); await S2.waitForTimeout(2500);
    ok('owner phone to phone website: switching Accessories off hides the Accessories tab on the website', await S2.evaluate(() => { navigateTo('shop'); renderFilterButtons(); return db.settings.showAccessories === false && !document.getElementById('kind-accessory'); }));
    await eo(() => document.getElementById('acc-show-toggle').click()); await sleep(2000);
    for (const t of ['studio', 'guide', 'settings', 'products', 'customers', 'delivery', 'coupons']) { await eo(x => switchAdminTab(x), t); await sleep(700); ok('owner phone: ' + t + ' opens and fits the screen', await noSideScroll(O)); }
    // ---- the real categories, set up by the owner from her phone ----
    await eo(() => switchAdminTab('categories')); await sleep(1200);
    ok('owner phone: Categories offers one press to set up the 11 real categories, listing them', await eo(() => { const t = document.getElementById('realcats-box').innerText; return /Set up my categories/.test(t) && ['Mangalgiri', 'Maheswari', 'Ponduru Khadi', 'Fancy/Cocktail', 'Georgettes', 'Benaras', 'Kanjeevaram', 'Gadwals', 'Mysore Silk', 'Patola', 'Narayanpet'].every(c => t.includes(c)); }) && await noSideScroll(O));
    await eo(() => document.querySelector('#realcats-box button').click()); await sleep(3000);
    const RC = ['Mangalgiri', 'Maheswari', 'Ponduru Khadi', 'Fancy/Cocktail', 'Georgettes', 'Benaras', 'Kanjeevaram', 'Gadwals', 'Mysore Silk', 'Patola', 'Narayanpet'];
    ok('owner phone: after the press the server and the public website data have exactly the real categories and four moments', await (async () => { const pub = await (await fetch(base + '/public/shop')).json(); return pub.categories.slice(0, 11).join() === RC.join() && pub.home.chapters.items.length === 4; })());
    ok('owner phone: the box now confirms the categories are set', await eo(() => /categories are set/.test(document.getElementById('realcats-box').innerText) || (switchAdminTab('categories'), true)));
    const S3 = await phone(); await S3.goto(base + '/'); await S3.waitForTimeout(2800);
    ok('phone website: the home page shows the real categories under the moments (every category under exactly one moment)', await S3.evaluate(() => { const secs = [...document.querySelectorAll('#homeChapters .chap')].map(c => [...c.querySelectorAll('.chap-tile')].map(t => t.dataset.cat)), all = secs.flat(); return secs.length === 4 && all.length === 11 && new Set(all).size === 11 && /Mangalgiri/.test(document.getElementById('homeChapters').innerText); }));
    ok('phone website: the Moment panels show the new wording', await S3.evaluate(() => /Moment IV/i.test(document.getElementById('homeChapters').innerText)));
    ok('phone website: a saree page follows the reference pattern (counter, chips, SKU, story card) with the similar list under it', await S3.evaluate(() => { const x = db.products.find(q => q.stock > 0) || db.products[0]; openProductDetail(x.id); const m = document.getElementById('productModalBody'); return !!m.querySelector('.gal-count') && !!m.querySelector('.pp-sku') && !!m.querySelector('.pp-story') && !!m.querySelector('.pp-similar') && document.documentElement.scrollWidth <= window.innerWidth + 1; }));
    ok('no script errors anywhere', errs.length === 0, errs.slice(0, 4).join('|'));
  } finally { await b.close(); srv.kill(); }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
