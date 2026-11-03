// ================= DELIVERY, GIFTS, ADDRESS BOOK, TRACKING =================
// PIN/city/state checks and delivery dates come from the shared block above (<shared:pincode-core>), the same code the WhatsApp assistant uses.
var GIFT = { on: false, wrap: false, note: '', other: false, hide: true, rec: { name: '', phone: '', street: '', city: '', state: '', pin: '' } };
var GIFT_PRESET = false;
const deliveryCfg = () => db.settings.delivery || DEFAULT_DELIVERY;
const giftFee = () => Math.max(0, parseInt(db.settings.giftWrapFee, 10) || 0);
const savedPin = () => { try { return localStorage.getItem('ap_pin') || ''; } catch (e) { return ''; } };
const rememberPin = v => { try { localStorage.setItem('ap_pin', v); } catch (e) {} };
const pinOk = v => /^[1-9][0-9]{5}$/.test(String(v || '').trim());
const vv = id => (el_(id) ? el_(id).value.trim() : '');

// ---- delivery check (product page, cart) ----
function deliveryResultHTML(pin, price) {
  const est = deliveryEstimate(deliveryCfg(), pin);
  if (!est.ok) return `<div class="dc-bad">${esc(est.reason)}</div>`;
  if (!est.serviceable) return `<div class="dc-warn">${esc(est.reason)}</div>`;
  const ship = price > SHIP_FREE_ABOVE ? 'Free shipping' : `Shipping ₹${SHIP_FEE} (free above ₹${money(SHIP_FREE_ABOVE)})`;
  return `<div class="dc-ok"><strong>✓ ${esc(est.label)}</strong><span>${esc(est.state)} · ${esc(ship)}</span><small>Counted from the day we receive your payment. Sundays are not counted.</small></div>`;
}
function deliveryWidgetHTML(p, gk, preview) {
  const pin = savedPin();
  return `<div class="dc" id="dc-${gk}"><label for="dc-in-${gk}">🚚 Check delivery to your PIN code</label><div class="dc-row"><input id="dc-in-${gk}" inputmode="numeric" maxlength="6" placeholder="e.g. 500072" value="${esc(pin)}" ${preview ? 'disabled' : `onkeydown="if(event.key==='Enter')deliveryCheck('${gk}',${+p.price || 0})"`}><button type="button" class="btn-sm btn-info-sm" ${preview ? 'disabled' : `onclick="deliveryCheck('${gk}',${+p.price || 0})"`}>Check</button></div><div id="dc-res-${gk}" aria-live="polite">${pinOk(pin) && !preview ? deliveryResultHTML(pin, +p.price || 0) : ''}</div></div>`;
}
function deliveryCheck(gk, price) {
  const pin = vv('dc-in-' + gk);
  if (!pinOk(pin)) { el_('dc-res-' + gk).innerHTML = '<div class="dc-bad">Please enter a valid 6-digit PIN code.</div>'; return; }
  rememberPin(pin); el_('dc-res-' + gk).innerHTML = deliveryResultHTML(pin, price);
}
function giftButtonHTML(p, preview) {
  return p.stock > 0 && !preview ? `<button class="btn-outline" style="margin-top:10px;" onclick="giftThis('${p.id}')">🎁 Send this as a gift</button>` : '';
}
function giftThis(pid) {
  const p = db.products.find(x => x.id === pid); if (!p || p.stock <= 0) return;
  if (!cart.some(c => c.id === pid)) { cart.push({ id: pid, qty: 1 }); saveCart(); updateBadges(); }
  GIFT_PRESET = true; closeModal('productModal'); closeAllDrawers(); openCheckout();
}
function renderCartDeliv() {
  const e = el_(cartMobile() ? 'cartDelivM' : 'cartDeliv'); const other = el_(cartMobile() ? 'cartDeliv' : 'cartDelivM'); if (other) other.innerHTML = ''; if (!e) return; if (!cart.length) { e.innerHTML = ''; return; }
  const pin = savedPin(), sub = cartLines().reduce((s, l) => s + l.price * l.qty, 0);
  e.innerHTML = `<div class="dc" style="margin:0 0 12px;"><div class="dc-row"><input id="cart-pin" inputmode="numeric" maxlength="6" placeholder="PIN code, to see your delivery date" value="${esc(pin)}" onkeydown="if(event.key==='Enter')cartPinSet()"><button type="button" class="btn-sm btn-info-sm" onclick="cartPinSet()">Check</button></div><div id="cart-pin-res" aria-live="polite">${pinOk(pin) ? deliveryResultHTML(pin, sub) : ''}</div></div>`;
}
function cartPinSet() {
  const pin = vv('cart-pin'), sub = cartLines().reduce((s, l) => s + l.price * l.qty, 0);
  if (!pinOk(pin)) { el_('cart-pin-res').innerHTML = '<div class="dc-bad">Please enter a valid 6-digit PIN code.</div>'; return; }
  rememberPin(pin); el_('cart-pin-res').innerHTML = deliveryResultHTML(pin, sub);
}

// ---- address check shown while typing (checkout, gift recipient, My Account) ----
function runPinCheck(pin, city, state) {
  if (!pin) return { status: 'empty', html: '' };
  const r = addressCheck({ pincode: pin, city, state }), est = deliveryEstimate(deliveryCfg(), pin);
  // Nothing here ever stops an order: these are friendly notes only. We ship wherever the customer asks.
  const more = ' You can still place your order.';
  if (r.status === 'invalid') return { status: 'invalid', html: `<span class="dc-warn">⚠ ${esc(r.message)}${more}</span>`, message: r.message };
  if (est.ok && !est.serviceable) return { status: 'blocked', html: `<span class="dc-warn">${esc(est.reason)}</span>`, message: est.reason };
  const eta = est.ok && est.serviceable ? `<span class="dc-ok"><strong>✓ ${esc(est.label)}</strong></span>` : '';
  return r.status === 'ok' ? { status: 'ok', html: eta, est } : { status: r.status, html: `<span class="dc-warn">⚠ ${esc(r.message)} Please double-check.${more}</span>${eta}`, message: r.message, est };
}
function chkPinCheck() {
  const res = runPinCheck(vv('chk-pin'), vv('chk-city'), vv('chk-state'));
  el_('chk-pinmsg').innerHTML = res.html;
  if (res.status === 'ok' && pinOk(vv('chk-pin'))) rememberPin(vv('chk-pin'));
  if (GIFT.on && GIFT.other) giftPinCheck();
}
function giftPinCheck() {
  const res = runPinCheck(vv('gift-pin'), vv('gift-city'), vv('gift-state'));
  el_('gift-pinmsg').innerHTML = res.html;
}

// ---- gifting in checkout ----
function giftReset(preset) {
  GIFT = { on: !!preset, wrap: false, note: '', other: false, hide: true, rec: { name: '', phone: '', street: '', city: '', state: '', pin: '' } };
  ['chk-gift', 'chk-gift-wrap', 'chk-gift-other'].forEach(id => { el_(id).checked = false; }); el_('chk-gift').checked = !!preset; el_('chk-gift-hide').checked = true; el_('chk-gift-note').value = '';
  ['gift-name', 'gift-phone', 'gift-street', 'gift-city', 'gift-state', 'gift-pin'].forEach(id => { el_(id).value = ''; });
  el_('gift-wrap-fee').textContent = giftFee() ? `(+₹${money(giftFee())})` : '(free)'; giftSync();
}
function giftSync() {
  GIFT.on = el_('chk-gift').checked; GIFT.wrap = GIFT.on && el_('chk-gift-wrap').checked; GIFT.note = vv('chk-gift-note').slice(0, 250); GIFT.other = GIFT.on && el_('chk-gift-other').checked; GIFT.hide = el_('chk-gift-hide').checked;
  GIFT.rec = { name: vv('gift-name'), phone: vv('gift-phone'), street: vv('gift-street'), city: vv('gift-city'), state: vv('gift-state'), pin: vv('gift-pin') };
  el_('gift-fields').style.display = GIFT.on ? '' : 'none'; el_('gift-recipient').style.display = GIFT.other ? '' : 'none'; el_('gift-hide-row').style.display = GIFT.on ? '' : 'none';
  el_('gift-note-count').textContent = (250 - GIFT.note.length) + ' characters left';
  updateCheckoutTotal(); if (GIFT.other) giftPinCheck();
}

// ---- saved addresses ----
function abEnsure(u) {
  if (!Array.isArray(u.addresses)) u.addresses = [];
  if (!u.addresses.some(x => x.primary) && (u.addr || {}).street) abSyncPrimary(u);   // older accounts: the profile address becomes the primary one
  return u.addresses;
}
// The profile address always lives in the address book as the primary (★) address; editing the profile updates it.
function abSyncPrimary(u) {
  const a = u.addr || {}; if (!a.street) return;
  const list = u.addresses = Array.isArray(u.addresses) ? u.addresses : [], key = x => (String(x.street) + '|' + x.pincode).toLowerCase().replace(/\s+/g, '');
  const mine = { street: a.street, city: a.city || '', state: a.state || '', pincode: a.pincode || '' };
  let p = list.find(x => x.primary) || list.find(x => key(x) === key(mine));
  if (p) Object.assign(p, mine, { primary: true }); else { p = { id: 'ad' + generateId(), label: 'Home', name: u.name || '', phone: u.phone, ...mine, primary: true }; list.unshift(p); }
  if (!p.name) p.name = u.name || ''; if (!p.phone) p.phone = u.phone;
  list.forEach(x => { if (x !== p) x.primary = false; });
  while (list.length > 6) { const i = list.findIndex(x => !x.primary); list.splice(i < 0 ? 0 : i, 1); }
  list.sort((x, y) => (y.primary ? 1 : 0) - (x.primary ? 1 : 0));
}
function abMakePrimary(id) {
  const u = currentUser(); if (!u) return; const p = abEnsure(u).find(x => x.id === id); if (!p) return;
  u.addresses.forEach(x => { x.primary = x === p; });
  u.addr = { street: p.street, city: p.city, state: p.state, pincode: p.pincode }; u.address = [p.street, p.city].filter(Boolean).join(', ');
  abSyncPrimary(u); saveDB(); renderAccount(); showToast('Primary address updated', 'success');
}
function abSave(u, a, label) {
  const list = abEnsure(u), key = x => (String(x.street) + '|' + x.pincode).toLowerCase().replace(/\s+/g, '');
  if (!a.street || list.some(x => key(x) === key(a))) return;
  if (list.length >= 6) { const i = list.findIndex(x => !x.primary); list.splice(i < 0 ? 0 : i, 1); } list.push({ id: 'ad' + generateId(), label: label || 'Address', name: a.name || '', phone: a.phone || '', street: a.street, city: a.city || '', state: a.state || '', pincode: a.pincode || '' });
}
function abRenderChips(u) {
  const list = abEnsure(u);
  el_('chk-book').innerHTML = list.length ? `<div class="ab-chips"><span>Saved addresses:</span>${list.map(a => `<button type="button" class="ab-chip" onclick="abPick('${esc(a.id)}')">${a.primary ? '★ ' : ''}${esc(a.label)} · ${esc(a.pincode)}</button>`).join('')}</div>` : '';
}
function abPick(id) {
  const u = currentUser(); const a = u && abEnsure(u).find(x => x.id === id); if (!a) return;
  const set = (i, v) => { el_(i).value = v || ''; };
  if (GIFT.on && GIFT.other) { set('gift-name', a.name); set('gift-phone', a.phone); set('gift-street', a.street); set('gift-city', a.city); set('gift-state', a.state); set('gift-pin', a.pincode); }
  else { set('chk-address', a.street); set('chk-city', a.city); set('chk-state', a.state); set('chk-pin', a.pincode); }
  chkPinCheck(); giftSync();
}
function abAccountHTML(u) {
  const list = abEnsure(u);
  return `<h4 class="acct-h" style="margin-top:22px;">Saved addresses</h4>${list.length ? list.map(a => `<div class="acct-addr"><div style="font-size:13px;"><strong>${a.primary ? '★ ' : ''}${esc(a.label)}</strong>${a.primary ? ' <span class="primary-tag">Primary</span>' : ''}${a.name ? ' · ' + esc(a.name) : ''}<div style="font-size:11px;color:#6b6862;">${esc(a.street)}, ${esc(a.city)} ${esc(a.pincode)}</div></div><div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">${a.primary ? '' : `<button class="linkbtn" onclick="abMakePrimary('${esc(a.id)}')">Make primary</button>`}<button class="linkbtn" onclick="abDel('${esc(a.id)}')">Remove</button></div></div>`).join('') : '<p style="font-size:13px;color:#6b6862;">None yet. They are saved when you order, or add one below.</p>'}
    <details style="margin:8px 0;"><summary style="cursor:pointer;font-size:13px;font-weight:600;">＋ Add an address</summary><div style="padding-top:10px;">
      <div class="form-group"><label>Label (e.g. Home, Mother)</label><input id="ab-label"></div><div class="form-group"><label>Name</label><input id="ab-name"></div><div class="form-group"><label>Phone</label><input id="ab-phone" inputmode="tel"></div>
      <div class="form-group"><label>Address</label><input id="ab-street"></div><div class="form-group"><label>City</label><input id="ab-city" oninput="abCheck()"></div><div class="form-group"><label>State</label><input id="ab-state" oninput="abCheck()"></div><div class="form-group"><label>PIN code</label><input id="ab-pin" inputmode="numeric" maxlength="6" oninput="abCheck()"></div>
      <div id="ab-msg" class="pin-msg"></div><button class="btn-outline" style="margin-top:6px;" onclick="abAdd()">Save address</button></div></details>`;
}
function abCheck() { el_('ab-msg').innerHTML = runPinCheck(vv('ab-pin'), vv('ab-city'), vv('ab-state')).html; }
function abAdd() {
  const u = currentUser(); if (!u) return; const a = { name: vv('ab-name'), phone: vv('ab-phone'), street: vv('ab-street'), city: vv('ab-city'), state: vv('ab-state'), pincode: vv('ab-pin') }, r = runPinCheck(a.pincode, a.city, a.state);
  if (a.street.length < 4 || a.city.length < 2) return showToast('Please fill the address and city', 'error');
  if (a.pincode.length < 3) return showToast('Please enter the PIN code', 'error');
  abSave(u, a, vv('ab-label') || 'Address'); saveDB(); renderAccount(); showToast('Address saved', 'success');
}
function abDel(id) { const u = currentUser(); if (!u) return; const gone = abEnsure(u).find(a => a.id === id); u.addresses = abEnsure(u).filter(a => a.id !== id); if (gone && gone.primary) u.addr = {}, u.address = ''; saveDB(); renderAccount(); }

// ---- order tracking for the customer (no cancel option anywhere: orders cannot be cancelled) ----
const TRACK_STEPS = [['placed', 'Order placed'], ['confirmed', 'Confirmed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered']];
const prettyStatus = s => String(s || '').replace(/_/g, ' ');
function openTrackOrder(id) {
  const u = currentUser(), o = db.orders.find(x => x.id === id); if (!u || !o || o.userId !== u.id) return;
  const at = {}; (o.timeline || []).forEach(t => { if (!at[t.status]) at[t.status] = t.time; });
  const cur = TRACK_STEPS.findIndex(s => s[0] === o.status), gift = o.gift ? `<div class="note" style="margin:8px 0;">🎁 Gift${o.gift.wrap ? ' · wrapped' : ''}${o.gift.note ? ' · with note card' : ''}${o.gift.hideSender ? ' · your name is kept off the parcel' : ''}</div>` : '';
  const sa = o.shippingAddress || {}, changeable = ['placed', 'confirmed', 'packed'].includes(o.status), link = /^https?:\/\//i.test(o.trackingUrl || '') ? o.trackingUrl : '';
  el_('trackBody').innerHTML = `<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:2px;">Track your order</h3><div style="font-family:monospace;font-size:12px;color:#6b6862;">${esc(o.id)} · ${esc(o.items.map(i => i.name).join(', '))}</div>${gift}${o.instructions ? `<div class="note" style="margin:8px 0;">📝 Your request: ${esc(o.instructions)}</div>` : ''}
    ${o.status === 'cancelled' ? '<div class="dc-bad" style="margin:14px 0;">This order was closed by the shop. Please message us if you have a question.</div>' : `<ol class="trk">${TRACK_STEPS.map(([k, label], i) => `<li class="${i < cur || (i === cur && o.status === 'delivered') ? 'done' : i === cur ? 'cur' : 'todo'}"><span class="dot">${i <= cur ? '✓' : ''}</span><div>${label}${at[k] ? `<small>${esc(at[k])}</small>` : ''}</div></li>`).join('')}</ol>`}
    ${o.delivery && o.delivery.label && !['delivered', 'cancelled'].includes(o.status) ? `<div class="dc-ok" style="margin:6px 0 12px;"><strong>${esc(o.delivery.label)}</strong></div>` : ''}
    ${o.tracking || link ? `<div class="note" style="margin:8px 0;"><strong>Courier:</strong> ${esc(o.tracking || '')} ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Track with the courier ↗</a>` : ''}</div>` : ''}
    <div class="note" style="margin:8px 0;">Delivering to: ${esc(sa.name || '')}, ${esc(sa.city || '')} ${esc(sa.pincode || '')}</div>
    ${changeable ? `<button class="btn-outline" onclick="openAddrChange('${esc(o.id)}')">📍 Change delivery address</button><div class="note">You can correct the address until the parcel is shipped.</div>` : ''}
    ${waChatEnabled() ? `<a class="btn-outline" style="display:block;text-align:center;text-decoration:none;" href="${esc(waChatLink(null))}" target="_blank" rel="noopener">💬 Need help? Chat with us</a>` : ''}`;
  el_('trackModal').classList.add('active');
}
function openAddrChange(id) {
  const o = db.orders.find(x => x.id === id), sa = (o && o.shippingAddress) || {}; if (!o) return;
  el_('trackBody').innerHTML = `<h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:10px;">Change delivery address</h3><div class="note" style="margin-bottom:10px;">Order ${esc(o.id)}</div>
    <div class="form-group"><label>Address</label><input id="ac-street" value="${esc(sa.street || '')}"></div><div class="form-group"><label>City</label><input id="ac-city" value="${esc(sa.city || '')}" oninput="acPinCheck()"></div><div class="form-group"><label>State</label><input id="ac-state" value="${esc(sa.state || '')}" oninput="acPinCheck()"></div><div class="form-group"><label>PIN code</label><input id="ac-pin" inputmode="numeric" maxlength="6" value="${esc(sa.pincode || '')}" oninput="acPinCheck()"></div>
    <div id="ac-msg" class="pin-msg"></div>
    <button class="btn-full" style="margin-top:10px;" onclick="saveAddrChange('${esc(o.id)}')">Save new address</button><button class="btn-outline" onclick="openTrackOrder('${esc(o.id)}')">Back</button>`;
  acPinCheck();
}
function acPinCheck() { el_('ac-msg').innerHTML = runPinCheck(vv('ac-pin'), vv('ac-city'), vv('ac-state')).html; }
function saveAddrChange(id) {
  const u = currentUser(), o = db.orders.find(x => x.id === id); if (!u || !o || o.userId !== u.id) return;
  if (!['placed', 'confirmed', 'packed'].includes(o.status)) { showToast('This order has already been shipped, so the address cannot be changed. Please message us.', 'error'); return; }
  const a = { street: vv('ac-street'), city: vv('ac-city'), state: vv('ac-state'), pincode: vv('ac-pin') }, r = runPinCheck(a.pincode, a.city, a.state);
  if (a.street.length < 4 || a.city.length < 2) return showToast('Please fill the address and city', 'error');
  if (a.pincode.length < 3) return showToast('Please enter the PIN code', 'error');
  (o.addressHistory = o.addressHistory || []).push({ at: getTimestamp(), from: { ...o.shippingAddress } });
  o.shippingAddress = { ...o.shippingAddress, ...a }; o.addressChanged = true; o.addressCheck = { status: r.status === 'blocked' ? 'unserved' : r.status, confirmed: r.status !== 'ok' }; if (o.status === 'packed') o.addressChangedAfterPacked = true;
  if (r.est && r.est.serviceable) o.delivery = { label: r.est.label }; else o.delivery = null;
  o.timeline.push({ status: o.status, time: getTimestamp(), note: 'Delivery address changed by the customer' });
  addLog('address_change', o.id, '-', 0, 0, 0, `Customer changed the address${o.status === 'packed' ? ' AFTER PACKING' : ''}`);
  if (!saveDB()) return; showToast('✓ New address saved', 'success'); openTrackOrder(id);
}

// ---- admin: packing slip, order extras, delivery & gifting settings ----
/* ---------- Shipping: India Post & couriers (2 Nov 2026) ---------- */
const COURIERS = {
  indiapost: { name: 'India Post (Speed Post)', link: () => 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx', check: n => /^[A-Za-z]{2}\d{9}[A-Za-z]{2}$/.test(n) },
  delhivery: { name: 'Delhivery', link: n => 'https://www.delhivery.com/track/package/' + encodeURIComponent(n), check: () => true },
  other: { name: 'Other courier', link: () => '', check: () => true }
};
const waPhone = ph => { const d = String(ph || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d.replace(/^0+/, ''); };
function trackingMessage(o) {
  const num = o.trackingNo || '', link = /^https?:\/\//i.test(o.trackingUrl || '') ? o.trackingUrl : '';
  return `Hello ${o.customer || ''}, your order ${o.id} from ${BRAND()} has been shipped${o.courier ? ' via ' + o.courier : ''}. 🎉\n${num ? 'Tracking number: ' + num + '\n' : ''}${link ? 'Track it here: ' + link + '\n' : ''}Delivery usually takes a few days. Please message us if you need any help.\nThank you for shopping with ${BRAND()}!`;
}
async function sendTrackingWA(id, resend) {
  const o = db.orders.find(x => x.id === id); if (!o) return;
  const ph = waPhone(o.phone); if (!ph) return showToast('This order has no phone number', 'error');
  if (BUILD === 'admin') {   // the server sends it by itself (checked for opt-outs, never twice for the same tracking number)
    try {
      const r = await admApi('POST', '/admin/api/notify-tracking', { orderId: o.id, trackingNo: o.trackingNo || '', phone: ph, customer: o.customer, courier: o.courier || '', trackingUrl: o.trackingUrl || '', resend: !!resend });
      if (r.sent) return showToast(r.mode === 'live' ? 'Tracking sent to the customer on WhatsApp' : 'Tracking message prepared (WhatsApp is not live yet on the server)', 'success');
      if (r.reason === 'already-sent') return showToast('This tracking number was already sent to the customer', 'info');
      if (r.reason === 'opted-out') return showToast('This customer asked not to get messages', 'error');
      showToast('Could not send automatically. Opening WhatsApp instead.', 'info');
    } catch (e) { showToast('Could not reach the server (' + e.message + '). Opening WhatsApp instead.', 'info'); }
  }
  window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(trackingMessage(o)), '_blank', 'noopener');
}
function openShipDialog(id) {
  const o = db.orders.find(x => x.id === id); if (!o) return;
  const cur = o.courierKey || 'indiapost';
  openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0 0 6px;">Shipped: ${esc(o.id)}</h3>
    <p style="font-size:13px;color:#666;margin:0 0 12px;">${esc(o.customer)} · ${esc(o.phone || '')}</p>
    <div class="form-group"><label>Courier</label><select id="sh-courier" onchange="shipPreview()">${Object.entries(COURIERS).map(([k, c]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Tracking number</label><input id="sh-num" value="${esc(o.trackingNo || '')}" placeholder="e.g. EE123456789IN" autocomplete="off" oninput="shipPreview()"><div id="sh-warn" style="font-size:12px;color:#8a6d00;margin-top:4px;"></div></div>
    <div class="form-group"><label>Tracking link <span style="color:#6b6862;font-weight:normal">(filled automatically; change only if needed)</span></label><input id="sh-link" value="${esc(o.trackingUrl || '')}" placeholder="https://…" oninput="this.dataset.manual='1'"></div>
    <p style="font-size:12px;color:#666;margin:0 0 6px;">${BUILD === 'admin' ? 'The customer gets this message automatically on WhatsApp when you save.' : 'This opens WhatsApp with the message ready; you press send.'}</p><div id="sh-msg" style="white-space:pre-wrap;font-size:12px;background:var(--cream);padding:10px;border-radius:4px;margin-bottom:12px;"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn-sm btn-primary-sm" id="sh-wa" onclick="shipSave(true)" style="background:#25D366;border-color:#25D366;">Save &amp; send to customer on WhatsApp</button><button class="btn-sm btn-info-sm" id="sh-save" onclick="shipSave(false)">Save only</button><button class="btn-sm btn-info-sm" onclick="closeModal('adminModal')">Skip</button></div>`);
  window._shipId = id; shipPreview(true);
}
function shipPreview(init) {
  const o = db.orders.find(x => x.id === window._shipId); if (!o) return;
  const k = gid('sh-courier').value, c = COURIERS[k], n = gid('sh-num').value.trim(), l = gid('sh-link');
  if (!l.dataset.manual && !(init && o.trackingUrl)) l.value = n || k === 'indiapost' ? c.link(n) : '';
  gid('sh-warn').textContent = n && !c.check(n) ? 'This does not look like an India Post number (2 letters, 9 digits, 2 letters, e.g. EE123456789IN). Please check it, or save anyway.' : '';
  gid('sh-msg').textContent = trackingMessage({ ...o, courier: c.name, trackingNo: n, trackingUrl: l.value });
}
function shipSave(sendWA) {
  const o = db.orders.find(x => x.id === window._shipId); if (!o) return;
  const k = gid('sh-courier').value, c = COURIERS[k], n = gid('sh-num').value.trim().slice(0, 60), l = gid('sh-link').value.trim();
  o.courierKey = k; o.courier = c.name; o.trackingNo = n; o.tracking = (c.name + (n ? ' · ' + n : '')).slice(0, 200);
  o.trackingUrl = /^https?:\/\//i.test(l) ? l.slice(0, 300) : '';
  o.timeline.push({ status: o.status, time: getTimestamp(), note: `Tracking added: ${o.tracking}` });
  saveDB(); closeModal('adminModal'); renderAdminContent('orders'); showToast('Tracking saved', 'success');
  if (sendWA) sendTrackingWA(o.id);
}
function printLabel(id) {
  const o = db.orders.find(x => x.id === id); if (!o) return; const sa = o.shippingAddress || {}, s = db.settings;
  const e = esc, phone = sa.phone || o.phone || '';
  const html = `<!doctype html><meta charset=utf-8><title>Label ${e(o.id)}</title><style>@page{size:A5 landscape;margin:8mm}body{font:16px/1.45 system-ui,sans-serif;margin:0;padding:10px}.l{border:3px solid #000;padding:16px;display:flex;flex-direction:column;gap:12px;min-height:90mm}.to{font-size:24px;line-height:1.35}.to b{font-size:28px}.pin{display:inline-block;border:3px solid #000;padding:2px 12px;letter-spacing:6px;font-size:30px;font-weight:600;margin-top:4px}.from{border-top:2px dashed #666;padding-top:8px;font-size:13px;color:#333;display:flex;justify-content:space-between;gap:12px;align-items:flex-end}.from img{height:44px}.t{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#555}button{margin:8px 0}@media print{button{display:none}}</style>
<button onclick="print()">Print label</button><div class="l"><div class="to"><div class="t">Deliver to</div><b>${e(sa.name || o.customer)}</b><br>${e(sa.street || '')}${sa.city ? '<br>' + e(sa.city) : ''}${sa.state ? ', ' + e(sa.state) : ''}<br><span class="pin">${e(sa.pincode || '')}</span><br>${phone ? '📞 +' + e(waPhone(phone)) : ''}</div>
<div class="from"><div><div class="t">From</div><b>${e(BRAND())}</b><br>${e(s.address || '')}${s.phone ? '<br>📞 ' + e(s.phone) : ''}<br><span style="color:#666">Order ${e(o.id)}${o.gift ? ' · 🎁 Gift' : ''}</span></div><img src="${LOGO_URI}" alt=""></div></div>`;
  const w = window.open('', '_blank'); if (!w) return showToast('Please allow pop-ups to print the label', 'error'); w.document.write(html); w.document.close();
}
function printDispatchList() {
  const list = db.orders.filter(o => o.status === 'packed'); if (!list.length) return showToast('No packed orders to dispatch yet', 'info');
  const e = esc, today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const rows = list.map((o, i) => { const sa = o.shippingAddress || {}; return `<tr><td>${i + 1}</td><td><b>${e(o.id)}</b>${o.gift ? '<br>🎁 gift' : ''}<br><small>${(o.items || []).reduce((n, x) => n + (+x.quantity || 0), 0)} item(s)</small></td><td><b>${e(sa.name || o.customer)}</b><br>${e(sa.street || '')}${sa.city ? ', ' + e(sa.city) : ''}${sa.state ? ', ' + e(sa.state) : ''}<br><b>PIN ${e(sa.pincode || '')}</b> · ${e(waPhone(sa.phone || o.phone))}${o.instructions ? '<br>📝 <i>' + e(o.instructions) + '</i>' : ''}</td><td></td><td></td><td class="c">☐</td></tr>`; }).join('');
  const html = `<!doctype html><meta charset=utf-8><title>Dispatch list</title><style>body{font:13px/1.4 system-ui,sans-serif;margin:16px}h2{margin:0}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border:1px solid #444;padding:6px;vertical-align:top;text-align:left}th{background:#eee}td:nth-child(4){width:150px}td:nth-child(5){width:70px}.c{text-align:center;font-size:20px}small{color:#555}@media print{button{display:none}}</style>
<button onclick="print()">Print</button><h2>${e(BRAND())} · Dispatch list</h2><div>${today} · ${list.length} parcel(s) · courier: ______________ · weight / postage noted per parcel</div>
<table><thead><tr><th>#</th><th>Order</th><th>Deliver to</th><th>Tracking number</th><th>Postage ₹</th><th>Handed</th></tr></thead><tbody>${rows}</tbody></table><p>Afterwards: mark each order <b>Shipped</b> in the owner app and enter its tracking number; the customer message is prepared for you.</p>`;
  const w = window.open('', '_blank'); if (!w) return showToast('Please allow pop-ups to print the list', 'error'); w.document.write(html); w.document.close();
}
function printSlip(id) {
  const o = db.orders.find(x => x.id === id); if (!o) return; const sa = o.shippingAddress || {};
  const html = packingSlipHtml({ id: o.id, customerName: o.customer, instructions: o.instructions || '', items: o.items.map(i => ({ name: i.name, sku: i.sku, quantity: i.quantity })), shipTo: { name: sa.name, address: sa.street, city: sa.city, state: sa.state, pincode: sa.pincode, phone: sa.phone }, gift: o.gift || {} }, { name: BRAND(), logo: LOGO_URI });
  const w = window.open('', '_blank'); if (!w) return showToast('Please allow pop-ups to print the slip', 'error'); w.document.write(html); w.document.close();
}
function orderExtraHTML(o) {
  const g = o.gift, link = /^https?:\/\//i.test(o.trackingUrl || '') ? o.trackingUrl : '', sa = o.shippingAddress || {};
  return `<div style="margin-top:15px;background:var(--cream);padding:15px;border-radius:4px;font-size:13px;line-height:1.7;">${o.instructions ? `<div style="background:#fff4e0;border-left:3px solid #C96A11;padding:8px 10px;margin-bottom:10px;"><strong>📝 Customer request</strong><div style="white-space:pre-wrap;">${esc(o.instructions)}</div></div>` : ''}<strong>Delivery</strong><div>Ship to: ${esc(sa.name || '')}, ${esc(sa.street || '')}, ${esc(sa.city || '')} ${esc(sa.pincode || '')}</div>${o.delivery && o.delivery.label ? `<div>${esc(o.delivery.label)}</div>` : ''}${o.tracking || link ? `<div>Courier: ${esc(o.tracking || '')} ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">link ↗</a>` : ''}</div>` : ''}${g ? `<div>🎁 Gift${g.wrap ? ' · wrap' : ''}${g.note ? ` · note card: “${esc(g.note)}”` : ''}${g.hideSender ? ' · <strong>hide sender</strong> (no name, prices or invoice in the parcel)' : ''}</div>` : ''}${o.addressCheck && o.addressCheck.status && o.addressCheck.status !== 'ok' ? `<div style="color:#8a6d00;">⚠ Address check: ${esc(o.addressCheck.status)}. The PIN/city/state looked doubtful or outside your usual areas; the customer went ahead. Please confirm delivery with them.</div>` : ''}${o.addressChanged ? `<div style="color:var(--red);">📍 Address changed by the customer ${(o.addressHistory || []).length}×${o.addressChangedAfterPacked ? ' (AFTER packing, relabel the parcel)' : ''}</div>` : ''}${o.invoiceUrl ? `<div><a href="${esc(o.invoiceUrl)}" target="_blank" rel="noopener">WhatsApp invoice PDF ↗</a></div>` : ''}</div>`;
}
const dcEdit = () => (db.settings.delivery = db.settings.delivery || JSON.parse(JSON.stringify(DEFAULT_DELIVERY)));
function renderDeliveryAdmin(container) {
  const y = window.scrollY, d = deliveryCfg();
  container.innerHTML = `<p style="color:#666;font-size:14px;margin-bottom:16px;max-width:760px;">These settings drive the “Check delivery” box on every saree page and the dates shown at checkout and in WhatsApp. <strong>They never stop an order:</strong> for an area marked “not usually delivered” or a doubtful PIN, the customer sees a friendly note, can still order, and you confirm the delivery with them. Delivery dates count from the day payment is received and skip Sundays.</p>
    <div class="admin-card"><h3>Delivery</h3>
      <div class="form-group" style="max-width:260px;"><label>Packing time before dispatch (working days)</label><input type="number" min="0" max="14" value="${d.processingDays}" oninput="dcSet('processingDays',this.value)"></div>
      <h4 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b6862;margin:14px 0 8px;">Zones (first matching zone wins; anything else uses “Rest of India”)</h4>
      <div style="overflow-x:auto;"><table class="admin-table" style="min-width:680px;"><thead><tr><th>Zone</th><th>States (comma separated)</th><th>Min days</th><th>Max days</th><th>We usually deliver</th><th></th></tr></thead><tbody>
      ${d.zones.map((z, i) => `<tr><td><input value="${esc(z.name)}" oninput="dcZone(${i},'name',this.value)" style="width:150px"></td><td><textarea rows="2" style="width:100%;min-width:220px" oninput="dcZone(${i},'states',this.value)">${esc((z.states || []).join(', '))}</textarea></td><td><input type="number" min="0" max="60" value="${z.minDays}" style="width:64px" oninput="dcZone(${i},'minDays',this.value)"></td><td><input type="number" min="0" max="60" value="${z.maxDays}" style="width:64px" oninput="dcZone(${i},'maxDays',this.value)"></td><td><input type="checkbox" ${z.serviceable !== false ? 'checked' : ''} onchange="dcZone(${i},'serviceable',this.checked)"></td><td><button class="btn-sm btn-danger-sm" onclick="dcDelZone(${i})">✕</button></td></tr>`).join('')}
      <tr><td><strong>${esc(d.fallback.name || 'Rest of India')}</strong></td><td class="note">all other states</td><td><input type="number" min="0" max="60" value="${d.fallback.minDays}" style="width:64px" oninput="dcFallback('minDays',this.value)"></td><td><input type="number" min="0" max="60" value="${d.fallback.maxDays}" style="width:64px" oninput="dcFallback('maxDays',this.value)"></td><td><input type="checkbox" ${d.fallback.serviceable !== false ? 'checked' : ''} onchange="dcFallback('serviceable',this.checked)"></td><td></td></tr></tbody></table></div>
      <div class="pf-actions" style="margin-top:10px;"><button class="btn-sm btn-info-sm" onclick="dcAddZone()">＋ Add zone</button></div>
      <div class="form-group" style="margin-top:14px;"><label>PIN codes where delivery needs a check (separated by commas or spaces). Customers still see a note, can still order, and you contact them</label><textarea rows="2" oninput="dcSet('blockedPincodes',this.value)">${esc(d.blockedPincodes || '')}</textarea></div>
      <div class="form-group" style="max-width:420px;"><label>Try it: PIN code</label><input id="dc-try" inputmode="numeric" maxlength="6" oninput="dcTry()"><div id="dc-try-res" style="margin-top:6px;"></div></div>
      <div class="note">After changing anything here, press <strong>Send sarees &amp; policies</strong> in WhatsApp Assistant so the chat assistant uses the same rules.</div></div>
    <div class="admin-card"><h3>Gifting</h3>
      <div class="form-group" style="max-width:300px;"><label>Gift wrapping fee (₹, 0 = free)</label><input type="number" min="0" max="5000" value="${giftFee()}" oninput="dcSet('giftWrapFee',this.value)"></div>
      <p class="note" style="max-width:640px;">Customers can tick “This is a gift” at checkout (or in the WhatsApp chat) to add gift wrapping, a free note card, and to ship to a different address. “Hide my name” keeps the buyer’s name, prices and invoice out of the parcel. In <strong>Orders → Slip</strong> you print the packing slip (recipient address, note card, no prices).</p></div>
    <div class="admin-card"><h3>Cancellations &amp; address changes</h3><p class="note" style="max-width:640px;">Customers have <strong>no cancel option</strong> (website, account or WhatsApp). They can correct the delivery address until you mark the order <em>shipped</em>; you are told when they do, and warned if the parcel was already packed. Only you can cancel or release an order from the admin.</p></div>`;
  window.scrollTo(0, y);
}
function dcSet(k, v) { if (k === 'giftWrapFee') db.settings.giftWrapFee = Math.min(5000, Math.max(0, parseInt(v, 10) || 0)); else if (k === 'processingDays') dcEdit().processingDays = Math.min(14, Math.max(0, parseInt(v, 10) || 0)); else dcEdit()[k] = v; saveDB(); }
function dcZone(i, k, v) { const z = dcEdit().zones[i]; if (!z) return; if (k === 'states') z.states = String(v).split(',').map(s => normState(s) || s.trim()).filter(Boolean); else if (k === 'name') z.name = v; else if (k === 'serviceable') z.serviceable = !!v; else z[k] = Math.min(60, Math.max(0, parseInt(v, 10) || 0)); saveDB(); }
function dcFallback(k, v) { const f = dcEdit().fallback; if (k === 'serviceable') f.serviceable = !!v; else f[k] = Math.min(60, Math.max(0, parseInt(v, 10) || 0)); saveDB(); }
function dcAddZone() { dcEdit().zones.push({ name: 'New zone', states: [], minDays: 3, maxDays: 6, serviceable: true }); saveDB(); renderDeliveryAdmin(el_('adminContent')); }
function dcDelZone(i) { dcEdit().zones.splice(i, 1); saveDB(); renderDeliveryAdmin(el_('adminContent')); }
function dcTry() { const p = vv('dc-try'); el_('dc-try-res').innerHTML = pinOk(p) ? deliveryResultHTML(p, 5000) : ''; }

