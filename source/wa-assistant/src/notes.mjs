// "Notes from the loom": people who typed their email on the home page to receive an occasional email from the shop.
// Only the address, the time and the exact wording they agreed to are kept. Nothing is ever sent from here: the owner reads the
// list in the owner app and writes to these people herself. A person can ask to be removed at any time (the owner uses Remove).
import fs from 'node:fs';
import path from 'node:path';

export const NOTES_CONSENT = 'I agree to receive occasional notes from Anitha Pemmasani by email. I can ask to stop at any time.';
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
export const cleanEmail = v => { const e = String(v == null ? '' : v).trim().toLowerCase(); return e.length <= 120 && EMAIL.test(e) ? e : ''; };

export class Notes {
  constructor(dir, now = () => Date.now()) { this.file = path.join(dir, 'notes-signups.json'); this.now = now; this.rate = new Map(); }
  read() { try { const d = JSON.parse(fs.readFileSync(this.file, 'utf8')); return Array.isArray(d.items) ? d : { items: [] }; } catch { return { items: [] }; } }
  write(d) { const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(d), { mode: 0o600 }); fs.renameSync(t, this.file); }
  limited(ip) { const t = this.now(), a = (this.rate.get(ip) || []).filter(x => t - x < 3600_000); a.push(t); this.rate.set(ip, a); if (this.rate.size > 3000) this.rate.clear(); return a.length > 6; }
  // returns { ok: true } for a new person AND for someone already on the list (the page never tells a stranger who is subscribed)
  add({ email, consent }, ip) {
    if (this.limited(ip || 'x')) throw Object.assign(new Error('Too many tries from this device. Please try again later.'), { code: 429 });
    const e = cleanEmail(email); if (!e) throw Object.assign(new Error('Please enter a valid email address.'), { code: 422 });
    if (consent !== true) throw Object.assign(new Error('Please tick the box to say you would like to receive our notes.'), { code: 422 });
    const d = this.read(); if (d.items.length >= 20000) throw Object.assign(new Error('We cannot take more sign-ups right now.'), { code: 503 });
    if (!d.items.some(x => x.email === e)) { d.items.unshift({ email: e, at: new Date(this.now()).toISOString(), consent: NOTES_CONSENT }); this.write(d); }
    return { ok: true };
  }
  list() { return this.read().items; }
  remove(email) { const e = cleanEmail(email), d = this.read(), n = d.items.length; d.items = d.items.filter(x => x.email !== e); if (d.items.length !== n) this.write(d); return n - d.items.length; }
}
