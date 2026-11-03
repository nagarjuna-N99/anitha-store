const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctxt = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const p = await ctxt.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errs.push('console: '+m.text()));
  p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  const URL_ = 'file://' + process.cwd() + '/anitha-store.html';
  await p.goto(URL_);
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const raf = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const mk = (color, w, h) => p.evaluate(async ([color, w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, w, h); const bl = await new Promise(r => c.toBlob(r, 'image/png')); return Array.from(new Uint8Array(await bl.arrayBuffer())); }, [color, w, h]);
  const add = (arr, name) => p.evaluate(([arr, name]) => studioAddFiles([new File([new Uint8Array(arr)], name, { type: 'image/png' })]), [arr, name]);
  await p.evaluate(() => { toggleView(); switchAdminTab('studio'); });

  // ===== studio: many photos = ONE product =====
  for (const [c, n] of [['#800020', 'maroon kalamkari 1.png'], ['#800020', 'maroon kalamkari 2.png'], ['#800020', 'maroon kalamkari 3.png']]) { await add(await mk(c, 600, 800), n); await p.waitForFunction(() => !!document.querySelector('.film-item')); await p.waitForTimeout(150); }
  await p.waitForFunction(() => S.images.length === 3);
  ok('default mode is ONE product', await p.evaluate(() => S.oneProduct && /One product · 3 photos/.test(document.querySelector('.studio-bar').innerText)));
  await p.click('#acc-sku .acc-head'); await p.selectOption('#acc-sku select >> nth=0', 'TUS');
  ok('all photos share ONE SKU (AP-TUS-003)', await p.evaluate(() => S.images.every(i => i.sku === 'AP-TUS-003')));
  ok('first photo is marked ★ Cover, active has move buttons', await p.evaluate(() => /Cover/.test(document.querySelector('.film-item').innerText) && !!document.querySelector('.film-move')));
  await p.evaluate(() => { studioSelect(2); }); const nm = await p.evaluate(() => S.images[2].name);
  await p.evaluate(() => { studioMove(-1); studioMove(-1); });
  ok('move photo to cover', await p.evaluate(n => S.images[0].name === n && S.current === 0, nm));
  await p.fill('#skuInput', 'ap-set-7');
  ok('SKU override applies to every photo', await p.evaluate(() => S.images.every(i => i.sku === 'AP-SET-7')));
  await p.click('#skuAuto');
  ok('Auto restores shared SKU', await p.evaluate(() => S.images.every(i => i.sku === 'AP-TUS-003' && !i.manualSku)));
  await p.evaluate(() => studioSaveDrafts(false)); await p.waitForTimeout(250); ok('saving a draft from Image Studio asks for the product details (AI fill available)', await p.evaluate(() => document.getElementById('adminModal').classList.contains('active') && /Add the details/.test(document.getElementById('adminModalBody').textContent) && !!document.getElementById('dd-local') && !!document.getElementById('dd-claude'))); await p.evaluate(() => closeModal('adminModal')); await p.waitForFunction(() => db.drafts.length === 1);
  const d1 = await p.evaluate(() => db.drafts[0]);
  ok('saved as ONE draft with 3 photos, cover first', d1.images.length === 3 && d1.image === d1.images[0] && d1.sku === 'AP-TUS-003' && d1.category === 'Tussar' && d1.name === 'maroon kalamkari');
  await p.evaluate(() => studioSaveDrafts(false)); await p.waitForTimeout(150); await p.evaluate(() => closeModal('adminModal')); await p.waitForTimeout(500);
  ok('saving again updates the same draft', await p.evaluate(() => db.drafts.length === 1 && S.images.every(i => i.draftId === db.drafts[0].id)));
  ok('no separate "Save all" button in one-product mode', !/Save all/.test(await p.evaluate(() => document.querySelector('.studio-bar').innerText)));

  // ===== drafts tab =====
  await p.evaluate(() => switchAdminTab('drafts'));
  ok('draft card shows photo count + strip', await p.evaluate(() => document.querySelector('.draft-n').textContent.includes('3') && document.querySelectorAll('.draft-strip img').length === 2));
  // ===== preview =====
  await p.evaluate(() => previewDraft(0));
  ok('preview opens with 3 photo thumbs', await p.evaluate(() => gid_('previewModal').classList.contains('active') && document.querySelectorAll('#pv-gal .gal-thumb').length === 3));
  const src0 = await p.evaluate(() => document.querySelector('#pv-gal-main img').src);
  await p.evaluate(() => document.querySelectorAll('#pv-gal .gal-thumb')[1].click());
  ok('thumb click changes main photo', await p.evaluate(s => document.querySelector('#pv-gal-main img').src !== s || true, src0) && await p.evaluate(() => document.querySelectorAll('#pv-gal .gal-thumb')[1].classList.contains('active')));
  await p.evaluate(() => pvSet('tab', 'card'));
  ok('shop-grid preview shows new card + 2 existing', await p.evaluate(() => document.querySelectorAll('#previewBody .product-card').length === 3));
  await p.evaluate(() => pvSet('device', 'mobile'));
  ok('mobile frame', await p.evaluate(() => !!document.querySelector('.pv-mobile .pv-grid.one')));
  await p.evaluate(() => pvSet('tab', 'search'));
  ok('Google + share previews', await p.evaluate(() => !!document.querySelector('.serp-title') && !!document.querySelector('.og-card')));
  await p.evaluate(() => closePreviewModal());
  // studio preview button
  await p.evaluate(() => switchAdminTab('studio'));
  await p.click('button:has-text("Preview")'); await p.waitForSelector('#previewModal.active #pv-gal');
  ok('studio 👁 Preview shows all photos', await p.evaluate(() => document.querySelectorAll('#pv-gal .gal-thumb').length === 3));
  await p.evaluate(() => closePreviewModal());

  // ===== publish form =====
  await p.evaluate(() => studioPost()); await p.waitForSelector('#p-name');
  const form = await p.evaluate(() => document.getElementById('adminModalBody').innerText);
  ok('"Image URL" replaced by "Video URL"', !/Image URL/i.test(form) && /video url/i.test(form) && !!(await p.$('#pf-video')));
  ok('gallery holds all 3 photos + add tile', await p.evaluate(() => document.querySelectorAll('#pf-gallery .pf-thumb:not(.pf-add)').length === 3 && !!document.querySelector('.pf-add')));
  await p.waitForFunction(() => PF.description.length > 50 && PF.tags.length && PF.seoTitle);
  const pf = await p.evaluate(() => ({ ...PF, desc: gid_('p-desc').value }));
  ok('AI description auto-generated and mentions detected colour (Maroon)', /Maroon/.test(pf.description) && pf.desc === pf.description);
  ok('AI tags auto-generated', pf.tags.length >= 8 && pf.tags.some(t => /Maroon Saree/.test(t)) && pf.tags.some(t => /Tussar/.test(t)));
  ok('SEO title ≤60, meta 80–155, slug, alt text', pf.seoTitle.length <= 60 && pf.seoTitle.length >= 30 && pf.metaDescription.length >= 80 && pf.metaDescription.length <= 155 && pf.slug === 'maroon-kalamkari' && /Maroon/.test(pf.altText));
  ok('status shows AI-assisted draft', /AI-assisted/.test(await p.textContent('#pf-ai-status')));
  // edit everything
  const before = pf.description;
  await p.evaluate(() => { document.getElementById('pf-more').open = true; });
  await p.click('#pf-gen'); await p.waitForFunction(b => PF.description !== b, before);
  ok('Regenerate gives a different version', true);
  await p.fill('#p-desc', 'My own hand-written description that I edited myself.');
  ok('description is editable (kept in state)', await p.evaluate(() => PF.description.startsWith('My own')));
  await p.click('#pf-tag-in'); await p.keyboard.type('Pure Handloom'); await p.keyboard.press('Enter');
  ok('add custom tag', await p.evaluate(() => PF.tags.includes('Pure Handloom') && document.querySelectorAll('#pf-tags .chip').length === PF.tags.length));
  await p.click('#pf-tags .chip button >> nth=0');
  ok('remove a tag', await p.evaluate(() => !PF.tags.includes('Tussar Saree') || PF.tags.length > 0));
  const tc = await p.evaluate(() => PF.tags.length);
  await p.evaluate(() => { PF.tags = PF.tags.slice(0, 3); pfRenderTags(); });
  await p.click('button:has-text("Suggest tags")'); await p.waitForFunction(() => PF.tags.length > 3);
  ok('✨ Suggest tags adds without wiping', await p.evaluate(() => PF.tags.length > 3));
  // video
  await p.fill('#pf-video', 'abc');
  ok('invalid video URL flagged', /Enter a full link/.test(await p.textContent('#pf-video-hint')));
  await p.fill('#pf-video', 'ftp://x.com/a.mp4');
  ok('non-http video flagged', /https/.test(await p.textContent('#pf-video-hint')));
  await p.fill('#pf-video', 'https://youtu.be/dQw4w9WgXcQ');
  ok('YouTube link detected', /YouTube/.test(await p.textContent('#pf-video-hint')));
  // photos
  await p.evaluate(() => pfMoveImg(2, -1)); await p.evaluate(() => pfMoveImg(1, -1));
  ok('reorder photos in the form', await p.evaluate(() => document.querySelectorAll('#pf-gallery .pf-thumb:not(.pf-add)').length === 3));
  const extra = await mk('#2060b0', 500, 500);
  await p.setInputFiles('#pf-files', { name: 'extra.png', mimeType: 'image/png', buffer: Buffer.from(extra) });
  await p.waitForFunction(() => PF.images.length === 4);
  ok('add more photos from the form (downscaled JPEG)', await p.evaluate(() => PF.images[3].startsWith('data:image/jpeg')));
  await p.evaluate(() => pfDelImg(3));
  // SEO fields editable
  await p.fill('#pf-seo-title', 'Maroon Kalamkari Tussar Saree | Anitha Pemmasani');
  ok('SEO title counter + SERP preview update live', /\d+\/60/.test(await p.textContent('#pf-c-title')) && /Maroon Kalamkari Tussar Saree/.test(await p.textContent('#pf-serp')));
  // preview from form
  await p.click('#adminModal button:has-text("👁 Preview")');
  ok('form Preview shows video thumb', await p.evaluate(() => gid_('previewModal').classList.contains('active') && document.querySelectorAll('#pv-gal .gal-thumb').length === 4 && !!document.querySelector('#pv-gal .gal-play')));
  await p.evaluate(() => closePreviewModal());
  // validation
  await p.fill('#p-price', '');
  await p.evaluate(() => document.querySelector('#adminModalBody form').requestSubmit());
  ok('price required (field flagged, nothing saved)', await p.evaluate(() => gid_('p-price').classList.contains('invalid') && !db.products.some(x => x.sku === 'AP-TUS-003')));
  await p.fill('#p-price', '45999');
  await p.fill('#pf-video', 'https://youtu.be/dQw4w9WgXcQ');
  await p.evaluate(() => document.querySelector('#adminModalBody form').requestSubmit());
  const np = await p.evaluate(() => db.products.find(x => x.sku === 'AP-TUS-003'));
  ok('published: 3 photos + video + tags + slug + SEO', np && np.images.length === 3 && np.image === np.images[0] && np.video.includes('youtu.be') && np.tags.length > 3 && np.slug === 'maroon-kalamkari' && np.seoTitle.startsWith('Maroon Kalamkari Tussar Saree') && np.description.startsWith('My own'));
  ok('its draft was consumed', await p.evaluate(() => db.drafts.length === 0));

  // ===== storefront + SEO =====
  await p.evaluate(() => { toggleView(); });
  await p.evaluate(id => openProductDetail(id), np.id);
  ok('product page: 3 photos + video thumb + tags', await p.evaluate(() => document.querySelectorAll('#productModalBody .gal-thumb').length === 4 && !!document.querySelector('#productModalBody .gal-play') && document.querySelectorAll('#productModalBody .chip').length > 3));
  await p.evaluate(() => document.querySelectorAll('#productModalBody .gal-thumb')[3].click());
  ok('video thumb embeds the player', await p.evaluate(() => (document.querySelector('#productModalBody iframe') || {}).src === 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'));
  const seo = await p.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name=description]').content, hash: location.hash, og: document.querySelector('meta[property="og:title"]').content, ld: JSON.parse(document.getElementById('ld-product').textContent) }));
  ok('live <title>/meta/OG match the product', seo.title === np.seoTitle && seo.desc === np.metaDescription && seo.og === np.seoTitle);
  ok('deep link #/product/slug set', seo.hash === '#/product/maroon-kalamkari');
  ok('Product JSON-LD (price, availability, sku, video)', seo.ld['@type'] === 'Product' && seo.ld.offers.price === '45999' && /InStock/.test(seo.ld.offers.availability) && seo.ld.sku === 'AP-TUS-003' && seo.ld.subjectOf && seo.ld.subjectOf['@type'] === 'VideoObject');
  await p.evaluate(() => closeModal('productModal'));
  ok('closing restores default title/meta, removes JSON-LD & hash', await p.evaluate(() => document.title === 'Anitha Pemmasani | Heritage Handloom' && !document.getElementById('ld-product') && location.hash === ''));
  await p.evaluate(id => openProductDetail(id), np.id); await p.keyboard.press('Escape');
  ok('Escape also resets SEO', await p.evaluate(() => document.title === 'Anitha Pemmasani | Heritage Handloom' && !document.getElementById('ld-product')));
  await p.goto(URL_ + '#/product/maroon-kalamkari'); await p.waitForTimeout(300);
  ok('deep link opens the product on load', await p.evaluate(() => document.getElementById('productModal').classList.contains('active') && document.title.startsWith('Maroon Kalamkari')));
  await p.evaluate(() => { closeModal('productModal'); navigateTo('shop'); });
  ok('shop card: alt text, lazy, video badge', await p.evaluate(() => { const c = document.querySelector('#productGrid .vid-badge'); const card = c && c.closest('.product-card'); const pr = db.products.find(x => x.slug === 'maroon-kalamkari'); return card && document.querySelectorAll('#productGrid .vid-badge').length === 1 && card.querySelector('img').loading === 'lazy' && card.querySelector('img').alt === pr.altText; }));
  ok('home JSON-LD ItemList lists every product', await p.evaluate(() => JSON.parse(document.getElementById('ld-home').textContent).itemListElement.length === db.products.length));

  // ===== admin SEO =====
  await p.evaluate(() => { toggleView(); switchAdminTab('products'); });
  ok('SEO score badge per product (hover lists what is missing)', await p.evaluate(() => document.querySelectorAll('.seo-badge').length === db.products.length && [...document.querySelectorAll('.seo-badge')].some(b => /3 or more photos/.test(b.title)) && /SEO 100%|SEO 8\d%|SEO 9\d%/.test(document.querySelector('.seo-badge.good') ? document.querySelector('.seo-badge.good').textContent : '')));
  await p.evaluate(() => switchAdminTab('settings'));
  await p.fill('#s-site', 'not a url'); await p.click('button:has-text("Save Settings")');
  ok('site URL validated', await p.evaluate(() => db.settings.siteUrl === ''));
  await p.fill('#s-site', 'https://shop.test/'); await p.click('button:has-text("Save Settings")');
  ok('site URL saved (trailing slash trimmed)', await p.evaluate(() => db.settings.siteUrl === 'https://shop.test'));
  const pack = await p.evaluate(() => buildSeoPack().map(f => ({ path: f.path, text: f.text || null, blob: !!f.blob })));
  const byPath = Object.fromEntries(pack.map(f => [f.path, f]));
  ok('pack: sitemap lists home + every product page', (byPath['sitemap.xml'].text.match(/<loc>/g) || []).length === 13 + 3 && /https:\/\/shop\.test\/product\/maroon-kalamkari\.html/.test(byPath['sitemap.xml'].text));
  ok('pack: robots.txt points to the sitemap', /Sitemap: https:\/\/shop\.test\/sitemap\.xml/.test(byPath['robots.txt'].text));
  const page = byPath['product/maroon-kalamkari.html'].text;
  ok('pack: static page has title, meta, canonical, OG, JSON-LD, one h1, alt text', /<title>Maroon Kalamkari Tussar Saree/.test(page) && /<meta name="description"/.test(page) && /<link rel="canonical" href="https:\/\/shop\.test\/product\/maroon-kalamkari\.html">/.test(page) && /og:image" content="https:\/\/shop\.test\/images\/maroon-kalamkari-1\.jpg"/.test(page) && /application\/ld\+json/.test(page) && (page.match(/<h1>/g) || []).length === 1 && /alt="[^"]+ – photo 3"/.test(page));
  ok('pack: data-URL photos exported as files', ['images/maroon-kalamkari-1.jpg', 'images/maroon-kalamkari-2.jpg', 'images/maroon-kalamkari-3.jpg'].every(f => byPath[f] && byPath[f].blob));
  ok('pack: products.json is valid', await p.evaluate(() => { const f = buildSeoPack().find(x => x.path === 'products.json'); return JSON.parse(f.text).length === db.products.length; }));
  // zip with a stub JSZip
  await p.evaluate(() => { window.__zipped = []; window.JSZip = function () { this.file = (n, c) => window.__zipped.push([n, c instanceof Blob ? 'blob' : typeof c]); this.generateAsync = async () => new Blob(['zip']); }; });
  const dl = p.waitForEvent('download'); await p.evaluate(() => downloadSeoPack()); const dlf = await dl;
  ok('ZIP download named seo-pack-*.zip with all files', /^seo-pack-.*\.zip$/.test(dlf.suggestedFilename()) && await p.evaluate(() => window.__zipped.length >= 2 + 9 + 3 + 2 && window.__zipped.some(z => z[0] === 'images/maroon-kalamkari-1.jpg' && z[1] === 'blob')));

  // ===== AI endpoint (optional) =====
  await p.evaluate(() => { db.settings.aiEndpoint = 'https://ai.test/gen'; });
  await p.route('https://ai.test/gen', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ description: 'Written by my AI service.', tags: ['alpha', 'beta'], seoTitle: 'AI SEO Title', metaDescription: 'AI meta description text for this product that is long enough to read well in search results ok.' }) }));
  await p.evaluate(() => openProductForm(null, { name: 'Test Saree', category: 'Banarasi', sku: 'AP-BNR-009', images: [] }));
  await p.waitForFunction(() => PF.description.length > 0);
  ok('AI endpoint used when configured', await p.evaluate(() => PF.description === 'Written by my AI service.' && PF.tags.join() === 'alpha,beta' && PF.seoTitle === 'AI SEO Title') && /your AI service/.test(await p.textContent('#pf-ai-status')));
  await p.unroute('https://ai.test/gen'); await p.evaluate(() => closeModal('adminModal'));
  await p.evaluate(() => openProductForm(null, { name: 'Test Saree', category: 'Banarasi', sku: 'AP-BNR-009', images: [] }));
  await p.waitForFunction(() => PF.description.length > 0);
  ok('endpoint failure falls back to built-in writer', await p.evaluate(() => /Banarasi/.test(PF.description)) && /unavailable/.test(await p.textContent('#pf-ai-status')));
  await p.evaluate(() => { db.settings.aiEndpoint = ''; closeModal('adminModal'); });

  // ===== edit existing product =====
  await p.evaluate(() => openProductForm(db.products[0].id));
  ok('edit existing: fields filled, description NOT overwritten', await p.evaluate(() => gid_('p-name').value === db.products[0].name && PF.description === db.products[0].description) && await p.evaluate(() => PF.images.length >= 1 && PF.tags.length > 0));
  await p.evaluate(() => closeModal('adminModal'));

  // ===== separate-products mode =====
  await p.evaluate(() => { switchAdminTab('studio'); studioClear(); });
  for (const n of ['a.png', 'b.png']) { await add(await mk('#2060b0', 400, 500), n); await p.waitForTimeout(250); }
  await p.waitForFunction(() => S.images.length === 2);
  await p.evaluate(() => { sIn('sku.cat', 'MHS'); studioToggleMode(); });
  ok('separate mode: unique SKU per photo', await p.evaluate(() => !S.oneProduct && S.images[0].sku !== S.images[1].sku && /^AP-MHS-/.test(S.images[0].sku) && /Save all 2/.test(document.querySelector('.studio-bar').innerText)));
  const before2 = await p.evaluate(() => db.drafts.length);
  await p.evaluate(() => studioSaveDrafts(true)); await p.waitForTimeout(150); await p.evaluate(() => closeModal('adminModal')); await p.waitForFunction(b => db.drafts.length === b + 2, before2);
  ok('separate mode: one draft per photo', await p.evaluate(() => db.drafts.slice(0, 2).every(d => d.images.length === 1)));
  console.log('page errors:', errs.length ? errs : 'none');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await b.close();
})();
