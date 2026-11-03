// ================= SHARE, WHATSAPP OTP LOGIN, PROFILE, CONSENT, LEGAL =================
const LEGAL_VERSION = '2.0 (10 Nov 2026)';
const el_ = id => document.getElementById(id);

// ---- share link for every item ----
function storeLink(p) { const b = siteBase(); return b ? `${b}/#/product/${p.slug}` : `${location.href.split('#')[0]}#/product/${p.slug}`; }
function richLink(p) { const b = siteBase(); return b ? `${b}/product/${p.slug}.html` : ''; }
function openShare(id, e) {
  if (e) e.stopPropagation();
  const p = db.products.find(x => x.id === id); if (!p) return;
  const link = storeLink(p), rich = richLink(p), text = `${p.name} – ₹${money(p.price)} | ${BRAND()}`, enc = encodeURIComponent;
  const online = !!siteBase() || /^https?:/.test(location.protocol);
  el_('shareBody').innerHTML = `
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:14px;">Share this saree</h3>
    <div class="share-item"><img src="${esc(p.image)}" alt=""><div><div style="font-weight:600;">${esc(p.name)}</div><div style="font-size:12px;color:#6b6862;">${esc(p.category)} · ₹ ${money(p.price)}</div></div></div>
    <label class="mini-label">Link to this saree</label>
    <div class="share-link"><input id="share-url" readonly value="${esc(link)}" onfocus="this.select()"><button class="btn-sm btn-primary-sm" onclick="shareCopy('share-url')">Copy</button></div>
    ${rich ? `<label class="mini-label">Link with rich preview (photo &amp; price card)</label><div class="share-link"><input id="share-rich" readonly value="${esc(rich)}" onfocus="this.select()"><button class="btn-sm btn-primary-sm" onclick="shareCopy('share-rich')">Copy</button></div>` : ''}
    <div class="share-btns">
      ${navigator.share ? `<button class="share-b" onclick="shareNative('${p.id}')">📲 Share…</button>` : ''}
      <a class="share-b wa" target="_blank" rel="noopener" href="https://wa.me/?text=${enc(text + '\n' + (rich || link))}">WhatsApp</a>
      <a class="share-b" target="_blank" rel="noopener" href="https://t.me/share/url?url=${enc(rich || link)}&text=${enc(text)}">Telegram</a>
      <a class="share-b" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${enc(rich || link)}">Facebook</a>
      <a class="share-b" href="mailto:?subject=${enc(text)}&body=${enc('Take a look at this saree:\n' + (rich || link))}">Email</a>
    </div>
    ${online ? '' : '<div class="note" style="color:#9a6b00;">This link will work for other people once your store is online and your website address is saved in Admin → Settings.</div>'}`;
  el_('shareModal').classList.add('active');
}
async function shareCopy(inputId) {
  const i = el_(inputId); i.select();
  try { await navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand('copy'); }
  showToast('🔗 Link copied', 'success');
}
async function shareNative(id) {
  const p = db.products.find(x => x.id === id); if (!p) return;
  try { await navigator.share({ title: p.name, text: `${p.name} – ₹${money(p.price)}`, url: richLink(p) || storeLink(p) }); } catch (e) { /* cancelled */ }
}

// ---- session / profile ----
function getSession() { try { const s = JSON.parse(localStorage.getItem('ap_session')); if (s && s.exp > Date.now()) return s; } catch (e) {} return null; }
function currentUser() { const s = getSession(); return s ? (db.users.find(u => u.id === s.userId) || null) : null; }
const otpEndpoint = () => (db.settings.otpEndpoint || '').trim().replace(/\/$/, '');
function setSession(u, token) { try { localStorage.setItem('ap_session', JSON.stringify({ userId: u.id, phone: u.phone, token: token || null, demo: !otpEndpoint(), exp: Date.now() + 30 * 864e5 })); } catch (e) {} updateAcctIcon(); }
function logout() { try { localStorage.removeItem('ap_session'); } catch (e) {} updateAcctIcon(); closeModal('accountModal'); showToast('Signed out'); }
function updateAcctIcon() { const d = el_('acctDot'); if (d) d.style.display = currentUser() ? 'block' : 'none'; }
function normPhone(cc, raw) {
  let d = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (cc === '+91') { if (d.length === 12 && d.startsWith('91')) d = d.slice(2); return /^[6-9]\d{9}$/.test(d) ? '+91' + d : null; }
  return d.length >= 6 && d.length <= 12 ? cc + d : null;
}
const CALLING_CODES = ['+971', '+91', '+65', '+61', '+44', '+1'];
function maskPhone(p) { p = String(p || ''); const cc = CALLING_CODES.find(c => p.startsWith(c)) || p.slice(0, 3), rest = p.slice(cc.length); return rest.length > 2 ? `${cc} ${'•'.repeat(rest.length - 2)}${rest.slice(-2)}` : p; }
function newUser(phone) { return { id: 'u' + generateId(), name: '', phone, whatsapp: phone, email: '', joined: ymd(new Date()), status: 'Regular', address: '', addr: {}, phoneVerified: true, consents: { orderUpdates: false, marketing: false, updatedAt: null } }; }
function loginUser(phone, token) {
  let u = db.users.find(x => x.phone === phone); const isNew = !u;
  if (!u) { u = newUser(phone); db.users.push(u); }
  u.phoneVerified = true; u.whatsapp = phone; u.lastLoginAt = new Date().toISOString();
  if (!u.consents) u.consents = { orderUpdates: false, marketing: false, updatedAt: null };
  addLog('customer_login', u.name || phone, '-', 0, 0, 0, isNew ? 'New profile created via WhatsApp OTP' : 'Signed in via WhatsApp OTP');
  saveDB(); setSession(u, token); return { u, isNew };
}
// Consent is append-only: every grant/withdrawal is a new dated row (who, what, which version of the policy, where).
function recordConsent(u, type, granted, source, ref) {
  const at = new Date().toISOString();
  db.consentLog.push({ id: Date.now() + Math.random(), userId: u.id, phone: u.phone, type, granted, version: LEGAL_VERSION, source, at, ...(ref ? { ref } : {}) });
  if (type === 'terms') { u.termsAcceptedAt = at; u.termsVersion = LEGAL_VERSION; }
  else if (type === 'age18') { u.ageConfirmedAt = at; }
  else if (type === 'notice') { u.noticeVersion = NOTICE_VERSION; u.noticeAt = at; }
  else if (type === 'orderUpdates' || type === 'marketing' || type === 'cartReminder') { u.consents[type] = granted; u.consents.updatedAt = at; }
  addLog('consent', u.name || u.phone, '-', 0, 0, 0, `${type}: ${granted ? 'granted' : 'withdrawn'} (${source})`);
}
const consentLabel = { age18: 'Age 18+ confirmed', notice: 'Privacy notice seen', terms: 'Terms & Privacy accepted', orderUpdates: 'WhatsApp order updates', marketing: 'WhatsApp offers & new arrivals', stockAlert: 'WhatsApp back-in-stock alert', cartReminder: 'WhatsApp cart reminders', reviewPublic: 'Public review & photos' };
function consentChips(u) {
  const c = u.consents || {};
  return `<div class="cchips">${u.phoneVerified ? '<span class="cchip ok">✓ WhatsApp verified</span>' : ''}<span class="cchip ${c.orderUpdates ? 'ok' : ''}">Orders ${c.orderUpdates ? '✓' : '✗'}</span><span class="cchip ${c.marketing ? 'ok' : ''}">Offers ${c.marketing ? '✓' : '✗'}</span></div>`;
}

// ---- WhatsApp OTP ----
// Real mode (Settings → "WhatsApp login service URL"): the page calls YOUR server, which talks to the WhatsApp Business API.
//   POST {url}/otp/send    {phone, channel:'whatsapp'}  → 200 {ok:true}                or {ok:false,error}
//   POST {url}/otp/verify  {phone, code}                → 200 {ok:true, token}        or {ok:false,error}
// Demo mode (no URL): the code is generated in the browser and shown on screen. That is for trying the flow only – it is NOT secure.
const AUTH = { age: false, cb: null, step: 'phone', cc: '+91', phone: '', err: '', busy: false, timer: null, demo: null, resendAt: 0, sends: {} };
async function otpPost(path, body) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  try { const r = await fetch(otpEndpoint() + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }); const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'Something went wrong. Please try again.'); return j; }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'The service took too long to respond.' : (e.message === 'Failed to fetch' ? 'Could not reach the login service.' : e.message)); }
  finally { clearTimeout(t); }
}
function openAuth(cb) { AUTH.cb = cb || null; AUTH.step = 'phone'; AUTH.err = ''; AUTH.busy = false; renderAuth(); el_('authModal').classList.add('active'); setTimeout(() => { const i = el_('auth-phone'); if (i) i.focus(); }, 50); }
function closeAuth() { el_('authModal').classList.remove('active'); clearInterval(AUTH.timer); AUTH.cb = null; }
function renderAuth() {
  const demo = !otpEndpoint(), box = el_('authBody'), err = AUTH.err ? `<div class="auth-err" role="alert">${esc(AUTH.err)}</div>` : '';
  if (AUTH.step === 'phone') {
    box.innerHTML = `<div class="auth-ic">💬</div><h2>Sign in with WhatsApp</h2>
      <p class="auth-sub">Enter your WhatsApp number and we'll send a 6-digit code. New here? Your profile is created automatically.</p>
      <div class="auth-phone"><select id="auth-cc" aria-label="Country code">${[['+91', '🇮🇳 +91'], ['+1', '🇺🇸 +1'], ['+44', '🇬🇧 +44'], ['+971', '🇦🇪 +971'], ['+65', '🇸🇬 +65'], ['+61', '🇦🇺 +61']].map(([v, l]) => `<option value="${v}" ${AUTH.cc === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input id="auth-phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="98765 43210" maxlength="14" value="${esc(AUTH.phone)}" onkeydown="if(event.key==='Enter')authSend()"></div>
      ${err}<button class="btn-full" id="auth-send" onclick="authSend()" ${AUTH.busy ? 'disabled' : ''}>${AUTH.busy ? 'Sending…' : 'Send code on WhatsApp'}</button>
      <label class="chk" style="margin:10px 0 0;"><input type="checkbox" id="auth-age" ${AUTH.age ? 'checked' : ''}><span>I am <strong>18 years or older</strong>. <em>(required)</em></span></label>
      <p class="auth-fine">By continuing you agree to our <a onclick="openLegalModal('terms')">Terms &amp; Conditions</a> and <a onclick="openLegalModal('privacy')">Privacy Policy</a>. <a onclick="openNotice()">Read the privacy notice</a> (English · తెలుగు · हिन्दी)</p>
      ${demo ? '<div class="demo-note">Demo mode: WhatsApp is not connected yet, so no message will be sent.</div>' : ''}`;
  } else {
    box.innerHTML = `<div class="auth-ic">🔐</div><h2>Enter the code</h2>
      <p class="auth-sub">We sent a 6-digit code to WhatsApp number <strong>${esc(maskPhone(AUTH.phone))}</strong>.</p>
      ${demo ? `<div class="demo-box"><strong>Demo mode</strong> — WhatsApp isn't connected, so nothing was sent. Your code is <span class="demo-code">${esc(AUTH.demo.code)}</span></div>` : ''}
      <input id="auth-code" class="otp-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" onkeydown="if(event.key==='Enter')authVerify()" oninput="this.value=this.value.replace(/\\D/g,'')">
      ${err}<button class="btn-full" id="auth-verify" onclick="authVerify()" ${AUTH.busy ? 'disabled' : ''}>${AUTH.busy ? 'Checking…' : 'Verify & continue'}</button>
      <div class="auth-links"><button class="linkbtn" id="auth-resend" onclick="authSend(true)" disabled>Resend code</button><button class="linkbtn" onclick="authBack()">Change number</button></div>`;
    clearInterval(AUTH.timer); AUTH.timer = setInterval(authTick, 1000); authTick();
    setTimeout(() => { const i = el_('auth-code'); if (i) i.focus(); }, 50);
  }
}
function authTick() {
  const b = el_('auth-resend');
  if (!b || !el_('authModal').classList.contains('active')) { clearInterval(AUTH.timer); return; }
  const s = Math.max(0, Math.ceil((AUTH.resendAt - Date.now()) / 1000));
  b.disabled = s > 0; b.textContent = s > 0 ? `Resend code in ${s}s` : 'Resend code';
}
function authBack() { AUTH.step = 'phone'; AUTH.err = ''; clearInterval(AUTH.timer); renderAuth(); }
async function authSend(resend) {
  if (AUTH.busy) return;
  if (!resend) { AUTH.cc = el_('auth-cc').value; AUTH.phone = el_('auth-phone').value; AUTH.age = !!(el_('auth-age') && el_('auth-age').checked); if (!AUTH.age) { AUTH.err = 'Please confirm that you are 18 years or older.'; renderAuth(); return; } }
  const phone = resend ? AUTH.full : normPhone(AUTH.cc, AUTH.phone);
  if (!phone) { AUTH.err = AUTH.cc === '+91' ? 'Enter a valid 10-digit Indian mobile number.' : 'Enter a valid phone number.'; renderAuth(); return; }
  const now = Date.now(), hist = (AUTH.sends[phone] = (AUTH.sends[phone] || []).filter(t => now - t < 600000));
  if (hist.length >= 3) { AUTH.err = 'Too many codes requested. Please wait 10 minutes and try again.'; if (AUTH.step === 'phone') renderAuth(); else { AUTH.err = AUTH.err; renderAuth(); } return; }
  AUTH.busy = true; AUTH.err = ''; renderAuth();
  try {
    if (otpEndpoint()) await otpPost('/otp/send', { phone, channel: 'whatsapp' });
    else { const a = new Uint32Array(1); crypto.getRandomValues(a); AUTH.demo = { code: String(100000 + a[0] % 900000), exp: now + 300000, attempts: 0 }; }
    hist.push(now); AUTH.full = phone; AUTH.phone = phone; AUTH.step = 'otp'; AUTH.resendAt = now + 30000; AUTH.busy = false; renderAuth();
    if (resend) showToast('New code sent', 'success');
  } catch (e) { AUTH.busy = false; AUTH.err = e.message; AUTH.step = resend ? 'otp' : 'phone'; renderAuth(); }
}
async function authVerify() {
  if (AUTH.busy) return;
  const code = (el_('auth-code').value || '').trim();
  if (!/^\d{6}$/.test(code)) { AUTH.err = 'Enter the 6-digit code.'; renderAuth(); el_('auth-code').value = code; return; }
  AUTH.busy = true; AUTH.err = ''; renderAuth(); el_('auth-code').value = code;
  try {
    let token = null;
    if (otpEndpoint()) { const j = await otpPost('/otp/verify', { phone: AUTH.full, code }); token = j.token || null; }
    else {
      const d = AUTH.demo;
      if (!d || Date.now() > d.exp) throw new Error('This code has expired. Please request a new one.');
      if (d.attempts >= 5) throw new Error('Too many wrong attempts. Please request a new code.');
      if (code !== d.code) { d.attempts++; throw new Error(`That code is not right. ${5 - d.attempts} attempt(s) left.`); }
    }
    AUTH.demo = null; const cb = AUTH.cb, { u, isNew } = loginUser(AUTH.full, token);
    if (AUTH.age && !u.ageConfirmedAt) recordConsent(u, 'age18', true, 'login'); if (isNew) recordConsent(u, 'notice', true, 'login'); saveDB();
    closeAuth(); showToast(isNew ? '🎉 Profile created — you are signed in' : `Welcome back${u.name ? ', ' + u.name.split(' ')[0] : ''}!`, 'success');
    if (cb) cb(); if (!isNew) maybeUpdatedNotice();
  } catch (e) { AUTH.busy = false; AUTH.err = e.message; renderAuth(); }
}

// ---- checkout (needs a verified WhatsApp profile, accepted terms, optional message permissions) ----
function openCheckout() {
  trackHit('checkout');
  pruneCart(); saveCart(); updateBadges();
  if (!cartLines().length) { showToast('Your cart is empty', 'error'); return; }
  closeAllDrawers();
  const u = currentUser();
  if (!u) { openAuth(() => openCheckout()); return; }
  appliedCoupon = null; { const ti = document.getElementById('chk-instr'); if (ti) ti.value = ''; }
  el_('couponInput').value = ''; el_('couponMsg').innerHTML = '';
  const a = u.addr || {}, set = (id, v) => { el_(id).value = v || ''; el_(id).classList.remove('invalid'); };
  set('chk-name', u.name); set('chk-phone', u.phone); set('chk-email', u.email); set('chk-address', a.street); set('chk-pin', a.pincode); set('chk-city', a.city); set('chk-state', a.state);
  el_('chk-verified-phone').textContent = maskPhone(u.phone);
  el_('chk-terms').checked = u.termsVersion === LEGAL_VERSION; el_('chk-age').checked = !!u.ageConfirmedAt; el_('chk-terms-row').classList.remove('invalid');
  el_('chk-wa-orders').checked = !!(u.consents && u.consents.orderUpdates); el_('chk-wa-promos').checked = !!(u.consents && u.consents.marketing); el_('chk-wa-cart').checked = !!(u.consents && u.consents.cartReminder); el_('chk-wa-cart-row').style.display = waServer() ? '' : 'none';
  giftReset(GIFT_PRESET); GIFT_PRESET = false; abRenderChips(u); el_('chk-save-addr').checked = true; chkPinCheck();
  el_('checkoutModal').classList.add('active');
  updateCheckoutTotal();
}
function checkoutSwitchNumber() { logout(); closeModal('checkoutModal'); openAuth(() => openCheckout()); }
function processPayment() {
  const u = currentUser();
  if (!u) { closeModal('checkoutModal'); openAuth(() => openCheckout()); return; }
  const lines = cartLines();
  if (!lines.length) { showToast('Your cart is empty', 'error'); return; }
  const v = id => el_(id).value.trim();
  const rules = [
    ['chk-name', v('chk-name').length >= 2, 'Please enter your full name'],
    ['chk-pin', /^[0-9A-Za-z -]{4,10}$/.test(v('chk-pin')), 'Please enter a valid pincode'],
    ['chk-email', v('chk-email') === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('chk-email')), 'Please enter a valid email'],
    ['chk-address', v('chk-address').length >= 4, 'Please enter your address'],
    ['chk-city', v('chk-city').length >= 2, 'Please enter your city']
  ];
  document.querySelectorAll('#checkoutModal input').forEach(i => i.classList.remove('invalid')); el_('chk-terms-row').classList.remove('invalid');
  const bad = rules.find(r => !r[1]);
  if (bad) { const e = el_(bad[0]); e.classList.add('invalid'); e.focus(); showToast(bad[2], 'error'); return; }
  if (!el_('chk-age').checked) { el_('chk-terms-row').classList.add('invalid'); showToast('Please confirm that you are 18 years or older', 'error'); return; }
  if (!el_('chk-terms').checked) { el_('chk-terms-row').classList.add('invalid'); showToast('Please accept the Terms & Conditions and Privacy Policy to continue', 'error'); return; }
  const short = lines.find(l => l.qty > l.stock);
  if (short) { showToast(`${short.name}: only ${short.stock} in stock`, 'error'); return; }
  // where it is going: the buyer's address, or the gift recipient's
  giftSync(); chkPinCheck();
  const useRec = GIFT.on && GIFT.other, R = GIFT.rec;
  if (useRec) {
    const gr = [['gift-name', R.name.length >= 2, 'Please enter the recipient name'], ['gift-street', R.street.length >= 4, 'Please enter the recipient address'], ['gift-city', R.city.length >= 2, 'Please enter the recipient city'], ['gift-pin', R.pin.length >= 3, 'Please enter the recipient PIN code']].find(r => !r[1]);
    if (gr) { el_(gr[0]).classList.add('invalid'); el_(gr[0]).focus(); showToast(gr[2], 'error'); return; }
  }
  const shipRes = useRec ? runPinCheck(R.pin, R.city, R.state) : runPinCheck(v('chk-pin'), v('chk-city'), v('chk-state'));   // advisory only: never blocks the order

  const t = computeTotals(), today = ymd(new Date());
  const orderId = 'AP-' + today.replace(/-/g, '') + '-' + generateId().slice(0, 5).toUpperCase();
  const name = v('chk-name'), email = v('chk-email');
  // profile + consents (each change is logged as its own dated row)
  Object.assign(u, { name, email, addr: { street: v('chk-address'), city: v('chk-city'), state: v('chk-state'), pincode: v('chk-pin') }, address: `${v('chk-address')}, ${v('chk-city')}` });
  if (u.termsVersion !== LEGAL_VERSION) recordConsent(u, 'terms', true, 'checkout');
  if (!u.ageConfirmedAt) recordConsent(u, 'age18', true, 'checkout'); if (u.noticeVersion !== NOTICE_VERSION) recordConsent(u, 'notice', true, 'checkout');
  const firstAsk = !u.consents.updatedAt; // the very first answer is recorded even when it is "no"
  [['orderUpdates', 'chk-wa-orders'], ['marketing', 'chk-wa-promos'], ...(waServer() ? [['cartReminder', 'chk-wa-cart']] : [])].forEach(([type, id]) => { const want = el_(id).checked; if (!!u.consents[type] !== want || firstAsk) recordConsent(u, type, want, 'checkout'); });
  const order = {
    id: orderId, userId: u.id, customer: name, phone: u.phone, email, total: t.total, status: 'placed', date: today,
    items: lines.map(l => ({ productId: l.id, name: l.name, sku: l.sku, quantity: l.qty, price: l.price, image: l.image, category: l.category })),
    shippingAddress: useRec ? { name: R.name, phone: R.phone || u.phone, street: R.street, city: R.city, state: R.state, pincode: R.pin, country: 'India' } : { name, phone: u.phone, street: v('chk-address'), city: v('chk-city'), state: v('chk-state'), pincode: v('chk-pin'), country: 'India' },
    billTo: { name, street: v('chk-address'), city: v('chk-city'), state: v('chk-state'), pincode: v('chk-pin') },
    instructions: v('chk-instr').slice(0, 300),
    gift: GIFT.on ? { wrap: GIFT.wrap, note: GIFT.note, hideSender: GIFT.hide, fee: GIFT.wrap ? giftFee() : 0, toOther: useRec } : null,
    delivery: shipRes.est && shipRes.est.serviceable ? { label: shipRes.est.label } : null, addressCheck: { status: shipRes.status === 'blocked' ? 'unserved' : shipRes.status, confirmed: shipRes.status !== 'ok' },
    payment: { method: 'Simulated', provider: 'Demo', paymentId: 'demo_' + generateId(), status: 'paid', paidAt: today },
    pricing: { subtotal: t.subtotal, shipping: t.shipping, discount: t.discount, giftWrap: t.giftFee, total: t.total, ...(t.bundleDiscount > 0 ? { bundle: t.bundleName, bundleDiscount: t.bundleDiscount } : {}) }, coupon: t.couponDiscount > 0 && appliedCoupon ? appliedCoupon.code : '',
    consent: { terms: LEGAL_VERSION, whatsappOrderUpdates: !!u.consents.orderUpdates, whatsappOffers: !!u.consents.marketing },
    timeline: [{ status: 'placed', time: getTimestamp(), note: 'Order placed successfully' }],
    invoiceGenerated: false
  };
  db.orders.unshift(order);
  if (el_('chk-save-addr').checked) { abSave(u, { name, phone: u.phone, street: v('chk-address'), city: v('chk-city'), state: v('chk-state'), pincode: v('chk-pin') }, 'Home'); if (useRec) abSave(u, { name: R.name, phone: R.phone, street: R.street, city: R.city, state: R.state, pincode: R.pin }, 'Gift · ' + R.name.split(' ')[0]); }
  lines.forEach(l => {
    const p = db.products.find(x => x.id === l.id), prev = p.stock; p.stock -= l.qty;
    db.logs.unshift({ id: Date.now() + Math.random(), type: 'stock_out', product: p.name, sku: p.sku, change: -l.qty, prev, curr: p.stock, reason: `Order ${orderId}`, time: getTimestamp() });
  });
  saveDB();
  el_('successSent').textContent = ''; webOrderSend(order, u);
  el_('successOrderId').textContent = orderId;
  el_('successAmount').textContent = '₹ ' + money(t.total);
  el_('successPayment').textContent = order.payment.paymentId;
  el_('successMsg').textContent = u.consents.orderUpdates ? `We'll send order updates to your WhatsApp ${maskPhone(u.phone)}.` : 'You can turn on WhatsApp order updates any time in My Account.';
  closeModal('checkoutModal'); el_('successModal').classList.add('active');
  CART_ORDERED = true; cart = []; saveCart(); appliedCoupon = null; GIFT.on = false;
  updateBadges(); renderCartDrawer(); renderProducts(); buildScrollTrack();
}

// ---- My Account ----
function openAccount() { const u = currentUser(); if (!u) { openAuth(() => openAccount()); return; } renderAccount(); el_('accountModal').classList.add('active'); maybeUpdatedNotice(); }
const ACCT_OPEN = new Set(['details', 'msgs']);
function renderAccount() {
  const u = currentUser(); if (!u) { closeModal('accountModal'); return; }
  const a = u.addr || {}, c = u.consents || {}, orders = db.orders.filter(o => o.userId === u.id).sort((x, y) => y.date.localeCompare(x.date));
  const tg = (type, label, sub) => `<label class="acct-pref acct-tick"><input type="checkbox" ${c[type] ? 'checked' : ''} onchange="acctConsent('${type}',this)"><span><span style="font-weight:600;font-size:14px;display:block;">${label}</span><span class="note" style="margin:2px 0 0;display:block;">${sub}</span></span></label>`;
  const initials = (String(u.name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '☺').toUpperCase();
  const extra = acctExtraHTML(u), nAddr = abEnsure(u).length;
  const row = (key, title, sub, body) => `<details class="ac4-row" ${ACCT_OPEN.has(key) ? 'open' : ''} ontoggle="this.open ? ACCT_OPEN.add('${key}') : ACCT_OPEN.delete('${key}')"><summary><span><b>${title}</b><small>${sub}</small></span><i aria-hidden="true"></i></summary><div class="ac4-body">${body}</div></details>`;
  const lastOrder = orders[0] ? ` · last placed ${esc(orders[0].date)}` : '';
  el_('accountBody').innerHTML = `
    <div class="ac4-head"><span class="ac4-av" aria-hidden="true">${esc(initials)}</span><div><h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;margin:0;">${esc(u.name || 'My Account')}</h2><p style="font-size:13px;color:var(--sage);margin:2px 0 0;">✓ Signed in with WhatsApp · ${esc(maskPhone(u.phone))}</p></div></div>
    <div class="ac4-list">
    ${row('details', 'Personal details', 'Name, email and address', `<div class="form-group"><label>Full name</label><input id="ac-name" value="${esc(u.name)}"></div>
        <div class="form-group"><label>Email (optional)</label><input id="ac-email" type="email" value="${esc(u.email)}"></div>
        <div class="form-group"><label>Address</label><input id="ac-street" value="${esc(a.street)}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;"><div class="form-group"><label>City</label><input id="ac-city" value="${esc(a.city)}"></div><div class="form-group"><label>State</label><input id="ac-state" value="${esc(a.state)}"></div><div class="form-group"><label>Pincode</label><input id="ac-pin" value="${esc(a.pincode)}"></div></div>
        <button class="btn-full" onclick="acctSave()">Save profile</button>`)}
    ${row('msgs', 'WhatsApp messages', `Order updates ${c.orderUpdates ? 'on' : 'off'} · Offers ${c.marketing ? 'on' : 'off'}`, `${tg('orderUpdates', 'Order updates', 'Confirmation, shipping and delivery messages about your orders.')}
        ${tg('marketing', 'Offers &amp; new arrivals', 'Occasional messages about new collections and festive offers.')}
        ${waServer() ? tg('cartReminder', 'Cart reminders', 'A reminder (at most 2) if you leave sarees in your cart without ordering.') : ''}
        <div class="note">Tick or untick any time. It applies at once. You can also reply STOP to any message.</div>`)}
    ${row('orders', 'My orders', `${orders.length} order${orders.length === 1 ? '' : 's'}${lastOrder}`, `${orders.length ? orders.map(o => `<div class="acct-order"><div><div style="font-family:monospace;font-size:12px;font-weight:600;">${esc(o.id)}</div><div style="font-size:11px;color:#6b6862;">${esc(o.date)} · ${o.items.length} item${o.items.length > 1 ? 's' : ''}</div></div><div style="text-align:right;"><div style="font-weight:600;font-size:13px;">${formatCurrency(o.total)}</div><span class="status-pill ${getStatusClass(o.status)}" style="font-size:9px;">${esc(prettyStatus(o.status))}</span><div><button class="linkbtn" onclick="openTrackOrder('${esc(o.id)}')">Track</button></div></div></div>`).join('') : '<p style="font-size:13px;color:#6b6862;">No orders yet.</p>'}`)}
    ${row('addr', 'Saved addresses', `${nAddr} saved`, abAccountHTML(u))}
    ${extra ? row('extra', 'Alerts and reviews', 'Back-in-stock alerts, my reviews', extra) : ''}
    ${row('privacy', 'Privacy and data', 'Your rights, erase account', acctRightsHTML(u))}
    </div>
    <div class="acct-foot"><a onclick="openLegalModal('terms')">Terms &amp; Conditions</a> · <a onclick="openLegalModal('privacy')">Privacy Policy</a> · <a onclick="openNotice()">Privacy notice</a> · <a onclick="acctDelete()" style="color:var(--red);">Erase my account</a><span style="flex:1"></span><button class="btn-sm btn-danger-sm" onclick="logout()">Sign out</button></div>`;
}
function acctSave() {
  const u = currentUser(); if (!u) return; const g = id => el_(id).value.trim();
  if (g('ac-email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g('ac-email'))) { showToast('Please enter a valid email', 'error'); return; }
  Object.assign(u, { name: g('ac-name'), email: g('ac-email'), addr: { street: g('ac-street'), city: g('ac-city'), state: g('ac-state'), pincode: g('ac-pin') }, address: [g('ac-street'), g('ac-city')].filter(Boolean).join(', ') });
  abSyncPrimary(u);
  if (saveDB()) { showToast('Profile saved' + (u.addr.street ? ' · added to your address book as primary' : ''), 'success'); renderAccount(); }
}
function acctConsent(type, elx) {
  const u = currentUser(); if (!u) return; const granted = !!elx.checked;
  recordConsent(u, type, granted, 'account'); if (!saveDB()) { elx.checked = !granted; return; } if (type === 'cartReminder') cartSyncSoon();
  showToast(granted ? `✓ ${consentLabel[type]} turned on` : `${consentLabel[type]} turned off`, granted ? 'success' : '');
}
