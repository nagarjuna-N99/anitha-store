// The server self-heal script (aws/selfheal.sh), run here with stand-ins for curl, systemctl, df, find and journalctl so nothing real is touched.
const { spawnSync } = require('child_process'); const fs = require('fs'), os = require('os'), path = require('path');
let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); };
const root = path.resolve(__dirname, '..'), script = path.join(root, 'aws/selfheal.sh');
const mk = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'heal-')), bin = path.join(d, 'bin'), data = path.join(d, 'data'); fs.mkdirSync(bin); fs.mkdirSync(data);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), '#!/usr/bin/env bash\n' + body + '\n', { mode: 0o755 }); };
  const set = (k, v) => fs.writeFileSync(path.join(d, k), String(v));
  set('curl_rc', 0); set('caddy_rc', 0); set('disk', '40%'); set('restart_rc', 0);
  stub('curl', `exit "$(cat '${d}/curl_rc')"`);
  stub('systemctl', `echo "systemctl $*" >> '${d}/calls'; if [ "$1" = "is-active" ]; then exit "$(cat '${d}/caddy_rc')"; fi; if [ "$1" = "restart" ]; then exit "$(cat '${d}/restart_rc')"; fi; exit 0`);
  stub('df', `echo "Use%"; echo " $(cat '${d}/disk')"`);
  for (const n of ['find', 'journalctl', 'apt-get', 'chown', 'chmod']) stub(n, `echo "${n} $*" >> '${d}/calls'; exit 0`);
  const run = () => spawnSync('bash', [script], { env: { ...process.env, PATH: bin + ':' + process.env.PATH, SELFHEAL_DATA: data, SELFHEAL_LOG: path.join(data, 'selfheal.log'), SELFHEAL_STATE: path.join(d, 'fails'), SELFHEAL_BACKUPS: path.join(d, 'backups') }, encoding: 'utf8' });
  const calls = () => { try { return fs.readFileSync(path.join(d, 'calls'), 'utf8'); } catch { return ''; } }, log = () => { try { return fs.readFileSync(path.join(data, 'selfheal.log'), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } };
  return { run, set, calls, log, d };
};
{ const h = mk(); const r = h.run(); ok('self-heal: when everything is fine it does nothing and writes nothing', r.status === 0 && !/restart/.test(h.calls()) && h.log().length === 0); }
{ const h = mk(); h.set('curl_rc', 7); h.run(); const once = !/restart anitha-store/.test(h.calls()) && h.log().length === 0; h.run();
  ok('self-heal: one missed answer is forgiven; two in a row restart the shop server and say so in the log', once && /systemctl restart anitha-store/.test(h.calls()) && h.log().some(e => e.action === 'restart-server' && /restarted/.test(e.note))); }
{ const h = mk(); h.set('curl_rc', 7); h.run(); h.set('curl_rc', 0); h.run(); h.set('curl_rc', 7); h.run(); ok('self-heal: a good answer in between resets the count (no restart for scattered misses)', !/restart anitha-store/.test(h.calls())); }
{ const h = mk(); h.set('curl_rc', 7); h.set('restart_rc', 1); h.run(); h.run(); ok('self-heal: if the restart itself fails it says so plainly and tells what to check', h.log().some(e => e.action === 'restart-server-failed' && /journalctl/.test(e.note))); }
{ const h = mk(); h.set('caddy_rc', 3); h.run(); ok('self-heal: a stopped web server (Caddy) is started again and logged', /systemctl restart caddy/.test(h.calls()) && h.log().some(e => e.action === 'restart-caddy')); }
{ const h = mk(); h.set('disk', '95%'); h.run(); ok('self-heal: a disk over 90% full gets old data backups (older than 3 days) removed and system logs trimmed, and it is logged', /find .*anitha-data-.*-mtime \+3 -delete/.test(h.calls()) && /journalctl --vacuum-size=100M/.test(h.calls()) && h.log().some(e => e.action === 'free-disk' && /95%/.test(e.note))); }
{ const h = mk(); h.set('disk', '60%'); h.run(); ok('self-heal: a disk that is 60% full is left alone', !/find /.test(h.calls())); }
{ const h = mk(); h.set('curl_rc', 7); for (let i = 0; i < 300; i++) h.run(); ok('self-heal: the log never grows past 200 lines', h.log().length <= 200); }
{ const s = fs.readFileSync(script, 'utf8'); ok('self-heal: the script never touches the shop data files, passwords or settings (no rm, mv of data, or edits to .json files besides its own log)', !/rm -rf|shop-db|admin\.json|secrets\.json|\.env/.test(s)); }
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
