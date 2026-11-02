const { chromium } = require(process.env.PW || 'playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 } }), p = await ctx.newPage();
  let ok = true; const t = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) ok = false; }; const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  await p.goto('file://' + path.resolve(__dirname, '../anitha-store.html')); await p.waitForTimeout(800);
  await p.evaluate(() => { window.adminOn = x => { if (!isAdminView) toggleView(); switchAdminTab(x); }; });
  t('checkout has the special-instructions box', await p.evaluate(() => { const e = document.getElementById('chk-instr'); return !!e && e.maxLength === 300 && /instructions/i.test(document.querySelector('label[for=chk-instr]').textContent); }));
  // an order with instructions shows in admin table, details, slip, track page, dashboard attention
  await p.evaluate(() => { db.orders.unshift({ id: 'ORD-I1', userId: 'u1', customer: 'Req Buyer', phone: '9876543211', date: '2026-11-03', total: 4000, status: 'placed', instructions: 'Please stitch the blouse <b>fall & pico</b>', items: [{ productId: 'p1', name: 'Saree', sku: 'S1', quantity: 1 }], shippingAddress: { name: 'Req Buyer', street: 'A', city: 'B', state: 'Telangana', pincode: '500001' }, timeline: [] }); adminOn('orders'); });
  const txt = await p.evaluate(() => document.getElementById('adminContent').innerText);
  t('order list shows the request', txt.includes('fall & pico'));
  t('request is escaped (no HTML injected)', await p.evaluate(() => !document.querySelector('#adminContent b') || ![...document.querySelectorAll('#adminContent b')].some(x => x.textContent.includes('fall'))));
  const [sl] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => printSlip('ORD-I1'))]); await sl.waitForLoadState();
  const st = await sl.textContent('body'); t('packing slip shows CUSTOMER REQUEST', st.includes('CUSTOMER REQUEST') && st.includes('fall & pico'));
  t('dashboard asks you to read it', await p.evaluate(() => { adminOn('dashboard'); return /special request/.test(document.getElementById('adminContent').innerText); }));
  t('no JS errors', errs.length === 0); if (errs.length) console.log(errs);
  console.log(ok ? 'ALL PASSED' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1);
})();
