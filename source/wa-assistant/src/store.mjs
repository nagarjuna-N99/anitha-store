import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Small file-backed store: conversations, order requests, hand-offs, opt-outs, dedupe ids, daily usage.
// Writes are atomic (temp file + rename). Good for one shop; swap for a database if volume grows.
const EMPTY = () => ({ conversations: {}, orders: [], handoffs: [], optOut: {}, seen: {}, usage: {}, carts: {}, cartSettings: { enabled: true } });

export function istDay(d = new Date()) {
  return new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

export class Store {
  constructor(dir) {
    this.dir = dir; this.file = path.join(dir, 'state.json'); this.catFile = path.join(dir, 'catalogue.json');
    fs.mkdirSync(dir, { recursive: true });
    this.s = EMPTY();
    try { this.s = { ...EMPTY(), ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; } catch { /* first run */ }
    this._t = null;
  }
  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 150); this._t.unref?.();
  }
  flush() {
    clearTimeout(this._t);
    // keep the dedupe table small
    const cutoff = Date.now() - 3 * 864e5;
    for (const [k, v] of Object.entries(this.s.seen)) if (v < cutoff) delete this.s.seen[k];
    const tmp = this.file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.s)); fs.renameSync(tmp, this.file);
  }
  id(p) { return p + crypto.randomBytes(5).toString('hex'); }

  // ---- dedupe: WhatsApp redelivers webhooks; never answer the same message twice ----
  claimMessage(id) {
    if (!id) return true;
    if (this.s.seen[id]) return false;
    this.s.seen[id] = Date.now(); this.save(); return true;
  }

  // ---- conversations ----
  conv(phone) {
    let c = this.s.conversations[phone];
    if (!c) c = this.s.conversations[phone] = { phone, name: '', status: 'bot', lang: '', history: [], lastInboundAt: 0, lastActivityAt: 0, window: [], notes: '', unread: 0 };
    return c;
  }
  listConvs() { return Object.values(this.s.conversations).sort((a, b) => b.lastActivityAt - a.lastActivityAt); }

  // ---- opt-out (STOP): honoured before anything else ----
  isOptedOut(phone) { return !!this.s.optOut[phone]; }
  setOptOut(phone, on) { if (on) this.s.optOut[phone] = Date.now(); else delete this.s.optOut[phone]; this.save(); }

  // ---- daily Claude usage cap ----
  usageToday() { return this.s.usage[istDay()] || 0; }
  bumpUsage() { const d = istDay(); this.s.usage = { [d]: (this.s.usage[d] || 0) + 1 }; this.save(); }

  // ---- orders & hand-offs ----
  addOrder(o) { const rec = { id: this.id('OR'), status: 'new', createdAt: Date.now(), ...o }; this.s.orders.unshift(rec); this.save(); return rec; }
  addHandoff(h) { const rec = { id: this.id('HO'), status: 'open', createdAt: Date.now(), ...h }; this.s.handoffs.unshift(rec); this.save(); return rec; }

  // ---- catalogue (uploaded from the store admin) ----
  loadCatalogue() { try { return JSON.parse(fs.readFileSync(this.catFile, 'utf8')); } catch { return null; } }
  saveCatalogue(c) { const tmp = this.catFile + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(c)); fs.renameSync(tmp, this.catFile); }
}
