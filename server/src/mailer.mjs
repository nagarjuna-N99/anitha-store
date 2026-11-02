// A small SMTP client (no dependencies): sends the weekly report to the owner through any mailbox that offers SMTP
// (Gmail with an app password, Zoho, Outlook, Brevo, your own domain). Implicit TLS (port 465) or STARTTLS (587).
// The password is only ever kept encrypted (secrets.mjs). Certificates are always checked, except for 127.0.0.1 in tests.
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

const clean = v => String(v == null ? '' : v).replace(/[\r\n\u0000]+/g, ' ').trim();
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const wrap76 = s => s.replace(/(.{76})/g, '$1\r\n');
const isLocal = h => /^(127\.0\.0\.1|localhost|::1)$/.test(h);
export const emailOk = a => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(String(a || '')) && String(a).length <= 200;

export function buildMessage({ from, to, subject, text, html }) {
  const id = crypto.randomBytes(12).toString('hex'), bnd = '=_' + crypto.randomBytes(12).toString('hex'), dom = (/@([^>\s]+)/.exec(from) || [])[1] || 'localhost';
  const head = [`From: ${clean(from)}`, `To: ${clean(to)}`, `Subject: =?UTF-8?B?${b64(clean(subject))}?=`, `Date: ${new Date().toUTCString()}`, `Message-ID: <${id}@${dom}>`, 'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${bnd}"`].join('\r\n');
  const part = (type, body) => `--${bnd}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64(body))}\r\n`;
  return `${head}\r\n\r\n${part('text/plain', text || '')}${html ? part('text/html', html) : ''}--${bnd}--\r\n`;
}

class Conn {
  constructor(sock) { this.sock = sock; this.buf = ''; this.q = []; this.err = null; this.attach(); }
  attach() { this.sock.setEncoding('utf8'); this.sock.on('data', d => { this.buf += d; this.flush(); }); this.sock.on('error', e => { this.err = e; this.flush(); }); this.sock.on('close', () => { this.err = this.err || new Error('The mail server closed the connection.'); this.flush(); }); }
  flush() { while (this.q.length) { const m = this.take(); if (m) { this.q.shift().res(m); continue; } if (this.err) { this.q.shift().rej(this.err); continue; } break; } }
  take() { const lines = this.buf.split('\r\n'); let end = -1; for (let i = 0; i < lines.length - 1; i++) if (/^\d{3} /.test(lines[i]) || /^\d{3}$/.test(lines[i])) { end = i; break; } if (end < 0) return null; const got = lines.slice(0, end + 1); this.buf = lines.slice(end + 1).join('\r\n'); return { code: +got[end].slice(0, 3), lines: got.map(l => l.slice(4)) }; }
  read() { return new Promise((res, rej) => { this.q.push({ res, rej }); this.flush(); }); }
  async cmd(line, ok) { this.sock.write(line + '\r\n'); const r = await this.read(); if (ok && !ok.includes(r.code)) throw Object.assign(new Error(`The mail server said: ${r.code} ${r.lines.join(' ').slice(0, 160)}`), { smtp: r.code }); return r; }
}

async function open({ host, port, secure }, timeoutMs) {
  const sock = await new Promise((res, rej) => { const t = setTimeout(() => { s.destroy(); rej(new Error('Could not reach the mail server (timed out). Check the host and port.')); }, timeoutMs); const done = f => v => { clearTimeout(t); f(v); }; const s = secure ? tls.connect({ host, port, servername: host, rejectUnauthorized: !isLocal(host) }, done(() => res(s))) : net.connect({ host, port }, done(() => res(s))); s.once('error', done(e => rej(new Error('Could not connect to the mail server: ' + (e.code || e.message))))); });
  sock.setTimeout(timeoutMs, () => sock.destroy(new Error('The mail server stopped answering.'))); return new Conn(sock);
}
async function session(o, work, timeoutMs = 20_000) {
  const host = clean(o.host), port = +o.port || (o.secure ? 465 : 587); let c;
  try {
    c = await open({ host, port, secure: !!o.secure }, timeoutMs); const g = await c.read(); if (g.code !== 220) throw new Error('The mail server did not welcome us (' + g.code + ').');
    let ehlo = await c.cmd('EHLO anitha-store.local', [250]);
    if (!o.secure && /STARTTLS/i.test(ehlo.lines.join('\n'))) { await c.cmd('STARTTLS', [220]); const up = tls.connect({ socket: c.sock, servername: host, rejectUnauthorized: !isLocal(host) }); await new Promise((res, rej) => { up.once('secureConnect', res); up.once('error', rej); }); c = new Conn(up); ehlo = await c.cmd('EHLO anitha-store.local', [250]); }
    else if (!o.secure && !isLocal(host)) throw new Error('This mail server does not offer a secure connection (STARTTLS). Use port 465 with "secure" on, or 587.');
    if (o.user) { await c.cmd('AUTH LOGIN', [334]); await c.cmd(b64(clean(o.user)), [334]); try { await c.cmd(b64(String(o.pass || '')), [235]); } catch (e) { if (e.smtp === 535 || e.smtp === 534) throw new Error('The mail server refused the username or password. For Gmail use an App Password (Google account → Security → 2-Step Verification → App passwords), not your normal password.'); throw e; } }
    return await work(c);
  } catch (e) { e.smtpUser = true; throw e;   // the message is written for the owner and may be shown
  } finally { try { if (c) { c.sock.write('QUIT\r\n'); c.sock.end(); } } catch { /* closing */ } }
}
export const smtpVerify = o => session(o, async () => true);
export async function smtpSend(o, msg) {
  if (!emailOk(o.to) || !emailOk((/<([^>]+)>/.exec(o.from) || [, o.from])[1])) throw new Error('The sender or receiver address does not look right.');
  const fromAddr = (/<([^>]+)>/.exec(o.from) || [, o.from])[1];
  return session(o, async c => { await c.cmd(`MAIL FROM:<${clean(fromAddr)}>`, [250]); await c.cmd(`RCPT TO:<${clean(o.to)}>`, [250, 251]); await c.cmd('DATA', [354]); const body = buildMessage({ from: o.from, to: o.to, subject: msg.subject, text: msg.text, html: msg.html }).replace(/^\./gm, '..'); await c.cmd(body + '.', [250]); return true; });
}
