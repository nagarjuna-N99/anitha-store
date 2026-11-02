const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  for (const W of [360, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 780 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
    await p.route(/^https?:/, r => r.abort()); await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(500);
    const sw = () => p.evaluate(() => document.documentElement.scrollWidth);
    const clean = () => p.evaluate(() => { document.querySelectorAll('.modal.active,.drawer.active').forEach(m => m.classList.remove('active')); });
    ok(`${W}px home: no sideways scroll`, await sw() <= W);
    await p.evaluate(() => navigateTo('shop')); ok(`${W}px shop: no sideways scroll`, await sw() <= W);
    ok(`${W}px two products per row`, await p.evaluate(() => { const c = [...document.querySelectorAll('#productGrid .product-card')].slice(0, 3).map(x => Math.round(x.getBoundingClientRect().top)); return c[0] === c[1] && c[2] > c[1]; }));
    ok(`${W}px category chips on one scrollable row`, await p.evaluate(() => { const t = [...document.querySelectorAll('#filterContainer .filter-btn')].map(x => Math.round(x.getBoundingClientRect().top)); return new Set(t).size === 1; }));
    ok(`${W}px header icons & card buttons are finger-sized (>=40px)`, await p.evaluate(() => [...document.querySelectorAll('nav .nav-icon[aria-label=Search], nav .hamburger-btn, #productGrid .btn-card, .product-fav-btn, .product-share-btn')].every(e => { const r = e.getBoundingClientRect(); return r.width >= 39.5 && r.height >= 39.5; })));
    ok(`${W}px search & selects use 16px text (no iOS zoom)`, await p.evaluate(() => ['#shop-q', '#shop-sort'].every(s => parseFloat(getComputedStyle(document.querySelector(s)).fontSize) >= 16)));
    await p.evaluate(() => shopTogglePanel()); ok(`${W}px filter panel: no sideways scroll`, await sw() <= W);
    await p.evaluate(() => { shopTogglePanel(); openProductDetail('p3'); });
    ok(`${W}px product page: no sideways scroll`, await sw() <= W);
    ok(`${W}px product page: Add to Cart is sticky and on screen`, await p.evaluate(() => { const bt = document.querySelector('#productModalBody .buy-btn'); const r = bt.getBoundingClientRect(); return getComputedStyle(bt).position === 'sticky' && r.bottom <= innerHeight + 1 && r.top > 0; }));
    // swipe the gallery
    await p.evaluate(() => { const x = db.products.find(y => y.id === 'p3'); x.images = ['data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=']; x.image = x.images[0]; openProductDetail('p3'); });
    const swipe = dx => p.evaluate(dx => { const g = document.querySelector('#productModalBody .gal'); const mk = (t, x) => new Touch({ identifier: 1, target: g, clientX: x, clientY: 200 }); g.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(0, 200)], changedTouches: [mk(0, 200)] })); g.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(0, 200 + dx)] })); return [...document.querySelectorAll('#productModalBody .gal-thumb')].findIndex(x => x.classList.contains('active')); }, dx);
    ok(`${W}px swipe left → next photo`, (await swipe(-120)) === 1);
    ok(`${W}px swipe right → previous photo`, (await swipe(120)) === 0);
    await clean(); await p.evaluate(() => { addToCart('p3'); openCart(); }); ok(`${W}px cart drawer is full width`, await p.evaluate(() => Math.round(document.querySelector('#cartDrawer, .drawer.active').getBoundingClientRect().width) === innerWidth));
    await clean(); await p.evaluate(() => { navigateTo('home'); }); await p.waitForTimeout(100);
    ok(`${W}px new arrivals: swipe row, no auto-marquee, no duplicates`, await p.evaluate(() => { const t = document.getElementById('scrollTrack'); return getComputedStyle(t).animationName === 'none' && getComputedStyle(t).overflowX === 'auto' && [...t.querySelectorAll('.scroll-card.dup')].every(c => getComputedStyle(c).display === 'none'); }));
    // delivery check, gift box, tracking on a phone
    await clean(); await p.evaluate(() => { openProductDetail('p3'); });
    ok(`${W}px product page with delivery check: no sideways scroll, input is 16px`, await sw() <= W && await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#productModalBody .dc-row input')).fontSize) >= 16));
    await clean(); await p.evaluate(() => { const u = newUser('+9197000' + String(Math.random()).slice(2, 7)); db.users.push(u); setSession(u, null); cart = [{ id: 'p3', qty: 1 }]; saveCart(); GIFT_PRESET = true; openCheckout(); document.getElementById('chk-gift-other').checked = true; giftSync(); });
    ok(`${W}px checkout with the gift box and recipient fields open: no sideways scroll`, await sw() <= W && await p.evaluate(() => { const r = document.getElementById('gift-recipient').getBoundingClientRect(); return r.right <= innerWidth + 1 && r.width > 200; }));
    await clean(); await p.evaluate(() => { const o = db.orders[0]; setSession(db.users.find(u => u.id === o.userId), null); openTrackOrder(o.id); });
    ok(`${W}px tracking sheet fits the screen`, await sw() <= W && await p.evaluate(() => { const r = document.querySelector('#trackModal .modal-content').getBoundingClientRect(); return r.width <= innerWidth + 1; }));
    // tab bar
    await clean(); await p.evaluate(() => { isAdminView && toggleView(); navigateTo('home'); });
    ok(`${W}px tab bar visible, fixed to bottom, 5 tabs`, await p.evaluate(() => { const t = document.getElementById('tabBar'), r = t.getBoundingClientRect(); return getComputedStyle(t).display === 'flex' && Math.abs(r.bottom - innerHeight) < 2 && t.querySelectorAll('button').length === 5; }));
    await p.tap('#tabBar [data-tab=shop]'); ok(`${W}px Shop tab opens shop + highlights`, await p.evaluate(() => document.getElementById('page-shop').classList.contains('active') && document.querySelector('#tabBar .on').dataset.tab === 'shop'));
    await p.evaluate(() => { addToCart('p3'); }); await p.waitForTimeout(100);
    ok(`${W}px cart badge counts + cart tab highlighted while open`, await p.evaluate(() => document.getElementById('tabCart').textContent === document.getElementById('cartCount').textContent && +document.getElementById('tabCart').textContent >= 1 && document.querySelector('#tabBar .on').dataset.tab === 'cart'));
    await p.tap('#tabBar [data-tab=favourites]'); ok(`${W}px tab bar still tappable over open cart → Wishlist`, await p.evaluate(() => document.getElementById('page-favourites').classList.contains('active') && !document.getElementById('cartDrawer').classList.contains('active')));
    await p.tap('#tabBar [data-tab=home]'); ok(`${W}px Home tab`, await p.evaluate(() => document.getElementById('page-home').classList.contains('active')));
    ok(`${W}px page has room above the tab bar`, await p.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom) >= 58));
    ok(`${W}px tab bar page: no sideways scroll`, await sw() <= W);
    await p.evaluate(() => { toggleView(); switchAdminTab('products'); }); ok(`${W}px admin hides the tab bar`, await p.evaluate(() => getComputedStyle(document.getElementById('tabBar')).display === 'none'));
    ok(`${W}px admin products: page does not scroll sideways`, await sw() <= W);
    await p.evaluate(() => switchAdminTab('dashboard')); ok(`${W}px admin dashboard: no sideways scroll`, await sw() <= W);
    ok(`${W}px no script errors`, errs.length === 0); if (errs.length) console.log(errs);
    await ctx.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
