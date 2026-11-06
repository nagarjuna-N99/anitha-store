// New Arrivals slider: the owner picks sarees from the products already on the website.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(500);
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  const names = () => ev(() => [...document.querySelectorAll('#scrollTrack .scroll-card:not(.dup) .scroll-card-name')].map(e => e.textContent));
  const all = await ev(() => db.products.length), before = (await names()).length;
  ok('with nothing chosen the slider shows the newest in-stock sarees (automatic)', before > 0);
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('home'); arrMode('manual'); }); await sleep(300);   // "I choose" shows the list of sarees to tick
  const info = await ev(() => ({ boxes: document.querySelectorAll('.arr-item input').length, cats: document.querySelectorAll('.arr-cat').length, n: sareeList().length, cc: db.categories.length }));
  ok('the editor lists every saree on the website, grouped by category', info.boxes === info.n && info.cats > 1);
  const first = await ev(() => { const i = document.querySelector('.arr-item input'); i.click(); return db.home.arrivals.ids.slice(); });
  ok('ticking a saree stores it', first.length === 1);
  await ev(() => document.querySelectorAll('.arr-item input')[3].click());
  const ids = await ev(() => db.home.arrivals.ids.slice()), n2 = await names();
  ok('after choosing 2, the slider shows only those 2', ids.length === 2 && n2.length === 2);
  ok('the count line updates', await ev(() => /2 chosen/.test(document.getElementById('arr-count').textContent)));
  await ev(() => document.querySelectorAll('.arr-item input')[3].click());
  ok('un-ticking removes it', (await names()).length === 1);
  await ev(() => { db.products = db.products.filter(x => x.id !== db.home.arrivals.ids[0]); buildScrollTrack(); });
  ok('a chosen saree that was deleted simply disappears (no error)', (await names()).length === 0);
  await ev(() => arrClear()); await sleep(100);
  ok('Clear goes back to the automatic list of new sarees', (await names()).length > 0 && await ev(() => db.home.arrivals.ids.length === 0));
  ok('no JavaScript errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
