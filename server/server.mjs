import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadConfig, ROOT } from './src/config.mjs';
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

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

export function createApp(overrides = {}, deps = {}) {
  const cfg = loadConfig(overrides);
  const store = deps.store || new Store(cfg.dataDir);
  const wa = deps.wa || new WhatsApp(cfg, deps.fetch);
  const client = deps.client || makeClient(cfg);
  let aiHits = [];
  const auth = deps.auth || new AdminAuth({ dir: cfg.dataDir, setupToken: cfg.adminSetupToken, secureCookie: cfg.cookieSecure, ...(deps.authOpts || {}) });
  const shop = deps.shop || new ShopData(cfg.dataDir), media = deps.media || new MediaStore(cfg.dataDir), ig = deps.ig || new IgClient(cfg, deps.fetch);
  const social = deps.social || new SocialQueue({ dir: cfg.dataDir, ig, media, cfg, now: deps.now });
  const waSink = { send: (to, m) => m.type === 'image' ? wa.sendImage(to, m.url, m.caption) : m.type === 'document' ? wa.sendDocument(to, m.url, m.filename, m.caption) : m.type === 'buttons' ? wa.sendButtons(to, m.text, m.buttons) : wa.sendText(to, m.text) };
  const pipeline = new Pipeline({ cfg, store, client, wa, defaultSink: waSink });
  const provider = deps.provider || makeProvider(cfg, deps.fetch);
  const orders = new Orders({ cfg, store, provider, say: (...a) => pipeline.sendSmart(...a), alertOwner: e => pipeline.notifyOwner(e, e.conv.phone.startsWith('test-')), makeCatalogue: () => pipeline.catalogue(), fetchImpl: deps.fetch });
  pipeline.orders = orders;
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
  const sessionAdmin = req => auth.authorize(req, { write: req.method !== 'GET' && req.method !== 'HEAD' }, String(req.socket.remoteAddress || '')).code === 200;
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

  const admin = adminRoutes({ cfg, auth, shop, media, social, ig, client, json, readBody, ROOT });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'), route = `${req.method} ${url.pathname}`;
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, cors(req)); return res.end(); }
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
      if (route === 'GET /inbox' || route === 'GET /') return page(res, 'inbox.html');

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
            input = { messages: (cv.log || []).slice(-12).map(m => ({ dir: m.dir, text: m.text })), policies: cat ? new Catalogue(cat).policiesText('') : '', goal: b.goal };
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
      json(res, 404, { error: 'not found' });
    } catch (e) {
      if (res.headersSent) return;
      const code = e.code === 413 ? 413 : e instanceof SyntaxError ? 400 : e.code === 400 ? 400 : 500;
      if (code === 500) console.error('[server]', e);
      json(res, code, { error: code === 500 ? 'server error' : e.message }, cors(req));
    }
  });
  const tick = () => { orders.sweep().catch(e => console.error('[sweep]', e)); const cat = store.loadCatalogue(); if (cat) runReminders({ cfg, store, wa, catalogue: new Catalogue(cat) }).catch(e => console.error('[cart-tick]', e)); };
  const socialTick = () => social.tick().catch(() => {});
  return { server, cfg, store, pipeline, wa, tick, orders, provider, auth, shop, media, social, ig, socialTick };
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
