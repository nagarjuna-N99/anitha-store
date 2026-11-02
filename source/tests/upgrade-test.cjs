const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  const URL_ = 'file://' + process.cwd() + '/anitha-store.html';
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  await p.goto(URL_);
  // an older saved store: none of the newer collections, settings or products, plus real-looking customer data
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('ap_db_v70') || JSON.stringify(db));
    ['accessoryCategories', 'accessorySeeded', 'similarAlerts', 'bundles'].forEach(k => delete d[k]);
    d.products = d.products.filter(x => !/^AP-ACC/.test(x.sku)); delete d.settings.waOrdersOn; delete d.settings.showRecentlySold;
    d.products.forEach(x => { delete x.daylight; });
    d.orders[0].customer = 'Existing Customer'; localStorage.setItem('ap_db_v70', JSON.stringify(d));
  });
  await p.reload();
  ok('old saved store loads with no errors', errs.length === 0 || (console.log(errs), false));
  ok('new collections are added, existing data is untouched', await p.evaluate(() => Array.isArray(db.similarAlerts) && Array.isArray(db.bundles) && db.accessoryCategories.length === 3 && db.orders[0].customer === 'Existing Customer' && db.products.filter(x => !isAccessory(x)).length === 8));
  ok('demo accessories added once', await p.evaluate(() => accessoryList().length === 4));
  await p.reload();
  ok('a second load does not add them again or duplicate anything', await p.evaluate(() => accessoryList().length === 4 && db.bundles.length === 1 && new Set(db.products.map(x => x.sku)).size === db.products.length));
  ok('defaults for new settings are ON', await p.evaluate(() => waOrdersOn() === true && soldOn() === true));
  // owner who deleted all demo accessories and set switches must not get them back
  await p.evaluate(() => { db.products = db.products.filter(x => !isAccessory(x)); db.settings.waOrdersOn = false; db.settings.showRecentlySold = false; saveDB(); });
  await p.reload();
  ok('deleted accessories stay deleted; switches stay as set', await p.evaluate(() => accessoryList().length === 0 && waOrdersOn() === false && soldOn() === false));
  // a completely empty browser
  await p.evaluate(() => localStorage.clear()); await p.reload();
  ok('first visit (empty browser) works', await p.evaluate(() => db.products.length === 12 && document.querySelectorAll('#productGrid .product-card').length === 8));
  // corrupted saved data falls back safely
  await p.evaluate(() => localStorage.setItem('ap_db_v70', '{not json')); await p.reload();
  ok('corrupted saved data falls back to defaults without crashing', await p.evaluate(() => db.products.length === 12));
  ok('no JS errors anywhere', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
