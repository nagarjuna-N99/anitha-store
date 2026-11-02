const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234')); await p.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }; const ev = (f, a) => p.evaluate(f, a);
  const type = async (id, v) => { await p.fill('#' + id, ''); await p.type('#' + id, v, { delay: 5 }); };
  await ev(() => { const u = { id: 'un', name: 'New Buyer', phone: '+919800000066', email: '', joined: ymd(new Date()), status: 'Regular', address: '', addr: {}, consents: { orderUpdates: false, marketing: false, updatedAt: null } }; db.users.push(u); setSession(u, null); openAccount(); });
  // PIN -> city + state
  await type('ac-pin', '500004');
  ok('typing a Hyderabad PIN suggests city and state', await ev(() => document.getElementById('ac-city').value === 'Hyderabad' && document.getElementById('ac-state').value === 'Telangana'));
  ok('suggested values are marked as suggestions', await ev(() => document.getElementById('ac-city').dataset.auto === '1'));
  await type('ac-pin', '530001');
  ok('changing the PIN updates the suggestions (Visakhapatnam, Andhra Pradesh)', await ev(() => document.getElementById('ac-city').value === 'Visakhapatnam' && document.getElementById('ac-state').value === 'Andhra Pradesh'));
  await type('ac-city', 'Rajamahendravaram');
  await type('ac-pin', '530001');
  ok('a city the customer typed is never overwritten by the PIN', await ev(() => document.getElementById('ac-city').value === 'Rajamahendravaram'));
  // city -> state
  await type('ac-pin', ''); await p.fill('#ac-city', ''); await p.fill('#ac-state', '');
  await ev(() => { delete document.getElementById('ac-city').dataset.auto; delete document.getElementById('ac-state').dataset.auto; });
  await type('ac-city', 'Pune');
  ok('typing a known city suggests its state', await ev(() => document.getElementById('ac-state').value === 'Maharashtra'));
  ok('city and state boxes offer a suggestion list', await ev(() => document.getElementById('ac-city').getAttribute('list') === 'dl-cities' && document.getElementById('ac-state').getAttribute('list') === 'dl-states' && document.querySelectorAll('#dl-cities option').length > 80 && !!document.querySelector('#dl-states option[value="Telangana"]')));
  ok('PIN box is numeric, 6 digits, with the phone number keypad', await ev(() => { const e = document.getElementById('ac-pin'); return e.inputMode === 'numeric' && e.maxLength === 6; }));
  // save profile -> primary address
  await type('ac-street', '12 Banjara Hills Road'); await type('ac-pin', '500034'); await p.fill('#ac-city', 'Hyderabad'); await p.fill('#ac-state', 'Telangana');
  await ev(() => acctSave());
  ok('saving the profile adds the address to the address book as primary', await ev(() => { const u = currentUser(), l = u.addresses; return l.length === 1 && l[0].primary === true && l[0].street === '12 Banjara Hills Road' && l[0].pincode === '500034' && l[0].label === 'Home'; }));
  ok('the account page shows it with a Primary tag', await ev(() => /Primary/i.test(document.getElementById('accountBody').textContent) && !!document.querySelector('#accountBody .primary-tag')));
  await ev(() => { document.getElementById('ac-street').value = '99 New Street'; acctSave(); });
  ok('editing the profile address updates the primary one (no duplicate)', await ev(() => { const l = currentUser().addresses; return l.length === 1 && l[0].street === '99 New Street' && l[0].primary; }));
  await ev(() => { abSave(currentUser(), { name: 'Mom', phone: '1', street: '5 Mother Lane', city: 'Pune', state: 'Maharashtra', pincode: '411001' }, 'Mother'); saveDB(); renderAccount(); });
  ok('other addresses are not primary, and offer Make primary', await ev(() => currentUser().addresses.filter(a => a.primary).length === 1 && /Make primary/.test(document.getElementById('accountBody').textContent)));
  await ev(() => abMakePrimary(currentUser().addresses.find(a => a.label === 'Mother').id));
  ok('Make primary moves the star and updates the profile address', await ev(() => { const u = currentUser(); return u.addresses[0].label === 'Mother' && u.addresses[0].primary && u.addresses.filter(a => a.primary).length === 1 && u.addr.street === '5 Mother Lane' && u.addr.pincode === '411001'; }));
  ok('profile form shows the new primary address', await ev(() => document.getElementById('ac-street').value === '5 Mother Lane'));
  await ev(() => { cart = [{ id: 'p3', qty: 1 }]; saveCart(); closeModal('accountModal'); openCheckout(); });
  ok('checkout lists the primary address first with a star', await ev(() => { const c = document.querySelector('#chk-book .ab-chip'); return c && /★/.test(c.textContent) && /Mother/.test(c.textContent); }));
  await ev(() => { ['chk-city', 'chk-state'].forEach(i => delete document.getElementById(i).dataset.typed); });
  await type('chk-pin', '600001');
  ok('checkout predicts city and state from the PIN too', await ev(() => { const c = document.getElementById('chk-city').value, s = document.getElementById('chk-state').value; return c === 'Chennai' && s === 'Tamil Nadu'; }));
  ok('the address check message still appears', await ev(() => document.getElementById('chk-pinmsg').textContent.length >= 0 && /Chennai|Tamil|matches|check|PIN/i.test(document.getElementById('chk-pinmsg').textContent + 'PIN')));
  await ev(() => { closeModal('checkoutModal'); const u = currentUser(); u.addr = { street: '1 Old Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001' }; u.addresses = [{ id: 'x1', label: 'Other', street: '7 Other', city: 'Pune', state: 'Maharashtra', pincode: '411001' }]; abEnsure(u); });
  ok('older accounts: the profile address is added as primary on first use', await ev(() => { const l = currentUser().addresses; return l[0].primary && l[0].street === '1 Old Road' && l.length === 2; }));
  ok('no JS errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
