const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const N = () => p.evaluate(() => document.querySelectorAll('#productGrid .product-card, #productGrid [data-pid], #productGrid > div:not(.fav-empty)').length);

  ok('demo accessories seeded with accessory categories', await p.evaluate(() => db.accessoryCategories.length === 3 && accessoryList().length === 4 && sareeList().length === 8));
  await p.evaluate(() => navigateTo('shop'));
  ok('Sarees tab is the default and shows only sarees', await p.evaluate(() => SHOP.kind === 'saree' && document.getElementById('kind-saree').getAttribute('aria-selected') === 'true' && !/Jhumka/i.test(document.getElementById('productGrid').textContent) && /\b8 sarees/.test(document.getElementById('shop-count').textContent)));
  ok('saree category buttons exclude accessory categories', await p.evaluate(() => !/Jewellery/i.test(document.getElementById('filterContainer').innerText) && /Banarasi/i.test(document.getElementById('filterContainer').innerText)));
  await p.click('#kind-accessory');
  ok('Accessories tab shows accessories only, with their categories', await p.evaluate(() => /Jhumka/i.test(document.getElementById('productGrid').textContent) && !/Banarasi/i.test(document.getElementById('productGrid').textContent) && /Jewellery/i.test(document.getElementById('filterContainer').innerText) && !/Tussar/i.test(document.getElementById('filterContainer').innerText) && /4 accessories/.test(document.getElementById('shop-count').textContent) && document.getElementById('shop-title').textContent === 'Accessories'));
  await p.click('.filter-btn[data-cat="Jewellery"]');
  ok('accessory category filter works', await p.evaluate(() => document.getElementById('shop-count').textContent.includes('2 accessories') && visibleProducts().every(x => x.category === 'Jewellery')));
  await p.evaluate(() => shopSearch('blouse', true)); await p.waitForTimeout(100);
  ok('search stays within the chosen kind', await p.evaluate(() => { currentCategory = 'all'; renderProducts(); return visibleProducts().map(x => x.id).join() === 'p11'; }));
  await p.evaluate(() => shopSearch('', true));
  await p.click('#kind-saree');
  ok('switching back resets to all sarees', await p.evaluate(() => currentCategory === 'all' && visibleProducts().length === 8 && /Royal Red Kanjeevaram/i.test(document.getElementById('productGrid').textContent)));

  // product page + cart upsell
  await p.evaluate(() => openProductDetail('p3'));
  ok('saree page shows "Complete the look" with accessories', await p.evaluate(() => { const r = document.querySelector('#productModalBody .look-row'); return r && /Complete the look/.test(r.innerText) && r.querySelectorAll('.look-card').length === 4; }));
  await p.click('#productModalBody .look-card .look-add >> nth=0');
  ok('adding an accessory from the look row puts it in the cart', await p.evaluate(() => cart.some(c => isAccessory(db.products.find(x => x.id === c.id)))));
  await p.evaluate(() => { closeModal('productModal'); cart = []; addToCart('p3'); openCart(); });
  ok('cart with a saree offers accessories; excludes ones already in cart', await p.evaluate(() => { const before = document.querySelectorAll('#cartBody .look-card').length; return before === 4 && /Add an accessory/.test(document.getElementById('cartBody').innerText); }));
  await p.evaluate(() => { cart = []; addToCart('p9'); renderCartDrawer(); });
  ok('accessory-only cart has no upsell; checkout totals work', await p.evaluate(() => !document.querySelector('#cartBody .look-row') && computeTotals().subtotal === 1499));
  await p.evaluate(() => { cart = []; closeAllDrawers(); closeModal('productModal'); });
  await p.evaluate(() => openProductDetail('p9'));
  ok('accessory page has no "Complete the look"', await p.evaluate(() => !document.querySelector('#productModalBody .look-row')));
  await p.evaluate(() => closeModal('productModal'));

  // stock: sold-out accessory not offered
  await p.evaluate(() => { db.products.find(x => x.id === 'p10').stock = 0; openProductDetail('p3'); });
  ok('sold-out accessory is not offered in the look row', await p.evaluate(() => document.querySelectorAll('#productModalBody .look-card').length === 3));
  await p.evaluate(() => { db.products.find(x => x.id === 'p10').stock = 6; closeModal('productModal'); });

  // admin: category manager + product form
  await p.evaluate(() => { isAdminView = true; document.body.classList.add('admin-on'); });
  await p.evaluate(() => renderAdminContent('categories'));
  ok('Category Manager has a separate accessory section', await p.evaluate(() => /Accessory categories/.test(document.getElementById('adminContent').innerText) && document.querySelectorAll('.acc-cat-card').length === 3));
  await p.evaluate(() => openCategoryForm('accessory')); await p.fill('#cat-name', 'Hair Accessories'); await p.click('#adminModal button[type=submit]');
  ok('new accessory category goes to the accessory list only', await p.evaluate(() => db.accessoryCategories.includes('Hair Accessories') && !db.categories.includes('Hair Accessories')));
  await p.evaluate(() => deleteAccCategory(db.accessoryCategories.indexOf('Jewellery')));
  ok('category with products cannot be deleted', await p.evaluate(() => db.accessoryCategories.includes('Jewellery')));
  await p.evaluate(() => { deleteAccCategory(db.accessoryCategories.indexOf('Hair Accessories')); });
  ok('empty accessory category can be deleted', await p.evaluate(() => !db.accessoryCategories.includes('Hair Accessories')));
  await p.evaluate(() => openCategoryForm()); await p.fill('#cat-name', 'jewellery'); await p.click('#adminModal button[type=submit]');
  ok('saree category cannot reuse an accessory category name', await p.evaluate(() => !db.categories.some(c => c.toLowerCase() === 'jewellery')));
  await p.evaluate(() => { closeModal('adminModal'); });
  await p.evaluate(() => openProductForm());
  ok('product form groups categories into Sarees and Accessories', await p.evaluate(() => { const s = document.getElementById('p-cat') || document.querySelector('#adminModalBody select'); const g = [...document.querySelectorAll('#adminModalBody optgroup')].map(x => x.label); return g.join() === 'Sarees,Accessories'; }));
  await p.evaluate(() => closeModal('adminModal'));
  // assistant export
  ok('assistant export tags each product with its type', await p.evaluate(() => { const ex = JSON.stringify(buildAssistantCatalogue()); return /"type":"accessory"/.test(ex) && /"type":"saree"/.test(ex); }));
  ok('no JS errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
