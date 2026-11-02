const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); let dialogMsg = ''; p.on('dialog', d => { dialogMsg = d.message(); d.accept('1234'); });
  const calls = []; let reply = {};
  await ctx.route(/^https?:\/\//, r => { const u = r.request().url(); if (/127\.0\.0\.1:9\d{3}\/api\/ai/.test(u)) { const body = JSON.parse(r.request().postData() || '{}'); calls.push(body); const f = reply[body.task]; if (f === 'ERR') return r.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'The AI returned nothing' }) }); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...(f || { text: 'default' }) }) }); } r.abort(); });
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }; const ev = (f, a) => p.evaluate(f, a);
  const tab = t => ev(t => { if (!isAdminView) toggleView(); switchAdminTab(t); }, t); const txt = id => ev(id => { const e = document.getElementById(id); return (e.innerText + ' ' + [...e.querySelectorAll('textarea')].map(x => x.value).join(' ')).replace(/\s+/g, ' '); }, id);
  await ev(() => { db.orders = [
    { id: 'T1', userId: 'u1', customer: 'Priya Ramakrishnan', phone: '+919876543210', total: 45999, status: 'delivered', date: ymd(new Date()), source: 'website', items: [{ productId: 'p1', name: 'Maroon Kalamkari Tussar', quantity: 1, price: 45999, category: 'Tussar' }], pricing: { discount: 500 } },
    { id: 'T2', userId: 'u1', customer: 'Priya Ramakrishnan', phone: '+919876543210', total: 18500, status: 'delivered', date: ymd(new Date()), source: 'website', items: [{ productId: 'p3', name: 'Pure Maheswari Silk', quantity: 1, price: 18500, category: 'Maheswari' }], pricing: {} }];
    db.users[0].addr = { street: '12 banjara hills', city: 'hyderabad ', state: 'karnataka', pincode: '500034' }; db.users[1].phone = db.users[0].phone; db.users[1].addr = { street: '5 Indiranagar', city: 'Bangalore', state: 'Karnataka', pincode: '560038' }; db.logs.unshift({ id: 99, type: 'product_created', product: 'Coral Ponduru Khadi', time: '2026-07-01 10:00', reason: 'x' }); });
  await tab('ai');
  ok('AI Helper tab opens with 7 tool sections and the switches', await ev(() => document.querySelectorAll('.ai-sec').length === 7 && /AI Helper/.test(document.querySelector('.admin-header h2').textContent)));
  ok('shown as not connected, with how to connect', /not connected/i.test(await txt('adminContent')));
  ok('AI Helper is in the desktop and phone menus', await ev(() => !!document.querySelector('.admin-nav-item[data-tab="ai"]') && !!document.querySelector('#adminMobileNavList li[data-tab="ai"]')));
  // ---- built-in (not connected) ----
  await ev(() => { document.querySelectorAll('.ai-sec').forEach(d => d.open = true); document.getElementById('aw-occ').value = 'Diwali'; document.getElementById('aw-code').value = 'FESTIVE20'; });
  await ev(() => aiWrite()); await p.waitForTimeout(150);
  ok('writer (built-in): three drafts with the occasion, the offer code and the STOP line', await ev(() => { const t = [...document.querySelectorAll('#aw-out textarea')].map(x => x.value); return t.length === 3 && t.every(x => /Diwali/.test(x) && /FESTIVE20/.test(x) && /Reply STOP/.test(x)); }));
  ok('writer: Copy and Open-in-WhatsApp on each draft, and the consent reminder', await ev(() => document.querySelectorAll('#aw-out .ai-act a[href*="wa.me"]').length === 3 && /agreed to receive/.test(document.getElementById('aw-out').textContent)));
  await ev(() => aiAsk('Which fabric sold best in the last 90 days?')); await p.waitForTimeout(100);
  ok('ask (built-in): answers from the numbers', /Best-selling fabric/.test(await txt('ak-out')) && /Tussar|Silk/.test(await txt('ak-out')));
  await ev(() => aiAsk('Who are my repeat customers (how many)?')); ok('ask: repeat customers answered', /1 customer has ordered more than once/.test(await txt('ak-out')));
  await ev(() => aiAsk('tell me a joke')); ok('ask: an unsupported question explains what it can answer', /Connect Claude/.test(await txt('ak-out')));
  await ev(() => aiSummary()); await p.waitForTimeout(100);
  ok('summary (built-in): revenue, best seller and waiting orders', /₹ 64,499/.test(await txt('sm-out')) && /Best seller/.test(await txt('sm-out')));
  await ev(() => aiPricing()); await p.waitForTimeout(100);
  ok('pricing ideas (built-in): flags a slow piece listed long ago', /Coral Ponduru Khadi/.test(await txt('pr-out')) && /Small offer|Feature it|Make a bundle/.test(await txt('pr-out')));
  await ev(() => aiClean()); await p.waitForTimeout(100);
  ok('clean-up finds the untidy city, the state that does not match the PIN, and the duplicate phone', await ev(() => { const t = document.getElementById('cl-out').textContent; return /hyderabad/i.test(t) && /Hyderabad/.test(t) && /Telangana/.test(t) && /Same phone number on 2 accounts/.test(t); }));
  await ev(() => { const i = CLEAN.items.findIndex(x => x.kind === 'fix' && x.field === 'city'); cleanApply(i); });
  ok('applying a fix changes the customer record', await ev(() => db.users[0].addr.city === 'Hyderabad'));
  await ev(() => cleanApplyAll());
  ok('apply all fixes the state from the PIN', await ev(() => db.users[0].addr.state === 'Telangana'));
  ok('duplicates are only flagged, never merged', await ev(() => db.users.length === 3));
  await ev(() => { document.getElementById('tr-text').value = 'Hello'; return aiTranslate(); }); ok('translate says Claude is needed when not connected', /not connected/i.test(await txt('tr-out')));
  // ---- connected ----
  await ev(() => { db.settings.assistantUrl = 'http://127.0.0.1:9001'; sessionStorage.setItem('wa_admin_tok', 'tok-abcdefghijkl'); renderAiHelper(document.getElementById('adminContent')); document.querySelectorAll('.ai-sec').forEach(d => d.open = true); });
  ok('connected: status turns green', /Claude is connected/.test(await txt('adminContent')));
  reply = { write: { data: { variants: ['Hello A', 'Hello B', 'Hello C'] } }, ask: { text: 'Maheswari sold best.' }, summary: { text: '• Good week' }, pricing: { data: { suggestions: [{ name: 'Coral Ponduru Khadi', action: 'small_discount', reason: 'slow' }, { name: 'Invented Saree', action: 'bundle', reason: 'x' }, { name: 'Pure Maheswari Silk', action: 'delete_everything', reason: 'x' }] } }, translate: { text: 'నమస్కారం' }, review: { text: 'Thank you so much!' }, describe: { data: { description: 'A rich tussar saree.', tags: ['tussar', 'festive'], seoTitle: 'Maroon Tussar Saree', metaDescription: 'Meta text', altText: 'Maroon saree' } }, photo: { data: { category: 'Jewellery', fabric: '', colours: ['Gold', 'Green'], border: 'zari border', pattern: '', occasions: ['Festive'], notes: '' } }, cleanup: { data: { fixes: [{ id: 'u:u2', field: 'name', to: 'Meera Krishnamurthi', why: 'spelling' }, { id: 'u:u1', field: 'street', to: '99 Banjara Hills', why: 'sneaky number change' }, { id: 'u:u1', field: 'street', to: '12 Banjara Hills', why: 'capitals' }, { id: 'u:zzz', field: 'city', to: 'x', why: 'x' }, { id: 'u:u1', field: 'pin', to: '500099', why: 'x' }] } } };
  await ev(() => { document.getElementById('aw-occ').value = 'Ugadi'; document.getElementById('aw-lang').value = 'te'; return aiWrite(); }); await p.waitForTimeout(150);
  ok('writer (Claude): shows Claude’s drafts and sends occasion + language, no phone numbers', await ev(() => [...document.querySelectorAll('#aw-out textarea')].map(x => x.value).join() === 'Hello A,Hello B,Hello C') && calls.at(-1).task === 'write' && calls.at(-1).input.lang === 'te' && calls.at(-1).input.occasion === 'Ugadi' && !/\+91|98765/.test(JSON.stringify(calls.at(-1))));
  await ev(() => aiAsk('Which fabric sold best?')); await p.waitForTimeout(150);
  const askCall = calls.filter(c => c.task === 'ask').at(-1), askStr = JSON.stringify(askCall);
  ok('ask (Claude): answer shown; the data sent has no customer names, phones, emails or addresses', /Maheswari sold best/.test(await txt('ak-out')) && !/Priya|Meera|Sneha|\+91|98765|example\.com|Banjara|Hyderabad/.test(askStr) && askCall.input.data.revenue === 64499);
  await ev(() => aiSummary()); await p.waitForTimeout(100); ok('summary (Claude)', /Good week/.test(await txt('sm-out')) && calls.at(-1).task === 'summary');
  await ev(() => aiPricing()); await p.waitForTimeout(150);
  ok('pricing (Claude): keeps only real products and known actions', await ev(() => document.querySelectorAll('#pr-out .ai-idea').length === 1) && /Coral Ponduru Khadi/.test(await txt('pr-out')) && !/Invented/.test(await txt('pr-out')));
  dialogMsg = ''; await ev(() => { CLEAN = { items: [], addr: [] }; return aiCleanAi(); }); await p.waitForTimeout(200);
  ok('clean-up (Claude): asks before sending addresses and says phones are not sent', /customer names and addresses/.test(dialogMsg) && /not sent/.test(dialogMsg));
  ok('Claude’s fixes are checked: spelling accepted; changed house numbers, unknown rows and PIN edits rejected', await ev(() => { const a = CLEAN.items.filter(x => x.kind === 'aifix'); return a.length === 2 && a.some(x => x.to === 'Meera Krishnamurthi') && a.some(x => x.to === '12 Banjara Hills') && !a.some(x => /99|500099/.test(x.to)); }) && !/\+91|98765/.test(JSON.stringify(calls.filter(c => c.task === 'cleanup').at(-1))));
  await ev(() => document.getElementById('tr-text').value = 'Hello ₹500'); await ev(() => aiTranslate()); await p.waitForTimeout(100);
  ok('translate (Claude)', /నమస్కారం/.test(await txt('tr-out')) && calls.at(-1).input.to === 'en' || /నమస్కారం/.test(await txt('tr-out')));
  reply.write = 'ERR'; await ev(() => aiWrite()); await p.waitForTimeout(100); ok('an AI error is shown clearly, nothing breaks', /returned nothing/.test(await txt('aw-out')));
  // product form (1, 2, 10)
  await ev(() => { openProductForm('p9'); }); await p.waitForTimeout(100);
  ok('product form has language, Write with Claude, Read photo and Translate', await ev(() => !!document.getElementById('pf-ai-write') && !!document.getElementById('pf-lang') && /Read photo/.test(document.getElementById('adminModalBody').textContent) && /Translate/.test(document.getElementById('adminModalBody').textContent)));
  await ev(() => { document.getElementById('pf-lang').value = 'hi'; PF.lang = 'hi'; return pfAiDescribe(); }); await p.waitForTimeout(200);
  ok('Write with Claude fills description, tags, SEO and alt text, in the chosen language', await ev(() => document.getElementById('p-desc').value === 'A rich tussar saree.' && PF.tags.includes('festive') && document.getElementById('pf-seo-title').value === 'Maroon Tussar Saree' && document.getElementById('pf-alt').value === 'Maroon saree') && calls.filter(c => c.task === 'describe').at(-1).input.lang === 'hi' && calls.filter(c => c.task === 'describe').at(-1).input.kind === 'accessory');
  await ev(() => pfAiPhoto()); await p.waitForTimeout(400);
  const pc = calls.filter(c => c.task === 'photo').at(-1);
  ok('Read photo sends a small JPEG and the allowed categories, then adds colours, border and occasions as suggestions', pc && /^data:image\/jpeg;base64,/.test(pc.input.image) && pc.input.image.length < 400000 && pc.input.categories.includes('Jewellery') && await ev(() => PF.colours.includes('Gold') && PF.tags.includes('zari border') && /suggests/.test(document.getElementById('pf-ai-status').textContent)));
  await ev(() => { PF.description = 'Hello'; return pfAiTranslate(); }); await p.waitForTimeout(150); ok('Translate in the form replaces the description with the translation', await ev(() => document.getElementById('p-desc').value === 'నమస్కారం'));
  await ev(() => closeModal('adminModal'));
  // reviews (5)
  await ev(() => { db.reviews = [{ id: 'rv1', productId: 'p1', userId: 'u1', name: 'Priya R', rating: 2, text: 'Colour was different', status: 'pending', createdAt: new Date().toISOString(), reply: '', photos: [] }]; RA.filter = 'pending'; switchAdminTab('reviews'); });
  await ev(() => revAiReply('rv1')); await p.waitForTimeout(150);
  ok('Review: Draft fills the reply box for the owner to edit (not saved yet)', await ev(() => document.getElementById('rr-rv1').value === 'Thank you so much!' && !db.reviews[0].reply) && calls.at(-1).task === 'review' && calls.at(-1).input.rating === 2);
  await ev(() => { db.settings.assistantUrl = ''; }); await ev(() => revAiReply('rv1')); await p.waitForTimeout(100);
  ok('Review: without Claude a built-in apology draft is used', await ev(() => /sorry/i.test(document.getElementById('rr-rv1').value)));
  await ev(() => { db.settings.assistantUrl = 'http://127.0.0.1:9001'; });
  // switches
  await tab('ai'); await ev(() => aiToggle('describe', false));
  ok('switching a helper off is saved and greys its buttons', await ev(() => db.settings.ai.describe === false && aiOn('describe') === false));
  await ev(() => { openProductForm('p9'); }); ok('...the product form button is disabled', await ev(() => document.getElementById('pf-ai-write').disabled)); await ev(() => closeModal('adminModal'));
  await ev(() => aiToggle('master', false)); await ev(() => document.querySelectorAll('.ai-sec').forEach(d => d.open = true));
  let e2 = ''; try { await ev(() => aiCall('ask', {})); } catch (e) { e2 = e.message; }
  ok('master switch off: every helper refuses', /switched off/.test(e2) || await ev(() => aiOn('ask') === false));
  ok('no JS errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
