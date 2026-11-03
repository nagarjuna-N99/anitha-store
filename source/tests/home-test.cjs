const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const mkctx = (o = {}) => b.newContext({ viewport: { width: 1400, height: 950 }, ...o });
  const ctxt = await mkctx(); const p = await ctxt.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errs.push('console: '+m.text()));
  p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  const URL_ = 'file://' + process.cwd() + '/anitha-store.html';
  await p.goto(URL_);
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const png = await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 1200; c.height = 600; const x = c.getContext('2d'); x.fillStyle = '#7a1230'; x.fillRect(0, 0, 1200, 600); const bl = await new Promise(r => c.toBlob(r, 'image/png')); return Array.from(new Uint8Array(await bl.arrayBuffer())); });
  const upload = async (btnSel) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(btnSel)]); await fc.setFiles({ name: 'hero.png', mimeType: 'image/png', buffer: Buffer.from(png) }); };
  const H = () => p.evaluate(() => JSON.parse(JSON.stringify(db.home)));
  const strip = () => p.evaluate(() => [...document.querySelectorAll('#collection .category-item')].map(e => e.dataset.cat));

  // ===== defaults reproduce today's home page =====
  ok('default: 1 hero slide (h1), no slideshow controls', await p.evaluate(() => document.querySelectorAll('#homeHero .hero-slide').length === 1 && document.querySelector('#homeHero h1').textContent === 'The Art of Slow Weaving' && !document.querySelector('.hero-arrow') && !document.querySelector('.hero-dots') && /explore the collection/i.test(document.getElementById('homeHero').innerText)));
  ok('default: same 4 categories in the same order', (await strip()).join() === 'Tussar,Maheswari,Banarasi,Kanjeevaram');
  ok('default: arrivals + 2 signature tiles', await p.evaluate(() => getComputedStyle(document.getElementById('new-arrivals')).display !== 'none' && document.querySelectorAll('#signatureSection .curated-item').length === 2));

  // ===== admin tab =====
  await p.evaluate(() => toggleView());
  ok('admin menu has "Home Page" and it opens', await p.evaluate(() => { document.querySelector('.admin-nav-item[data-tab="home"]').click(); return document.getElementById('adminPageTitle').textContent === 'Home Page' && !!document.getElementById('hsprev-0'); }));
  ok('lists every category (4 ticked), 1 slide editor', await p.evaluate(() => document.querySelectorAll('.hc-row').length === db.categories.length && document.querySelectorAll('.hc-chk:checked').length === 4 && document.querySelectorAll('.hs').length === 1));
  ok('slide preview shows the real hero (title + button)', await p.evaluate(() => /The Art of Slow Weaving/.test(document.getElementById('hsprev-0').innerText) && /Explore the Collection/i.test(document.getElementById('hsprev-0').innerText)));

  // ===== hero slides =====
  await p.click('button:has-text("Add slide")');
  ok('add slide → editor has 2; new slide hidden on store until it has an image + warning free', await p.evaluate(() => document.querySelectorAll('.hs').length === 2 && document.querySelectorAll('#homeHero .hero-slide').length === 1));
  const img2 = p.locator('.hs >> nth=1').locator('input[placeholder^="https"]').first();
  await img2.fill('https://img.test/two.jpg'); await img2.press('Tab');
  ok('image link added → store shows 2 slides with arrows + dots (instantly)', await p.evaluate(() => document.querySelectorAll('#homeHero .hero-slide').length === 2 && document.querySelectorAll('#homeHero .hero-dots button').length === 2 && document.querySelectorAll('.hero-arrow').length === 2 && /two\.jpg/.test(document.querySelectorAll('#homeHero .hero-slide')[1].querySelector('.hero-img').getAttribute('style'))));
  const t2 = p.locator('.hs >> nth=1').locator('input[type=text]').nth(3); // title
  await p.evaluate(() => { document.querySelectorAll('.hs')[1].querySelectorAll('input[type=text]').forEach((e, i) => e.dataset.i = i); });
  const titleBox = p.locator('.hs >> nth=1').locator('label:has-text("Title") + input');
  await titleBox.fill('Wedding Season');
  ok('typing a title updates the store AND the preview live', await p.evaluate(() => document.querySelectorAll('#homeHero .hero-slide')[1].querySelector('.hero-title').textContent === 'Wedding Season' && /Wedding Season/.test(document.getElementById('hsprev-1').innerText) && document.querySelectorAll('#homeHero .hero-slide')[1].querySelector('.hero-title').tagName === 'H2'));
  await upload('.hs >> nth=1 >> button:has-text("Upload photo")');
  await p.waitForFunction(() => db.home.hero.slides[1].image.startsWith('data:image/jpeg'));
  ok('photo upload stored (resized JPEG) and shown', await p.evaluate(() => /data:image\/jpeg/.test(document.querySelectorAll('#homeHero .hero-slide')[1].querySelector('.hero-img').getAttribute('style')) && !!document.querySelector('#hsprev-1 .hero-slide')));

  // slideshow behaviour
  await p.evaluate(() => heroStep(1));
  ok('next arrow → slide 2 active, dot follows, aria updated', await p.evaluate(() => document.querySelectorAll('#homeHero .hero-slide')[1].classList.contains('active') && document.querySelectorAll('#homeHero .hero-dots button')[1].classList.contains('active') && document.querySelectorAll('#homeHero .hero-slide')[0].getAttribute('aria-hidden') === 'true'));
  await p.evaluate(() => heroStep(1));
  ok('wraps around to slide 1', await p.evaluate(() => document.querySelectorAll('#homeHero .hero-slide')[0].classList.contains('active')));
  await p.evaluate(() => heroSetting('interval', 3));
  const act0 = await p.evaluate(() => HERO.i); await p.waitForTimeout(3500);
  ok('autoplay advances every 3s', await p.evaluate(a => HERO.i !== a, act0));
  await p.evaluate(() => { HERO.paused = true; }); const act1 = await p.evaluate(() => HERO.i); await p.waitForTimeout(3300);
  ok('autoplay pauses while hovering', await p.evaluate(a => HERO.i === a, act1));
  await p.evaluate(() => { HERO.paused = false; heroSetting('autoplay', false); }); const act2 = await p.evaluate(() => HERO.i); await p.waitForTimeout(3400);
  ok('autoplay can be switched off', await p.evaluate(a => HERO.i === a, act2));
  await p.evaluate(() => heroSetting('autoplay', true));

  // appearance + buttons
  await p.evaluate(() => document.querySelectorAll('.hs-fold').forEach(d => { d.open = true; })); await p.waitForTimeout(150);
  const s1 = p.locator('.hs >> nth=0');
  await s1.locator('label:has-text("Text position") + select').selectOption('center');
  await s1.locator('label:has-text("Photo focus") + select').selectOption('top');
  await p.evaluate(() => { const r = document.querySelector('.hs input[type=range]'); r.value = 0; r.dispatchEvent(new Event('input')); });
  ok('text position, photo focus and overlay apply', await p.evaluate(() => { const el = document.querySelector('#homeHero .hero-slide'); return el.classList.contains('pos-center') && /50% 0%/.test(el.querySelector('.hero-img').getAttribute('style')) && /rgba\(30,25,20,0\.00\)/.test(el.querySelector('.hero-shade').getAttribute('style')); }));
  await s1.locator('label:has-text("Button opens") + div select').first().selectOption('category');
  await s1.locator('label:has-text("Button opens") + div select').nth(1).selectOption('Paithani');
  await p.evaluate(() => navigateTo('home')); await p.evaluate(() => document.querySelector('#homeHero .btn-primary').click());
  ok('button → category page (Paithani)', await p.evaluate(() => document.getElementById('page-shop').classList.contains('active') && currentCategory === 'Paithani'));
  await p.evaluate(() => { heroLinkType(0, 'product'); heroLinkValue(0, 'p2'); navigateTo('home'); heroGo('hs1'); });
  ok('button → a specific product', await p.evaluate(() => document.getElementById('productModal').classList.contains('active') && /Mustard Peacock/.test(document.getElementById('productModalBody').innerText)));
  await p.evaluate(() => { closeModal('productModal'); heroLinkType(0, 'page'); heroLinkValue(0, 'care'); heroGo('hs1'); });
  ok('button → a page (Saree Care)', await p.evaluate(() => document.getElementById('page-care').classList.contains('active')));
  await p.evaluate(() => { heroLinkType(0, 'page'); heroLinkValue(0, 'privacy'); heroGo('hs1'); });
  ok('button → Privacy Policy page', await p.evaluate(() => document.getElementById('page-privacy').classList.contains('active')));
  await p.evaluate(() => { window.__opened = null; window.open = (u, t, f) => { window.__opened = [u, t, f]; }; heroLinkType(0, 'url'); heroLinkValue(0, 'javascript:alert(1)'); heroGo('hs1'); });
  ok('unsafe website link is refused', await p.evaluate(() => window.__opened === null && db.home.hero.slides[0].link.value === ''));
  await p.evaluate(() => { heroLinkValue(0, 'https://example.org/sale'); heroGo('hs1'); });
  ok('website link opens in a new tab safely', await p.evaluate(() => window.__opened && window.__opened[0] === 'https://example.org/sale' && /noopener/.test(window.__opened[2])));
  await p.evaluate(() => heroLinkType(0, 'none'));
  ok('"No button" removes the button from that slide only', await p.evaluate(() => { const sl = document.querySelectorAll('#homeHero .hero-slide'); return !sl[0].querySelector('.btn-primary') && !!sl[1].querySelector('.btn-primary'); }));
  await p.evaluate(() => { heroLinkType(0, 'shop'); });

  // hide / delete
  await p.evaluate(() => { document.querySelectorAll('.hs')[1].querySelector('.toggle').click(); });
  ok('hiding a slide → store back to 1 slide, no slideshow controls', await p.evaluate(() => document.querySelectorAll('#homeHero .hero-slide').length === 1 && !document.querySelector('.hero-dots') && !!document.querySelector('.hs.off')));
  await p.evaluate(() => { document.querySelectorAll('.hs')[0].querySelector('.toggle').click(); });
  ok('all slides hidden → hero removed + warning in admin', await p.evaluate(() => document.getElementById('homeHero').innerHTML.trim() === '' && /No visible slide/.test(document.getElementById('adminContent').innerText)));
  await p.evaluate(() => { document.querySelectorAll('.hs')[0].querySelector('.toggle').click(); });
  await p.evaluate(() => { document.querySelectorAll('.hs')[1].querySelector('.toggle').click(); });
  await p.evaluate(() => heroMove(1, -1));
  ok('reorder slides', await p.evaluate(() => db.home.hero.slides[0].title === 'Wedding Season' && document.querySelector('#homeHero h1').textContent === 'Wedding Season'));
  await p.evaluate(() => heroDel(0));
  ok('delete slide', await p.evaluate(() => db.home.hero.slides.length === 1 && db.home.hero.slides[0].title === 'The Art of Slow Weaving' && document.querySelectorAll('.hs').length === 1));

  // ===== categories =====
  await p.evaluate(() => { document.querySelectorAll('.hc-chk')[0].click(); });
  ok('untick Tussar → removed from the home strip instantly', (await strip()).join() === 'Maheswari,Banarasi,Kanjeevaram');
  const pi = await p.evaluate(() => db.home.categories.items.findIndex(i => i.category === 'Paithani'));
  await p.evaluate(i => document.querySelectorAll('.hc-chk')[i].click(), pi);
  const pimg = await p.evaluate(() => document.querySelector('#collection .category-item[data-cat="Paithani"] img').getAttribute('src'));
  ok('tick Paithani → appears, using its newest product photo automatically', (await strip()).includes('Paithani') && pimg === await p.evaluate(() => db.products.find(x => x.category === 'Paithani').image));
  for (let k = 0; k < 8; k++) await p.evaluate(() => { const i = db.home.categories.items.findIndex(x => x.category === 'Paithani'); if (i > 0) homeCatMove(i, -1); });
  ok('move up/down sets the order', (await strip())[0] === 'Paithani' && (await p.evaluate(() => db.home.categories.items[0].category)) === 'Paithani');
  const pi2 = await p.evaluate(() => db.home.categories.items.findIndex(i => i.category === 'Paithani'));
  await p.evaluate(i => homeCatImage(i, 'https://img.test/paithani.jpg'), pi2);
  ok('custom photo link', await p.evaluate(() => document.querySelector('#collection .category-item[data-cat="Paithani"] img').getAttribute('src') === 'https://img.test/paithani.jpg'));
  await p.evaluate(i => homeCatImage(i, 'javascript:alert(1)'), pi2);
  ok('unsafe photo link refused', await p.evaluate(() => db.home.categories.items[0].image === 'https://img.test/paithani.jpg'));
  await upload('.hc-row >> nth=0 >> button:has-text("Upload")');
  await p.waitForFunction(() => db.home.categories.items[0].image.startsWith('data:image/jpeg'));
  ok('upload a category photo', await p.evaluate(() => /^data:image\/jpeg/.test(document.querySelector('#collection .category-item').querySelector('img').getAttribute('src'))));
  await p.click('.hc-row >> nth=0 >> button:has-text("Auto")');
  ok('"Auto" returns to the product photo', await p.evaluate(() => document.querySelector('#collection .category-item img').getAttribute('src') === db.products.find(x => x.category === 'Paithani').image));
  await p.click('.hs-bar button:text-is("Clear")');
  ok('Clear → no categories → strip hidden', await p.evaluate(() => getComputedStyle(document.getElementById('collection')).display === 'none'));
  await p.click('button:has-text("Select all")');
  ok('Select all → every category shown', await p.evaluate(() => document.querySelectorAll('#collection .category-item').length === db.categories.length));
  const stripTog = () => p.evaluate(() => [...document.querySelectorAll('.admin-card')].find(c => /Categories on the home page/.test(c.innerText)).querySelector('.hs-bar .toggle').click());
  await stripTog();
  ok('"Show this strip" off hides the whole strip', await p.evaluate(() => db.home.categories.show === false && getComputedStyle(document.getElementById('collection')).display === 'none'));
  await stripTog();
  ok('…and on shows it again', await p.evaluate(() => db.home.categories.show !== false && getComputedStyle(document.getElementById('collection')).display !== 'none'));
  await p.evaluate(() => { homeCatAll(false); ['Tussar', 'Maheswari', 'Banarasi', 'Kanjeevaram'].forEach(c => { db.home.categories.items.find(i => i.category === c).enabled = true; }); homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); });
  // new/deleted category
  await p.evaluate(() => { switchAdminTab('categories'); openCategoryForm(); document.getElementById('cat-name').value = 'Cotton'; handleAddCategory({ preventDefault() {} }); switchAdminTab('home'); });
  ok('a new category appears in the Home editor, unticked, and not on the store', await p.evaluate(() => { const r = [...document.querySelectorAll('.hc-row')].find(x => /Cotton/.test(x.innerText)); return r && !r.querySelector('.hc-chk').checked && !document.querySelector('#collection .category-item[data-cat="Cotton"]'); }));
  await p.evaluate(() => { db.categories = db.categories.filter(c => c !== 'Cotton'); syncHomeCats(); renderHomeAdmin(document.getElementById('adminContent')); });
  ok('a deleted category disappears from the Home editor', await p.evaluate(() => ![...document.querySelectorAll('.hc-row')].some(x => /Cotton/.test(x.innerText)) && !db.home.categories.items.some(i => i.category === 'Cotton')));
  await p.evaluate(() => { toggleView(); });
  await p.evaluate(() => document.querySelector('#collection .category-item').click());
  ok('clicking a home category tile opens that category in the shop', await p.evaluate(() => document.getElementById('page-shop').classList.contains('active') && currentCategory === document.querySelector('#collection .category-item').dataset.cat));
  await p.evaluate(() => { navigateTo('home'); toggleView(); switchAdminTab('home'); });

  // ===== other sections =====
  const sec = i => p.locator('.hs-sec >> nth=' + i);
  await sec(0).locator('label:has-text("Title") + input').fill('Just In');
  await sec(0).locator('label:has-text("Small heading") + input').fill('Fresh from the loom');
  ok('arrivals heading text updates live', await p.evaluate(() => document.getElementById('arrTitle').textContent === 'Just In' && document.getElementById('arrLabel').textContent === 'Fresh from the loom'));
  await p.evaluate(() => { [...document.querySelectorAll('.hs-sec')][0].querySelector('.toggle').click(); });
  ok('hide New Arrivals', await p.evaluate(() => getComputedStyle(document.getElementById('new-arrivals')).display === 'none'));
  await p.evaluate(() => { [...document.querySelectorAll('.hs-sec')][0].querySelector('.toggle').click(); });
  await p.evaluate(() => { document.querySelectorAll('.sg-row')[0].querySelector('input[type=text]').value = ''; });
  await p.locator('.sg-row >> nth=0').locator('label:text-is("Title") + input').fill('Bridal Silks');
  ok('signature tile text updates live', await p.evaluate(() => document.querySelector('#signatureSection .curated-item h3').textContent === 'Bridal Silks'));
  await p.click('button:has-text("Add collection")');
  ok('add collection (hidden on store until it has a photo)', await p.evaluate(() => document.querySelectorAll('.sg-row').length === 3 && document.querySelectorAll('#signatureSection .curated-item').length === 2));
  await upload('.sg-row >> nth=2 >> button:has-text("Upload")');
  await p.waitForFunction(() => db.home.signature.tiles[2].image.startsWith('data:image/jpeg'));
  ok('photo added → 3 tiles on store', await p.evaluate(() => document.querySelectorAll('#signatureSection .curated-item').length === 3));
  await p.evaluate(() => sigMove(2, -1)); await p.evaluate(() => sigDel(0));
  ok('reorder + delete collection', await p.evaluate(() => db.home.signature.tiles.length === 2 && document.querySelectorAll('.sg-row').length === 2));
  await p.evaluate(() => { document.querySelectorAll('.hs-sec')[1].querySelector('.toggle').click(); });
  ok('hide the whole signature section', await p.evaluate(() => getComputedStyle(document.getElementById('signatureSection')).display === 'none'));
  await p.evaluate(() => { document.querySelectorAll('.hs-sec')[1].querySelector('.toggle').click(); });

  // ===== persistence =====
  await p.waitForFunction(() => /Saved/.test(document.getElementById('home-status').textContent));
  ok('"Saved — live on your store" status shown', true);
  await p.reload();
  ok('everything survives a reload', await p.evaluate(() => document.querySelector('#homeHero h1').textContent === 'The Art of Slow Weaving' && document.getElementById('arrTitle').textContent === 'Just In' && document.querySelectorAll('#collection .category-item').length === 4 && document.querySelectorAll('#signatureSection .curated-item').length === 2));
  await p.evaluate(() => { toggleView(); switchAdminTab('home'); heroSet(0, 'title', 'Typed then instantly reloaded'); });
  await p.reload();
  ok('a change made right before leaving the page is not lost', await p.evaluate(() => db.home.hero.slides[0].title === 'Typed then instantly reloaded'));
  await p.evaluate(() => { toggleView(); });
  ok('"View home page" shortcut', await p.evaluate(() => { toggleView(); switchAdminTab('home'); viewHome(); return !isAdminView && document.getElementById('page-home').classList.contains('active'); }));

  // ===== old saved data without home settings =====
  await p.evaluate(() => { const d = JSON.parse(localStorage.ap_db_v70); delete d.home; localStorage.ap_db_v70 = JSON.stringify(d); });
  await p.reload();
  ok('older saved shops (no home settings) load with the original home page', await p.evaluate(() => document.querySelectorAll('#homeHero .hero-slide').length === 1 && document.querySelectorAll('#collection .category-item').length === 4));

  // ===== mobile + reduced motion =====
  await p.evaluate(() => { toggleView(); switchAdminTab('home'); });
  const m = await mkctx({ viewport: { width: 400, height: 800 } }); const mp = await m.newPage(); await mp.route(/^https?:\/\//, r => r.abort()); mp.on('dialog', d => d.accept('1234'));
  await mp.goto(URL_); await mp.evaluate(() => { heroAdd(); db.home.hero.slides[1].image = 'https://img.test/m.jpg'; renderHero(); });
  ok('mobile: hero fits the screen with arrows + dots', await mp.evaluate(() => { const h = document.querySelector('.hero-slider').getBoundingClientRect(); return h.width <= innerWidth && document.documentElement.scrollWidth <= innerWidth + 1 && !!document.querySelector('.hero-arrow'); }));
  await mp.evaluate(() => { toggleView(); switchAdminTab('home'); });
  ok('mobile: admin Home editor has no sideways scrolling', await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await m.close();
  const rm = await mkctx({ reducedMotion: 'reduce' }); const rp = await rm.newPage(); await rp.route(/^https?:\/\//, r => r.abort());
  await rp.goto(URL_); await rp.evaluate(() => { heroAdd(); db.home.hero.slides[1].image = 'https://img.test/m.jpg'; db.home.hero.interval = 3; renderHero(); }); const r0 = await rp.evaluate(() => HERO.i); await rp.waitForTimeout(3500);
  ok('reduced-motion visitors get no autoplay', await rp.evaluate(a => HERO.i === a, r0));
  await rm.close();
  console.log('page errors:', errs.length ? errs : 'none');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await b.close();
})();
