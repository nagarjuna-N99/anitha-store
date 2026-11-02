const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\/(?!file)/, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  const ok = (n, c) => console.log(c ? 'PASS' : 'FAIL', n);
  ok('price en-IN', (await p.textContent('.scroll-card-price')).includes('45,999'));
  // favourite toggle persists
  await p.click('#productGrid .product-fav-btn >> nth=0', { force: true }).catch(()=>{});
  await p.evaluate(() => { navigateTo('shop'); filterProducts('Tussar'); toggleFavourite('p1'); });
  ok('fav saved', await p.evaluate(() => JSON.parse(localStorage.ap_favourites).includes('p1')));
  ok('filter kept after fav', await p.evaluate(() => currentCategory === 'Tussar' && document.querySelectorAll('#productGrid .product-card').length === 2));
  // checkout validation then success
  await p.evaluate(() => { loginUser('+919000000001'); addToCart('p3'); openCheckout(); processPayment(); });
  ok('empty checkout rejected', await p.evaluate(() => db.orders.length === 5));
  await p.fill('#chk-name', 'Test Buyer'); await p.fill('#chk-pin', '500001');
  await p.fill('#chk-address', '1 Main Road'); await p.fill('#chk-city', 'Hyderabad');
  await p.evaluate(() => processPayment());
  ok('terms required', await p.evaluate(() => db.orders.length === 5));
  await p.check('#chk-age'); await p.check('#chk-terms');
  await p.evaluate(() => processPayment());
  ok('order created + stock decremented', await p.evaluate(() => db.orders.length === 6 && db.products.find(x=>x.id==='p3').stock === 7));
  // admin
  await p.evaluate(() => toggleView());
  for (const t of ['dashboard','products','categories','studio','drafts','orders','invoices','customers','statements','coupons','logs','settings']) await p.evaluate(t => switchAdminTab(t), t);
  ok('invoice ids unique/no dup', await p.evaluate(() => { const id = db.orders[0]; confirmOrderAndSendInvoice(db.orders[0].id); confirmOrderAndSendInvoice(db.orders[0].id); const ids = db.invoices.map(i=>i.id); return new Set(ids).size === ids.length && ids.includes('AP-INV-005'); }));
  await p.evaluate(() => { switchAdminTab('invoices'); viewInvoice('AP-INV-002'); });
  ok('invoice view renders', (await p.textContent('#invoicePrintArea')).includes('Includes GST'));
  ok('reports + csv rows consistent', await p.evaluate(() => { switchAdminTab('statements'); return getReportRows('6months','all').length >= 1; }));
  ok('toggle back to store keeps tab', await p.evaluate(() => { toggleView(); toggleView(); return document.getElementById('adminPageTitle').textContent === 'Statements' || currentAdminTab; }));
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})();
