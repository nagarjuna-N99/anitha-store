import crypto from 'node:crypto';

// A payment provider is a small adapter with the same four methods. To use another gateway (Cashfree, PayU, Stripe...),
// write one more class here and add it to makeProvider(). Nothing else in the server changes.
//   createLink({ orderId, amountInr, customer:{name,phone}, description, expiresAt }) -> { id, url }
//   verifyWebhook(rawBody, headers) -> boolean      (signature check; unsigned/forged events are rejected)
//   parseEvent(body, headers) -> { id, type:'paid'|'expired'|'cancelled', linkId, orderId, paymentId, amountInr } | null
//   cancelLink(id) -> void
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// ---------- Test provider: a fake hosted pay page so you can try the whole flow without any account ----------
export class MockProvider {
  constructor(cfg) { this.name = 'mock'; this.cfg = cfg; this.secret = cfg.payments.mockSecret; }
  async createLink({ orderId, amountInr }) {
    const id = 'plink_mock_' + crypto.randomBytes(6).toString('hex');
    return { id, url: `${this.cfg.payments.publicUrl || 'http://localhost:' + this.cfg.port}/pay/mock/${id}`, _orderId: orderId, _amount: amountInr };
  }
  sign(raw) { return crypto.createHmac('sha256', this.secret).update(raw).digest('hex'); }
  verifyWebhook(raw, headers) { return !!headers['x-mock-signature'] && safeEq(headers['x-mock-signature'], this.sign(raw)); }
  parseEvent(b) { return b && b.linkId ? { id: b.id, type: b.type, linkId: b.linkId, orderId: b.orderId, paymentId: b.paymentId, amountInr: b.amountInr } : null; }
  async cancelLink() {}
  // used by the fake pay page
  buildEvent(order, outcome) {
    const body = JSON.stringify({ id: 'evt_mock_' + crypto.randomBytes(6).toString('hex'), type: outcome, linkId: order.payment.linkId, orderId: order.id, paymentId: outcome === 'paid' ? 'pay_mock_' + crypto.randomBytes(5).toString('hex') : '', amountInr: order.payment.amount });
    return { body, headers: { 'x-mock-signature': this.sign(body) } };
  }
}

// ---------- Razorpay Payment Links (https://razorpay.com/docs/payments/payment-links/apis/) ----------
// NOTE: written from the public API description and tested only against a mock of it. Check it with Razorpay's test keys first.
export class RazorpayProvider {
  constructor(cfg, fetchImpl = fetch) { this.name = 'razorpay'; this.c = cfg.payments.razorpay; this.fetch = fetchImpl; }
  get auth() { return 'Basic ' + Buffer.from(`${this.c.keyId}:${this.c.keySecret}`).toString('base64'); }
  async createLink({ orderId, amountInr, customer, description, expiresAt }) {
    const res = await this.fetch(`${this.c.baseUrl}/v1/payment_links`, {
      method: 'POST', headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amountInr * 100), currency: 'INR', accept_partial: false, reference_id: orderId, description: description.slice(0, 250),
        customer: { name: customer.name, contact: '+' + String(customer.phone).replace(/\D/g, '') }, notify: { sms: false, email: false }, reminder_enable: false,
        expire_by: Math.floor(expiresAt / 1000), notes: { order_id: orderId } }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.id || !j.short_url) throw new Error(`Razorpay: ${res.status} ${j.error?.description || ''}`.trim());
    return { id: j.id, url: j.short_url };
  }
  verifyWebhook(raw, headers) {
    if (!this.c.webhookSecret || !headers['x-razorpay-signature']) return false;
    return safeEq(headers['x-razorpay-signature'], crypto.createHmac('sha256', this.c.webhookSecret).update(raw).digest('hex'));
  }
  parseEvent(b, headers) {
    const type = { 'payment_link.paid': 'paid', 'payment_link.expired': 'expired', 'payment_link.cancelled': 'cancelled' }[b?.event]; if (!type) return null;
    const pl = b.payload?.payment_link?.entity, pay = b.payload?.payment?.entity; if (!pl) return null;
    return { id: headers['x-razorpay-event-id'] || `${b.event}:${pl.id}`, type, linkId: pl.id, orderId: pl.reference_id || pl.notes?.order_id, paymentId: pay?.id || '', amountInr: (pl.amount_paid ?? pl.amount ?? 0) / 100 };
  }
  async cancelLink(id) { await this.fetch(`${this.c.baseUrl}/v1/payment_links/${id}/cancel`, { method: 'POST', headers: { Authorization: this.auth } }).catch(() => {}); }
}

export function makeProvider(cfg, fetchImpl) {
  if (cfg.payments.provider === 'razorpay') return new RazorpayProvider(cfg, fetchImpl);
  return new MockProvider(cfg);
}
