const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234')); await p.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }; const ev = (f, a) => p.evaluate(f, a);
  const txt = () => ev(() => document.getElementById('adminContent').innerText.replace(/\s+/g, ' '));
  // known data: three orders in the last 30 days, one before
  await ev(() => { const t = ymd(new Date()), d = n => { const x = new Date(); x.setDate(x.getDate() - n); return ymd(x); };
    db.orders = [
      { id: 'T1', userId: 'u1', customer: 'A', phone: '1', total: 1000, status: 'placed', date: t, source: 'website', items: [{ productId: 'p1', name: 'P1', quantity: 2, price: 500, category: 'Tussar' }], pricing: { discount: 100 } },
      { id: 'T2', userId: 'u2', customer: 'B', phone: '2', total: 3000, status: 'delivered', date: d(3), source: 'whatsapp', items: [{ productId: 'p3', name: 'P3', quantity: 1, price: 3000, category: 'Maheswari' }], pricing: {} },
      { id: 'T3', userId: 'u1', customer: 'A', phone: '1', total: 2000, status: 'cancelled', date: d(4), items: [{ productId: 'p1', name: 'P1', quantity: 1, price: 2000, category: 'Tussar' }], pricing: {} },
      { id: 'T4', userId: 'u3', customer: 'C', phone: '3', total: 500, status: 'delivered', date: d(40), source: 'website', items: [{ productId: 'p1', name: 'P1', quantity: 1, price: 500, category: 'Tussar' }], pricing: {} }];
    db.drafts = []; toggleView(); DASH.range = '30'; DASH.metric = 'revenue'; switchAdminTab('dashboard'); });
  ok('revenue = placed orders in the period, cancelled excluded (₹4,000)', /Revenue ⓘ ₹ 4,000/i.test(await txt()));
  ok('orders = 2, average order = ₹2,000, pieces = 3', /Orders ⓘ 2/i.test(await txt()) && /Average order ⓘ ₹ 2,000/i.test(await txt()) && /Pieces sold ⓘ 3/i.test(await txt()));
  ok('discounts given = ₹100', /Discounts given ⓘ ₹ 100/i.test(await txt()));
  ok('compared with the period before (₹500): revenue up 700%', /▲ 700%/.test(await txt()));
  await ev(() => dashSet('range', '7'));
  ok('7 days: the old order drops out of the previous-period figure', /showing the last 7 days/i.test(await txt()) && /Revenue ⓘ ₹ 4,000/i.test(await txt()));
  ok('chart has one bar per day for 7 days', await ev(() => document.querySelectorAll('.dchart .bar').length === 7));
  await ev(() => dashSet('range', '90'));
  ok('90 days: weekly bars', await ev(() => document.querySelectorAll('.dchart .bar').length >= 12 && document.querySelectorAll('.dchart .bar').length <= 14));
  await ev(() => dashSet('range', 'all'));
  ok('all time: monthly bars and revenue ₹4,500', await ev(() => document.querySelectorAll('.dchart .bar').length >= 2) && /Revenue ⓘ ₹ 4,500/i.test(await txt()));
  await ev(() => dashSet('range', '30'));
  await ev(() => dashSet('metric', 'orders'));
  ok('switching to Orders re-draws the chart', /Orders over time/.test(await txt()) && await ev(() => document.querySelector('.seg button.on').textContent === 'Orders'));
  await ev(() => dashSet('metric', 'revenue'));
  const bar = await ev(() => { const bs = [...document.querySelectorAll('.dchart .bar')]; return bs.findIndex(g => /₹\s?3,000/.test(g.getAttribute('aria-label'))); });
  ok('a bar can be found for the ₹3,000 day', bar >= 0);
  await ev(i => dashPick(i), bar);
  ok('tapping a bar lists that day’s orders with a View button', await ev(() => { const d = document.getElementById('dash-detail'); return d && /T2/.test(d.textContent) && !!d.querySelector('button'); }));
  await ev(i => dashPick(i), bar);
  ok('tapping again closes it', await ev(() => !document.getElementById('dash-detail')));
  ok('status donut counts the period’s orders (3 incl. cancelled)', await ev(() => /3\s*orders/.test(document.querySelector('.donut').textContent.replace(/\s+/g, ' ')) && document.querySelectorAll('.donut circle').length === 3));
  ok('best sellers are ranked by revenue', await ev(() => { const r = [...document.querySelectorAll('.rank')].map(x => x.textContent); return /P3/.test(r[0]) && /P1/.test(r[1]); }));
  ok('sales by category and by source are shown', /Maheswari/.test(await txt()) && /WhatsApp chat ₹ 3,000/.test(await txt()) && /Website ₹ 1,000/.test(await txt()));
  ok('needs-your-attention lists the new order and links to Orders', await ev(() => { const a = [...document.querySelectorAll('.att')].find(x => /new orders to confirm/.test(x.textContent)); if (!a) return false; a.click(); return currentAdminTab === 'orders' || /Orders Management/i.test(document.querySelector('.admin-header h2').textContent); }));
  await ev(() => switchAdminTab('dashboard'));
  ok('KPI cards are clickable and open the matching tab', await ev(() => { document.querySelector('.kpi').click(); return /Orders/i.test(document.querySelector('.admin-header h2').textContent); }));
  await ev(() => { db.orders = []; db.reviews = []; db.stockAlerts = []; db.similarAlerts = []; db.outbox = []; db.drafts = []; db.products.forEach(x => { x.stock = 9; }); switchAdminTab('dashboard'); });
  ok('empty store: no errors, friendly messages, "all caught up"', /No orders in this period/.test(await txt()) && /All caught up/.test(await txt()));
  // drafts by category
  const png = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  await ev(png => { const mk = (id, sku, cat) => ({ id, sku, name: 'D ' + sku, category: cat, images: [png], image: png, size: '800x1000', date: '2026-10-28', tags: [] }); db.drafts = [mk(1, 'AP-TUS-100', 'Tussar'), mk(2, 'AP-TUS-101', 'Tussar'), mk(3, 'AP-BNR-100', 'Banarasi'), mk(4, 'AP-ACC-100', 'Jewellery'), mk(5, 'AP-XXX-1', '')]; switchAdminTab('products'); }, png);
  ok('Products tab shows saved drafts grouped by category with counts', await ev(() => { const g = [...document.querySelectorAll('.dbc-group')]; return g.length === 4 && /Tussar/.test(g[0].textContent) && /0\/2 ready/.test(g[0].textContent) && g.some(x => /Jewellery/.test(x.dataset.cat)) && g.some(x => /No category yet/.test(x.dataset.cat)); }));
  ok('category chips jump to a group', await ev(() => { const c = [...document.querySelectorAll('.dbc-chip')].find(x => /Banarasi/.test(x.textContent)); c.click(); return [...document.querySelectorAll('.dbc-group')].find(x => x.dataset.cat === 'Banarasi').open; }));
  ok('each draft keeps Publish / Preview / Edit / Delete', await ev(() => [...document.querySelectorAll('.dbc-group .draft-card')].every(c => c.querySelector('.dc-add') && c.querySelector('[onclick^="publishDraft"]') && c.querySelector('[onclick^="deleteDraft"]')) && document.querySelectorAll('.dbc-group .draft-card').length === 5));
  await ev(() => { document.querySelectorAll('.dbc-group').forEach(g => g.open = true); const c = document.querySelectorAll('.dbc-group')[1].querySelector('[onclick^="publishDraft"]'); c.click(); });
  ok('Publish from a group opens the product form for the right draft', await ev(() => document.getElementById('adminModal').classList.contains('active') && /AP-BNR-100/.test(document.getElementById('adminModalBody').innerHTML)));
  await ev(() => { closeModal('adminModal'); switchAdminTab('drafts'); });
  ok('Saved Drafts tab is grouped the same way', await ev(() => document.querySelectorAll('.dbc-group').length === 4));
  // add to cart animation
  await ev(() => { toggleView(); db.drafts = []; navigateTo('shop'); cart = []; });
  await p.hover('#productGrid .product-card >> nth=0'); await p.click('#productGrid .pc-bag >> nth=0');
  ok('add to cart plays the success animation with the cart count', await ev(() => { const a = document.getElementById('atcPop'); return a && /1\s*in your cart/.test(a.textContent) && !!a.querySelector('.atc-check') && !!a.querySelector('.atc-fill'); }));
  ok('the pressed button turns green with the check', await ev(() => !!document.querySelector('.atc-btn-done')));
  ok('the cart still opens at the same time', await ev(() => document.getElementById('cartDrawer').classList.contains('active')));
  await ev(() => { addToCart('p3'); });
  ok('a second add says "2 in your cart" and replaces the first', await ev(() => document.querySelectorAll('#atcPop').length === 1 && /2\s*in your cart/.test(document.getElementById('atcPop').textContent)));
  await p.waitForTimeout(1900);
  ok('the animation removes itself', await ev(() => !document.getElementById('atcPop')));
  ok('it never blocks taps (pointer-events none)', await ev(() => { addToCart('p3'); return getComputedStyle(document.getElementById('atcPop')).pointerEvents === 'none'; }));
  ok('no JS errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
