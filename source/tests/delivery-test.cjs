const { chromium } = require(process.env.PW);
(async () => {
  const { createApp } = await import(process.cwd() + '/wa-assistant/server.mjs');
  const fs = require('fs'), os = require('os'), path = require('path');
  const app = createApp({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'wa-dl-')), adminToken: 'admin-token-ui-test-1', anthropicKey: 'x', allowedOrigins: ['null'], wa: { phoneNumberId: '', token: '', appSecret: '', verifyToken: '', graphUrl: '', ownerPhone: '', ownerAlertTemplate: '' } });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + app.server.address().port; app.cfg.payments.publicUrl = base;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept(d.type() === 'prompt' ? (/PIN/.test(d.message()) ? '1234' : d.message().includes('link') ? 'https://courier.test/t/9' : 'DTDC 4455') : '1234'));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }; const ev = (f, a) => p.evaluate(f, a); const wait = ms => p.waitForTimeout(ms);
  const fill = o => ev(o => Object.entries(o).forEach(([k, v]) => { const e = document.getElementById(k); if (e.type === 'checkbox') e.checked = !!v; else e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }), o);

  await ev(() => { window.adminOn = t => { if (!isAdminView) toggleView(); switchAdminTab(t); }; window.storeOn = () => { if (isAdminView) toggleView(); }; });
  // ===== product page delivery check =====
  await ev(() => openProductDetail('p3'));
  await p.fill('#productModalBody .dc-row input', '500072'); await p.click('#productModalBody .dc-row button');
  ok('product page: PIN → delivery dates, state and shipping rule', /Delivery by \d+ \w+ – \d+ \w+/.test(await ev(() => document.querySelector('#productModalBody .dc-ok').innerText)) && /Telangana/.test(await ev(() => document.querySelector('#productModalBody .dc-ok').innerText)) && /₹199|Free shipping/.test(await ev(() => document.querySelector('#productModalBody .dc-ok').innerText)));
  await p.fill('#productModalBody .dc-row input', '12'); await p.click('#productModalBody .dc-row button');
  ok('product page: invalid PIN → friendly message', /valid 6-digit/.test(await ev(() => document.querySelector('#productModalBody .dc-bad').innerText)));
  await p.fill('#productModalBody .dc-row input', '790001'); await p.click('#productModalBody .dc-row button'); const remote = await ev(() => document.querySelector('#productModalBody .dc-ok strong').innerText);
  await p.fill('#productModalBody .dc-row input', '500072'); await p.click('#productModalBody .dc-row button'); const near = await ev(() => document.querySelector('#productModalBody .dc-ok strong').innerText);
  ok('remote areas take longer than Hyderabad', remote !== near);
  await ev(() => { closeModal('productModal'); openProductDetail('p4'); });
  ok('the PIN is remembered on the next saree', await ev(() => document.querySelector('#productModalBody .dc-row input').value === '500072' && !!document.querySelector('#productModalBody .dc-ok')));
  ok('"Send this as a gift" button is on the product page', await ev(() => /Send this as a gift/i.test(document.getElementById('productModalBody').innerText)));
  await ev(() => closeModal('productModal'));
  await ev(() => { addToCart('p3'); closeAllDrawers(); openCart(); });
  ok('cart shows the delivery date for the remembered PIN', /Delivery by/.test(await ev(() => document.getElementById('cartDeliv').innerText)));
  await ev(() => closeAllDrawers());

  // ===== checkout: PIN checks, saved addresses =====
  await ev(() => { const u = newUser('+919700012345'); u.name = 'Test Buyer'; db.users.push(u); setSession(u, null); cart = [{ id: 'p3', qty: 1 }]; saveCart(); openCheckout(); });
  await fill({ 'chk-name': 'Test Buyer', 'chk-address': '12 MG Road, Kukatpally', 'chk-city': 'Hyderabad', 'chk-state': 'Telangana', 'chk-pin': '500072', 'chk-terms': true });
  ok('checkout: matching PIN/city/state shows the delivery date, no warning', await ev(() => /Delivery by/.test(document.getElementById('chk-pinmsg').innerText) && !document.querySelector('#chk-pinmsg .dc-warn')));
  await fill({ 'chk-state': 'Karnataka' });
  ok('checkout: PIN/state mismatch → friendly warning naming both, NO tick box, order still allowed', await ev(() => /belongs to Telangana/.test(document.getElementById('chk-pinmsg').innerText) && /still place your order/.test(document.getElementById('chk-pinmsg').innerText) && !document.getElementById('chk-pin-ok-row')));

  await fill({ 'chk-state': 'Telangana', 'chk-city': 'Chennai' });
  ok('city in another state than the PIN → warning', await ev(() => /Chennai is in Tamil Nadu/.test(document.getElementById('chk-pinmsg').innerText)));
  await fill({ 'chk-city': 'Hyderabad', 'chk-pin': '12345' });
  ok('invalid PIN: only a warning, the order is not blocked', await ev(() => /6 digits/.test(document.getElementById('chk-pinmsg').innerText) && /still place your order/.test(document.getElementById('chk-pinmsg').innerText)));
  await ev(() => { db.settings.delivery = { ...JSON.parse(JSON.stringify(DEFAULT_DELIVERY)), blockedPincodes: '500099' }; saveDB(); });
  await fill({ 'chk-pin': '500099' });
  ok('a PIN outside your usual areas: friendly note, no date, can still order', await ev(() => /do not usually deliver/.test(document.getElementById('chk-pinmsg').innerText) && !/Delivery by/.test(document.getElementById('chk-pinmsg').innerText)));
  await ev(() => { db.settings.delivery = null; saveDB(); });
  await fill({ 'chk-pin': '500072' }); await ev(() => processPayment());
  const o1 = await ev(() => db.orders.find(o => o.phone === '+919700012345'));
  ok('valid order: stores delivery date, bill-to, address check', !!o1 && /Delivery by/.test(o1.delivery.label) && o1.billTo.pincode === '500072' && o1.addressCheck.status === 'ok' && o1.gift === null);
  ok('address saved to the address book', await ev(() => currentUser().addresses.length === 1 && currentUser().addresses[0].pincode === '500072'));

  // ===== gifting =====
  await ev(() => { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); db.settings.giftWrapFee = 99; saveDB(); openProductDetail('p4'); });
  await p.click('#productModalBody button:has-text("Send this as a gift")');
  ok('"Send as a gift" adds the saree and opens checkout with the gift box open', await ev(() => document.getElementById('checkoutModal').classList.contains('active') && document.getElementById('chk-gift').checked && document.getElementById('gift-fields').style.display !== 'none' && cart.some(c => c.id === 'p4')));
  const before = await ev(() => computeTotals().total);
  await fill({ 'chk-gift-wrap': true });
  ok('gift wrapping fee (₹99) is added to the total and shown', await ev(() => computeTotals().total) === before + 99 && /Gift wrapping/.test(await ev(() => document.getElementById('checkoutSummary').innerText)));
  await fill({ 'chk-gift-note': 'Happy Diwali, Amma!', 'chk-gift-other': true });
  ok('note card counter + recipient fields appear', /231 characters left/.test(await ev(() => document.getElementById('gift-note-count').innerText)) && await ev(() => document.getElementById('gift-recipient').style.display !== 'none'));
  await ev(() => processPayment());
  ok('recipient details are required', await ev(() => db.orders.filter(o => o.phone === '+919700012345').length === 1));
  await fill({ 'gift-name': 'Sarala Devi', 'gift-phone': '9812345678', 'gift-street': '5-4-1 Lakdikapul', 'gift-city': 'Bangalore', 'gift-state': 'Telangana', 'gift-pin': '500004' });
  ok('recipient address gets the same PIN check', /Bangalore is in Karnataka/.test(await ev(() => document.getElementById('gift-pinmsg').innerText)));
  await ev(() => { if (!document.getElementById('chk-terms').checked) document.getElementById('chk-terms').checked = true; processPayment(); });
  const o2 = await ev(() => db.orders.find(o => o.gift && o.gift.toOther));
  ok('...and the order still goes through, flagged for you to double-check', !!o2 && o2.addressCheck.status === 'mismatch' && o2.addressCheck.confirmed === true && o2.shippingAddress.city === 'Bangalore');



  ok('gift order: ships to the recipient, buyer kept as bill-to, wrap fee + note + hide-sender saved', !!o2 && o2.shippingAddress.name === 'Sarala Devi' && o2.shippingAddress.pincode === '500004' && o2.billTo.name === 'Test Buyer' && o2.gift.wrap && o2.gift.hideSender && o2.gift.fee === 99 && o2.gift.note === 'Happy Diwali, Amma!' && o2.pricing.giftWrap === 99 && o2.total === o2.pricing.subtotal + o2.pricing.shipping + 99);
  ok('recipient is saved in the address book for next time', await ev(() => currentUser().addresses.some(a => /Gift · Sarala/.test(a.label))));

  // ===== packing slip =====
  await ev(() => { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); adminOn('orders'); });
  const [pop] = await Promise.all([ctx.waitForEvent('page'), ev(id => printSlip(id), o2.id)]); await pop.waitForLoadState();
  const slip = await pop.content(); await pop.close();
  ok('packing slip: recipient, note card, gift wrap, "sender hidden"; NO buyer name, NO prices', /Sarala Devi/.test(slip) && /Happy Diwali, Amma!/.test(slip) && /GIFT WRAP/.test(slip) && /SENDER HIDDEN/.test(slip) && !/Test Buyer/.test(slip) && !/₹|Rs\./.test(slip));
  const [pop2] = await Promise.all([ctx.waitForEvent('page'), ev(id => printSlip(id), o1.id)]); await pop2.waitForLoadState(); const slip2 = await pop2.content(); await pop2.close();
  ok('normal order slip shows who it is from, still no prices', /From: Test Buyer/.test(slip2) && !/₹/.test(slip2));

  // ===== customer tracking + address change, no cancel =====
  await ev(() => { storeOn(); openAccount(); });
  ok('My Account order list has Track buttons and NO cancel option', await ev(() => { const t = document.getElementById('accountBody').innerText.toLowerCase(); const orders = [...document.querySelectorAll('#accountBody .acct-order')].filter(x => /AP-/.test(x.innerText)); return orders.length >= 2 && orders.every(x => /track/i.test(x.innerText) && !/cancel/i.test(x.innerText)); }));
  await ev(id => { closeModal('accountModal'); openTrackOrder(id); }, o1.id);
  ok('tracking modal: steps, expected date, change-address button, no cancel', await ev(() => { const t = document.getElementById('trackBody').innerText; return /Order placed/i.test(t) && /Delivered/i.test(t) && /Delivery by/i.test(t) && /Change delivery address/i.test(t) && !/cancel/i.test(t); }));
  await p.click('#trackBody button:has-text("Change delivery address")');
  await fill({ 'ac-street': 'Flat 4B, Sai Residency, Madhapur', 'ac-city': 'Hyderabad', 'ac-state': 'Karnataka', 'ac-pin': '500081' });
  await ev(id => saveAddrChange(id), o1.id);
  ok('address change with a doubtful state is still saved (flagged), never blocked', await ev(id => { const o = db.orders.find(x => x.id === id); return o.shippingAddress.pincode === '500081' && o.addressCheck.status === 'mismatch'; }, o1.id));
  await fill({ 'ac-state': 'Telangana' }); await ev(id => saveAddrChange(id), o1.id);
  const ch = await ev(id => db.orders.find(o => o.id === id), o1.id);
  ok('valid change saved: new address, history kept, timeline note, admin flag', ch.shippingAddress.pincode === '500081' && ch.addressHistory.length === 2 && ch.addressChanged && ch.timeline.some(t => /address changed/i.test(t.note || '')));
  await ev(() => { adminOn('orders'); });
  ok('admin sees "address changed" on the order', /address changed/.test(await ev(() => document.getElementById('adminContent').innerText)));
  await ev(id => updateOrderStatus(id, 'packed'), o1.id);
  ok('admin can mark packed and out-for-delivery (new statuses)', await ev(id => db.orders.find(o => o.id === id).status === 'packed' && [...document.querySelectorAll('#adminContent select option')].some(o => o.value === 'out_for_delivery'), o1.id));
  await ev(id => updateOrderStatus(id, 'shipped'), o1.id);
  await ev(() => { document.getElementById('sh-courier').value = 'other'; document.getElementById('sh-num').value = 'DTDC 4455'; const l = document.getElementById('sh-link'); l.value = 'https://courier.test/t/9'; l.dataset.manual = '1'; shipSave(false); });
  ok('marking shipped asks for courier + tracking link (link must be https)', await ev(id => { const o = db.orders.find(x => x.id === id); return o.trackingNo === 'DTDC 4455' && /DTDC 4455/.test(o.tracking) && o.trackingUrl === 'https://courier.test/t/9'; }, o1.id));
  await ev(id => { storeOn(); openTrackOrder(id); }, o1.id);
  ok('after shipping: courier link shown, address can no longer be changed', await ev(() => { const t = document.getElementById('trackBody').innerText; return /DTDC 4455/.test(t) && !/Change delivery address/i.test(t) && !!document.querySelector('#trackBody a[href="https://courier.test/t/9"]'); }));
  await ev(id => saveAddrChange(id), o1.id); ok('...even if someone calls it directly', await ev(id => db.orders.find(o => o.id === id).shippingAddress.pincode === '500081' && db.orders.find(o => o.id === id).addressHistory.length === 2, o1.id));
  ok("a customer cannot open someone else's order", await ev(() => { const u = db.users[0]; setSession(u, null); document.getElementById('trackModal').classList.remove('active'); document.getElementById('trackBody').innerHTML = ''; openTrackOrder(db.orders.find(o => o.phone === '+919700012345').id); return !document.getElementById('trackModal').classList.contains('active'); }));
  await ev(() => document.getElementById('trackModal').classList.remove('active'));

  // ===== address book in My Account =====
  await ev(() => { setSession(db.users.find(u => u.phone === '+919700012345'), null); openAccount(); });
  await p.click('#accountBody summary:has-text("Add an address")');
  await fill({ 'ab-label': 'Mother', 'ab-name': 'Lakshmi', 'ab-street': '22 Gandhi Road, Tirupati', 'ab-city': 'Tirupati', 'ab-state': 'Andhra Pradesh', 'ab-pin': '517501' }); await p.click('#accountBody button:has-text("Save address")');
  ok('add an address in My Account', await ev(() => currentUser().addresses.some(a => a.label === 'Mother' && a.pincode === '517501') && /Mother/.test(document.getElementById('accountBody').innerText)));
  await p.click('#accountBody details summary'); await p.click('#accountBody .acct-addr:has-text("Mother") button:has-text("Remove")'); ok('remove an address', await ev(() => !currentUser().addresses.some(a => a.label === 'Mother')));
  await ev(() => { closeModal('accountModal'); cart = [{ id: 'p1', qty: 1 }]; saveCart(); openCheckout(); });
  ok('checkout offers the saved addresses as one-tap chips', await ev(() => document.querySelectorAll('#chk-book .ab-chip').length >= 2));
  await p.click('#chk-book .ab-chip >> nth=0'); ok('tapping a chip fills the address', await ev(() => document.getElementById('chk-pin').value.length === 6 && document.getElementById('chk-address').value.length > 3));
  await ev(() => document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')));

  // ===== admin: Delivery & Gifting =====
  await ev(() => { adminOn('delivery'); });
  ok('admin tab renders zones, blocked PINs, gift fee, cancellation note', await ev(() => { const t = document.getElementById('adminContent').innerText; return /Zones/i.test(t) && /needs a check/i.test(t) && /Gift wrapping fee/i.test(t) && /no cancel option/i.test(t); }));
  await ev(() => { dcSet('processingDays', '5'); dcZone(0, 'maxDays', '9'); dcSet('blockedPincodes', '500072'); dcSet('giftWrapFee', '149'); });
  ok('edits are saved', await ev(() => db.settings.delivery.processingDays === 5 && db.settings.delivery.zones[0].maxDays === 9 && db.settings.giftWrapFee === 149));
  ok('the "try it" box uses the new rules (flagged PIN gets a gentle note)', await (async () => { await p.fill('#dc-try', '500072'); return /do not usually deliver/.test(await ev(() => document.getElementById('dc-try-res').innerText)); })());
  await ev(() => { dcSet('blockedPincodes', ''); dcAddZone(); });
  ok('zones can be added and removed', await ev(() => { const n = db.settings.delivery.zones.length; dcDelZone(n - 1); return db.settings.delivery.zones.length === n - 1; }));

  // ===== a PIN outside the usual areas can still order =====
  await ev(() => { dcSet('blockedPincodes', '500099'); const u = newUser('+919700077777'); u.name = 'Far Buyer'; db.users.push(u); setSession(u, null); storeOn(); cart = [{ id: 'p1', qty: 1 }]; saveCart(); openCheckout(); });
  await fill({ 'chk-name': 'Far Buyer', 'chk-address': '1 Remote Lane, Somewhere', 'chk-city': 'Hyderabad', 'chk-state': 'Telangana', 'chk-pin': '500099', 'chk-terms': true, 'chk-instr': 'Please add fall & pico. Call before delivery.' }); await ev(() => processPayment());
  const far = await ev(() => db.orders.find(o => o.phone === '+919700077777'));
  ok('special instructions typed at checkout are saved on the order', !!far && far.instructions === 'Please add fall & pico. Call before delivery.');
  ok('an order for a PIN outside your usual areas is accepted: flagged "unserved", no delivery date', !!far && far.addressCheck.status === 'unserved' && far.delivery === null);
  await ev(() => { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); adminOn('orders'); dcSet('blockedPincodes', ''); });
  ok('admin sees a "check address / delivery" flag on it', /check address/.test(await ev(() => document.getElementById('adminContent').innerText)));

  // ===== reaches the assistant, and orders flow back =====
  await ev(async ([b, t]) => { db.products.forEach(x => { x.stock = Math.max(x.stock, 10); }); db.settings.assistantUrl = b; sessionStorage.setItem('wa_admin_tok', t); db.settings.gstNumber = '36AABCU9603R1ZM'; db.settings.gstRate = 5; await waPublish(true); }, [base, 'admin-token-ui-test-1']);
  const cat = app.store.loadCatalogue();
  ok('delivery rules, gift fee and GST details are sent to the assistant', cat.delivery.processingDays === 5 && cat.giftWrapFee === 149 && cat.shop.gstNumber === '36AABCU9603R1ZM' && cat.shop.gstRate === 5);
  const O = app.orders, mk = async (phone, name, items, extra = {}) => { const o = app.store.addOrder({ phone, customerName: name, address: '12 MG Road, Kukatpally', pincode: '500072', items, total: 0, pricing: null, source: 'whatsapp-assistant', shipTo: { name, address: '12 MG Road, Kukatpally', city: 'Hyderabad', state: 'Telangana', pincode: '500072', phone }, billTo: { name, address: '12 MG Road, Kukatpally', city: 'Hyderabad', state: 'Telangana', pincode: '500072' }, trackToken: 'a'.repeat(32), ...extra }); await O.sendLink(o.id); await O.handleEvent({ id: 'e' + o.id, type: 'paid', linkId: o.payment.linkId, orderId: o.id, paymentId: 'pay_' + o.id, amountInr: o.payment.amount }); return o; };
  const w1 = await mk('919876543210', 'Priya Ramakrishnan', [{ id: 'p4', name: 'Reddish Orange Banarasi', sku: 'AP-BNR-001', quantity: 1, price: 37999 }], { gift: { wrap: true, note: 'Enjoy!', hideSender: true, fee: 99 }, shipTo: { name: 'Meena K', address: '12 Park Street', city: 'Hyderabad', state: 'Telangana', pincode: '500016', phone: '9812300000' } });
  await ev(() => { adminOn('whatsapp'); }); await p.waitForFunction(() => /to add or update/.test(document.getElementById('wa-orders-box').innerText), null, { timeout: 5000 });
  await p.click('button:has-text("Add / update WhatsApp orders")'); await p.waitForFunction(id => db.orders.some(o => o.id === id), w1.id, { timeout: 5000 });
  const i1 = await ev(id => db.orders.find(o => o.id === id), w1.id);
  ok('imported WhatsApp gift order: recipient address, gift flags, invoice record + number, confirmed status', i1.shippingAddress.name === 'Meena K' && i1.gift.hideSender && i1.gift.wrap && i1.invoiceGenerated && /^AP-INV-W\d{4}$/.test(i1.invoiceId) && i1.status === 'confirmed' && await ev(n => db.invoices.some(i => i.id === n && i.pdfUrl), i1.invoiceId));
  await O.setStatus(w1.id, 'packed'); await O.setStatus(w1.id, 'shipped', { tracking: 'BlueDart 55', trackingUrl: 'https://bd.test/55' });
  await ev(() => waOrdersLoad()); await wait(400); await p.click('button:has-text("Add / update WhatsApp orders")'); await p.waitForFunction(id => db.orders.find(o => o.id === id).status === 'shipped', w1.id, { timeout: 5000 });
  ok('later courier updates flow into the store order (status, tracking, link) without double stock cut', await ev(id => { const o = db.orders.find(x => x.id === id); return o.tracking === 'BlueDart 55' && o.trackingUrl === 'https://bd.test/55' && o.timeline.some(t => t.status === 'packed') || o.timeline.some(t => t.status === 'shipped'); }, w1.id) && await ev(() => db.logs.filter(l => l.type === 'stock_out' && /WhatsApp order/.test(l.reason || '')).length === 1));
  await O.setStatus(w1.id, 'delivered'); await ev(() => waImportOrders()); await wait(500);
  ok('once delivered, the customer can review that saree (reviews need a delivered order)', await ev(id => { const u = db.users.find(x => x.id === db.orders.find(o => o.id === id).userId); return db.orders.find(o => o.id === id).status === 'delivered' && canReview(u, 'p4'); }, w1.id));
  ok('server has nothing left to import', (await (await fetch(base + '/api/orders/export', { headers: { Authorization: 'Bearer admin-token-ui-test-1' } })).json()).orders.length === 0);
  ok('no script errors', errs.length === 0); if (errs.length) console.log(errs);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); app.server.close(); process.exit(fails ? 1 : 0);
})();
