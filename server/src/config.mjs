import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Tiny .env reader (no extra dependency). Real environment variables always win.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvFile(path.join(ROOT, '.env'));

const env = (k, d = '') => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);

export function loadConfig(overrides = {}) {
  const c = {
    port: +env('PORT', '8787'),
    model: env('CLAUDE_MODEL', 'claude-haiku-5-5'),
    anthropicKey: env('ANTHROPIC_API_KEY'),
    anthropicBaseUrl: env('ANTHROPIC_BASE_URL'),
    maxCallsPerDay: +env('MAX_CLAUDE_CALLS_PER_DAY', '1500'),
    wa: {
      phoneNumberId: env('WA_PHONE_NUMBER_ID'),
      token: env('WA_ACCESS_TOKEN'),
      appSecret: env('WA_APP_SECRET'),
      verifyToken: env('WA_VERIFY_TOKEN'),
      graphUrl: env('WA_GRAPH_URL', 'https://graph.facebook.com/v21.0'),
      ownerPhone: env('OWNER_PHONE').replace(/\D/g, ''),
      ownerAlertTemplate: env('OWNER_ALERT_TEMPLATE'),
    },
    // Cart reminders: first one after CART_REMINDER_DELAYS_MIN[0] minutes of inactivity, second that many minutes (gap) after the first.
    cart: {
      enabled: env('CART_REMINDERS', 'on') !== 'off',
      delaysMin: env('CART_REMINDER_DELAYS_MIN', '60,1500').split(',').map(n => +n.trim()).filter(n => n > 0).slice(0, 2),
      maxPer7Days: +env('CART_REMINDER_MAX_PER_7_DAYS', '2'),
      expireAfterHours: +env('CART_REMINDER_EXPIRE_HOURS', '72'),
      quietFromHour: +env('CART_QUIET_FROM_HOUR', '21'), quietToHour: +env('CART_QUIET_TO_HOUR', '9'), // IST
      activeChatMin: +env('CART_SKIP_IF_CHATTED_MIN', '120'),
      templates: [env('CART_TEMPLATE_1', 'cart_reminder_1'), env('CART_TEMPLATE_2', 'cart_reminder_2')],
      templateLang: env('CART_TEMPLATE_LANG', 'en'),
    },
    payments: {
      provider: env('PAYMENT_PROVIDER', 'mock'),             // mock | razorpay  (more can be added in src/payments.mjs)
      approval: env('ORDER_APPROVAL', 'owner'),               // owner = you press "Send payment link"; auto = sent straight away
      linkValidHours: +env('PAYMENT_LINK_VALID_HOURS', '24'),
      publicUrl: env('PUBLIC_URL').replace(/\/+$/, ''),        // this server's own https address
      razorpay: { keyId: env('RAZORPAY_KEY_ID'), keySecret: env('RAZORPAY_KEY_SECRET'), webhookSecret: env('RAZORPAY_WEBHOOK_SECRET'), baseUrl: env('RAZORPAY_BASE_URL', 'https://api.razorpay.com') },
      mockSecret: env('MOCK_PAYMENT_SECRET', crypto.randomBytes(16).toString('hex')),
      templates: { link: env('PAYMENT_LINK_TEMPLATE', 'payment_link'), paid: env('PAYMENT_CONFIRM_TEMPLATE', 'payment_received'), shipped: env('ORDER_SHIPPED_TEMPLATE', 'order_shipped'), packed: env('ORDER_PACKED_TEMPLATE', 'order_packed'), outForDelivery: env('ORDER_OUT_FOR_DELIVERY_TEMPLATE', 'order_out_for_delivery'), delivered: env('ORDER_DELIVERED_TEMPLATE', 'order_delivered'), invoice: env('INVOICE_TEMPLATE', 'invoice_ready'), review: env('REVIEW_REQUEST_TEMPLATE', 'review_request') },
    },
    // Optional live PIN lookup (India Post style API) to catch city/area mistakes. Off by default; the offline check still runs.
    pinLookup: { on: env('PINCODE_LOOKUP', 'off') === 'on', url: env('PINCODE_LOOKUP_URL', 'https://api.postalpincode.in/pincode/') },
    // Review request after delivery, hours after the "delivered" update
    reviewRequestAfterHours: +env('REVIEW_REQUEST_AFTER_HOURS', '48'),
    // The store's login service. We ask it whether a customer's token is genuine before accepting their cart.
    // POST {phone, token} -> {ok:true}. Required in live mode.
    customerTokenCheckUrl: env('CUSTOMER_TOKEN_CHECK_URL'),
    adminToken: env('ADMIN_TOKEN'),
    // Owner app (/admin): the first password is set once with this token. cookieSecure must stay on whenever the server is reached over https.
    adminSetupToken: env('ADMIN_SETUP_TOKEN'),
    adminAllowedIps: env('ADMIN_ALLOWED_IPS').split(',').map(x => x.trim().replace(/^::ffff:/, '')).filter(Boolean),
    cookieSecure: env('COOKIE_SECURE', env('PUBLIC_URL').startsWith('http://') ? 'false' : 'true') !== 'false',
    // Instagram (Instagram Graph API, content publishing). Needs an Instagram professional account linked to a Facebook page.
    ig: { userId: env('IG_USER_ID'), token: env('IG_ACCESS_TOKEN'), graphUrl: env('IG_GRAPH_URL', 'https://graph.facebook.com/v21.0'), dailyCap: +env('IG_DAILY_CAP', '20') },
    siteUrl: env('SITE_URL').replace(/\/+$/, ''),
    allowedOrigins: env('ALLOWED_ORIGINS').split(',').map(s => s.trim()).filter(Boolean),
    dataDir: path.resolve(ROOT, env('DATA_DIR', './data')),
    knowledgeDir: path.join(ROOT, 'knowledge'),
    // customer rate limit: this many messages per window, then the bot goes quiet
    rate: { max: 20, windowMs: 10 * 60 * 1000 },
    historyTurns: 24,
    maxInboundChars: 1000,
  };
  Object.assign(c, overrides);
  c.waLive = !!(c.wa.phoneNumberId && c.wa.token);
  return c;
}
