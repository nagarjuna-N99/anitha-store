const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctxt = await b.newContext({ viewport: { width: 1400, height: 950 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctxt.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errs.push('console: '+m.text()));
  p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  const URL_ = 'file://' + process.cwd() + '/anitha-store.html';
  await p.goto(URL_);
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const toast = () => p.evaluate(() => document.getElementById('toast').textContent);

  // ===== favourites only once =====
  ok('"Favourites" link removed from nav, mobile menu and footer; heart icon kept once', await p.evaluate(() => !/Favourites/i.test(document.querySelector('.nav-links').innerText) && !/Favourites/i.test(document.getElementById('storeMobileNav').innerText) && !/Favourites/i.test(document.querySelector('footer').innerText) && document.querySelectorAll('.nav-icon[aria-label="Favourites"]').length === 1 && !!document.getElementById('favCount')));
  await p.click('.nav-icon[aria-label="Favourites"]');
  ok('heart icon still opens favourites', await p.evaluate(() => document.getElementById('page-favourites').classList.contains('active')));
  await p.evaluate(() => navigateTo('home'));

  // ===== no WhatsApp enquiry, share instead =====
  await p.evaluate(() => openProductDetail('p3'));
  ok('product page: no "Enquire on WhatsApp" (only the new Chat button), has Share', await p.evaluate(() => !/enquire/i.test(document.getElementById('productModalBody').innerText) && [...document.querySelectorAll('#productModalBody a[href*="wa.me"]')].every(a => /chat with us/i.test(a.innerText)) && /share this saree/i.test(document.getElementById('productModalBody').innerText)));
  await p.click('#productModalBody button:has-text("Share this saree")');
  ok('share window opens with a link to that item', await p.evaluate(() => document.getElementById('shareModal').classList.contains('active') && /#\/product\/pure-maheswari-silk$/.test(document.getElementById('share-url').value)));
  ok('WhatsApp/Telegram/Facebook/Email share links', await p.evaluate(() => { const h = [...document.querySelectorAll('#shareBody .share-b')].map(a => a.href || a.textContent).join(' '); return /wa\.me\/\?text=.*pure-maheswari-silk/.test(h) && /t\.me\/share/.test(h) && /facebook\.com\/sharer/.test(h) && /mailto:/.test(h); }));
  await p.click('#shareBody button:has-text("Copy")'); await p.waitForFunction(() => /copied/i.test(document.getElementById('toast').textContent));
  ok('Copy puts the link on the clipboard', /copied/i.test(await toast()) && /#\/product\/pure-maheswari-silk$/.test(await p.evaluate(() => navigator.clipboard.readText())));
  ok('warns that the link needs the store to be online (file://)', /once your store is online/.test(await p.textContent('#shareBody')));
  await p.evaluate(() => { db.settings.siteUrl = 'https://shop.test'; openShare('p3'); });
  ok('with a website address: full link + rich-preview link', await p.evaluate(() => document.getElementById('share-url').value === 'https://shop.test/#/product/pure-maheswari-silk' && document.getElementById('share-rich').value === 'https://shop.test/product/pure-maheswari-silk.html' && !/once your store is online/.test(document.getElementById('shareBody').innerText) && /product%2Fpure-maheswari-silk\.html/.test([...document.querySelectorAll('#shareBody .share-b')][0].href)));
  await p.evaluate(() => { closeModal('shareModal'); closeModal('productModal'); db.settings.siteUrl = ''; });
  ok('share button on shop cards, favourites and New Arrivals', await p.evaluate(() => { navigateTo('shop'); return document.querySelectorAll('#productGrid .product-share-btn').length === sareeList().length && document.querySelectorAll('.scroll-card .btn-share-sm').length === 2 * sareeList().filter(x => x.isNew).length; }));
  await p.evaluate(() => { closeModal('shareModal'); });
  await p.click('#productGrid .product-share-btn >> nth=0');
  ok('card share does not open the product', await p.evaluate(() => document.getElementById('shareModal').classList.contains('active') && !document.getElementById('productModal').classList.contains('active')));
  await p.evaluate(() => closeModal('shareModal'));

  // ===== WhatsApp OTP login (demo mode) =====
  await p.evaluate(() => { addToCart('p3'); closeAllDrawers(); });
  await p.evaluate(() => openCheckout());
  ok('ordering without a profile opens WhatsApp sign-in first', await p.evaluate(() => document.getElementById('authModal').classList.contains('active') && !document.getElementById('checkoutModal').classList.contains('active')));
  ok('demo mode is clearly labelled', /Demo mode/.test(await p.textContent('#authBody')));
  await p.fill('#auth-phone', '12345'); await p.check('#auth-age'); await p.click('#auth-send');
  ok('invalid Indian mobile rejected', /valid 10-digit/.test(await p.textContent('#authBody')));
  await p.fill('#auth-phone', '91111 11111'); await p.check('#auth-age'); await p.click('#auth-send');
  await p.waitForSelector('#auth-code');
  ok('OTP step: number masked, 6-digit demo code shown, resend locked', await p.evaluate(() => /\+91 •{8}11/.test(document.getElementById('authBody').innerText) && /^\d{6}$/.test(document.querySelector('.demo-code').textContent) && document.getElementById('auth-resend').disabled && /Resend code in \d+s/.test(document.getElementById('auth-resend').textContent)));
  const code = await p.textContent('.demo-code'); const wrong = code === '000000' ? '111111' : '000000';
  await p.fill('#auth-code', wrong); await p.click('#auth-verify');
  ok('wrong code → error with attempts left', /not right.*4 attempt/.test(await p.textContent('#authBody')));
  await p.fill('#auth-code', '12'); await p.click('#auth-verify');
  ok('code must be 6 digits', /6-digit/.test(await p.textContent('#authBody')));
  for (let i = 0; i < 4; i++) { await p.fill('#auth-code', wrong); await p.click('#auth-verify'); }
  await p.fill('#auth-code', code); await p.click('#auth-verify');
  ok('locked after 5 wrong attempts (even the right code)', /Too many wrong attempts/.test(await p.textContent('#authBody')) && !(await p.evaluate(() => !!getSession())));
  await p.evaluate(() => { AUTH.sends = {}; });
  await p.evaluate(() => authSend(true)); await p.waitForSelector('#auth-code');
  const code2 = await p.textContent('.demo-code');
  await p.fill('#auth-code', code2); await p.click('#auth-verify');
  await p.waitForFunction(() => document.getElementById('checkoutModal').classList.contains('active'));
  const u1 = await p.evaluate(() => db.users.find(u => u.phone === '+919111111111'));
  ok('profile created automatically (phone verified, no consents yet)', u1 && u1.phoneVerified && u1.consents.orderUpdates === false && u1.consents.marketing === false && u1.name === '');
  ok('signed in → checkout continues, number shown masked & verified', await p.evaluate(() => !!getSession() && getSession().phone === '+919111111111' && /\+91 •{8}11/.test(document.getElementById('chk-verified-phone').textContent) && document.getElementById('acctDot').style.display === 'block'));
  ok('session survives reload', await p.evaluate(() => !!currentUser()));

  // ===== consent at checkout =====
  await p.fill('#chk-name', 'Asha Rao'); await p.fill('#chk-pin', '500001'); await p.fill('#chk-address', '12 Road'); await p.fill('#chk-city', 'Hyderabad');
  ok('WhatsApp permissions are NOT pre-ticked', await p.evaluate(() => !document.getElementById('chk-wa-orders').checked && !document.getElementById('chk-wa-promos').checked && !document.getElementById('chk-terms').checked));
  const before = await p.evaluate(() => db.orders.length);
  await p.click('#checkoutModal button:has-text("Place Order")');
  ok('cannot order without accepting Terms & Privacy', await p.evaluate(b => db.orders.length === b && document.getElementById('chk-terms-row').classList.contains('invalid'), before) && /accept the Terms/.test(await toast()));
  await p.click('#checkoutModal a:has-text("Terms & Conditions")');
  ok('Terms open on top of checkout (checkout stays open, nothing lost)', await p.evaluate(() => document.getElementById('legalModal').classList.contains('active') && document.getElementById('checkoutModal').classList.contains('active') && document.getElementById('chk-name').value === 'Asha Rao' && !document.getElementById('chk-terms').checked));
  await p.evaluate(() => closeModal('legalModal'));
  await p.check('#chk-age'); await p.check('#chk-terms'); await p.check('#chk-wa-orders');
  await p.click('#checkoutModal button:has-text("Place Order")');
  const o1 = await p.evaluate(() => db.orders[0]);
  ok('order placed for the verified profile', o1.userId === u1.id && o1.phone === '+919111111111' && o1.customer === 'Asha Rao');
  const log1 = await p.evaluate(id => db.consentLog.filter(c => c.userId === id).map(c => `${c.type}:${c.granted}:${c.source}`), u1.id);
  ok('consent log: terms ✓, order updates ✓, offers ✗ (dated rows)', log1.includes('terms:true:checkout') && log1.includes('orderUpdates:true:checkout') && log1.includes('marketing:false:checkout') && await p.evaluate(id => db.consentLog.filter(c => c.userId === id).every(c => c.version && /^\d{4}-/.test(c.at) && c.phone), u1.id));
  ok('order stores the consent snapshot', o1.consent.terms.startsWith('2.0') && o1.consent.whatsappOrderUpdates === true && o1.consent.whatsappOffers === false);
  ok('success message reflects the choice', /order updates to your WhatsApp/.test(await p.textContent('#successMsg')));
  await p.evaluate(() => closeModal('successModal'));

  // second order: prefilled, no duplicate terms row
  await p.evaluate(() => { addToCart('p8'); openCheckout(); });
  ok('second checkout prefilled from profile; terms/choices remembered', await p.evaluate(() => document.getElementById('chk-name').value === 'Asha Rao' && document.getElementById('chk-city').value === 'Hyderabad' && document.getElementById('chk-terms').checked && document.getElementById('chk-wa-orders').checked && !document.getElementById('chk-wa-promos').checked));
  await p.check('#chk-wa-promos'); await p.click('#checkoutModal button:has-text("Place Order")');
  const log2 = await p.evaluate(id => db.consentLog.filter(c => c.userId === id).map(c => `${c.type}:${c.granted}`), u1.id);
  ok('only the CHANGE is logged (terms not duplicated, offers ✓ added)', log2.filter(x => x === 'terms:true').length === 1 && log2.includes('marketing:true') && log2.length === log1.length + 1);
  await p.evaluate(() => closeModal('successModal'));

  // ===== My Account =====
  await p.click('.nav-icon[aria-label="My account"]');
  ok('My Account: profile, preferences, orders', await p.evaluate(() => document.getElementById('accountModal').classList.contains('active') && document.getElementById('ac-name').value === 'Asha Rao' && document.querySelectorAll('#accountBody .acct-order').length === 2 && document.querySelectorAll('#accountBody .acct-pref input:checked').length === 2));
  ok('My Account message choices are tick boxes (no switches), and empty alert/review sections are hidden', await p.evaluate(() => document.querySelectorAll('#accountBody .acct-pref input[type=checkbox]').length >= 2 && !document.querySelector('#accountBody .acct-pref .toggle') && (db.alerts || []).length > 0 || !/None\. Tap/.test(document.getElementById('accountBody').innerText)));
  await p.click('#accountBody .acct-pref >> nth=1 >> input');
  ok('withdrawing a permission applies instantly and is logged', await p.evaluate(id => db.users.find(u => u.id === id).consents.marketing === false && db.consentLog.filter(c => c.userId === id).slice(-1)[0].granted === false && db.consentLog.filter(c => c.userId === id).slice(-1)[0].source === 'account', u1.id));
  await p.fill('#ac-name', 'Asha R'); await p.fill('#ac-pin', '500002'); await p.click('#accountBody button:has-text("Save profile")');
  ok('profile editable', await p.evaluate(id => db.users.find(u => u.id === id).name === 'Asha R' && db.users.find(u => u.id === id).addr.pincode === '500002', u1.id));
  await p.click('#accountBody button:has-text("Sign out")');
  ok('sign out clears session', await p.evaluate(() => !getSession() && !document.getElementById('accountModal').classList.contains('active') && document.getElementById('acctDot').style.display === 'none'));
  await p.evaluate(() => openAccount());
  ok('account when signed out asks to sign in', await p.evaluate(() => document.getElementById('authModal').classList.contains('active')));
  await p.evaluate(() => closeAuth());
  await p.evaluate(() => { const r = loginUser('+919111111111'); r.u.noticeVersion = NOTICE_VERSION; });
  await p.evaluate(() => { openAccount(); });
  await p.click('#accountBody a:has-text("Erase my account")'); await p.waitForSelector('#rt-type');
  ok('"Erase my account" opens the rights form with "Erase my data" chosen, the name and number filled in', await p.evaluate(() => document.getElementById('rt-type').value === 'erase' && /\d{7,}/.test(document.getElementById('rt-contact').value)));
  await p.fill('#rt-name', 'Test Customer'); await p.click('#rt-go'); await p.waitForFunction(() => /request number is/.test(document.getElementById('rt-out').innerText), null, { timeout: 8000 });
  ok('the request gets a number and a 30-day reply date', await p.evaluate(() => /DEMO-0001|PR-\d{4}/.test(document.getElementById('rt-out').innerText) && /reply by/.test(document.getElementById('rt-out').innerText)));
  await p.waitForFunction(() => !getSession(), null, { timeout: 8000 });
  ok('deletion request recorded + signed out', await p.evaluate(id => !!db.users.find(u => u.id === id).deletionRequestedAt && !getSession() && db.rightsDemo.length === 1, u1.id));

  // ===== real OTP service mode =====
  await p.evaluate(() => { db.settings.otpEndpoint = 'https://otp.test/api'; });
  let sent = null, verified = null;
  await p.route('https://otp.test/api/otp/send', async r => { sent = JSON.parse(r.request().postData()); await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '{"ok":true}' }); });
  await p.route('https://otp.test/api/otp/verify', async r => { verified = JSON.parse(r.request().postData()); const good = verified.code === '424242'; await r.fulfill({ status: good ? 200 : 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: good ? '{"ok":true,"token":"tok_abc"}' : '{"ok":false,"error":"Incorrect code"}' }); });
  await p.evaluate(() => { AUTH.sends = {}; openAuth(); });
  ok('real mode: no demo banner', !/Demo mode/.test(await p.textContent('#authBody')));
  await p.fill('#auth-phone', '9123456780'); await p.check('#auth-age'); await p.click('#auth-send'); await p.waitForSelector('#auth-code');
  ok('real mode: server is asked to send a WhatsApp code; code is never shown', sent && sent.phone === '+919123456780' && sent.channel === 'whatsapp' && !(await p.$('.demo-code')));
  await p.fill('#auth-code', '111111'); await p.click('#auth-verify'); await p.waitForFunction(() => /Incorrect code/.test(document.getElementById('authBody').innerText));
  ok('real mode: server error shown to the customer', /Incorrect code/.test(await p.textContent('#authBody')));
  await p.fill('#auth-code', '424242'); await p.click('#auth-verify'); await p.waitForFunction(() => !!getSession());
  ok('real mode: token kept in session, new profile created', await p.evaluate(() => getSession().token === 'tok_abc' && getSession().demo === false && db.users.some(u => u.phone === '+919123456780')));
  await p.evaluate(() => logout()); await p.unroute('https://otp.test/api/otp/send');
  await p.evaluate(() => { AUTH.sends = {}; openAuth(); });
  await p.fill('#auth-phone', '9123456781'); await p.check('#auth-age'); await p.click('#auth-send');
  ok('real mode: unreachable service → friendly error, no fake login', await p.waitForFunction(() => /Could not reach/.test(document.getElementById('authBody').innerText)).then(() => true) && await p.evaluate(() => !getSession()));
  await p.evaluate(() => { closeAuth(); db.settings.otpEndpoint = ''; });
  ok('rate limit: max 3 codes per number per 10 minutes', await (async () => { await p.evaluate(() => { AUTH.sends = {}; openAuth(); }); await p.fill('#auth-phone', '9000000009'); await p.check('#auth-age'); await p.click('#auth-send'); await p.waitForSelector('#auth-code'); await p.evaluate(() => authSend(true)); await p.evaluate(() => authSend(true)); await p.evaluate(() => authSend(true)); return /Too many codes/.test(await p.textContent('#authBody')); })());
  await p.evaluate(() => closeAuth());

  // ===== Terms & Privacy =====
  await p.evaluate(() => navigateTo('home'));
  await p.click('footer a:has-text("Terms & Conditions")');
  ok('Terms page: 12 sections, version, hash, title', await p.evaluate(() => document.getElementById('page-terms').classList.contains('active') && document.querySelectorAll('#legal-terms section').length === 12 && /Version 2\.0/.test(document.getElementById('legal-terms').innerText) && location.hash === '#/terms' && document.title.startsWith('Terms & Conditions')));
  ok('Terms cover shipping, returns, WhatsApp, governing law', await p.evaluate(() => { const t = document.getElementById('legal-terms').innerText; return /Shipping and delivery/.test(t) && /Returns, exchanges and refunds/.test(t) && /WhatsApp and electronic messages/.test(t) && /Hyderabad, Telangana/.test(t); }));
  await p.click('footer a:has-text("Privacy Policy")');
  ok('Privacy page: DPDP Act, consent, rights, grievance officer', await p.evaluate(() => { const t = document.getElementById('legal-privacy').innerText; return document.getElementById('page-privacy').classList.contains('active') && /Digital Personal Data Protection Act, 2023/.test(t) && /neither is ticked by default|not ticked by default/.test(t) && /Your rights/.test(t) && /grievance officer/i.test(t) && document.querySelectorAll('#legal-privacy section').length === 10; }));
  await p.evaluate(() => { db.settings.returnDays = 10; db.settings.dispatchTime = '5 days'; db.settings.grievanceOfficer = 'Anitha P, Proprietor'; });
  await p.evaluate(() => openLegal('terms', 'returns')); await p.waitForTimeout(150);
  ok('policy numbers come from Settings; footer Returns link jumps to its section', await p.evaluate(() => /within 10 days/.test(document.getElementById('legal-terms').innerText) && /within 5 days/.test(document.getElementById('legal-terms').innerText) && !!document.getElementById('returns')));
  await p.evaluate(() => openLegal('privacy'));
  ok('grievance officer from Settings', await p.evaluate(() => /Anitha P, Proprietor/.test(document.getElementById('legal-privacy').innerText)));
  await p.evaluate(() => navigateTo('shop'));
  ok('leaving a legal page restores title and clears hash', await p.evaluate(() => document.title === 'Anitha Pemmasani | Heritage Handloom' && location.hash === ''));
  await p.goto(URL_ + '#/privacy'); await p.waitForTimeout(250);
  ok('deep link to #/privacy opens the page', await p.evaluate(() => document.getElementById('page-privacy').classList.contains('active')));
  ok('footer: Terms · Privacy in the bottom bar too', await p.evaluate(() => /Terms/.test(document.querySelector('.footer-bottom').innerText) && /Privacy/.test(document.querySelector('.footer-bottom').innerText)));

  // ===== admin side =====
  await p.evaluate(() => { toggleView(); switchAdminTab('customers'); });
  ok('Customers: WhatsApp verified + consent chips', await p.evaluate(() => /WhatsApp verified/.test(document.getElementById('adminContent').innerText) && /Orders ✓/.test(document.getElementById('adminContent').innerText) && /Deletion requested/.test(document.getElementById('adminContent').innerText)));
  await p.evaluate(id => viewCustomerDetails(id), u1.id);
  ok('customer details show dated consent history', await p.evaluate(() => /consent history/i.test(document.getElementById('adminModalBody').innerText) && document.querySelectorAll('#adminModalBody .consent-row').length >= 5 && /withdrawn · account/.test(document.getElementById('adminModalBody').innerText)));
  await p.evaluate(() => closeModal('adminModal'));
  await p.evaluate(() => switchAdminTab('orders'));
  await p.evaluate(() => { const o = db.orders.find(x => x.status === 'placed' && !x.invoiceGenerated && x.userId === db.users.find(u => u.phone === '+919111111111').id); confirmOrderAndSendInvoice(o.id); });
  ok('admin is told whether the customer opted in before messaging', /opted in to WhatsApp order updates/.test(await toast()));
  await p.evaluate(() => { const u = db.users.find(u => u.phone === '+919111111111'); u.consents.orderUpdates = false; const o = db.orders.find(x => x.status === 'placed' && !x.invoiceGenerated && x.userId === u.id); confirmOrderAndSendInvoice(o.id); });
  ok('…and warned when they have NOT opted in', /NOT opted in/.test(await toast()));
  await p.evaluate(() => switchAdminTab('settings'));
  await p.fill('#s-otp', 'http://insecure.test'); await p.click('button:has-text("Save Settings")');
  ok('login service URL must be https', await p.evaluate(() => db.settings.otpEndpoint === ''));
  await p.fill('#s-otp', 'https://otp.example.com/api/'); await p.fill('#s-returndays', '14'); await p.click('button:has-text("Save Settings")');
  ok('login URL + policy settings saved', await p.evaluate(() => db.settings.otpEndpoint === 'https://otp.example.com/api' && db.settings.returnDays === 14));
  await p.evaluate(() => { db.settings.siteUrl = 'https://shop.test'; });
  ok('SEO pack includes terms.html & privacy.html and lists them in the sitemap', await p.evaluate(() => { const f = buildSeoPack(), m = Object.fromEntries(f.map(x => [x.path, x])); return !!m['terms.html'] && !!m['privacy.html'] && /shop\.test\/privacy\.html/.test(m['sitemap.xml'].text) && /canonical" href="https:\/\/shop\.test\/terms\.html/.test(m['terms.html'].text) && !/onclick/.test(m['privacy.html'].text) && /Terms<\/a>/.test(m[f.find(x => /^product\//.test(x.path)).path].text); }));
  console.log('page errors:', errs.length ? errs : 'none');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await b.close();
})();
