// GENERATED from shared/erase-core.js by tools/sync-shared.py. Do not edit here.
// Erasing one customer from the shop data (DPDP Act). The same code runs in the owner app and on the server (so a restored backup
// can never bring an erased customer back). Orders with a tax invoice inside the legal period keep only name and address, with a
// "keep until" date; everything else about the person is removed or blanked.
const ANON = '(erased)';
const eDigits = p => String(p || '').replace(/\D/g, '').slice(-10);
const ePlusYears = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCFullYear(d.getUTCFullYear() + n); return d.toISOString().slice(0, 10); };
function anonOrderCore(o) {
  o.customer = ANON; o.phone = ''; o.email = ''; o.userId = ''; o.shippingAddress = {}; o.billTo = {}; o.addressHistory = []; o.instructions = '';
  if (o.gift) o.gift = { wrap: !!o.gift.wrap, hideSender: !!o.gift.hideSender, fee: o.gift.fee || 0 };
  o.legalHold = false; delete o.retainUntil; o.anonymisedAt = new Date().toISOString();
}
// names and numbers inside the activity log ("Priya signed in") are replaced too
function scrubLogsCore(db, u) {
  const needles = [u.phone, eDigits(u.phone), u.name].map(x => String(x || '')).filter(x => x.replace(/\D/g, '').length >= 7 || (x.length >= 4 && !/^\d+$/.test(x)));
  if (!needles.length) return 0; let n = 0;
  for (const l of db.logs || []) for (const k of ['product', 'reason']) { if (typeof l[k] !== 'string') continue; let v = l[k]; for (const nd of needles) if (v.includes(nd)) v = v.split(nd).join(ANON); if (v !== l[k]) { l[k] = v; n++; } }
  return n;
}
function eraseCustomerCore(db, u, today) {
  const id = u.id, ph = eDigits(u.phone), kept = [], gone = [], mine = o => (o.userId && o.userId === id) || (ph.length >= 7 && eDigits(o.phone) === ph);
  db.orders = db.orders || []; db.invoices = db.invoices || []; db.reviews = db.reviews || []; db.stockAlerts = db.stockAlerts || []; db.similarAlerts = db.similarAlerts || []; db.outbox = db.outbox || []; db.consentLog = db.consentLog || []; db.users = db.users || [];
  for (const o of db.orders.filter(mine)) {
    if (o.invoiceGenerated && ePlusYears(o.date, 6) > today) { o.phone = ''; o.email = ''; o.userId = ''; o.addressHistory = []; o.instructions = ''; if (o.gift) o.gift = { wrap: !!o.gift.wrap, hideSender: !!o.gift.hideSender, fee: o.gift.fee || 0 }; o.legalHold = true; o.retainUntil = ePlusYears(o.date, 6); kept.push(o.id); }
    else { anonOrderCore(o); gone.push(o.id); }
  }
  for (const i of db.invoices) { const o = db.orders.find(x => x.id === i.orderId); if (o && (o.legalHold || o.anonymisedAt)) { i.phone = ''; i.email = ''; if (o.anonymisedAt) i.customer = ANON; } }
  const nr = db.reviews.length; db.reviews = db.reviews.filter(r => r.userId !== id);           // a review's photos go with it
  const gA = new Set([...db.stockAlerts, ...db.similarAlerts].filter(a => a.userId === id).map(a => a.id)); db.stockAlerts = db.stockAlerts.filter(a => a.userId !== id); db.similarAlerts = db.similarAlerts.filter(a => a.userId !== id); db.outbox = db.outbox.filter(m => m.userId !== id && !gA.has(m.alertId));
  db.consentLog.forEach(x => { if (x.userId === id) x.phone = ''; });                           // the proof of what was agreed stays, without the number
  const logs = scrubLogsCore(db, u); db.users = db.users.filter(x => x.id !== id);
  return { phone: u.phone, keptForLaw: kept, anonymised: gone, reviewsRemoved: nr - db.reviews.length, logLinesCleaned: logs };
}
function anonymiseExpiredCore(db, today) {
  const list = (db.orders || []).filter(o => o.legalHold && o.retainUntil && o.retainUntil <= today);
  list.forEach(o => { anonOrderCore(o); const i = (db.invoices || []).find(x => x.orderId === o.id); if (i) { i.customer = ANON; i.phone = ''; i.email = ''; } }); return list.length;
}

export { ANON, eDigits, anonOrderCore, scrubLogsCore, eraseCustomerCore, anonymiseExpiredCore };
