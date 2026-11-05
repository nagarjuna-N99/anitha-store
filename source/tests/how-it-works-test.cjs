// "How it works" page: one page in each login, explaining each system with do / do-not lists, searchable.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1216, height: 800 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(600);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); admGroupNav(); });
  ok('the menu has a "How it works" page under a Help heading, on computer and phone', await ev(() => !!document.querySelector('#adminSidebarDesktop li[data-tab="guide"]') && !!document.querySelector('.admin-mobile-nav li[data-tab="guide"]') && [...document.querySelectorAll('#adminSidebarDesktop .nav-group')].some(x => x.textContent === 'Help')));
  const secs = role => ev(r => { ADM.role = r; switchAdminTab('guide'); return [...document.querySelectorAll('#how-list .how-sec')].map(d => d.dataset.id); }, role);
  const own = await secs('owner'), adm = await secs('admin');
  ok('owner page: the business side (products, orders, delivery, customers, offers, studio, assistant, AI, settings, rules) and nothing technical', ['logins', 'products', 'orders', 'delivery', 'customers', 'offers', 'studio', 'assistant', 'ai', 'settings', 'rules'].every(x => own.includes(x)) && !['ops', 'security', 'promo', 'look'].some(x => own.includes(x)), own.join());
  ok('admin page: the technical side (look, promotions, ops, security, assistant, AI, settings, rules) and none of the owner\'s sales pages', ['logins', 'look', 'promo', 'assistant', 'ai', 'ops', 'security', 'settings', 'rules'].every(x => adm.includes(x)) && !['products', 'orders', 'customers', 'studio'].some(x => adm.includes(x)), adm.join());
  ok('every section says what it does, how it works, and has a Do list and a Do not list', await ev(() => [...document.querySelectorAll('#how-list .how-sec')].every(d => d.querySelector('.how-does').textContent.length > 15 && d.querySelectorAll('.how-body > ul li').length >= 2 && d.querySelectorAll('.how-do li').length >= 1 && d.querySelectorAll('.how-dont li').length >= 1)));
  ok('the title says which login it is for', await ev(() => /for the admin/.test(document.querySelector('#how-page h3').textContent)));
  await ev(() => { ADM.role = 'owner'; switchAdminTab('guide'); }); await sleep(100);
  ok('owner page: the order flow explains YES, NO and TRACK replies and auto-approval', await ev(() => { const t = document.querySelector('.how-sec[data-id="orders"]').textContent; return /YES WO-0001/.test(t) && /NO WO-0001/.test(t) && /TRACK/.test(t) && /automatically/.test(t) && /cannot cancel/.test(t); }));
  await ev(() => { const i = document.getElementById('how-q'); i.value = 'backup'; howFilter(); });
  ok('search narrows the page to matching sections and opens them', await ev(() => { const v = [...document.querySelectorAll('#how-list .how-sec')].filter(d => d.style.display !== 'none'); return v.length >= 1 && v.length < document.querySelectorAll('#how-list .how-sec').length && v.every(d => d.open && /backup/i.test(d.textContent)); }));
  await ev(() => { document.getElementById('how-q').value = 'zzzzqqq'; howFilter(); }); ok('a search with no match says so', await ev(() => document.getElementById('how-none').style.display === ''));
  await ev(() => { document.getElementById('how-q').value = ''; howFilter(); howAll(true); }); ok('Open all / Close all work', await ev(() => { const a = [...document.querySelectorAll('#how-list .how-sec')].every(d => d.open); howAll(false); return a && [...document.querySelectorAll('#how-list .how-sec')].every(d => !d.open); }));
  ok('no secrets, personal data or promises of sales in the text', await ev(() => { const t = JSON.stringify(HOW_SECTIONS); return !/sk-ant|password:|\d{10}/.test(t) && !/guaranteed (sales|views)/i.test(t.replace(/Do not write “guaranteed” sales or views anywhere\./, '')); }));
  ok('phone width: the page has no sideways scroll', await (async () => { await p.setViewportSize({ width: 390, height: 800 }); await ev(() => howAll(true)); await sleep(200); return ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1); })());
  ok('no script errors', errs.length === 0, errs.join('|'));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
