// The shop's data, held by the server (not by anyone's browser). The owner's admin app loads and saves it; the public
// website only ever sees `publicView()`. Saves are merged field by field against the version the admin started from, so a
// change made elsewhere in the meantime (for example a new order or a stock change) is never overwritten by a stale save.
import fs from 'node:fs';
import { dbForWrite } from './roles.mjs';
import path from 'node:path';
import zlib from 'node:zlib';

const j = v => JSON.stringify(v);
const same = (a, b) => j(a) === j(b);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const keyOf = x => (isObj(x) ? (x.id ?? x.code ?? x.sku ?? null) : null);

export function mergeRecord(base, mine, theirs) {
  const out = {}, keys = new Set([...Object.keys(base || {}), ...Object.keys(mine || {}), ...Object.keys(theirs || {})]);
  for (const k of keys) { const b = base ? base[k] : undefined, m = mine ? mine[k] : undefined, t = theirs ? theirs[k] : undefined; const v = same(m, b) ? t : m; if (v !== undefined) out[k] = v; }
  return out;
}
export function mergeList(base, mine, theirs) {
  base = Array.isArray(base) ? base : []; mine = Array.isArray(mine) ? mine : []; theirs = Array.isArray(theirs) ? theirs : [];
  const all = [...base, ...mine, ...theirs];
  if (all.some(x => !isObj(x) || keyOf(x) === null)) return same(mine, base) ? theirs : mine;          // plain lists (names…): whoever changed it wins, admin first
  const idx = arr => new Map(arr.map(x => [String(keyOf(x)), x])), B = idx(base), M = idx(mine), T = idx(theirs), keys = new Set([...B.keys(), ...M.keys(), ...T.keys()]), res = new Map();
  for (const k of keys) {
    const b = B.get(k), m = M.get(k), t = T.get(k);
    if (!b) { res.set(k, m && t ? mergeRecord({}, m, t) : (m || t)); continue; }          // added by someone
    if (!m) continue;                                                                    // removed by the admin
    if (!t) { if (!same(m, b)) res.set(k, m); continue; }                                // removed elsewhere, kept only if the admin edited it
    res.set(k, mergeRecord(b, m, t));
  }
  const order = same(mine.map(x => keyOf(x)), base.map(x => keyOf(x))) ? theirs.map(x => String(keyOf(x))) : mine.map(x => String(keyOf(x)));
  const out = []; for (const k of order) if (res.has(k)) { out.push(res.get(k)); res.delete(k); } for (const v of res.values()) out.push(v); return out;
}
export function merge3(base, mine, theirs) {
  const out = {}, keys = new Set([...Object.keys(base || {}), ...Object.keys(mine || {}), ...Object.keys(theirs || {})]);
  for (const k of keys) {
    if (k === 'version') continue; const b = base ? base[k] : undefined, m = mine ? mine[k] : undefined, t = theirs ? theirs[k] : undefined;
    if (Array.isArray(b ?? m ?? t)) out[k] = mergeList(b, m, t); else if (isObj(b ?? m ?? t)) out[k] = (k === 'home') ? (same(m, b) ? t : m) : mergeRecord(b, m, t); else { const v = same(m, b) ? t : m; if (v !== undefined) out[k] = v; }
  }
  return out;
}

const PUBLIC_SETTINGS = ['showAccessories', 'businessName', 'gstNumber', 'address', 'phone', 'email', 'siteUrl', 'metaDescription', 'waNumber', 'waChatOn', 'waGreeting', 'giftWrapFee', 'delivery', 'dispatchTime', 'sareeLength', 'returnDays', 'grievanceOfficer', 'showRecentlySold', 'invoicePrefix', 'gstRate'];
// Pages the owner has hidden (and hidden stories, tabs or whole new pages) never leave the server: the public website only gets what it may show.
export function publicPages(pg) {
  if (!pg || typeof pg !== 'object') return null; const vis = x => x && x.show !== false, out = {};
  for (const k of ['care', 'journal']) { const p = pg[k]; if (!p || typeof p !== 'object') continue; out[k] = vis(p) ? { ...p } : { show: false }; if (!vis(p)) continue; if (Array.isArray(p.sections)) out[k].sections = p.sections.filter(vis); if (Array.isArray(p.posts)) out[k].posts = p.posts.filter(vis); }
  out.custom = (Array.isArray(pg.custom) ? pg.custom : []).filter(vis).map(c => { const d = { ...(c.data || {}) }; if (Array.isArray(d.sections)) d.sections = d.sections.filter(vis); if (Array.isArray(d.posts)) d.posts = d.posts.filter(vis); return { ...c, data: d }; });
  return out;
}
// The starter demo sarees (ids p1–p99 with stock-photo links) are only there to show the owner how the shop looks. They are never shown to customers.
export const isSampleProduct = p => process.env.SHOW_SAMPLES !== '1' && !!p && /^p\d{1,2}$/.test(String(p.id)) && [p.image, ...(p.images || [])].filter(Boolean).length > 0 && [p.image, ...(p.images || [])].filter(Boolean).every(u => /^https:\/\/images\.unsplash\.com\//.test(String(u)));
export function publicView(db) {
  const d = db || {}, pick = (o, ks) => Object.fromEntries(ks.filter(k => o && o[k] !== undefined).map(k => [k, o[k]]));
  return {
    settings: pick(d.settings, PUBLIC_SETTINGS), categories: d.categories || [], accessoryCategories: d.accessoryCategories || [], products: (d.products || []).filter(p => !isSampleProduct(p)), home: d.home || null, pages: publicPages(d.pages),
    bundles: (d.bundles || []).filter(b => b.active), coupons: (d.coupons || []).filter(c => c.active && c.announce).map(c => pick(c, ['code', 'type', 'discount', 'active', 'description', 'minOrder', 'expiresAt', 'announce', 'firstOrderOnly', 'oncePerCustomer', 'channel'])),
    reviews: (d.reviews || []).filter(r => r.status === 'approved').map(r => ({ id: r.id, productId: r.productId, name: String(r.name || '').split(' ')[0], rating: r.rating, title: r.title, text: r.text, photos: r.photos || [], status: 'approved', createdAt: r.createdAt, reply: r.reply || '', replyAt: r.replyAt || null })),
  };
}

export class ShopData {
  constructor(dir, keep = 30) {
    this.file = path.join(dir, 'shop-db.json'); this.keep = keep; this.hist = new Map(); fs.mkdirSync(dir, { recursive: true });
    this.version = 0; this.db = null; this.recovered = '';
    try { const x = JSON.parse(fs.readFileSync(this.file, 'utf8')); this.db = x.db; this.version = x.version || 0; }
    catch (e) {
      if (e && e.code !== 'ENOENT') {   // the file is there but cannot be read: use the last known-good copy (kept by the repair helper) instead of starting empty
        try { const g = JSON.parse(fs.readFileSync(path.join(dir, 'shop-db.good.json'), 'utf8')); if (g && g.db && !ShopData.check(g.db)) { this.db = g.db; this.version = g.version || 0; this.recovered = 'good-copy'; fs.copyFileSync(this.file, this.file + '.damaged-' + Date.now()); this.persist(); } } catch { /* no good copy: start empty */ }
      }
    }
    if (this.db) this.remember();
  }
  remember() { this.hist.set(this.version, zlib.gzipSync(j(this.db))); for (const k of [...this.hist.keys()]) if (k <= this.version - this.keep) this.hist.delete(k); }
  persist() { const t = this.file + '.tmp'; fs.writeFileSync(t, j({ version: this.version, db: this.db }), { mode: 0o600 }); fs.renameSync(t, this.file); }
  get() { return { db: this.db, version: this.version }; }
  static check(db) {
    if (!isObj(db)) return 'The data is not an object.'; for (const k of ['products', 'orders', 'users', 'coupons']) if (db[k] !== undefined && !Array.isArray(db[k])) return `${k} must be a list.`;
    if (!isObj(db.settings)) return 'settings is missing.'; if (j(db).length > 25_000_000) return 'The data is too large (over 25 MB).'; return '';
  }
  // Save the admin's copy. `baseVersion` is the version the admin last received.
  put(mine, baseVersion, role) {
    if (role && this.db && isObj(mine) && !Array.isArray(mine)) mine = dbForWrite(role, mine, this.db);   // a login may only change its own parts of the shop data
    const bad = ShopData.check(mine); if (bad) return { code: 400, error: bad };
    if (!this.db) { this.db = mine; this.version = 1; this.persist(); this.remember(); return { code: 200, version: this.version, db: this.db, merged: false }; }
    if (baseVersion === this.version) { this.db = mine; this.version++; this.persist(); this.remember(); return { code: 200, version: this.version, db: this.db, merged: false }; }
    const snap = this.hist.get(baseVersion); if (!snap) return { code: 409, error: 'Your copy is too old. Reload the page.', version: this.version };
    const base = JSON.parse(zlib.gunzipSync(snap).toString()), merged = merge3(base, mine, this.db);
    this.db = merged; this.version++; this.persist(); this.remember(); return { code: 200, version: this.version, db: this.db, merged: true };
  }
  // Something other than the admin's browser changes the shop (a website order, a stock change, an Instagram note…).
  mutate(fn) { if (!this.db) return false; fn(this.db); this.version++; this.persist(); this.remember(); return true; }
  importAll(db) { const bad = ShopData.check(db); if (bad) return { code: 400, error: bad }; this.db = db; this.version++; this.persist(); this.remember(); return { code: 200, version: this.version }; }
}
