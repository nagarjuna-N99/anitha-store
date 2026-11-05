// Story chapters on the home page + the tidier New Arrivals cards (heart and share on the photo, View and Add on one row, two cards across on a phone).
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1216, height: 760 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(600);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));

  await ev(() => { const g = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#b88a6a"/></svg>'); db.products.forEach(x => { x.image = g; x.images = [g]; }); buildScrollTrack(); renderHome(); });
  // ---- chapters on the website ----
  const info = () => ev(() => [...document.querySelectorAll('#homeChapters .chap')].map(c => ({ no: c.querySelector('.chap-no').textContent, title: c.querySelector('.chap-title').textContent, em: (c.querySelector('.chap-title em') || {}).textContent, words: (c.querySelector('.chap-words') || {}).textContent, quote: (c.querySelector('.chap-quote p') || {}).textContent, tiles: [...c.querySelectorAll('.chap-tile')].map(t => t.dataset.cat), enter: (c.querySelector('.chap-enter') || {}).textContent })));
  let I = await info();
  ok('home: three story chapters in our own words, numbered Chapter I, II, III', I.length === 3 && I[0].no === 'Chapter I' && I[1].no === 'Chapter II' && I[2].no === 'Chapter III' && /Tuesday/.test(I[0].title) && /wedding/.test(I[1].title) && /festival/.test(I[2].title));
  ok('chapter: the starred word is set in italics, with a line of weaves, a quote with the signature, and three tiles', I[0].em === 'morning.' && /EVERYDAY|Everyday/.test(I[0].words) && /^“Light enough/.test(I[0].quote) && JSON.stringify(I[0].tiles) === JSON.stringify(['Tussar', 'Ponduru Khadi', 'Mysore Silk']) && /Enter this chapter/.test(I[0].enter));
  ok('chapter: none of the wording is copied from the reference shop', !/Tuesday morning\. Not the bride|screenshots|walk back from the market|family album/i.test(JSON.stringify(I)));
  await ev(() => document.querySelector('#homeChapters .chap-tile').click()); await sleep(300);
  ok('tapping a tile opens the Collection filtered to that category', await ev(() => document.getElementById('page-shop').classList.contains('active') && currentCategory === 'Tussar'));
  await ev(() => { navigateTo('home'); document.querySelector('#homeChapters .chap-enter').click(); }); await sleep(300);
  ok('"Enter this chapter" opens the first category of that chapter', await ev(() => document.getElementById('page-shop').classList.contains('active') && currentCategory === 'Tussar'));
  await ev(() => navigateTo('home'));

  // ---- owner: edit the chapters ----
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('home'); }); await sleep(600);
  ok('owner app, Home Page: a "Story chapters" card lists the chapters', await ev(() => !!document.getElementById('chapters-card') && document.querySelectorAll('#chapters-card .ch-item').length === 3));
  await ev(() => { const i = document.querySelector('#chapters-card .ch-item input'); i.value = 'A <b>Monday</b> *start*'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('owner: a new title shows on the website at once, and any HTML typed in it is shown as plain text', await ev(() => { const t = document.querySelector('#homeChapters .chap-title'); return !t.querySelector('b') && /<b>Monday<\/b>/.test(t.textContent) && t.querySelector('em').textContent === 'start'; }));
  await ev(() => chTile(0, 2, 'category', 'Nonexistent')); ok('owner: a tile whose category does not exist is left out instead of breaking the page', await ev(() => document.querySelectorAll('#homeChapters .chap')[0].querySelectorAll('.chap-tile').length === 2));
  await ev(() => chSet(0, 'image', 'https://own.example/big.jpg')); ok('owner: a chapter photo link is used as the big panel picture', await ev(() => /own\.example\/big\.jpg/.test(document.querySelector('#homeChapters .chap-hero').getAttribute('style'))));
  await ev(() => chSet(0, 'image', "javascript:alert(1)")); ok('owner: an unsafe photo link is never used', await ev(() => !document.querySelector('#homeChapters .chap-hero').getAttribute('style')));
  await ev(() => chToggle(1)); ok('owner: hiding a chapter removes it from the website and the others are renumbered', await ev(() => { const n = [...document.querySelectorAll('#homeChapters .chap-no')].map(e => e.textContent); return n.length === 2 && n[1] === 'Chapter II'; }));
  await ev(() => chMove(0, 1)); ok('owner: Down moves a chapter later', await ev(() => db.home.chapters.items[1].id === 'ch1'));
  await ev(() => chAdd()); ok('owner: "Add a chapter" adds a new one (up to 8) and Delete removes one', await ev(() => db.home.chapters.items.length === 4) && await ev(() => { chDel(3); return db.home.chapters.items.length === 3; }));
  await ev(() => chAllToggle()); ok('owner: the main switch hides all chapters', await ev(() => getComputedStyle(document.getElementById('homeChapters')).display === 'none'));
  await ev(() => chAllToggle()); await ev(() => chRestore()); ok('owner: "Use the 3 sample chapters" brings the originals back', await ev(() => db.home.chapters.items.length === 3 && db.home.chapters.items[0].title.includes('Tuesday')));
  await ev(() => { isAdminView = false; document.getElementById('adminView').classList.remove('active'); document.getElementById('storefrontView').classList.remove('hidden'); navigateTo('home'); renderHome(); }); await sleep(300);

  // ---- tidier New Arrivals cards (computer) ----
  await ev(() => document.getElementById('new-arrivals').scrollIntoView()); await sleep(300);
  const geo = await ev(() => { const c = document.querySelector('.scroll-card:not(.dup)'), r = x => c.querySelector(x).getBoundingClientRect(), cr = c.getBoundingClientRect(); const img = r('.scroll-card-img'), fav = r('.btn-fav-sm'), v = r('.btn-view-sm'), a = r('.btn-cart-sm'); return { favOnPhoto: fav.top >= img.top && fav.bottom <= img.bottom && fav.right <= img.right, oneRow: Math.abs(v.top - a.top) < 2, favPos: getComputedStyle(c.querySelector('.btn-fav-sm')).position }; });
  ok('New Arrivals card: the heart sits on the photo, and View and Add share one row', geo.favOnPhoto && geo.oneRow && geo.favPos === 'absolute', JSON.stringify(geo));

  // ---- phone ----
  await p.setViewportSize({ width: 390, height: 844 }); await sleep(400); await ev(() => document.getElementById('new-arrivals').scrollIntoView()); await sleep(300);
  const ph = await ev(() => { const t = document.getElementById('scrollTrack'), cs = [...t.querySelectorAll('.scroll-card:not(.dup)')], c = cs[0], cr = c.getBoundingClientRect(), vw = innerWidth, visible = cs.filter(x => { const r = x.getBoundingClientRect(); return r.left >= -2 && r.right <= vw + 2; }).length; const v = c.querySelector('.btn-view-sm').getBoundingClientRect(), a = c.querySelector('.btn-cart-sm').getBoundingClientRect(); return { w: cr.width, visible, oneRow: Math.abs(v.top - a.top) < 2, h: v.height, tapFav: c.querySelector('.btn-fav-sm').getBoundingClientRect().width }; });
  ok('phone: New Arrivals shows about two cards at a time, with View and Add side by side (40px high) and a 40px heart', ph.visible >= 2 && ph.w <= 190 && ph.oneRow && ph.h >= 40 && ph.tapFav >= 40, JSON.stringify(ph));
  const pc = await ev(() => { document.getElementById('homeChapters').scrollIntoView(); const h = document.querySelector('.chap-hero').getBoundingClientRect(), tiles = [...document.querySelectorAll('.chap')[0].querySelectorAll('.chap-tile')].map(t => t.getBoundingClientRect()); return { sq: Math.abs(h.width - h.height) < 4, two: Math.abs(tiles[0].top - tiles[1].top) < 2, wide: tiles[2] && tiles[2].width > tiles[0].width * 1.8 }; });
  ok('phone: a chapter shows a square photo panel, two tiles side by side and the third tile full width', pc.sq && pc.two && pc.wide, JSON.stringify(pc));
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
