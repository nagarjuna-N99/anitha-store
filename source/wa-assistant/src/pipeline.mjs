import { respond } from './assistant.mjs';
import { Catalogue } from './catalogue.mjs';
import { heldMap } from './orders.mjs';

const OPT_OUT = /^\s*(stop|unsubscribe|opt[\s-]?out|cancel messages?)\s*[.!]*\s*$/i;
const OPT_IN = /^\s*(start|subscribe|unstop)\s*[.!]*\s*$/i;
const DAY = 24 * 3600 * 1000;

export const MSG = {
  optedOut: 'Okay, we have stopped messages to this number. Send START any time if you want to chat again.',
  optedIn: 'Welcome back! How can I help you today?',
  nonText: 'Thank you! I can only read typed messages. Could you please type what you are looking for? Anitha will also see your message.',
  photo: 'Thank you for the photo. Anitha will look at it and reply personally.',
  human: 'Anitha has your message and will reply personally. Thank you for your patience.',
  slow: 'You are sending messages very fast. Please wait a few minutes and write again, or Anitha will reply personally.',
  busy: 'We are very busy right now. Anitha will reply to you personally.',
  noCatalogue: 'Welcome! Anitha will reply to you shortly.',
};

export class Pipeline {
  // sink: { send(phone, {type:'text'|'image', ...}) } is how replies leave the building (WhatsApp or the test page)
  constructor({ cfg, store, client, wa, defaultSink }) {
    this.cfg = cfg; this.store = store; this.client = client; this.wa = wa; this.defaultSink = defaultSink; this.queues = new Map(); this.rate = new Map(); this.sinks = new Map(); this.orders = null;
  }
  catalogue() { return new Catalogue(this.store.loadCatalogue(), heldMap(this.store)); }

  // Delivers an order message: free text (with buttons / a document) inside WhatsApp's 24-hour window, an approved template outside it.
  async sendSmart(phone, text, { template, params = [], buttons, document } = {}) {
    const conv = this.store.conv(phone), sink = this.sinks.get(phone) || this.defaultSink;
    const open = phone.startsWith('test-') || !this.cfg.waLive || Date.now() - (conv.lastInboundAt || 0) < 23.5 * 3600 * 1000;
    try {
      if (open) {
        this.log(conv, 'out', document ? `[document ${document.filename}] ${document.url}` : text);
        await sink.send(phone, document ? { type: 'document', url: document.url, filename: document.filename, caption: text } : buttons ? { type: 'buttons', text, buttons } : { type: 'text', text });
      } else if (template) { this.log(conv, 'out', `[template ${template}] ` + text); await this.wa.sendTemplate(phone, template, params, this.cfg.cart.templateLang); }
      else { this.log(conv, 'error', 'Could not send (24h window closed, no template configured): ' + text.slice(0, 80)); }
    } catch (e) { this.log(conv, 'error', 'Send failed: ' + e.message); console.error('[sendSmart]', e.message); }
    this.store.save();
  }

  // One conversation is processed strictly one message at a time (no overlapping replies).
  enqueue(phone, fn) {
    const prev = this.queues.get(phone) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    this.queues.set(phone, next);
    next.finally(() => { if (this.queues.get(phone) === next) this.queues.delete(phone); }).catch(() => {});
    return next;
  }

  rateLimited(phone) {
    const now = Date.now(), { max, windowMs } = this.cfg.rate;
    const arr = (this.rate.get(phone) || []).filter(t => now - t < windowMs); arr.push(now); this.rate.set(phone, arr);
    return arr.length > max ? (arr.length === max + 1 ? 'first' : 'quiet') : false;
  }

  log(conv, dir, text) {
    conv.log = conv.log || []; conv.log.push({ dir, text: String(text).slice(0, 2000), at: Date.now() }); conv.log = conv.log.slice(-200);
    conv.lastActivityAt = Date.now();
  }

  async say(sink, conv, text, dir = 'out') {
    this.log(conv, dir, text);
    try { await sink.send(conv.phone, { type: 'text', text }); } catch (e) { this.log(conv, 'error', 'Send failed: ' + e.message); console.error('[send]', e.message); }
  }

  async notifyOwner(evt, isTest) {
    if (isTest) return;
    const { wa: w } = this.cfg;
    const who = evt.conv.name || evt.conv.phone;
    const reason = { order: () => `New order request ${evt.order.id}: ₹${evt.order.total}`, paid: () => `PAID ${evt.order.id}: ₹${evt.order.pricing?.total ?? evt.order.total}`, expired: () => `Payment link expired ${evt.order.id}`, address: () => `Address changed for ${evt.order.id}${evt.packed ? ' (ALREADY PACKED)' : ''}` }[evt.kind]?.() ?? evt.handoff.reason;
    console.log(`[owner-alert] ${evt.kind} from ${who}: ${reason}`);
    if (this.cfg.waLive && w.ownerPhone && w.ownerAlertTemplate) {
      try { await this.wa.sendTemplate(w.ownerPhone, w.ownerAlertTemplate, [who, reason]); } catch (e) { console.error('[owner-alert] failed', e.message); }
    }
  }

  // Entry point for one inbound customer message.
  handleInbound(msg, sink, { test = false } = {}) {
    return this.enqueue(msg.from, () => this._handle(msg, sink, test));
  }

  async _handle(msg, sink, test) {
    const { store, cfg } = this;
    if (!store.claimMessage(msg.id)) return { skipped: 'duplicate' };
    this.sinks.set(msg.from, sink);
    const phone = msg.from, conv = store.conv(phone);
    if (msg.name && !conv.name) conv.name = msg.name.slice(0, 60);
    conv.lastInboundAt = Date.now();
    const text = (msg.text || '').trim().slice(0, cfg.maxInboundChars);

    // 1. opt-out/in is honoured before anything else, even in human mode
    if (OPT_OUT.test(text)) { store.setOptOut(phone, true); const cc = store.s.carts?.[phone]; if (cc) { cc.items = []; cc.name = ''; cc.consent = { granted: false }; } this.log(conv, 'in', text); await this.say(sink, conv, MSG.optedOut); store.save(); return { optOut: true }; }
    if (OPT_IN.test(text) && store.isOptedOut(phone)) { store.setOptOut(phone, false); this.log(conv, 'in', text); await this.say(sink, conv, MSG.optedIn); store.save(); return { optIn: true }; }
    if (store.isOptedOut(phone)) return { skipped: 'opted-out' };
    if (!test) this.wa.markRead(msg.id); // blue ticks + typing dots, only for people we may talk to

    this.log(conv, 'in', text || `[${msg.type}]`); conv.unread = (conv.unread || 0) + 1;

    // 2. flood protection
    const rl = this.rateLimited(phone);
    if (rl === 'quiet') { store.save(); return { skipped: 'rate-limited' }; }
    if (rl === 'first') { await this.say(sink, conv, MSG.slow); store.save(); return { rateLimited: true }; }

    // 2b. quick-reply buttons under order messages (there is no cancel button: orders cannot be cancelled)
    const bm = /^(track|addr|human|help):(.+)$/.exec(msg.buttonId || '');
    if (bm && this.orders) {
      const o = this.orders.find(bm[2]);
      if (!o || o.phone !== phone) { await this.say(sink, conv, 'Sorry, I could not find that order. Please send your order number.'); store.save(); return { button: 'unknown' }; }
      if (bm[1] === 'track') { await this.say(sink, conv, this.orders.trackingText(o)); store.save(); return { button: 'track' }; }
      if (bm[1] === 'help') {
        conv.pendingIntent = { type: 'help', orderId: o.id, at: Date.now() };
        await this.say(sink, conv, `We are happy to help with order *${o.id}* 💛\nJust tell us what you need, for example:\n• change the delivery address\n• a question about delivery or the saree\n• anything else\nWe will take care of it.`); store.save(); return { button: 'help' };
      }
      if (bm[1] === 'addr') {
        if (!['new', 'payment_pending', 'paid', 'packed'].includes(o.status)) { await this.say(sink, conv, `Order ${o.id} has already been dispatched, so the address cannot be changed here. Tap *Talk to Anitha* if it is urgent.`); store.save(); return { button: 'addr-locked' }; }
        conv.pendingIntent = { type: 'address', orderId: o.id, at: Date.now() };
        await this.say(sink, conv, `Sure! Please send the new delivery address for order *${o.id}* in one message: house/flat number, street, area, city and PIN code.`); store.save(); return { button: 'addr' };
      }
      const h = store.addHandoff({ phone, name: conv.name, reason: 'Customer asked to talk to Anitha', summary: `About order ${o.id} (${o.status}).` });
      conv.status = 'human'; await this.say(sink, conv, 'Sure, Anitha will reply to you personally.'); this.notifyOwner({ kind: 'handoff', conv, handoff: h }, test); store.save(); return { button: 'human', handoff: h.id };
    }

    // 3. a person has taken over: the bot stays silent (one polite note per 6 hours)
    if (conv.status === 'human') {
      if (!conv.heldAt || Date.now() - conv.heldAt > 6 * 3600 * 1000) { conv.heldAt = Date.now(); await this.say(sink, conv, MSG.human); }
      store.save(); return { human: true };
    }

    // 4. not typed text
    if (!text) {
      if (msg.type === 'image') {
        const h = store.addHandoff({ phone, name: conv.name, reason: 'Customer sent a photo', summary: msg.caption ? `Photo with caption: ${msg.caption.slice(0, 200)}` : 'Customer sent a photo without a caption.' });
        conv.status = 'human'; await this.say(sink, conv, MSG.photo); this.notifyOwner({ kind: 'handoff', conv, handoff: h }, test); store.save(); return { handoff: h.id };
      }
      await this.say(sink, conv, MSG.nonText); store.save(); return { nonText: true };
    }

    // 5. spend cap: hand over instead of calling Claude
    if (store.usageToday() >= cfg.maxCallsPerDay) {
      const h = store.addHandoff({ phone, name: conv.name, reason: 'Daily assistant limit reached', summary: text.slice(0, 300) });
      conv.status = 'human'; await this.say(sink, conv, MSG.busy); this.notifyOwner({ kind: 'handoff', conv, handoff: h }, test); store.save(); return { capped: true };
    }
    if (!this.store.loadCatalogue()) {
      const h = store.addHandoff({ phone, name: conv.name, reason: 'Catalogue not uploaded to the assistant yet', summary: text.slice(0, 300) });
      conv.status = 'human'; await this.say(sink, conv, MSG.noCatalogue); this.notifyOwner({ kind: 'handoff', conv, handoff: h }, test); store.save(); return { noCatalogue: true };
    }

    // 6. Claude
    let claudeText = text;
    const pi = conv.pendingIntent;
    if (pi && Date.now() - pi.at < 30 * 60000) {
      claudeText = pi.type === 'help'
        ? `[Context: the customer pressed "Help & support" about order ${pi.orderId}. Help them: if they want a new delivery address use update_delivery_address; answer questions with your tools; for anything you cannot do call handoff_to_owner.]\n${text}`
        : `[Context: the customer pressed "Change address" for order ${pi.orderId}. Treat their message below as the new delivery address and call update_delivery_address.]\n${text}`;
    }
    conv.pendingIntent = null;
    const out = await respond({ cfg, client: this.client, store, catalogue: this.catalogue(), conv, text: claudeText, orders: this.orders, notify: e => this.notifyOwner(e, test) });
    if (out.errorDetail) console.error('[claude]', out.errorDetail);
    for (const t of out.texts) await this.say(sink, conv, t);
    for (const im of out.images) { this.log(conv, 'out', `[photo] ${im.url}`); try { await sink.send(phone, { type: 'image', url: im.url, caption: im.caption }); } catch (e) { this.log(conv, 'error', 'Photo failed: ' + e.message); } }
    if (out.orderId && cfg.payments.approval === 'auto' && this.orders) await this.orders.sendLink(out.orderId);
    store.save();
    return { replied: out.texts.length, images: out.images.length, handoff: out.handoffId, order: out.orderId, error: out.error };
  }

  // Owner writes to the customer from the inbox. Free text is only allowed inside WhatsApp's 24-hour window.
  async ownerReply(phone, text, sink) {
    const conv = this.store.conv(phone);
    if (!this.cfg.waLive) { /* dry run: allow */ } else if (Date.now() - (conv.lastInboundAt || 0) > DAY) {
      const e = new Error('More than 24 hours since the customer last wrote. WhatsApp only allows an approved template message now.'); e.code = 'WINDOW_CLOSED'; throw e;
    }
    conv.status = 'human'; conv.unread = 0; await this.say(sink, conv, text, 'owner'); this.store.save();
  }
}
