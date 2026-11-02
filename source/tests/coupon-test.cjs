const { chromium } = require(process.env.PW);
(async () => {
  const { createApp } = await import(process.cwd() + '/wa-assistant/server.mjs');
  const { validateCoupon } = await import(process.cwd() + '/wa-assistant/src/coupons.mjs');
  const { Catalogue } = await import(process.cwd() + '/wa-assistant/src/catalogue.mjs');
  const fs = require('fs'), os = require('os'), path = require('path');
  const app = createApp({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'wa-cpn-')), adminToken: 'admin-token-ui-test-1', anthropicKey: 'x', allowedOrigins: ['null'], wa: { phoneNumberId: '', token: '', appSecret: '', verifyToken: '', graphUrl: '', ownerPhone: '', ownerAlertTemplate: '' } });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + app.server.address().port; app.cfg.payments.publicUrl = base;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }; const ev = (f, a) => p.evaluate(f, a);
  const tryCode = async (code, userIdx, cartIds) => ev(([code, ui, ids]) => { setSession(db.users[ui], null); cart = ids.map(id => ({ id, qty: 1 })); saveCart(); openCart(); document.getElementById('couponInput').value = code; applyCoupon(); return { msg: document.getElementById('couponMsg').innerText, applied: appliedCoupon && appliedCoupon.code, disc: computeTotals().discount }; }, [code, userIdx, cartIds]);

  // seeds: WELCOME10 (first order only), FESTIVE20, FLAT500 (min ₹3,000)
  await ev(() => { db.users.push(newUser('+919700011111')); db.users.at(-1).name = 'Fresh Buyer'; });
  const nu = (await ev(() => db.users.length)) - 1;
  let r = await tryCode('WELCOME10', nu, ['p3']);
  ok('first-order code works for a customer with no orders', r.applied === 'WELCOME10' && r.disc === 1850);
  r = await tryCode('WELCOME10', 0, ['p3']);
  ok('first-order code refused for a returning customer, with the reason', !r.applied && /first orders only/.test(r.msg));
  await ev(() => db.coupons.push({ code: 'BIG', discount: 1000, type: 'flat', active: true, minOrder: 50000, description: 'x' }));
  r = await tryCode('BIG', nu, ['p3']);
  ok('minimum order shown with the amount still missing', !r.applied && /Minimum order ₹50,000/.test(r.msg) && /31,500/.test(r.msg));
  await ev(() => db.coupons.push({ code: 'OLD', discount: 5, type: 'percent', active: true, expiresAt: '2020-01-01' }, { code: 'CHATONLY', discount: 5, type: 'percent', active: true, channel: 'whatsapp' }));
  ok('expired code refused', /expired/.test((await tryCode('OLD', nu, ['p3'])).msg));
  ok('WhatsApp-only code refused on the website', /only on WhatsApp/.test((await tryCode('CHATONLY', nu, ['p3'])).msg));
  // use + record
  await ev(() => { db.coupons.push({ code: 'ONE', discount: 100, type: 'flat', active: true, maxUses: 1, oncePerCustomer: true }); });
  r = await tryCode('ONE', nu, ['p3']); ok('code applies', r.applied === 'ONE' && r.disc === 100);
  await ev(() => { openCheckout(); document.getElementById('couponInput').value = 'ONE'; applyCoupon(); document.getElementById('chk-name').value = 'Fresh Buyer'; document.getElementById('chk-pin').value = '500034'; document.getElementById('chk-address').value = '12 Banjara Hills'; document.getElementById('chk-city').value = 'Hyderabad'; document.getElementById('chk-terms').checked = true; processPayment(); });
  ok('the order records which code was used', await ev(() => db.orders[0].coupon === 'ONE' && db.orders[0].pricing.discount === 100));
  ok('maxUses reached → the code stops working for everyone', /fully used/.test((await tryCode('ONE', 1, ['p3'])).msg));
  await ev(() => { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); closeAllDrawers(); db.coupons.push({ code: 'EACH', discount: 50, type: 'flat', active: true, oncePerCustomer: true }); db.orders[0].coupon = 'EACH'; db.orders[0].phone = db.users[1].phone; });
  ok('once-per-customer refused for the same phone', /already used/.test((await tryCode('EACH', 1, ['p3'])).msg));
  ok('...but fine for someone else', (await tryCode('EACH', 2, ['p3'])).applied === 'EACH');

  // admin form & table
  await ev(() => { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); closeAllDrawers(); toggleView(); switchAdminTab('coupons'); });
  await p.fill('#newCouponCode', 'DIWALI15'); await p.fill('#newCouponDisc', '15'); await p.fill('#newCouponMin', '8000'); await p.fill('#newCouponMax', '25'); await p.fill('#newCouponExp', '2099-12-31');
  await p.selectOption('#newCouponChan', 'whatsapp'); await p.check('#newCouponFirst'); await p.check('#newCouponAnn'); await p.click('button:has-text("Add Coupon")');
  const nc = await ev(() => db.coupons.find(c => c.code === 'DIWALI15'));
  ok('admin can create a coupon with all rules', nc.minOrder === 8000 && nc.maxUses === 25 && nc.expiresAt === '2099-12-31' && nc.channel === 'whatsapp' && nc.firstOrderOnly && nc.announce && nc.oncePerCustomer);
  ok('table shows the rules and usage', /min ₹8,000/.test(await ev(() => document.getElementById('adminContent').innerText)) && /WhatsApp only/.test(await ev(() => document.getElementById('adminContent').innerText)));

  // reaches the assistant
  await ev(async ([b, t]) => { db.settings.assistantUrl = b; sessionStorage.setItem('wa_admin_tok', t); await waPublish(true); }, [base, 'admin-token-ui-test-1']);
  const sc = app.store.loadCatalogue(), by = c => sc.coupons.find(x => x.code === c);
  ok('coupons with their rules reach the assistant', by('DIWALI15').minOrder === 8000 && by('DIWALI15').channel === 'whatsapp' && by('FLAT500').minOrder === 3000 && by('WELCOME10').firstOrderOnly);
  ok('website coupon use reaches the assistant (so limits hold across both channels)', sc.couponUsage.EACH.total === 1 && sc.couponUsage.EACH.phones.length === 1 && sc.pastBuyers.length >= 1);
  const cat = new Catalogue(sc), cv = (code, phone, subtotal) => validateCoupon({ catalogue: cat, store: app.store, code, phone, subtotal });
  ok('assistant honours the website usage (EACH already used by that phone, free for others)', !cv('EACH', await ev(() => db.users[1].phone), 20000).ok && cv('EACH', '919999999999', 20000).ok);
  ok('assistant applies DIWALI15 to a NEW customer on a big enough order', cv('DIWALI15', '919888877777', 20000).ok && cv('DIWALI15', '919888877777', 20000).discount === 3000);
  ok('...but not below the minimum', /minimum order/.test(cv('DIWALI15', '919888877777', 5000).reason));
  ok('no script errors', errs.length === 0); if (errs.length) console.log(errs);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); app.server.close(); process.exit(fails ? 1 : 0);
})();
