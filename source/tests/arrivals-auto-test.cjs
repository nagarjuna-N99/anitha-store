// New Arrivals slider: AUTOMATIC (newest in-stock sarees: added or restocked) or "I choose". Dates are kept by the owner app whenever the shop data is saved.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(500);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  const track = () => ev(() => [...document.querySelectorAll('#scrollTrack .scroll-card:not(.dup) .scroll-card-name')].map(e => e.textContent));
  await ev(() => { window.mkP = (id, o = {}) => ({ id, sku: 'S-' + id, name: 'Saree ' + id, category: db.categories[0], price: 1000, stock: 3, images: [], image: '', description: 'x', colours: [], tags: [], threshold: 2, ...o }); });
  const DAY = 86400000, NOW = Date.now();
  // a clean shop: 8 sarees with known dates, one sold out, one accessory
  await ev(([n, d]) => { db.settings.arrivalsTracking = n; db.home.arrivals = { show: true, label: 'x', title: 'New Arrivals', ids: [], mode: 'auto', days: 30, max: 12 }; db.products = [
    { id: 'a1', name: 'Oldest', category: db.categories[0], price: 1, stock: 2, addedAt: n - 200 * d, stockedAt: n - 200 * d, lastStock: 2 }, { id: 'a2', name: 'Month old', category: db.categories[0], price: 1, stock: 2, addedAt: n - 40 * d, stockedAt: n - 40 * d, lastStock: 2 },
    { id: 'a3', name: 'Two weeks', category: db.categories[0], price: 1, stock: 2, addedAt: n - 14 * d, stockedAt: n - 14 * d, lastStock: 2 }, { id: 'a4', name: 'Last week', category: db.categories[0], price: 1, stock: 2, addedAt: n - 6 * d, stockedAt: n - 6 * d, lastStock: 2 },
    { id: 'a5', name: 'Yesterday', category: db.categories[0], price: 1, stock: 1, addedAt: n - 1 * d, stockedAt: n - 1 * d, lastStock: 1 }, { id: 'a6', name: 'Sold out new', category: db.categories[0], price: 1, stock: 0, addedAt: n - 2 * d, stockedAt: n - 2 * d, lastStock: 0 },
    { id: 'j1', name: 'New Jhumka', category: db.accessoryCategories[0], price: 1, stock: 5, addedAt: n - 1 * d, stockedAt: n - 1 * d, lastStock: 5 }].map(x => ({ images: [], image: '', description: 'x', colours: [], tags: [], sku: x.id, threshold: 2, ...x })); buildScrollTrack(); }, [NOW, DAY]);
  let t = await track();
  ok('automatic: only sarees that are in stock and new in the last 30 days, newest first; sold-out and accessories never show', t.slice(0, 3).join() === 'Yesterday,Last week,Two weeks' && !t.includes('Sold out new') && !t.includes('New Jhumka'), t.join());
  ok('automatic: if fewer than 4 are that new, the next newest fill in (never an empty or tiny slider)', t.length === 4 && t[3] === 'Month old');
  await ev(() => { db.home.arrivals.days = 7; buildScrollTrack(); }); t = await track(); ok('automatic: "new" can be set to the last 7 days (the slider is topped up to 4)', t.slice(0, 2).join() === 'Yesterday,Last week' && t.length === 4);
  await ev(() => { db.home.arrivals.days = 90; db.home.arrivals.max = 6; for (let i = 0; i < 10; i++) db.products.push({ id: 'x' + i, sku: 'x' + i, name: 'Extra ' + i, category: db.categories[0], price: 1, stock: 2, images: [], image: '', addedAt: Date.now() - i * 3600000, stockedAt: Date.now() - i * 3600000, lastStock: 2, colours: [], tags: [], description: 'x' }); buildScrollTrack(); }); t = await track();
  ok('automatic: never more than the chosen maximum (6)', t.length === 6 && t[0] === 'Extra 0');
  await ev(() => { db.products = db.products.filter(x => !x.id.startsWith('x')); db.home.arrivals.days = 30; db.home.arrivals.max = 12; buildScrollTrack(); });
  // dates are kept by the save
  await ev(() => { db.products.find(x => x.id === 'a1').stock = 9; saveDB(); buildScrollTrack(); }); t = await track();
  ok('restocking an old saree (more in stock than before) makes it new again: it jumps to the front', t[0] === 'Oldest' && await ev(() => db.products.find(x => x.id === 'a1').stockedAt > Date.now() - 5000));
  await ev(() => { db.products.find(x => x.id === 'a3').stock = 1; saveDB(); }); ok('selling stock (less than before) does NOT make a saree new', (await ev(() => db.products.find(x => x.id === 'a3').stockedAt < Date.now() - 10 * 86400000)));
  await ev(() => { db.products.push({ id: 'n1', sku: 'n1', name: 'Brand new saree', category: db.categories[0], price: 1, stock: 4, images: [], image: '', description: 'x', colours: [], tags: [] }); saveDB(); buildScrollTrack(); }); t = await track();
  ok('a saree added in the owner app (any way it gets added) is stamped as new automatically and appears first, with nothing else to do', t[0] === 'Brand new saree' && await ev(() => { const x = db.products.find(q => q.id === 'n1'); return x.addedAt > Date.now() - 5000 && x.lastStock === 4; }));
  await ev(() => { db.products.find(x => x.id === 'n1').stock = 0; saveDB(); buildScrollTrack(); }); t = await track(); ok('when it sells out it leaves the slider by itself', !t.includes('Brand new saree'));
  // first time ever: nothing is called new
  await ev(() => { delete db.settings.arrivalsTracking; db.products = ['o1', 'o2', 'o3', 'o4', 'o5'].map(i => mkP(i)); saveDB(); buildScrollTrack(); });
  ok('the very first time dates are tracked, existing sarees are only remembered (none is stamped as just added)', await ev(() => db.products.every(x => x.addedAt === undefined && x.lastStock === x.stock) && !!db.settings.arrivalsTracking));
  ok('...and the slider still has sarees (the later-added ones first)', (await track()).length === 4 && (await track())[0] === 'Saree o5');
  // ---- the admin: automatic or I choose ----
  await ev(() => { db.products = [mkP('b1', { stock: 2, addedAt: Date.now() - 1000, stockedAt: Date.now() - 1000, lastStock: 2 }), mkP('b2', { addedAt: Date.now() - 2000, stockedAt: Date.now() - 2000, lastStock: 3 }), mkP('b3', { addedAt: Date.now() - 3000, stockedAt: Date.now() - 3000, lastStock: 3 }), mkP('b4', { addedAt: Date.now() - 4000, stockedAt: Date.now() - 4000, lastStock: 3 }), mkP('b5', { addedAt: Date.now() - 5000, stockedAt: Date.now() - 5000, lastStock: 3 })]; db.home.arrivals = { show: true, label: 'x', title: 'New Arrivals', ids: [] }; isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('home'); }); await sleep(400);
  ok('Home Page → New Arrivals: two choices, "Automatic" (chosen to start with) and "I choose", each explained', await ev(() => { const m = document.querySelector('.arr-mode'); return !!m && /Automatic/.test(m.innerText) && /I choose/.test(m.innerText) && /newest sarees that are in stock/i.test(m.innerText) && m.querySelector('input:checked').closest('label').innerText.includes('Automatic') && !document.querySelector('.arr-item'); }));
  ok('in automatic mode there are controls for how recent counts as new and the maximum, and a live line says what the slider shows right now', await ev(() => { const t = document.getElementById('adminContent').innerText; return /in the last/i.test(t) && [...document.querySelectorAll('#adminContent select')].some(x => x.value === '30') && /Show at most/.test(t) && /Right now the slider shows 5/.test(document.getElementById('arr-now').innerText) && /Saree b1/.test(document.getElementById('arr-now').innerText); }));
  await ev(() => { const sel = [...document.querySelectorAll('#adminContent select')].find(s => /\d+ days/.test(s.innerText)); sel.value = '7'; sel.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(150);
  ok('changing the days is saved with the home page', await ev(() => db.home.arrivals.days === 7));
  await ev(() => arrMode('manual')); await sleep(300);
  ok('"I choose" shows the list of sarees to tick (grouped by category) and keeps the saved choice', await ev(() => db.home.arrivals.mode === 'manual' && document.querySelectorAll('.arr-item input').length === 5 && !!document.querySelector('.arr-mode')));
  await ev(() => { document.querySelectorAll('.arr-item input')[4].click(); }); await ev(() => { isAdminView = false; document.getElementById('adminView').classList.remove('active'); document.getElementById('storefrontView').classList.remove('hidden'); buildScrollTrack(); }); t = await track();
  ok('manual: only the chosen saree shows, even though newer ones exist', t.join() === 'Saree b5', t.join());
  await ev(() => { db.home.arrivals.ids = []; buildScrollTrack(); }); t = await track(); ok('manual with nothing ticked falls back to the automatic list (never an empty slider)', t.length === 5 && t[0] === 'Saree b1');
  await ev(() => { db.home.arrivals = { show: true, ids: ['b2', 'b3'] }; buildScrollTrack(); }); t = await track(); ok('an older shop that already had its own choice (no mode saved) keeps it as "I choose"', t.join() === 'Saree b2,Saree b3' && await ev(() => arrCfg().mode === 'manual'));
  ok('a brand-new home page setting starts as automatic', await ev(() => defaultHome().arrivals.mode === 'auto' && defaultHome().arrivals.days === 30));
  ok('no script errors', errs.length === 0, errs.join('|'));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
