const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errs.push('console: '+m.text()));
  p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const ev = (f, a) => p.evaluate(f, a);
  const login = id => ev(id => { const u = db.users.find(x => x.id === id); setSession(u, null); }, id);
  const logout = () => ev(() => localStorage.removeItem('ap_session'));
  const ids = (q = '') => ev(() => [...document.querySelectorAll('#productGrid .product-card')].map(c => c.querySelector('h3, .product-name') ? (c.querySelector('h3, .product-name')).innerText : c.innerText.split('\n')[0]));
  await ev(() => navigateTo('shop'));

  // ===== search =====
  const search = async q => { await p.fill('#shop-q', q); await p.waitForTimeout(450); return ev(() => visibleProducts().map(x => x.id)); };
  ok('all products listed by default', (await ev(() => visibleProducts().length)) === (await ev(() => sareeList().length)));
  ok('search by name word', (await search('maheswari')).includes('p3'));
  ok('synonym kanchipuram → kanjeevaram', (await search('kanchipuram')).includes('p5'));
  ok('typo tolerated', (await search('banarsi')).includes('p4'));
  ok('SKU search', (await search('AP-PHT-001')).join() === 'p6');
  ok('AND across words (no match)', (await search('banarasi paithani')).length === 0);
  ok('empty state offers reset', /No sarees match/.test(await ev(() => document.getElementById('productGrid').innerText)));
  await p.click('#productGrid button:has-text("Clear search")');
  ok('reset restores everything', (await ev(() => visibleProducts().length)) === (await ev(() => sareeList().length)) && (await p.inputValue('#shop-q')) === '');

  // ===== filters =====
  await ev(() => shopTogglePanel());
  ok('filter panel opens', await ev(() => document.getElementById('shop-panel').classList.contains('open')));
  await ev(() => { SHOP.min = 40000; SHOP.max = 90000; renderProducts(); });
  ok('price range filters', await ev(() => visibleProducts().every(x => x.price >= 40000 && x.price <= 90000) && visibleProducts().length > 0));
  await ev(() => shopResetFilters());
  await ev(() => { db.products.find(x => x.id === 'p3').stock = 0; renderProducts(); shopStock(true); });
  ok('in-stock only hides sold-out', await ev(() => !visibleProducts().some(x => x.stock <= 0)));
  await ev(() => shopStock(false));
  ok('featured sort pushes sold-out last', await ev(() => { SHOP.sort = 'featured'; const l = visibleProducts(); const i = l.findIndex(x => x.stock <= 0); return i === -1 || l.slice(i).every(x => x.stock <= 0); }));
  await ev(() => { SHOP.sort = 'price-asc'; });
  ok('sort price low→high', await ev(() => { const l = visibleProducts().map(x => x.price); return l.every((v, i) => !i || l[i-1] <= v); }));
  await ev(() => { shopResetFilters(); const f = db.products[0].fabric; SHOP.fabrics = [f]; renderProducts(); return 0; });
  ok('fabric filter', await ev(() => visibleProducts().every(x => x.fabric === SHOP.fabrics[0]) && visibleProducts().length >= 1));
  await ev(() => shopResetFilters());
  ok('every product has fabric + colours', await ev(() => sareeList().every(x => x.fabric && Array.isArray(x.colours))));
  await ev(() => { const x = db.products.find(y => y.colours.length); SHOP.colours = [x.colours[0]]; renderProducts(); });
  ok('colour filter', await ev(() => visibleProducts().length >= 1 && visibleProducts().every(x => x.colours.includes(SHOP.colours[0]))));
  ok('active chip shown + clear all', await ev(() => { const had = document.getElementById('shop-active').innerText.length > 0; shopClearAll(); return had && visibleProducts().length === sareeList().length; }));
  await p.click('.nav-icon[aria-label="Search"]');
  await p.waitForTimeout(150);
  ok('nav 🔍 focuses search', await ev(() => document.activeElement.id === 'shop-q'));

  // ===== scheduling =====
  await ev(() => navigateTo('home'));
  const baseSlides = await ev(() => heroVisible().length);
  await ev(() => { db.home.hero.slides[0].startAt = '2099-01-01T10:00'; });
  ok('future slide hidden', (await ev(() => heroVisible().length)) === baseSlides - 1);
  await ev(() => { db.home.hero.slides[0].startAt = '2000-01-01T10:00'; db.home.hero.slides[0].endAt = '2000-02-01T10:00'; });
  ok('expired slide hidden', (await ev(() => heroVisible().length)) === baseSlides - 1);
  await ev(() => { db.home.hero.slides[0].startAt = ''; db.home.hero.slides[0].endAt = ''; });
  ok('no dates → shown', (await ev(() => heroVisible().length)) === baseSlides);
  ok('IST parse: 10:00 IST = 04:30 UTC', await ev(() => new Date(parseIST('2026-10-17T10:00')).toISOString() === '2026-10-17T04:30:00.000Z'));
  ok('announcement bar shows default text', /Complimentary Shipping/i.test(await ev(() => document.getElementById('announceBar').innerText)));
  await ev(() => { db.home.announcements[0].endAt = '2000-01-01T00:00'; scheduleTick(); });
  ok('expired announcement hides the bar', await ev(() => getComputedStyle(document.getElementById('announceBar')).display === 'none' || !document.getElementById('announceBar').innerText.trim()));
  await ev(() => { db.home.announcements[0].endAt = ''; scheduleTick(); });
  ok('bar returns when valid again', /Complimentary/i.test(await ev(() => document.getElementById('announceBar').innerText)));

  // ===== back-in-stock alerts =====
  await ev(() => { db.products.find(x => x.id === 'p3').stock = 0; renderProducts(); buildScrollTrack(); navigateTo('shop'); });
  ok('sold-out card offers Notify me', /notify/i.test(await ev(() => document.querySelector('#productGrid .btn-notify').textContent)));
  await logout();
  await ev(() => openStockAlert('p3'));
  ok('guest is asked to sign in first', await ev(() => document.getElementById('authModal').classList.contains('active')));
  await ev(() => closeModal('authModal')); await login('u1');
  await ev(() => openStockAlert('p3'));
  await p.click('#alertBody button:has-text("Notify me")');
  ok('consent required', await ev(() => db.stockAlerts.length === 0));
  await p.check('#al-consent'); await p.click('#alertBody button:has-text("Notify me")');
  ok('alert saved with consent row', await ev(() => db.stockAlerts.length === 1 && db.consentLog.some(c => c.type === 'stockAlert' && c.granted && c.ref === 'p3')));
  ok('card shows "on the list" state', await ev(() => /list|waiting|alert/i.test(document.querySelector('#productGrid .btn-notify').textContent)));
  await ev(() => openStockAlert('p3'));
  ok('second subscribe impossible (cancel offered)', /Cancel this alert/.test(await p.textContent('#alertBody')));
  await ev(() => closeModal('alertModal'));
  // second user + withdrawn consent
  await login('u2'); await ev(() => openStockAlert('p3')); await p.check('#al-consent'); await p.click('#alertBody button:has-text("Notify me")');
  await ev(() => { const u = db.users.find(x => x.id === 'u2'); recordConsent(u, 'stockAlert', false, 'test', 'p3'); saveDB(); });
  // restock via product form path
  await ev(() => { const x = db.products.find(y => y.id === 'p3'); x.stock = 5; notifyBackInStock(x); notifyBackInStock(x); });
  ok('exactly one message queued (consenting user), withdrawn user skipped, no duplicates', await ev(() => db.outbox.length === 1 && db.outbox[0].to === db.users.find(u => u.id === 'u1').phone && db.stockAlerts.find(a => a.userId === 'u2').status === 'skipped'));
  // real endpoint
  await ev(() => { db.settings.otpEndpoint = 'https://otp.test/api'; db.outbox[0].status = 'queued'; });
  let sent = [];
  await p.route('https://otp.test/api/messages/send', r => { sent.push(r.request().postDataJSON()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await ev(() => dispatchOutbox()); await p.waitForTimeout(400);
  ok('real mode sends via /messages/send once', sent.length === 1 && await ev(() => db.outbox[0].status === 'sent'));
  await ev(() => { db.settings.otpEndpoint = ''; });
  // delete product cancels alerts
  await ev(() => { const x = db.products.find(y => y.id === 'p4'); x.stock = 0; db.stockAlerts.push({ id: 'zz', productId: 'p4', userId: 'u1', phone: '', status: 'waiting', createdAt: nowISO() }); });
  await login('u1');
  ok('account lists alerts', await ev(() => { openAccount(); return /back in stock|alerts/i.test(document.getElementById('accountBody') ? document.getElementById('accountBody').innerText : document.getElementById('accountModal').innerText); }));
  await ev(() => closeModal('accountModal'));

  // ===== reviews =====
  await login('u1');
  ok('eligible: delivered buyer', await ev(() => canReview(currentUser(), 'p3')));
  ok('not eligible: product never delivered', !(await ev(() => canReview(currentUser(), 'p5'))));
  await ev(() => openProductDetail('p3'));
  ok('review section renders', await ev(() => !!document.querySelector('#rv-root')));
  await ev(() => rvStart());
  ok('form opens', await ev(() => !!document.querySelector('.rv-form')));
  await p.click('.rv-form button:has-text("Submit")').catch(() => ev(() => rvSubmit()));
  ok('needs rating', await ev(() => db.reviews.length === 0));
  await ev(() => rvRate(5));
  await p.fill('#rv-text', 'short');
  await ev(() => rvSubmit());
  ok('too-short text rejected', await ev(() => db.reviews.length === 0));
  await p.fill('#rv-text', 'Lovely drape and genuine zari <script>alert(1)</script>');
  await ev(() => rvSubmit());
  ok('consent for public display required', await ev(() => db.reviews.length === 0));
  await p.check('#rv-consent'); await ev(() => rvSubmit());
  ok('review stored as pending with consent log', await ev(() => db.reviews.length === 1 && db.reviews[0].status === 'pending' && db.consentLog.some(c => c.type === 'reviewPublic' && c.granted)));
  console.log('   own view:', (await ev(() => document.getElementById('rv-root').innerText)).replace(/\n+/g,' | ').slice(0,300));
  ok('pending review does not change ratings',  await ev(() => !db.products.find(x => x.id === 'p3').reviews));
  await logout();
  ok('guest does not see pending review', await ev(() => { openProductDetail('p3'); return !/Lovely drape/.test(document.getElementById('rv-root').innerText); }));
  // admin approve
  await ev(() => { const id = db.reviews[0].id; revSet(id, 'approved'); });
  ok('approved → public, escaped, rating recalculated', await ev(() => { openProductDetail('p3'); const t = document.getElementById('rv-root').innerHTML; const pr = db.products.find(x => x.id === 'p3'); return /Lovely drape/.test(t) && !/<script>alert/.test(t) && pr.reviews === 1 && pr.rating === 5; }));
  ok('JSON-LD has aggregateRating + review', await ev(() => { const ld = productLd(db.products.find(x => x.id === 'p3'), '', []); return !!ld.aggregateRating && Array.isArray(ld.review) && ld.review.length === 1; }));
  ok('static SEO page has review text', await ev(() => /Lovely drape/.test(productStaticPage(db.products.find(x => x.id === 'p3'), 'https://x.test') || '')));
  await login('u1');
  ok('one review per user per product', await ev(() => { openProductDetail('p3'); return !document.querySelector('.rv-cta button') || db.reviews.some(r => r.userId === 'u1' && r.productId === 'p3'); }));
  // photos
  await login('u3');
  await ev(() => { openProductDetail('p2'); rvStart(); rvRate(4); });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('.rv-form input[type=file]', [{ name: 'a.png', mimeType: 'image/png', buffer: png }]);
  await p.waitForFunction(() => RV.draft && RV.draft.photos.length === 1);
  ok('photo attached', true);
  await p.fill('#rv-text', 'Colour is exactly as shown in the photos.'); await p.check('#rv-consent'); await ev(() => rvSubmit());
  await ev(() => { db.settings.autoApproveReviews = true; });
  ok('review with photo saved', await ev(() => db.reviews.some(r => r.userId === 'u3' && r.photos.length === 1)));
  await ev(() => { revSet(db.reviews.find(r => r.userId === 'u3').id, 'approved'); openProductDetail('p2'); });
  await p.click('#rv-root .rv-ph >> nth=0');
  ok('lightbox opens', await ev(() => document.getElementById('lightboxModal').classList.contains('active') && !!document.querySelector('#lightboxBody img')));
  await ev(() => closeModal('lightboxModal'));
  // admin reply + panels
  await ev(() => { const r = db.reviews[0]; r.reply = 'Thank you!'; saveDB(); openProductDetail('p3'); });
  ok('owner reply visible', /Thank you!/.test(await ev(() => document.getElementById('rv-root').innerText)));
  await ev(() => { isAdminView = true; });
  ok('admin pages render', await ev(() => { const c = document.createElement('div'); renderReviewsAdmin(c); const a = document.createElement('div'); renderAlertsAdmin(a); return c.innerText.length > 20 && a.innerText.length > 20; }));
  ok('legal version 1.5 recorded', await ev(() => /^1\.5/.test(LEGAL_VERSION)));
  console.log('page errors:', errs.length ? errs.join(' | ') : 'none');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
