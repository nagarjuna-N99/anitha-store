// Photos for Instagram. Instagram fetches each photo from a public web address, so the admin uploads it here once and this
// server serves it from an unguessable address. Only real JPEG files are accepted; old files are deleted after 14 days.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class MediaStore {
  constructor(dir, maxBytes = 8 * 1024 * 1024) { this.dir = path.join(dir, 'media'); this.max = maxBytes; fs.mkdirSync(this.dir, { recursive: true }); }
  save(dataUrl) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || '')); if (!m) throw Object.assign(new Error('Send a JPEG photo.'), { code: 400 });
    const buf = Buffer.from(m[1], 'base64'); if (buf.length < 500 || buf.length > this.max) throw Object.assign(new Error('The photo must be under 8 MB.'), { code: 413 });
    if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) throw Object.assign(new Error('That is not a JPEG photo.'), { code: 400 });
    const id = crypto.randomBytes(16).toString('hex'); fs.writeFileSync(path.join(this.dir, id + '.jpg'), buf, { mode: 0o600 }); return { id, bytes: buf.length };
  }
  read(id) { if (!/^[0-9a-f]{32}$/.test(String(id))) return null; try { return fs.readFileSync(path.join(this.dir, id + '.jpg')); } catch { return null; } }
  has(id) { return /^[0-9a-f]{32}$/.test(String(id)) && fs.existsSync(path.join(this.dir, id + '.jpg')); }
  sweep(maxAgeMs = 14 * 86400_000, now = Date.now()) { let n = 0; for (const f of fs.readdirSync(this.dir)) { const p = path.join(this.dir, f); try { if (now - fs.statSync(p).mtimeMs > maxAgeMs) { fs.unlinkSync(p); n++; } } catch { /* gone */ } } return n; }
}
