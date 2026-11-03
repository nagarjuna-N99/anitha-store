// The Ops watcher: once a day it reads the Ops report and writes a short plain-words note. It only READS and REPORTS: it never changes anything.
// With Claude connected the note is written by Claude; without, a built-in note lists the same facts. Never any secret or customer detail (the report has none).
import fs from 'node:fs';
import path from 'node:path';
import { runAi } from './aihelper.mjs';

export function attention(report) {
  const out = []; let ok = 0;
  for (const g of report.groups || []) for (const c of g.checks) { if (c.status === 'fail' || c.status === 'warn') out.push({ area: g.name, status: c.status, title: c.title, detail: c.detail, fix: c.fix }); else if (c.status === 'ok') ok++; }
  out.sort((a, b) => (a.status === 'fail' ? 0 : 1) - (b.status === 'fail' ? 0 : 1));
  return { checks: out, okCount: ok, fail: out.filter(c => c.status === 'fail').length, warn: out.filter(c => c.status === 'warn').length };
}
export function localWatch(a) {
  if (!a.checks.length) return `• Everything looks healthy (${a.okCount} checks passed).`;
  return a.checks.slice(0, 12).map(c => `• ${c.status === 'fail' ? 'FIX NOW' : 'Look at'}: ${c.title}${c.detail ? ' (' + c.detail + ')' : ''}${c.fix ? '. Next: ' + c.fix : ''}`).join('\n');
}
export async function writeWatch({ cfg, client, report }) {
  const a = attention(report); let text = '', via = 'built-in';
  if (a.checks.length && cfg.anthropicKey && cfg.anthropicKey !== 'missing') { try { text = (await runAi({ cfg, client, task: 'opswatch', input: { checks: a.checks, okCount: a.okCount } })).text; via = 'claude'; } catch { text = ''; } }
  if (!text) text = localWatch(a);
  return { at: new Date().toISOString(), via, fail: a.fail, warn: a.warn, ok: a.okCount, text };
}
export class WatchStore {
  constructor(dir) { this.file = path.join(dir, 'ops-watch.json'); }
  read() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return {}; } }
  write(o) { const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(o), { mode: 0o600 }); fs.renameSync(t, this.file); }
}
