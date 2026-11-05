// WhatsApp message ledger, costs, templates and promotion campaigns (owner only).
//  * LEDGER  every message that leaves through WhatsApp.mjs is counted: when, to whom (only the last 4 digits are kept), kind
//            (service / utility / marketing / authentication), source (assistant, order, cart, promo, otp...), template, campaign,
//            status (sent / failed / dry = nothing really left because WhatsApp is not live) and the price at that moment.
//  * COSTS   a rate table the owner can edit (rupees per message by kind). The defaults are ROUGH and labelled as such: Meta changes
//            prices, so the owner checks Meta's price list for India. Service messages (replies inside 24 h) are free by default.
//            Other running costs (server, domain, Claude...) are entered by hand; together they give the total expenses.
//  * TEMPLATES a list of the owner's WhatsApp templates (name, kind, wording, status set by hand after Meta approves).
//  * CAMPAIGNS a promotion = one approved marketing template sent to customers who said yes to offers and have not opted out.
//            Never between 9 pm and 9 am IST, a daily cap, one message per person per campaign (an atomic claim taken just
//            before each send, so two runs can never send the same person twice), a test send first, and always the owner's go-ahead.
// Nothing here talks to customers by itself except a campaign the owner has started.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const KINDS = ['service', 'utility', 'marketing', 'authentication'];
export const KIND_LABEL = { service: 'Regular (replies within 24 h)', utility: 'Order updates (utility)', marketing: 'Promotions (marketing)', authentication: 'Sign-in codes' };
// ROUGH defaults in rupees, not a promise: the owner must check Meta's current price list for India and edit these.
export const DEFAULT_RATES = { service: 0, utility: 0.12, marketing: 0.88, authentication: 0.12 };
const IST = 330 * 60_000, DAY = 86400_000;
const istDate = t => new Date(t + IST).toISOString().slice(0, 10);
const istHour = t => new Date(t + IST).getUTCHours();
const money = n => Math.round(n * 10000) / 10000;
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
export const normPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d.length === 11 && d[0] === '0' ? '91' + d.slice(1) : d; };
const hashPhone = p => crypto.createHash('sha256').update('wa|' + p).digest('hex').slice(0, 20);
const MAX_MSGS = 30000;

export class WaStore {
  constructor(dir, now = () => Date.now()) { this.file = path.join(dir, 'wamsg.json'); this.now = now; this.d = null; }
  load() {
    if (this.d) return this.d;
    let d = {}; try { d = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { /* first run */ }
    this.d = { messages: d.messages || [], rates: { ...DEFAULT_RATES, ...(d.rates || {}) }, ratesNote: d.ratesNote || '', expenses: d.expenses || [], templates: d.templates || [], campaigns: d.campaigns || [], claims: d.claims || {}, settings: { dailyCap: 200, ...(d.settings || {}) } };
    return this.d;
  }
  save() { const d = this.load(), t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(d), { mode: 0o600 }); fs.renameSync(t, this.file); }
}

export function makeWaLedger({ cfg, dir, store, shop, now = () => Date.now(), paceMs = 1200 }) {
  const S = new WaStore(dir, now), D = () => S.load();
  const known = () => { const t = (cfg.payments && cfg.payments.templates) || {}; return { cart: new Set(((cfg.cart && cfg.cart.templates) || []).filter(Boolean)), order: new Set(Object.values(t).filter(Boolean)), otp: new Set([cfg.privacyOtpTemplate].filter(Boolean)) }; };

  function kindOf(payload) {
    if (!payload || payload.type !== 'template') return 'service';
    const name = payload.template && payload.template.name, reg = D().templates.find(t => t.name === name);
    if (reg) return reg.kind;
    return /otp|code|verify/i.test(name || '') ? 'authentication' : 'utility';   // an unlisted template is billed as utility until the owner lists it
  }
  function sourceOf(payload, meta) {
    if (meta && meta.source) return meta.source;
    if (!payload || payload.type !== 'template') return 'assistant';
    const n = payload.template && payload.template.name, k = known();
    return k.cart.has(n) ? 'cart' : k.otp.has(n) ? 'otp' : k.order.has(n) ? 'order' : 'other';
  }
  // called by WhatsApp._post after every real or simulated send
  function record(payload, outcome, meta = {}) {
    if (!payload || payload.status === 'read') return;   // read receipts / typing dots are not messages
    const d = D(), kind = kindOf(payload), status = outcome.dry ? 'dry' : outcome.error ? 'failed' : 'sent', to = normPhone(payload.to);
    const rate = d.rates[kind] || 0;
    d.messages.push({ at: now(), kind, source: sourceOf(payload, meta), template: payload.type === 'template' ? clean(payload.template && payload.template.name, 60) : '', campaign: clean(meta.campaign, 40), status, to4: to.slice(-4), cost: status === 'sent' ? money(rate) : 0, rate: money(rate), err: outcome.error ? clean(outcome.error, 160) : '' });
    if (d.messages.length > MAX_MSGS) d.messages.splice(0, d.messages.length - MAX_MSGS);
    S.save();
  }

  // ---------------- costs and expenses ----------------
  function setRates(b) {
    const d = D(), bad = [];
    for (const k of KINDS) if (b && b.rates && b.rates[k] !== undefined) { const v = Number(b.rates[k]); if (!isFinite(v) || v < 0 || v > 100) bad.push(k); else d.rates[k] = money(v); }
    if (bad.length) return { code: 400, error: 'Prices must be numbers between 0 and 100 rupees (' + bad.join(', ') + ').' };
    if (b && b.note !== undefined) d.ratesNote = clean(b.note, 200);
    S.save(); return { code: 200, rates: d.rates, ratesNote: d.ratesNote };
  }
  function addExpense(b) {
    const label = clean(b && b.label, 80), amount = Number(b && b.amount), every = b && b.every === 'month' ? 'month' : 'once', from = /^\d{4}-\d{2}-\d{2}$/.test(String(b && b.from)) ? b.from : istDate(now());
    if (!label) return { code: 400, error: 'Write what the cost is for (for example: Server).' };
    if (!isFinite(amount) || amount <= 0 || amount > 10_000_000) return { code: 400, error: 'The amount must be a number above 0.' };
    const e = { id: 'x' + crypto.randomBytes(5).toString('hex'), label, amount: money(amount), every, from, to: /^\d{4}-\d{2}-\d{2}$/.test(String(b && b.to)) ? b.to : '', note: clean(b && b.note, 120) };
    D().expenses.push(e); S.save(); return { code: 200, expense: e };
  }
  function removeExpense(id) { const d = D(), n = d.expenses.length; d.expenses = d.expenses.filter(e => e.id !== id); S.save(); return { code: n === d.expenses.length ? 404 : 200, ...(n === d.expenses.length ? { error: 'Not found' } : { ok: true }) }; }
  // how much one expense costs inside [from, to] (ISO dates, inclusive). Monthly = counted once for every calendar month that has a day inside both its own span and the range.
  function expenseIn(e, from, to) {
    if (e.every === 'once') return e.from >= from && e.from <= to ? e.amount : 0;
    const a = e.from > from ? e.from : from, b = e.to && e.to < to ? e.to : to; if (a > b) return 0;
    let m = a.slice(0, 7), n = 0; const last = b.slice(0, 7);
    while (m <= last && n < 600) { n++; const [y, mo] = m.split('-').map(Number); m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; }
    return n * e.amount;
  }

  // ---------------- reports ----------------
  function report({ from, to } = {}) {
    const d = D(), t = now(); to = /^\d{4}-\d{2}-\d{2}$/.test(String(to)) ? to : istDate(t); from = /^\d{4}-\d{2}-\d{2}$/.test(String(from)) ? from : istDate(t - 29 * DAY);
    if (from > to) [from, to] = [to, from];
    const rows = d.messages.filter(m => { const day = istDate(m.at); return day >= from && day <= to; });
    const blank = () => ({ sent: 0, failed: 0, dry: 0, cost: 0 });
    const add = (o, k, m) => { const r = o[k] || (o[k] = blank()); r[m.status]++; r.cost = money(r.cost + m.cost); };
    const byKind = {}, bySource = {}, byDay = {}, byMonth = {}, byCampaign = {};
    for (const k of KINDS) byKind[k] = blank();
    for (const m of rows) { add(byKind, m.kind, m); add(bySource, m.source, m); add(byDay, istDate(m.at), m); add(byMonth, istDate(m.at).slice(0, 7), m); if (m.campaign) add(byCampaign, m.campaign, m); }
    const tot = blank(); for (const m of rows) { tot[m.status]++; tot.cost = money(tot.cost + m.cost); }
    const expenses = d.expenses.map(e => ({ ...e, inRange: money(expenseIn(e, from, to)) })).filter(e => e.inRange > 0);
    const other = money(expenses.reduce((s, e) => s + e.inRange, 0));
    const camp = d.campaigns.map(c => ({ id: c.id, name: c.name, ...(byCampaign[c.id] || blank()) })).filter(c => byCampaign[c.id]);
    return { code: 200, from, to, totals: tot, byKind, bySource, byDay, byMonth, campaigns: camp, expenses, messageCost: tot.cost, otherCosts: other, totalExpenses: money(tot.cost + other), rates: d.rates, ratesNote: d.ratesNote, kinds: KIND_LABEL, live: !!cfg.waLive };
  }
  function csv(q) {
    const r = report(q), d = D(), esc = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    const lines = [['date_ist', 'time_ist', 'kind', 'source', 'template', 'campaign', 'status', 'to_last4', 'cost_inr'].join(',')];
    for (const m of d.messages) { const day = istDate(m.at); if (day < r.from || day > r.to) continue; lines.push([day, new Date(m.at + IST).toISOString().slice(11, 16), m.kind, m.source, m.template, m.campaign, m.status, m.to4, m.cost].map(esc).join(',')); }
    return lines.join('\n') + '\n';
  }

  // ---------------- templates ----------------
  const NAME = /^[a-z][a-z0-9_]{2,59}$/, STATUS = ['draft', 'submitted', 'approved', 'rejected'];
  const vars = body => [...new Set([...String(body).matchAll(/\{\{(\d{1,2})\}\}/g)].map(m => Number(m[1])))].sort((a, b) => a - b);
  const hasOptOut = body => /\b(stop|unsubscribe|opt[ -]?out)\b/i.test(body);
  function checkTemplate(t) {
    const issues = [], vs = vars(t.body);
    if (!NAME.test(t.name)) issues.push('The name must be small letters, numbers and underscores only (example: diwali_offer_2026).');
    if (!KINDS.includes(t.kind) || t.kind === 'service') issues.push('Choose marketing, utility or authentication (service replies need no template).');
    if (!t.body || t.body.length < 10) issues.push('Write the message wording.');
    if (t.body && t.body.length > 1024) issues.push('WhatsApp allows at most 1024 characters.');
    if (vs.some((v, i) => v !== i + 1)) issues.push('Variables must be numbered {{1}}, {{2}}, {{3}} without gaps.');
    if (t.body && /^\s*\{\{|\{\{\d+\}\}\s*$/.test(t.body)) issues.push('Meta does not accept a template that starts or ends with a variable.');
    if (t.kind === 'marketing' && t.body && !hasOptOut(t.body)) issues.push('A promotion must tell people how to stop (for example: Reply STOP to stop offers).');
    if (t.body && /(guarantee[d]? (sale|views|profit)|100% (pure|genuine)|cancel(lation)? (your )?order)/i.test(t.body)) issues.push('Remove promises that cannot be kept (guarantees, cancellation offers).');
    return { issues, vars: vs };
  }
  function saveTemplate(b) {
    const d = D(), t = { name: clean(b && b.name, 60).toLowerCase(), kind: clean(b && b.kind, 20), lang: clean((b && b.lang) || 'en', 8) || 'en', body: String((b && b.body) || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 1100), example: (Array.isArray(b && b.example) ? b.example : []).slice(0, 10).map(x => clean(x, 60)), status: STATUS.includes(b && b.status) ? b.status : 'draft', note: clean(b && b.note, 160) };
    const c = checkTemplate(t); if (c.issues.length && t.status !== 'draft') return { code: 400, error: c.issues[0], issues: c.issues };
    const i = d.templates.findIndex(x => x.name === t.name); t.updatedAt = now();
    if (i >= 0) d.templates[i] = { ...d.templates[i], ...t }; else { if (d.templates.length >= 200) return { code: 400, error: 'Too many templates (200 at most).' }; d.templates.push(t); }
    S.save(); return { code: 200, template: t, issues: c.issues, vars: c.vars };
  }
  function removeTemplate(name) { const d = D(), used = d.campaigns.some(c => c.template === name && ['approved', 'sending'].includes(c.status)); if (used) return { code: 409, error: 'A running promotion uses this template.' }; const n = d.templates.length; d.templates = d.templates.filter(t => t.name !== name); S.save(); return n === d.templates.length ? { code: 404, error: 'Not found' } : { code: 200, ok: true }; }
  // plain drafts for when Claude is not connected: three safe, honest variants. Never mentions a discount unless the owner typed one.
  function localTemplates(i = {}) {
    const goal = clean(i.goal, 200) || 'our new sarees', offer = clean(i.offer, 120), kind = i.kind === 'utility' ? 'utility' : 'marketing', shop = clean(i.shop, 60) || 'Anitha Pemmasani';
    if (kind === 'utility') return [{ name: 'order_update_note', kind, body: `Hello {{1}}, an update on your order {{2}} from ${shop}: {{3}}. Thank you for shopping with us.`, example: ['Priya', 'AP-1001', 'it has been packed'], note: 'Plain order update.' }];
    const o = offer ? ` ${offer}.` : '';
    return [
      { name: 'new_arrivals_note', kind, body: `Hello {{1}}, new handloom sarees have arrived at ${shop}.${o} Have a look when you have a moment: {{2}}\nReply STOP to stop offers.`, example: ['Priya', 'https://example.com'], note: 'Short and gentle.' },
      { name: 'festive_note', kind, body: `Namaste {{1}}, ${shop} has something for ${goal}.${o} We would love to help you choose. Visit {{2}}\nReply STOP to stop offers.`, example: ['Priya', 'https://example.com'], note: 'Warm, festival style.' },
      { name: 'we_miss_you_note', kind, body: `Hello {{1}}, it has been a while! See what is new at ${shop}: {{2}}\nReply STOP to stop offers.`, example: ['Priya', 'https://example.com'], note: 'For customers who have not ordered lately.' },
    ];
  }

  // ---------------- audience and campaigns ----------------
  function audience() {
    const db = (shop.get() || {}).db || {}, seen = new Set(), out = []; let noConsent = 0, optedOut = 0, noPhone = 0;
    for (const u of db.users || []) {
      const p = normPhone(u && u.phone); if (!p || p.length < 11) { noPhone++; continue; }
      if (!(u.consents && u.consents.marketing)) { noConsent++; continue; }
      if (store.isOptedOut(p) || store.isOptedOut('+' + p)) { optedOut++; continue; }
      if (seen.has(p)) continue; seen.add(p); out.push({ phone: p, name: clean(String(u.name || '').split(/\s+/)[0], 40) || 'there' });
    }
    return { list: out, noConsent, optedOut, noPhone };
  }
  const allowedNow = () => { const h = istHour(now()); return h >= 9 && h < 21; };
  const sentToday = () => { const day = istDate(now()); return D().messages.filter(m => m.kind === 'marketing' && m.status !== 'failed' && istDate(m.at) === day).length; };
  function estimate(templateName) {
    const a = audience(), reg = D().templates.find(t => t.name === templateName), kind = reg ? reg.kind : 'marketing', per = D().rates[kind] || 0;
    return { recipients: a.list.length, skippedNoConsent: a.noConsent, skippedOptedOut: a.optedOut, skippedNoPhone: a.noPhone, perMessage: per, estimate: money(per * a.list.length) };
  }
  function params(c, name) { return (c.params || []).map(p => p === '@name' ? name : p); }
  function createCampaign(b) {
    const d = D(), reg = d.templates.find(t => t.name === clean(b && b.template, 60));
    if (!reg) return { code: 400, error: 'Pick one of your templates first.' };
    if (reg.kind !== 'marketing') return { code: 400, error: 'A promotion needs a marketing template.' };
    if (reg.status !== 'approved') return { code: 400, error: 'Meta must approve this template first. When it does, mark it Approved in the Templates list.' };
    const c0 = checkTemplate(reg); if (c0.issues.length) return { code: 400, error: c0.issues[0] };
    const p = (Array.isArray(b.params) ? b.params : []).slice(0, 10).map(x => clean(x, 200)); if (p.length !== c0.vars.length) return { code: 400, error: `This template has ${c0.vars.length} variable(s); give exactly that many values (use @name for the customer's first name).` };
    const name = clean(b.name, 80); if (!name) return { code: 400, error: 'Give the promotion a name.' };
    if (d.campaigns.filter(c => c.status === 'draft').length >= 50) return { code: 400, error: 'Too many unsent promotions. Delete some first.' };
    const c = { id: 'c' + crypto.randomBytes(5).toString('hex'), name, template: reg.name, lang: reg.lang, params: p, status: 'draft', createdAt: now(), sent: 0, failed: 0, skipped: 0 };
    d.campaigns.unshift(c); S.save(); return { code: 200, campaign: c, ...estimate(reg.name) };
  }
  function removeCampaign(id) { const d = D(), c = d.campaigns.find(x => x.id === id); if (!c) return { code: 404, error: 'Not found' }; if (c.status === 'sending') return { code: 409, error: 'Stop it first.' }; d.campaigns = d.campaigns.filter(x => x.id !== id); S.save(); return { code: 200, ok: true }; }
  async function testSend(id, to, wa) {
    const c = D().campaigns.find(x => x.id === id); if (!c) return { code: 404, error: 'Not found' };
    const p = normPhone(to); if (p.length < 11) return { code: 400, error: 'Type your own WhatsApp number with the country code.' };
    try { await wa.sendTemplate(p, c.template, params(c, 'Test'), c.lang, { source: 'promo-test', campaign: c.id }); } catch (e) { return { code: 502, error: 'The test did not go: ' + e.message.slice(0, 120) }; }
    return { code: 200, ok: true, dry: wa.dry };
  }
  function approve(id, confirmCount) {
    const d = D(), c = d.campaigns.find(x => x.id === id); if (!c) return { code: 404, error: 'Not found' };
    if (c.status !== 'draft') return { code: 409, error: 'This promotion was already started.' };
    const e = estimate(c.template); if (!e.recipients) return { code: 400, error: 'Nobody can receive this: no customer has said yes to offers yet.' };
    if (Number(confirmCount) !== e.recipients) return { code: 409, error: `The number of people changed to ${e.recipients}. Look at it again and confirm.`, ...e };
    c.status = 'sending'; c.approvedAt = now(); c.expected = e.recipients; S.save(); return { code: 200, campaign: c, ...e };
  }
  function stop(id) { const c = D().campaigns.find(x => x.id === id); if (!c) return { code: 404, error: 'Not found' }; if (c.status === 'sending') { c.status = 'stopped'; S.save(); } return { code: 200, campaign: c }; }
  let running = false;
  // sends what it may right now: only 9 am-9 pm IST, not past the daily cap; continues on the next call (the server timer calls it often)
  async function runDue(wa) {
    if (running) return { ran: 0 }; running = true; let ran = 0;
    try {
      for (const c of D().campaigns.filter(x => x.status === 'sending')) {
        const aud = audience().list;
        for (const r of aud) {
          if (c.status !== 'sending') break;
          if (!allowedNow()) return { ran, wait: 'quiet-hours' };
          if (sentToday() >= D().settings.dailyCap) return { ran, wait: 'daily-cap' };
          const key = c.id + ':' + hashPhone(r.phone); if (D().claims[key]) continue;
          D().claims[key] = now(); S.save();   // the claim is taken (and saved) BEFORE the send: no second run can ever pick this person again
          try { await wa.sendTemplate(r.phone, c.template, params(c, r.name), c.lang, { source: 'promo', campaign: c.id }); c.sent++; ran++; }
          catch (e) { c.failed++; }   // a failed person is not retried automatically (the claim stays), so nobody gets two messages
          S.save(); if (paceMs && !wa.dry) await new Promise(r2 => setTimeout(r2, paceMs));
        }
        if (c.status === 'sending') { c.status = 'done'; c.doneAt = now(); S.save(); }
      }
    } finally { running = false; }
    return { ran };
  }
  function setSettings(b) { const cap = Number(b && b.dailyCap); if (!Number.isInteger(cap) || cap < 1 || cap > 5000) return { code: 400, error: 'The daily limit must be a whole number from 1 to 5000.' }; D().settings.dailyCap = cap; S.save(); return { code: 200, settings: D().settings }; }

  function overview() {
    const d = D(); return { code: 200, live: !!cfg.waLive, templates: d.templates.map(t => ({ ...t, issues: checkTemplate(t).issues, vars: vars(t.body) })), campaigns: d.campaigns.slice(0, 50), settings: d.settings, rates: d.rates, ratesNote: d.ratesNote, expenses: d.expenses, quiet: !allowedNow(), sentToday: sentToday(), kinds: KIND_LABEL, audience: (() => { const a = audience(); return { recipients: a.list.length, noConsent: a.noConsent, optedOut: a.optedOut, noPhone: a.noPhone }; })() };
  }
  return { record, report, csv, setRates, addExpense, removeExpense, saveTemplate, removeTemplate, localTemplates, checkTemplate, estimate, createCampaign, removeCampaign, testSend, approve, stop, runDue, setSettings, overview, store: S, _kindOf: kindOf };
}
