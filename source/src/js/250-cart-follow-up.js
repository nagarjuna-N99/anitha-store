// ================= CART FOLLOW-UP =================
// 1) "Resume your cart" card when a shopper comes back.   2) Optional WhatsApp reminders (separate consent),
// sent by the assistant server for signed-in shoppers who agreed and left without ordering.
const CART_TS_KEY = 'ap_cart_ts';
function cartTouch() { try { if (cart.length) localStorage.setItem(CART_TS_KEY, String(Date.now())); else localStorage.removeItem(CART_TS_KEY); } catch (e) {} }
function resumeCartPrompt() {
  try {
    if (isAdminView || sessionStorage.getItem('ap_resume_seen')) return;
    pruneCart(); const lines = cartLines(); if (!lines.length) return;
    const ts = +localStorage.getItem(CART_TS_KEY) || 0; if (!ts || Date.now() - ts < 20 * 60000) return;
    sessionStorage.setItem('ap_resume_seen', '1');
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0), n = lines.reduce((s, l) => s + l.qty, 0);
    const bar = document.createElement('div'); bar.id = 'resumeBar'; bar.setAttribute('role', 'status');
    bar.innerHTML = `<img src="${esc(lines[0].image)}" alt=""><div class="rb-txt"><strong>Welcome back!</strong><span>${esc(lines[0].name)}${n > 1 ? ` and ${n - 1} more` : ''} · ₹ ${money(total)} waiting in your cart</span></div><button class="rb-go" onclick="document.getElementById('resumeBar').remove();openCart()">View cart</button><button class="rb-x" aria-label="Dismiss" onclick="document.getElementById('resumeBar').remove()">×</button>`;
    document.body.appendChild(bar);
    setTimeout(() => { const b = document.getElementById('resumeBar'); if (b) b.remove(); }, 20000);
  } catch (e) {}
}
// consent proof for the server
function cartConsent(u) {
  const row = db.consentLog.filter(c => c.userId === u.id && c.type === 'cartReminder').slice(-1)[0];
  return { granted: !!(u.consents && u.consents.cartReminder), at: row ? row.at : new Date().toISOString(), version: row ? row.version : LEGAL_VERSION };
}
let CART_SYNC_T = null, CART_SYNC_LAST = '', CART_ORDERED = false;
function cartSyncSoon() { if (!waServer()) return; clearTimeout(CART_SYNC_T); CART_SYNC_T = setTimeout(cartSyncNow, 2500); }
async function cartSyncNow() {
  const u = currentUser(), url = waServer(); if (!u || !url) return;
  const granted = !!(u.consents && u.consents.cartReminder);
  if (!granted && !u.cartSynced) return; // never contact the server for someone who has not agreed (unless withdrawing)
  const s = getSession() || {}, ordered = CART_ORDERED;
  const body = { phone: u.phone, token: s.token || '', name: u.name || '', items: ordered || !granted ? [] : cart.map(c => ({ id: c.id, qty: c.qty })), consent: cartConsent(u), ordered };
  const sig = JSON.stringify(body); if (sig === CART_SYNC_LAST) return;
  try {
    const r = await fetch(url + '/cart/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sig });
    if (r.ok) { CART_SYNC_LAST = sig; if (ordered) CART_ORDERED = false; if (u.cartSynced !== granted) { u.cartSynced = granted; try { localStorage.setItem('ap_db_v70', JSON.stringify(db)); } catch (e) {} } }
  } catch (e) { /* offline or server down: the cart simply is not followed up */ }
}
function cartRemRow() {
  const e = document.getElementById(cartMobile() ? 'cartRemRowM' : 'cartRemRow'); const other = document.getElementById(cartMobile() ? 'cartRemRow' : 'cartRemRowM'); if (other) other.innerHTML = ''; if (!e) return; const u = currentUser();
  if (!u || !cart.length || !waServer()) { e.innerHTML = ''; return; }
  e.innerHTML = `<label class="chk" style="margin-bottom:12px;"><input type="checkbox" id="cart-rem" ${u.consents && u.consents.cartReminder ? 'checked' : ''} onchange="cartRemToggle(this.checked)"><span style="font-size:12px;">🔔 Remind me on WhatsApp if I leave without ordering <em style="color:#6b6862;">(max 2 messages · reply STOP any time)</em></span></label>`;
}
function cartRemToggle(on) {
  const u = currentUser(); if (!u) return; u.consents = u.consents || {};
  recordConsent(u, 'cartReminder', on, 'cart'); if (!saveDB()) return; showToast(on ? '✓ We will remind you on WhatsApp if you forget' : 'Cart reminders turned off'); cartSyncSoon();
}
// ---- admin: reminders card in the WhatsApp Assistant tab ----
async function waCartLoad() {
  const box = document.getElementById('wa-cart-stats'); if (!box) return;
  if (!waServer() || !waTok()) { box.textContent = 'Connect the assistant above to see reminder results here.'; return; }
  try {
    const c = await waCall('/api/carts');
    box.innerHTML = `<div class="stats-grid" style="margin:0;"><div class="stat-card"><h3>Carts waiting</h3><div class="value">${c.waiting}</div></div><div class="stat-card"><h3>Reminders sent</h3><div class="value">${c.remindersSent}</div></div><div class="stat-card"><h3>Orders recovered</h3><div class="value">${c.recovered}</div></div><div class="stat-card"><h3>Failed to send</h3><div class="value">${c.failed}</div></div></div><div class="note" style="margin-top:8px;">Shoppers who did not agree are never messaged and their carts are not stored here. Reminders are ${c.enabled ? 'ON' : 'PAUSED'}${c.live ? '' : ' (test mode: nothing is really sent)'}.</div><div class="pf-actions" style="margin-top:10px;"><button class="btn-sm ${c.enabled ? 'btn-info-sm' : 'btn-primary-sm'}" onclick="waCartPause(${c.enabled})">${c.enabled ? 'Pause reminders' : 'Resume reminders'}</button></div>`;
  } catch (e) { box.textContent = 'Could not load: ' + (e.message || e); }
}
async function waCartPause(wasOn) { try { await waCall('/api/cart/settings', { method: 'POST', body: JSON.stringify({ enabled: !wasOn }) }); showToast(wasOn ? 'Reminders paused' : 'Reminders resumed'); waCartLoad(); } catch (e) { showToast(e.message, 'error'); } }
const WA_CART_TEMPLATES = [
  ['cart_reminder_1', 'Hi {{1}}, you left *{{2}}* in your cart at ' + 'Anitha Pemmasani. Handloom sarees are one of a kind, so stock can run out. Complete your order here: {{3}}\n\nReply STOP to stop reminders.'],
  ['cart_reminder_2', 'Hi {{1}}, a gentle reminder: *{{2}}* is still waiting in your cart. Any question about the saree? Just reply here and we will help. {{3}}\n\nReply STOP to stop reminders.'],
];
function waCartCardHTML() {
  return `<div class="admin-card"><h3>4 · Cart reminders</h3>
    <p class="note" style="margin-bottom:12px;max-width:720px;">When a signed-in shopper who <strong>agreed</strong> to reminders leaves sarees in the cart, the assistant sends one WhatsApp reminder after about an hour and a second one the next day. It never sends more than two, never at night (9 pm – 9 am), never for sold-out sarees, never after they order or send STOP. If they reply, the assistant sees what they left and helps them finish.</p>
    <div id="wa-cart-stats" class="note">…</div>
    <details style="margin-top:14px;"><summary style="cursor:pointer;font-weight:600;font-size:13px;">Message wording to submit to Meta for approval</summary>
      <p class="note" style="margin:8px 0;">WhatsApp only lets a business start a conversation with an approved template. Create these two in Meta’s WhatsApp Manager (language English; Meta usually files cart reminders under <em>Marketing</em>, which costs more per message). The names must match <code>CART_TEMPLATE_1</code> / <code>CART_TEMPLATE_2</code> in the assistant’s settings.</p>
      ${WA_CART_TEMPLATES.map(([n, t]) => `<div style="margin-bottom:10px;"><code>${esc(n)}</code><pre style="white-space:pre-wrap;background:var(--cream);padding:10px;border-radius:6px;font-size:12px;margin-top:4px;">${esc(t)}</pre></div>`).join('')}
      <p class="note">{{1}} = first name · {{2}} = saree name (and “and 2 more”) · {{3}} = link back to the cart.</p></details></div>`;
}

// ---- WhatsApp orders: paid orders are pulled into the store so stock, customers and invoices stay in one place ----
async function waOrdersLoad() {
  const box = document.getElementById('wa-orders-box'); if (!box) return;
  if (!waServer() || !waTok()) { box.textContent = 'Connect the assistant above to see WhatsApp orders here.'; return; }
  try {
    const s = await waCall('/api/status'), ex = await waCall('/api/orders/export'), pend = (ex.orders || []).filter(o => { const l = db.orders.find(x => x.id === o.id); return !l || l.status !== (WA_STATUS_MAP[o.status] || 'confirmed'); });
    box.innerHTML = `<div class="note" style="margin-bottom:10px;">Payments: <strong>${esc(s.payments.provider === 'mock' ? 'TEST mode (fake pay page, no real money)' : s.payments.provider)}</strong> · payment links are sent <strong>${s.payments.approval === 'auto' ? 'automatically' : 'after you approve each order in the inbox'}</strong> · links stay valid ${s.payments.linkValidHours} h and the saree is held meanwhile.</div>
      <div><strong>${pend.length}</strong> WhatsApp order${pend.length === 1 ? '' : 's'} to add or update in the store.</div>
      <div class="pf-actions" style="margin-top:10px;"><button class="btn-sm btn-primary-sm" ${pend.length ? '' : 'disabled'} onclick="waImportOrders()">⬇ Add / update WhatsApp orders in the store</button><button class="btn-sm btn-info-sm" onclick="waOpen('/inbox')">Open inbox (approve &amp; send payment links)</button></div>`;
  } catch (e) { box.textContent = 'Could not load: ' + (e.message || e); }
}
const WA_STATUS_MAP = { paid: 'confirmed', packed: 'packed', shipped: 'shipped', out_for_delivery: 'out_for_delivery', delivered: 'delivered' };
async function waImportOrders() {
  try {
    const ex = await waCall('/api/orders/export'), done = []; let added = 0, updated = 0;
    for (const x of ex.orders || []) {
      const mapped = WA_STATUS_MAP[x.status] || 'confirmed', existing = db.orders.find(o => o.id === x.id), stamp = (st, note) => { if (!existing.timeline.some(t => t.status === st)) existing.timeline.push({ status: st, time: getTimestamp(), note }); };
      if (existing) {                                                    // already imported: follow the courier updates (status, tracking, delivery)
        if (existing.status !== mapped) { existing.status = mapped; stamp(mapped, 'Updated from WhatsApp order'); updated++; }
        if (x.tracking) existing.tracking = x.tracking; if (x.trackingUrl) existing.trackingUrl = x.trackingUrl; done.push({ id: x.id, status: x.status }); continue;
      }
      const digits = String(x.phone).replace(/\D/g, ''), phone = '+' + digits;
      let u = db.users.find(c => String(c.phone).replace(/\D/g, '').slice(-10) === digits.slice(-10));
      if (!u) { u = newUser(phone); u.name = x.customerName; db.users.push(u); }
      if (!u.name) u.name = x.customerName; const bt = x.billTo || {}; if (!u.address && (bt.address || x.address)) { u.address = bt.address || x.address; u.addr = { street: bt.address || x.address, city: bt.city || '', state: bt.state || '', pincode: bt.pincode || x.pincode }; }
      const day = ymd(new Date(x.paidAt || Date.now())), st = x.shipTo || { name: x.customerName, address: x.address, city: '', state: '', pincode: x.pincode, phone: u.phone };
      const items = x.items.map(i => { const p = db.products.find(y => y.id === i.id) || {}; return { productId: i.id, name: i.name, sku: i.sku || p.sku || '', quantity: i.quantity, price: i.price, image: p.image || '', category: p.category || '' }; });
      const order = { id: x.id, userId: u.id, customer: x.customerName, phone: u.phone, email: u.email || '', total: x.pricing.total, status: mapped, date: day, source: 'whatsapp', items,
        shippingAddress: { name: st.name, phone: st.phone || u.phone, street: st.address, city: st.city || '', state: st.state || '', pincode: st.pincode, country: 'India' }, billTo: { name: x.customerName, street: bt.address || x.address, city: bt.city || '', state: bt.state || '', pincode: bt.pincode || x.pincode },
        gift: x.gift ? { wrap: !!x.gift.wrap, note: x.gift.note || '', hideSender: !!x.gift.hideSender, fee: x.gift.fee || 0, toOther: st.name !== x.customerName } : null, delivery: x.delivery || null,
        payment: { method: 'Payment link (WhatsApp)', provider: x.payment.provider || 'link', paymentId: x.payment.paymentId, status: 'paid', paidAt: day },
        pricing: { subtotal: x.pricing.subtotal, shipping: x.pricing.shipping, discount: x.pricing.discount || 0, giftWrap: x.pricing.giftWrap || 0, total: x.pricing.total }, coupon: x.coupon || '', tracking: x.tracking || '', trackingUrl: x.trackingUrl || '',
        consent: { terms: LEGAL_VERSION, source: 'whatsapp-chat' }, timeline: [{ status: 'placed', time: getTimestamp(), note: 'Ordered and paid on WhatsApp' }], invoiceGenerated: false };
      if (mapped !== 'confirmed') order.timeline.push({ status: mapped, time: getTimestamp(), note: 'Imported at this stage' });
      if (x.invoice) { order.invoiceGenerated = true; order.invoiceId = x.invoice.number; order.invoiceUrl = x.invoice.url; if (!db.invoices.some(i => i.id === x.invoice.number)) db.invoices.push({ id: x.invoice.number, orderId: x.id, customer: x.customerName, email: '', phone: u.phone, amount: order.total, date: day, status: 'sent', template: db.settings.selectedTemplate, items: order.items, shippingAddress: order.shippingAddress, pricing: order.pricing, pdfUrl: x.invoice.url }); }
      db.orders.unshift(order);
      items.forEach(l => { const p = db.products.find(y => y.id === l.productId); if (!p) return; const prev = p.stock; p.stock = Math.max(0, p.stock - l.quantity); db.logs.unshift({ id: Date.now() + Math.random(), type: 'stock_out', product: p.name, sku: p.sku, change: -(prev - p.stock), prev, curr: p.stock, reason: `WhatsApp order ${x.id}`, time: getTimestamp() }); });
      addLog('whatsapp_order', x.customerName, '-', 0, 0, 0, `Imported paid WhatsApp order ${x.id}`); done.push({ id: x.id, status: x.status }); added++;
    }
    if (!saveDB()) return;                                    // never acknowledge unless the store really saved it
    await waCall('/api/orders/ack', { method: 'POST', body: JSON.stringify({ items: done }) });
    showToast(`✓ ${added} new, ${updated} updated`, 'success'); renderProducts(); buildScrollTrack(); updateBadges(); waOrdersLoad(); waRenderFresh();
  } catch (e) { showToast(e.message || 'Could not import', 'error'); }
}
function waOrdersCardHTML() {
  return `<div class="admin-card"><h3>5 · Orders &amp; payments on WhatsApp</h3>
    <p class="note" style="margin-bottom:12px;max-width:720px;">When a customer says yes to an order in the chat, it lands in the inbox. You press <strong>Send payment link</strong> (or switch the assistant to send it automatically). The customer pays on the gateway’s page; only the gateway’s signed confirmation marks the order paid. Then bring the paid orders into this store so stock, customers and invoices stay in one place.</p>
    <div id="wa-orders-box" class="note">…</div></div>`;
}

