const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });

  // ===== orders in WhatsApp chat: on / off =====
  ok('chat orders default to ON and are published as ON', await ev(() => waOrdersOn() === true && buildAssistantCatalogue().shop.ordersOn === true));
  await ev(() => { isAdminView = true; document.body.classList.add('admin-on'); switchAdminTab('whatsapp'); });
  ok('WhatsApp tab has the orders switch, checked', await ev(() => { const c = document.getElementById('wa-orders-on'); return c && c.checked && /ON:/.test(document.getElementById('wa-orders-note').textContent); }));
  await ev(() => document.getElementById('wa-orders-on').click());
  ok('turning it OFF is saved, logged, shown and published as OFF', await ev(() => db.settings.waOrdersOn === false && waOrdersOn() === false && buildAssistantCatalogue().shop.ordersOn === false && /OFF:/.test(document.getElementById('wa-orders-note').textContent) && db.logs.some(l => /chat turned OFF/.test(l.reason || l.details || JSON.stringify(l)))));
  ok('OFF survives a reload of the saved data', await ev(() => JSON.parse(localStorage.getItem('ap_db_v70')).settings.waOrdersOn === false));
  await ev(() => document.getElementById('wa-orders-on').click());
  ok('turning it back ON works', await ev(() => waOrdersOn() === true && buildAssistantCatalogue().shop.ordersOn === true));
  ok('the website chat button is independent of the orders switch', await ev(() => { waSet('waOrdersOn', false); const r = waChatEnabled(); waSet('waOrdersOn', true); return r === true; }));

  // ===== recently sold =====
  await ev(() => { isAdminView = false; document.body.classList.remove('admin-on'); navigateTo('home'); renderHome(); });
  ok('sold-out saree with an order appears in Recently sold with its sale date', await ev(() => { const c = document.querySelector('#soldSection .sold-card[data-pid="p5"]'); return c && /Sold/i.test(c.innerText) && /Oct/i.test(c.innerText); }));
  ok('in-stock sarees and accessories never appear', await ev(() => !document.querySelector('#soldSection .sold-card[data-pid="p1"]') && !document.querySelector('#soldSection .sold-card[data-pid="p9"]')));
  ok('no buyer name or price is shown', await ev(() => !/Meera|Priya|Sneha|₹/.test(document.getElementById('soldSection').innerText)));
  await ev(() => { db.products.find(x => x.id === 'p2').stock = 0; db.products.find(x => x.id === 'p8').stock = 0; db.products.find(x => x.id === 'p10').stock = 0; renderHome(); });
  ok('latest sale first; sold-out with no order dated last; sold accessories excluded', await ev(() => JSON.stringify([...document.querySelectorAll('#soldSection .sold-card')].map(c => c.dataset.pid)) === '["p5","p2","p8"]'));
  await ev(() => { db.orders.find(o => o.items.some(i => i.productId === 'p5')).status = 'cancelled'; renderHome(); });
  ok('a cancelled order does not date a sale', await ev(() => [...document.querySelectorAll('#soldSection .sold-card')].map(c => c.dataset.pid)[0] === 'p2'));
  await ev(() => { db.orders.find(o => o.items.some(i => i.productId === 'p5')).status = 'confirmed'; });
  await ev(() => { isAdminView = true; document.body.classList.add('admin-on'); switchAdminTab('home'); });
  ok('Home Page admin has the show/hide switch', await ev(() => !!document.getElementById('sold-on') && document.getElementById('sold-on').checked));
  await ev(() => document.getElementById('sold-on').click());
  ok('switch OFF hides the section on the home page', await ev(() => db.settings.showRecentlySold === false && document.getElementById('soldSection').innerText.trim() === ''));
  await ev(() => document.getElementById('sold-on').click());
  ok('switch ON shows it again', await ev(() => document.querySelectorAll('#soldSection .sold-card').length === 3));
  await ev(() => { isAdminView = false; document.body.classList.remove('admin-on'); navigateTo('home'); });
  await ev(() => { db.products.forEach(x => { if (!isAccessory(x)) x.stock = 3; }); renderHome(); });
  ok('nothing sold out → the whole section disappears', await ev(() => document.getElementById('soldSection').innerText.trim() === ''));
  await ev(() => { db.products.find(x => x.id === 'p5').stock = 0; renderHome(); });

  // ===== request a similar piece =====
  await p.click('#soldSection .sold-card[data-pid="p5"] .sold-req');
  ok('request form opens with fabric, colour and the ±30% budget prefilled', await ev(() => document.getElementById('alertModal').classList.contains('active') && document.getElementById('sr-fabric').value === 'Kanjeevaram Silk' && document.getElementById('sr-min').value === '59500' && document.getElementById('sr-max').value === '110500'));
  await ev(() => { document.getElementById('sr-colour').value = 'Maroon'; document.getElementById('sr-note').value = 'For my daughter wedding in March'; });
  await p.click('#sr-go');
  const url = await ev(() => window.__opened.at(-1));
  const msg = decodeURIComponent((url.split('?text=')[1] || ''));
  ok('opens WhatsApp to the shop number', /^https:\/\/wa\.me\/919849646440\?text=/.test(url));
  ok('message carries the saree, fabric, colour, budget and note', /Royal Red Kanjeevaram/.test(msg) && /AP-KNC-001/.test(msg) && /Fabric: Kanjeevaram Silk/.test(msg) && /Colour: Maroon/.test(msg) && /Budget: ₹59,500 – ₹1,10,500/.test(msg) && /daughter wedding in March/.test(msg));
  ok('form closes after sending', await ev(() => !document.getElementById('alertModal').classList.contains('active')));
  await ev(() => { setSession(db.users.find(x => x.id === 'u1'), null); openSimilarRequest('p5'); document.getElementById('sr-fabric').value = ''; document.getElementById('sr-colour').value = ''; document.getElementById('sr-min').value = ''; document.getElementById('sr-max').value = '40000'; similarRequestSend('p5'); });
  const msg2 = decodeURIComponent((await ev(() => window.__opened.at(-1))).split('?text=')[1]);
  ok('"any" fabric/colour, open budget and the logged-in name are handled', /Fabric: any/.test(msg2) && /Colour: any/.test(msg2) && /Budget: up to ₹40,000/.test(msg2) && /Name: Priya Ramakrishnan/.test(msg2));
  const n = await ev(() => window.__opened.length);
  await ev(() => { openSimilarRequest('p5'); document.getElementById('sr-min').value = '90000'; document.getElementById('sr-max').value = '1000'; similarRequestSend('p5'); });
  ok('a reversed budget is refused, nothing opens', await ev(n => window.__opened.length === n && document.getElementById('alertModal').classList.contains('active'), n));
  await ev(() => { closeModal('alertModal'); db.settings.waNumber = ''; db.settings.phone = ''; openSimilarRequest('p5'); document.getElementById('sr-min').value = '1'; document.getElementById('sr-max').value = '2'; similarRequestSend('p5'); });
  ok('without a WhatsApp number the message is shown to copy instead', await ev(n => window.__opened.length === n && /copy this message/.test(document.getElementById('sr-note-msg').textContent) && /Royal Red Kanjeevaram/.test(document.getElementById('sr-note-msg').textContent), n));
  await ev(() => { closeModal('alertModal'); db.settings.phone = '+91 98496 46440'; });
  await ev(() => { openSimilarRequest('p9'); });
  ok('accessories cannot be requested as "similar sarees"', await ev(() => !document.getElementById('alertModal').classList.contains('active')));
  await ev(() => { localStorage.removeItem('ap_session'); });
  await p.click('#soldSection .sold-card[data-pid="p5"] .sold-notify');
  ok('"Tell me when one arrives" asks a new visitor to log in', await ev(() => document.getElementById('authModal').classList.contains('active')));
  await ev(() => { closeModal('authModal'); navigateTo('shop'); openProductDetail('p5'); });
  ok('sold-out saree page also has Request a similar piece', await ev(() => !!document.querySelector('#productModalBody .request-btn')));
  await ev(() => closeModal('productModal'));
  ok('request text escapes nothing dangerous (name with markup stays text)', await ev(() => { const p0 = db.products.find(x => x.id === 'p5'); const old = p0.name; p0.name = '<img src=x onerror=alert(1)>'; renderHome(); const bad = !!document.querySelector('#soldSection img[onerror]'); p0.name = old; renderHome(); return !bad; }));

  // ===== bug-fix regressions (28 Oct 2026) =====
  await p.setViewportSize({ width: 1300, height: 900 });
  const before = errs.length;
  for (const h of ['#/wishlist/%E0%A4%A', '#/product/%E0%A4%A', '#/wishlist/', '#/wishlist/,,,']) { await ev(h => { location.hash = h; }, h); await p.waitForTimeout(120); }
  ok('malformed links (#/wishlist/%E0%A4%A, #/product/%E0%A4%A) cause no error', errs.length === before);
  await ev(() => { location.hash = ''; navigateTo('home'); db.users[0].consents = { orderUpdates: false, marketing: false, updatedAt: null }; setSession(db.users[0], null); db.products.find(x => x.id === 'p4').stock = 1; renderHome(); });
  const had = await ev(() => [...document.querySelectorAll('#soldSection .sold-card')].map(c => c.dataset.pid));
  await ev(() => { cart = [{ id: 'p4', qty: 1 }]; openCheckout(); const s = (i, v) => document.getElementById(i).value = v; s('chk-name', 'T B'); s('chk-email', 't@e.com'); s('chk-pin', '500072'); s('chk-address', '12 MG Road'); s('chk-city', 'Hyderabad'); s('chk-state', 'Telangana'); document.getElementById('chk-age').checked = true; document.getElementById('chk-terms').checked = true; processPayment(); });
  await p.waitForTimeout(200);
  ok('selling the last piece puts it in Recently sold at once (no reload)', !had.includes('p4') && await ev(() => !!document.querySelector('#soldSection .sold-card[data-pid="p4"]')));
  ok('occasion tile counts follow stock and price edits at once', await ev(() => { const n0 = document.querySelector('#occasionSection').innerText; db.products.find(x => x.id === 'p8').price = 5000; renderProducts(); return !!document.querySelector('[data-occ="gift"]'); }));
  ok('order detail names the bundle / coupon behind a discount', await ev(() => { cart = [{ id: 'p1', qty: 1 }, { id: 'p9', qty: 1 }]; const t = computeTotals(); const o = { id: 'X1', status: 'placed', date: '2026-10-28', customer: 'A', phone: '1', items: [{ productId: 'p1', name: 'n', sku: 's', quantity: 1, price: 1 }], pricing: { subtotal: 100, shipping: 0, discount: 10, total: 90, bundle: 'Tussar + Temple Jhumka' }, coupon: 'FLAT500', shippingAddress: {}, timeline: [] }; db.orders.unshift(o); isAdminView = true; document.body.classList.add('admin-on'); viewOrderDetails('X1'); const txt = document.getElementById('adminModalBody').innerText; closeModal('adminModal'); isAdminView = false; document.body.classList.remove('admin-on'); return /Discount \(FLAT500, bundle: Tussar \+ Temple Jhumka\)/.test(txt); }));
  for (const w of [320, 360]) { await p.setViewportSize({ width: w, height: 700 }); await ev(() => navigateTo('shop')); await p.waitForTimeout(100); ok(w + 'px: shop page has no sideways scroll', await ev(w => document.documentElement.scrollWidth <= w + 1, w)); }
  await ev(() => navigateTo('home'));

  // ===== phone width =====
  await p.setViewportSize({ width: 390, height: 800 });
  await ev(() => { navigateTo('home'); renderHome(); }); await p.waitForTimeout(150);
  ok('390px: no sideways scroll with the sold section', await ev(() => document.documentElement.scrollWidth <= 391));
  await ev(() => openSimilarRequest('p5')); await p.waitForTimeout(100);
  ok('390px: request form fits the screen', await ev(() => { const m = document.querySelector('#alertModal .modal-content'); return m.getBoundingClientRect().right <= 391 && document.documentElement.scrollWidth <= 391; }));
  ok('no JS errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
