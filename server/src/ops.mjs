// The developer's Ops report: one read-only check of every part of the shop (server, data, security, website, orders,
// WhatsApp, AI, Instagram, email, privacy, jobs, errors). Nothing here changes data and nothing secret is ever returned
// (only "set" / "not set"). Each check: { id, status: ok|warn|fail|info, title, detail, fix }.
import fs from 'node:fs';
import path from 'node:path';

const DAY = 86_400_000;
const C = (id, status, title, detail = '', fix = '') => ({ id, status, title, detail, fix });
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 90 ? m + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
const size = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.round(n / 1e3) + ' KB';

export class Ops {
  constructor() { this.errors = []; this.started = Date.now(); this.lag = 0; this.timer = setInterval(() => { const t = Date.now(); setImmediate(() => { this.lag = Math.max(0, Date.now() - t); }); }, 5000); this.timer.unref(); }
  note(level, msg) { this.errors.unshift({ at: new Date().toISOString(), level, msg: String(msg).slice(0, 300) }); this.errors.length = Math.min(this.errors.length, 50); }
}

export async function opsReport(x) {
  const { cfg, auth, shop, privacy, weborders, store, smtpMeta, ig, analytics, ops, reportState, social, wa, fetchImpl = fetch } = x;
  const G = {}; const add = (g, c) => { (G[g] = G[g] || []).push(c); };
  const g = shop.get(), db = g.db || null, st = (db && db.settings) || {}, now = Date.now();
  const safe = (g_, id, f) => { try { f(); } catch (e) { add(g_, C(id, 'fail', 'This check itself crashed', String(e.message).slice(0, 160), 'Tell the developer: the Ops check "' + id + '" failed.')); } };

  // ---- 1. server ----
  safe('Server', 'server', () => {
    const up = Math.round((now - ops.started) / 1000), mem = process.memoryUsage();
    add('Server', C('uptime', up < 300 ? 'warn' : 'ok', 'Server running', `up ${up < 3600 ? Math.round(up / 60) + ' min' : Math.round(up / 3600) + ' h'}, Node ${process.version}`, up < 300 ? 'It restarted a few minutes ago (a deploy, or a crash). Check the Errors section.' : ''));
    add('Server', C('memory', mem.rss > 450e6 ? 'warn' : 'ok', 'Memory', `${size(mem.rss)} in use`, 'Render starter has 512 MB. Over 450 MB for long means a leak or a very large shop file.'));
    add('Server', C('lag', ops.lag > 500 ? 'warn' : 'ok', 'Responsiveness', `event-loop delay ${ops.lag} ms`, 'A long delay means something is blocking the server (a huge save or video job).'));
    add('Server', C('https', /^https:\/\//.test(cfg.wa.publicUrl || '') ? 'ok' : 'fail', 'PUBLIC_URL is https', cfg.wa.publicUrl ? 'set' : 'not set', 'Set PUBLIC_URL to the server\'s https address. Instagram, WhatsApp and photo links need it.'));
    add('Server', C('cookie', cfg.cookieSecure ? 'ok' : 'warn', 'Secure cookies', cfg.cookieSecure ? 'on' : 'OFF', 'Turn COOKIE_SECURE back on whenever the server is reached over https.'));
  });
  safe('Server', 'disk', () => {
    const d = cfg.dataDir; let w = true; try { const f = path.join(d, '.ops-write-test'); fs.writeFileSync(f, 'x'); fs.unlinkSync(f); } catch { w = false; }
    add('Server', C('disk-write', w ? 'ok' : 'fail', 'Data folder is writable', d, 'Orders and settings cannot be saved. Check the Render disk is attached at DATA_DIR.'));
    try { const s = fs.statfsSync(d), free = s.bavail * s.bsize, tot = s.blocks * s.bsize, pct = Math.round(100 * free / tot); add('Server', C('disk-free', pct < 10 ? 'fail' : pct < 25 ? 'warn' : 'ok', 'Disk space', `${size(free)} free of ${size(tot)} (${pct}%)`, 'Photos and videos fill the disk. Enlarge the Render disk or delete old media.')); } catch { add('Server', C('disk-free', 'info', 'Disk space', 'not available on this host')); }
    const persistent = /^\/var\/data|^\/data|^\/mnt/.test(d); add('Server', C('disk-persist', persistent ? 'ok' : 'warn', 'Data survives redeploys', persistent ? 'on a mounted disk' : 'folder is ' + d, 'If DATA_DIR is not on the attached disk, every deploy erases the shop.'));
  });

  // ---- 2. shop data ----
  safe('Shop data', 'data', () => {
    if (!db) { add('Shop data', C('db', 'warn', 'No shop data saved on the server yet', '', 'Open the owner app once and save, or import a backup.')); return; }
    let sz = 0; try { sz = fs.statSync(path.join(cfg.dataDir, 'shop-db.json')).size; } catch { }
    add('Shop data', C('db', 'ok', 'Shop data present', `version ${g.version}, ${size(sz)}, ${db.products.length} products, ${db.orders.length} orders, ${db.users.length} customers`));
    if (sz > 8e6) add('Shop data', C('db-size', 'warn', 'Shop file is large', size(sz), 'Images inside the file make saves slow. Move photos to files.'));
    const skus = new Map(); for (const p of db.products) skus.set(p.sku, (skus.get(p.sku) || 0) + 1); const dup = [...skus].filter(([k, n]) => k && n > 1).map(([k]) => k);
    add('Shop data', C('dup-sku', dup.length ? 'warn' : 'ok', 'Unique product codes', dup.length ? 'duplicates: ' + dup.slice(0, 5).join(', ') : 'no duplicates', 'Give each saree its own SKU.'));
    const neg = db.products.filter(p => p.stock < 0).length; add('Shop data', C('neg-stock', neg ? 'fail' : 'ok', 'No negative stock', neg ? neg + ' product(s) below zero' : 'none', 'An order was taken for an item with no stock. Correct the stock by hand.'));
    const noPic = db.products.filter(p => !(p.images && p.images.length) && !p.image).length; add('Shop data', C('no-pic', noPic ? 'warn' : 'ok', 'Every product has a photo', noPic ? noPic + ' without' : 'all have one', 'Customers do not buy what they cannot see.'));
    const known = new Set(db.products.map(p => p.id)), orphan = db.orders.filter(o => (o.items || []).some(i => i.productId && !known.has(i.productId))).length; add('Shop data', C('orphan', orphan ? 'info' : 'ok', 'Orders refer to existing products', orphan ? orphan + ' order(s) mention a product since deleted (normal if you deleted sold items)' : 'all match'));
    const noPhone = db.users.filter(u => !u.phone).length; add('Shop data', C('user-phone', noPhone ? 'warn' : 'ok', 'Customers have phone numbers', noPhone ? noPhone + ' without' : 'all have one'));
    const cutoff = new Date(now - 3 * DAY).toISOString().slice(0, 10), stuck = db.orders.filter(o => o.status === 'placed' && o.date && o.date < cutoff).length; add('Shop data', C('stuck', stuck ? 'warn' : 'ok', 'Orders waiting too long', stuck ? stuck + ' order(s) still "placed" after 3 days' : 'none', 'Pack, ship or contact the customer.'));
    const unpaid = db.orders.filter(o => o.payment && o.payment.status === 'pending' && o.date && o.date < new Date(now - 5 * DAY).toISOString().slice(0, 10)).length; add('Shop data', C('unpaid', unpaid ? 'warn' : 'ok', 'Payments pending too long', unpaid ? unpaid + ' order(s) unpaid after 5 days' : 'none', 'Chase the payment or cancel.'));
    const low = db.products.filter(p => p.stock > 0 && p.stock <= (p.threshold || 0)).length; add('Shop data', C('low', 'info', 'Low-stock items', String(low)));
    const bk = st.lastEncBackup ? Math.floor((now - Date.parse(st.lastEncBackup)) / DAY) : null; add('Shop data', C('backup', bk == null ? 'fail' : bk > 30 ? 'warn' : 'ok', 'Encrypted backup', bk == null ? 'never downloaded' : bk + ' days ago', 'Settings → Security & backup → Download. The server has one disk and no copy.'));
  });
  safe('Shop data', 'files', () => {
    for (const f of ['shop-db.json', 'admin.json', 'secrets.json', 'analytics.json', 'privacy-rights.json', 'weborders.json']) { const p = path.join(cfg.dataDir, f); if (!fs.existsSync(p)) continue; try { JSON.parse(fs.readFileSync(p, 'utf8')); } catch { add('Shop data', C('file-' + f, 'fail', f + ' is damaged', 'cannot be read as JSON', 'Restore from a backup. Do not delete it.')); } }
  });

  // ---- 3. security ----
  safe('Security', 'sec', () => {
    add('Security', C('owner', auth.configured ? 'ok' : 'fail', 'Owner account created', auth.configured ? 'yes' : 'NOT created: anyone with the setup token can take over', 'Open /admin and create the account now.'));
    add('Security', C('2fa', auth.twoFactorOn ? 'ok' : 'warn', '2-step sign-in', auth.twoFactorOn ? 'on' : 'off', 'Settings → Security & backup.'));
    add('Security', C('token', cfg.adminToken ? (String(cfg.adminToken).length >= 24 ? 'ok' : 'warn') : 'info', 'ADMIN_TOKEN (assistant API)', cfg.adminToken ? (String(cfg.adminToken).length >= 24 ? 'set, long enough' : 'set but short') : 'not set (the assistant API is closed)', 'Use 24+ random characters.'));
    add('Security', C('ips', 'info', 'Owner app IP limit', cfg.adminAllowedIps && cfg.adminAllowedIps.length ? cfg.adminAllowedIps.length + ' address(es) allowed' : 'open to any address (password + 2-step protect it)'));
    const ev = auth.auditTail(300), day = now - DAY, recent = ev.filter(e => Date.parse(e.t) > day), bad = recent.filter(e => !e.ok && /login/.test(e.ev)), lock = recent.filter(e => /lock/.test(e.ev + e.extra));
    add('Security', C('logins', bad.length > 20 ? 'fail' : bad.length > 5 ? 'warn' : 'ok', 'Failed sign-ins, last 24 h', String(bad.length) + (lock.length ? `, ${lock.length} lock-out(s)` : ''), 'Many failures from one address means someone is guessing. Consider ADMIN_ALLOWED_IPS.'));
    const last = ev.find(e => e.ok && /login/.test(e.ev)); add('Security', C('last-login', 'info', 'Last successful sign-in', last ? `${ago(Date.parse(last.t))} from ${last.ip}${last.extra ? ' (' + last.extra + ')' : ''}` : 'none recorded'));
    add('Security', C('team', 'info', 'Helper logins', String(auth.teamList().length)));
    add('Security', C('secrets', 'info', 'Encryption key', cfg.adminSetupToken ? 'ADMIN_SETUP_TOKEN set (do not change it: it unlocks saved keys)' : 'ADMIN_SETUP_TOKEN missing'));
  });

  // ---- 4. public website ----
  const site = cfg.siteUrl;
  if (!site) add('Public website', C('site-url', 'warn', 'SITE_URL not set', '', 'Set SITE_URL to the public website address.'));
  else {
    let origin = ''; try { origin = new URL(site).origin; } catch { }
    add('Public website', C('cors', origin && cfg.allowedOrigins.includes(origin) ? 'ok' : 'fail', 'Website allowed to send orders to this server', origin && cfg.allowedOrigins.includes(origin) ? origin : `ALLOWED_ORIGINS does not contain ${origin || site}`, 'Customers\' orders and privacy requests are refused until ALLOWED_ORIGINS includes the website origin.'));
    try {
      const t0 = Date.now(), r = await fetchImpl(site + '/', { signal: AbortSignal.timeout(8000), redirect: 'follow' }), html = await r.text(), ms = Date.now() - t0;
      add('Public website', C('site-up', r.ok ? (ms > 3000 ? 'warn' : 'ok') : 'fail', 'Website reachable', `${r.status} in ${ms} ms, ${size(html.length)}`, 'GitHub Pages may be down or the repository setting is off.'));
      const m = /window\.__SHOP_API\s*=\s*"([^"]*)"/.exec(html), api = m ? m[1].replace(/\/+$/, '') : '';
      add('Public website', C('site-api', api && api === cfg.wa.publicUrl ? 'ok' : api ? 'fail' : 'warn', 'Website points to this server', api ? (api === cfg.wa.publicUrl ? api : `points to ${api}, this server is ${cfg.wa.publicUrl}`) : 'no server address inside the page (orders stay on the phone)', 'Rebuild with: python3 tools/build-split.py --shop-api <this server> --index, then publish.'));
      add('Public website', C('site-nocheat', /adminPin|1234|HDFC/i.test(html) ? 'fail' : 'ok', 'No admin secrets in the public page', /adminPin|1234|HDFC/i.test(html) ? 'the page contains admin data (PIN or bank text)' : 'clean', 'The public page must be built with build-split.py, not copied from the source.'));
    } catch (e) { add('Public website', C('site-up', 'fail', 'Website reachable', String(e.message).slice(0, 120), 'Open ' + site + ' on a phone. If it loads, this server cannot reach the internet.')); }
  }
  safe('Public website', 'pub', () => {
    const v = shop.get(); add('Public website', C('pub-shop', v.db ? 'ok' : 'warn', 'What the website may read (/public/shop)', v.db ? `version ${v.version}` : 'empty: the website shows demo data', 'Save once in the owner app.'));
    const h = analytics.s.days, keys = Object.keys(h).sort(), lastDay = keys[keys.length - 1]; add('Public website', C('visits', 'info', 'Visitor counting', lastDay ? `last day with visits: ${lastDay} (${h[lastDay].pv} page views, ${h[lastDay].visitors} visitors)` : 'no visits counted yet'));
  });

  // ---- 5. orders & payments ----
  safe('Orders & payments', 'orders', () => {
    const wo = weborders.list(), fresh = wo.filter(r => r.status === 'new'), oldest = fresh.length ? Math.min(...fresh.map(r => Date.parse(r.createdAt))) : 0;
    add('Orders & payments', C('web-new', !fresh.length ? 'ok' : now - oldest > DAY ? 'fail' : 'warn', 'Website orders waiting for you', fresh.length ? `${fresh.length} waiting, oldest ${ago(oldest)}` : 'none', 'Orders → "New from the website". A customer is waiting for a WhatsApp message.'));
    add('Orders & payments', C('web-total', 'info', 'Website orders so far', `${wo.length} (${wo.filter(r => r.status === 'accepted').length} accepted, ${wo.filter(r => r.status === 'declined').length} declined)`));
    const flagged = fresh.filter(r => r.check && r.check.issues && r.check.issues.length).length; if (flagged) add('Orders & payments', C('web-flag', 'warn', 'Website orders with a problem', flagged + ' have a price, stock or product warning', 'Open each one and read "Check first".'));
    const prov = cfg.payments.provider; add('Orders & payments', C('pay-provider', prov === 'mock' ? 'warn' : 'ok', 'Payment provider', prov === 'mock' ? 'mock (pretend payments)' : prov, 'Fine while payments are agreed on WhatsApp. Set PAYMENT_PROVIDER=razorpay for real links.'));
    if (prov === 'razorpay') { const r = cfg.payments.razorpay; add('Orders & payments', C('rzp', r.keyId && r.keySecret && r.webhookSecret ? 'ok' : 'fail', 'Razorpay keys', `key id ${r.keyId ? 'set' : 'MISSING'}, secret ${r.keySecret ? 'set' : 'MISSING'}, webhook secret ${r.webhookSecret ? 'set' : 'MISSING'}`, 'Paid orders cannot be confirmed without the webhook secret.')); }
    add('Orders & payments', C('wa-orders', 'info', 'WhatsApp orders waiting to import', String(store.s.orders.filter(o => o.status === 'new').length)));
  });

  // ---- 6. WhatsApp ----
  safe('WhatsApp', 'wa', () => {
    add('WhatsApp', C('wa-live', cfg.waLive ? 'ok' : 'warn', 'WhatsApp connection', cfg.waLive ? 'live' : 'dry-run: nothing is really sent', 'Set WA_PHONE_NUMBER_ID and WA_ACCESS_TOKEN.'));
    if (cfg.waLive) {
      add('WhatsApp', C('wa-secret', cfg.wa.appSecret ? 'ok' : 'fail', 'Webhook signature check (WA_APP_SECRET)', cfg.wa.appSecret ? 'set' : 'missing: anyone could fake incoming messages', 'Add WA_APP_SECRET from the Meta app.'));
      add('WhatsApp', C('wa-verify', cfg.wa.verifyToken ? 'ok' : 'warn', 'Webhook verify token', cfg.wa.verifyToken ? 'set' : 'missing'));
      add('WhatsApp', C('wa-owner', cfg.wa.ownerPhone ? 'ok' : 'warn', 'Your own number for alerts (OWNER_PHONE)', cfg.wa.ownerPhone ? 'set' : 'missing', 'Without it you are not alerted about handoffs and new orders.'));
      add('WhatsApp', C('wa-otp', 'info', 'Verification-code template', cfg.privacyOtpTemplate + ' (must be approved in Meta)'));
    }
    const open = store.s.handoffs.filter(h => h.status === 'open'); const old = open.filter(h => now - h.createdAt > 6 * 3600_000).length;
    add('WhatsApp', C('handoffs', old ? 'warn' : 'ok', 'Customers waiting for a person', `${open.length} open${old ? `, ${old} for over 6 hours` : ''}`, 'Reply in the Inbox; WhatsApp only allows free replies within 24 hours.'));
    add('WhatsApp', C('carts', 'info', 'Cart reminders', store.s.cartSettings.enabled && cfg.cart.enabled ? 'on' : 'off'));
  });

  // ---- 7. AI ----
  safe('AI helpers', 'ai', () => {
    const key = !!cfg.anthropicKey && cfg.anthropicKey !== 'missing'; add('AI helpers', C('ai-key', key ? 'ok' : 'warn', 'Anthropic key', key ? 'set' : 'not set: AI helpers and the WhatsApp assistant are off', 'Settings → Security & backup → Claude AI key.'));
    const used = store.usageToday(), max = cfg.maxCallsPerDay; add('AI helpers', C('ai-use', used > max * 0.9 ? 'warn' : 'ok', 'AI calls today', `${used} of ${max}`, 'Raise MAX_CLAUDE_CALLS_PER_DAY or find what is looping.'));
    add('AI helpers', C('ai-model', 'info', 'Model', cfg.model));
  });

  // ---- 8. Instagram ----
  safe('Instagram', 'ig', () => {
    add('Instagram', C('ig-conn', ig.configured ? 'ok' : 'info', 'Instagram connected', ig.configured ? 'yes' : 'not connected (optional)', 'Needs IG_USER_ID and IG_ACCESS_TOKEN. Long-lived tokens expire after about 60 days: renew them.'));
    if (ig.configured) { const snap = Object.keys(analytics.s.ig || {}).sort(), l = snap[snap.length - 1]; add('Instagram', C('ig-snap', l && now - Date.parse(l) < 3 * DAY ? 'ok' : 'warn', 'Follower count last recorded', l || 'never', 'If it is old, the token may have expired. Reconnect.')); }
  });

  // ---- 9. email ----
  safe('Email', 'mail', () => {
    const m = smtpMeta(); add('Email', C('smtp', m.configured ? 'ok' : 'warn', 'Email sending', m.configured ? `${m.host}:${m.port} to ${m.to}` : 'not set up: no reports, no privacy-request alerts', 'Growth → Weekly report by email.'));
    const rs = reportState(); for (const k of ['weekly', 'monthly']) { const r = rs[k]; if (r) add('Email', C('rep-' + k, r.state === 'failed' ? 'fail' : 'ok', `Last ${k} report`, r.state === 'failed' ? `FAILED (${r.error || 'unknown'}), next try ${r.retryAt ? ago(r.retryAt).replace(' ago', '') : ''}` : `${r.state} ${r.at ? ago(r.at) : ''}`, 'Check the mail password and the provider.')); }
  });

  // ---- 10. privacy ----
  safe('Privacy (DPDP)', 'priv', () => {
    const a = privacy.attention(5), s = privacy.state(), br = privacy.breaches().filter(b => b.status === 'open');
    add('Privacy (DPDP)', C('p-late', a.late.length ? 'fail' : a.soon.length ? 'warn' : 'ok', 'Privacy requests', `${a.open} open, ${a.late.length} late, ${a.soon.length} due in 5 days`, 'The law asks for an answer within 30 days. Privacy tab.'));
    add('Privacy (DPDP)', C('p-breach', br.length ? 'fail' : 'ok', 'Open breaches', String(br.length), 'Report to the Data Protection Board within 72 hours of detection.'));
    const sw = s.lastSweep ? Math.floor((now - Date.parse(s.lastSweep + 'T12:00:00Z')) / DAY) : null; add('Privacy (DPDP)', C('p-sweep', sw == null ? 'warn' : sw > 2 ? 'fail' : 'ok', 'Daily clean-up (old chats, carts, order contacts)', s.lastSweep ? `last ran ${s.lastSweep}` : 'never ran', 'It runs once a day by itself; if stale the server may be asleep or crashing.'));
    add('Privacy (DPDP)', C('p-officer', (st.grievanceOfficer || '').trim() ? 'ok' : 'warn', 'Grievance officer named', (st.grievanceOfficer || '').trim() ? 'yes' : 'no', 'Settings → Grievance officer.'));
    add('Privacy (DPDP)', C('p-erased', 'info', 'People on the do-not-bring-back list', String(privacy.erasedCount())));
  });

  // ---- 11. errors ----
  add('Recent errors', C('err-count', ops.errors.length ? (ops.errors.some(e => now - Date.parse(e.at) < 3600_000) ? 'fail' : 'warn') : 'ok', 'Server errors since it started', ops.errors.length ? String(ops.errors.length) : 'none', 'Details below. Also see the Render logs for the full stack.'));
  for (const e of ops.errors.slice(0, 10)) add('Recent errors', C('err', 'info', e.level + ' · ' + e.at.slice(0, 19).replace('T', ' ') + ' UTC', e.msg));

  // ---- previews: what Instagram and WhatsApp are doing right now (no customer message text, numbers masked) ----
  const previews = { instagram: null, whatsapp: null };
  try {
    const base = cfg.wa.publicUrl || '', thumb = j => { const id = j.kind === 'reel' ? j.coverId : (j.mediaIds || [])[0]; return id ? `/media/${id}.jpg` : ''; };
    const jobs = social && social.list ? social.list() : [], by = k => jobs.filter(j => j.status === k).length;
    const snap = Object.keys((analytics.s && analytics.s.ig) || {}).sort(), lastSnap = snap.length ? analytics.s.ig[snap[snap.length - 1]] : null;
    previews.instagram = { connected: !!ig.configured, postedToday: social && social.postedToday ? social.postedToday() : 0, dailyCap: cfg.ig.dailyCap || 20, counts: { queued: by('queued'), posted: by('posted'), failed: by('failed'), publishing: by('publishing'), check: by('check') },
      followers: lastSnap ? { count: lastSnap.followers, on: snap[snap.length - 1] } : null, publicUrlOk: /^https:\/\//.test(base),
      posts: jobs.slice(0, 6).map(j => ({ id: j.id, kind: j.kind, status: j.status, when: j.postedAt || j.when, caption: String(j.caption || '').slice(0, 160), product: j.productName || '', permalink: j.permalink || '', error: j.error || '', attempts: j.attempts || 0, thumb: thumb(j) })) };
    if (previews.instagram.counts.failed) add('Instagram', C('ig-failed', 'warn', 'Instagram posts that failed', String(previews.instagram.counts.failed), 'Open the Instagram tab and press Retry, or read the error under "Latest posts" below.'));
    if (!previews.instagram.publicUrlOk) add('Instagram', C('ig-url', 'warn', 'Instagram cannot fetch photos', 'PUBLIC_URL is not https', 'Instagram downloads each photo from this server\'s https address.'));
  } catch (e) { previews.instagram = { error: String(e.message).slice(0, 120) }; }
  try {
    const mask = p => { const d = String(p || '').replace(/\D/g, ''); return d.length > 4 ? '••••••' + d.slice(-4) : '••••'; }, convs = Object.values(store.s.conversations || {}), t = Date.now();
    const li = convs.reduce((m, c) => Math.max(m, c.lastInboundAt || 0), 0), la = convs.reduce((m, c) => Math.max(m, c.lastActivityAt || 0), 0);
    previews.whatsapp = { mode: cfg.waLive ? 'live' : 'dry-run', ownerAlerts: !!cfg.wa.ownerPhone, conversations: convs.length, active24h: convs.filter(c => t - (c.lastInboundAt || 0) < DAY).length, humanHandling: convs.filter(c => c.status && c.status !== 'bot').length, unread: convs.reduce((n, c) => n + (c.unread || 0), 0), lastInboundAt: li || null, lastActivityAt: la || null,
      recent: convs.slice().sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0)).slice(0, 6).map(c => ({ who: mask(c.phone), status: c.status || 'bot', lang: c.lang || '', unread: c.unread || 0, lastInboundAt: c.lastInboundAt || null, lastActivityAt: c.lastActivityAt || null, windowOpen: t - (c.lastInboundAt || 0) < DAY })),
      wouldSend: wa && wa.dry && wa.sentLog ? wa.sentLog.slice(-5).reverse().map(m => ({ to: mask(m.to), type: m.type || '', template: m.template && m.template.name || '' })) : null,
      optedOut: Object.keys(store.s.optOut || {}).length };
    if (cfg.waLive && li && t - li > 7 * DAY) add('WhatsApp', C('wa-quiet', 'warn', 'No customer message for over 7 days', ago(li), 'If customers are writing, the webhook may be broken: check the Meta app webhook and WA_APP_SECRET.'));
  } catch (e) { previews.whatsapp = { error: String(e.message).slice(0, 120) }; }

  const groups = Object.entries(G).map(([name, checks]) => ({ name, checks }));
  const all = groups.flatMap(g => g.checks), count = s => all.filter(c => c.status === s).length;
  return { at: new Date().toISOString(), previews, summary: { fail: count('fail'), warn: count('warn'), ok: count('ok'), info: count('info') }, groups };
}
