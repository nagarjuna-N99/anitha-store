// Repair helper (Ops page, admin only).
//  1. AUTO-REPAIR: a short list of SAFE, fixed, always-the-same repairs that run on their own every 10 minutes while the switch is ON:
//       privacy-sweep  runs the daily privacy clean-up if it missed a day
//       file-modes     makes the shop's data files private (owner-only) again if something loosened them
//       good-copy      keeps a fresh known-good copy of the shop data once a day (the server loads it by itself if the main file is ever damaged)
//     Nothing else is ever changed automatically. The AI is NOT involved in auto-repair.
//  2. THE CHAT: the admin asks questions; Claude (or, without Claude, a plain built-in answer) reads the Ops checks and recent errors
//     (never passwords, keys or customer data) and explains them in simple words. It can only SUGGEST repairs from the list below;
//     the admin presses the button. It never claims to have fixed anything.
//  3. The server-level self-heal (restarts a stopped shop or web server, frees disk) is a separate script: aws/selfheal.sh.
import fs from 'node:fs';
import path from 'node:path';
import { runAi } from './aihelper.mjs';
import { ShopData } from './shopdata.mjs';

const DAY = 86400_000;
export const REPAIR_ACTIONS = {
  'privacy-sweep': 'Run the daily privacy clean-up now (old chats, carts, order contact details)',
  'file-modes': 'Make the shop data files private again (owner-only permissions)',
  'good-copy': 'Save a fresh known-good copy of the shop data now',
  'ops-note': 'Write today\'s Ops note now',
  'retry-reports': 'Retry the report emails now',
};
const AUTO = ['privacy-sweep', 'file-modes', 'good-copy'];   // the only ones that may run by themselves
const DATA_FILES = ['shop-db.json', 'shop-db.good.json', 'admin.json', 'secrets.json', 'analytics.json', 'privacy-rights.json', 'weborders.json', 'notes-signups.json', 'repair.json'];

export class RepairStore {
  constructor(dir, now = () => Date.now()) { this.file = path.join(dir, 'repair.json'); this.now = now; }
  read() { try { const d = JSON.parse(fs.readFileSync(this.file, 'utf8')); return { enabled: d.enabled !== false, log: Array.isArray(d.log) ? d.log : [] }; } catch { return { enabled: true, log: [] }; } }   // auto-repair is ON unless switched off
  write(d) { const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(d), { mode: 0o600 }); fs.renameSync(t, this.file); }
  enabled() { return this.read().enabled; }
  setEnabled(on) { const d = this.read(); d.enabled = !!on; this.add({ action: 'switch', by: 'admin', note: on ? 'Auto-repair switched ON' : 'Auto-repair switched OFF' }, d); }
  add(e, d = this.read()) { d.log.unshift({ at: new Date(this.now()).toISOString(), ...e }); d.log = d.log.slice(0, 60); this.write(d); }
  log(n = 30) { return this.read().log.slice(0, n); }
}

// what the server-level script has done (aws/selfheal.sh writes one JSON line per action)
export function selfhealLog(dir, n = 20) { try { return fs.readFileSync(path.join(dir, 'selfheal.log'), 'utf8').trim().split('\n').filter(Boolean).slice(-n).map(l => JSON.parse(l)).reverse(); } catch { return []; } }

export function makeRepair({ cfg, shop, privacy, runSweepNow, reportTick, watchRun, istDay, clockNow, opsReportFn, client, store }) {
  const dir = cfg.dataDir, rs = store || new RepairStore(dir, clockNow);
  const good = path.join(dir, 'shop-db.good.json'), main = path.join(dir, 'shop-db.json');
  const file = (p, f) => path.join(p, f);
  // each repair: needed() says whether it is needed; run() does it and returns a plain sentence
  const R = {
    'privacy-sweep': {
      needed: () => { const l = privacy.state().lastSweep; return !l || l < istDay(clockNow() - DAY); },
      run: () => { runSweepNow(); return 'Ran the privacy clean-up.'; },
    },
    'file-modes': {
      needed: () => DATA_FILES.some(f => { try { return (fs.statSync(file(dir, f)).mode & 0o077) !== 0; } catch { return false; } }),
      run: () => { let n = 0; for (const f of DATA_FILES) { try { const p = file(dir, f); if ((fs.statSync(p).mode & 0o077) !== 0) { fs.chmodSync(p, 0o600); n++; } } catch { /* not there */ } } return `Made ${n} data file(s) private again.`; },
    },
    'good-copy': {
      needed: () => { try { return clockNow() - fs.statSync(good).mtimeMs > DAY; } catch { return fs.existsSync(main); } },
      run: () => {
        const raw = fs.readFileSync(main, 'utf8'), x = JSON.parse(raw), bad = ShopData.check(x.db);   // only a copy that is valid is ever kept as the good one
        if (bad || !x.db) throw new Error('The shop data file is not valid, so it was not copied: ' + (bad || 'empty'));
        const t = good + '.tmp'; fs.writeFileSync(t, raw, { mode: 0o600 }); fs.renameSync(t, good); return 'Saved a fresh known-good copy of the shop data.';
      },
    },
    'ops-note': { needed: () => false, run: async () => { const r = await watchRun(true); return r ? 'Wrote the Ops note.' : 'The Ops note is already being written.'; } },
    'retry-reports': { needed: () => false, run: async () => { await reportTick(); return 'Checked the report emails and retried any that were due.'; } },
  };
  const exec = async (id, by) => {
    const r = R[id]; if (!r) return { id, ok: false, note: 'Unknown repair.' };
    try { const note = await r.run(); rs.add({ action: id, by, ok: true, note }); return { id, ok: true, note }; }
    catch (e) { const note = String(e && e.message || e).slice(0, 200); rs.add({ action: id, by, ok: false, note }); return { id, ok: false, note }; }
  };
  return {
    store: rs,
    actions: () => Object.entries(REPAIR_ACTIONS).map(([id, label]) => ({ id, label, auto: AUTO.includes(id) })),
    status: () => ({ enabled: rs.enabled(), log: rs.log(), selfheal: selfhealLog(dir), actions: Object.entries(REPAIR_ACTIONS).map(([id, label]) => ({ id, label, auto: AUTO.includes(id) })), lastGoodCopy: (() => { try { return new Date(fs.statSync(good).mtimeMs).toISOString(); } catch { return null; } })() }),
    // the admin presses "Run now": the chosen repairs run whether or not they look needed
    async runNow(ids) { const list = (Array.isArray(ids) && ids.length ? ids : AUTO).filter(i => R[i]), out = []; for (const id of list) out.push(await exec(id, 'admin')); return out; },
    // the 10-minute timer: only when the switch is ON, only the safe three, only what is really needed
    async tick() { if (!rs.enabled()) return []; const out = []; for (const id of AUTO) { let need = false; try { need = R[id].needed(); } catch { need = false; } if (need) out.push(await exec(id, 'auto')); } return out; },
    // ---- the chat ----
    async chat({ message, history, useAi }) {
      const rep = await opsReportFn(), bad = rep.groups.flatMap(g => g.checks.filter(c => c.status === 'fail' || c.status === 'warn').map(c => ({ group: g.name, status: c.status, title: c.title, detail: String(c.detail || '').slice(0, 160), fix: String(c.hint || '').slice(0, 220) })));
      const errors = rep.groups.filter(g => g.name === 'Recent errors').flatMap(g => g.checks).filter(c => c.id === 'err').slice(0, 6).map(c => `${c.title}: ${String(c.detail || '').slice(0, 160)}`);
      const recent = rs.log(8).map(e => `${e.at.slice(0, 16).replace('T', ' ')} ${e.action}: ${e.note || ''}`), heal = selfhealLog(dir, 6).map(e => `${String(e.t || '').slice(0, 16).replace('T', ' ')} ${e.action}: ${e.note || ''}`);
      const suggest = new Set(); const wantMap = { 'p-sweep': 'privacy-sweep', 'p-late': 'privacy-sweep', 'files': 'good-copy', 'rep-weekly': 'retry-reports', 'rep-monthly': 'retry-reports' };
      for (const g of rep.groups) for (const c of g.checks) if ((c.status === 'fail' || c.status === 'warn') && wantMap[c.id]) suggest.add(wantMap[c.id]);
      if (useAi && cfg.anthropicKey && cfg.anthropicKey !== 'missing' && client) {
        try {
          const r = await runAi({ cfg, client, task: 'repair', input: { question: String(message || '').slice(0, 600), history: (Array.isArray(history) ? history : []).slice(-6), checks: bad.slice(0, 40), summary: rep.summary, errors, autoRepairLog: recent, serverSelfHealLog: heal, actions: Object.entries(REPAIR_ACTIONS).map(([id, label]) => ({ id, label })) } });
          const d = r.data || {};
          return { via: 'claude', reply: String(d.reply || '').slice(0, 1400), steps: (Array.isArray(d.steps) ? d.steps : []).slice(0, 6).map(x => String(x).slice(0, 240)), actions: (Array.isArray(d.actions) ? d.actions : []).filter(a => REPAIR_ACTIONS[a]).filter((a, i, arr) => arr.indexOf(a) === i).slice(0, 4) };
        } catch (e) { /* fall through to the plain answer */ }
      }
      const head = bad.length ? `The checks found ${rep.summary.fail} red and ${rep.summary.warn} yellow item(s).` : 'The checks found nothing red or yellow. Everything looks healthy.';
      const lines = bad.slice(0, 8).map(c => `${c.status === 'fail' ? '🔴' : '🟡'} ${c.title}${c.detail ? ' (' + c.detail + ')' : ''}${c.fix ? ': ' + c.fix : ''}`);
      return { via: 'built-in', reply: head + (useAi ? ' (Claude is not connected, so this is the plain list from the checks.)' : ' (The Claude helper is switched off, so this is the plain list from the checks.)'), steps: lines, actions: [...suggest] };
    },
  };
}
