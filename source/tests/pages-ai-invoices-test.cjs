// Owner app: (1) invoice search/sort/group by person, month, year and date, (2) the product form fills itself when the category
// changes and does everything in one click, (3) the Care guide, Journal and Atelier are written and edited by the owner and show on the website.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(500);
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  // ============ invoices ============
  await ev(() => { db.invoices = [
    { id: 'INV-1', orderId: 'O1', customer: 'Asha Rao', phone: '+919800000001', email: 'a@x.test', amount: 5000, date: '2026-01-15', status: 'sent' },
    { id: 'INV-2', orderId: 'O2', customer: 'Bina Shah', phone: '+919800000002', email: 'b@x.test', amount: 12000, date: '2026-03-02', status: 'sent' },
    { id: 'INV-3', orderId: 'O3', customer: 'Asha Rao', phone: '+919800000001', email: 'a@x.test', amount: 7000, date: '2026-03-20', status: 'sent' },
    { id: 'INV-4', orderId: 'O4', customer: 'Chitra Nair', phone: '+919800000003', email: '', amount: 3000, date: '2025-03-09', status: 'sent' },
    { id: 'INV-5', orderId: 'O5', customer: 'Bina Shah', phone: '+919800000002', email: 'b@x.test', amount: 9000, date: '2026-11-01', status: 'sent' }]; renderAdminContent('invoices'); });
  const rows = () => ev(() => [...document.querySelectorAll('#inv-body tr:not(.inv-grp)')].map(r => r.children[0].innerText));
  const sum = () => ev(() => document.getElementById('inv-sum').innerText);
  ok('invoices: all five show, newest first, with a count and total (₹36,000)', JSON.stringify(await rows()) === JSON.stringify(['INV-5', 'INV-3', 'INV-2', 'INV-1', 'INV-4']) && /5 of 5/.test(await sum()) && /36,000/.test(await sum()));
  await ev(() => invSet('q', 'asha')); ok('search by name', JSON.stringify(await rows()) === JSON.stringify(['INV-3', 'INV-1']));
  await ev(() => invSet('q', '9800000002')); ok('search by phone number', JSON.stringify(await rows()) === JSON.stringify(['INV-5', 'INV-2']));
  await ev(() => invSet('q', 'inv-4')); ok('search by invoice number', JSON.stringify(await rows()) === JSON.stringify(['INV-4']));
  await ev(() => invClear()); await ev(() => { const s = document.getElementById('inv-cust'); s.value = [...s.options].find(o => /Bina/.test(o.text)).value; invSet('cust', s.value); });
  ok('individual-wise: pick one customer and see only their invoices with their total (₹21,000)', JSON.stringify(await rows()) === JSON.stringify(['INV-5', 'INV-2']) && /21,000/.test(await sum()));
  await ev(() => invClear()); await ev(() => invSet('year', '2025')); ok('year-wise: 2025 shows only that year', JSON.stringify(await rows()) === JSON.stringify(['INV-4']));
  await ev(() => { invSet('year', '2026'); invSet('month', '03'); }); ok('month-wise: March 2026 shows the two March invoices (₹19,000)', JSON.stringify(await rows()) === JSON.stringify(['INV-3', 'INV-2']) && /19,000/.test(await sum()));
  await ev(() => invClear()); await ev(() => { invSet('from', '2026-03-01'); invSet('to', '2026-03-31'); }); ok('date-wise: a from and to date picks the range and clears the month and year filters', JSON.stringify(await rows()) === JSON.stringify(['INV-3', 'INV-2']) && await ev(() => document.getElementById('inv-year').value === ''));
  await ev(() => invClear()); await ev(() => invSet('sort', 'amt-desc')); ok('sort by amount, high to low', JSON.stringify(await rows()) === JSON.stringify(['INV-2', 'INV-5', 'INV-3', 'INV-1', 'INV-4']));
  await ev(() => invSet('sort', 'date-asc')); ok('sort by date, oldest first', JSON.stringify(await rows()) === JSON.stringify(['INV-4', 'INV-1', 'INV-2', 'INV-3', 'INV-5']));
  await ev(() => invSet('sort', 'cust-asc')); ok('sort by customer A to Z', (await rows())[0] === 'INV-3' && (await rows()).slice(-1)[0] === 'INV-4');
  await ev(() => { invSet('sort', 'date-desc'); invSet('group', 'customer'); }); ok('group by customer shows each person with how many and how much (Asha Rao: 2 invoices, ₹12,000)', await ev(() => /Asha Rao\s*·\s*2 invoices\s*·\s*₹\s*12,000/.test(document.getElementById('inv-body').innerText.replace(/\s+/g, ' '))));
  await ev(() => invSet('group', 'month')); ok('group by month names the months (March 2026)', await ev(() => /March 2026/.test(document.getElementById('inv-body').innerText)));
  await ev(() => invSet('group', 'year')); ok('group by year shows 2026 and 2025', await ev(() => /2026/.test(document.getElementById('inv-body').innerText) && /2025/.test(document.getElementById('inv-body').innerText)));
  await ev(() => { invClear(); invSet('q', 'nobody'); }); ok('no match says so in plain words', await ev(() => /No invoice matches/.test(document.getElementById('inv-body').innerText)));
  await ev(() => { invClear(); }); ok('the View and Resend buttons are still on every row', await ev(() => document.querySelectorAll('#inv-body button').length === 10));
  // ============ product form: category fills SKU, description, tags and SEO; one click does it all ============
  await ev(() => { db.settings.ai = { master: true }; openProductForm(); });
  ok('a new product starts with an automatic SKU for the first category', await ev(() => /^AP-TUS-\d{3}$/.test(document.getElementById('p-sku').value)));
  await ev(() => { document.getElementById('p-name').value = 'Rust Kanchi Silk'; pfSet('name', 'Rust Kanchi Silk'); const c = document.getElementById('p-cat'); c.value = 'Paithani'; c.dispatchEvent(new Event('change')); }); await sleep(900);
  const st = await ev(() => ({ sku: document.getElementById('p-sku').value, d: document.getElementById('p-desc').value, tags: PF.tags.length, seo: document.getElementById('pf-seo-title').value, fabric: document.getElementById('pf-fabric').value }));
  ok('choosing the category updates the SKU for it (AP-PHT-…)', /^AP-PHT-\d{3}$/.test(st.sku));
  ok('choosing the category writes the description, tags and SEO by itself', st.d.length > 80 && /Paithani/i.test(st.d) && st.tags >= 5 && st.seo.length > 10 && /Paithani/i.test(st.fabric));
  await ev(() => { const d = document.getElementById('p-desc'); d.value = 'My own words.'; pfSet('description', 'My own words.'); const c = document.getElementById('p-cat'); c.value = 'Banarasi'; c.dispatchEvent(new Event('change')); }); await sleep(900);
  ok('changing category again changes the SKU and tags but keeps a description the owner wrote', await ev(() => /^AP-BNR-\d{3}$/.test(document.getElementById('p-sku').value) && document.getElementById('p-desc').value === 'My own words.' && PF.tags.some(t => /banarasi/i.test(t))));
  await ev(() => { const s = document.getElementById('p-sku'); s.value = 'MY-SKU-9'; pfSet('sku', 'MY-SKU-9'); const c = document.getElementById('p-cat'); c.value = 'Tussar'; c.dispatchEvent(new Event('change')); }); await sleep(600);
  ok('a SKU the owner typed is never replaced', await ev(() => document.getElementById('p-sku').value === 'MY-SKU-9'));
  ok('the form has ONE main AI button, and the single-part buttons are folded away', await ev(() => !!document.getElementById('pf-auto') && !document.getElementById('pf-more').open && /Auto-fill everything/.test(document.getElementById('pf-auto').textContent)));
  await ev(() => { PF.description = ''; document.getElementById('p-desc').value = ''; PF.descTouched = false; PF.tagsTouched = false; PF.tags = []; pfRenderTags(); PF.seoTitle = ''; document.getElementById('pf-seo-title').value = ''; }); await p.click('#pf-auto'); await p.waitForFunction(() => PF.description.length > 60 && PF.tags.length >= 5 && document.getElementById('pf-seo-title').value.length > 5, null, { timeout: 15000 });
  ok('one click without Claude connected fills description, tags and SEO with the built-in writer, no error', await ev(() => !/not connected yet/i.test(document.body.innerText) && /built-in|AI-assisted|done/i.test(document.getElementById('pf-ai-status').textContent) && /Claude is not connected/.test(document.getElementById('pf-ai-note').textContent)));
  // with Claude connected: one click makes the photo read, then the writing, both calls, once
  await ev(() => { window.__calls = []; db.settings.assistantUrl = 'https://assistant.test'; sessionStorage.setItem('wa_admin_tok', 'tok'); window.waCall = async (path, o) => { const b = JSON.parse(o.body); window.__calls.push(b.task); if (b.task === 'photo') return { data: { colours: ['Rust'], fabric: 'Pure Silk', category: 'Paithani', occasions: ['wedding'] } }; return { data: { description: 'Claude wrote this saree description in full.', tags: ['rust silk', 'wedding'], seoTitle: 'Rust Paithani Silk Saree', metaDescription: 'A rust Paithani silk saree for weddings, handwoven, with free shipping across India.', altText: 'Rust Paithani saree' } }; };
    PF.images = ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k='];
    PF.id = null; document.getElementById('p-name').value = ''; PF.name = ''; });
  await p.click('#pf-auto'); await p.waitForFunction(() => __calls.includes('describe'), null, { timeout: 15000 }); await sleep(300);
  ok('one click with Claude connected: reads the photo, then writes (two calls, one click)', await ev(() => __calls.join() === 'photo,describe' && document.getElementById('p-desc').value === 'Claude wrote this saree description in full.' && document.getElementById('pf-seo-title').value === 'Rust Paithani Silk Saree' && PF.colours.includes('Rust')));
  await ev(() => { closeModal('adminModal'); });
  // ============ the owner edits Care, Journal and Atelier; the website follows ============
  await ev(() => renderAdminContent('pages')); await sleep(200);
  ok('Pages screen lists the care guide, the journal and the atelier', await ev(() => /Saree care guide/i.test(document.getElementById('adminContent').innerText) && /The Journal/i.test(document.getElementById('adminContent').innerText) && /The Atelier/i.test(document.getElementById('adminContent').innerText)));
  ok('the website pages are drawn from this data (4 care tabs, 3 stories, the atelier text)', await ev(() => document.querySelectorAll('#page-care .care-tab').length === 4 && document.querySelectorAll('#page-journal .journal-card').length === 3 && /Preserving the Art of Handloom/.test(document.getElementById('page-atelier').innerText)));
  await ev(() => { pgSet('care.sections.0.items.0.text', 'Only dry clean this one. Test it.'); pgSet('journal.posts.0.title', 'Kalamkari, in the weaver\'s words'); pgSet('atelier.heading', 'Made by hand in Hyderabad'); });
  ok('editing writes through to the website pages at once', await ev(() => /Only dry clean this one/.test(document.getElementById('page-care').innerText) && /in the weaver/.test(document.getElementById('page-journal').innerText) && /Made by hand in Hyderabad/.test(document.getElementById('page-atelier').innerText)));
  await ev(() => pgAdd('journal.posts', { id: 'jn', date: '2026-11-03', title: 'A brand new story', excerpt: 'Short.', body: 'Para one.\n\nPara two.', image: '', alt: '', show: true }));
  ok('adding a story shows it first (newest date) with a Read Story link', await ev(() => { const c = document.querySelectorAll('#page-journal .journal-card'); return c.length === 4 && /brand new/.test(c[0].innerText) && !!c[0].querySelector('.journal-link'); }));
  await ev(() => openJournal('jn')); ok('Read Story opens the full story in a window', await ev(() => document.getElementById('journalModal').classList.contains('active') && /Para two/.test(document.getElementById('journalBody').innerText))); await ev(() => closeModal('journalModal'));
  await ev(() => { pgSet('journal.posts.0.show', false); }); ok('hiding a story removes it from the website but keeps it in the editor', await ev(() => document.querySelectorAll('#page-journal .journal-card').length === 3 && db.pages.journal.posts.length === 4));
  await ev(() => { db.pages.journal.posts.splice(0, 1); saveDB(); renderPublicPages(); }); ok('removing a story deletes it', await ev(() => db.pages.journal.posts.length === 3));
  await ev(() => pgAdd('care.sections', { id: 'zz', tab: 'Cotton blouses', title: 'Blouse care', image: '', alt: '', show: true, items: [{ icon: '🧺', title: 'Wash', text: 'Wash inside out.' }] })); ok('adding a care section adds a tab with its advice', await ev(() => document.querySelectorAll('#page-care .care-tab').length === 5 && /Wash inside out/.test(document.getElementById('care-zz').innerText)));
  await ev(() => { switchCareTab('zz', document.querySelectorAll('.care-tab')[4]); }); ok('the care tabs still switch', await ev(() => document.getElementById('care-zz').classList.contains('active') && !document.getElementById('care-silk').classList.contains('active')));
  await ev(() => { pgSet('atelier.stats.0.value', '7'); pgDel('atelier.stats', 1, 'number'); }); ok('atelier numbers can be changed and removed', await ev(() => /7/.test(document.getElementById('page-atelier').innerText) && db.pages.atelier.stats.length === 2));
  await ev(() => pgSet('care.sections.0.image', 'data:image/jpeg;base64,AAAA')); ok('an uploaded photo (data) and a web link are both accepted as photos; anything else is refused', await ev(() => { pgSet('care.sections.1.image', 'javascript:alert(1)'); renderPublicPages(); return !!document.querySelector('#care-silk img.care-image') && !document.querySelector('#care-tussar img'); }));
  await ev(() => pgReset('journal')); ok('"Put the original back" restores the first three stories', await ev(() => db.pages.journal.posts.length === 3 && /Ancient Art of Kalamkari/.test(document.getElementById('page-journal').innerText)));
  ok('the saved shop data now carries the pages (so the website and the owner app stay in step)', await ev(() => !!JSON.parse(localStorage.getItem('ap_db_v70')).pages));
  ok('no JavaScript errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
