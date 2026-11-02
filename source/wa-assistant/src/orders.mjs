// Order lifecycle for orders taken on WhatsApp:
//   new ─(owner approves, or auto)→ payment_pending ─(gateway confirms)→ paid → packed → shipped → out_for_delivery → delivered
//                       └→ cancelled / expired (stock released; only the OWNER can cancel an unpaid order: customers cannot cancel)
// Hard rules: only the gateway's SIGNED notification (or the owner) can mark an order paid; the amount is fixed on the server;
// one active link per order; stock is held while a link is open and until the store imports a paid order.
import crypto from 'node:crypto';
import { deliveryEstimate, fmtShortDate, addressCheck, statesOfPin } from './pincode.mjs';
import { lookupPin } from './pinlookup.mjs';

const HOUR = 3600 * 1000;
const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
export const PAID_STATES = ['paid', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const NEXT = { paid: ['packed', 'shipped'], packed: ['shipped'], shipped: ['out_for_delivery', 'delivered'], out_for_delivery: ['delivered'] };
const STEPS = [['placed', 'Order placed'], ['paid', 'Payment received'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered']];
const first = o => (o.customerName || '').split(/\s+/)[0] || 'there';
const rand = n => crypto.randomBytes(n).toString('hex');

export function priceOrder(catalogue, lines, discount = 0, giftFee = 0) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const P = catalogue.data.pricing || {}, fee = P.shippingFee ?? 199, above = P.freeShippingAbove ?? 10000;
  const shipping = subtotal === 0 || subtotal > above ? 0 : fee;
  discount = Math.max(0, Math.min(Math.round(discount), subtotal)); giftFee = Math.max(0, Math.round(giftFee));
  return { subtotal, discount, shipping, giftWrap: giftFee, total: subtotal + shipping + giftFee - discount };
}

// Sarees that are spoken for: a payment link is open, or paid but not yet imported into the store's stock.
export function heldMap(store, now = Date.now()) {
  const m = {};
  for (const o of store.s.orders) {
    const holding = (o.status === 'payment_pending' && o.payment && o.payment.expiresAt > now) || (PAID_STATES.includes(o.status) && !o.importedAt);
    if (holding) for (const i of o.items) m[i.id] = (m[i.id] || 0) + i.quantity;
  }
  return m;
}

export class Orders {
  // say(phone, text, {template, params, buttons, document}) delivers a WhatsApp message (free text inside the 24 h window, template outside).
  constructor({ cfg, store, provider, say, alertOwner, makeCatalogue, fetchImpl }) { Object.assign(this, { cfg, store, provider, say, alertOwner, makeCatalogue, fetchImpl }); this.claims = new Set(); }

  find(id) { return this.store.s.orders.find(o => o.id === id); }
  site() { return (this.cfg.siteUrl || this.makeCatalogue().shop.siteUrl || '').replace(/\/+$/, ''); }
  base() { return this.cfg.payments.publicUrl || `http://localhost:${this.cfg.port}`; }
  trackUrl(o) { return o.trackToken ? `${this.base()}/track/${o.trackToken}` : ''; }
  invoiceUrl(o) { return o.invoice ? `${this.base()}/invoice/${o.invoice.token}.pdf` : ''; }
  // buttons shown under order messages. There is deliberately NO cancel button: orders cannot be cancelled.
  buttonsFor(o) { return [{ id: 'track:' + o.id, title: 'Track order' }, { id: 'help:' + o.id, title: 'Help & support' }]; }
  stamp(o, status, now, note) { (o.timeline ||= []).push({ at: now, status, ...(note ? { note } : {}) }); }

  // ---------- address (delivery) ----------
  // Checks PIN / city / state. Returns {status:'ok'|'confirm'|'mismatch'|'invalid', message}
  async checkAddress({ pincode, city, state }) {
    const places = await lookupPin(this.cfg, String(pincode || '').trim(), this.fetchImpl);
    return addressCheck({ pincode, city, state, places });
  }
  deliveryFor(pincode, now = Date.now()) { return deliveryEstimate(this.makeCatalogue().data.delivery, pincode, now); }

  // Customer changes the delivery address of their own order before dispatch.
  async updateAddress({ phone, orderId, address, city, state, pincode, confirmed, now = Date.now() }) {
    const o = this.find(orderId);
    if (!o || o.phone !== phone) return { error: 'No such order for this customer.' };
    if (!['new', 'payment_pending', 'paid', 'packed'].includes(o.status)) return { error: o.status === 'cancelled' || o.status === 'expired' ? 'This order is no longer active.' : 'This order has already been dispatched, so the address cannot be changed here. Hand over to Anitha: she may be able to contact the courier.', dispatched: true };
    address = String(address || '').trim(); pincode = String(pincode || '').replace(/\s/g, '');
    if (address.length < 10) return { error: 'The address looks incomplete. Ask for house/flat number, street, area and city.' };
    // PIN problems are only advisory: ask the customer ONCE to double-check, then accept whatever they confirm. We ship regardless.
    const chk = await this.checkAddress({ pincode, city, state }), est = this.deliveryFor(pincode, now);
    const doubt = chk.status !== 'ok' || (est.ok && !est.serviceable);
    if (doubt && !confirmed) return { needsConfirmation: true, message: [chk.status !== 'ok' && chk.message, est.ok && !est.serviceable && est.reason].filter(Boolean).join(' ') };
    const old = o.shipTo; (o.addressHistory ||= []).push({ at: now, from: old, by: 'customer' });
    o.shipTo = { ...old, address, city: String(city || '').trim(), state: String(state || '').trim(), pincode }; o.address = address; o.pincode = pincode;
    o.addressCheck = { status: doubt ? (chk.status !== 'ok' ? chk.status : 'unserved') : 'ok', confirmed: doubt }; if (est.ok && est.serviceable) o.delivery = est; else delete o.delivery;
    const packed = o.status === 'packed'; if (packed) o.addressChangedAfterPacked = true;
    this.stamp(o, 'address_changed', now); this.store.flush();
    this.alertOwner({ kind: 'address', conv: this.store.conv(o.phone), order: o, packed });
    return { ok: true, packed, delivery: est.ok && est.serviceable ? est.label : undefined };
  }

  // ---------- payment link ----------
  async sendLink(id, { now = Date.now(), resend = false } = {}) {
    const o = this.find(id); if (!o) return { error: 'Order not found' };
    if (['cancelled', ...PAID_STATES].includes(o.status)) return { error: `Order is already ${o.status}` };
    if (this.claims.has(id)) return { error: 'A link is being created, try again in a moment' };
    if (o.status === 'payment_pending' && o.payment.expiresAt > now) {
      if (!resend) return { ok: true, url: o.payment.url, already: true };
      await this.deliverLink(o, now); return { ok: true, url: o.payment.url, resent: true };
    }
    this.claims.add(id);
    try {
      const cat = this.makeCatalogue();
      for (const i of o.items) { const p = cat.find(i.id); if (!p || p.stock < i.quantity) return { error: `${i.name} is no longer available`, soldOut: true }; }
      const pr = priceOrder(cat, o.items, o.coupon?.amount || 0, o.gift?.fee || 0); o.pricing = pr; o.total = pr.total;   // discount / gift fee promised in the chat are honoured
      const expiresAt = now + this.cfg.payments.linkValidHours * HOUR;
      const est = o.shipTo?.pincode ? deliveryEstimate(cat.data.delivery, o.shipTo.pincode, now) : null; if (est?.ok && est.serviceable) o.delivery = est;
      const link = await this.provider.createLink({ orderId: o.id, amountInr: pr.total, customer: { name: o.customerName, phone: o.phone }, description: `Order ${o.id} · ${cat.shop.name || 'Saree order'}`, expiresAt });
      o.payment = { provider: this.provider.name, linkId: link.id, url: link.url, amount: pr.total, createdAt: now, expiresAt };
      o.status = 'payment_pending'; this.stamp(o, 'payment_pending', now); this.store.flush();
      await this.deliverLink(o, now);
      return { ok: true, url: link.url };
    } catch (e) { console.error('[orders] link failed', e.message); return { error: 'Could not create the payment link: ' + e.message }; }
    finally { this.claims.delete(id); }
  }

  async deliverLink(o, now = Date.now()) {
    const hrs = Math.round((o.payment.expiresAt - now) / HOUR), terms = this.site() ? `\nBy paying you agree to our Terms: ${this.site()}/#/terms` : '';
    const pr = o.pricing, g = o.gift || {};
    const lines = [`Thank you, ${first(o)}! Your order *${o.id}*:`, ...o.items.map(i => `• ${i.name} × ${i.quantity}`)];
    if (g.wrap) lines.push('🎁 Gift wrapped' + (g.note ? ' with your note card' : '')); else if (g.note) lines.push('💌 With your note card');
    if (o.shipTo && (o.shipTo.name !== o.customerName || g.hideSender)) lines.push(`Deliver to: ${o.shipTo.name}, ${o.shipTo.city || ''} ${o.shipTo.pincode}${g.hideSender ? ' (your name is kept off the parcel)' : ''}`);
    if (pr.discount) lines.push(`Items: ${fmt(pr.subtotal)}`, `Discount (${o.coupon.code}): −${fmt(pr.discount)}`);
    if (pr.giftWrap) lines.push(`Gift wrapping: ${fmt(pr.giftWrap)}`);
    lines.push(`Total: *${fmt(o.payment.amount)}*${pr.shipping ? ` (incl. shipping ${fmt(pr.shipping)})` : ' (free shipping)'}`);
    if (o.delivery?.serviceable) lines.push(`${o.delivery.label} (after payment)`); else lines.push('We will confirm the delivery date with you.');
    lines.push('', 'Pay securely here (UPI / cards / net banking):', o.payment.url, '', `We are holding your saree for ${hrs} hours. Your order is confirmed once the payment is received.${terms}`);
    await this.say(o.phone, lines.join('\n'), { template: this.cfg.payments.templates.link, params: [first(o), o.id, fmt(o.payment.amount), o.payment.url], buttons: this.buttonsFor(o) });
    o.payment.linkSentAt = now; this.store.flush();
  }

  // ---------- gateway notification (already signature-verified by the caller) ----------
  async handleEvent(evt, now = Date.now()) {
    if (!evt || !evt.linkId) return { ignored: 'unparseable' };
    if (!this.store.claimMessage('pay:' + (evt.id || evt.paymentId || evt.linkId + evt.type))) return { ignored: 'duplicate' };
    const o = this.store.s.orders.find(x => x.payment && x.payment.linkId === evt.linkId);
    if (!o) return { ignored: 'unknown link' };
    if (evt.type === 'paid') {
      if (PAID_STATES.includes(o.status)) return { ignored: 'already paid' };
      if (Math.round(evt.amountInr * 100) !== Math.round(o.payment.amount * 100)) {
        o.status = 'payment_issue'; o.issue = `Paid ${fmt(evt.amountInr)} but order total is ${fmt(o.payment.amount)}`; this.store.flush();
        const h = this.store.addHandoff({ phone: o.phone, name: o.customerName, reason: 'Payment amount does not match order ' + o.id, summary: o.issue + ` (payment ${evt.paymentId}). Check with the payment provider.` });
        this.alertOwner({ kind: 'handoff', conv: this.store.conv(o.phone), handoff: h }); return { issue: true };
      }
      const wasExpired = o.status === 'expired' || o.status === 'cancelled';
      o.status = 'paid'; o.paidAt = now; o.payment.paymentId = evt.paymentId; o.payment.status = 'paid'; this.stamp(o, 'paid', now); this.assignInvoice(o, now); this.store.flush();
      if (wasExpired) { const h = this.store.addHandoff({ phone: o.phone, name: o.customerName, reason: 'Paid AFTER the link expired: ' + o.id, summary: 'The customer paid after the stock hold ended. Check the saree is still available, or refund.' }); this.alertOwner({ kind: 'handoff', conv: this.store.conv(o.phone), handoff: h }); }
      this.alertOwner({ kind: 'paid', conv: this.store.conv(o.phone), order: o });
      await this.afterPaid(o);
      return { paid: true };
    }
    if (o.status === 'payment_pending') { o.status = evt.type === 'expired' ? 'expired' : 'cancelled'; this.stamp(o, o.status, now); this.store.flush(); }
    return { released: true };
  }

  async afterPaid(o) {
    const when = o.delivery?.serviceable ? `\n${o.delivery.label}.` : '';
    await this.say(o.phone, `✅ Payment of *${fmt(o.payment.amount)}* received for order *${o.id}*. Thank you! Anitha will pack your saree and we will message you when it ships.${when}\nTrack your order any time: ${this.trackUrl(o)}`, { template: this.cfg.payments.templates.paid, params: [first(o), o.id, fmt(o.payment.amount)], buttons: this.buttonsFor(o) });
    try { await this.sendInvoice(o); } catch (e) { console.error('[invoice]', e.message); }
  }

  assignInvoice(o, now = Date.now()) {
    if (o.invoice) return o.invoice;
    const seq = this.store.s.invoiceSeq = (this.store.s.invoiceSeq || 0) + 1, prefix = this.makeCatalogue().shop.invoicePrefix || 'AP-INV';
    return (o.invoice = { number: `${prefix}-W${String(seq).padStart(4, '0')}`, token: rand(16), issuedAt: now });
  }
  async sendInvoice(o) {
    if (!o.invoice) return; const url = this.invoiceUrl(o);
    await this.say(o.phone, `🧾 Your GST invoice ${o.invoice.number} for order ${o.id}`, { document: { url, filename: `Invoice-${o.invoice.number}.pdf` }, template: this.cfg.payments.templates.invoice, params: [first(o), o.id, url] });
    o.invoiceSentAt = Date.now(); this.store.flush();
  }

  // ---------- fulfilment ----------
  async setStatus(id, status, { tracking = '', trackingUrl = '', now = Date.now() } = {}) {
    const o = this.find(id); if (!o) return { error: 'Order not found' };
    if (!(NEXT[o.status] || []).includes(status)) return { error: o.status === 'new' || o.status === 'payment_pending' ? 'The order is not paid yet' : `Cannot go from ${o.status} to ${status}` };
    o.status = status; this.stamp(o, status, now);
    if (tracking) o.tracking = String(tracking).slice(0, 200); if (/^https?:\/\//i.test(trackingUrl)) o.trackingUrl = trackingUrl.slice(0, 300);
    if (status === 'shipped') o.shippedAt = now; if (status === 'delivered') o.deliveredAt = now; this.store.flush();
    const t = this.cfg.payments.templates, link = this.trackUrl(o), courier = [o.tracking, o.trackingUrl].filter(Boolean).join('\n');
    const msg = {
      packed: [`📦 Your order *${o.id}* is packed and will be handed to the courier shortly.`, t.packed, [first(o), o.id, 'packed']],
      shipped: [`🚚 Your order *${o.id}* has been shipped.${courier ? '\nCourier: ' + courier : ''}${o.delivery?.serviceable ? '\n' + o.delivery.label : ''}\nTrack: ${link}`, t.shipped, [first(o), o.id, o.trackingUrl || o.tracking || link]],
      out_for_delivery: [`🛵 Your order *${o.id}* is out for delivery today. Please keep your phone nearby.`, t.outForDelivery, [first(o), o.id, 'today']],
      delivered: [`✅ Your order *${o.id}* has been delivered. We hope you love your saree! 💛\nIf anything is not right, just reply here.`, t.delivered, [first(o), o.id, 'delivered']],
    }[status];
    await this.say(o.phone, msg[0], { template: msg[1], params: msg[2], buttons: status === 'delivered' ? undefined : this.buttonsFor(o) });
    return { ok: true };
  }
  markShipped(id, tracking = '', now = Date.now(), trackingUrl = '') { return this.setStatus(id, 'shipped', { tracking, trackingUrl, now }); }

  // Run every minute: close links whose time is up, and ask for reviews once after delivery.
  async sweep(now = Date.now()) {
    let n = 0;
    for (const o of this.store.s.orders) if (o.status === 'payment_pending' && o.payment.expiresAt <= now) {
      o.status = 'expired'; this.stamp(o, 'expired', now); n++;
      this.provider.cancelLink(o.payment.linkId).catch(() => {}); this.alertOwner({ kind: 'expired', conv: this.store.conv(o.phone), order: o });
    }
    if (n) this.store.flush();
    await this.reviewRequests(now);
    return n;
  }

  // One friendly message per delivered order, 48 h after delivery (REVIEW_REQUEST_AFTER_HOURS). Claimed first, so never twice.
  async reviewRequests(now = Date.now()) {
    const site = this.site(); if (!site) return 0; let n = 0;
    for (const o of this.store.s.orders) {
      if (o.status !== 'delivered' || o.reviewRequestedAt || !o.deliveredAt || now - o.deliveredAt < this.cfg.reviewRequestAfterHours * HOUR) continue;
      if (this.store.isOptedOut(o.phone) || o.phone.startsWith('test-')) continue;
      o.reviewRequestedAt = now; this.store.flush(); n++;
      const it = o.items[0], link = `${site}/#/product/${it.slug || ''}`;
      await this.say(o.phone, `Hi ${first(o)}! 💛 How are you enjoying your *${it.name}*? If you have a minute, a short review (photos are welcome!) helps other saree lovers:\n${link}\n\nReply STOP if you do not want messages like this.`, { template: this.cfg.payments.templates.review, params: [first(o), it.name, link] });
    }
    return n;
  }

  async cancel(id, now = Date.now()) {
    const o = this.find(id); if (!o) return { error: 'Order not found' };
    if (PAID_STATES.includes(o.status)) return { error: 'A paid order cannot be cancelled here. Refund it with the payment provider first.' };
    if (o.payment?.linkId && o.status === 'payment_pending') await this.provider.cancelLink(o.payment.linkId);
    o.status = 'cancelled'; this.stamp(o, 'cancelled', now); this.store.flush(); return { ok: true };
  }

  // Owner received the money another way (cash / direct UPI).
  markPaidManually(id, reference = '', now = Date.now()) {
    const o = this.find(id); if (!o) return { error: 'Order not found' };
    if (['cancelled', ...PAID_STATES].includes(o.status)) return { error: `Order is already ${o.status}` };
    const pr = o.pricing || priceOrder(this.makeCatalogue(), o.items, o.coupon?.amount || 0, o.gift?.fee || 0);
    o.pricing = pr; o.total = pr.total; o.payment = { ...(o.payment || {}), provider: 'manual', status: 'paid', amount: pr.total, paymentId: String(reference).slice(0, 80) || 'manual' };
    o.status = 'paid'; o.paidAt = now; this.stamp(o, 'paid', now, 'marked paid by owner'); this.assignInvoice(o, now); this.store.flush();
    return { ok: true, order: o };
  }

  // ---------- what the customer can read ----------
  steps(o) {
    const done = {}; for (const t of o.timeline || []) done[t.status] = t.at;
    done.placed = done.placed || o.createdAt;
    return STEPS.map(([k, label]) => ({ key: k, label, at: done[k] || null })).filter(s => s.at || k2idx(s.key) <= k2idx(curKey(o)));
  }
  trackingText(o) {
    const st = { new: 'Waiting for the payment link from Anitha', payment_pending: 'Waiting for your payment', paid: 'Payment received, being prepared', packed: 'Packed, going to the courier', shipped: 'Shipped', out_for_delivery: 'Out for delivery today', delivered: 'Delivered', expired: 'Payment link expired', cancelled: 'Closed', payment_issue: 'Payment under check' }[o.status] || o.status;
    const l = [`📍 Order *${o.id}*: ${st}`];
    if (o.delivery?.serviceable && !['delivered', 'cancelled', 'expired'].includes(o.status)) l.push(o.delivery.label);
    if (o.tracking || o.trackingUrl) l.push('Courier: ' + [o.tracking, o.trackingUrl].filter(Boolean).join(' '));
    if (o.status === 'payment_pending' && o.payment?.url) l.push('Pay here: ' + o.payment.url);
    if (this.trackUrl(o)) l.push('Full status: ' + this.trackUrl(o));
    return l.join('\n');
  }
  statusFor(phone) {
    return this.store.s.orders.filter(o => o.phone === phone).slice(0, 3).map(o => ({ order_id: o.id, status: o.status, total_inr: o.pricing?.total ?? o.total, items: o.items.map(i => `${i.name} × ${i.quantity}`), deliver_to: o.shipTo ? `${o.shipTo.name}, ${o.shipTo.city || ''} ${o.shipTo.pincode}` : undefined, expected_delivery: o.delivery?.serviceable ? o.delivery.label : undefined, payment_link_valid_until: o.status === 'payment_pending' ? new Date(o.payment.expiresAt).toISOString() : undefined, courier: [o.tracking, o.trackingUrl].filter(Boolean).join(' ') || undefined, tracking_page: this.trackUrl(o) || undefined, can_change_address: ['new', 'payment_pending', 'paid', 'packed'].includes(o.status) }));
  }

  // ---------- hand-over to the store ----------
  // Paid orders the store has not yet taken in, or whose status moved on since the last import.
  exportPending() { return this.store.s.orders.filter(o => PAID_STATES.includes(o.status) && !o.phone.startsWith('test-') && (!o.importedAt || o.importedStatus !== o.status)); }
  ack(items, now = Date.now()) {
    let n = 0;
    for (const it of items) { const id = typeof it === 'string' ? it : it.id, o = this.find(id); if (!o || !PAID_STATES.includes(o.status)) continue; if (!o.importedAt) o.importedAt = now; o.importedStatus = (typeof it === 'object' && it.status) || o.status; n++; }
    this.store.flush(); return n;
  }
}
const IDX = { placed: 0, paid: 1, packed: 2, shipped: 3, out_for_delivery: 4, delivered: 5 };
const k2idx = k => IDX[k] ?? 0;
const curKey = o => (o.status in IDX ? o.status : o.status === 'new' || o.status === 'payment_pending' ? 'placed' : 'placed');
