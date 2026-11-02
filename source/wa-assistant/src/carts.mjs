// Abandoned-cart reminders. Strict rules (all enforced here and tested):
//  - only for customers who ticked the separate "cart reminder" consent (proof is stored with the cart)
//  - never to anyone who sent STOP; never while the customer is chatting or a person has taken over
//  - at most 2 per cart (CART_REMINDER_MAX_PER_7_DAYS per customer per week), not at night (IST), none after 72 h
//  - never for sold-out items; stops the moment the customer orders or empties the cart
//  - each reminder is claimed in the database BEFORE it is sent, so a restart or double run can never send twice
const DAY = 24 * 3600 * 1000;
const istHour = t => new Date(t + 330 * 60000).getUTCHours();

export const digits = p => String(p || '').replace(/\D/g, '');
export const validPhone = p => /^\d{10,15}$/.test(digits(p));

export function sameItems(a, b) {
  const k = x => JSON.stringify((x || []).map(i => [i.id, i.qty]).sort());
  return k(a) === k(b);
}

// Customer cart arrives from the store. `items` is re-validated against the catalogue; prices are never trusted.
export function syncCart({ store, catalogue, phone, name, items, consent, ordered, now = Date.now() }) {
  const key = digits(phone);
  const clean = [];
  for (const it of Array.isArray(items) ? items.slice(0, 20) : []) {
    const p = catalogue.find(it?.id); const q = Math.min(Math.max(parseInt(it?.qty, 10) || 0, 0), 5);
    if (p && q > 0) clean.push({ id: p.id, qty: q });
  }
  const prev = store.s.carts[key];
  const c = prev || { phone: key, name: '', items: [], updatedAt: now, firstSeenAt: now, consent: { granted: false }, ordered: null, reminders: [] };
  if (name && !c.name) c.name = String(name).slice(0, 60);
  // consent: the store sends its own record; a withdrawal always wins immediately
  if (consent && consent.granted === false) { c.items = []; c.name = ''; } // withdrawal: delete what we hold
  if (consent && typeof consent.granted === 'boolean') c.consent = { granted: consent.granted, at: String(consent.at || new Date(now).toISOString()).slice(0, 40), version: String(consent.version || '').slice(0, 40), recordedAt: now };
  if (ordered) {
    const recent = c.reminders.filter(r => r.status !== 'failed' && now - r.at < 3 * DAY);
    c.ordered = { at: now, recovered: recent.length > 0 }; c.items = []; c.updatedAt = now; c.firstSeenAt = now;
  } else if (!c.consent.granted) {
    c.items = []; // data minimisation: without consent we keep no cart contents at all
  } else if (!sameItems(c.items, clean)) {
    if (!c.items.length && clean.length) c.firstSeenAt = now; // a new shopping episode
    c.items = clean; c.updatedAt = now;
  }
  store.s.carts[key] = c; store.save(); return c;
}

function itemSummary(c, catalogue) {
  const names = c.items.map(i => catalogue.find(i.id)?.name).filter(Boolean);
  const first = (names[0] || 'your saree').slice(0, 60);
  return names.length > 1 ? `${first} and ${names.length - 1} more` : first;
}

// Why a cart is (not) due right now. Pure function: easy to test.
export function dueReminder({ cfg, store, catalogue, c, now }) {
  const rc = cfg.cart;
  if (!rc.enabled || !store.s.cartSettings.enabled) return { skip: 'off' };
  if (!c.consent?.granted) return { skip: 'no-consent' };
  if (store.isOptedOut(c.phone)) return { skip: 'opted-out' };
  const live = c.items.filter(i => { const p = catalogue.find(i.id); return p && p.stock > 0; });
  if (!live.length) return { skip: 'nothing-in-stock' };
  if (c.ordered && c.ordered.at >= c.updatedAt) return { skip: 'ordered' };
  // a failed send (template not approved, number not on WhatsApp...) is retried once after an hour, then given up
  const failed = c.reminders.filter(r => r.status === 'failed' && r.at >= c.firstSeenAt);
  if (failed.length >= 2) return { skip: 'failing' };
  if (failed.length && now - failed[failed.length - 1].at < 60 * 60000) return { skip: 'retry-wait' };
  const sent = c.reminders.filter(r => r.status !== 'failed');
  const episode = sent.filter(r => r.at >= c.firstSeenAt);
  const n = episode.length;
  if (n >= rc.delaysMin.length) return { skip: 'done' };
  if (c.reminders.filter(r => r.status !== 'failed' && now - r.at < 7 * DAY).length >= rc.maxPer7Days) return { skip: 'weekly-cap' };
  if (now - c.updatedAt > rc.expireAfterHours * 3600 * 1000) return { skip: 'expired' };
  const idleDue = c.updatedAt + rc.delaysMin[0] * 60000;
  const due = n === 0 ? idleDue : Math.max(episode[n - 1].at + rc.delaysMin[1] * 60000, idleDue);
  if (now < due) return { skip: 'not-yet', due };
  const h = istHour(now);
  if (rc.quietFromHour > rc.quietToHour ? (h >= rc.quietFromHour || h < rc.quietToHour) : (h >= rc.quietFromHour && h < rc.quietToHour)) return { skip: 'quiet-hours' };
  const conv = store.s.conversations[c.phone];
  if (conv && (conv.status === 'human' || now - (conv.lastInboundAt || 0) < rc.activeChatMin * 60000)) return { skip: 'chatting' };
  return { send: n + 1, live };
}

let running = false;
// One pass over all carts. Returns what it did (used by tests and the admin "run now" button).
export async function runReminders({ cfg, store, wa, catalogue, now = Date.now() }) {
  if (running) return { busy: true }; running = true;
  const done = [];
  try {
    for (const c of Object.values(store.s.carts)) {
      const d = dueReminder({ cfg, store, catalogue, c, now });
      if (!d.send) continue;
      // CLAIM FIRST (persisted), then send. A crash after this point can never cause a second message.
      const rec = { n: d.send, at: now, status: 'sending', template: cfg.cart.templates[d.send - 1] }; c.reminders.push(rec); store.flush();
      const live = { ...c, items: d.live };
      const first = (c.name || '').trim().split(/\s+/)[0] || 'there';
      const link = (cfg.siteUrl || catalogue.shop.siteUrl || '') ? `${(cfg.siteUrl || catalogue.shop.siteUrl).replace(/\/+$/, '')}/#/cart` : '';
      try {
        await wa.sendTemplate(c.phone, rec.template, [first, itemSummary(live, catalogue), link || catalogue.shop.name || 'our shop'], cfg.cart.templateLang);
        rec.status = 'sent';
      } catch (e) { rec.status = 'failed'; rec.error = String(e.message).slice(0, 200); console.error('[cart-reminder]', c.phone, e.message); }
      store.flush(); done.push({ phone: c.phone, n: rec.n, status: rec.status });
    }
  } finally { running = false; }
  return { done };
}

export function cartStats(store, catalogue, now = Date.now()) {
  const carts = Object.values(store.s.carts).filter(c => !c.phone.startsWith('test-'));
  const sent = carts.flatMap(c => c.reminders.filter(r => r.status === 'sent'));
  return {
    waiting: carts.filter(c => c.consent?.granted && c.items.length).length,
    remindersSent: sent.length, failed: carts.flatMap(c => c.reminders.filter(r => r.status === 'failed')).length,
    recovered: carts.filter(c => c.ordered?.recovered).length,
    list: carts.filter(c => c.items.length || c.reminders.length).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100).map(c => ({
      phone: c.phone, name: c.name, consent: !!c.consent?.granted, updatedAt: c.updatedAt, ordered: c.ordered, reminders: c.reminders.map(r => ({ n: r.n, at: r.at, status: r.status })),
      items: c.items.map(i => { const p = catalogue.find(i.id); return p ? { name: p.name, qty: i.qty, price: p.price, stock: p.stock } : null; }).filter(Boolean) })),
  };
}
