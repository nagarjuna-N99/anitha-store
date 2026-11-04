// Every page of the public website has its own web address. Serves the built site like GitHub Pages does (folders, then 404.html).
const { chromium } = require(process.env.PW);
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), dir = path.join(root, 'build', 'site'), BASE = '/anitha-store/';
(async () => {
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (!u.startsWith(BASE)) { r.writeHead(404); return r.end('no'); }
    let rel = u.slice(BASE.length), f = path.join(dir, rel);
    if (rel === '' || (fs.existsSync(f) && fs.statSync(f).isDirectory())) { if (rel && !rel.endsWith('/')) { r.writeHead(301, { Location: u + '/' }); return r.end(); } f = path.join(f, 'index.html'); }
    if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.writeHead(200, { 'content-type': f.endsWith('.xml') ? 'application/xml' : 'text/html; charset=utf-8' }); return r.end(fs.readFileSync(f)); }
    r.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); r.end(fs.readFileSync(path.join(dir, '404.html')));
  });
  await new Promise(s => srv.listen(0, '127.0.0.1', s)); const port = srv.address().port, ORIGIN = 'http://127.0.0.1:' + port;
  cp.execFileSync('python3', [path.join(root, 'tools', 'build-split.py'), '--site-url', ORIGIN + '/anitha-store', '--index'], { stdio: 'pipe' });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }), ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await ctx.newPage();
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  const go = async u => { await p.goto(ORIGIN + BASE + u); await sleep(600); };
  const state = () => ev(() => ({ path: location.pathname, page: (document.querySelector('.page.active') || {}).id, title: document.title, canon: (document.querySelector('link[rel=canonical]') || {}).href }));
  // ---- the files ----
  for (const [pg, t] of [['collection', 'Handloom Sarees Collection'], ['saree-care', 'Saree Care Guide'], ['journal', 'Journal'], ['faq', 'Questions and Answers'], ['terms', 'Terms &amp; Conditions'], ['privacy', 'Privacy Policy']]) {
    const h = fs.readFileSync(path.join(dir, pg, 'index.html'), 'utf8');
    ok(`/${pg}/ is a real page file with its own title and canonical address`, h.includes(`<title>${t} | Anitha Pemmasani</title>`) && h.includes(`<link rel="canonical" href="${ORIGIN}/anitha-store/${pg}/">`));
  }
  const sm = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'); ok('sitemap.xml lists the home page and every public page', (sm.match(/<loc>/g) || []).length === 7 && sm.includes(`${ORIGIN}/anitha-store/collection/`));
  // ---- opening an address directly ----
  await go('collection/'); let s = await state(); ok('opening /collection/ shows the collection page with its title and address', s.page === 'page-shop' && s.title === 'Handloom Sarees Collection | Anitha Pemmasani' && s.path === BASE + 'collection/' && s.canon === ORIGIN + BASE + 'collection/');
  await go('saree-care/'); s = await state(); ok('opening /saree-care/ shows Saree Care', s.page === 'page-care' && /Saree Care/.test(s.title));
  await go('the-atelier/'); s = await state(); ok('the removed /the-atelier/ address opens the home page, not a broken page', s.page === 'page-home', JSON.stringify(s));
  await go('terms/'); s = await state(); ok('opening /terms/ shows the Terms', s.page === 'page-terms' && /Terms/.test(s.title) && s.path === BASE + 'terms/');
  // ---- moving around ----
  await go(''); await ev(() => { window.__marker = 'same page'; });
  const hrefs = await ev(() => [...document.querySelectorAll('nav .nav-links a')].map(a => a.getAttribute('href')));
  ok('the menu links are real links to real addresses', hrefs.includes(BASE) && hrefs.includes(BASE + 'collection/') && hrefs.includes(BASE + 'saree-care/'));
  await p.click('nav .nav-links a:has-text("Collection")'); await sleep(300); s = await state();
  ok('clicking Collection changes the address and shows the page without reloading', s.path === BASE + 'collection/' && s.page === 'page-shop' && await ev(() => window.__marker === 'same page'));
  await p.click('nav .nav-links a:has-text("Saree Care")'); await sleep(300); s = await state(); ok('clicking Saree Care gives /saree-care/', s.path === BASE + 'saree-care/' && s.page === 'page-care');
  await p.goBack(); await sleep(400); s = await state(); ok('the Back button returns to /collection/', s.path === BASE + 'collection/' && s.page === 'page-shop');
  await p.goForward(); await sleep(400); s = await state(); ok('the Forward button returns to /saree-care/', s.path === BASE + 'saree-care/' && s.page === 'page-care');
  await p.click('.nav-brand'); await sleep(300); s = await state(); ok('the shop name goes Home (/)', s.path === BASE && s.page === 'page-home');
  // ---- a saree ----
  const slug = await ev(() => db.products[0].slug);
  await ev(() => openProductDetail(db.products[0].id)); await sleep(300); s = await state();
  ok('opening a saree gives it its own address /product/<name>/', s.path === `${BASE}product/${slug}/` && s.canon === `${ORIGIN}${BASE}product/${slug}/` && await ev(() => document.getElementById('productModal').classList.contains('active')));
  await go(`product/${slug}/`); s = await state();
  ok('opening that saree address directly opens the saree', await ev(() => document.getElementById('productModal').classList.contains('active')) && s.path === `${BASE}product/${slug}/`);
  await ev(() => closeModal('productModal')); await sleep(200); s = await state(); ok('closing the saree goes back to its page address', s.path === BASE + 'collection/');
  // ---- old links and unknown addresses ----
  await go('#/terms'); s = await state(); ok('an old link (#/terms) still works and becomes /terms/', s.page === 'page-terms' && s.path === BASE + 'terms/');
  await go('#/faq'); s = await state(); ok('an old link (#/faq) becomes /faq/', s.page === 'page-faq' && s.path === BASE + 'faq/');
  await go(`#/product/${slug}`); ok('an old saree link (#/product/<name>) still opens the saree', await ev(() => document.getElementById('productModal').classList.contains('active')) && (await state()).path === `${BASE}product/${slug}/`);
  await go('no-such-page/'); s = await state(); ok('an unknown address opens the home page and tidies the address', s.page === 'page-home' && s.path === BASE || (console.log(s), false));
  ok('no JavaScript errors', errs.length === 0 || (console.log(errs), false));
  await b.close(); srv.close();
  cp.execFileSync('python3', [path.join(root, 'tools', 'build-split.py'), '--shop-api', 'http://127.0.0.1:8787'], { stdio: 'pipe' });   // put the normal test build back for the other suites
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
