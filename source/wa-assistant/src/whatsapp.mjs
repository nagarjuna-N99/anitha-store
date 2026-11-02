import crypto from 'node:crypto';

// ---- inbound: verify Meta's signature over the RAW body, then parse messages ----
export function verifySignature(raw, header, appSecret) {
  if (!appSecret) return false; // refuse to run unsigned in live mode
  const m = /^sha256=([0-9a-f]{64})$/i.exec(header || '');
  if (!m) return false;
  const want = crypto.createHmac('sha256', appSecret).update(raw).digest();
  const got = Buffer.from(m[1], 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

export function parseWebhook(body) {
  const msgs = [];
  for (const entry of body?.entry || []) for (const ch of entry.changes || []) {
    const v = ch.value || {}; if (!v.messages) continue;
    const names = Object.fromEntries((v.contacts || []).map(c => [c.wa_id, c.profile?.name || '']));
    for (const m of v.messages) {
      const type = m.type || 'unknown';
      let text = '';
      if (type === 'text') text = m.text?.body || '';
      else if (type === 'button') text = m.button?.text || '';
      else if (type === 'interactive') text = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
      const buttonId = m.interactive?.button_reply?.id || m.interactive?.list_reply?.id || '';
      msgs.push({ id: m.id, from: String(m.from || ''), name: names[m.from] || '', type: text ? 'text' : type, text, buttonId, caption: m[type]?.caption || '', ts: (+m.timestamp || 0) * 1000 });
    }
  }
  return msgs;
}

// ---- outbound ----
export class WhatsApp {
  constructor(cfg, fetchImpl = fetch) { this.cfg = cfg; this.fetch = fetchImpl; this.dry = !cfg.waLive; this.sentLog = []; }

  async _post(payload) {
    if (this.dry) { this.sentLog.push(payload); return { dry: true }; }
    const { graphUrl, phoneNumberId, token } = this.cfg.wa;
    const res = await this.fetch(`${graphUrl}/${phoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }) });
    if (!res.ok) { const t = await res.text().catch(() => ''); const e = new Error(`WhatsApp send failed ${res.status}: ${t.slice(0, 300)}`); e.status = res.status; throw e; }
    return res.json().catch(() => ({}));
  }
  sendText(to, body) { return this._post({ to, type: 'text', text: { body, preview_url: true } }); }
  sendImage(to, link, caption = '') { return this._post({ to, type: 'image', image: { link, ...(caption ? { caption } : {}) } }); }
  sendDocument(to, link, filename, caption = '') { return this._post({ to, type: 'document', document: { link, filename, ...(caption ? { caption } : {}) } }); }
  // up to 3 quick-reply buttons (WhatsApp limits: body 1024 chars, title 20 chars)
  sendButtons(to, body, buttons) {
    return this._post({ to, type: 'interactive', interactive: { type: 'button', body: { text: String(body).slice(0, 1024) }, action: { buttons: buttons.slice(0, 3).map(b => ({ type: 'reply', reply: { id: String(b.id).slice(0, 256), title: String(b.title).slice(0, 20) } })) } } });
  }
  sendTemplate(to, name, params = [], lang = 'en') {
    return this._post({ to, type: 'template', template: { name, language: { code: lang }, components: params.length ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: String(p).slice(0, 200) })) }] : [] } });
  }
  // shows the double blue tick and a typing dots while Claude thinks
  markRead(messageId) {
    if (this.dry || !messageId) return Promise.resolve();
    return this._post({ status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }).catch(() => {});
  }
}
