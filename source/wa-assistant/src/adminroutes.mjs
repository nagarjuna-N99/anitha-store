// Routes for the separate owner app (/admin) and the public read-only shop data (/public/shop).
//   /admin            the admin page (login screen first)           no data inside
//   /admin/api/*      everything the owner does                    session cookie + CSRF header, same-origin only
//   /public/shop      what the public website may see              read-only, no secrets
//   /media/<id>.jpg   photos Instagram fetches                     unguessable addresses
import fs from 'node:fs';
import { CHANNELS } from './privacy.mjs';
import path from 'node:path';
import { publicView } from './shopdata.mjs';
import { runAi, cleanPlan, localPlan, istIso } from './aihelper.mjs';
import { OPS_HTML } from './opspage.mjs';
import { previewsOf } from './ops.mjs';
import crypto from 'node:crypto';

export function adminRoutes({ cfg, auth, shop, media, social, ig, client, notifyTracking, aiKey, videos, analytics, growth, privacy, Privacy, weborders, ops, opsReport, wa, watchRun, watchRead, sendCode, breachNotices, store, runSweep, notifyOwner, smtpMeta, smtpSave, smtpRemove, smtpSendTest, reportState, prefs, savePrefs, json, readBody, ROOT }) {
  const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin', 'Cache-Control': 'no-store', ...(auth.secure ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}) };
  const CSP = "default-src 'none'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
  const ipOf = req => String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');   // never trust X-Forwarded-For for security decisions
  const send = (res, r, extra = {}) => json(res, r.code || 200, r.code && r.code >= 400 ? { error: r.error, retryAfter: r.retryAfter } : r, { ...SEC, ...extra });
  const body = async (req, limit = 200_000) => { try { return JSON.parse((await readBody(req, limit)).toString('utf8') || '{}'); } catch (e) { throw Object.assign(new Error(e.code === 413 ? 'Too large.' : 'Bad request.'), { code: e.code === 413 ? 413 : 400 }); } };
  let keyTries = [], reviewTries = [], emailTries = [], opsTries = [], watchTries = [];
  const mask = s => s ? s.slice(0, 3) + '…' + s.slice(-3) : '';

  return async function handle(req, res, url, route) {
    const ip = ipOf(req);
    if (cfg.adminAllowedIps && cfg.adminAllowedIps.length && (route === 'GET /admin' || route === 'GET /admin/' || route === 'GET /admin2' || url.pathname.startsWith('/admin/api/')) && !cfg.adminAllowedIps.includes(ip)) { json(res, 404, { error: 'not found' }, SEC); return true; }   // optional: only these addresses can even see the owner app
    // ---------- the stand-alone Ops page: its own key, no owner login, works even if the owner app is broken ----------
    if (route === 'GET /ops' || route === 'GET /ops/' || route === 'GET /ops/api/report') {
      const on = String(cfg.opsToken || '').length >= 24; if (!on) return json(res, 404, { error: 'not found' }, SEC), true;
      if (route !== 'GET /ops/api/report') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'X-Robots-Tag': 'noindex', ...SEC }); res.end(OPS_HTML); return true; }
      const t = Date.now(); opsTries = opsTries.filter(x => t - x.t < 900_000);
      if (opsTries.filter(x => x.ip === ip).length >= 8) return json(res, 429, { error: 'Too many wrong tries.' }, SEC), true;
      const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), h = s => crypto.createHash('sha256').update(String(s)).digest();
      if (!given || !crypto.timingSafeEqual(h(given), h(cfg.opsToken))) { opsTries.push({ ip, t }); auth.audit('ops-login', ip, false); return json(res, 401, { error: 'Wrong key.' }, SEC), true; }
      auth.audit('ops-report', ip, true);
      json(res, 200, { ...(await opsReport({ cfg, auth, shop, privacy, weborders, store, smtpMeta, ig, analytics, ops, reportState, social, wa })), watch: watchRead() }, SEC); return true;
    }
    // ---------- the new owner look, next to the classic one: the very same app and the same sign-in, only the look differs (class "ui2") ----------
    if (route === 'GET /admin2' || route === 'GET /admin2/') {
      const f = path.join(ROOT, 'public', 'admin.html'); if (!fs.existsSync(f)) return json(res, 404, { error: 'admin.html is not built yet (run tools/build-split.py)' }, SEC), true;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP, ...SEC }); res.end(fs.readFileSync(f, 'utf8').replace('<html lang="en">', '<html lang="en" class="ui2">')); return true;
    }
    // ---------- the admin page ----------
    if (route === 'GET /admin' || route === 'GET /admin/') {
      const f = path.join(ROOT, 'public', 'admin.html'); if (!fs.existsSync(f)) return json(res, 404, { error: 'admin.html is not built yet (run tools/build-split.py)' }, SEC), true;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP, ...SEC }); res.end(fs.readFileSync(f)); return true;
    }
    // ---------- public, read-only ----------
    if (route === 'GET /public/shop') {
      const o = req.headers.origin, allow = o && cfg.allowedOrigins.includes(o) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {}; const g = shop.get();
      json(res, 200, { version: g.version, empty: !g.db, ...publicView(g.db) }, { 'Cache-Control': 'public, max-age=15', 'X-Content-Type-Options': 'nosniff', ...allow }); return true;
    }
    let m = /^GET \/media\/([0-9a-f]{32})\.jpg$/.exec(route);
    if (m) { const b = media.read(m[1]); if (!b) return json(res, 404, { error: 'not found' }), true; res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' }); res.end(b); return true; }
    m = /^GET \/media\/([0-9a-f]{32})\.mp4$/.exec(route);
    if (m) {
      const f = media.path(m[1], 'mp4'); if (!f || !fs.existsSync(f)) return json(res, 404, { error: 'not found' }), true;
      const size = fs.statSync(f).size, rg = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || '')), H = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' };
      if (rg && (rg[1] || rg[2])) { let a = rg[1] ? +rg[1] : size - +rg[2], z = rg[1] && rg[2] ? +rg[2] : size - 1; if (a > z || a >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true; } z = Math.min(z, size - 1); res.writeHead(206, { ...H, 'Content-Range': `bytes ${a}-${z}/${size}`, 'Content-Length': z - a + 1 }); fs.createReadStream(f, { start: a, end: z }).pipe(res); return true; }
      res.writeHead(200, { ...H, 'Content-Length': size }); fs.createReadStream(f).pipe(res); return true;
    }
    // ---------- a customer's privacy request (DPDP): reaches the owner as a numbered request with a deadline ----------
    if (route === 'OPTIONS /public/rights' || route === 'POST /public/rights') {
      const o = req.headers.origin, okO = !!o && cfg.allowedOrigins.includes(o), cors = okO ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
      if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400' }); res.end(); return true; }
      if (!okO) return json(res, 403, { error: 'Not allowed from this website.' }), true;
      try {
        let b = {}; try { b = JSON.parse((await readBody(req, 6_000)).toString('utf8') || '{}'); } catch { return json(res, 400, { error: 'Something went wrong. Please try again.' }, cors), true; }
        const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean), ip = xff.length ? xff[xff.length - 1] : ipOf(req), t = privacy.addTicket(b, ip);
        notifyOwner(`New privacy request ${t.id}: ${t.type}`, `A customer sent a privacy request.\n\nRequest: ${t.id} (${t.type})\nFrom: ${t.name}, ${t.contact}\nMessage: ${t.message || '(none)'}\n\nPlease reply by ${t.due.slice(0, 10)}. Open the owner app → Privacy tab.`);
        return json(res, 200, { ok: true, id: t.id, due: t.due }, cors), true;
      } catch (e) { return json(res, [422, 429, 503].includes(e.code) ? e.code : 500, { error: e.code ? e.message : 'Something went wrong. Please try again.' }, cors), true; }
    }
    // ---------- an order placed on the public website ----------
    if (route === 'OPTIONS /public/order' || route === 'POST /public/order') {
      const o = req.headers.origin, okO = !!o && cfg.allowedOrigins.includes(o), cors = okO ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
      if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400' }); res.end(); return true; }
      if (!okO) return json(res, 403, { error: 'Not allowed from this website.' }), true;
      try {
        let b = {}; try { b = JSON.parse((await readBody(req, 160_000)).toString('utf8') || '{}'); } catch { return json(res, 400, { error: 'Something went wrong. Please try again.' }, cors), true; }
        const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean), ip = xff.length ? xff[xff.length - 1] : ipOf(req), r = weborders.add(b, shop.get().db, ip);
        notifyOwner(`New website order ${r.id}: ₹${r.order.total}`, `A customer placed an order on the website.\n\nOrder: ${r.id}\nCustomer: ${r.customer.name}, ${r.customer.phone}\nTotal: ₹${r.order.total}\nItems: ${r.order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}\n${r.check.issues.length ? '\nCheck before accepting:\n- ' + r.check.issues.join('\n- ') + '\n' : ''}\nOpen the owner app → Orders to accept it, then message the customer on WhatsApp to confirm and take payment.`);
        return json(res, 200, { ok: true, id: r.id }, cors), true;
      } catch (e) { return json(res, [422, 429, 503].includes(e.code) ? e.code : 500, { error: e.code ? e.message : 'Something went wrong. Please try again.' }, cors), true; }
    }
    // ---------- website counting (no cookies, nothing personal is stored) ----------
    if (route === 'OPTIONS /public/hit' || route === 'POST /public/hit') {
      const o = req.headers.origin, okO = !!o && cfg.allowedOrigins.includes(o), cors = okO ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
      if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400' }); res.end(); return true; }
      if (!okO) { res.writeHead(403); res.end(); return true; }
      let b = {}; try { b = JSON.parse((await readBody(req, 2_000)).toString('utf8') || '{}'); } catch { /* ignore */ }
      const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean), ip = xff.length ? xff[xff.length - 1] : ipOf(req);   // the address the nearest proxy saw; only used to count a visitor once a day, never stored
      analytics.hit({ type: String(b.t || ''), page: String(b.p || ''), productId: b.id, ref: String(b.r || '').slice(0, 300), utm: b.u, mobile: !!b.m, ua: req.headers['user-agent'], ip, host: (() => { try { return new URL(o).hostname; } catch { return ''; } })() });
      res.writeHead(204, cors); res.end(); return true;
    }
    if (!url.pathname.startsWith('/admin/api/')) return false;

    // ---------- admin API ----------
    const p = url.pathname.slice('/admin/api'.length), read = req.method === 'GET';
    try {
      if (route === 'GET /admin/api/state') { const s = auth.sessionFrom(req); send(res, { code: 200, configured: auth.configured, twoFactor: auth.twoFactorOn, siteUrl: cfg.siteUrl || '', signedIn: !!s, role: s ? s.role || 'owner' : null, user: s ? s.user || 'owner' : null, csrf: s ? s.csrf : null, instagram: !!ig.configured, claude: !!(cfg.anthropicKey && cfg.anthropicKey !== 'missing') }); return true; }
      if (route === 'POST /admin/api/setup') { const b = await body(req, 5_000); const r = auth.setup(b, ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'POST /admin/api/login') {
        if (!/^application\/json/i.test(req.headers['content-type'] || '')) return send(res, { code: 415, error: 'JSON only.' }), true;
        const b = await body(req, 5_000); await new Promise(r => setTimeout(r, cfg.loginDelayMs ?? 350)); const r = auth.login(b, ip, req.headers['user-agent']);
        if (r.code !== 200) return send(res, r), true; send(res, { code: 200, ok: true, csrf: r.csrf }, { 'Set-Cookie': auth.cookie(r.sessionId) }); return true;
      }
      const a = auth.authorize(req, { write: !read, upload: route === 'POST /admin/api/video/upload' }, ip); if (a.code !== 200) return send(res, a), true;
      const who = a.session.user || 'owner', role = a.session.role || 'owner', wrote = (ev, extra = '') => auth.audit(ev, ip, true, (who !== 'owner' ? `[${who}] ` : '') + extra);
      if (role === 'staff' && /^\/admin\/api\/(privacy|email|report|ai-key|import|team|2fa|audit|ops|previews|agents|growth\/(done|plan))/.test(url.pathname)) return send(res, { code: 403, error: 'Only the owner can do this.' }), true;
      if (route === 'POST /admin/api/logout') { auth.logout(req, ip); send(res, { code: 200, ok: true }, { 'Set-Cookie': auth.clearCookie() }); return true; }

      if (route === 'GET /admin/api/db') { const g = shop.get(); send(res, { code: 200, version: g.version, db: g.db }); return true; }
      if (route === 'PUT /admin/api/db') { const b = await body(req, 30_000_000); const r = shop.put(b.db, Number(b.baseVersion)); if (r.code === 200) wrote('save', `v${r.version}${r.merged ? ' merged' : ''}`); send(res, r); return true; }
      if (route === 'GET /admin/api/version') { send(res, { code: 200, version: shop.get().version }); return true; }
      if (route === 'POST /admin/api/import') { const b = await body(req, 30_000_000); const again = b.db && typeof b.db === 'object' ? privacy.applyErasures(b.db) : 0, r = shop.importAll(b.db); if (r.code === 200) { wrote('import', again ? `${again} erased customer(s) removed again` : ''); r.erasedAgain = again; } send(res, r); return true; }
      if (route === 'POST /admin/api/password') { const r = auth.changePassword(await body(req, 5_000), req, ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'POST /admin/api/2fa/start') { send(res, auth.twoFactorStart(await body(req, 5_000), ip)); return true; }
      if (route === 'POST /admin/api/2fa/confirm') { const r = auth.twoFactorConfirm(await body(req, 5_000), ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'POST /admin/api/2fa/off') { const r = auth.twoFactorOff(await body(req, 5_000), ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'GET /admin/api/ops') { send(res, { code: 200, ...(await opsReport({ cfg, auth, shop, privacy, weborders, store, smtpMeta, ig, analytics, ops, reportState, social, wa })), watch: watchRead() }); return true; }
      if (route === 'GET /admin/api/agents/ops-watch') { send(res, { code: 200, last: watchRead() }); return true; }
      if (route === 'POST /admin/api/agents/ops-watch/run') { const t = Date.now(); if (watchTries.length && t - watchTries[watchTries.length - 1] < 20_000) return send(res, { code: 429, error: 'Please wait a few seconds.' }), true; watchTries.push(t); watchTries = watchTries.slice(-5); wrote('ops-watch'); send(res, { code: 200, last: await watchRun(true) }); return true; }
      if (route === 'GET /admin/api/previews') { send(res, { code: 200, previews: previewsOf({ cfg, ig, social, analytics, store, wa }).previews }); return true; }
      if (route === 'GET /admin/api/audit') { send(res, { code: 200, events: auth.auditTail(100) }); return true; }

      // ---------- Instagram ----------
      if (route === 'GET /admin/api/social/status') { send(res, { code: 200, connected: ig.configured, account: mask(cfg.ig.userId), httpsOk: /^https:\/\//.test(cfg.payments.publicUrl || ''), postedToday: social.postedToday(), dailyCap: cfg.ig.dailyCap, jobs: social.list() }); return true; }
      if (route === 'POST /admin/api/social/media') { const b = await body(req, 12_000_000); const r = media.save(b.dataUrl); send(res, { code: 200, id: r.id }); return true; }
      if (route === 'POST /admin/api/video/upload') { const r = await videos.upload(req); const job = videos.start(r.id, r); wrote('video-upload', `${Math.round(r.bytes / 1e6)}MB ${Math.round(r.duration)}s`); send(res, { code: 200, id: r.id, jobId: job.id, duration: r.duration, width: r.width, height: r.height, bytes: r.bytes }); return true; }
      if (route === 'GET /admin/api/video/job') { const j = videos.job(url.searchParams.get('id')); if (!j) return send(res, { code: 404, error: 'Not found.' }), true; send(res, { code: 200, state: j.state, progress: j.progress, error: j.error, result: j.result }); return true; }
      if (route === 'POST /admin/api/video/review') {
        const b = await body(req, 2_000), j = [...videos.jobs.values()].find(x => x.videoId === String(b.id || '') && x.state === 'done'); if (!j) return send(res, { code: 404, error: 'Analyse the video first.' }), true;
        if (!cfg.anthropicKey || cfg.anthropicKey === 'missing') return send(res, { code: 503, error: 'Add your Claude key (Settings → Security & backup) to get a review of the frames.' }), true;
        const now = Date.now(); reviewTries = reviewTries.filter(t => now - t < 60_000); if (reviewTries.length >= 6) return send(res, { code: 429, error: 'Too many tries. Wait a minute.' }), true; reviewTries.push(now);
        try { const r = await runAi({ cfg, client, task: 'videoreview', input: { images: j.result.frames, facts: j.result.facts } }); send(res, { code: 200, review: r.data }); } catch (e) { send(res, { code: [400, 413, 422].includes(e.code) ? e.code : 502, error: e.message }); } return true;
      }
      if (route === 'GET /admin/api/growth') { const q = url.searchParams.get('period'), d = ['thismonth', 'lastmonth'].includes(q) ? q : [7, 30, 90].includes(+url.searchParams.get('days')) ? +url.searchParams.get('days') : 7, r = await growth.build(d, url.searchParams.get('fresh') === '1'); send(res, { code: 200, ...r }); return true; }
      if (route === 'POST /admin/api/growth/plan') { const b = await body(req, 1_000), d = ['thismonth', 'lastmonth'].includes(b.days) ? b.days : [7, 30, 90].includes(+b.days) ? +b.days : 7, r = await growth.build(d, false); send(res, { code: 200, ...(await growth.plan(r)) }); return true; }
      if (route === 'POST /admin/api/growth/done') { const b = await body(req, 1_000), d = ['thismonth', 'lastmonth'].includes(b.days) ? b.days : [7, 30, 90].includes(+b.days) ? +b.days : 7, r = await growth.build(d, false), a = r.actions.find(x => x.id === String(b.id || '')); if (!a) return send(res, { code: 404, error: 'That suggestion is no longer in the list.' }), true; analytics.markDone({ id: a.id, title: a.title, metric: a.metric, baseline: a.baseline }); analytics.save(); wrote('growth-done', a.id); send(res, { code: 200, ok: true }); return true; }
      if (route === 'GET /admin/api/email') { send(res, { code: 200, ...smtpMeta(), lastReport: reportState(), prefs: prefs() }); return true; }
      if (route === 'POST /admin/api/email') { const now = Date.now(); emailTries = emailTries.filter(t => now - t < 60_000); if (emailTries.length >= 8) return send(res, { code: 429, error: 'Too many tries. Wait a minute.' }), true; emailTries.push(now); await smtpSave(await body(req, 3_000)); wrote('email-set'); send(res, { code: 200, ...smtpMeta() }); return true; }
      if (route === 'POST /admin/api/email/remove') { smtpRemove(); wrote('email-removed'); send(res, { code: 200, ...smtpMeta() }); return true; }
      if (route === 'POST /admin/api/email/test') { await smtpSendTest(); wrote('email-test'); send(res, { code: 200, ok: true }); return true; }
      if (route === 'POST /admin/api/report/prefs') { const b = await body(req, 500); savePrefs(b); wrote('report-prefs'); send(res, { code: 200, prefs: prefs() }); return true; }
      if (route === 'POST /admin/api/report/send') { const b = await body(req, 500), kind = ['weekly', 'monthly', 'daily'].includes(b.kind) ? b.kind : 'weekly', r = await growth.mail(kind, true); wrote('report-sent', kind); send(res, { code: 200, ok: true, ...r }); return true; }
      if (route === 'GET /admin/api/report/preview') { const k = url.searchParams.get('kind'); send(res, { code: 200, ...(await growth.preview(['weekly', 'monthly', 'daily'].includes(k) ? k : 'weekly')) }); return true; }
      if (route === 'GET /admin/api/team') { send(res, { code: 200, team: auth.teamList() }); return true; }
      if (route === 'POST /admin/api/team/add') { const r = auth.teamAdd(await body(req, 1_000), ip); send(res, r.code === 200 ? { code: 200, team: auth.teamList() } : r); return true; }
      if (route === 'POST /admin/api/team/remove') { const r = auth.teamRemove(await body(req, 500), ip); send(res, r.code === 200 ? { code: 200, team: auth.teamList() } : r); return true; }
      if (route === 'POST /admin/api/team/password') { const r = auth.teamPassword(await body(req, 1_000), ip); send(res, r.code === 200 ? { code: 200 } : r); return true; }
      if (route === 'GET /admin/api/web-orders') { send(res, { code: 200, orders: weborders.list().slice(0, 100) }); return true; }
      if (route === 'POST /admin/api/web-orders/update') { const b = await body(req, 2_000), r = weborders.update(b.id, b); wrote('web-order', `${r.id} ${r.status}`); send(res, { code: 200, order: r }); return true; }
      if (route === 'GET /admin/api/privacy') { send(res, { code: 200, tickets: privacy.tickets(), breaches: privacy.breaches().map(b => ({ ...b, notices: breachNotices(b, (shop.get().db || {}).settings || {}) })), retention: { ...cfg.privacy, ...privacy.state() }, erasedCount: privacy.erasedCount(), channels: Object.entries(CHANNELS).map(([k, v]) => ({ k, v })), twoFactor: auth.twoFactorOn, claude: !!cfg.anthropicKey && cfg.anthropicKey !== 'missing', email: smtpMeta().configured, ig: ig.configured }); return true; }
      if (route === 'POST /admin/api/privacy/ticket') { const b = await body(req, 3_000); const t = privacy.updateTicket(b.id, b); wrote('privacy-ticket', `${t.id} ${t.status}`); send(res, { code: 200, ticket: t }); return true; }
      if (route === 'POST /admin/api/privacy/breach') { const b = await body(req, 4_000), r = b.id ? privacy.updateBreach(b.id, b) : privacy.addBreach(b); wrote('privacy-breach', r.id); send(res, { code: 200, breach: { ...r, notices: breachNotices(r, (shop.get().db || {}).settings || {}) } }); return true; }
      if (route === 'POST /admin/api/privacy/verify-start') { const b = await body(req, 500), code = privacy.codeStart(b.phone), ok = await sendCode(b.phone, code); wrote('privacy-verify-start', ok ? 'sent' : 'not sent'); send(res, { code: 200, sent: ok, error: ok ? '' : 'WhatsApp is not connected, so a code cannot be sent. Check who it is another way.' }); return true; }
      if (route === 'POST /admin/api/privacy/verify') { const b = await body(req, 1_000), r = b.method === 'code-on-whatsapp' ? privacy.codeCheck(b.phone, b.code) : privacy.verifyManual(b.phone, b.method, b.note); wrote('privacy-verify', r.method); send(res, { code: 200, ...r }); return true; }
      if (route === 'POST /admin/api/privacy/access') { const b = await body(req, 1_000); if (String(b.phone || '').replace(/\D/g, '').length < 7) return send(res, { code: 422, error: 'Enter the phone number.' }), true; if (!privacy.isVerified(b.phone)) return send(res, { code: 403, error: 'Check who is asking first (Verify who it is).' }), true; const r = Privacy.accessFromStore(store, b.phone); if (!r) return send(res, { code: 422, error: 'Enter the phone number.' }), true; r.websiteOrders = weborders.accessByPhone(b.phone); wrote('privacy-access'); send(res, { code: 200, data: r }); return true; }
      if (route === 'POST /admin/api/privacy/erase') { const b = await body(req, 1_000); if (String(b.phone || '').replace(/\D/g, '').length < 7) return send(res, { code: 422, error: 'Enter the phone number.' }), true; if (!privacy.isVerified(b.phone)) return send(res, { code: 403, error: 'Check who is asking first (Verify who it is).' }), true; const r = Privacy.eraseFromStore(store, b.phone); if (!r) return send(res, { code: 422, error: 'Enter the phone number.' }), true; r.websiteOrders = weborders.eraseByPhone(b.phone); privacy.erasedAdd(b.phone); wrote('privacy-erase'); send(res, { code: 200, erased: r }); return true; }
      if (route === 'POST /admin/api/privacy/ticket-new') { const b = await body(req, 3_000), t = privacy.addTicket(b, '', { manual: true }); wrote('privacy-ticket-new', `${t.id} ${t.channel}`); send(res, { code: 200, ticket: t }); return true; }
      if (route === 'GET /admin/api/privacy/summary') { const at = privacy.attention(5); send(res, { code: 200, open: at.open, late: at.late.length, soon: at.soon.length, email: smtpMeta().configured }); return true; }
      if (route === 'POST /admin/api/privacy/sweep') { const r = runSweep(); wrote('privacy-sweep'); send(res, { code: 200, erased: r }); return true; }
      if (route === 'POST /admin/api/privacy/log') { const b = await body(req, 500); if (['customers-viewed', 'customer-exported', 'backup-downloaded', 'customer-erased'].includes(b.event)) wrote('pii-' + b.event); send(res, { code: 200, ok: true }); return true; }
      if (route === 'POST /admin/api/social/plan') {
        const b = await body(req, 20_000), now = Date.now(), existing = social.s.jobs.filter(j => j.status === 'queued').map(j => j.when), input = { ...(b.product || {}), nowIso: istIso(now), existing };
        let plan, via = 'built-in';
        if (cfg.anthropicKey && cfg.anthropicKey !== 'missing') { try { plan = cleanPlan((await runAi({ cfg, client, task: 'postplan', input })).data, { now, existing }); via = 'claude'; if (plan.slots.length < 3 || !plan.caption) { const lp = localPlan(input, { now, existing: [...existing, ...plan.slots.map(s => s.iso)] }); plan.slots = [...plan.slots, ...lp.slots].slice(0, 3); plan.caption = plan.caption || lp.caption; if (!plan.hashtags.length) plan.hashtags = lp.hashtags; } } catch (e) { plan = null; } }
        if (!plan) plan = localPlan(input, { now, existing }); send(res, { code: 200, via, ...plan }); return true;
      }
      if (route === 'POST /admin/api/social/post') {
        const b = await body(req, 20_000); if (!ig.configured) return send(res, { code: 503, error: 'Instagram is not connected on the server yet.' }), true;
        let vid = { videoId: b.videoId, coverId: b.coverId }; if (b.kind === 'reel' && b.analysedId) vid = videos.promote(String(b.analysedId), b.coverIndex);
        const job = social.add({ kind: b.kind === 'reel' ? 'reel' : 'photo', videoId: vid.videoId, coverId: vid.coverId, mediaIds: b.mediaIds, caption: b.caption, when: b.when === 'now' ? 'now' : String(b.when || ''), productId: b.productId, productName: b.productName }); wrote('ig-queue', job.id);
        if (b.when === 'now') await social.postNow(job.id); send(res, { code: 200, job }); return true;
      }
      if (route === 'POST /admin/api/social/cancel') { const r = social.cancel(String((await body(req, 2_000)).id)); if (r.code === 200) wrote('ig-cancel', r.job.id); send(res, r); return true; }
      if (route === 'POST /admin/api/social/now') { const b = await body(req, 2_000); const r = await social.postNow(String(b.id)); if (r.code === 200) wrote('ig-now', b.id); send(res, r); return true; }
      if (route === 'POST /admin/api/social/retry') { const b = await body(req, 2_000), r = social.retry(String(b.id), !!b.force); if (r.code === 200) { wrote('ig-retry', r.job.id); await social.postNow(r.job.id); } send(res, r); return true; }
      if (route === 'GET /admin/api/ai-key') { send(res, { code: 200, ...aiKey.meta() }); return true; }
      if (route === 'POST /admin/api/ai-key') {
        const now = Date.now(); keyTries = keyTries.filter(t => now - t < 60_000); if (keyTries.length >= 5) return send(res, { code: 429, error: 'Too many tries. Wait a minute.' }), true; keyTries.push(now);
        const b = await body(req, 2_000); await aiKey.set(String(b.key || '').trim()); wrote('ai-key-set'); send(res, { code: 200, ...aiKey.meta() }); return true;
      }
      if (route === 'POST /admin/api/ai-key/remove') { aiKey.remove(); wrote('ai-key-removed'); send(res, { code: 200, ...aiKey.meta() }); return true; }
      if (route === 'POST /admin/api/notify-tracking') {
        const b = await body(req, 4_000), id = String(b.orderId || '').slice(0, 60), trackingNo = String(b.trackingNo || '').slice(0, 60), phone = String(b.phone || '').replace(/\D/g, '');
        if (!id || phone.length < 10 || phone.length > 15) return send(res, { code: 422, error: 'A valid order id and phone number are needed.' }), true;
        const r = await notifyTracking({ orderId: id, trackingNo, phone, customer: String(b.customer || '').slice(0, 80), courier: String(b.courier || '').slice(0, 60), trackingUrl: /^https?:\/\//i.test(b.trackingUrl || '') ? String(b.trackingUrl).slice(0, 300) : '', resend: !!b.resend });
        if (r.sent) wrote('tracking-msg', id); send(res, { code: 200, ...r }); return true;
      }
      return send(res, { code: 404, error: 'not found' }), true;
    } catch (e) { send(res, { code: [400, 404, 413, 415, 422, 429].includes(e.code) ? e.code : e.smtpUser ? 422 : 500, error: (e.code && e.code < 500) || e.smtpUser ? e.message : 'Something went wrong.' }); return true; }
  };
}
