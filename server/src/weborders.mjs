// Orders placed on the public website reach the owner here (the website itself keeps nothing the owner can see).
// The server checks the order against the real prices and stock and flags anything that does not match; the owner
// then accepts it into Orders (and messages the customer to confirm and take payment) or says it is not possible.
// Nothing is charged on the website: payment is agreed on WhatsApp.
import fs from 'node:fs';
import path from 'node:path';
import { eDigits } from './erase.mjs';

const DAY = 86400_000;
const s = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const num = (v, lo, hi, d = 0) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const addr = a => ({ name: s(a && a.name, 80), phone: s(a && a.phone, 20), street: s(a && a.street, 200), city: s(a && a.city, 60), state: s(a && a.state, 60), pincode: s(a && a.pincode, 8), country: s(a && a.country, 40) || 'India' });

export function cleanWebOrder(p) {
  const o = p && p.order, c = p && p.customer; if (!o || !c || !Array.isArray(o.items)) throw Object.assign(new Error('The order is not complete.'), { code: 422 });
  if (o.items.length < 1 || o.items.length > 20) throw Object.assign(new Error('An order needs 1 to 20 sarees.'), { code: 422 });
  const phone = s(c.phone, 20); if (eDigits(phone).length < 10) throw Object.assign(new Error('A valid phone number is needed.'), { code: 422 }); if (!s(c.name, 80)) throw Object.assign(new Error('The name is needed.'), { code: 422 });
  const g = o.gift && typeof o.gift === 'object' ? { wrap: !!o.gift.wrap, note: s(o.gift.note, 250), hideSender: !!o.gift.hideSender, fee: num(o.gift.fee, 0, 100000), toOther: !!o.gift.toOther } : null, pr = o.pricing || {};
  return {
    order: { localId: s(o.id, 40), date: s(o.date, 10), items: o.items.map(i => ({ productId: s(i.productId, 40), name: s(i.name, 120), sku: s(i.sku, 40), category: s(i.category, 60), quantity: num(i.quantity, 1, 10, 1), price: num(i.price, 0, 10_000_000) })), shippingAddress: addr(o.shippingAddress), billTo: addr(o.billTo), instructions: s(o.instructions, 300), gift: g, coupon: s(o.coupon, 40), delivery: o.delivery && o.delivery.label ? { label: s(o.delivery.label, 120) } : null, addressCheck: o.addressCheck && typeof o.addressCheck === 'object' ? { status: s(o.addressCheck.status, 20) } : null, pricing: { subtotal: num(pr.subtotal, 0, 1e8), shipping: num(pr.shipping, 0, 1e6), discount: num(pr.discount, 0, 1e8), giftWrap: num(pr.giftWrap, 0, 1e6), total: num(pr.total || o.total, 0, 1e8) }, total: num(o.total, 0, 1e8) },
    customer: { id: s(c.id, 60), name: s(c.name, 80), phone, email: s(c.email, 120), addr: addr(c.addr), consents: { orderUpdates: !!(c.consents && c.consents.orderUpdates), marketing: !!(c.consents && c.consents.marketing), cartReminder: !!(c.consents && c.consents.cartReminder) }, termsVersion: s(c.termsVersion, 40), noticeVersion: s(c.noticeVersion, 20), ageConfirmedAt: s(c.ageConfirmedAt, 40), nominee: c.nominee && c.nominee.text ? { text: s(c.nominee.text, 200) } : null },
    consentLog: (Array.isArray(p.consentLog) ? p.consentLog : []).slice(-30).map(x => ({ type: s(x.type, 20), granted: !!x.granted, version: s(x.version, 40), source: s(x.source, 20), at: s(x.at, 40) })),
  };
}
export function checkAgainstShop(order, db) {
  const issues = [], prods = (db && db.products) || []; let subtotal = 0;
  for (const i of order.items) { const p = prods.find(x => x.id === i.productId); if (!p) { issues.push(`${i.name}: not in the shop any more`); continue; } subtotal += p.price * i.quantity; if (p.stock < i.quantity) issues.push(`${p.name}: only ${p.stock} in stock, the customer wants ${i.quantity}`); if (p.price !== i.price) issues.push(`${p.name}: the price is ₹${p.price} now, the customer saw ₹${i.price}`); }
  if (order.pricing.subtotal && Math.abs(order.pricing.subtotal - order.items.reduce((a, i) => a + i.price * i.quantity, 0)) > 1) issues.push('The total sent does not match the items. Check it before you accept.');
  return { issues, shopSubtotal: subtotal };
}
export class WebOrders {
  constructor(dir, now = () => Date.now()) { this.file = path.join(dir, 'web-orders.json'); this.now = now; this.rate = new Map(); }
  read() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return { n: 0, items: [] }; } }
  write(d) { const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(d), { mode: 0o600 }); fs.renameSync(t, this.file); }
  limited(ip) { const t = this.now(), a = (this.rate.get(ip) || []).filter(x => t - x < 3600_000); a.push(t); this.rate.set(ip, a); if (this.rate.size > 3000) this.rate.clear(); return a.length > 10; }
  add(payload, db, ip) {
    if (this.limited(ip || 'x')) throw Object.assign(new Error('Too many orders from this device. Please WhatsApp us.'), { code: 429 });
    const clean = cleanWebOrder(payload), d = this.read(); if (d.items.filter(x => x.status === 'new').length >= 200) throw Object.assign(new Error('We cannot take more orders right now. Please WhatsApp us.'), { code: 503 });
    const dup = d.items.find(x => x.order.localId && x.order.localId === clean.order.localId && eDigits(x.customer.phone) === eDigits(clean.customer.phone)); if (dup) return dup;   // the same order sent twice (a retry) is one order
    d.n++; const rec = { id: 'WO-' + String(d.n).padStart(4, '0'), createdAt: new Date(this.now()).toISOString(), status: 'new', ...clean, check: checkAgainstShop(clean.order, db), notes: [] }; d.items.unshift(rec); this.write(d); return rec;
  }
  list() { return this.read().items; }
  mark(id, fields) { const d = this.read(), r = d.items.find(x => x.id === String(id)); if (!r) return null; Object.assign(r, fields); this.write(d); return r; }   // internal bookkeeping (order-flow steps already done)
  update(id, { status, note, orderId }) {
    const d = this.read(), r = d.items.find(x => x.id === String(id)); if (!r) throw Object.assign(new Error('Order not found.'), { code: 404 });
    if (status !== undefined) { if (!['new', 'accepted', 'declined'].includes(status)) throw Object.assign(new Error('Unknown status.'), { code: 422 }); r.status = status; r.decidedAt = new Date(this.now()).toISOString(); }
    if (orderId) r.orderId = s(orderId, 40); if (note) r.notes.push({ at: new Date(this.now()).toISOString(), text: s(note, 400) }); this.write(d); return r;
  }
  eraseByPhone(phone) { const k = eDigits(phone); if (k.length < 7) return 0; const d = this.read(); let n = 0; for (const r of d.items) if (eDigits(r.customer.phone) === k && r.customer.name !== '(erased)') { r.customer = { ...r.customer, name: '(erased)', phone: '', email: '', addr: {}, nominee: null }; r.order.shippingAddress = {}; r.order.billTo = {}; r.order.instructions = ''; r.order.gift = null; r.consentLog = []; n++; } if (n) this.write(d); return n; }
  accessByPhone(phone) { const k = eDigits(phone); return this.read().items.filter(r => eDigits(r.customer.phone) === k); }
  // decided orders keep their personal details for the same period as invoices, then are blanked
  sweep(years = 6) { const d = this.read(), cut = this.now() - years * 365.25 * DAY; let n = 0; for (const r of d.items) if (r.status !== 'new' && Date.parse(r.createdAt) < cut && r.customer.name !== '(erased)') { r.customer = { ...r.customer, name: '(erased)', phone: '', email: '', addr: {}, nominee: null }; r.order.shippingAddress = {}; r.order.billTo = {}; r.order.instructions = ''; r.order.gift = null; r.consentLog = []; n++; } if (n) this.write(d); return n; }
}
