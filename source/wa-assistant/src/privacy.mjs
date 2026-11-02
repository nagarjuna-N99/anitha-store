// Privacy rights and duties (India's DPDP Act 2023): rights requests from customers, the breach register, and the
// clean-up of personal data the server holds (WhatsApp chats, carts, order contact details). The shop data that the owner
// app holds (customers, orders, invoices) is handled in the owner app itself; this module covers the server side.
import fs from 'node:fs';
import path from 'node:path';

const DAY = 86400_000, D10 = p => String(p || '').replace(/\D/g, '').slice(-10);
export const RIGHT_TYPES = { access: 'See my data', correct: 'Correct my data', erase: 'Erase my data', withdraw: 'Withdraw my consent', nominate: 'Nominate someone', grievance: 'Complaint or question' };
export const TICKET_DAYS = 30;          // what we promise; the law allows longer, we do not use it
export const BOARD_HOURS = 72;          // report a breach to the Data Protection Board within 72 hours of finding it
const PII_KEYS = ['customerName', 'name', 'address', 'street', 'city', 'pincode', 'email', 'phone', 'shipTo', 'contact'];

export class Privacy {
  constructor(dir, now = () => Date.now()) { this.dir = dir; this.now = now; this.f = { rights: path.join(dir, 'rights.json'), breaches: path.join(dir, 'breaches.json'), state: path.join(dir, 'privacy-state.json') }; this.rate = new Map(); }
  read(k, d) { try { return JSON.parse(fs.readFileSync(this.f[k], 'utf8')); } catch { return d; } }
  write(k, v) { const t = this.f[k] + '.tmp'; fs.writeFileSync(t, JSON.stringify(v), { mode: 0o600 }); fs.renameSync(t, this.f[k]); }
  // ---- rights requests ----
  limited(ip) { const t = this.now(), a = (this.rate.get(ip) || []).filter(x => t - x < 3600_000); a.push(t); this.rate.set(ip, a); if (this.rate.size > 3000) this.rate.clear(); return a.length > 5; }
  addTicket({ type, name, contact, message }, ip = '') {
    if (!RIGHT_TYPES[type]) throw Object.assign(new Error('Choose what you would like to do.'), { code: 422 });
    name = String(name || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 80); contact = String(contact || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120); message = String(message || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 1500);
    if (!name) throw Object.assign(new Error('Please tell us your name.'), { code: 422 }); if (!(contact.includes('@') && contact.length >= 5) && contact.replace(/\D/g, '').length < 7) throw Object.assign(new Error('Please give a phone number or e-mail address where we can reach you.'), { code: 422 });
    if (this.limited(ip || 'x')) throw Object.assign(new Error('Too many requests from this device. Please try again in an hour, or contact us directly.'), { code: 429 });
    const all = this.read('rights', { n: 0, tickets: [] }); if (all.tickets.filter(t => t.status === 'new').length >= 300) throw Object.assign(new Error('We cannot take more requests right now. Please contact us directly.'), { code: 503 });
    all.n++; const at = this.now(), t = { id: 'PR-' + String(all.n).padStart(4, '0'), type, name, contact, message, status: 'new', createdAt: new Date(at).toISOString(), due: new Date(at + TICKET_DAYS * DAY).toISOString(), notes: [] }; all.tickets.unshift(t); this.write('rights', all); return t;
  }
  tickets() { return this.read('rights', { tickets: [] }).tickets; }
  updateTicket(id, { status, note }) {
    const all = this.read('rights', { n: 0, tickets: [] }), t = all.tickets.find(x => x.id === String(id)); if (!t) throw Object.assign(new Error('Request not found.'), { code: 404 });
    if (status !== undefined) { if (!['new', 'working', 'done', 'refused'].includes(status)) throw Object.assign(new Error('Unknown status.'), { code: 422 }); t.status = status; if (status === 'done' || status === 'refused') t.closedAt = new Date(this.now()).toISOString(); }
    if (note) t.notes.push({ at: new Date(this.now()).toISOString(), text: String(note).slice(0, 500) }); this.write('rights', all); return t;
  }
  // ---- breach register ----
  breaches() { return this.read('breaches', { n: 0, items: [] }).items; }
  addBreach({ what, dataTypes, affected, detectedAt, cause }) {
    what = String(what || '').trim().slice(0, 600); if (what.length < 5) throw Object.assign(new Error('Describe what happened.'), { code: 422 });
    const all = this.read('breaches', { n: 0, items: [] }); all.n++; const det = Number.isFinite(Date.parse(detectedAt)) ? Date.parse(detectedAt) : this.now();
    const b = { id: 'BR-' + String(all.n).padStart(3, '0'), what, cause: String(cause || '').slice(0, 400), dataTypes: (Array.isArray(dataTypes) ? dataTypes : []).slice(0, 10).map(x => String(x).slice(0, 40)), affected: Number.isFinite(+affected) ? Math.max(0, +affected) : null, detectedAt: new Date(det).toISOString(), boardDue: new Date(det + BOARD_HOURS * 3600_000).toISOString(), principalsNotifiedAt: null, boardReportedAt: null, status: 'open', steps: [] }; all.items.unshift(b); this.write('breaches', all); return b;
  }
  updateBreach(id, o) {
    const all = this.read('breaches', { n: 0, items: [] }), b = all.items.find(x => x.id === String(id)); if (!b) throw Object.assign(new Error('Not found.'), { code: 404 }); const at = new Date(this.now()).toISOString();
    if (o.principalsNotified) b.principalsNotifiedAt = at; if (o.boardReported) b.boardReportedAt = at; if (o.step) b.steps.push({ at, text: String(o.step).slice(0, 400) }); if (o.close) b.status = 'closed'; if (o.reopen) b.status = 'open'; this.write('breaches', all); return b;
  }
  // ---- the server's own store ----
  static accessFromStore(store, phone) {
    const d = D10(phone); if (d.length < 7) return null; const conv = Object.values(store.s.conversations).find(c => D10(c.phone) === d), cart = Object.values(store.s.carts).find(c => D10(c.phone) === d);
    return { whatsappChat: conv ? { name: conv.name, language: conv.lang, messages: (conv.log || []).map(m => ({ from: m.dir === 'out' ? 'shop' : 'customer', text: m.text, at: new Date(m.at).toISOString() })) } : null, cart: cart ? { items: cart.items, updatedAt: new Date(cart.updatedAt).toISOString() } : null, orders: store.s.orders.filter(o => D10(o.phone) === d).map(o => ({ id: o.id, status: o.status, createdAt: new Date(o.createdAt).toISOString(), customerName: o.customerName, items: o.items, total: o.total })), doNotMessage: !!Object.keys(store.s.optOut).find(k => D10(k) === d) };
  }
  static eraseFromStore(store, phone) {
    const d = D10(phone); if (d.length < 7) return null; const r = { chats: 0, carts: 0, orders: 0, handoffs: 0 };
    for (const k of Object.keys(store.s.conversations)) if (D10(store.s.conversations[k].phone || k) === d) { delete store.s.conversations[k]; r.chats++; }
    for (const k of Object.keys(store.s.carts)) if (D10(store.s.carts[k].phone || k) === d) { delete store.s.carts[k]; r.carts++; }
    store.s.handoffs = store.s.handoffs.filter(h => { const hit = D10(h.phone) === d; if (hit) r.handoffs++; return !hit; });
    for (const o of store.s.orders) if (D10(o.phone) === d && o.phone !== 'erased') { for (const k of PII_KEYS) if (k in o) o[k] = k === 'shipTo' ? null : 'erased'; r.orders++; }
    store.save(); return r;     // the do-not-message entry (if any) is kept on purpose: it is what stops us writing to someone who asked us to stop
  }
  // the daily clean-up: old chats, old carts, old order contact details
  static sweepStore(store, { chatDays, cartDays, orderYears }, now = Date.now()) {
    const r = { chats: 0, carts: 0, orders: 0 }, cc = now - chatDays * DAY, kc = now - cartDays * DAY, oc = now - orderYears * 365.25 * DAY;
    for (const k of Object.keys(store.s.conversations)) { const c = store.s.conversations[k]; if (c.phone && String(c.phone).startsWith('test-')) continue; if ((c.lastActivityAt || 0) < cc && c.status !== 'human') { delete store.s.conversations[k]; r.chats++; } else if (c.log && c.log.length) c.log = c.log.filter(m => m.at >= cc); }
    for (const k of Object.keys(store.s.carts)) if ((store.s.carts[k].updatedAt || 0) < kc) { delete store.s.carts[k]; r.carts++; }
    for (const o of store.s.orders) if ((o.createdAt || 0) < oc && o.phone && o.phone !== 'erased') { for (const k of PII_KEYS) if (k in o) o[k] = k === 'shipTo' ? null : 'erased'; r.orders++; }
    if (r.chats || r.carts || r.orders) store.save(); return r;
  }
  state() { return this.read('state', {}); }
  saveState(o) { this.write('state', o); }
}
// plain-words notices the owner can send after a breach (the owner checks and edits them)
export function breachNotices(b, shop = {}) {
  const name = shop.businessName || 'our shop', contact = [shop.phone, shop.email].filter(Boolean).join(' / ');
  return { customer: `Important notice from ${name}: on ${b.detectedAt.slice(0, 10)} we found that ${b.what.replace(/[.\s]+$/, '')}. The details involved: ${b.dataTypes.length ? b.dataTypes.join(', ') : 'to be confirmed'}. What we have done: ${(b.steps.map(s => s.text).join('; ')) || 'we are securing the system and investigating'}. What you can do: be careful with unexpected calls or messages that mention your orders, and do not share codes or passwords with anyone. For questions contact us on ${contact || 'our website'}. We are sorry this happened.`, board: [`Report to the Data Protection Board of India (due within ${BOARD_HOURS} hours of ${b.detectedAt})`, `1. What happened, when and where: ${b.what}`, `2. Likely cause: ${b.cause || '(to be completed)'}`, `3. Kinds of personal data involved: ${b.dataTypes.join(', ') || '(to be completed)'}`, `4. People affected: ${b.affected == null ? '(to be completed)' : b.affected}`, `5. Steps taken and planned: ${b.steps.map(s => s.text).join('; ') || '(to be completed)'}`, `6. Whether the people affected have been told: ${b.principalsNotifiedAt ? 'yes, ' + b.principalsNotifiedAt.slice(0, 10) : 'not yet'}`, `7. Contact for the Board: ${contact || '(add)'}`].join('\n') };
}
