// Browsing upgrade: whole-card link, hover photo swap, round buttons + Quick View, search results under the search bar (keyboard too), Nalli-style filter bar,
// a saree opens as a full page, broken photos show "photo coming soon", hover effects, Follow us links, and the sample-saree notice in the owner app.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }; const sleep = ms => new Promise(r => setTimeout(r, ms));
  const open = async (vp, mob) => { const c = await b.newContext({ viewport: vp, isMobile: !!mob, hasTouch: !!mob }); await c.route(/^https?:\/\//, r => r.abort()); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs; await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(500);
    await p.evaluate(() => { const cols = ['#7a1f2b', '#c28a1e', '#2a5a4a', '#a14a20', '#4a3a7a', '#1d4d6b'], g = c => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="' + c + '"/></svg>'); db.products.forEach((x, i) => { x.image = g(cols[i % 6]); x.images = [x.image, g(cols[(i + 3) % 6])]; }); renderProducts(); buildScrollTrack(); renderHomeCategories(); }); return p; };
  let p = await open({ width: 1440, height: 950 }); const ev = (f, a) => p.evaluate(f, a);
  await ev(() => navigateTo('shop')); await sleep(300);
  // ---- the card ----
  ok('a card has two photos (the second shows on hover) and no View Details / Add to Cart text buttons', await ev(() => { const c = document.querySelector('#productGrid .product-card'); return !!c.querySelector('.pc-main') && !!c.querySelector('.pc-alt') && !c.querySelector('.btn-view,.btn-cart,.btn-card'); }));
  await p.hover('#productGrid .product-card >> nth=0'); await sleep(900);
  ok('moving the mouse over a card shows the other photo of the same saree', await ev(() => { const c = document.querySelector('#productGrid .product-card'); return parseFloat(getComputedStyle(c.querySelector('.pc-alt')).opacity) > 0.9 && parseFloat(getComputedStyle(c.querySelector('.pc-main')).opacity) >= 0.9; }));
  ok('round buttons (bag, Quick View, share) appear on the photo with the heart', await ev(() => { const c = document.querySelector('#productGrid .product-card'); return ['.pc-bag', '.pc-qv', '.product-share-btn', '.product-fav-btn'].every(s => { const e = c.querySelector(s), r = e.getBoundingClientRect(); return r.width >= 40 && parseFloat(getComputedStyle(e.closest('.pc-acts') || e).opacity) > 0.9; }); }));
  ok('the name gets an underline while the mouse is over the card', await ev(() => { const n = document.querySelector('#productGrid .product-card .product-name'); return getComputedStyle(n).backgroundSize.startsWith('100%'); }));
  ok('the grid is 4 across on a computer', await ev(() => { const cs = getComputedStyle(document.getElementById('productGrid')).gridTemplateColumns.split(' ').length; return cs === 4; }));
  ok('"N ITEMS" and Sort sit at the right of the filter bar', await ev(() => /^\d+ ITEMS$/.test(document.getElementById('items-n').textContent) && !!document.querySelector('.fbar-r #shop-sort')));
  // ---- pressing anywhere on the card opens the page ----
  await p.click('#productGrid .product-card >> nth=0', { position: { x: 20, y: 120 } }); await sleep(400);
  ok('pressing the photo (not just the name) opens the saree as a full page', await ev(() => { const m = document.getElementById('productModal'), r = m.getBoundingClientRect(); return m.classList.contains('active') && r.width >= innerWidth - 1 && r.height >= innerHeight - 1 && getComputedStyle(m).backgroundColor !== 'rgba(0, 0, 0, 0.7)'; }));
  ok('the page has a "Back to the collection" bar, the saree name and the bag', await ev(() => /Back to the collection/.test(document.querySelector('#productModal .pp-bar .modal-close').textContent) && document.getElementById('ppBarName').textContent.length > 3 && !!document.querySelector('.pp-bar-bag')));
  ok('the "similar sarees" column does not scroll on its own (one scroll for the page)', await ev(() => { const s = document.querySelector('#productModalBody .pp-similar'); return getComputedStyle(s).overflowY !== 'auto' && getComputedStyle(s).overflowY !== 'scroll'; }));
  await ev(() => document.querySelector('#productModal .pp-bar-bag').click()); await sleep(400);
  ok('the bag opens above the saree page', await ev(() => { const d = document.getElementById('cartDrawer'), r = d.getBoundingClientRect(); return d.classList.contains('active') && document.elementFromPoint(r.left + 20, r.top + 80).closest('#cartDrawer'); }));
  await ev(() => { closeAllDrawers(); document.querySelector('#productModal .pp-bar .modal-close').click(); }); await sleep(200);
  ok('Back returns to the collection', await ev(() => !document.getElementById('productModal').classList.contains('active') && document.getElementById('page-shop').classList.contains('active')));
  // ---- Quick View ----
  await p.hover('#productGrid .product-card >> nth=1'); await p.click('#productGrid .product-card >> nth=1 >> .pc-qv'); await sleep(400);
  ok('Quick View opens a small window with photos, name, price, Add to bag and View full details, and the page behind stays', await ev(() => { const q = document.getElementById('quickView'); return q.classList.contains('active') && q.querySelectorAll('.qv-th button').length === 2 && /₹/.test(q.querySelector('.qv-price').textContent) && /Add to bag/.test(q.textContent) && /View full details/.test(q.textContent) && !document.getElementById('productModal').classList.contains('active'); }));
  await ev(() => document.querySelectorAll('#quickView .qv-th button')[1].click()); await sleep(150);
  ok('a thumbnail in Quick View changes the big photo', await ev(() => document.querySelectorAll('#quickView .qv-th button')[1].classList.contains('on')));
  await p.keyboard.press('Escape'); await sleep(150);
  ok('Escape closes Quick View', await ev(() => !document.getElementById('quickView').classList.contains('active')));
  await ev(() => { const x = db.products.find(q => q.stock > 0 && !isAccessory(q)); qvOpen(x.id); }); await sleep(200); await ev(() => document.querySelector('#quickView .qv-btns .btn-outline').click()); await sleep(300);
  ok('"View full details" in Quick View opens the full page', await ev(() => !document.getElementById('quickView').classList.contains('active') && document.getElementById('productModal').classList.contains('active')));
  await ev(() => closeModal('productModal'));
  // ---- search under the search bar ----
  await ev(() => { navigateTo('home'); shopFocusSearch(); }); await sleep(200);
  ok('opening search shows "browse by type" chips right under the bar', await ev(() => { const d = document.getElementById('searchDrop'); return !d.hidden && d.querySelectorAll('.sd-chip').length > 3; }));
  await p.keyboard.type('silk', { delay: 20 }); await sleep(300);
  ok('typing shows matches (photo, name, price) in a panel directly under the bar; the page behind is not changed', await ev(() => { const d = document.getElementById('searchDrop'), s = document.querySelector('#navSearch .shop-search').getBoundingClientRect(), r = d.getBoundingClientRect(), row = d.querySelector('.sd-row'); return row && row.querySelector('img') && /₹/.test(row.querySelector('.sd-p').textContent) && r.top - s.bottom < 14 && r.top >= s.bottom - 1 && !document.getElementById('page-shop').classList.contains('active'); }));
  ok('the part of the name that matches is highlighted', await ev(() => !!document.querySelector('#searchDrop .sd-row mark')));
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await sleep(100);
  ok('the arrow keys move through the results', await ev(() => { const on = document.querySelectorAll('#searchDrop .sd-row.on'); return on.length === 1 && on[0].id === 'sd-1' && document.getElementById('shop-q').getAttribute('aria-activedescendant') === 'sd-1'; }));
  await p.keyboard.press('Enter'); await sleep(400);
  ok('Enter on a highlighted result opens that saree and closes search', await ev(() => document.getElementById('productModal').classList.contains('active') && document.getElementById('navSearch').hidden));
  await ev(() => closeModal('productModal'));
  await ev(() => { shopFocusSearch(); }); await p.fill('#shop-q', 'zzzxq'); await sleep(250);
  ok('a word that matches nothing says so kindly and offers the categories', await ev(() => /No sarees match/.test(document.getElementById('searchDrop').textContent) && document.querySelectorAll('#searchDrop .sd-chip').length > 3));
  await p.fill('#shop-q', 'silk'); await sleep(250); await ev(() => document.querySelector('#searchDrop .sd-all').click()); await sleep(400);
  ok('"See all results" opens the Collection with the search applied', await ev(() => document.getElementById('page-shop').classList.contains('active') && SHOP.q === 'silk' && document.getElementById('navSearch').hidden));
  await ev(() => shopSearch('', true));
  // ---- filter drop-downs ----
  await p.click('#fdd-b-price'); await sleep(150);
  ok('Price opens a small menu under its button', await ev(() => { const pp = document.getElementById('fdd-p-price'), bb = document.getElementById('fdd-b-price').getBoundingClientRect(); return !pp.hidden && Math.abs(pp.getBoundingClientRect().top - bb.bottom) < 14 && /Under ₹20,000/.test(pp.textContent); }));
  await p.click('#fdd-p-price .fdd-o >> nth=1'); await sleep(250);
  ok('choosing "Under ₹20,000" filters the grid, updates the count and marks the Price button', await ev(() => { const n = document.querySelectorAll('#productGrid .product-card').length; return n > 0 && n < sareeList().length && visibleProducts().every(x => x.price < 20001) && document.getElementById('fdd-b-price').classList.contains('has') && document.getElementById('items-n').textContent === n + ' ' + (n === 1 ? 'ITEM' : 'ITEMS'); }));
  await p.click('#fdd-b-colour'); await sleep(150); await ev(() => document.querySelector('#fdd-p-colour .swatch').click()); await sleep(200);
  ok('Colour menu filters too, and clicking elsewhere closes the menu', await ev(() => SHOP.colours.length === 1 && !document.getElementById('fdd-p-colour').hidden) && (await p.mouse.click(10, 600), await sleep(150), await ev(() => document.getElementById('fdd-p-colour').hidden)));
  await ev(() => shopClearAll()); await sleep(200);
  await p.click('#shop-filter-btn'); await sleep(150);
  ok('Show Filters opens the full panel', await ev(() => document.getElementById('shop-panel').classList.contains('open') && /Hide Filters/.test(document.getElementById('shop-filter-btn').textContent)));
  await p.click('#shop-filter-btn');
  // ---- broken photo ----
  await ev(() => { db.products[0].image = 'https://broken.invalid/x.jpg'; db.products[0].images = [db.products[0].image]; renderProducts(); }); await sleep(600);
  ok('a photo that cannot load shows a calm "photo coming soon" card, not broken alt text', await ev(() => { const i = document.querySelector('#productGrid .product-card .pc-main'); return i.classList.contains('img-ph') && i.src.startsWith('data:image/svg+xml') && i.naturalWidth > 0; }));
  // ---- hover effects ----
  await ev(() => { navigateTo('home'); renderHomeCategories(); }); await sleep(300);
  await p.hover('.category-item >> nth=0'); await sleep(500);
  ok('the photo of a category tile changes while the mouse is over it, and goes back after', await ev(() => { const t = document.querySelector('.category-item'), i = t.querySelector('img'); return t.querySelector('img').classList.contains('swap') || i.src !== TILE_T.get(t).cur; }));
  await p.mouse.move(5, 5); await sleep(300);
  ok('...the original photo returns when the mouse leaves', await ev(() => { const t = document.querySelector('.category-item'); return !TILE_T.has(t); }));
  ok('menu links and the category name get a growing underline', await ev(() => ['.nav-links a', '.category-item .category-name', '.footer-links a'].every(s => getComputedStyle(document.querySelector(s)).backgroundImage.includes('linear-gradient'))));
  // ---- Follow us ----
  ok('Follow us at the bottom: Facebook and Instagram (anitha_pemmasani) open in a new tab', await ev(() => { const f = document.getElementById('followUs'); return f && /Follow us/.test(f.textContent) && f.querySelector('a.facebook').href === 'https://www.facebook.com/profile.php?id=100086623513019' && f.querySelector('a.instagram').href === 'https://www.instagram.com/anitha_pemmasani/' && [...f.querySelectorAll('a')].every(a => a.target === '_blank' && /noopener/.test(a.rel)); }));
  await ev(() => { db.home.follow = { instagram: '' }; renderFollow(); }); ok('an empty Instagram box hides the Instagram button', await ev(() => !document.querySelector('#followUs a.instagram') && !!document.querySelector('#followUs a.facebook')));
  await ev(() => { db.home.follow = { instagram: '@anitha.sarees' }; renderFollow(); });
  ok('typing an Instagram name adds the Instagram button with the right link', await ev(() => document.querySelector('#followUs a.instagram').href === 'https://www.instagram.com/anitha.sarees/'));
  await ev(() => { db.home.follow = { instagram: 'https://evil.example/x', facebook: 'javascript:alert(1)' }; renderFollow(); });
  ok('a bad link (not Facebook / Instagram) is never shown', await ev(() => !document.querySelector('#followUs a')));
  await ev(() => { db.home.follow = { show: false }; renderFollow(); }); ok('Follow us can be switched off', await ev(() => getComputedStyle(document.getElementById('followUs')).display === 'none'));
  await ev(() => { delete db.home.follow; renderFollow(); });
  ok('the owner card has Facebook, Instagram and a switch', await ev(() => { const h = followCardHTML(); return /fol-fb/.test(h) && /fol-ig/.test(h) && /role="switch"/.test(h); }));
  // ---- sample notice ----
  ok('the owner app tells her about the starter demo sarees and can remove them in one press', await ev(() => { db.products[0].id = 'p1'; db.products[0].image = db.products[0].images[0] = 'https://images.unsplash.com/photo-1?w=1'; const n = db.products.filter(isSampleProd).length; const h = sampleNoticeHTML(); return n >= 1 && /sample/.test(h) && /removeSamples/.test(h) && !isSampleProd({ id: 'p77', image: '/media/a.jpg' }) && !isSampleProd({ id: 'abc', image: 'https://images.unsplash.com/x' }); }));
  ok('no script errors (computer)', p.errs.length === 0, p.errs.join(' | '));
  // ================= phone =================
  p = await open({ width: 390, height: 844 }, true); const ev2 = (f, a) => p.evaluate(f, a);
  await ev2(() => navigateTo('shop')); await sleep(300);
  ok('phone: two cards across, bag and Quick View buttons always visible and finger-sized, share hidden', await ev2(() => { const c = document.querySelector('#productGrid .product-card'); return getComputedStyle(document.getElementById('productGrid')).gridTemplateColumns.split(' ').length === 2 && ['.pc-bag', '.pc-qv'].every(s => { const e = c.querySelector(s), r = e.getBoundingClientRect(); return r.width >= 39.5 && r.height >= 39.5 && parseFloat(getComputedStyle(e.closest('.pc-acts')).opacity) === 1; }); }));
  await p.tap('#productGrid .product-card >> nth=0 >> .pc-qv'); await sleep(400);
  ok('phone: Quick View is a sheet from the bottom with the close button reachable', await ev2(() => { const x = document.querySelector('#quickView .qv-x').getBoundingClientRect(); return document.getElementById('quickView').classList.contains('active') && x.top >= 0 && x.width >= 40; }));
  await p.tap('#quickView .qv-x'); await sleep(200);
  await ev2(() => { shopFocusSearch(); }); await p.fill('#shop-q', 'silk'); await sleep(300);
  ok('phone: search results panel sits under the bar and fits the screen', await ev2(() => { const d = document.getElementById('searchDrop'), r = d.getBoundingClientRect(), s = document.querySelector('#navSearch .shop-search').getBoundingClientRect(); return !d.hidden && r.top >= s.bottom - 1 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && [...d.querySelectorAll('.sd-row,.sd-all')].every(e => e.getBoundingClientRect().height >= 44); }));
  await ev2(() => { closeNavSearch(); }); await p.tap('#productGrid .product-card >> nth=0'); await sleep(400);
  ok('phone: a tap on the card opens the full page with the Back button at the top', await ev2(() => { const m = document.getElementById('productModal'), x = document.querySelector('#productModal .pp-bar .modal-close').getBoundingClientRect(); return m.classList.contains('active') && x.top >= 0 && x.height >= 40 && document.documentElement.scrollWidth <= innerWidth + 1; }));
  ok('no script errors (phone)', p.errs.length === 0, p.errs.join(' | '));
  await b.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
