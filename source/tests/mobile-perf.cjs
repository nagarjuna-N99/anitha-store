// Phone speed check (limits are generous because the machine running the tests varies by +-30%; a real regression is several times slower): 4x slower CPU (a budget Android), 120 products. Reports long tasks, layout shift, slow actions, scroll smoothness.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.route(/^https?:\/\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><rect width='600' height='750' fill='#e9dfca'/></svg>" }));
  const p = await ctx.newPage(); p.on('dialog', d => d.accept('1234'));
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let fails = 0; const ok = (n, c, x) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, x || ''); };
  await p.addInitScript(() => { window.__lt = []; window.__cls = 0; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (e) {} });
  // a bigger catalogue stored before the page loads
  await p.goto('file://' + process.cwd() + '/' + (process.env.FILE || 'anitha-store.html'));
  await p.evaluate(() => { const base = db.products.filter(x => !isAccessory(x)); for (let i = 0; i < 110; i++) { const s = base[i % base.length]; db.products.push({ ...s, id: 'q' + i, sku: 'AP-LOAD-' + i, name: s.name + ' ' + i, slug: 'load-' + i, stock: 2, images: ['https://img.test/' + i + '.jpg'], image: 'https://img.test/' + i + '.jpg' }); } saveDB(); });
  const t0 = Date.now(); await p.reload(); await p.waitForLoadState('load'); const loadMs = Date.now() - t0;
  ok('page loads and is usable in under 4.5 s (4x slower CPU, 122 products)', loadMs < 4500, loadMs + 'ms');
  const cls0 = await p.evaluate(() => new Promise(r => setTimeout(() => r(window.__cls), 800)));
  const t = (fn, a) => p.evaluate(async ([src, a]) => { const f = eval(src); const s = performance.now(); await f(a); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - s); }, [fn.toString(), a]);
  const lim = (n, ms, v) => ok(`${n} responds within ${ms} ms`, v < ms, v + 'ms');
  lim('open the shop page', 600, await t(() => navigateTo('shop')));
  lim('type in search (one keystroke, incl. render)', 600, await t(() => { shopSearch('silk', true); return new Promise(r => setTimeout(r, 20)); }));
  lim('clear the search', 600, await t(() => { shopSearch('', true); return new Promise(r => setTimeout(r, 20)); }));
  lim('switch to a category', 500, await t(() => filterProducts('Tussar')));
  lim('switch back to all', 500, await t(() => filterProducts('all')));
  lim('switch to Accessories and back', 600, await t(() => { shopKind('accessory'); shopKind('saree'); }));
  lim('open filter panel', 400, await t(() => shopTogglePanel()));
  lim('toggle a filter', 500, await t(() => shopStock(true)));
  await p.evaluate(() => { shopStock(false); shopTogglePanel(); });
  lim('open a product page', 500, await t(() => openProductDetail('q7')));
  lim('add to cart + open cart', 500, await t(() => { closeModal('productModal'); addToCart('q7'); }));
  lim('open checkout', 500, await t(() => { closeAllDrawers(); openCheckout && (setSession(db.users[0], null), db.users[0].consents = db.users[0].consents || {}, openCheckout()); }));
  await p.evaluate(() => { closeModal('checkoutModal'); cart = []; saveCart(); navigateTo('home'); });
  lim('render the home page', 500, await t(() => renderHome()));
  lim('open the favourites page with 40 items', 600, await t(() => { favourites = db.products.slice(0, 40).map(x => x.id); navigateTo('favourites'); }));
  // save cost (every product / setting edit rewrites the stored data)
  lim('save all store data', 400, await t(() => saveDB()));
  // scrolling smoothness on the shop page
  await p.evaluate(() => { navigateTo('shop'); window.scrollTo(0, 0); });
  const jank = await p.evaluate(() => new Promise(res => { const fr = []; let last = performance.now(), y = 0, n = 0; (function step(now) { fr.push(now - last); last = now; y += 90; window.scrollTo(0, y); if (++n < 70) requestAnimationFrame(step); else res(fr); })(performance.now()); }));
  const slow = jank.filter(x => x > 50).length, worst = Math.round(Math.max(...jank));
  ok('scrolling the shop: fewer than 15% of frames slower than 50 ms', slow / jank.length < 0.15, `${slow}/${jank.length} slow, worst ${worst}ms`);
  const lt = await p.evaluate(() => window.__lt), cls = cls0;
  ok('no single task blocks the phone for more than 600 ms', Math.max(0, ...lt) < 600, 'longest ' + Math.max(0, ...lt) + 'ms, ' + lt.length + ' long tasks');
  ok('layout does not jump while the page loads (shift score < 0.1)', cls < 0.1, cls.toFixed(3));
  const anim = await p.evaluate(() => { navigateTo('home'); return document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).map(a => (a.effect && a.effect.target ? a.effect.target.className : '') + ':' + (a.animationName || a.transitionProperty || '')).slice(0, 8); });
  ok('no endless animations running on the home page (battery / lag)', anim.filter(x => !/spinner|skeleton/.test(x)).length === 0, JSON.stringify(anim));
  const dom = await p.evaluate(() => { navigateTo('shop'); return document.getElementsByTagName('*').length; });
  ok('page stays light (under 6,000 elements with 122 products)', dom < 6000, dom + ' elements');
  const lazy = await p.evaluate(() => { const im = [...document.querySelectorAll('#productGrid img')]; return im.length ? im.filter(i => i.loading === 'lazy').length / im.length : 1; });
  ok('shop images are lazy-loaded', lazy > 0.95, Math.round(lazy * 100) + '%');
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
