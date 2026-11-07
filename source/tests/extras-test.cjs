const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const ev = (f, a) => p.evaluate(f, a);
  const login = id => ev(id => { setSession(db.users.find(x => x.id === id), null); }, id);

  // ===== occasions =====
  ok('Gifts tile is hidden while no saree is within the gift budget', await ev(() => document.querySelectorAll('#occasionSection .occ-tile[data-occ="gift"]').length === 0 && document.querySelectorAll('#occasionSection .occ-tile').length === 5));
  await ev(() => { db.products.find(x => x.id === 'p8').price = 8000; renderOccasions(); });
  ok('home shows 6 occasion tiles with counts', await ev(() => document.querySelectorAll('#occasionSection .occ-tile').length === 6 && /available/.test(document.getElementById('occasionSection').innerText)));
  await p.click('.occ-tile[data-occ="Wedding"]');
  ok('Wedding tile opens the shop filtered to wedding sarees, with a removable chip', await ev(() => document.getElementById('page-shop').classList.contains('active') && SHOP.occasion === 'Wedding' && visibleProducts().length > 0 && visibleProducts().length < sareeList().length && visibleProducts().every(x => occasionsOf(x).includes('Wedding')) && /Wedding/.test(document.getElementById('shop-active').innerText)));
  await ev(() => shopRemove('occasion', '')); 
  ok('removing the chip shows all sarees again', await ev(() => visibleProducts().length === sareeList().length));
  await ev(() => navigateTo('home')); await p.click('.occ-tile[data-occ="gift"]');
  ok('Gifts tile applies the budget', await ev(() => SHOP.max === '10000' && visibleProducts().length > 0 && visibleProducts().every(x => x.price <= 10000)));
  await ev(() => navigateTo('home')); await p.click('.occ-tile[data-occ="accessory"]');
  ok('Accessories tile opens the accessories tab', await ev(() => SHOP.kind === 'accessory' && SHOP.occasion === '' && SHOP.max === ''));
  await ev(() => { shopResetFilters(); shopKind('saree'); });

  // ===== recently viewed =====
  ok('recently viewed hidden before browsing', await ev(() => document.getElementById('recentSection').innerText.trim() === ''));
  await ev(() => { openProductDetail('p3'); closeModal('productModal'); openProductDetail('p1'); closeModal('productModal'); navigateTo('home'); });
  ok('recently viewed lists latest first and is saved on the phone', await ev(() => JSON.stringify(RECENT) === '["p1","p3"]' && document.querySelectorAll('#recentSection .recent-card').length === 2 && localStorage.getItem('ap_recent') === '["p1","p3"]'));
  await ev(() => { ['p2', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'].forEach(i => { openProductDetail(i); closeModal('productModal'); }); });
  ok('recently viewed keeps at most 8', await ev(() => RECENT.length === 8 && RECENT[0] === 'p10'));

  // ===== wishlist sharing =====
  await ev(() => { favourites = ['p1', 'p3']; renderFavourites(); navigateTo('favourites'); });
  ok('favourites page has Share my wishlist', await ev(() => !!document.getElementById('wishShareBtn')));
  await p.click('#wishShareBtn');
  const wl = await ev(() => document.getElementById('share-url').value);
  ok('wishlist link carries the product slugs', await ev(() => /#\/wishlist\/[a-z0-9-]+,[a-z0-9-]+$/.test(document.getElementById('share-url').value)) && /wa\.me/.test(await ev(() => document.getElementById('wish-wa').href)));
  await ev(() => closeModal('shareModal'));
  await ev(h => { location.hash = h; }, '#/wishlist/' + (await ev(() => db.products.find(x => x.id === 'p3').slug)) + ',nope,' + (await ev(() => db.products.find(x => x.id === 'p1').slug)));
  await p.waitForTimeout(200);
  ok('opening a shared wishlist shows those sarees and ignores unknown ones', await ev(() => document.getElementById('page-wishlist').classList.contains('active') && document.querySelectorAll('#wishlistShared .product-card').length === 2));
  await ev(() => { location.hash = ''; navigateTo('home'); });

  // ===== product page: colour note, video, daylight, one of a kind =====
  await ev(() => { const x = db.products.find(y => y.id === 'p3'); x.video = 'https://youtu.be/dQw4w9WgXcQ'; x.images = [x.images[0], x.images[0] + '&b=1']; x.daylight = true; openProductDetail('p3'); });
  ok('colour note on every saree page', await ev(() => /Colours can look slightly different/.test(document.getElementById('productModalBody').innerText)));
  ok('video and daylight jump buttons shown', await ev(() => !!document.querySelector('#productModalBody [data-jump="video"]') && !!document.querySelector('#productModalBody [data-jump="daylight"]') && /daylight photo shows the truest colour/.test(document.getElementById('productModalBody').innerText)));
  await p.click('#productModalBody [data-jump="video"]');
  ok('Watch it draped switches the gallery to the video', await ev(() => !!document.querySelector('#productModalBody .gal [id$="-main"] iframe, #productModalBody .gal [id$="-main"] video')));
  await p.click('#productModalBody [data-jump="daylight"]');
  ok('daylight button shows the last photo', await ev(() => /b=1/.test(document.querySelector('#productModalBody .gal [id$="-main"] img').src)));
  await ev(() => { closeModal('productModal'); openProductDetail('p1'); });
  ok('no jump buttons without video / daylight', await ev(() => !document.querySelector('#productModalBody .jump-row')));
  await ev(() => { closeModal('productModal'); openProductDetail('p4'); });
  ok('single-piece saree says One of a kind (page and card)', await ev(() => /One of a kind/.test(document.getElementById('productModalBody').innerText) && /single designer piece/.test(document.getElementById('productModalBody').innerText) && /One of a kind/i.test(stockBadge(db.products.find(x => x.id === 'p4')))));
  await ev(() => { closeModal('productModal'); openProductDetail('p1'); });
  ok('multi-piece saree does not claim one of a kind', await ev(() => !/single designer piece/.test(document.getElementById('productModalBody').innerText)));
  await ev(() => { const x = db.products.find(q => q.stock === 1 && !isAccessory(q)); openProductDetail(x.id); });
  ok('the single-piece note reads: A single designer piece. Once it is sold, this exact saree can be made again only on order: message us on WhatsApp if you would like one. (never "will not be made again")', await ev(() => { const n = document.querySelector('#productModalBody .one-kind'); return !!n && /^✦ A single designer piece\. Once it is sold, this exact saree can be made again only on order: message us on WhatsApp if you would like one\.$/.test(n.textContent.trim()) && !/not be made again/.test(document.getElementById('productModalBody').innerText); }));
  ok('with WhatsApp chat switched on, "message us on WhatsApp" in that note is a real link to the shop number with this saree named', await ev(() => { db.settings.waNumber = '919876543210'; db.settings.waChatOn = true; const x = db.products.find(q => q.stock === 1 && !isAccessory(q)); openProductDetail(x.id); const a = document.querySelector('#productModalBody .one-kind a'); return !!a && /wa\.me\/919876543210/.test(a.href) && /message us on WhatsApp/.test(a.textContent); }));
  ok('the FAQ answer and the trust line say the same thing (made again only on order, ask on WhatsApp)', await ev(() => /Once a saree is sold, that exact saree can be made again only on order/.test(faqItems().find(f => /really only one piece/.test(f[0]))[1]) && /can be made again only on order: ask us on WhatsApp/.test(document.querySelector('#productModalBody .trust').textContent)));
  await ev(() => { closeModal('productModal'); openProductDetail('p9'); });
  ok('accessory page has no saree colour note', await ev(() => !/Colours can look slightly different/.test(document.getElementById('productModalBody').innerText)));
  await ev(() => closeModal('productModal'));
  ok('product form has the daylight checkbox that saves', await ev(() => { openProductForm('p3'); const c = document.getElementById('pf-daylight'); const r = c && c.checked; c.checked = false; c.dispatchEvent(new Event('change')); closeModal('adminModal'); return r && PF.daylight === false; }));

  // ===== bundles =====
  ok('product page offers the bundle', await ev(() => { openProductDetail('p1'); const t = document.querySelector('#productModalBody .bundle-box'); return t && /save ₹4,750/.test(t.innerText); }));
  await p.click('#productModalBody .bundle-add');
  ok('Add all puts both items in the cart and applies the discount', await ev(() => cart.length === 2 && computeTotals().bundleDiscount === 4750 && /Bundle offer/.test(document.getElementById('cartSummary').innerText)));
  ok('bundle and coupon add up, never more than the subtotal', await ev(() => { appliedCoupon = db.coupons.find(c => c.code === 'FLAT500'); const t = computeTotals(); return t.couponDiscount === 500 && t.discount === 5250 && t.total === t.subtotal + t.shipping + t.giftFee - 5250; }));
  ok('removing one item removes the bundle discount', await ev(() => { removeFromCart('p9'); appliedCoupon = null; return computeTotals().bundleDiscount === 0; }));
  await ev(() => { cart = []; saveCart(); closeAllDrawers(); closeModal('productModal'); isAdminView = true; document.body.classList.add('admin-on'); switchAdminTab('bundles'); });
  ok('Bundles admin tab lists the demo bundle', await ev(() => document.querySelectorAll('.bun-row').length === 1));
  await ev(() => { document.getElementById('bun-name').value = 'Bad'; document.getElementById('bun-val').value = '10'; bundleSave(); });
  ok('a bundle needs two items', await ev(() => db.bundles.length === 1));
  await ev(() => { document.getElementById('bun-name').value = 'Paithani + Bag'; document.getElementById('bun-val').value = '500'; document.getElementById('bun-type').value = 'flat'; document.querySelectorAll('.bun-chk').forEach(c => { c.checked = c.value === 'p6' || c.value === 'p12'; }); bundleSave(); });
  ok('new flat bundle saved and listed', await ev(() => db.bundles.length === 2 && db.bundles[1].type === 'flat' && document.querySelectorAll('.bun-row').length === 2));
  await ev(() => bundleToggle(1));
  ok('paused bundle is not applied', await ev(() => { cart = [{ id: 'p6', qty: 1 }, { id: 'p12', qty: 1 }]; const t = computeTotals().bundleDiscount; cart = []; return t === 0; }));
  await ev(() => { bundleDelete(1); });
  ok('bundle can be deleted', await ev(() => db.bundles.length === 1));

  // ===== similar-saree alerts =====
  await ev(() => { isAdminView = false; document.body.classList.remove('admin-on'); navigateTo('shop'); openProductDetail('p5'); });
  ok('sold-out saree offers a similar-saree alert', await ev(() => !!document.querySelector('#productModalBody .similar-btn')));
  await ev(() => closeModal('productModal'));
  await ev(() => localStorage.removeItem('ap_session')); await ev(() => openSimilarAlert('p5'));
  ok('asks to log in first', await ev(() => document.getElementById('authModal') ? document.getElementById('authModal').classList.contains('active') : true));
  await ev(() => { closeModal('authModal'); }); await login('u1'); await ev(() => openSimilarAlert('p5'));
  await ev(() => similarSubscribe('p5'));
  ok('consent required', await ev(() => db.similarAlerts.length === 0));
  await ev(() => { document.getElementById('sa-consent').checked = true; similarSubscribe('p5'); });
  ok('alert saved with consent and a ±30% price band', await ev(() => db.similarAlerts.length === 1 && db.similarAlerts[0].min === 59500 && db.similarAlerts[0].max === 110500 && db.consentLog.some(c => c.type === 'similarAlert' && c.granted && c.ref === 'p5')));
  await ev(() => { closeModal('alertModal'); openSimilarAlert('p5'); });
  ok('reopening offers to stop', await ev(() => /Stop telling me/i.test(document.getElementById('alertBody').innerText)));
  await ev(() => closeModal('alertModal'));
  await ev(() => { const a = { id: 'x', name: 'Cheap one', price: 1200, category: 'Kanjeevaram', fabric: 'Kanjeevaram Silk', stock: 1, slug: 'cheap', image: '' }; window.__c1 = notifySimilar(a); });
  ok('a saree outside the price band does not notify', await ev(() => window.__c1 === 0 && db.outbox.length === 0));
  // publish a real new saree through the product form
  await ev(() => { isAdminView = true; openProductForm(); pfSet('name', 'Wine Kanjeevaram'); pfSet('sku', 'AP-KNC-009'); pfSet('category', 'Kanjeevaram'); pfSet('price', '90000'); pfSet('stock', '1'); PF.images = ['https://img.test/k.jpg']; pfSet('description', 'A rich wine silk.'); pfSave({ preventDefault() {} }); });
  ok('publishing a matching saree queues exactly one message', await ev(() => db.products.some(x => x.sku === 'AP-KNC-009') && db.outbox.filter(m => m.type === 'similar_arrival').length === 1 && db.similarAlerts[0].status === 'notified'));
  ok('the message goes to the customer who asked', await ev(() => db.outbox[0].to === db.users.find(u => u.id === 'u1').phone && db.outbox[0].productName === 'Wine Kanjeevaram'));
  await ev(() => { notifySimilar(db.products.find(x => x.sku === 'AP-KNC-009')); });
  ok('never a second message for the same request', await ev(() => db.outbox.filter(m => m.type === 'similar_arrival').length === 1));
  await ev(() => { db.settings.otpEndpoint = 'https://otp.test/api'; });
  const sent = []; await p.route('https://otp.test/**', r => { sent.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await ev(() => { db.outbox[0].status = 'queued'; return dispatchOutbox(); }); await p.waitForTimeout(400);
  ok('sent with the similar_arrival template', sent.length === 1 && sent[0].template === 'similar_arrival');
  await ev(() => { db.settings.otpEndpoint = ''; });
  await ev(() => { const u = db.users.find(x => x.id === 'u2'); db.similarAlerts.push({ id: 'y', sourceId: 'p5', userId: 'u2', phone: u.phone, category: 'Kanjeevaram', fabric: '', min: 1, max: 999999, status: 'waiting' }); recordConsent(u, 'similarAlert', true, 't', 'p5'); recordConsent(u, 'similarAlert', false, 't', 'p5'); notifySimilar({ id: 'n2', name: 'N', price: 90000, category: 'Kanjeevaram', fabric: '', stock: 1, slug: 'n', image: '' }); });
  ok('a customer who withdrew consent is skipped, not messaged', await ev(() => db.similarAlerts.find(a => a.id === 'y').status === 'skipped' && db.outbox.filter(m => m.userId === 'u2').length === 0));
  ok('admin Alerts tab summarises similar requests', await ev(() => { switchAdminTab('alerts'); return /Similar-saree requests/.test(document.getElementById('adminContent').innerText); }));

  // ===== bulk upload =====
  const csv = ['sku,name,category,price,stock,fabric,colours,description,tags,photo_urls,video',
    'AP-NEW-001,"Teal, Gold Banarasi",Banarasi,"₹ 31,500",1,Banarasi Silk,Teal;Gold,"Heavy zari, rich pallu",wedding;bridal,https://img.test/a.jpg;https://img.test/b.jpg,',
    ',Pearl Choker,jewellery,1299,6,,,,,,',
    'AP-TUS-001,Duplicate,Tussar,1000,1,,,,,,',
    'AP-BAD-001,No category,Nowhere,1000,1,,,,,,',
    'AP-BAD-002,Bad price,Tussar,abc,1,,,,,,',
    ',,Tussar,1000,1,,,,,,'].join('\n');
  await ev(() => { isAdminView = true; document.body.classList.add('admin-on'); switchAdminTab('products'); });
  ok('Products tab has Bulk upload and CSV template buttons', await ev(() => !!document.getElementById('bulk-open') && /CSV template/.test(document.getElementById('adminContent').innerText)));
  await ev(() => openBulk()); await ev(t => { document.getElementById('bulk-text').value = t; bulkPreview(t); }, csv);
  ok('preview counts good and bad rows', await ev(() => document.getElementById('bulk-ok').textContent === '2' && document.getElementById('bulk-bad').textContent === '4'));
  ok('problems are explained per row', await ev(() => { const t = document.getElementById('bulk-preview').innerText; return /already exists/.test(t) && /category "Nowhere" does not exist/.test(t) && /price is not a number/.test(t) && /name is missing/.test(t) && /no photo/.test(t); }));
  const before = await ev(() => db.products.length);
  await p.click('#bulk-go');
  ok('only the good rows are added', await ev(b => db.products.length === b + 2, before));
  ok('quoted commas, rupee signs and lists are read correctly', await ev(() => { const x = db.products.find(y => y.sku === 'AP-NEW-001'); return x && x.name === 'Teal, Gold Banarasi' && x.price === 31500 && x.colours.join() === 'Teal,Gold' && x.images.length === 2 && x.description === 'Heavy zari, rich pallu' && x.tags.join() === 'wedding,bridal' && !!x.slug; }));
  ok('missing SKU is generated and an accessory category works; no photo gets a placeholder', await ev(() => { const x = db.products.find(y => y.name === 'Pearl Choker'); return x && /^AP-ACC-\d+$/.test(x.sku) && x.category === 'Jewellery' && isAccessory(x) && /^data:image\/svg/.test(x.image) && x.stock === 6; }));
  ok('bulk-added products show in the shop and sitemap pack', await ev(() => { closeModal('adminModal'); SHOP.kind = 'saree'; navigateTo('shop'); return sareeList().some(x => x.sku === 'AP-NEW-001') && /AP-NEW-001/.test(JSON.stringify(buildSeoPack().find(f => f.path === 'products.json').text)); }));
  const dl1 = p.waitForEvent('download'); await ev(() => bulkCsvTemplate()); const t1 = await dl1;
  ok('CSV template downloads', t1.suggestedFilename() === 'products-template.csv');
  ok('tab-separated paste (copied from a sheet) also works', await ev(() => { const r = bulkValidate('name\tprice\tcategory\nTab Saree\t2000\tTussar'); return r.rows.length === 1 && r.rows[0].ok; }));
  ok('wrong header is rejected clearly', await ev(() => !!bulkValidate('foo,bar\n1,2').error));

  // ===== status image =====
  await ev(() => { openStatusImage('p9'); });
  await p.waitForTimeout(300);
  ok('story image is 1080x1920 and drawn', await ev(() => { const c = document.getElementById('si-canvas'); return c.width === 1080 && c.height === 1920 && SI.drawn === true; }));
  await ev(() => siFmt('square')); await p.waitForTimeout(200);
  ok('square option is 1080x1080', await ev(() => document.getElementById('si-canvas').height === 1080));
  const dl2 = p.waitForEvent('download'); await p.click('#si-dl'); const t2 = await dl2;
  ok('image downloads as PNG named after the saree', /\.png$/.test(t2.suggestedFilename()) && /square/.test(t2.suggestedFilename()));
  ok('canvas is not blank (photo + text drawn)', await ev(() => { const c = document.getElementById('si-canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 0; i < d.length; i += 4000) if (d[i] < 200) ink++; return ink > 5; }));
  await ev(() => closeModal('adminModal'));
  ok('every product row has a Status button', await ev(() => { switchAdminTab('products'); return document.querySelectorAll('.status-img-btn').length === db.products.length; }));
  await ev(() => { isAdminView = false; document.body.classList.remove('admin-on'); });

  // ===== FAQ =====
  ok('footer links to the FAQ', await ev(() => [...document.querySelectorAll('footer a')].some(a => a.textContent.trim() === 'FAQ')));
  await ev(() => navigateTo('faq'));
  ok('FAQ page lists the questions, matches the policies and has FAQ structured data', await ev(() => document.querySelectorAll('.faq-item').length === 10 && /cannot be cancelled/.test(document.getElementById('faqBody').textContent) && /₹10,000/.test(document.getElementById('faqBody').textContent) && /₹199/.test(document.getElementById('faqBody').textContent) && /FAQPage/.test((document.getElementById('ld-faq') || {}).textContent || '')));
  await ev(() => { location.hash = '#/faq'; }); await p.waitForTimeout(200);
  ok('#/faq opens the FAQ', await ev(() => document.getElementById('page-faq').classList.contains('active')));
  // ===== phone width: nothing sideways =====
  await p.setViewportSize({ width: 390, height: 800 });
  for (const [name, fn] of [['home', () => navigateTo('home')], ['faq', () => navigateTo('faq')], ['shared wishlist', () => { renderSharedWishlist([db.products[0].slug]); navigateTo('wishlist'); }], ['product page with bundle', () => { navigateTo('shop'); openProductDetail('p1'); }]]) {
    await ev(fn); await p.waitForTimeout(150);
    ok('390px: no sideways scroll on ' + name, await ev(() => document.documentElement.scrollWidth <= 391));
  }
  await ev(() => closeModal('productModal'));
  ok('no JS errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
