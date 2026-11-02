const { chromium } = require(process.env.PW || 'playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
  const errs = []; let ok = true; const t = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) ok = false; };
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  await p.goto('file://' + path.resolve(__dirname, '../anitha-store.html')); await p.waitForTimeout(800);
  await p.evaluate(() => { db.orders.unshift({ id: 'ORD-T1', customer: 'Test Buyer', phone: '9876543210', date: '2026-11-02', total: 5000, status: 'packed', items: [{ productId: 'p1', name: 'Saree', sku: 'S1', quantity: 1 }], shippingAddress: { name: 'Test Buyer', street: '1-2-3 Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001', phone: '9876543210' }, timeline: [] }); renderAdminContent('orders'); });
  // dispatch list opens a page listing the packed order
  const [dl] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => printDispatchList())]);
  await dl.waitForLoadState(); const dtxt = await dl.textContent('body');
  t('dispatch list lists packed order + PIN', dtxt.includes('ORD-T1') && dtxt.includes('500001') && dtxt.includes('Tracking number'));
  const [lb] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => printLabel('ORD-T1'))]);
  await lb.waitForLoadState(); const ltxt = await lb.textContent('body');
  t('label has address, PIN and from', ltxt.includes('1-2-3 Road') && ltxt.includes('500001') && ltxt.includes('From'));
  // shipped -> dialog
  await p.evaluate(() => updateOrderStatus('ORD-T1', 'shipped')); await p.waitForTimeout(200);
  t('ship dialog opens', await p.isVisible('#sh-num'));
  t('India Post default', (await p.inputValue('#sh-courier')) === 'indiapost');
  await p.fill('#sh-num', 'EE123456789IN');
  t('link auto-filled', (await p.inputValue('#sh-link')).includes('indiapost.gov.in'));
  t('message has number', (await p.textContent('#sh-msg')).includes('EE123456789IN'));
  await p.fill('#sh-num', 'BAD1'); t('warns on bad number', (await p.textContent('#sh-warn')).includes('India Post'));
  await p.fill('#sh-num', 'EE123456789IN');
  await p.evaluate(() => { window._opened = []; const ow = window.open; window.open = (u, ...r) => { window._opened.push(u); return null; }; });
  await p.click('#sh-wa'); const u = (await p.evaluate(() => window._opened))[0] || '';
  t('whatsapp link opened with phone + text', u.startsWith('https://wa.me/919876543210?text=') && decodeURIComponent(u).includes('EE123456789IN'));
  const o = await p.evaluate(() => db.orders.find(x => x.id === 'ORD-T1'));
  t('order saved with tracking', o.trackingNo === 'EE123456789IN' && o.tracking.includes('India Post') && o.status === 'shipped');
  t('no JS errors', errs.length === 0); if (errs.length) console.log(errs);
  console.log(ok ? 'ALL PASSED' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1);
})();
