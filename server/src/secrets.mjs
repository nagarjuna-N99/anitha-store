// Owner-supplied secrets (the Anthropic key), kept in DATA_DIR/secrets.json, encrypted with AES-256-GCM.
// The encryption key comes from ADMIN_SETUP_TOKEN (an environment variable, never written to the disk with the file);
// without it a random key file next to the data is used. The key is never sent back to any page.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class SecretStore {
  constructor(dir, passphrase = '') {
    this.dir = dir; this.file = path.join(dir, 'secrets.json'); fs.mkdirSync(dir, { recursive: true });
    if (passphrase) this.key = crypto.scryptSync(String(passphrase), 'anitha-store-secrets-v1', 32);
    else {
      const kf = path.join(dir, '.secrets-key');
      if (!fs.existsSync(kf)) fs.writeFileSync(kf, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
      this.key = Buffer.from(fs.readFileSync(kf, 'utf8').trim(), 'hex');
    }
  }
  read() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return {}; } }
  write(o) { const tmp = this.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(o), { mode: 0o600 }); fs.renameSync(tmp, this.file); }
  get(name) {
    const r = this.read()[name]; if (!r) return '';
    try { const d = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(r.iv, 'base64')); d.setAuthTag(Buffer.from(r.tag, 'base64')); return Buffer.concat([d.update(Buffer.from(r.data, 'base64')), d.final()]).toString('utf8'); }
    catch { return ''; }   // wrong key (token changed) or damaged file: behave as "not set"
  }
  set(name, value, { last4 = true } = {}) {
    const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', this.key, iv), data = Buffer.concat([c.update(String(value), 'utf8'), c.final()]);
    const all = this.read(); all[name] = { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64'), last4: last4 ? String(value).slice(-4) : '', updatedAt: new Date().toISOString() }; this.write(all);
  }
  remove(name) { const all = this.read(); delete all[name]; this.write(all); }
  meta(name) { const r = this.read()[name]; return r ? { set: true, last4: r.last4 || '', updatedAt: r.updatedAt || null } : { set: false }; }
}
