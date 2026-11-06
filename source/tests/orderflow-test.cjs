// Orders tab (owner): website-order alerts card, automatic approval switch, owner WhatsApp number. Image Studio is not in the owner menu.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1216, height: 800 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(600);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('orders'); }); await sleep(400);
  ok('Orders tab: a card explains website-order alerts, YES / NO replies and TRACK replies', await ev(() => { const t = document.getElementById('orderflow-card').innerText; return /your WhatsApp/.test(t) && /YES WO-0001/.test(t) && /NO WO-0001/.test(t) && /TRACK/.test(t); }));
  ok('automatic approval is OFF by default', await ev(() => !db.settings.autoApproveOrders && !document.getElementById('of-auto').classList.contains('active')));
  await ev(() => document.getElementById('of-auto').click()); await sleep(200);
  ok('switching it on is saved and the switch shows it; it says it only applies when everything is in stock', await ev(() => db.settings.autoApproveOrders === true && document.getElementById('of-auto').getAttribute('aria-checked') === 'true' && /in stock and the prices match/.test(document.getElementById('orderflow-card').innerText)));
  await ev(() => document.getElementById('of-auto').click()); await sleep(100); ok('and off again', await ev(() => db.settings.autoApproveOrders === false));
  await ev(() => { const i = document.getElementById('of-phone'); i.value = '+91 98765-43210 abc'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(150);
  ok('the owner\'s WhatsApp number is saved as digits only', await ev(() => db.settings.ownerWhatsapp === '+919876543210'));
  ok('automations: "Morning summary" and "Low-stock alerts" switches are ON by default, each says what it does, and there is a "Send me today\'s summary now" button', await ev(() => { const c = document.getElementById('orderflow-card'); return document.getElementById('of-sum').classList.contains('active') && document.getElementById('of-stk').classList.contains('active') && /8:30/.test(c.innerText) && /last piece|sells out/.test(c.innerText) && /Send me today/.test(c.innerText); }));
  await ev(() => document.getElementById('of-sum').click()); await ev(() => document.getElementById('of-stk').click()); await sleep(150);
  ok('switching them off is saved (dailySummary and stockAlerts become false) and the switches show it', await ev(() => db.settings.dailySummary === false && db.settings.stockAlerts === false && !document.getElementById('of-sum').classList.contains('active') && document.getElementById('of-stk').getAttribute('aria-checked') === 'false'));
  await ev(() => { ofFlagToggle('dailySummary', 'of-sum', 'Morning summary'); ofFlagToggle('stockAlerts', 'of-stk', 'Low-stock alerts'); }); ok('and back on', await ev(() => db.settings.dailySummary === true && db.settings.stockAlerts === true));
  ok('the Orders tab is not changed otherwise (dispatch list and orders table still there)', await ev(() => /Dispatch list/.test(document.getElementById('adminContent').innerText) && !!document.querySelector('#adminContent table.admin-table')));
  ok('Image Studio is described as the owner\'s tool', await ev(() => /for the owner/.test(ADM_DESC.studio.d)));
  ok('no script errors', errs.length === 0, errs.join('|'));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
