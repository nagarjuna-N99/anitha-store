import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadConfig, ROOT } from './src/config.mjs';
import { clientIp } from './src/clientip.mjs';
import { createSiteHost } from './src/sitehost.mjs';
import { Store } from './src/store.mjs';
import { WhatsApp, verifySignature, parseWebhook } from './src/whatsapp.mjs';
import { Pipeline } from './src/pipeline.mjs';
import { makeClient } from './src/assistant.mjs';
import { syncCart, runReminders, cartStats, validPhone, digits } from './src/carts.mjs';
import { Catalogue } from './src/catalogue.mjs';
import { makeProvider } from './src/payments.mjs';
import { Orders, PAID_STATES } from './src/orders.mjs';
import { buildInvoicePdf, packingSlipHtml } from './src/invoice.mjs';
import { trackPageHtml } from './src/trackpage.mjs';
import { runAi } from './src/aihelper.mjs';
import { AdminAuth } from './src/adminauth.mjs';
import { ShopData } from './src/shopdata.mjs';
import { MediaStore } from './src/media.mjs';
import { IgClient, SocialQueue } from './src/instagram.mjs';
import { adminRoutes } from './src/adminroutes.mjs';
import { SecretStore } from './src/secrets.mjs';
import { VideoLab } from './src/video.mjs';
import { Analytics, istDay } from './src/analytics.mjs';
import { Privacy, breachNotices } from './src/privacy.mjs';
import { WebOrders } from './src/weborders.mjs';
import { collect, renderEmail, localPlan } from './src/report.mjs';
import { smtpSend, smtpVerify, emailOk } from './src/mailer.mjs';
import { Ops, opsReport } from './src/ops.mjs';
import { writeWatch, WatchStore, attention } from './src/agents.mjs';

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

export function createApp(overrides = {}, deps = {}) {
  const cfg = loadConfig(overrides);
  const store = deps.store || new Store(cfg.dataDir);
  const wa = deps.wa || new WhatsApp(cfg, deps.fetch);
  const client = deps.client || makeClient(cfg);
  // The owner can paste the Anthropic key in the owner app (Security & backup). It is stored encrypted and wins over the environment value.
  const secrets = deps.secrets || new SecretStore(cfg.dataDir, cfg.adminSetupToken || '');
  const envKey = cfg.anthropicKey, applyKey = k => { cfg.anthropicKey = k; try { client.apiKey = k || 'missing'; } catch {} };
  { const saved = secrets.get('anthropic'); if (saved) applyKey(saved); }
  const defaultTestKey = async key => {
    try { await makeClient({ ...cfg, anthropicKey: key }).messages.create({ model: cfg.model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }); }
    catch (e) { if (e && [401, 403].includes(e.status)) throw Object.assign(new Error('Anthropic did not accept this key. Check that you copied all of it.'), { code: 422 }); if (e && [404, 429, 529].includes(e.status)) return; throw Object.assign(new Error('Could not check the key right now (' + (e && e.message || 'network') + '). Try again in a minute.'), { code: 422 }); }
  };
  const aiKey = {
    meta: () => { const m = secrets.meta('anthropic'), have = !!cfg.anthropicKey && cfg.anthropicKey !== 'missing'; return { set: have, source: m.set && have ? 'owner' : have ? 'server' : 'none', last4: have ? (m.set ? m.last4 : String(envKey || '').slice(-4)) : '', updatedAt: m.updatedAt || null }; },
    set: async key => { if (!/^sk-ant-[A-Za-z0-9_\-]{20,300}$/.test(key)) throw Object.assign(new Error('That does not look like an Anthropic key. It starts with sk-ant-'), { code: 422 }); await (deps.testKey || defaultTestKey)(key); secrets.set('anthropic', key); applyKey(key); },
    remove: () => { secrets.remove('anthropic'); applyKey(envKey); },
  };
  let aiHits = [];
  const auth = deps.auth || new AdminAuth({ dir: cfg.dataDir, setupToken: cfg.adminSetupToken, secureCookie: cfg.cookieSecure, ...(deps.authOpts || {}) });
  const shop = deps.shop || new ShopData(cfg.dataDir), media = deps.media || new MediaStore(cfg.dataDir), ig = deps.ig || new IgClient(cfg, deps.fetch);
  const videos = deps.videos || new VideoLab({ dir: cfg.dataDir, media });
  const weborders = deps.weborders || new WebOrders(cfg.dataDir, deps.now);
  const ops = new Ops();
  const privacy = deps.privacy || new Privacy(cfg.dataDir, deps.now);
  const analytics = deps.analytics || new Analytics(cfg.dataDir, deps.now);
  const social = deps.social || new SocialQueue({ dir: cfg.dataDir, ig, media, cfg, now: deps.now });
  const waSink = { send: (to, m) => m.type === 'image' ? wa.sendImage(to, m.url, m.caption) : m.type === 'document' ? wa.sendDocument(to, m.url, m.filename, m.caption) : m.type === 'buttons' ? wa.sendButtons(to, m.text, m.buttons) : wa.sendText(to, m.text) };
  const pipeline = new Pipeline({ cfg, store, client, wa, defaultSink: waSink });
  const provider = deps.provider || makeProvider(cfg, deps.fetch);
  const orders = new Orders({ cfg, store, provider, say: (...a) => pipeline.sendSmart(...a), alertOwner: e => pipeline.notifyOwner(e, e.conv.phone.startsWith('test-')), makeCatalogue: () => pipeline.catalogue(), fetchImpl: deps.fetch });
  pipeline.orders = orders;
  pipeline.privacy = privacy; pipeline.onPrivacy = t => notifyOwnerMail(`New privacy request ${t.id}: ${t.type}`, `A customer asked on WhatsApp.\n\nRequest: ${t.id} (${t.type})\nFrom: ${t.name}, ${t.contact}\nMessage: ${t.message}\n\nPlease reply by ${t.due.slice(0, 10)}. Open the owner app → Privacy tab.`);
  // Payment provider notifications. The signature is ALWAYS checked: an unsigned "paid" message can never mark an order paid.
  const onPaymentWebhook = async (raw, headers) => {
    if (!provider.verifyWebhook(raw, headers)) return 401;
    let body; try { body = JSON.parse(raw.toString('utf8')); } catch { return 400; }
    const evt = provider.parseEvent(body, headers); if (evt) await orders.handleEvent(evt); return 200;
  };
  const cartRate = new Map();
  const fetchFn = deps.fetch || fetch;
  // Asks the store's login service whether this phone+token is genuine. Dry-run (no WhatsApp keys) accepts, for local testing only.
  const verifyCustomer = async (phone, token) => {
    if (cfg.customerTokenCheckUrl) {
      try { const r = await fetchFn(cfg.customerTokenCheckUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, token }) }); const j = await r.json().catch(() => ({})); return r.ok && j.ok === true; } catch { return false; }
    }
    return !cfg.waLive;
  };

  const json = (res, code, obj, extra = {}) => { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }); res.end(b); };
  const readBody = (req, limit) => new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(Object.assign(new Error('Body too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject);
  });
  const sessionAdmin = req => auth.authorize(req, { write: req.method !== 'GET' && req.method !== 'HEAD' }, clientIp(req, cfg.trustProxy)).code === 200;
  const isAdmin = req => isAdminToken(req) || sessionAdmin(req);
  const isAdminToken = req => { const h = req.headers.authorization || ''; return !!cfg.adminToken && cfg.adminToken.length >= 12 && h.startsWith('Bearer ') && safeEq(h.slice(7), cfg.adminToken); };
  const cors = req => {
    const o = req.headers.origin;
    return o && cfg.allowedOrigins.includes(o) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } : {};
  };
  const page = (res, name) => {
    const f = path.join(ROOT, 'public', name);
    if (!fs.existsSync(f)) return json(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'" });
    res.end(fs.readFileSync(f));
  };

  const cleanCatalogue = body => {
    if (!body || !Array.isArray(body.products)) throw Object.assign(new Error('products[] missing'), { code: 400 });
    const num = v => Number.isFinite(+v) ? +v : 0, str = (v, n = 600) => String(v ?? '').slice(0, n), http = u => /^https?:\/\//i.test(u || '') ? String(u).slice(0, 500) : '';
    const products = body.products.slice(0, 2000).map(p => ({
      id: str(p.id, 60), name: str(p.name, 120), sku: str(p.sku, 60), category: str(p.category, 60), fabric: str(p.fabric, 60),
      colours: (Array.isArray(p.colours) ? p.colours : []).slice(0, 8).map(c => str(c, 30)), price: num(p.price), stock: Math.max(0, Math.floor(num(p.stock))),
      type: p.type === 'accessory' ? 'accessory' : 'saree', description: str(p.description, 900), tags: (Array.isArray(p.tags) ? p.tags : []).slice(0, 15).map(t => str(t, 40)),
      image: http(p.image), images: (Array.isArray(p.images) ? p.images : []).map(http).filter(Boolean).slice(0, 5), link: http(p.link), slug: str(p.slug, 100),
    })).filter(p => p.id && p.name);
    const P = body.policies || {}, S = body.shop || {}, PR = body.pricing || {};
    const coupons = (Array.isArray(body.coupons) ? body.coupons : []).slice(0, 200).map(c => ({
      code: String(c.code || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30), type: c.type === 'flat' ? 'flat' : 'percent', discount: Math.max(0, num(c.discount)), active: c.active !== false,
      description: str(c.description, 120), minOrder: Math.max(0, num(c.minOrder)), expiresAt: /^\d{4}-\d{2}-\d{2}$/.test(c.expiresAt || '') ? c.expiresAt : '', maxUses: Math.max(0, Math.floor(num(c.maxUses))),
      oncePerCustomer: !!c.oncePerCustomer, firstOrderOnly: !!c.firstOrderOnly, announce: !!c.announce, channel: ['store', 'whatsapp'].includes(c.channel) ? c.channel : 'all' })).filter(c => c.code && c.discount > 0 && (c.type === 'flat' || c.discount <= 100));
    const D = body.delivery && typeof body.delivery === 'object' ? body.delivery : null, days = (v, d) => Math.min(60, Math.max(0, Math.floor(num(v ?? d))));
    const delivery = D ? { processingDays: days(D.processingDays, 2), blockedPincodes: str(D.blockedPincodes, 2000), zones: (Array.isArray(D.zones) ? D.zones : []).slice(0, 30).map(z => ({ name: str(z.name, 60), states: (Array.isArray(z.states) ? z.states : []).slice(0, 40).map(x => str(x, 40)), minDays: days(z.minDays, 3), maxDays: days(z.maxDays, 6), serviceable: z.serviceable !== false })), fallback: { name: str(D.fallback?.name || 'Rest of India', 60), minDays: days(D.fallback?.minDays, 5), maxDays: days(D.fallback?.maxDays, 8), serviceable: D.fallback?.serviceable !== false } } : undefined;
    const giftWrapFee = Math.min(5000, Math.max(0, Math.floor(num(body.giftWrapFee))));
    const usageIn = body.couponUsage && typeof body.couponUsage === 'object' ? body.couponUsage : {};
    const couponUsage = Object.fromEntries(Object.entries(usageIn).slice(0, 200).map(([k, v]) => [String(k).toUpperCase().slice(0, 30), { total: Math.max(0, Math.floor(num(v?.total))), phones: (Array.isArray(v?.phones) ? v.phones : []).slice(0, 5000).map(x => String(x).replace(/\D/g, '').slice(-10)).filter(x => x.length === 10) }]));
    const pastBuyers = (Array.isArray(body.pastBuyers) ? body.pastBuyers : []).slice(0, 20000).map(x => String(x).replace(/\D/g, '').slice(-10)).filter(x => x.length === 10);
    return { version: 1, delivery, giftWrapFee, coupons, couponUsage, pastBuyers, pricing: { shippingFee: Math.max(0, num(PR.shippingFee ?? 199)), freeShippingAbove: Math.max(0, num(PR.freeShippingAbove ?? 10000)) }, exportedAt: new Date().toISOString(), shop: { ordersOn: S.ordersOn !== false, name: str(S.name, 80), phone: str(S.phone, 40), address: str(S.address, 300), siteUrl: str(S.siteUrl, 200), gstNumber: str(S.gstNumber, 20), gstRate: Math.min(40, Math.max(0, num(S.gstRate))), invoicePrefix: str(S.invoicePrefix || 'AP-INV', 12) },
      policies: Object.fromEntries(['shipping', 'returns', 'payment', 'care', 'timings', 'custom'].map(k => [k, str(P[k], 1500)])), products };
  };

  // Tracking message for orders held in the owner app. Claimed before sending, so the same order + tracking number is never sent twice.
  const notifyTracking = async ({ orderId, trackingNo, phone, customer, courier, trackingUrl, resend }) => {
    const key = `${orderId}|${trackingNo}`, sent = (store.s.trackingSent = store.s.trackingSent || {});
    if (sent[key] && !resend) return { sent: false, reason: 'already-sent' };
    if (store.isOptedOut(phone)) return { sent: false, reason: 'opted-out' };
    sent[key] = Date.now(); store.save();
    const nm = (customer || '').split(/\s+/)[0] || 'there', text = `🚚 Hi ${nm}, your order *${orderId}* has been shipped${courier ? ' via ' + courier : ''}.${trackingNo ? '\nTracking number: ' + trackingNo : ''}${trackingUrl ? '\nTrack it here: ' + trackingUrl : ''}\nThank you for shopping with ${shop.get().db?.settings?.businessName || 'Anitha Pemmasani'}! 💛`;
    try { await pipeline.sendSmart(phone, text, { template: cfg.payments.templates.shipped, params: [nm, orderId, trackingUrl || trackingNo || '-'] }); }
    catch (e) { delete sent[key]; store.save(); return { sent: false, reason: 'failed' }; }
    return { sent: true, mode: cfg.waLive ? 'live' : 'dry-run' };
  };

  // ---- growth report: live numbers, specific steps, weekly email ----
  const clockNow = () => (deps.now ? deps.now() : Date.now());
  const smtpCfg = () => { try { return JSON.parse(secrets.get('smtp') || 'null'); } catch { return null; } };
  const smtpMeta = () => { const c = smtpCfg(), m = secrets.meta('smtp'); return c ? { configured: true, host: c.host, port: c.port, secure: !!c.secure, user: c.user, from: c.from, to: c.to, hasPass: !!c.pass, updatedAt: m.updatedAt || null } : { configured: false }; };
  const notifyOwnerMail = async (subject, text) => { const c = smtpCfg(); if (!c) return false; try { await smtpSend(c, { subject, text, html: '<pre style="font:14px Arial">' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>' }); return true; } catch { return false; } };
  const reportFile = path.join(cfg.dataDir, 'reports.json'), reportState = () => { try { return JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch { return {}; } }, saveReportState = o => { const t = reportFile + '.tmp'; fs.writeFileSync(t, JSON.stringify(o), { mode: 0o600 }); fs.renameSync(t, reportFile); };
  const growthCache = new Map();
  const addD = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const monthOf = ymd => ({ from: ymd.slice(0, 7) + '-01', to: addD(new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7), 1)).toISOString().slice(0, 10), -1) });
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  // which days a report covers: weekly = the 7 complete days before today, monthly = the previous calendar month, daily = yesterday
  const periodFor = (kind, t) => {
    const today = istDay(t);
    if (kind === 'daily') { const y = addD(today, -1); return { from: y, to: y, prevFrom: addD(y, -1), prevTo: addD(y, -1), label: 'yesterday' }; }
    if (kind === 'monthly' || kind === 'lastmonth') { const first = today.slice(0, 7) + '-01', last = addD(first, -1), m = monthOf(last), pm = monthOf(addD(m.from, -1)); return { from: m.from, to: m.to, prevFrom: pm.from, prevTo: pm.to, label: `${MONTHS[+m.from.slice(5, 7) - 1]} ${m.from.slice(0, 4)}` }; }
    if (kind === 'thismonth') { const from = today.slice(0, 7) + '-01', n = Math.round((Date.parse(today) - Date.parse(from)) / 86400000) + 1, pm = monthOf(addD(from, -1)); return { from, to: today, prevFrom: pm.from, prevTo: addD(pm.from, n - 1) > pm.to ? pm.to : addD(pm.from, n - 1), label: `${MONTHS[+today.slice(5, 7) - 1]} so far` }; }
    const to = addD(today, -1); return { from: addD(to, -6), to, label: '' };
  };
  const growth = {
    // spec: 7 | 30 | 90 (the last N days up to now) or 'thismonth' | 'lastmonth' | a report kind
    async build(spec, fresh, kind) {
      const k = String(spec) + '|' + (kind || ''), hit = growthCache.get(k); if (!fresh && hit && clockNow() - hit.at < 5 * 60_000) return hit.r;
      const db = shop.get().db || { settings: {} }, now = clockNow(), isDays = typeof spec === 'number', period = isDays ? null : periodFor(spec, now);
      const r = await collect({ analytics, ig, db, days: isDays ? spec : 7, now, siteUrl: cfg.siteUrl, period, detail: spec === 'lastmonth' || spec === 'monthly' }); analytics.save(); growthCache.set(k, { at: now, r }); return r;
    },
    async plan(r, kind = 'weekly') {
      const top = r.actions[0]; if (cfg.anthropicKey && cfg.anthropicKey !== 'missing') { try { const t = r.ig.totals || {}, x = (await runAi({ cfg, client, task: 'weeklyplan', input: { kind, period: `${r.period.from} to ${r.period.to}`, days: r.period.days, orders: r.sales.orders, ordersPrev: r.sales.prev.orders, revenue: r.sales.revenue, revenuePrev: r.sales.prev.revenue, visitors: r.web.visitors, visitorsPrev: r.web.prev.visitors, saree_views: r.web.productViews, whatsapp_taps: r.web.waClicks, instagramConnected: r.ig.connected, reach: t.reach, followers: r.ig.followers, followersChange: r.ig.followersChange, engagementRatePct: r.ig.engagementRate, topAction: top ? top.title : 'keep posting and reply quickly' } })).data; if (x && x.headline && x.summary) return { headline: String(x.headline).slice(0, 120), summary: String(x.summary).slice(0, 700), via: 'claude' }; } catch { /* fall back to plain facts */ } }
      return localPlan(r, kind);
    },
    async compose(kind) {
      const r = await growth.build(kind, true, kind), plan = await growth.plan(r, kind), base = (cfg.payments.publicUrl || '').replace(/\/$/, ''), e = renderEmail(r, plan, base ? base + '/admin' : '', kind), name = { weekly: 'weekly growth report', monthly: 'monthly business review', daily: 'daily brief' }[kind];
      return { r, plan, subject: `${r.brand} ${name} · ${kind === 'monthly' ? r.period.label : kind === 'daily' ? r.period.from : r.period.from + ' to ' + r.period.to}`, html: e.html, text: e.text };
    },
    async preview(kind = 'weekly') { const c = await growth.compose(kind); return { subject: c.subject, html: c.html, text: c.text, via: c.plan.via }; },
    async mail(kind = 'weekly', manual) {
      const c = smtpCfg(); if (!c) throw Object.assign(new Error('Add your email settings first (Growth tab → Weekly email).'), { code: 422 });
      const m = await growth.compose(kind); await smtpSend(c, { subject: m.subject, text: m.text, html: m.html }); return { subject: m.plan.headline, via: m.plan.via, kind, manual: !!manual };
    },
  };
  const isoWeek = t => { const d = new Date(t + 330 * 60_000), x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), dn = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - dn); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return x.getUTCFullYear() + '-W' + String(Math.ceil(((x - y) / 86400000 + 1) / 7)).padStart(2, '0'); };
  const DEFAULT_PREFS = { weekly: true, monthly: true, daily: false };
  const prefs = () => ({ ...DEFAULT_PREFS, ...(reportState().prefs || {}) });
  const reportDue = (kind, t) => { const ist = new Date(t + 330 * 60_000), h = ist.getUTCHours() + ist.getUTCMinutes() / 60; return kind === 'weekly' ? (ist.getUTCDay() === 1 && h >= 8 ? isoWeek(t) : null) : kind === 'monthly' ? (ist.getUTCDate() === 1 && h >= 8.5 ? istDay(t).slice(0, 7) : null) : (h >= 21 ? istDay(t) : null); };
  // Weekly: Mondays from 8:00 IST. Monthly: the 1st from 8:30 IST (covers the month that just ended). Daily (off unless switched on): every day from 21:00 IST.
  // Each report is claimed BEFORE sending, so two overlapping ticks can never send twice; a failure releases the claim (3 tries a period, an hour apart).
  const reportTick = async () => {
    try {
      const t = clockNow(); if (!smtpCfg()) return; const pf = prefs();
      for (const kind of ['weekly', 'monthly', 'daily']) {
        if (!pf[kind]) continue; const key = reportDue(kind, t); if (!key) continue; const all = reportState(), st = all[kind] || {};
        if (st.key === key && st.state !== 'failed') continue; if (st.key === key && (st.tries || 0) >= 3) continue; if (st.key === key && st.retryAt && t < st.retryAt) continue;
        const tries = (st.key === key ? st.tries || 0 : 0) + 1; saveReportState({ ...all, [kind]: { key, state: 'sending', tries, at: t } });
        try { await growth.mail(kind, false); saveReportState({ ...reportState(), [kind]: { key, state: 'sent', tries: 0, at: t } }); }
        catch (e) { saveReportState({ ...reportState(), [kind]: { key, state: 'failed', tries, at: t, retryAt: t + 3600_000, error: String(e.message).slice(0, 200) } }); }
      }
    } catch { /* never crash the timer */ }
  };
  // once a day, remember the follower count so growth can be shown
  const snapshotTick = async () => { try { if (!ig.configured) return; const k = istDay(clockNow()); if (analytics.s.ig[k]) { analytics.save(); return; } const a = await ig.call('GET', cfg.ig.userId, { fields: 'followers_count,follows_count,media_count' }); analytics.snapshotIg({ followers: a.followers_count, follows: a.follows_count, media: a.media_count }); analytics.save(); } catch { analytics.save(); } };

  // ---- the Ops watcher: a short plain-words note each morning (8:15 IST). It only reads and reports. It emails you only when something needs fixing (every day) or on Mondays when there are warnings. ----
  const watchStore = new WatchStore(cfg.dataDir), opsCtx = () => ({ cfg, auth, shop, privacy, weborders, store, smtpMeta, ig, analytics, ops, reportState, social, wa });
  let watchBusy = false;
  const watchRun = async (manual) => {
    if (watchBusy) return watchStore.read().last || null; watchBusy = true;
    try {
      const rep = await opsReport(opsCtx()), note = await writeWatch({ cfg, client, report: rep }), day = istDay(clockNow()), st = watchStore.read();
      let emailed = false; const c = smtpCfg(), monday = new Date(clockNow() + 330 * 60_000).getUTCDay() === 1;
      if (!manual && c && (note.fail > 0 || (note.warn > 0 && monday))) { try { await smtpSend(c, { subject: `Shop Ops: ${note.fail ? note.fail + ' to fix now' : note.warn + ' to look at'}`, text: `${note.text}\n\nFull report: ${(cfg.payments.publicUrl || '').replace(/\/$/, '')}/admin (Ops tab).` }); emailed = true; } catch { /* the note is still kept */ } }
      const last = { ...note, day, emailed, manual: !!manual }; watchStore.write({ ...st, last, day: manual ? st.day : day }); return last;
    } finally { watchBusy = false; }
  };
  const watchTick = async () => { try { const t = clockNow(), ist = new Date(t + 330 * 60_000), h = ist.getUTCHours() + ist.getUTCMinutes() / 60, day = istDay(t); if (h < 8.25 || watchStore.read().day === day) return; watchStore.write({ ...watchStore.read(), day }); await watchRun(false); } catch { /* never crash the timer */ } };
  const admin = adminRoutes({ cfg, auth, shop, media, social, ig, client, notifyTracking, aiKey, videos, analytics, growth, privacy, Privacy, weborders, ops, opsReport, wa, watchRun, watchRead: () => watchStore.read().last || null, reportState, sendCode: async (phone, code) => { if (!cfg.waLive) return false; const d = String(phone).replace(/\D/g, ''); try { await pipeline.sendSmart(d.length === 10 ? '91' + d : d, `Your ${shop.get().db?.settings?.businessName || 'shop'} verification code is ${code}. It is only for a privacy request you made. Never share it with anyone else. It expires in 10 minutes.`, { template: cfg.privacyOtpTemplate, params: [code] }); return true; } catch { return false; } }, breachNotices, store, runSweep: () => { const r = Privacy.sweepStore(store, cfg.privacy, clockNow()); r.tickets = privacy.sweepTickets(3); r.webOrders = weborders.sweep(cfg.privacy.orderYears); privacy.saveState({ ...privacy.state(), lastSweep: istDay(clockNow()), last: r }); return r; }, notifyOwner: notifyOwnerMail, smtpMeta, smtpSave: async o => { const old = smtpCfg() || {}, c = { host: String(o.host || '').trim().slice(0, 200), port: +o.port || (o.secure ? 465 : 587), secure: !!o.secure, user: String(o.user || '').trim().slice(0, 200), pass: o.pass ? String(o.pass).slice(0, 300) : old.pass || '', from: String(o.from || '').trim().slice(0, 200), to: String(o.to || '').trim().slice(0, 200) }; if (!c.host || !/^[\w.-]+$/.test(c.host)) throw Object.assign(new Error('Enter the mail server address, for example smtp.gmail.com'), { code: 422 }); if (!emailOk(c.to)) throw Object.assign(new Error('Enter the email address that should receive the report.'), { code: 422 }); if (!c.from) c.from = c.user && emailOk(c.user) ? c.user : c.to; await (deps.verifySmtp || smtpVerify)(c); secrets.set('smtp', JSON.stringify(c), { last4: false }); }, smtpRemove: () => secrets.remove('smtp'), smtpSendTest: async () => { const c = smtpCfg(); if (!c) throw Object.assign(new Error('Add your email settings first.'), { code: 422 }); await smtpSend(c, { subject: 'Test email from your shop app', text: 'This is a test. If you can read it, the weekly growth report will reach you here every Monday morning.', html: '<p>This is a test. If you can read it, the weekly growth report will reach you here every Monday morning.</p>' }); }, reportState, prefs, savePrefs: o => { const all = reportState(); saveReportState({ ...all, prefs: { weekly: !!o.weekly, monthly: !!o.monthly, daily: !!o.daily } }); }, json, readBody, ROOT });
  const siteHost = cfg.siteDir ? createSiteHost(cfg.siteDir) : null;   // the public website, when SITE_DIR is set
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'), route = `${req.method} ${url.pathname}`;
    try {
      if (req.method === 'OPTIONS' && url.pathname !== '/public/hit') { res.writeHead(204, cors(req)); return res.end(); }
      if (await admin(req, res, url, route)) return;
      if (route === 'GET /health') return json(res, 200, { ok: true, whatsapp: cfg.waLive ? 'live' : 'dry-run', model: cfg.model, claude: !!cfg.anthropicKey, catalogue: !!store.loadCatalogue(), callsToday: store.usageToday() }, cors(req));

      // ---- WhatsApp webhook ----
      if (route === 'GET /webhook') {
        const ok = url.searchParams.get('hub.mode') === 'subscribe' && cfg.wa.verifyToken && safeEq(url.searchParams.get('hub.verify_token') || '', cfg.wa.verifyToken);
        res.writeHead(ok ? 200 : 403, { 'Content-Type': 'text/plain' }); return res.end(ok ? url.searchParams.get('hub.challenge') || '' : 'forbidden');
      }
      if (route === 'POST /webhook') {
        const raw = await readBody(req, 1_000_000);
        if (cfg.waLive && !verifySignature(raw, req.headers['x-hub-signature-256'], cfg.wa.appSecret)) { res.writeHead(401); return res.end(); }
        res.writeHead(200); res.end(); // acknowledge fast; Meta retries slow replies
        let body; try { body = JSON.parse(raw.toString('utf8')); } catch { return; }
        for (const m of parseWebhook(body)) pipeline.handleInbound(m, waSink).catch(e => console.error('[pipeline]', e));
        return;
      }

      // ---- payments ----
      if (route === 'POST /payments/webhook') {
        const raw = await readBody(req, 200_000), code = await onPaymentWebhook(raw, req.headers);
        res.writeHead(code); return res.end();
      }
      const mockM = provider.name === 'mock' && /^\/pay\/mock\/([\w-]+)(\/complete)?$/.exec(url.pathname);
      if (mockM) {
        const o = store.s.orders.find(x => x.payment && x.payment.linkId === mockM[1]);
        if (!o) return json(res, 404, { error: 'unknown link' });
        if (mockM[2] && req.method === 'POST') {
          const b = JSON.parse((await readBody(req, 2_000)).toString('utf8')); const outcome = b.outcome === 'paid' ? 'paid' : 'cancelled';
          if (o.status !== 'payment_pending') return json(res, 409, { error: 'This link is ' + o.status });
          const ev = provider.buildEvent(o, outcome); const code = await onPaymentWebhook(Buffer.from(ev.body), ev.headers); return json(res, code === 200 ? 200 : 500, { ok: code === 200, status: o.status });
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const open = o.status === 'payment_pending';
        return res.end(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Test payment</title><body style="font:16px system-ui;max-width:420px;margin:30px auto;padding:0 16px"><div style="background:#fff3cd;padding:10px;border-radius:8px;font-size:13px">TEST PAYMENT PAGE. No real money moves. A real gateway page replaces this.</div><h2>Order ${esc(o.id)}</h2><p>${o.items.map(i => esc(i.name) + ' × ' + i.quantity).join('<br>')}</p><p style="font-size:24px"><b>₹${Number(o.payment.amount).toLocaleString('en-IN')}</b></p><p id=m>${open ? '' : 'This link is ' + esc(o.status) + '.'}</p>${open ? '<button id=p style="padding:14px 22px;font-size:16px;background:#075e54;color:#fff;border:0;border-radius:8px">Pay now (test)</button> <button id=c style="padding:14px 22px;font-size:16px;border:1px solid #ccc;background:#fff;border-radius:8px">Cancel</button>' : ''}<script>const go=async o=>{const r=await fetch(location.pathname+'/complete',{method:'POST',body:JSON.stringify({outcome:o})});document.getElementById('m').textContent=(await r.json()).ok?(o==='paid'?'Payment received. You can go back to WhatsApp.':'Payment cancelled.'):'Something went wrong';document.querySelectorAll('button').forEach(b=>b.remove())};document.getElementById('p')&&(p.onclick=()=>go('paid'),c.onclick=()=>go('cancelled'))</script>`);
      }

      // ---- customer pages (unguessable links sent in the WhatsApp chat) ----
      const tm = /^\/track\/([0-9a-f]{32})$/.exec(url.pathname);
      if (tm) {
        const o = store.s.orders.find(x => x.trackToken === tm[1]);
        if (!o) return json(res, 404, { error: 'not found' });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' });
        return res.end(trackPageHtml(o, orders.steps(o), new Catalogue(store.loadCatalogue()).shop));
      }
      const im = /^\/invoice\/([0-9a-f]{32})\.pdf$/.exec(url.pathname);
      if (im) {
        const o = store.s.orders.find(x => x.invoice && x.invoice.token === im[1]);
        if (!o) return json(res, 404, { error: 'not found' });
        const pdf = buildInvoicePdf(o, new Catalogue(store.loadCatalogue()).shop);
        res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Invoice-${o.invoice.number}.pdf"`, 'Cache-Control': 'private, max-age=300', 'X-Robots-Tag': 'noindex' });
        return res.end(pdf);
      }

      // ---- customer cart sync (called by the store for signed-in customers; NOT admin) ----
      if (route === 'POST /cart/sync') {
        const c = cors(req), b = JSON.parse((await readBody(req, 20_000)).toString('utf8'));
        if (!validPhone(b.phone)) return json(res, 400, { error: 'bad phone' }, c);
        const key = digits(b.phone), now = Date.now(), arr = (cartRate.get(key) || []).filter(t => now - t < 600000); arr.push(now); cartRate.set(key, arr);
        if (arr.length > 40) return json(res, 429, { error: 'slow down' }, c);
        if (!(await verifyCustomer(key, String(b.token || '')))) return json(res, cfg.customerTokenCheckUrl || !cfg.waLive ? 401 : 503, { error: cfg.customerTokenCheckUrl || !cfg.waLive ? 'not signed in' : 'cart sync is not configured (CUSTOMER_TOKEN_CHECK_URL)' }, c);
        const cat = store.loadCatalogue(); if (!cat) return json(res, 409, { error: 'catalogue not uploaded' }, c);
        const cart = syncCart({ store, catalogue: new Catalogue(cat), phone: key, name: b.name, items: b.items, consent: b.consent, ordered: !!b.ordered });
        return json(res, 200, { ok: true, items: cart.items.length, consent: !!cart.consent.granted }, c);
      }

      // ---- admin pages & API ----
      if (route === 'GET /test') return page(res, 'test.html');
      if (route === 'GET /inbox' || (route === 'GET /' && !siteHost)) return page(res, 'inbox.html');   // with the website on this server, / is the home page

      if (url.pathname.startsWith('/api/')) {
        const c = cors(req);
        if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' }, c);

        if (route === 'POST /api/catalogue') {
          const cat = cleanCatalogue(JSON.parse((await readBody(req, 8_000_000)).toString('utf8')));
          store.saveCatalogue(cat);
          return json(res, 200, { ok: true, products: cat.products.length, withPhotos: cat.products.filter(p => p.images.length || p.image).length, exportedAt: cat.exportedAt }, c);
        }
        if (route === 'GET /api/status') {
          const cat = store.loadCatalogue();
          return json(res, 200, { whatsapp: cfg.waLive ? 'live' : 'dry-run', model: cfg.model, claudeKey: !!cfg.anthropicKey, callsToday: store.usageToday(), maxCallsPerDay: cfg.maxCallsPerDay, payments: { provider: provider.name, approval: cfg.payments.approval, linkValidHours: cfg.payments.linkValidHours, pendingImport: orders.exportPending().length }, catalogue: cat ? { products: cat.products.length, exportedAt: cat.exportedAt } : null, openHandoffs: store.s.handoffs.filter(h => h.status === 'open').length, newOrders: store.s.orders.filter(o => o.status === 'new').length }, c);
        }
        if (route === 'GET /api/carts') return json(res, 200, { ...cartStats(store, new Catalogue(store.loadCatalogue()), Date.now()), enabled: !!store.s.cartSettings.enabled && cfg.cart.enabled, delaysMin: cfg.cart.delaysMin, templates: cfg.cart.templates, live: cfg.waLive }, c);
        if (route === 'POST /api/cart/settings') { const b = JSON.parse((await readBody(req, 2_000)).toString('utf8')); store.s.cartSettings.enabled = !!b.enabled; store.save(); return json(res, 200, { ok: true, enabled: store.s.cartSettings.enabled }, c); }
        if (route === 'POST /api/carts/run') { const cat = store.loadCatalogue(); if (!cat) return json(res, 409, { error: 'catalogue not uploaded' }, c); return json(res, 200, await runReminders({ cfg, store, wa, catalogue: new Catalogue(cat) }), c); }
        if (route === 'POST /api/test-chat') {
          const b = JSON.parse((await readBody(req, 20_000)).toString('utf8'));
          const session = String(b.session || 'default').replace(/[^\w-]/g, '').slice(0, 40) || 'default';
          const replies = []; const sink = { send: async (_t, m) => { replies.push(m.type === 'image' ? { type: 'image', url: m.url, caption: m.caption } : m.type === 'document' ? { type: 'document', url: m.url, filename: m.filename, caption: m.caption } : m.type === 'buttons' ? { type: 'buttons', text: m.text, buttons: m.buttons } : { type: 'text', text: m.text }); } };
          const r = await pipeline.handleInbound({ id: 'test-' + crypto.randomUUID(), from: 'test-' + session, name: 'Test customer', type: b.buttonId ? 'interactive' : 'text', text: String(b.message || ''), buttonId: String(b.buttonId || '').slice(0, 200) }, sink, { test: true });
          return json(res, 200, { replies, result: r, status: store.conv('test-' + session).status, orderIds: store.s.orders.filter(o => o.phone === 'test-' + session).map(o => o.id) }, c);
        }
        if (route === 'POST /api/test-reset') {
          const b = JSON.parse((await readBody(req, 5_000)).toString('utf8')); const k = 'test-' + String(b.session || 'default').replace(/[^\w-]/g, '').slice(0, 40);
          delete store.s.conversations[k]; store.s.orders = store.s.orders.filter(o => o.phone !== k); store.s.handoffs = store.s.handoffs.filter(h => h.phone !== k); delete store.s.optOut[k]; pipeline.rate.delete(k); store.save();
          return json(res, 200, { ok: true }, c);
        }
        if (route === 'GET /api/inbox') {
          const convs = store.listConvs().filter(x => !x.phone.startsWith('test-')).slice(0, 100).map(x => ({ phone: x.phone, name: x.name, status: x.status, unread: x.unread || 0, lastInboundAt: x.lastInboundAt, lastActivityAt: x.lastActivityAt, optedOut: store.isOptedOut(x.phone), log: (x.log || []).slice(-40) }));
          return json(res, 200, { conversations: convs, handoffs: store.s.handoffs.filter(h => !h.phone.startsWith('test-')).slice(0, 100), orders: store.s.orders.filter(o => !o.phone.startsWith('test-')).slice(0, 100), live: cfg.waLive }, c);
        }
        if (route === 'POST /api/ai' || route === 'POST /api/ai/reply') {
          if (!cfg.anthropicKey || cfg.anthropicKey === 'missing') return json(res, 503, { error: 'Claude is not connected on the assistant server (ANTHROPIC_API_KEY).' }, c);
          const now = Date.now(); aiHits = aiHits.filter(t => now - t < 60_000); if (aiHits.length >= 40) return json(res, 429, { error: 'Too many AI requests. Wait a minute.' }, c); aiHits.push(now);
          let b; try { b = JSON.parse((await readBody(req, 2_300_000)).toString('utf8')); } catch { return json(res, 400, { error: 'bad request' }, c); }
          let task = String(b.task || ''), input = b.input;
          if (route === 'POST /api/ai/reply') {   // the server builds the context itself: the phone number never leaves the server
            const cv = store.s.conversations[String(b.phone || '')]; if (!cv) return json(res, 404, { error: 'chat not found' }, c);
            task = 'reply'; const cat = store.loadCatalogue();
            input = { messages: (cv.log || []).slice(-12).map(m => ({ dir: m.dir, text: m.text })), policies: cat ? new Catalogue(cat).policiesText('') : '', goal: b.goal, lang: b.lang };
          }
          try { const r = await runAi({ cfg, client, task, input }); return json(res, 200, { ok: true, ...r }, c); }
          catch (e) { return json(res, [400, 413, 422].includes(e.code) ? e.code : 502, { error: e.message }, c); }
        }
        if (route === 'POST /api/inbox/reply') {
          const b = JSON.parse((await readBody(req, 20_000)).toString('utf8')); const text = String(b.text || '').trim().slice(0, 1500);
          if (!/^\d{8,15}$/.test(String(b.phone || '')) || !text) return json(res, 400, { error: 'phone and text required' }, c);
          if (store.isOptedOut(b.phone)) return json(res, 409, { error: 'This customer sent STOP. Do not message them.' }, c);
          try { await pipeline.ownerReply(b.phone, text, waSink); return json(res, 200, { ok: true }, c); }
          catch (e) { return json(res, e.code === 'WINDOW_CLOSED' ? 409 : 502, { error: e.message }, c); }
        }
        if (route === 'POST /api/inbox/resume') { const b = JSON.parse((await readBody(req, 5_000)).toString('utf8')); const cv = store.s.conversations[b.phone]; if (!cv) return json(res, 404, { error: 'no such chat' }, c); cv.status = 'bot'; cv.heldAt = 0; store.save(); return json(res, 200, { ok: true }, c); }
        if (route === 'POST /api/inbox/handoff-close') { const b = JSON.parse((await readBody(req, 5_000)).toString('utf8')); const h = store.s.handoffs.find(x => x.id === b.id); if (!h) return json(res, 404, { error: 'not found' }, c); h.status = 'closed'; h.closedAt = Date.now(); store.save(); return json(res, 200, { ok: true }, c); }
        if (route === 'POST /api/orders/send-link') { const b = JSON.parse((await readBody(req, 2_000)).toString('utf8')); const r = await orders.sendLink(b.id, { resend: !!b.resend }); return json(res, r.error ? 409 : 200, r, c); }
        if (route === 'POST /api/orders/cancel') { const b = JSON.parse((await readBody(req, 2_000)).toString('utf8')); const r = await orders.cancel(b.id); return json(res, r.error ? 409 : 200, r, c); }
        if (route === 'POST /api/orders/paid-manual') { const b = JSON.parse((await readBody(req, 2_000)).toString('utf8')); const r = orders.markPaidManually(b.id, b.reference); return json(res, r.error ? 409 : 200, r.error ? r : { ok: true }, c); }
        if (route === 'POST /api/orders/status') { const b = JSON.parse((await readBody(req, 4_000)).toString('utf8')); const r = await orders.setStatus(b.id, String(b.status || ''), { tracking: b.tracking, trackingUrl: b.trackingUrl }); return json(res, r.error ? 409 : 200, r, c); }
        if (route === 'GET /api/orders/slip') { const o = orders.find(url.searchParams.get('id') || ''); if (!o) return json(res, 404, { error: 'not found' }, c); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...c }); return res.end(packingSlipHtml(o, new Catalogue(store.loadCatalogue()).shop)); }
        if (route === 'POST /api/orders/shipped') { const b = JSON.parse((await readBody(req, 2_000)).toString('utf8')); const r = await orders.markShipped(b.id, b.tracking, Date.now(), b.trackingUrl); return json(res, r.error ? 409 : 200, r, c); }
        if (route === 'GET /api/orders/export') return json(res, 200, { orders: orders.exportPending().map(o => ({ id: o.id, phone: o.phone, customerName: o.customerName, address: o.address, pincode: o.pincode, shipTo: o.shipTo, billTo: o.billTo, gift: o.gift || null, items: o.items, pricing: o.pricing || { subtotal: o.total, discount: 0, shipping: 0, total: o.total }, coupon: o.coupon ? o.coupon.code : '', status: o.status, paidAt: o.paidAt, shippedAt: o.shippedAt, deliveredAt: o.deliveredAt, tracking: o.tracking || '', trackingUrl: o.trackingUrl || '', invoice: o.invoice ? { number: o.invoice.number, issuedAt: o.invoice.issuedAt, url: orders.invoiceUrl(o) } : null, delivery: o.delivery?.serviceable ? { label: o.delivery.label } : null, payment: { provider: o.payment?.provider || '', paymentId: o.payment?.paymentId || '' }, createdAt: o.createdAt })) }, c);
        if (route === 'POST /api/orders/ack') { const b = JSON.parse((await readBody(req, 20_000)).toString('utf8')); return json(res, 200, { ok: true, acknowledged: orders.ack(Array.isArray(b.items) ? b.items : Array.isArray(b.ids) ? b.ids : []) }, c); }
        if (route === 'POST /api/inbox/order-status') {
          const b = JSON.parse((await readBody(req, 5_000)).toString('utf8')); const o = store.s.orders.find(x => x.id === b.id);
          if (!o || !['new', 'confirmed', 'paid', 'shipped', 'cancelled'].includes(b.status)) return json(res, 400, { error: 'bad request' }, c);
          o.status = b.status; o.updatedAt = Date.now(); store.save(); return json(res, 200, { ok: true }, c);
        }
        return json(res, 404, { error: 'not found' }, c);
      }
      if (siteHost && siteHost.serve(req, res, url)) return;
      json(res, 404, { error: 'not found' });
    } catch (e) {
      if (res.headersSent) return;
      const code = e.code === 413 ? 413 : e instanceof SyntaxError ? 400 : e.code === 400 ? 400 : 500;
      if (code === 500) { console.error('[server]', e); ops.note('error', `${req.method} ${String(req.url).split('?')[0]}: ${e && e.message}`); }
      json(res, code, { error: code === 500 ? 'server error' : e.message }, cors(req));
    }
  });
  const tick = () => { orders.sweep().catch(e => { console.error('[sweep]', e); ops.note('error', 'sweep: ' + (e && e.message)); }); const cat = store.loadCatalogue(); if (cat) runReminders({ cfg, store, wa, catalogue: new Catalogue(cat) }).catch(e => console.error('[cart-tick]', e)); };
  // once a day: erase what we no longer need (old chats, carts, order contact details)
  const sweepTick = () => { try { const t = clockNow(), k = istDay(t), st = privacy.state(); if (st.lastSweep === k) return; const r = Privacy.sweepStore(store, cfg.privacy, t); r.tickets = privacy.sweepTickets(3); r.webOrders = weborders.sweep(cfg.privacy.orderYears); privacy.saveState({ ...st, lastSweep: k, last: r }); } catch { /* never crash the timer */ } };
  // a short reminder email, once a day from 9:00 IST, while a privacy request is late or nearly late
  const privacyDigestTick = async () => {
    try { const t = clockNow(), ist = new Date(t + 330 * 60_000); if (ist.getUTCHours() < 9 || !smtpCfg()) return; const st = privacy.state(), k = istDay(t); if (st.digestDay === k) return; const at = privacy.attention(5); if (!at.late.length && !at.soon.length) return;
      privacy.saveState({ ...st, digestDay: k });   // claimed first: never twice in a day
      const line = x => `- ${x.id} (${x.type}) from ${x.name}: reply by ${x.due.slice(0, 10)}`; await smtpSend(smtpCfg(), { subject: `Privacy requests need attention: ${at.late.length} late, ${at.soon.length} due soon`, text: `${at.late.length ? 'LATE:\n' + at.late.map(line).join('\n') + '\n\n' : ''}${at.soon.length ? 'DUE IN THE NEXT 5 DAYS:\n' + at.soon.map(line).join('\n') + '\n\n' : ''}The law asks you to answer. Open the owner app → Privacy.`, html: '<p>Open the owner app → Privacy tab: some privacy requests are late or nearly late.</p>' }); } catch { /* try again tomorrow */ }
  };
  const socialTick = () => { social.tick().catch(() => {}); reportTick(); snapshotTick(); sweepTick(); privacyDigestTick(); watchTick(); };
  return { server, cfg, store, pipeline, wa, tick, orders, provider, auth, shop, media, social, ig, socialTick, analytics, growth, reportTick, privacy, sweepTick, weborders, privacyDigestTick, watchRun, watchTick };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { server, cfg, store, tick, socialTick, auth } = createApp();
  if (!auth.configured && (cfg.adminSetupToken || '').length < 16) console.warn('NOTE: the owner app (/admin) is not set up. Set ADMIN_SETUP_TOKEN (16+ characters), start the server, open /admin and choose your password.');
  setInterval(tick, 60_000).unref(); setInterval(socialTick, 30_000).unref();
  if (!cfg.adminToken || cfg.adminToken.length < 12) console.warn('WARNING: ADMIN_TOKEN missing or too short (min 12): inbox, test page and catalogue upload are disabled.');
  if (!cfg.anthropicKey) console.warn('WARNING: ANTHROPIC_API_KEY not set: the assistant will hand every chat to you.');
  server.listen(cfg.port, () => console.log(`WhatsApp assistant on :${cfg.port}  [${cfg.waLive ? 'LIVE WhatsApp' : 'DRY-RUN: nothing is sent to WhatsApp'}]  model=${cfg.model}`));
  const stop = () => { try { store.flush(); } catch {} server.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
