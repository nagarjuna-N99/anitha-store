// Accessories on/off (Categories tab) and the full-width heading photos tool (Home Page → Story chapters).
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1216, height: 800 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(600);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  // ---- website: switch on (default) ----
  await ev(() => { renderFilterButtons(); renderOccasions(); });
  ok('default: accessories are shown (tab, occasion tile, FAQ, complete-the-look)', await ev(() => !!document.getElementById('kind-accessory') && !!document.querySelector('.occ-tile[data-occ="accessory"]') && faqItems().some(f => /accessories/i.test(f[0])) && accessoryList().length > 0));
  // ---- owner: switch off ----
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('categories'); }); await sleep(400);
  ok('Categories tab: a "Show Accessories on the website" switch is next to the accessory categories, ON by default', await ev(() => document.getElementById('acc-show-toggle').classList.contains('active') && /Show Accessories on the website/.test(document.getElementById('adminContent').innerText)));
  await ev(() => document.getElementById('acc-show-toggle').click()); await sleep(300);
  ok('switching it off is saved as a setting and the switch looks off', await ev(() => db.settings.showAccessories === false && !document.getElementById('acc-show-toggle').classList.contains('active') && document.getElementById('acc-show-toggle').getAttribute('aria-checked') === 'false'));
  ok('off: the accessory categories and products are kept (nothing is deleted)', await ev(() => db.accessoryCategories.length >= 3 && db.products.some(isAccessory)));
  await ev(() => { document.getElementById('adminView').classList.remove('active'); document.getElementById('storefrontView').classList.remove('hidden'); renderFilterButtons(); renderOccasions(); });
  ok('off: no Accessories tab, no Accessories occasion tile, no accessories FAQ line, nothing to "complete the look"', await ev(() => !document.getElementById('kind-accessory') && !document.querySelector('.occ-tile[data-occ="accessory"]') && !faqItems().some(f => /accessories/i.test(f[0])) && accessoryList().length === 0));
  ok('off: asking for the accessories shop view falls back to sarees', await ev(() => { shopKind('accessory'); return SHOP.kind === 'saree'; }));
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('categories'); }); await sleep(300);
  await ev(() => document.getElementById('acc-show-toggle').click()); await sleep(200);
  await ev(() => { renderFilterButtons(); renderOccasions(); });
  ok('switching it back on brings the accessories back at once', await ev(() => db.settings.showAccessories === true && !!document.getElementById('kind-accessory') && accessoryList().length > 0));
  // ---- heading photos tool ----
  await ev(() => switchAdminTab('home')); await sleep(500);
  ok('Home Page: a "Your moments" tool lists every chapter at once, without opening anything', await ev(() => document.querySelectorAll('#ch-photos .ch-photo-row').length === 3 && /Your moments/.test(document.getElementById("ch-photos").innerText) && document.querySelectorAll('#ch-photos button').length >= 3));
  ok('each row says "Add photo" while there is none, and there is no Remove button yet', await ev(() => [...document.querySelectorAll('#ch-photos .btn-primary-sm')].every(x => /Add photo/.test(x.textContent)) && ![...document.querySelectorAll('#ch-photos button')].some(x => /Remove/.test(x.textContent))));
  const img = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700"><rect width="1600" height="700" fill="#b88a6a"/></svg>');
  await ev(i => { chData().items[0].image = i; chLive(true); }, img); await sleep(300);
  ok('with a photo: the row shows it, offers Replace and Remove, and the website panel uses it', await ev(() => /Replace photo/.test(document.querySelector('#ch-photos .ch-photo-row').innerText) && /Remove/.test(document.querySelector('#ch-photos .ch-photo-row').innerText) && /background-image/.test(document.querySelector('#homeChapters .chap-hero').getAttribute('style') || '') && /background-image/.test(document.querySelector('#ch-photos .ch-thumb').getAttribute('style'))));
  await ev(() => chSize('full')); await sleep(300);
  ok('Full screen size makes the panels tall and edge-to-edge on the website', await ev(() => document.getElementById('homeChapters').dataset.size === 'full' && getComputedStyle(document.querySelector('#homeChapters .chap-hero')).borderRadius === '0px'));
  await ev(() => chSize('standard'));
  await ev(() => chRemoveImg(0)); await sleep(200);
  ok('Remove puts the plain dark panel back', await ev(() => !chData().items[0].image && !/background-image/.test(document.querySelector('#homeChapters .chap-hero').getAttribute('style') || '')));
  ok('uploads of heading photos keep up to 1920 px (full-width quality)', await ev(() => /pick.kind === 'chap'/.test(homeFileChosen.toString())));
  ok('no script errors', errs.length === 0, errs.join('|'));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
