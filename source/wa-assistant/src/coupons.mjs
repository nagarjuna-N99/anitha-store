// Discount codes for orders taken in the chat. The server alone decides whether a code is valid and how much it takes off:
// the AI can pass a code on, but it can never set, invent or change an amount.
const LIVE = ['new', 'payment_pending', 'paid', 'shipped'];   // order states that "use up" a code (cancelled / expired give it back)

export const normCode = c => String(c || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
export const last10 = p => String(p || '').replace(/\D/g, '').slice(-10);
const fmt = n => '₹' + Number(n).toLocaleString('en-IN');

export function discountFor(coupon, subtotal) {
  const d = coupon.type === 'flat' ? coupon.discount : Math.round(subtotal * coupon.discount / 100);
  return Math.max(0, Math.min(Math.round(d), subtotal));
}

// How many times a code has been used: this server's orders + website orders reported by the store (website orders only; WhatsApp ones are already here).
function usage(store, catalogue, code) {
  const mine = store.s.orders.filter(o => o.coupon && o.coupon.code === code && LIVE.includes(o.status));
  const site = catalogue.data.couponUsage?.[code] || { total: 0, phones: [] };
  return { total: mine.length + (site.total || 0), phones: new Set([...mine.map(o => last10(o.phone)), ...(site.phones || [])]) };
}
function isFirstOrder(store, catalogue, phone) {
  const p = last10(phone);
  return !store.s.orders.some(o => last10(o.phone) === p && LIVE.includes(o.status)) && !(catalogue.data.pastBuyers || []).includes(p);
}

// Returns { ok:true, coupon, discount } or { ok:false, reason, hidden? }. `hidden` reasons are shown to the customer as a generic "not valid".
export function validateCoupon({ catalogue, store, code, phone, subtotal, now = Date.now() }) {
  const c = (catalogue.data.coupons || []).find(x => x.code === normCode(code));
  if (!c || !c.active) return { ok: false, reason: 'This code is not valid.', hidden: true };
  if (c.expiresAt && Date.parse(c.expiresAt + 'T23:59:59+05:30') < now) return { ok: false, reason: 'This code has expired.' };
  if (c.channel === 'store') return { ok: false, reason: 'This code works only on the website, not on WhatsApp orders.' };
  if (c.minOrder && subtotal < c.minOrder) return { ok: false, reason: `This code needs a minimum order of ${fmt(c.minOrder)} (you are ${fmt(c.minOrder - subtotal)} short).` };
  const u = usage(store, catalogue, c.code);
  if (c.maxUses && u.total >= c.maxUses) return { ok: false, reason: 'This code has been fully used.' };
  if (c.oncePerCustomer && u.phones.has(last10(phone))) return { ok: false, reason: 'This code can be used only once per customer.' };
  if (c.firstOrderOnly && !isFirstOrder(store, catalogue, phone)) return { ok: false, reason: 'This code is for first orders only.' };
  const discount = discountFor(c, subtotal);
  if (discount <= 0) return { ok: false, reason: 'This code gives no discount on this order.' };
  return { ok: true, coupon: { code: c.code, type: c.type, discount: c.discount, description: c.description || '' }, discount };
}

// Guessing protection: 6 wrong codes per customer per hour, then the assistant sends them to the owner.
export function triesLeft(store, phone, now = Date.now()) {
  store.s.couponTries = store.s.couponTries || {};
  const arr = (store.s.couponTries[phone] || []).filter(t => now - t < 3600 * 1000); store.s.couponTries[phone] = arr; return Math.max(0, 6 - arr.length);
}
export function noteFailure(store, phone, now = Date.now()) { (store.s.couponTries[phone] ||= []).push(now); store.save(); }

export function publicOffers(catalogue, now = Date.now()) {
  return (catalogue.data.coupons || []).filter(c => c.active && c.announce && c.channel !== 'store' && !(c.expiresAt && Date.parse(c.expiresAt + 'T23:59:59+05:30') < now))
    .map(c => ({ code: c.code, offer: c.description || (c.type === 'flat' ? `${fmt(c.discount)} off` : `${c.discount}% off`), minimum_order_inr: c.minOrder || undefined, valid_until: c.expiresAt || undefined }));
}
