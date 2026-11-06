// Three quiet helpers that run by themselves (the owner can switch the first two off; the third needs the admin to set a backup password):
//  1. MORNING SUMMARY   once a day from 8:30 IST, a short message to the owner's WhatsApp (and email): website orders waiting for approval, orders to post, low stock, chats waiting.
//                       Nothing to report = no message. Never sent twice in a day (the day is marked BEFORE sending).
//  2. STOCK ALERTS      when a saree reaches its last piece or sells out, one message (batched). The first look only remembers the current levels, so switching it on never floods the owner.
//  3. AUTOMATIC BACKUP  once a day from 3:10 IST, the shop data is locked with the admin's backup password (same lock as the manual backup, so the app's Restore opens it) and kept on the
//                       server for 14 days. It is a copy on the same machine: an off-server copy (a Lightsail snapshot, or the admin downloading one) is still the real safety net.
// Messages go through the same sender as everything else, so the opt-out and quiet rules of that path apply, and nothing here messages a customer.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const IST = 330 * 60_000, DAY = 86400_000;
const istDay = t => new Date(t + IST).toISOString().slice(0, 10), istMin = t => { const d = new Date(t + IST); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const KEEP = 14, FILE = /^backup-\d{4}-\d{2}-\d{2}\.json$/;
export const SUMMARY_FROM = 8 * 60 + 30, BACKUP_FROM = 3 * 60 + 10;

export function encryptBackup(obj, pass) {   // the same lock as the owner app's manual backup: PBKDF2-SHA256 (250000) + AES-256-GCM, ciphertext followed by the tag
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = crypto.pbkdf2Sync(String(pass), salt, 250000, 32, 'sha256'), c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final(), c.getAuthTag()]);
  return { enc: 'aes-gcm-pbkdf2', iter: 250000, salt: salt.toString('base64'), iv: iv.toString('base64'), data: data.toString('base64'), createdAt: new Date().toISOString() };
}
export function decryptBackup(box, pass) {
  const raw = Buffer.from(box.data, 'base64'), tag = raw.subarray(raw.length - 16), key = crypto.pbkdf2Sync(String(pass), Buffer.from(box.salt, 'base64'), +box.iter || 250000, 32, 'sha256'), d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAuthTag(tag); return JSON.parse(Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString('utf8'));
}

export function makeAutomation({ cfg, shop, store, weborders, pipeline, mail, orderflow, secrets, dir, now = () => Date.now() }) {
  const file = path.join(dir, 'automation.json'), bdir = path.join(dir, 'backups');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
  const write = o => { const t = file + '.tmp'; fs.writeFileSync(t, JSON.stringify(o), { mode: 0o600 }); fs.renameSync(t, file); };
  const S = () => (shop.get().db || {}).settings || {}, DB = () => shop.get().db || null;
  const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');
  async function toOwner(text, oneLine, tpl, tplDefault) {
    const to = orderflow.ownerPhone(); let wa = false;
    if (to) { try { await pipeline.sendSmart(to, text, { template: tpl || tplDefault, params: [oneLine.slice(0, 600)] }); wa = true; } catch (e) { console.error('[automation] WhatsApp failed', e.message); } }
    const em = await mail(oneLine.slice(0, 80), text.replace(/\*/g, ''), `<pre style="font:14px/1.5 Arial;white-space:pre-wrap">${text.replace(/\*/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`).catch(() => false);
    return { whatsapp: wa, email: !!em };
  }

  // ---------- 1. the morning summary ----------
  function summaryData() {
    const db = DB() || {}, prods = db.products || [], toApprove = weborders.list().filter(w => w.status === 'new');
    const toPost = (db.orders || []).filter(o => ['placed', 'confirmed', 'packed'].includes(o.status) && !o.trackingNo);
    const low = prods.filter(p => p.stock > 0 && p.stock <= Math.max(1, Number(p.threshold) || 0)), out = prods.filter(p => p.stock === 0 && !(db.accessoryCategories || []).includes(p.category));
    const waiting = (store.s.handoffs || []).filter(h => h.status === 'open' && !String(h.phone || '').startsWith('test-'));
    return { toApprove, toPost, low, out, waiting };
  }
  const names = (a, n = 4) => a.slice(0, n).map(x => x.name || x.id).join(', ') + (a.length > n ? ` and ${a.length - n} more` : '');
  function summaryText(d) {
    const L = ['☀️ *Good morning. Here is your shop today*'];
    if (d.toApprove.length) L.push(`📥 ${d.toApprove.length} website order${d.toApprove.length > 1 ? 's' : ''} waiting for your YES: ${d.toApprove.slice(0, 4).map(w => `${w.id} (${fmt(w.order.total)})`).join(', ')}`);
    if (d.toPost.length) L.push(`📦 ${d.toPost.length} order${d.toPost.length > 1 ? 's' : ''} to post: ${d.toPost.slice(0, 4).map(o => o.id).join(', ')}${d.toPost.length > 4 ? '…' : ''}. Reply TRACK order-number tracking-number after posting.`);
    if (d.low.length) L.push(`⚠️ Running low: ${names(d.low)}`);
    if (d.out.length) L.push(`🚫 Sold out: ${names(d.out)}`);
    if (d.waiting.length) L.push(`💬 ${d.waiting.length} chat${d.waiting.length > 1 ? 's' : ''} waiting for your reply (owner app → WhatsApp)`);
    return L.join('\n');
  }
  const summaryEmpty = d => !(d.toApprove.length || d.toPost.length || d.low.length || d.out.length || d.waiting.length);
  async function runSummary({ force = false } = {}) {
    const t = now(), st = read(), day = istDay(t);
    if (!force) { if (S().dailySummary === false || istMin(t) < SUMMARY_FROM || (st.summary && st.summary.day === day)) return { skipped: true }; }
    const d = summaryData(); st.summary = { day, at: t, empty: summaryEmpty(d) }; write(st);   // the day is marked before anything is sent
    if (summaryEmpty(d)) return { skipped: 'nothing-to-report' };
    const text = summaryText(d), one = text.replace(/\n/g, ' | ').replace(/\*/g, '');
    return { sent: true, ...(await toOwner(text, one, cfg.wa.ownerSummaryTemplate, 'owner_daily_summary')) };
  }

  // ---------- 2. stock alerts ----------
  const level = p => p.stock === 0 ? 'out' : p.stock <= 1 ? 'low' : 'ok';
  async function checkStock() {
    const db = DB(); if (!db) return { skipped: true }; const st = read(), prods = db.products || [], first = !st.stock; st.stock = st.stock || {}; const msgs = [];
    for (const p of prods) {
      const now_ = level(p), was = st.stock[p.id] || 'ok';
      if (!first && S().stockAlerts !== false && ((now_ === 'out' && was !== 'out') || (now_ === 'low' && was === 'ok'))) msgs.push(now_ === 'out' ? `🚫 ${p.name} is sold out` : `⚠️ ${p.name} has only 1 left`);
      st.stock[p.id] = now_;
    }
    for (const id of Object.keys(st.stock)) if (!prods.some(p => p.id === id)) delete st.stock[id];
    write(st);   // levels are remembered before sending, so the same change is never announced twice
    if (!msgs.length) return { sent: false };
    const text = '📉 *Stock update*\n' + msgs.slice(0, 12).join('\n') + (msgs.length > 12 ? `\n…and ${msgs.length - 12} more` : '') + '\nThe website already shows sold-out sarees as sold out.';
    return { sent: true, count: msgs.length, ...(await toOwner(text, text.replace(/\n/g, ' | ').replace(/\*/g, ''), cfg.wa.ownerStockTemplate, 'owner_stock_alert')) };
  }

  // ---------- 3. automatic encrypted backup ----------
  const pass = () => secrets.get('backupPassword');
  function listBackups() { try { return fs.readdirSync(bdir).filter(f => FILE.test(f)).sort().reverse().map(f => { const s = fs.statSync(path.join(bdir, f)); return { name: f, size: s.size, at: s.mtime.toISOString() }; }); } catch { return []; } }
  function backupPath(name) { return FILE.test(String(name)) ? path.join(bdir, name) : null; }
  async function runBackup({ force = false } = {}) {
    const t = now(), st = read(), day = istDay(t); if (!pass()) return { skipped: 'no-password' };
    if (!force && ((st.backup && st.backup.day === day) || istMin(t) < BACKUP_FROM)) return { skipped: true };
    const db = DB(); if (!db) return { skipped: 'no-data' };
    st.backup = { ...(st.backup || {}), day, at: t }; write(st);
    try {
      fs.mkdirSync(bdir, { recursive: true, mode: 0o700 }); const name = `backup-${day}.json`, tmp = path.join(bdir, name + '.tmp');
      fs.writeFileSync(tmp, JSON.stringify(encryptBackup(db, pass())), { mode: 0o600 }); fs.renameSync(tmp, path.join(bdir, name));
      for (const old of listBackups().slice(KEEP)) { try { fs.unlinkSync(path.join(bdir, old.name)); } catch { /* already gone */ } }
      const s2 = read(); s2.backup = { day, at: t, ok: t, error: '' }; write(s2); return { ok: true, name };
    } catch (e) { const s2 = read(); s2.backup = { ...(s2.backup || {}), error: String(e.message).slice(0, 160) }; write(s2); return { error: e.message }; }
  }
  const status = () => { const st = read(), b = st.backup || {}; return { passwordSet: !!pass(), lastOk: b.ok || null, error: b.error || '', files: listBackups(), keep: KEEP, summaryDay: (st.summary || {}).day || '' }; };
  let busy = false;
  async function tick() { if (busy) return; busy = true; try { await runBackup().catch(() => {}); await checkStock().catch(e => console.error('[automation] stock', e.message)); await runSummary().catch(e => console.error('[automation] summary', e.message)); } finally { busy = false; } }
  return { tick, runSummary, checkStock, runBackup, summaryData, summaryText, status, listBackups, backupPath, bdir, setPassword: v => secrets.set('backupPassword', v, { last4: false }) };
}
