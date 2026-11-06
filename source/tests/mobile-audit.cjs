// Phone audit: every page, modal, drawer and admin tab at four phone sizes.
// Reports: sideways scroll, elements off-screen, covered/overlapping controls, tiny tap targets, <16px inputs (iOS zoom),
// modals taller than the screen, clipped text, fixed-bar collisions. Usage: PW=... node tests/mobile-audit.cjs [--verbose]
const { chromium } = require(process.env.PW);
const VERBOSE = process.argv.includes('--verbose');
const SIZES = process.env.SIZES ? JSON.parse(process.env.SIZES) : process.env.FULL ? [[320, 568], [360, 740], [390, 844], [430, 932], [844, 390], [768, 1024]] : [[320, 568], [390, 844], [844, 390]];
const IMG = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><rect width='600' height='750' fill='#e9dfca'/></svg>");
const CLOSE = `document.querySelectorAll('.modal.active,.drawer.active,.mobile-nav-overlay.active,.store-mobile-nav.active,.admin-mobile-nav.active').forEach(m=>m.classList.remove('active'));document.body.style.overflow='';if(isAdminView)toggleView();window.scrollTo(0,0);`;
const ADM = `if(!isAdminView)toggleView();`;
const SCREENS = [
  ['home', `navigateTo('home')`], ['shop', `navigateTo('shop')`], ['shop+filters', `navigateTo('shop');if(!SHOP.open)shopTogglePanel()`],
  ['shop accessories', `navigateTo('shop');shopKind('accessory')`], ['shop empty result', `navigateTo('shop');shopKind('saree');shopSearch('zzzzqq',true)`],
  ['favourites', `favourites=['p1','p3','p9'];navigateTo('favourites')`], ['favourites empty', `favourites=[];navigateTo('favourites')`],
  ['faq (all open)', `navigateTo('faq');document.querySelectorAll('.faq-item').forEach(d=>d.open=true)`], ['care guide', `navigateTo('care')`],
  ['shared wishlist', `renderSharedWishlist([db.products[0].slug,db.products[2].slug]);navigateTo('wishlist')`],
  ['terms page', `navigateTo('terms')`], ['privacy page', `navigateTo('privacy')`], ['journal', `navigateTo('journal')`],
  ['menu drawer', `navigateTo('home');toggleStoreNav()`],
  ['product (saree + bundle)', `navigateTo('shop');db.products.find(x=>x.id==='p1').video='https://youtu.be/dQw4w9WgXcQ';db.products.find(x=>x.id==='p1').daylight=true;db.products.find(x=>x.id==='p1').images=['a.jpg','b.jpg','c.jpg'];openProductDetail('p1')`],
  ['product (sold out)', `navigateTo('shop');openProductDetail('p5')`], ['product (one of a kind)', `navigateTo('shop');openProductDetail('p4')`], ['product (accessory)', `navigateTo('shop');openProductDetail('p9')`],
  ['stock alert', `openStockAlert('p5')`], ['similar alert', `openSimilarAlert('p5')`], ['request similar', `openSimilarRequest('p5')`],
  ['share', `openShare('p1')`], ['share wishlist', `favourites=['p1','p3'];shareWishlist()`],
  ['cart empty', `cart=[];saveCart();openCart()`], ['cart (bundle + accessories row)', `cart=[{id:'p1',qty:1},{id:'p9',qty:1}];saveCart();openCart()`], ['cart (coupon)', `cart=[{id:'p3',qty:2}];saveCart();appliedCoupon=db.coupons.find(c=>c.code==='FLAT500');openCart()`],
  ['login', `localStorage.removeItem('ap_session');openAuth()`],
  ['checkout', `cart=[{id:'p3',qty:1}];saveCart();openCheckout()`], ['checkout (gift box open)', `cart=[{id:'p3',qty:1}];saveCart();openCheckout();const g=document.getElementById('chk-gift');if(g){g.checked=true;g.dispatchEvent(new Event('change'));const o=document.getElementById('chk-gift-other');if(o){o.checked=true;o.dispatchEvent(new Event('change'))}}`],
  ['account', `openAccount()`], ['track order', `openTrackOrder(db.orders.find(o=>o.userId==='u1').id)`], ['change address', `openAddrChange(db.orders.find(o=>o.userId==='u1').id)`],
  ['legal modal', `openLegal('terms','shipping')`], ['resume cart bar', `cart=[{id:'p3',qty:1}];saveCart();navigateTo('home');typeof resumeCartPrompt==='function'&&resumeCartPrompt()`],
  ['toast over tab bar', `navigateTo('home');showToast('Added to favourites ♥','success')`],
  ...['dashboard','home','reviews','whatsapp','delivery','alerts','products','categories','studio','drafts','orders','invoices','customers','statements','coupons','bundles','ai','social','logs','settings'].map(t => ['admin: ' + t, ADM + `switchAdminTab('${t}')`]),
  ['admin: ai (all open)', ADM + `switchAdminTab('ai');document.querySelectorAll('.ai-sec').forEach(d=>d.open=true)`],
  ['admin: drafts (ready + needs details)', ADM + `const g='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4MCcgaGVpZ2h0PScxMDAnPjxyZWN0IHdpZHRoPSc4MCcgaGVpZ2h0PScxMDAnIGZpbGw9JyM5ZmQ4YzAnLz48L3N2Zz4=';db.drafts=[{id:7001,sku:'AP-BNR-300',name:'AP-BNR-300',images:[g],image:g,size:'800x1000',date:'d',tags:[]},{id:7002,sku:'AP-TUS-300',name:'Olive Tussar',category:'Tussar',price:24500,stock:1,description:'A lovely olive tussar saree with a woven border and soft sheen.',tags:['tussar'],images:[g],image:g,size:'800x1000',date:'d'}];switchAdminTab('drafts')`],
  ['admin: draft details dialog', ADM + `const g='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4MCcgaGVpZ2h0PScxMDAnPjxyZWN0IHdpZHRoPSc4MCcgaGVpZ2h0PScxMDAnIGZpbGw9JyM5ZmQ4YzAnLz48L3N2Zz4=';db.drafts=[{id:7001,sku:'AP-BNR-300',name:'AP-BNR-300',images:[g],image:g,size:'800x1000',date:'d',tags:[]},{id:7002,sku:'AP-TUS-300',name:'Olive Tussar',category:'Tussar',price:24500,stock:1,description:'A lovely olive tussar saree with a woven border and soft sheen.',tags:['tussar'],images:[g],image:g,size:'800x1000',date:'d'}];switchAdminTab('drafts');openDraftDetails(7001, true)`],
  ['admin menu drawer', ADM + `switchAdminTab('dashboard');toggleAdminNav()`],
  ['admin: product form', ADM + `switchAdminTab('products');openProductForm('p1')`],
  ['admin: new product form', ADM + `switchAdminTab('products');openProductForm()`],
  ['admin: bulk upload', ADM + `switchAdminTab('products');openBulk();const t='sku,name,category,price\\n,Row One,Tussar,1000\\n,Row Two,Nowhere,5';document.getElementById('bulk-text').value=t;bulkPreview(t)`],
  ['admin: status image', ADM + `switchAdminTab('products');openStatusImage('p1')`],
  ['admin: preview', ADM + `openPreview(db.products[0])`],
  ['admin: order details', ADM + `switchAdminTab('orders');viewOrderDetails(db.orders[0].id)`],
  ['admin: category form', ADM + `switchAdminTab('categories');openCategoryForm()`],
];
const AUDIT = (pos) => {
  document.documentElement.style.scrollBehavior = 'auto'; document.body.style.scrollBehavior = 'auto';
  const vw = innerWidth, vh = innerHeight, out = [];
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const label = e => (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ((e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 24) ? ` "${(e.innerText || e.getAttribute('aria-label')).trim().replace(/\s+/g, ' ').slice(0, 24)}"` : ''));
  const clippedBy = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowX)) { const r = a.getBoundingClientRect(); if (r.right <= vw + 1 && r.left >= -1) return true; } } return false; };
  // topmost layer: when a modal / drawer is open only its contents count
  const layer = [...document.querySelectorAll('.modal.active,.drawer.active,.store-mobile-nav.active,.admin-mobile-nav.active')].pop();
  const root = layer || document.body;
  const inScope = e => root === document.body ? true : root.contains(e);
  if (document.documentElement.scrollWidth > vw + 1) out.push(['hscroll', `page is ${document.documentElement.scrollWidth}px wide on a ${vw}px screen`]);
  const closedDetails = e => { const d = e.parentElement && e.parentElement.closest('details:not([open])'); return !!d && !(e.closest('summary') && e.closest('summary').parentElement === d); };
  const off = e => closedDetails(e) || e.closest('.store-mobile-nav:not(.active),.admin-mobile-nav:not(.active),.drawer:not(.active),.modal:not(.active),.mobile-nav-overlay:not(.active),#adminView:not(.active)');
  const all = [...root.querySelectorAll('*')].filter(e => vis(e) && !off(e) && !/^(SCRIPT|STYLE|HEAD|META|LINK|PATH|SVG|CIRCLE|RECT|G|LINE|POLYLINE|DEFS)$/i.test(e.tagName));
  // 1. elements poking out of the screen (not inside a deliberate scroller)
  all.forEach(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); if (s.position === 'fixed' && r.bottom < 0) return; if ((r.right > vw + 1.5 || r.left < -1.5) && !e.closest('.sold-track,.recent-track,.scroll-track,.filter-container,.gal-thumbs,.cart-tabs,.admin-table-wrap,table,.scrolling-section,.pp-similar .rel-grid') && !e.parentElement.closest('.sold-track,.recent-track,.scroll-track,.filter-container,.gal-thumbs,.cart-tabs,.pv-tabs,.pp-similar .rel-grid')) out.push(['off-screen', label(e) + ` spans ${Math.round(r.left)}→${Math.round(r.right)}`]); });
  // 2. controls: size, font, covered
  const ctl = all.filter(e => e.matches('button,a[href],a[onclick],[onclick],input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]),select,textarea,summary') && !e.closest('.scroll-track .dup'));
  const seen = new Set();
  ctl.forEach(e => {
    const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh * 6) return;
    const ownText = (e.innerText || '').trim().length > 0 || e.hasAttribute('aria-label') || e.matches('input,select,textarea'); if (!ownText && e.children.length === 0 && !e.matches('input,select,textarea')) return;
    if (e.matches('a,[onclick]') && e.closest('.product-card,.sold-card,.recent-card,.scroll-card,.look-card,.occ-tile,.cart-item')) { /* whole-card taps are fine */ if (!e.matches('button')) return; }
    const m = Math.min(r.width, r.height);
    if (m < 32 && !e.closest('table') && !e.closest('.hero-preview,.hp-preview,#homeEditor .hero-slide') && !(e.matches('a.btn-primary') && e.closest('.hero-slide')) && !(e.tagName === 'A' && e.closest('p,label,span.chk,.legal-body,.consent-box,.note') && getComputedStyle(e).display === 'inline')) out.push(['tiny-tap', label(e) + ` is ${Math.round(r.width)}x${Math.round(r.height)}px`]);
    if (e.matches('input,select,textarea') && parseFloat(getComputedStyle(e).fontSize) < 16) out.push(['zoom-font', label(e) + ` font ${getComputedStyle(e).fontSize} (iOS zooms the page <16px)`]);
  });
  // reachability: scroll every control to the middle of the screen; something else must not sit on top of it
  if (pos === 'top') { const done = new Set(); let n = 0; for (const e of ctl) { if (n++ > 70) break; if (e.closest('nav .nav-links')) continue; e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; const x = Math.min(vw - 1, Math.max(1, r.left + r.width / 2)), y = r.height > vh * 0.6 ? vh / 2 : r.top + Math.min(r.height / 2, 20); if (r.height > vh * 0.9) continue; if (x < 0 || x > vw || y < 0 || y > vh) { out.push(['unreachable', label(e) + ` cannot be scrolled onto the screen (at ${Math.round(r.left)},${Math.round(r.top)})`]); continue; } const top = document.elementFromPoint(x, y); if (top && top !== e && !e.contains(top) && !top.contains(e)) { const key = label(e) + '<' + label(top); if (!done.has(key)) { done.add(key); out.push(['covered', label(e) + ' is covered by ' + label(top)]); } } } window.scrollTo(0, 0); layer && layer.querySelectorAll('.modal-content,.drawer-body').forEach(c => c.scrollTo && c.scrollTo(0, 0)); }
  // the last thing on the page must be reachable above the tab bar
  if (pos === 'bottom' && !layer) { const bar = document.getElementById('tabBar'); if (bar && vis(bar)) { const last = [...document.querySelectorAll('footer *, .page.active *')].filter(e => vis(e) && getComputedStyle(e).position !== 'fixed' && !bar.contains(e) && !e.closest('.mobile-nav-overlay,.store-mobile-nav,.admin-mobile-nav,.drawer')).map(e => e.getBoundingClientRect().bottom).sort((a, b) => b - a)[0]; if (last > bar.getBoundingClientRect().top + 2) out.push(['hidden-by-tabbar', `content ends at ${Math.round(last)}px but the tab bar starts at ${Math.round(bar.getBoundingClientRect().top)}px`]); } }
  // 3. controls overlapping each other (first let the page apply what the next screen frame would, e.g. the saree page's sticky bar hiding while its own button shows)
  if (typeof window.__buyBarSync === 'function') window.__buyBarSync();
  const awayInScroller = e => { const r = e.getBoundingClientRect(); for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const st = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(st.overflowY) && a.scrollHeight > a.clientHeight + 2) { const q = a.getBoundingClientRect(); const ih = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); if (ih < Math.min(r.height * 0.9, r.height - 1)) return true; } } return false; };
  const bar2 = document.getElementById('tabBar'); const vis2 = ctl.filter(e => { if (awayInScroller(e) || e.classList.contains('modal-close')) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh && r.left >= -1 && r.right <= vw + 1 && r.width >= 4 && !(pos !== 'bottom' && bar2 && bar2.contains(e)); });
  for (let i = 0; i < vis2.length; i++) for (let j = i + 1; j < vis2.length; j++) { const a = vis2[i], b = vis2[j]; if (a.contains(b) || b.contains(a) || (pos !== 'bottom' && bar2 && (bar2.contains(a) || bar2.contains(b)))) continue; const stuck = x => { for (let n = x; n && n !== document.body && n !== layer && !n.classList.contains('modal'); n = n.parentElement) { const ps = getComputedStyle(n).position; if (ps === 'sticky' || ps === 'fixed') return true; } return false; }; if (stuck(a) !== stuck(b)) continue; if (a.tagName === 'A' && b.tagName === 'A' && a.parentElement === b.parentElement) continue; const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top); if (w > 3 && h > 3 && (w * h) / Math.min(A.width * A.height, B.width * B.height) > 0.25) out.push(['overlap', label(a) + ' overlaps ' + label(b)]); }
  // 4. text sticking out of its own box
  all.filter(e => e.children.length === 0 && (e.innerText || '').trim().length > 2).forEach(e => { const s = getComputedStyle(e); if (e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0 && /(hidden|clip)/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && !e.matches('input,textarea,select')) out.push(['clipped-text', label(e) + ` text is ${e.scrollWidth}px in a ${e.clientWidth}px box`]); });
  // 5. modal fits the screen and can scroll to its end
  if (layer && layer.classList.contains('modal')) { const c = layer.querySelector('.modal-content'); if (c) { const r = c.getBoundingClientRect(); if (r.width > vw + 1) out.push(['modal', `modal ${Math.round(r.width)}px wide`]); const sc = getComputedStyle(c).overflowY, lsc = getComputedStyle(layer).overflowY; if (c.scrollHeight > vh * 1.02 && !/(auto|scroll)/.test(sc) && !/(auto|scroll)/.test(lsc)) out.push(['modal', `content is ${c.scrollHeight}px tall but cannot scroll (screen ${vh}px)`]); const x = layer.querySelector('.modal-close'); if (x) { const xr = x.getBoundingClientRect(); if (xr.top < 0 || xr.right > vw + 1 || xr.width < 36) out.push(['modal', `close button ${Math.round(xr.width)}x${Math.round(xr.height)} at ${Math.round(xr.left)},${Math.round(xr.top)}`]); } } }
  { const bar = document.getElementById('tabBar'); if (layer && layer.classList.contains('drawer') && bar && vis(bar) && getComputedStyle(bar).position === 'fixed' && layer.getBoundingClientRect().bottom > bar.getBoundingClientRect().top + 1) out.push(['drawer-over-tabbar', 'the open cart covers the tab bar, so Home / Shop / Wishlist cannot be tapped']); }
  // 6. fixed bars colliding (tab bar, toast, resume bar, view toggle)
  const fixed = ['#tabBar', '#toast', '#resumeBar', '#view-toggle', '.wa-float', '#cookieBar'].map(s => document.querySelector(s)).filter(e => e && vis(e) && getComputedStyle(e).position === 'fixed');
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) { const A = fixed[i].getBoundingClientRect(), B = fixed[j].getBoundingClientRect(); const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top); if (w > 4 && h > 4) out.push(['fixed-collision', label(fixed[i]) + ' collides with ' + label(fixed[j])]); }
  return out;
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const issues = {}; let screens = 0;
  for (const [w, h] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await ctx.route(/^https?:\/\//, r => /\.(jpe?g|png|webp|svg)|unsplash|images/i.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'image/svg+xml', body: IMG }) : r.abort());
    const p = await ctx.newPage(); const perr = []; p.on('pageerror', e => perr.push(e.message)); p.on('dialog', d => d.accept('1234'));
    await p.goto('file://' + process.cwd() + '/' + (process.env.FILE || 'anitha-store.html')); await p.waitForTimeout(600);
    await p.evaluate(() => { const u = db.users[0]; u.consents = u.consents || { orderUpdates: true, marketing: false, updatedAt: null }; setSession(u, null); db.settings.waNumber = '919849646440'; });
    for (const [name, code] of SCREENS.filter(x => !process.env.ONLY || x[0].includes(process.env.ONLY))) {
      await p.evaluate(CLOSE).catch(() => {}); 
      try { await p.evaluate(code); } catch (e) { (issues[`${w}|${name}`] ||= []).push(['setup', e.message.slice(0, 80)]); continue; }
      await p.waitForTimeout(650); screens++;
      if (process.env.DBG) console.log(w, name, await p.evaluate(() => [...document.querySelectorAll('.ai-sec')].map(d => { const q = d.getBoundingClientRect(); return d.dataset.k + ' ' + Math.round(q.top + scrollY) + '+' + Math.round(q.height) + (d.open ? 'o' : 'c'); }).join(' | ')));
      for (const pos of ['top', 'bottom']) {
        if (pos === 'bottom') { await p.evaluate(() => { const l = [...document.querySelectorAll('.modal.active .modal-content,.modal.active,.drawer.active .drawer-body')].pop(); (l || window).scrollTo ? (l || window).scrollTo(0, 1e6) : 0; window.scrollTo(0, 1e6); }); await p.waitForTimeout(120); }
        const res = await p.evaluate(AUDIT, pos);
        res.forEach(([k, m]) => { const key = `${w}|${name}`; (issues[key] ||= []); if (!issues[key].some(x => x[0] === k && x[1] === m)) issues[key].push([k, m]); });
      }
    }
    if (perr.length) (issues[`${w}|PAGE ERRORS`] ||= []).push(['error', perr.join(' | ').slice(0, 200)]);
    await ctx.close();
  }
  // summarise
  const byKind = {}; Object.entries(issues).forEach(([k, arr]) => arr.forEach(([kind, msg]) => { (byKind[kind] ||= []).push([k, msg]); }));
  console.log(`screens checked: ${screens} (${SCREENS.length} screens x ${SIZES.length} sizes)`);
  Object.entries(byKind).forEach(([kind, arr]) => { console.log(`\n== ${kind}: ${arr.length}`); const uniq = {}; arr.forEach(([k, m]) => { const [w, n] = k.split('|'); const id = n + ' :: ' + m; (uniq[id] ||= new Set()).add(w); }); Object.entries(uniq).slice(0, VERBOSE ? 400 : 30).forEach(([id, ws]) => console.log(`  [${[...ws].join(',')}] ${id}`)); if (Object.keys(uniq).length > (VERBOSE ? 400 : 30)) console.log(`  ... ${Object.keys(uniq).length - 30} more (use --verbose)`); });
  if (process.argv.includes('--distinct')) { Object.entries(byKind).forEach(([kind, arr]) => { const d = {}; arr.forEach(([k, m]) => { const id = m.replace(/-?\d+(\.\d+)?/g, 'N'); (d[id] ||= new Set()).add(k.split('|')[1]); }); console.log(`\n#### ${kind}: ${Object.keys(d).length} distinct`); Object.entries(d).forEach(([id, sc]) => console.log(`  ${id}   <- ${[...sc].slice(0, 3).join(' / ')}${sc.size > 3 ? ' +' + (sc.size - 3) : ''}`)); }); process.exit(0); }
  const n = Object.values(byKind).reduce((s, a) => s + a.length, 0);
  console.log(n ? `\nISSUES: ${n}` : '\nALL PASSED (nothing overlaps, overflows, is covered, too small to tap or zooms on a phone)');
  await b.close(); process.exit(n ? 1 : 0);
})();
