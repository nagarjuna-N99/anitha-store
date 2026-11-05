// Two sign-ins, two jobs (decided 5 Nov 2026).
//   OWNER  runs the business: sarees, categories, items, prices, shipping charge and GST, coupons and discounts, delivery rules, orders, invoices,
//          statements, customers and their data (export, erase, privacy requests), reports, her own password and 2-step sign-in, backups.
//   ADMIN  looks after the presentation and the technical side: the home page look (banner, quote, story chapters, Notes wording and sign-up list,
//          colours), the Pages, Image Studio, the Instagram and WhatsApp connections, Claude key, email settings, Ops, audit logs, creating the owner login.
// Everything here is checked on the server. Hiding a menu item in the page is only a courtesy.
export const OWNER = 'owner', ADMIN = 'admin';
export const ROLES = [OWNER, ADMIN];

// owner-app screens each role may open (the page hides the rest; the server refuses the data behind them)
export const TABS = {
  owner: ['dashboard', 'products', 'categories', 'studio', 'drafts', 'bundles', 'orders', 'invoices', 'reviews', 'alerts', 'customers', 'coupons', 'delivery', 'statements', 'growth', 'promo', 'privacy', 'social', 'whatsapp', 'ai', 'settings'],
  admin: ['home', 'pages', 'studio', 'social', 'whatsapp', 'ai', 'ops', 'logs', 'settings'],
};
export const HOME_TAB = { owner: 'dashboard', admin: 'home' };

// what each role may change inside the shop data (the one big saved object)
export const DB_WRITE = {
  owner: ['products', 'categories', 'accessoryCategories', 'bundles', 'coupons', 'orders', 'invoices', 'users', 'reviews', 'stockAlerts', 'similarAlerts', 'outbox', 'drafts', 'consentLog', 'logs', 'accessorySeeded'],
  admin: ['home', 'pages'],
};
// settings that belong to the presentation / technical side; every other setting is the owner's
export const ADMIN_SETTINGS = ['metaDescription', 'siteUrl', 'ai', 'aiEndpoint', 'otpEndpoint', 'assistantUrl', 'waNumber', 'waChatOn', 'waGreeting', 'waAutoPublish'];
// what the admin must never see: customers, orders, invoices and similar business records
export const ADMIN_HIDDEN = ['users', 'orders', 'invoices', 'logs', 'consentLog', 'outbox', 'stockAlerts', 'similarAlerts', 'drafts', 'coupons', 'reviews'];

const clone = x => JSON.parse(JSON.stringify(x));
// what a role is shown when it loads the shop data
export function dbForRead(role, db) {
  if (role !== ADMIN || !db) return db; const out = clone(db);
  for (const k of ADMIN_HIDDEN) out[k] = [];
  const s = out.settings || {}; out.settings = Object.fromEntries(Object.entries(s).filter(([k]) => ADMIN_SETTINGS.includes(k) || ['businessName', 'phone', 'address', 'email', 'giftWrapFee'].includes(k)));
  return out;
}
// a save from a role: only the parts that role may change are taken, everything else stays as it is on the server
export function dbForWrite(role, mine, current) {
  if (!mine || typeof mine !== 'object' || !current) return mine; const out = clone(current), keys = DB_WRITE[role] || [];
  for (const k of keys) if (mine[k] !== undefined) out[k] = mine[k];
  const sIn = (mine.settings && typeof mine.settings === 'object') ? mine.settings : {}, sOut = out.settings = { ...(out.settings || {}) };
  const mayWrite = k => role === ADMIN ? ADMIN_SETTINGS.includes(k) : !ADMIN_SETTINGS.includes(k);
  for (const k of Object.keys(sIn)) if (mayWrite(k)) sOut[k] = sIn[k];
  for (const k of Object.keys(sOut)) if (mayWrite(k) && !(k in sIn) && role === ADMIN && ADMIN_SETTINGS.includes(k)) delete sOut[k];   // a setting the admin removed
  return out;
}

// owner-app API routes (/admin/api/...) by role. Anything not listed is open to both (the weekly-report email setup stays open: it is the owner's business report).
const ADMIN_ONLY = /^\/admin\/api\/(ops|audit|ai-key|team|notes|agents|repair)(\/|$)/;
const OWNER_ONLY = /^\/admin\/api\/(privacy|import|web-orders|notify-tracking|growth|report|promo)(\/|$)/;
export function adminApiAllowed(role, pathname) {
  if (role === ADMIN) return !OWNER_ONLY.test(pathname);
  if (role === OWNER) return !ADMIN_ONLY.test(pathname);
  return false;
}
// the token-or-session routes under /api (orders, chats, carts, the AI helper, test chat)
const OWNER_API = /^\/api\/(orders|inbox|carts?|ai\/reply|catalogue)(\/|$)/;
const ADMIN_API = /^\/api\/(test-chat|test-reset)(\/|$)/;
export function apiAllowed(role, pathname) {
  if (OWNER_API.test(pathname)) return role === OWNER;
  if (ADMIN_API.test(pathname)) return role === ADMIN;
  return role === OWNER || role === ADMIN;
}
