// First-party, privacy-friendly website counting. No cookies, no names, no phone numbers, no IP address is stored.
// A visitor is counted once a day by a one-way hash of (a random salt that exists only for that day + IP + browser);
// when the day ends the salt and the hashes are deleted, so a person can never be followed from one day to the next.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const IST = 330 * 60_000, dayOf = t => new Date(t + IST).toISOString().slice(0, 10);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch/i;
export const PAGES = ['home', 'shop', 'product', 'cart', 'checkout', 'journal', 'care', 'faq', 'account', 'favourites', 'other'];
const TYPES = ['view', 'product', 'cart', 'checkout', 'wa'];
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

export function sourceOf(ref, utm, ownHost = '') {
  const u = String(utm || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24); if (u) return /^(ig|instagram)/.test(u) ? 'instagram' : /^(wa|whatsapp)/.test(u) ? 'whatsapp' : /^(fb|facebook)/.test(u) ? 'facebook' : /^google/.test(u) ? 'google' : u;
  let h = ''; try { h = new URL(ref).hostname.toLowerCase(); } catch { return 'direct'; } if (!h || (ownHost && h === ownHost)) return 'direct';
  return /instagram\.com$/.test(h) ? 'instagram' : /(^|\.)(wa\.me|whatsapp\.com)$/.test(h) ? 'whatsapp' : /(^|\.)(facebook\.com|fb\.com|fb\.me|l\.facebook\.com)$/.test(h) ? 'facebook' : /(^|\.)google\./.test(h) ? 'google' : /(^|\.)(bing|duckduckgo|yahoo)\./.test(h) ? 'search' : 'other';
}

export class Analytics {
  constructor(dir, now = () => Date.now()) {
    this.file = path.join(dir, 'analytics.json'); this.now = now; this.s = { days: {}, ig: {}, done: [] }; this.seen = new Map(); this.salt = { day: '', v: '' }; this.dirty = false; this.rate = new Map();
    try { this.s = { days: {}, ig: {}, done: [], ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; } catch { /* first run */ }
  }
  save() { if (!this.dirty) return; this.dirty = false; const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(this.s), { mode: 0o600 }); fs.renameSync(t, this.file); }
  day(t = this.now()) { const k = dayOf(t); return this.s.days[k] || (this.s.days[k] = { pv: 0, visitors: 0, ev: {}, page: {}, product: {}, src: {}, dev: {} }); }
  saltFor(k) { if (this.salt.day !== k) { this.salt = { day: k, v: crypto.randomBytes(16).toString('hex') }; this.seen = new Map(); } return this.salt.v; }
  limited(ip) { const t = this.now(), a = (this.rate.get(ip) || []).filter(x => t - x < 60_000); a.push(t); this.rate.set(ip, a); if (this.rate.size > 5000) this.rate.clear(); return a.length > 90; }
  // returns true when counted
  hit({ type, page, productId, ref, utm, mobile, ua, ip, host }) {
    if (!TYPES.includes(type) || BOT.test(String(ua || '')) || !ua) return false; if (this.limited(String(ip))) return false;
    const k = dayOf(this.now()), d = this.day(), salt = this.saltFor(k), h = crypto.createHash('sha256').update(salt + '|' + ip + '|' + String(ua).slice(0, 200)).digest('hex').slice(0, 16), first = !this.seen.has(h);
    if (first) { this.seen.set(h, 1); d.visitors++; bump(d.src, sourceOf(ref, utm, host)); bump(d.dev, mobile ? 'mobile' : 'desktop'); }
    if (type === 'view') { d.pv++; bump(d.page, PAGES.includes(page) ? page : 'other'); } else bump(d.ev, type);
    if (type === 'product' && /^[\w-]{1,40}$/.test(String(productId || ''))) bump(d.product, productId);
    this.dirty = true; this.prune(); return true;
  }
  prune() { const keys = Object.keys(this.s.days).sort(); while (keys.length > 420) delete this.s.days[keys.shift()]; }
  range(fromYmd, toYmd) {
    const out = { visitors: 0, pv: 0, ev: {}, page: {}, product: {}, src: {}, dev: {}, days: 0 };
    for (const [k, d] of Object.entries(this.s.days)) { if (k < fromYmd || k > toYmd) continue; out.days++; out.visitors += d.visitors; out.pv += d.pv; for (const f of ['ev', 'page', 'product', 'src', 'dev']) for (const [a, n] of Object.entries(d[f] || {})) bump(out[f], a, n); }
    return out;
  }
  // Instagram numbers we keep ourselves, so growth can be shown even when Instagram only gives "now"
  snapshotIg(snap) { const k = dayOf(this.now()); this.s.ig[k] = { followers: snap.followers, follows: snap.follows, media: snap.media }; this.dirty = true; const keys = Object.keys(this.s.ig).sort(); while (keys.length > 800) delete this.s.ig[keys.shift()]; }
  followersOn(ymd) { const keys = Object.keys(this.s.ig).filter(k => k <= ymd).sort(); return keys.length ? this.s.ig[keys[keys.length - 1]].followers : null; }
  // suggestions the owner marked as done, with the number at the time, so the next report can say whether it moved
  markDone(rec) { this.s.done = [...this.s.done.filter(x => x.id !== rec.id), { ...rec, at: this.now() }].slice(-40); this.dirty = true; }
  doneList() { return this.s.done; }
}
export { dayOf as istDay };
