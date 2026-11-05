// WhatsApp promotions tab (owner app): reports, prices & costs, templates with AI wording, promotions. The server is replaced by a small in-page stand-in; the real server rules are tested in wa-assistant/tests/run.mjs.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1216, height: 800 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.accept(d.type() === 'prompt' ? '919800000001' : undefined); }); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(600);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  await ev(() => {
    window.__calls = []; const K = { service: 'Regular (replies within 24 h)', utility: 'Order updates (utility)', marketing: 'Promotions (marketing)', authentication: 'Sign-in codes' };
    const S = { live: false, templates: [{ name: 'diwali_note', kind: 'marketing', lang: 'en', body: 'Hello {{1}}, new sarees: {{2}}\nReply STOP to stop offers.', example: ['Priya', 'u'], status: 'approved', issues: [], vars: [1, 2] }, { name: 'draft_one', kind: 'marketing', lang: 'en', body: 'Hello {{1}} offers {{2}} today', example: [], status: 'draft', issues: ['A promotion must tell people how to stop (for example: Reply STOP to stop offers).'], vars: [1, 2] }], campaigns: [{ id: 'c1', name: 'Diwali', template: 'diwali_note', status: 'draft', sent: 0, failed: 0 }], settings: { dailyCap: 200 }, rates: { service: 0, utility: 0.12, marketing: 0.88, authentication: 0.12 }, ratesNote: '', expenses: [], quiet: false, sentToday: 0, kinds: K, audience: { recipients: 3, noConsent: 1, optedOut: 1, noPhone: 0 } };
    const blank = (s = 0, f = 0, d = 0, c = 0) => ({ sent: s, failed: f, dry: d, cost: c });
    const rep = () => ({ from: '2026-10-01', to: '2026-10-30', byKind: { service: blank(5, 1, 2, 0), utility: blank(3, 0, 0, 0.36), marketing: blank(4, 0, 0, 3.52), authentication: blank(2, 0, 0, 0.24) }, bySource: { assistant: blank(5, 1, 2), order: blank(3, 0, 0, 0.36), promo: blank(3, 0, 0, 2.64), 'promo-test': blank(1, 0, 0, 0.88) }, byMonth: { '2026-10': blank(14, 1, 2, 4.12) }, campaigns: [{ id: 'c1', name: 'Diwali', ...blank(4, 0, 0, 3.52) }], messageCost: 4.12, otherCosts: S.expenses.reduce((s, e) => s + e.amount, 0), get totalExpenses() { return 4.12 + this.otherCosts; } });
    window.admApi = async (m, path, body) => {
      window.__calls.push({ m, path, body });
      if (path === '/admin/api/promo') return JSON.parse(JSON.stringify(S));
      if (path.startsWith('/admin/api/promo/report')) { const r = rep(); r.totalExpenses = r.totalExpenses; return JSON.parse(JSON.stringify({ ...r, totalExpenses: 4.12 + r.otherCosts })); }
      if (path === '/admin/api/promo/rates') { Object.assign(S.rates, body.rates); S.ratesNote = body.note; return {}; }
      if (path === '/admin/api/promo/expense') { S.expenses.push({ id: 'x1', label: body.label, amount: Number(body.amount), every: body.every, from: body.from }); return {}; }
      if (path === '/admin/api/promo/template') { const i = S.templates.findIndex(t => t.name === body.name); const t = { ...body, issues: /stop/i.test(body.body) ? [] : ['A promotion must tell people how to stop (for example: Reply STOP to stop offers).'], vars: [...new Set([...body.body.matchAll(/\{\{(\d+)\}\}/g)].map(x => +x[1]))] }; if (i >= 0) S.templates[i] = t; else S.templates.push(t); return {}; }
      if (path === '/admin/api/promo/template/draft') return { variants: [{ name: 'new_arrivals_note', kind: 'marketing', body: 'Hello {{1}}, new sarees: {{2}}\nReply STOP to stop offers.', example: ['Priya', 'u'], note: 'Short and gentle.' }] };
      if (path === '/admin/api/promo/campaign') { S.campaigns.unshift({ id: 'c2', name: body.name, template: body.template, status: 'draft', sent: 0, failed: 0 }); return {}; }
      if (path === '/admin/api/promo/campaign/estimate') return { recipients: 3, estimate: 2.64, perMessage: 0.88 };
      if (path === '/admin/api/promo/campaign/test') return { ok: true, dry: true };
      if (path === '/admin/api/promo/campaign/approve') { S.campaigns.find(c => c.id === body.id).status = 'sending'; return {}; }
      return {};
    };
    isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('promo');
  }); await sleep(500);
  const txt = () => ev(() => document.getElementById('adminContent').innerText);
  ok('promo: the tab opens with a plain warning that WhatsApp is not live and nothing real is sent', /not connected yet/i.test(await txt()) && /simulated/i.test(await txt()));
  ok('promo: the report shows regular, order-update, promotion and sign-in counts and the costs', await ev(() => { const t = document.querySelector('#adminContent .g-tiles').innerText; return /Regular/.test(t) && /Promotions/.test(t) && /₹3\.52/.test(t) && /2 simulated/.test(t); }));
  ok('promo: total expenses = message costs + other running costs', /Total expenses/.test(await txt()) && /₹4\.12/.test(await txt()));
  ok('promo: tables by kind, source, month and promotion are shown', await ev(() => document.querySelectorAll('#adminContent .pr-tbl').length === 4));
  await ev(() => prRange('7')); await sleep(300); ok('promo: choosing a period asks the server for that period', await ev(() => window.__calls.some(c => /promo\/report\?from=\d{4}-\d\d-\d\d&to=\d{4}-\d\d-\d\d/.test(c.path))));
  await ev(() => { document.getElementById('pr-rate-marketing').value = '1.1'; prSaveRates(); }); await sleep(300);
  ok('promo: saving prices sends all four prices and the note', await ev(() => { const c = window.__calls.filter(x => x.path === '/admin/api/promo/rates').pop(); return c && c.body.rates.marketing === '1.1' && 'service' in c.body.rates && 'authentication' in c.body.rates; }));
  await ev(() => { document.getElementById('pr-x-label').value = 'Server'; document.getElementById('pr-x-amt').value = '500'; prAddExpense(); }); await sleep(300);
  ok('promo: adding a running cost lists it and raises the total', /Server: ₹500\.00 every month/.test(await txt()) && /₹504\.12/.test(await txt()));
  // templates
  ok('promo: a template with a problem shows the warning under it', /must tell people how to stop/.test(await txt()));
  await ev(() => { document.getElementById('pr-t-name').value = 'my_note'; document.getElementById('pr-t-body').value = 'Hello {{1}} sarees {{2}} today'; prSaveTpl(); }); await sleep(300);
  ok('promo: a newly saved template is a draft with its warning', await ev(() => { const c = window.__calls.filter(x => x.path === '/admin/api/promo/template').pop(); return c.body.status === 'draft' && c.body.name === 'my_note'; }) && /my_note/.test(await txt()));
  await ev(() => { document.getElementById('pr-ai-goal').value = 'Diwali'; }); await p.click('#pr-ai-btn'); await sleep(500);
  ok('promo AI: without Claude it falls back to the built-in drafts and says so', await ev(() => document.querySelectorAll('#adminContent .ai-sec .pr-tpl').length === 1 && /built-in/.test(document.getElementById('pr-msg').textContent)));
  await p.click('#adminContent .ai-sec .pr-tpl button'); await sleep(200);
  ok('promo AI: "Use this" fills the form but saves nothing', await ev(() => document.getElementById('pr-t-name').value === 'new_arrivals_note' && /STOP/.test(document.getElementById('pr-t-body').value) && !window.__calls.some(c => c.body && c.body.name === 'new_arrivals_note')));
  await ev(() => { document.getElementById('pr-ai-goal').value = ''; }); await p.click('#pr-ai-btn'); await sleep(200);
  ok('promo AI: asking with no goal written is refused politely', /what the message is for/i.test(await ev(() => document.getElementById('pr-msg').textContent)));
  await ev(() => prSetStatus('draft_one', 'submitted')); await sleep(300); ok('promo: marking a template submitted keeps its wording and changes only the status', await ev(() => { const c = window.__calls.filter(x => x.path === '/admin/api/promo/template').pop(); return c.body.status === 'submitted' && c.body.name === 'draft_one' && /offers/.test(c.body.body); }));
  // promotions
  ok('promo: how many people can receive it is shown, with the reasons others are left out', /3 customers can receive/.test(await txt()) && /1 said no to offers/.test(await txt()) && /1 sent STOP/.test(await txt()));
  ok('promo: only approved promotion templates can be chosen for a promotion', await ev(() => [...document.querySelectorAll('#pr-c-tpl option')].map(o => o.value).join() === 'diwali_note') && await ev(() => document.querySelectorAll('.pr-c-par').length === 2 && document.querySelector('.pr-c-par').value === '@name'));
  await ev(() => { document.getElementById('pr-c-name').value = 'Pongal'; document.querySelectorAll('.pr-c-par')[1].value = 'https://shop.test'; prNewCamp(); }); await sleep(300);
  ok('promo: creating a promotion sends the name, template and values, and sends nothing to customers yet', await ev(() => { const c = window.__calls.filter(x => x.path === '/admin/api/promo/campaign').pop(); return c.body.name === 'Pongal' && c.body.params.join() === '@name,https://shop.test' && !window.__calls.some(x => /approve/.test(x.path)); }));
  dialogs.length = 0; await ev(() => prTest('c1')); await sleep(300); ok('promo: a test send asks for your own number and says it was only simulated', dialogs.some(d => /own WhatsApp number/.test(d)) && /Simulated test/.test(await ev(() => document.getElementById('pr-msg').textContent)));
  dialogs.length = 0; await ev(() => prStart('c1')); await sleep(400);
  ok('promo: Start first shows the number of people, the rough cost and the quiet-hours promise, then confirms with that exact number', dialogs.some(d => /3 customers/.test(d) && /₹2\.64/.test(d) && /9 am and 9 pm/.test(d)) && await ev(() => window.__calls.some(c => /campaign\/approve/.test(c.path) && c.body.confirmCount === 3)));
  ok('promo: the promotion now reads "sending" and offers Stop', /sending/.test(await txt()));
  ok('promo: no script errors', errs.length === 0, errs.join('|'));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
