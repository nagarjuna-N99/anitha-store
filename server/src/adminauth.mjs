// Owner login for the separate admin app. No default password: the first password is set once, with a setup token that only
// the person who controls the server's environment knows. Passwords are stored as scrypt hashes, sessions are random 256-bit
// ids kept only as hashes, cookies are HttpOnly + SameSite=Strict (+ Secure on https), every change needs a CSRF token and a
// same-origin request, failed logins are throttled and locked out, and everything is written to an audit log.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const eq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const b64u = b => Buffer.from(b).toString('base64url');
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const COMMON = new Set(['password', 'password123', '123456789012', 'qwertyuiop12', 'admin1234567', 'iloveyou1234', 'welcome12345', 'letmein12345']);

// ---- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) for authenticator apps ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const b32encode = buf => { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; };
export const b32decode = s => { let bits = ''; for (const c of String(s).toUpperCase().replace(/=+$/, '')) { const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
export function totp(secretB32, step) {
  const key = b32decode(secretB32), msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', key).update(msg).digest(), o = h[h.length - 1] & 15, n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

export class AdminAuth {
  constructor({ dir, setupToken, secureCookie = true, now = () => Date.now(), idleMs = 30 * 60_000, absoluteMs = 8 * 3600_000 }) {
    this.file = path.join(dir, 'admin.json'); this.auditFile = path.join(dir, 'admin-audit.log'); this.setupToken = String(setupToken || ''); this.secure = secureCookie; this.now = now; this.idleMs = idleMs; this.absMs = absoluteMs;
    fs.mkdirSync(dir, { recursive: true }); this.sessions = new Map(); this.fails = new Map();   // key (ip:… or acct) -> {n, first, lockedUntil}
    this.s = { user: null }; try { this.s = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { /* first run */ }
  }
  save() { const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(this.s), { mode: 0o600 }); fs.renameSync(t, this.file); }
  audit(ev, ip, ok = true, extra = '') { try { fs.appendFileSync(this.auditFile, JSON.stringify({ t: new Date(this.now()).toISOString(), ev, ip, ok, extra: String(extra).slice(0, 120) }) + '\n', { mode: 0o600 }); } catch { /* disk full: never break login */ } }
  auditTail(n = 100) { try { return fs.readFileSync(this.auditFile, 'utf8').trim().split('\n').slice(-n).map(l => JSON.parse(l)).reverse(); } catch { return []; } }
  get configured() { return !!this.s.user; }
  get twoFactorOn() { return !!(this.s.user && this.s.user.totp && this.s.user.totp.enabled); }
  hash(pw, salt = crypto.randomBytes(16)) { return { salt: salt.toString('base64'), hash: crypto.scryptSync(String(pw), salt, 64, SCRYPT).toString('base64') }; }
  checkPw(pw) { const u = this.s.user; if (!u) return false; const h = crypto.scryptSync(String(pw), Buffer.from(u.salt, 'base64'), 64, SCRYPT); return crypto.timingSafeEqual(h, Buffer.from(u.hash, 'base64')); }
  static passwordProblem(pw) {
    pw = String(pw || ''); if (pw.length < 12) return 'Use at least 12 characters.'; if (pw.length > 200) return 'That password is too long.';
    if (COMMON.has(pw.toLowerCase())) return 'That password is too common.'; if (new Set(pw).size < 6) return 'Use more different characters.';
    if ([/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length < 3) return 'Mix at least three of: small letters, capitals, digits, symbols.'; return '';
  }
  // ---- throttling: 5 wrong attempts from one address, or 12 against the account, lock it for 15 minutes ----
  locked(key) { const f = this.fails.get(key); return !!(f && f.lockedUntil > this.now()); }
  fail(key, limit) { const t = this.now(); let f = this.fails.get(key); if (!f || t - f.first > 15 * 60_000) f = { n: 0, first: t, lockedUntil: 0 }; f.n++; if (f.n >= limit) f.lockedUntil = t + 15 * 60_000; this.fails.set(key, f); return f; }
  clear(key) { this.fails.delete(key); }
  retryAfter(...keys) { return Math.max(0, ...keys.map(k => (this.fails.get(k) || {}).lockedUntil - this.now() || 0)); }
  // ---- first-time setup ----
  setup({ setupToken, password }, ip) {
    if (this.configured) { this.audit('setup', ip, false, 'already configured'); return { code: 409, error: 'The owner account is already set up.' }; }
    if (this.setupToken.length < 16) return { code: 503, error: 'Set ADMIN_SETUP_TOKEN (at least 16 characters) on the server first.' };
    const k = 'setup:' + ip; if (this.locked(k)) return { code: 429, error: 'Too many tries. Wait 15 minutes.' };
    if (!eq(String(setupToken || ''), this.setupToken)) { this.fail(k, 5); this.audit('setup', ip, false, 'bad token'); return { code: 403, error: 'The setup token is not right.' }; }
    const p = AdminAuth.passwordProblem(password); if (p) return { code: 400, error: p };
    this.s.user = { name: 'owner', ...this.hash(password), createdAt: new Date(this.now()).toISOString(), totp: null }; this.save(); this.audit('setup', ip, true); return { code: 200 };
  }
  // ---- login ----
  login({ password, code }, ip, ua = '') {
    const ik = 'ip:' + ip, ak = 'acct';
    if (this.locked(ik) || this.locked(ak)) { this.audit('login', ip, false, 'locked'); return { code: 429, error: 'Too many wrong attempts. Try again in 15 minutes.', retryAfter: Math.ceil(this.retryAfter(ik, ak) / 1000) }; }
    const bad = why => { this.fail(ik, 5); this.fail(ak, 12); this.audit('login', ip, false, why); return { code: 401, error: 'Wrong password or code.' }; };
    if (!this.configured) { this.audit('login', ip, false, 'not set up'); return { code: 401, error: 'Wrong password or code.' }; }
    if (!this.checkPw(password)) return bad('password');
    if (this.twoFactorOn) { if (!this.useTotp(code)) return bad('2fa'); }
    this.clear(ik); this.clear(ak); const s = this.newSession(ip, ua); this.audit('login', ip, true); return { code: 200, ...s };
  }
  useTotp(code) {
    const t = this.s.user.totp; code = String(code || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(code)) return false; const step = Math.floor(this.now() / 30_000);
    for (const d of [0, -1, 1]) { const st = step + d; if (eq(totp(t.secret, st), code)) { if (st <= (t.lastStep || 0)) return false; t.lastStep = st; this.save(); return true; } } return false;
  }
  newSession(ip, ua) {
    const id = b64u(crypto.randomBytes(32)), csrf = b64u(crypto.randomBytes(24)), t = this.now();
    this.sessions.set(sha(id).toString('hex'), { csrf, created: t, last: t, ip, ua: String(ua).slice(0, 120) });
    if (this.sessions.size > 20) { const oldest = [...this.sessions.entries()].sort((a, b) => a[1].last - b[1].last)[0]; this.sessions.delete(oldest[0]); }
    return { sessionId: id, csrf };
  }
  cookieName() { return this.secure ? '__Host-adm' : 'adm'; }
  cookie(id) { return `${this.cookieName()}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(this.absMs / 1000)}${this.secure ? '; Secure' : ''}`; }
  clearCookie() { return `${this.cookieName()}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${this.secure ? '; Secure' : ''}`; }
  sessionFrom(req) {
    const c = String(req.headers.cookie || '').split(/;\s*/).find(x => x.startsWith(this.cookieName() + '=')); if (!c) return null; const id = c.slice(this.cookieName().length + 1); if (!/^[A-Za-z0-9_-]{40,50}$/.test(id)) return null;
    const key = sha(id).toString('hex'), s = this.sessions.get(key); if (!s) return null; const t = this.now();
    if (t - s.last > this.idleMs || t - s.created > this.absMs) { this.sessions.delete(key); return null; } s.last = t; return { ...s, key };
  }
  logout(req, ip) { const s = this.sessionFrom(req); if (s) this.sessions.delete(s.key); this.audit('logout', ip, true); }
  // A change (POST/PUT/DELETE) needs: a live session, the CSRF header, JSON content, and (when sent) an Origin equal to our own host.
  authorize(req, { write }, ip) {
    const s = this.sessionFrom(req); if (!s) return { code: 401, error: 'Please sign in.' };
    if (write) {
      const o = req.headers.origin; if (o) { let h = ''; try { h = new URL(o).host; } catch { /* bad origin */ } if (h !== req.headers.host) { this.audit('csrf', ip, false, 'origin'); return { code: 403, error: 'Blocked: request came from another site.' }; } }
      if (!eq(String(req.headers['x-csrf-token'] || ''), s.csrf)) { this.audit('csrf', ip, false, 'token'); return { code: 403, error: 'Blocked: security token missing. Reload the page.' }; }
      if (!/^application\/json/i.test(req.headers['content-type'] || '')) return { code: 415, error: 'JSON only.' };
    }
    return { code: 200, session: s };
  }
  // ---- password and two-factor management (all need the current password) ----
  changePassword({ current, next }, req, ip) {
    if (!this.checkPw(current)) { this.fail('ip:' + ip, 5); this.audit('password', ip, false, 'wrong current'); return { code: 401, error: 'The current password is not right.' }; }
    const p = AdminAuth.passwordProblem(next); if (p) return { code: 400, error: p }; Object.assign(this.s.user, this.hash(next)); this.save();
    const keep = this.sessionFrom(req); for (const k of [...this.sessions.keys()]) if (!keep || k !== keep.key) this.sessions.delete(k); this.audit('password', ip, true); return { code: 200 };
  }
  twoFactorStart({ password }, ip) {
    if (!this.checkPw(password)) { this.fail('ip:' + ip, 5); return { code: 401, error: 'Wrong password.' }; }
    const secret = b32encode(crypto.randomBytes(20)); this.s.user.totp = { secret, enabled: false, lastStep: 0 }; this.save();
    return { code: 200, secret, uri: `otpauth://totp/Anitha%20Store%20Admin:owner?secret=${secret}&issuer=Anitha%20Store%20Admin` };
  }
  twoFactorConfirm({ code }, ip) { const t = this.s.user.totp; if (!t) return { code: 400, error: 'Start 2-step sign-in first.' }; if (!this.useTotp(code)) { this.audit('2fa-enable', ip, false); return { code: 400, error: 'That code is not right.' }; } t.enabled = true; this.save(); this.audit('2fa-enable', ip, true); return { code: 200 }; }
  twoFactorOff({ password }, ip) { if (!this.checkPw(password)) { this.fail('ip:' + ip, 5); return { code: 401, error: 'Wrong password.' }; } this.s.user.totp = null; this.save(); this.audit('2fa-disable', ip, true); return { code: 200 }; }
}
