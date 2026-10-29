// Routes for the separate owner app (/admin) and the public read-only shop data (/public/shop).
//   /admin            the admin page (login screen first)           no data inside
//   /admin/api/*      everything the owner does                    session cookie + CSRF header, same-origin only
//   /public/shop      what the public website may see              read-only, no secrets
//   /media/<id>.jpg   photos Instagram fetches                     unguessable addresses
import fs from 'node:fs';
import path from 'node:path';
import { publicView } from './shopdata.mjs';
import { runAi, cleanPlan, localPlan, istIso } from './aihelper.mjs';

export function adminRoutes({ cfg, auth, shop, media, social, ig, client, json, readBody, ROOT }) {
  const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin', 'Cache-Control': 'no-store', ...(auth.secure ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}) };
  const CSP = "default-src 'none'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
  const ipOf = req => String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');   // never trust X-Forwarded-For for security decisions
  const send = (res, r, extra = {}) => json(res, r.code || 200, r.code && r.code >= 400 ? { error: r.error, retryAfter: r.retryAfter } : r, { ...SEC, ...extra });
  const body = async (req, limit = 200_000) => { try { return JSON.parse((await readBody(req, limit)).toString('utf8') || '{}'); } catch (e) { throw Object.assign(new Error(e.code === 413 ? 'Too large.' : 'Bad request.'), { code: e.code === 413 ? 413 : 400 }); } };
  const mask = s => s ? s.slice(0, 3) + '…' + s.slice(-3) : '';

  return async function handle(req, res, url, route) {
    const ip = ipOf(req);
    if (cfg.adminAllowedIps && cfg.adminAllowedIps.length && (route === 'GET /admin' || route === 'GET /admin/' || url.pathname.startsWith('/admin/api/')) && !cfg.adminAllowedIps.includes(ip)) { json(res, 404, { error: 'not found' }, SEC); return true; }   // optional: only these addresses can even see the owner app
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
    if (!url.pathname.startsWith('/admin/api/')) return false;

    // ---------- admin API ----------
    const p = url.pathname.slice('/admin/api'.length), read = req.method === 'GET';
    try {
      if (route === 'GET /admin/api/state') { const s = auth.sessionFrom(req); send(res, { code: 200, configured: auth.configured, twoFactor: auth.twoFactorOn, signedIn: !!s, csrf: s ? s.csrf : null, instagram: !!ig.configured, claude: !!(cfg.anthropicKey && cfg.anthropicKey !== 'missing') }); return true; }
      if (route === 'POST /admin/api/setup') { const b = await body(req, 5_000); const r = auth.setup(b, ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'POST /admin/api/login') {
        if (!/^application\/json/i.test(req.headers['content-type'] || '')) return send(res, { code: 415, error: 'JSON only.' }), true;
        const b = await body(req, 5_000); await new Promise(r => setTimeout(r, cfg.loginDelayMs ?? 350)); const r = auth.login(b, ip, req.headers['user-agent']);
        if (r.code !== 200) return send(res, r), true; send(res, { code: 200, ok: true, csrf: r.csrf }, { 'Set-Cookie': auth.cookie(r.sessionId) }); return true;
      }
      const a = auth.authorize(req, { write: !read }, ip); if (a.code !== 200) return send(res, a), true;
      const wrote = (ev, extra = '') => auth.audit(ev, ip, true, extra);
      if (route === 'POST /admin/api/logout') { auth.logout(req, ip); send(res, { code: 200, ok: true }, { 'Set-Cookie': auth.clearCookie() }); return true; }

      if (route === 'GET /admin/api/db') { const g = shop.get(); send(res, { code: 200, version: g.version, db: g.db }); return true; }
      if (route === 'PUT /admin/api/db') { const b = await body(req, 30_000_000); const r = shop.put(b.db, Number(b.baseVersion)); if (r.code === 200) wrote('save', `v${r.version}${r.merged ? ' merged' : ''}`); send(res, r); return true; }
      if (route === 'GET /admin/api/version') { send(res, { code: 200, version: shop.get().version }); return true; }
      if (route === 'POST /admin/api/import') { const b = await body(req, 30_000_000); const r = shop.importAll(b.db); if (r.code === 200) wrote('import'); send(res, r); return true; }
      if (route === 'POST /admin/api/password') { const r = auth.changePassword(await body(req, 5_000), req, ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'POST /admin/api/2fa/start') { send(res, auth.twoFactorStart(await body(req, 5_000), ip)); return true; }
      if (route === 'POST /admin/api/2fa/confirm') { const r = auth.twoFactorConfirm(await body(req, 5_000), ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'POST /admin/api/2fa/off') { const r = auth.twoFactorOff(await body(req, 5_000), ip); send(res, r.code === 200 ? { code: 200, ok: true } : r); return true; }
      if (route === 'GET /admin/api/audit') { send(res, { code: 200, events: auth.auditTail(100) }); return true; }

      // ---------- Instagram ----------
      if (route === 'GET /admin/api/social/status') { send(res, { code: 200, connected: ig.configured, account: mask(cfg.ig.userId), httpsOk: /^https:\/\//.test(cfg.payments.publicUrl || ''), postedToday: social.postedToday(), dailyCap: cfg.ig.dailyCap, jobs: social.list() }); return true; }
      if (route === 'POST /admin/api/social/media') { const b = await body(req, 12_000_000); const r = media.save(b.dataUrl); send(res, { code: 200, id: r.id }); return true; }
      if (route === 'POST /admin/api/social/plan') {
        const b = await body(req, 20_000), now = Date.now(), existing = social.s.jobs.filter(j => j.status === 'queued').map(j => j.when), input = { ...(b.product || {}), nowIso: istIso(now), existing };
        let plan, via = 'built-in';
        if (cfg.anthropicKey && cfg.anthropicKey !== 'missing') { try { plan = cleanPlan((await runAi({ cfg, client, task: 'postplan', input })).data, { now, existing }); via = 'claude'; if (plan.slots.length < 3 || !plan.caption) { const lp = localPlan(input, { now, existing: [...existing, ...plan.slots.map(s => s.iso)] }); plan.slots = [...plan.slots, ...lp.slots].slice(0, 3); plan.caption = plan.caption || lp.caption; if (!plan.hashtags.length) plan.hashtags = lp.hashtags; } } catch (e) { plan = null; } }
        if (!plan) plan = localPlan(input, { now, existing }); send(res, { code: 200, via, ...plan }); return true;
      }
      if (route === 'POST /admin/api/social/post') {
        const b = await body(req, 20_000); if (!ig.configured) return send(res, { code: 503, error: 'Instagram is not connected on the server yet.' }), true;
        const job = social.add({ mediaIds: b.mediaIds, caption: b.caption, when: b.when === 'now' ? 'now' : String(b.when || ''), productId: b.productId, productName: b.productName }); wrote('ig-queue', job.id);
        if (b.when === 'now') await social.postNow(job.id); send(res, { code: 200, job }); return true;
      }
      if (route === 'POST /admin/api/social/cancel') { const r = social.cancel(String((await body(req, 2_000)).id)); if (r.code === 200) wrote('ig-cancel', r.job.id); send(res, r); return true; }
      if (route === 'POST /admin/api/social/now') { const b = await body(req, 2_000); const r = await social.postNow(String(b.id)); if (r.code === 200) wrote('ig-now', b.id); send(res, r); return true; }
      if (route === 'POST /admin/api/social/retry') { const b = await body(req, 2_000), r = social.retry(String(b.id), !!b.force); if (r.code === 200) { wrote('ig-retry', r.job.id); await social.postNow(r.job.id); } send(res, r); return true; }
      return send(res, { code: 404, error: 'not found' }), true;
    } catch (e) { send(res, { code: [400, 413, 415, 422].includes(e.code) ? e.code : 500, error: e.code && e.code < 500 ? e.message : 'Something went wrong.' }); return true; }
  };
}
