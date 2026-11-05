// Backend menu sorted by type, a plain "what this does" line on every page, and Settings split by login with help under every field.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1216, height: 800 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(600);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); admGroupNav(); switchAdminTab('dashboard'); }); await sleep(300);
  const order = () => ev(() => [...document.querySelectorAll('#adminSidebarDesktop .admin-nav > li')].map(li => li.classList.contains('nav-group') ? '#' + li.textContent : li.dataset.tab));
  let o = await order();
  ok('desktop menu: sorted into 8 headed groups in a sensible order', o.filter(x => x[0] === '#').join() === '#Overview,#Sarees & prices,#Orders & customers,#Money & reports,#Marketing & messages,#Website look,#Privacy & legal,#AI, health & settings', o.join());
  ok('desktop menu: each page sits under the right heading', o.join('|').includes('#Sarees & prices|products|categories|bundles|coupons|studio|drafts|#Orders & customers|orders|invoices|delivery|customers|reviews|alerts|#Money & reports|statements|growth|#Marketing & messages|whatsapp|promo|social|#Website look|home|pages|#Privacy & legal|privacy|#AI, health & settings|ai|ops|logs|settings'));
  ok('every page is still in the menu exactly once (nothing lost, nothing doubled)', await ev(() => { const t = [...document.querySelectorAll('#adminSidebarDesktop .admin-nav > li[data-tab]')].map(l => l.dataset.tab); return t.length === 25 && new Set(t).size === 25; }));
  ok('phone menu: the same groups and order', await ev(() => { const a = [...document.querySelectorAll('#adminSidebarDesktop .admin-nav > li')].map(l => l.dataset.tab || l.textContent).join('|'), m = [...document.querySelectorAll('.admin-mobile-nav ul > li')].filter(l => l.dataset.tab || l.classList.contains('nav-group')).map(l => l.dataset.tab || l.textContent).join('|'); return m === a; }));
  ok('a heading is not clickable and clicking a page still opens it', await ev(() => { document.querySelector('#adminSidebarDesktop li[data-tab="coupons"]').click(); return currentAdminTab === 'coupons' && getComputedStyle(document.querySelector('.nav-group')).pointerEvents === 'none'; }));
  await ev(() => { ['products', 'categories', 'bundles', 'coupons', 'studio', 'drafts'].forEach(t => document.querySelectorAll(`[data-tab="${t}"]`).forEach(l => { l.style.display = 'none'; })); admGroupNav(); });
  ok('when a login may open nothing in a group, the heading disappears too', !(await order()).includes('#Sarees & prices') && (await order()).includes('#Orders & customers'));
  await ev(() => document.querySelectorAll('[data-tab]').forEach(l => { l.style.display = ''; })); await ev(() => admGroupNav());
  // descriptions
  ok('every page has a plain description', await ev(() => [...document.querySelectorAll('#adminSidebarDesktop li[data-tab]')].every(l => admDescOf(l.dataset.tab).length > 20)));
  ok('opening a page shows its description under the title', await ev(() => { switchAdminTab('categories'); return /Accessories on or off/.test(document.getElementById('adminPageDesc').textContent); }));
  ok('shared pages say different things to the owner and the admin', await ev(() => { ADM.role = 'owner'; const o = admDescOf('settings'); ADM.role = 'admin'; const a = admDescOf('settings'); ADM.role = ''; return /business details/.test(o) && /technical settings/.test(a); }));
  ok('the WhatsApp promotions page says what it covers', await ev(() => /total expenses/.test(admDescOf('promo'))));
  // settings
  await ev(() => switchAdminTab('settings')); await sleep(400);
  ok('Settings: every field has a one-line explanation under it', await ev(() => ['s-name', 's-gst', 's-bank', 's-prefix', 's-gstrate', 's-dispatch', 's-returndays', 's-grievance', 's-site', 's-metadesc', 's-otp', 's-ai'].every(id => document.getElementById(id).nextElementSibling && document.getElementById(id).nextElementSibling.classList.contains('fld-help'))));
  ok('Settings: cards are marked for who may change them (owner: business, bank, invoices, policies; admin: customer sign-in, search, AI service)', await ev(() => document.querySelectorAll('#adminContent [data-for="owner"]').length === 4 && document.querySelectorAll('#adminContent [data-for="admin"]').length === 3 && !!document.querySelector('[data-for="owner"] #s-returndays') && !!document.querySelector('[data-for="admin"] #s-otp') && !!document.querySelector('[data-for="admin"] #s-site')));
  ok('Settings: saving with only some fields on the page changes only those (the other login\'s settings are untouched)', await ev(() => { db.settings.siteUrl = 'https://keep.example'; db.settings.businessName = 'Old'; document.getElementById('s-site').closest('.admin-card').remove(); document.getElementById('s-name').value = 'New Name'; saveSettings(); return db.settings.businessName === 'New Name' && db.settings.siteUrl === 'https://keep.example'; }));
  ok('no script errors', errs.length === 0, errs.join('|'));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
