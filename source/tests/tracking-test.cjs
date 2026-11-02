// The public website counts visits anonymously: page views, saree views, WhatsApp taps, carts and checkouts.
const { chromium } = require(process.env.PW || 'playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); let ok = true; const t = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) ok = false; };
  const run = async (file, init, fn) => { const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }), p = await ctx.newPage(), hits = []; await p.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); }); if (init) await p.addInitScript(init);
    await ctx.route('**/public/hit', async r => { const rq = r.request(); hits.push({ body: JSON.parse(rq.postData() || '{}'), ct: rq.headers()['content-type'], cred: rq.headers()['cookie'] || '' }); await r.fulfill({ status: 204 }); });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)(?!localhost)/, r => r.abort()); p.on('dialog', d => d.accept('1234')); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(__dirname, file)); await p.waitForTimeout(900); await fn(p, hits); await ctx.close(); return errs; };
  // 1. the public site build
  let errs = await run('../build/site/index.html', null, async (p, hits) => {
    t('site: the first page load counts one home page view (plain text body, so no browser pre-check is needed)', hits.length >= 1 && hits[0].body.t === 'view' && hits[0].body.p === 'home' && hits[0].ct === 'text/plain');
    await p.evaluate(() => navigateTo('shop')); await p.waitForTimeout(300); t('site: going to the shop counts a shop view', hits.some(h => h.body.t === 'view' && h.body.p === 'shop'));
    const pid = await p.evaluate(() => db.products.find(x => x.stock > 0).id); await p.evaluate(id => openProductDetail(id), pid); await p.waitForTimeout(300); t('site: opening a saree counts a product page view and that saree', hits.some(h => h.body.t === 'view' && h.body.p === 'product') && hits.some(h => h.body.t === 'product' && h.body.id === pid));
    await p.evaluate(id => addToCart(id), pid); await p.waitForTimeout(300); t('site: add to cart is counted', hits.some(h => h.body.t === 'cart' && h.body.id === pid));
    await p.evaluate(() => { cart = [{ id: db.products.find(x => x.stock > 0).id, qty: 1 }]; saveCart(); try { openCheckout(); } catch (e) {} }); await p.waitForTimeout(300); t('site: opening checkout is counted', hits.some(h => h.body.t === 'checkout'));
    await p.evaluate(() => { const a = document.createElement('a'); a.href = 'https://wa.me/919999999999?text=hi'; a.target = '_self'; a.id = 'tw'; a.textContent = 'wa'; a.onclick = e => e.preventDefault(); document.body.appendChild(a); }); await p.evaluate(() => { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); }); await p.click('#tw'); await p.waitForTimeout(300); t('site: tapping a WhatsApp link is counted', hits.some(h => h.body.t === 'wa'));
    t('site: only counts are sent: no name, phone, e-mail or address, and no cookies', hits.every(h => Object.keys(h.body).every(k => ['t', 'p', 'id', 'r', 'u', 'm'].includes(k)) && !h.cred));
    const n = hits.length; await p.evaluate(() => { navigateTo('home'); navigateTo('home'); }); await p.waitForTimeout(300); t('site: the same page twice in a moment is counted once', hits.length - n <= 1);
    t('site: the Privacy page tells visitors about the anonymous counting', await p.evaluate(() => { navigateTo('privacy'); return /Visit counts/.test(document.getElementById('page-privacy').innerText) && /Do Not Track/.test(document.getElementById('page-privacy').innerText); })); });
  t('site: no JS errors', errs.length === 0); if (errs.length) console.log(errs);
  // 2. Do Not Track: nothing is sent
  errs = await run('../build/site/index.html', () => { Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }); }, async (p, hits) => { await p.evaluate(() => { navigateTo('shop'); openProductDetail(db.products[0].id); }); await p.waitForTimeout(400); t('Do Not Track: nothing at all is sent', hits.length === 0); });
  // 3. the all-in-one demo and the owner app never count
  errs = await run('../anitha-store.html', null, async (p, hits) => { await p.evaluate(() => { navigateTo('shop'); openProductDetail(db.products[0].id); }); await p.waitForTimeout(400); t('demo build: the all-in-one demo never counts', hits.length === 0); });
  console.log(ok ? 'ALL PASSED' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1);
})();
