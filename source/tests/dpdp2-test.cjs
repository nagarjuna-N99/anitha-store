// DPDP round 2 in a real browser against the real server: website orders reach the owner, checking who is asking before data is shown,
// logging a request that came by phone, the do-not-bring-back list, and helper logins that cannot open Privacy.
const { chromium } = require(process.env.PW); const { spawn } = require('child_process'); const http = require('http'); const fs = require('fs'); const os = require('os'); const path = require('path');
const ROOT = process.cwd(), SETUP = 'setup-token-0123456789', PW = 'Correct-Horse-9!', HPW = 'Helper-Pass-Strong-7!';
(async () => {
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const free = () => new Promise(r => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  const port = await free(), sitePort = await free(), data = fs.mkdtempSync(path.join(os.tmpdir(), 'dpdp2-')); let BASE = '';
  const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(ROOT + '/build/site/index.html', 'utf8').replace(/window.__SHOP_API="[^"]*"/, 'window.__SHOP_API="' + BASE + '"')); }); await new Promise(r => site.listen(sitePort, '127.0.0.1', r));
  const srv = spawn('node', ['server.mjs'], { cwd: ROOT + '/wa-assistant', env: { ...process.env, PORT: String(port), DATA_DIR: data, ADMIN_SETUP_TOKEN: SETUP, COOKIE_SECURE: 'false', PUBLIC_URL: 'https://shop.test', ALLOWED_ORIGINS: `http://127.0.0.1:${sitePort}`, ANTHROPIC_API_KEY: '', ADMIN_TOKEN: '' }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`; BASE = base; for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch (e) { } await new Promise(r => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const sleep = ms => new Promise(r => setTimeout(r, ms));
  const errs = []; const mk = async () => { const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('Out of stock this week')); return { c, p }; };
  try {
    await fetch(base + '/admin/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setupToken: SETUP, password: PW }) });
    const A = await mk(), p = A.p, ev = (f, a) => p.evaluate(f, a);
    const signIn = async (pg, name, pw) => { await pg.goto(base + '/admin'); await pg.waitForSelector('#adm-pw'); if (name) await pg.fill('#adm-user', name); await pg.fill('#adm-pw', pw); await pg.click('#adm-go'); await pg.waitForFunction(() => document.body.classList.contains('adm-app'), null, { timeout: 15000 }); };
    await signIn(p, '', PW); await sleep(1500);
    ok('the owner is signed in with the owner role', await ev(() => ADM.role === 'owner'));
    // ---- a customer orders on the public website ----
    const S = await mk(), sp = S.p; await sp.goto(`http://127.0.0.1:${sitePort}/`); await sp.waitForTimeout(800);
    const phone = '+919811100077';
    await sp.evaluate(ph => { const u = newUser(ph); u.name = 'Test Buyer'; u.email = 'buyer@example.invalid'; u.ageConfirmedAt = new Date().toISOString(); u.consents = { orderUpdates: true, marketing: false, updatedAt: null }; db.users.push(u); setSession(u, null); cart = [{ id: db.products.find(x => x.stock > 0).id, qty: 1 }]; saveCart(); openCheckout(); const s = (i, v) => { document.getElementById(i).value = v; }; s('chk-name', 'Test Buyer'); s('chk-address', '12 Test Road'); s('chk-city', 'Hyderabad'); s('chk-state', 'Telangana'); s('chk-pin', '500072'); s('chk-instr', 'Please pack in a box'); document.getElementById('chk-terms').checked = true; document.getElementById('chk-age').checked = true; processPayment(); }, phone);
    await sp.waitForFunction(() => /reached the shop/.test((document.getElementById('successSent') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => { });
    ok('website: after ordering, the buyer is told the order reached the shop', await sp.evaluate(() => /reached the shop/.test(document.getElementById('successSent').textContent)));
    // ---- the owner sees it and accepts it ----
    await ev(() => switchAdminTab('orders')); await p.waitForSelector('#web-orders .admin-card', { timeout: 8000 });
    ok('orders: "New from the website" lists it with the buyer, items, address and the note', await ev(() => { const t = document.getElementById('web-orders').innerText; return /New from the website/i.test(t) && /Test Buyer/.test(t) && /12 Test Road/.test(t) && /pack in a box/.test(t) && /Nobody has been charged/.test(t); }));
    const n0 = await ev(() => db.orders.length); await p.click('#web-orders button:has-text("Accept")'); await p.waitForFunction(n => db.orders.length === n + 1, n0, { timeout: 8000 });
    const o = await ev(() => { const x = db.orders[0]; return { src: x.source, pay: x.payment.status, st: x.status, inst: x.instructions, user: !!db.users.find(u => u.id === x.userId && /9811100077$/.test(u.phone)), cl: db.consentLog.filter(c => c.userId === x.userId).length }; });
    ok('accept: becomes a normal order marked "website", payment still pending, customer created, consent proof kept', o.src === 'website' && o.pay === 'pending' && o.st === 'placed' && o.inst === 'Please pack in a box' && o.user && o.cl >= 1);
    await sleep(600); ok('accept: the website order is marked accepted on the server', (await ev(() => admApi('GET', '/admin/api/web-orders'))).orders[0].status === 'accepted');
    // ---- a failed send is queued and retried ----
    await S.c.route(base + '/public/order', r => r.abort()); await sp.evaluate(() => { closeModal('successModal'); cart = [{ id: db.products.find(x => x.stock > 0).id, qty: 1 }]; saveCart(); openCheckout(); const s = (i, v) => { document.getElementById(i).value = v; }; s('chk-name', 'Test Buyer'); s('chk-address', '12 Test Road'); s('chk-city', 'Hyderabad'); s('chk-state', 'Telangana'); s('chk-pin', '500072'); document.getElementById('chk-terms').checked = true; document.getElementById('chk-age').checked = true; processPayment(); });
    await sleep(1500); ok('website: if the shop cannot be reached the order is kept in a queue and the buyer is told it will retry', await sp.evaluate(() => JSON.parse(localStorage.getItem('ap_pending_orders') || '[]').length === 1 && /try again/i.test(document.getElementById('successSent').textContent)));
    await S.c.unroute(base + '/public/order'); await sp.evaluate(() => webOrderRetry()); await sleep(1000);
    ok('website: the queued order is sent once the shop is reachable, and the queue empties', await sp.evaluate(() => JSON.parse(localStorage.getItem('ap_pending_orders') || '[]').length === 0) && (await ev(() => admApi('GET', '/admin/api/web-orders'))).orders.filter(x => x.status === 'new').length === 1);
    await ev(() => switchAdminTab('orders')); await p.waitForSelector('#web-orders button:has-text("Not possible")'); await p.click('#web-orders button:has-text("Not possible")'); await sleep(800);
    ok('decline: needs a reason and is recorded', (await ev(() => admApi('GET', '/admin/api/web-orders'))).orders.some(x => x.status === 'declined' && (x.notes || []).some(n => /Out of stock/.test(n.text))));
    // ---- privacy: log a request from the phone ----
    await ev(() => switchAdminTab('privacy')); await p.waitForSelector('#tn-type');
    await ev(() => { document.getElementById('tn-type').value = 'erase'; document.getElementById('tn-ch').value = 'phone'; document.getElementById('tn-name').value = 'Test Buyer'; document.getElementById('tn-contact').value = '9811100077'; document.getElementById('tn-text').value = 'Rang the shop and asked to be erased'; privTicketNew(); }); await p.waitForSelector('.g-act-h:has-text("Erase my data")', { timeout: 8000 });
    ok('privacy: a request taken by phone is logged with a reply date and a list of other companies to ask', await ev(() => { const t = document.getElementById('adminContent').innerText; return /Erase my data/i.test(t) && /reply by/i.test(t) && /Also ask these companies/i.test(t) && /Razorpay/.test(t); }));
    await p.click('label.chk:has-text("WhatsApp (Meta)") input'); await sleep(500); ok('privacy: ticking a company is saved on the request', (await ev(() => admApi('GET', '/admin/api/privacy'))).tickets[0].providers.wa === true);
    // ---- who is asking must be checked first ----
    await ev(() => { document.getElementById('pv-q').value = '9811100077'; privFind(); });
    ok('verify: before checking, "Their data" and "Erase" are switched off', await ev(() => [...document.querySelectorAll('#pv-found button')].filter(x => /Their data|Erase/.test(x.textContent)).every(x => x.disabled)));
    ok('verify: the server also refuses to hand over or erase unchecked data', (await ev(() => admApi('POST', '/admin/api/privacy/access', { phone: '9811100077' }).then(() => 'ok', e => e.status))) === 403);
    await ev(() => { document.querySelector('#pv-found details').open = true; document.querySelector('#pv-found input[id^=vt-]').value = 'asked the order id; it matched'; }); await p.click('#pv-found button:has-text("Confirm")'); await sleep(600);
    ok('verify: once checked, the buttons are on and the check is kept in the log', await ev(() => [...document.querySelectorAll('#pv-found button')].filter(x => /Their data|Erase/.test(x.textContent)).every(x => !x.disabled) && /checked/.test(document.getElementById('pv-found').innerText)));
    await p.click('#pv-found button:has-text("Erase")'); await p.waitForSelector('#pv-found .va-do', { timeout: 8000 });
    ok('erase: done, the customer is gone from the app and counted in the do-not-bring-back list', await ev(() => !db.users.find(u => /9811100077$/.test(u.phone))) && (await ev(() => admApi('GET', '/admin/api/privacy'))).erasedCount >= 1);
    // ---- a notice archive ----
    await ev(() => renderPrivacyAdmin(document.getElementById('adminContent'))); await sleep(600);
    ok('notice archive: every version customers saw is listed and can be opened', await ev(() => /Privacy notices customers have seen/i.test(document.getElementById('adminContent').innerText) && Object.keys(NOTICE_ARCHIVE).includes(NOTICE_VERSION) && JSON.stringify(NOTICE_ARCHIVE[NOTICE_VERSION].texts) === JSON.stringify(NOTICE)));
    // ---- the dashboard reminder ----
    await ev(() => switchAdminTab('dashboard')); await sleep(1000);
    ok('dashboard: warns that email is not set up (so new requests would go unseen)', await ev(() => /Set up email/.test(document.getElementById('dash-priv').innerText)));
    // ---- the developer's Ops page ----
    await ev(() => switchAdminTab('ops')); await p.waitForSelector('#adminContent .va-row', { timeout: 20000 });
    ok('ops: the page shows a verdict and every area (server, data, security, website, orders, WhatsApp, AI, Instagram, email, privacy, errors)', await ev(() => { const t = document.getElementById('adminContent').innerText; return /fail ·/i.test(t) && ['Server', 'Shop data', 'Security', 'Public website', 'Orders & payments', 'WhatsApp', 'AI helpers', 'Instagram', 'Email', 'Privacy', 'Recent errors'].every(n => t.toLowerCase().includes(n.toLowerCase())); }));
    ok('ops: problems are open with a "→ fix" hint, and the report can be copied as text', await ev(() => /→/.test(document.getElementById('adminContent').innerText) && !!document.querySelector('#adminContent button[onclick="opsCopy()"]')));
    ok('ops: it sees the unanswered state of this test server (no email, WhatsApp not live) as warnings, not as ok', await ev(() => OPS.r.groups.find(g => g.name === 'Email').checks.some(c => c.id === 'smtp' && c.status === 'warn') && OPS.r.groups.find(g => g.name === 'WhatsApp').checks.some(c => c.id === 'wa-live' && c.status === 'warn')));
    // ---- helper logins ----
    await ev(() => switchAdminTab('settings')); await p.waitForSelector('#tm-name'); await p.fill('#tm-name', 'meena'); await p.fill('#tm-pass', HPW); await p.click('button:has-text("Add a helper")'); await sleep(800);
    ok('team: the owner can add a helper', await ev(() => /meena/.test(document.getElementById('sec-team').innerText)));
    const H = await mk(), hp = H.p; await signIn(hp, 'meena', HPW); await sleep(800);
    ok('helper: signs in as a helper and the Privacy and Ops tabs are hidden', await hp.evaluate(() => ADM.role === 'staff' || ADM.role === 'helper' || ADM.role !== 'owner') && await hp.evaluate(() => [...document.querySelectorAll('[data-tab="privacy"],[data-tab="ops"]')].every(e => getComputedStyle(e).display === 'none')));
    ok('helper: the server refuses Privacy, team and backup data to a helper', await hp.evaluate(async () => { const r = []; for (const u of ['/admin/api/privacy', '/admin/api/team', '/admin/api/email']) r.push(await admApi('GET', u).then(() => 200, e => e.status)); return r.every(x => x === 403); }));
    ok('helper: can still work on orders', await hp.evaluate(() => admApi('GET', '/admin/api/web-orders').then(() => true, () => false)));
    ok('no JavaScript errors anywhere', errs.length === 0 || (console.log(errs), false));
  } catch (e) { fails++; console.log('FAIL (crash)', e.message.split('\n').slice(0, 4).join(' | ')); }
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); srv.kill(); site.close(); process.exit(fails ? 1 : 0);
})();
