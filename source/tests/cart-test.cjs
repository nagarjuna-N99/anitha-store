const { chromium } = require(process.env.PW);
(async () => {
  const { createApp } = await import(process.cwd() + '/wa-assistant/server.mjs');
  const fs = require('fs'), os = require('os'), path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-cart-'));
  const app = createApp({ dataDir: dir, adminToken: 'admin-token-ui-test-1', anthropicKey: 'x', allowedOrigins: ['null'], wa: { phoneNumberId: '', token: '', appSecret: '', verifyToken: '', graphUrl: '', ownerPhone: '', ownerAlertTemplate: '' } });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + app.server.address().port;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  const syncCalls = []; p.on('request', r => { if (r.url().endsWith('/cart/sync')) syncCalls.push(JSON.parse(r.postData() || '{}')); });
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }; const ev = (f, a) => p.evaluate(f, a); const wait = ms => p.waitForTimeout(ms);
  const uploadCatalogue = () => ev(async ([b, t]) => { db.settings.assistantUrl = b; sessionStorage.setItem('wa_admin_tok', t); await waPublish(true); }, [base, 'admin-token-ui-test-1']);

  // before the assistant is configured: no reminder UI, no network
  await ev(() => { const u = db.users[0]; setSession(u, 'tok123'); addToCart('p3'); closeAllDrawers(); });
  await wait(2900);
  ok('no assistant configured → no sync call, no reminder checkbox', syncCalls.length === 0 && await ev(() => { openCart(); const r = !document.getElementById('cart-rem'); closeAllDrawers(); return r; }));
  await uploadCatalogue();
  await ev(() => { closeAllDrawers(); openCart(); });
  ok('signed-in shopper sees the reminder checkbox, unticked by default', await ev(() => { const c = document.getElementById('cart-rem'); return !!c && !c.checked; }));
  syncCalls.length = 0; await ev(() => { addToCart('p4'); closeAllDrawers(); }); await wait(2900);
  ok('without consent, NOTHING is sent to the server', syncCalls.length === 0 && Object.keys(app.store.s.carts).length === 0);

  // consent via the cart checkbox
  await ev(() => { openCart(); });
  await p.check('#cart-rem'); await wait(3000);
  ok('ticking sends the cart with consent proof (version, time)', syncCalls.length >= 1 && syncCalls.at(-1).consent.granted === true && /^2\.0/.test(syncCalls.at(-1).consent.version) && syncCalls.at(-1).items.length === 2);
  ok('consent logged in the shop data (append-only row, source=cart)', await ev(() => db.consentLog.some(c => c.type === 'cartReminder' && c.granted && c.source === 'cart')));
  const ph = (await ev(() => db.users[0].phone)).replace(/\D/g, '');
  ok('server holds the cart (names validated against catalogue)', app.store.s.carts[ph]?.items.length === 2 && app.store.s.carts[ph].consent.granted);
  syncCalls.length = 0; await ev(() => { removeFromCart('p4'); closeAllDrawers(); }); await wait(3000);
  ok('changing the cart updates the server', app.store.s.carts[ph].items.length === 1 && syncCalls.length === 1);
  ok('account page has the Cart reminders toggle', await ev(() => { openAccount(); const t = /Cart reminders/.test(document.getElementById('accountModal').innerText); closeModal('accountModal'); return t; }));

  // order → recovered
  app.store.s.carts[ph].reminders.push({ n: 1, at: Date.now() - 3600000, status: 'sent', template: 't' });
  await ev(() => { openCheckout(); document.getElementById('chk-name').value = 'Priya R'; document.getElementById('chk-pin').value = '500034'; document.getElementById('chk-address').value = '12 Banjara Hills'; document.getElementById('chk-city').value = 'Hyderabad'; document.getElementById('chk-age').checked = true; document.getElementById('chk-terms').checked = true; });
  ok('checkout shows the cart-reminder box, pre-ticked from earlier consent', await ev(() => document.getElementById('chk-wa-cart').checked && document.getElementById('chk-wa-cart-row').style.display !== 'none'));
  syncCalls.length = 0; await ev(() => processPayment()); await wait(3300);
  ok('placing the order tells the server (cart emptied, marked ordered)', syncCalls.some(c => c.ordered === true && c.items.length === 0) && app.store.s.carts[ph].items.length === 0 && app.store.s.carts[ph].ordered?.recovered === true);

  // withdrawal deletes server copy
  await ev(() => { closeModal('successModal'); closeAllDrawers(); document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); addToCart('p2'); closeAllDrawers(); }); await wait(3000);
  ok('new cart is synced again while consent stands', app.store.s.carts[ph].items.length === 1);
  syncCalls.length = 0; await ev(() => { openAccount(); }); await p.click('.acct-pref:has-text("Cart reminders") .toggle'); await wait(3000);
  ok('turning reminders off → server copy deleted, consent false', app.store.s.carts[ph].items.length === 0 && app.store.s.carts[ph].consent.granted === false && syncCalls.at(-1).consent.granted === false);
  syncCalls.length = 0; await ev(() => { closeModal('accountModal'); addToCart('p1'); closeAllDrawers(); }); await wait(3000);
  ok('after withdrawing, later cart changes are NOT sent', syncCalls.length === 0 && app.store.s.carts[ph].items.length === 0);

  // guest checkout box hidden when no assistant
  await ev(() => { db.settings.assistantUrl = ''; openCheckout(); });
  ok('no assistant configured → checkout hides the reminder option', await ev(() => document.getElementById('chk-wa-cart-row').style.display === 'none'));
  await ev(() => { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); });

  // resume prompt
  await ev(() => { cart = [{ id: 'p3', qty: 1 }, { id: 'p1', qty: 1 }]; localStorage.setItem('ap_cart_ts', String(Date.now() - 3 * 3600000)); sessionStorage.removeItem('ap_resume_seen'); resumeCartPrompt(); });
  ok('returning shopper (cart idle 3h) sees "Welcome back" card with item + total', await ev(() => { const b = document.getElementById('resumeBar'); return !!b && /Welcome back/.test(b.innerText) && /and 1 more/.test(b.innerText); }));
  await p.click('#resumeBar .rb-go');
  ok('"View cart" opens the cart and removes the card', await ev(() => document.getElementById('cartDrawer').classList.contains('active') && !document.getElementById('resumeBar')));
  await ev(() => { closeAllDrawers(); resumeCartPrompt(); });
  ok('shown only once per visit', await ev(() => !document.getElementById('resumeBar')));
  await ev(() => { sessionStorage.removeItem('ap_resume_seen'); localStorage.setItem('ap_cart_ts', String(Date.now() - 60000)); resumeCartPrompt(); });
  ok('not shown when the cart was touched a minute ago', await ev(() => !document.getElementById('resumeBar')));
  await ev(() => { closeAllDrawers(); location.hash = '#/cart'; }); await wait(300);
  ok('reminder link (#/cart) opens the cart', await ev(() => document.getElementById('cartDrawer').classList.contains('active') && !location.hash));

  // admin card
  await ev(([b]) => { db.settings.assistantUrl = b; toggleView(); switchAdminTab('whatsapp'); }, [base]);
  await p.waitForFunction(() => /Carts waiting/i.test(document.getElementById('wa-cart-stats').innerText), null, { timeout: 5000 });
  ok('admin tab shows reminder stats from the server', /Orders recovered/i.test(await ev(() => document.getElementById('wa-cart-stats').innerText)));
  ok('admin tab includes the template wording for Meta', await ev(() => /cart_reminder_1/.test(document.getElementById('adminContent').textContent) && /Reply STOP/.test(document.getElementById('adminContent').innerHTML)));
  ok('no script errors', errs.length === 0); if (errs.length) console.log(errs);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close(); app.server.close(); process.exit(fails ? 1 : 0);
})();
