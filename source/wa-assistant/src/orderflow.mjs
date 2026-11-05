// Website orders, from "someone placed an order" to "parcel posted and the customer told".
//   1. A website order arrives (WebOrders). The owner is asked on WhatsApp (and by email) with EVERYTHING: customer, phone, full address,
//      every item with its product link, totals, gift note, instructions and any problem found (stock, price). The message ends with how to answer:
//         YES WO-0001            approve it            NO WO-0001 reason      decline it
//   2. If the owner switched on "approve website orders automatically" (Orders tab) and nothing is wrong (all in stock, prices match),
//      it is approved at once, by the server, with no question asked.
//   3. Approving (by reply, by the owner app, or automatically) adds the order to Orders, takes the stock, and sends the owner the "pack and post"
//      details on WhatsApp and by email (a printable page: address label, packing list, item links).
//   4. After posting, the owner replies on WhatsApp:  TRACK WO-0001 EE123456789IN   (or  TRACK AP-20261105-AB12C DTDC D1234567)
//      The order is updated by itself (courier, tracking number and link, status Shipped, timeline) and the customer is told on WhatsApp
//      (only if they agreed to order updates and have not sent STOP).
// Only the owner's own WhatsApp number can give these commands. Nothing is charged here: payment is agreed on WhatsApp as before.
import crypto from 'node:crypto';

const IST = 330 * 60_000, rand = n => crypto.randomBytes(n).toString('hex');
const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const digits = p => String(p || '').replace(/\D/g, '');
export const waNum = p => { const d = digits(p).replace(/^0+/, ''); return d.length === 10 ? '91' + d : d; };
const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const istStamp = t => new Date(t + IST).toISOString().slice(0, 16).replace('T', ' ');
const istDay = t => new Date(t + IST).toISOString().slice(0, 10);

export const COURIERS = {
  indiapost: { name: 'India Post (Speed Post)', words: ['indiapost', 'india', 'post', 'speedpost', 'speed'], link: () => 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx' },
  delhivery: { name: 'Delhivery', words: ['delhivery'], link: n => 'https://www.delhivery.com/track/package/' + encodeURIComponent(n) },
  dtdc: { name: 'DTDC', words: ['dtdc'], link: n => 'https://www.dtdc.in/tracking.asp?strCnno=' + encodeURIComponent(n) },
  bluedart: { name: 'Blue Dart', words: ['bluedart', 'blue'], link: n => 'https://www.bluedart.com/tracking?trackFor=0&trackNo=' + encodeURIComponent(n) },
  other: { name: 'Other courier', words: ['other', 'courier'], link: () => '' },
};

export function makeOrderFlow({ cfg, shop, weborders, store, pipeline, mail, notifyTracking, now = () => Date.now() }) {
  const S = () => (shop.get().db || {}).settings || {};
  const ownerPhone = () => waNum(S().ownerWhatsapp) || waNum(cfg.wa.ownerPhone);
  const auto = () => S().autoApproveOrders === true;
  const site = () => String(S().siteUrl || cfg.siteUrl || '').replace(/\/+$/, '');
  const productLink = (db, id) => { const p = (db.products || []).find(x => x.id === id), base = site(); return p && base ? `${base}/product/${p.slug || p.id}/` : ''; };
  const addrLines = a => [a && a.name, a && a.street, [a && a.city, a && a.state].filter(Boolean).join(', '), a && a.pincode, a && a.phone ? 'Phone: ' + a.phone : ''].filter(Boolean);

  // ---- the message text: everything the owner needs, nothing she must go and look up ----
  function details(rec, db, { order } = {}) {
    const o = rec.order, c = rec.customer, sa = o.shippingAddress && (o.shippingAddress.street || o.shippingAddress.name) ? o.shippingAddress : c.addr, g = o.gift || {};
    const L = [`🧾 *Order ${order ? order.id + ' (' + rec.id + ')' : rec.id}*`, `Customer: ${c.name} · ${c.phone}${c.email ? ' · ' + c.email : ''}`, '', '*Items*'];
    for (const i of o.items) { const lk = productLink(db, i.productId); L.push(`• ${i.name}${i.sku ? ' (' + i.sku + ')' : ''} × ${i.quantity} — ${fmt(i.price * i.quantity)}${lk ? '\n  ' + lk : ''}`); }
    const p = o.pricing || {};
    L.push('', `Items ${fmt(p.subtotal || o.items.reduce((s, i) => s + i.price * i.quantity, 0))}${p.discount ? ` · discount −${fmt(p.discount)}${o.coupon ? ' (' + o.coupon + ')' : ''}` : ''}${p.giftWrap ? ` · gift wrap ${fmt(p.giftWrap)}` : ''} · shipping ${p.shipping ? fmt(p.shipping) : 'free'}`, `*Total ${fmt(o.total)}* (payment to be agreed on WhatsApp)`);
    L.push('', '*Send to*', ...addrLines(sa));
    if (o.delivery && o.delivery.label) L.push(o.delivery.label);
    if (g.wrap || g.note || g.hideSender || g.toOther) L.push('', `🎁 Gift${g.wrap ? ': wrap it' : ''}${g.toOther ? ', sent to someone else' : ''}${g.hideSender ? ', keep the sender\'s name off the parcel' : ''}${g.note ? '\nNote card: ' + g.note : ''}`);
    if (o.instructions) L.push('', 'Customer\'s instructions: ' + o.instructions);
    if (rec.check && rec.check.issues && rec.check.issues.length) L.push('', '⚠ Check first:', ...rec.check.issues.map(x => '• ' + x));
    return L.join('\n');
  }
  const summary = rec => `${rec.customer.name}, ${fmt(rec.order.total)}, ${rec.order.items.map(i => `${i.name}×${i.quantity}`).join(', ')}`.slice(0, 180);

  // Outside WhatsApp's 24-hour window only an approved template may start the chat, and a template variable must be one line: so the template carries a compact version of everything. The owner's reply (YES, or anything) opens the window and the full text follows; the email always has the full details.
  const oneLine = (rec, db, order) => { const o = rec.order, sa = o.shippingAddress && (o.shippingAddress.street || o.shippingAddress.name) ? o.shippingAddress : rec.customer.addr; return [`${rec.customer.name} ${rec.customer.phone}`, o.items.map(i => `${i.name} x${i.quantity}${productLink(db, i.productId) ? ' ' + productLink(db, i.productId) : ''}`).join('; '), fmt(o.total), [sa.street, sa.city, sa.state, sa.pincode].filter(Boolean).join(', '), o.gift && (o.gift.wrap || o.gift.note) ? 'GIFT' + (o.gift.note ? ': ' + o.gift.note : '') : '', rec.check && rec.check.issues && rec.check.issues.length ? 'CHECK: ' + rec.check.issues.join(' / ') : ''].filter(Boolean).join(' | ').replace(/\s+/g, ' ').slice(0, 700); };
  async function toOwner(text, { template, params } = {}) {
    const to = ownerPhone(); if (!to) return false;
    try { await pipeline.sendSmart(to, text, { template, params }); return true; } catch (e) { console.error('[orderflow] owner message failed', e.message); return false; }
  }

  // ---- 1. a new website order ----
  async function onNew(rec) {
    if (rec.flow && rec.flow.asked) return { skipped: 'already' };
    weborders.mark(rec.id, { flow: { ...(rec.flow || {}), asked: now() } });   // marked BEFORE anything is sent: a retry of the same order never asks twice
    const db = shop.get().db || {};
    if (auto() && !(rec.check.issues || []).length) { const r = await accept(rec.id, 'auto'); return { auto: true, ...r }; }
    const txt = details(rec, db) + `\n\nReply *YES ${rec.id}* to approve, or *NO ${rec.id} reason* to decline.`;
    const wa = await toOwner(txt, { template: cfg.wa.ownerOrderTemplate || 'owner_new_order', params: [rec.id, oneLine(rec, db)] });
    const em = await mail(`New website order ${rec.id}: ${fmt(rec.order.total)}: approve?`, txt.replace(/\*/g, ''), `<pre style="font:14px/1.5 Arial;white-space:pre-wrap">${esc(txt.replace(/\*/g, ''))}</pre>`);
    return { asked: true, whatsapp: wa, email: em };
  }

  // ---- 2./3. approve: add to Orders, take stock, send the pack-and-post details ----
  async function accept(webId, by = 'owner') {
    const rec = weborders.list().find(x => x.id === webId); if (!rec) return { error: 'No such website order.' };
    if (rec.status === 'accepted') return { error: `${webId} was already approved${rec.orderId ? ' as ' + rec.orderId : ''}.`, already: true };
    if (rec.status === 'declined') return { error: `${webId} was declined earlier.` };
    let order, short = [];
    shop.mutate(db => {
      const c = rec.customer, o = rec.order, last10 = p => digits(p).slice(-10), t = now();
      let u = (db.users ||= []).find(x => last10(x.phone) === last10(c.phone));
      if (!u) { u = { id: 'u' + rand(4), name: '', phone: digits(c.phone).length === 10 ? '+91' + digits(c.phone) : (String(c.phone).startsWith('+') ? c.phone : '+' + digits(c.phone)), email: '', joined: istDay(t), status: 'Regular', address: '', addr: {}, phoneVerified: false, consents: { orderUpdates: false, marketing: false, updatedAt: null } }; u.whatsapp = u.phone; db.users.push(u); }
      Object.assign(u, { name: u.name || c.name, email: u.email || c.email, addr: u.addr && u.addr.street ? u.addr : c.addr, termsVersion: u.termsVersion || c.termsVersion, noticeVersion: u.noticeVersion || c.noticeVersion, ageConfirmedAt: u.ageConfirmedAt || c.ageConfirmedAt });
      u.consents = u.consents || { orderUpdates: false, marketing: false, updatedAt: null };
      for (const k of ['orderUpdates', 'marketing', 'cartReminder']) if (c.consents[k] && !u.consents[k]) u.consents[k] = true;
      const log = (db.consentLog ||= []); for (const x of rec.consentLog || []) if (!log.some(y => y.userId === u.id && y.type === x.type && y.at === x.at)) log.push({ id: t + Math.random(), userId: u.id, phone: u.phone, type: x.type, granted: x.granted, version: x.version, source: x.source || 'website', at: x.at });
      const oid = o.localId && !(db.orders ||= []).some(x => x.id === o.localId) ? o.localId : 'AP-' + istDay(t).replace(/-/g, '') + '-' + rand(3).slice(0, 5).toUpperCase();
      order = { id: oid, userId: u.id, customer: c.name, phone: u.phone, email: c.email, total: o.total, status: 'placed', date: o.date || istDay(t), items: o.items.map(i => ({ productId: i.productId, name: i.name, sku: i.sku, quantity: i.quantity, price: i.price, category: i.category, image: ((db.products || []).find(p => p.id === i.productId) || {}).image || '' })), shippingAddress: o.shippingAddress, billTo: o.billTo, gift: o.gift, delivery: o.delivery, addressCheck: o.addressCheck, instructions: o.instructions, coupon: o.coupon || '', pricing: o.pricing, payment: { method: 'To be agreed on WhatsApp', provider: '', status: 'pending' }, consent: { terms: c.termsVersion, whatsappOrderUpdates: !!u.consents.orderUpdates, whatsappOffers: !!u.consents.marketing }, timeline: [{ status: 'placed', time: istStamp(t), note: `Order received from the website (${rec.id})${by === 'auto' ? ', approved automatically' : by === 'whatsapp' ? ', approved by WhatsApp reply' : ''}` }], invoiceGenerated: false, source: 'website', webOrderId: rec.id };
      db.orders.unshift(order);
      for (const i of order.items) { const p = (db.products || []).find(x => x.id === i.productId); if (!p) continue; if (p.stock >= i.quantity) { const prev = p.stock; p.stock -= i.quantity; (db.logs ||= []).unshift({ id: t + Math.random(), type: 'stock_out', product: p.name, sku: p.sku, change: -i.quantity, prev, curr: p.stock, reason: `Order ${oid}`, time: istStamp(t) }); } else short.push(p.name); }
    });
    weborders.update(webId, { status: 'accepted', orderId: order.id });
    await afterApproved(webId, { short, by });
    return { ok: true, orderId: order.id, short };
  }
  async function decline(webId, reason, by = 'owner') {
    const rec = weborders.list().find(x => x.id === webId); if (!rec) return { error: 'No such website order.' };
    if (rec.status !== 'new') return { error: `${webId} was already ${rec.status}.` };
    if (!String(reason || '').trim()) return { error: 'Please give a reason, for example: NO ' + webId + ' sold out.' };
    weborders.update(webId, { status: 'declined', note: `Declined by ${by}: ${String(reason).trim()}` }); return { ok: true };
  }
  // the owner approved (by any route): send the pack-and-post details once
  async function afterApproved(webId, { short = [] } = {}) {
    const rec = weborders.list().find(x => x.id === webId); if (!rec || (rec.flow && rec.flow.readySent)) return { skipped: true };
    weborders.mark(webId, { flow: { ...(rec.flow || {}), readySent: now() } });
    const db = shop.get().db || {}, order = (db.orders || []).find(o => o.id === rec.orderId) || null;
    const txt = details(rec, db, { order }) + (short.length ? `\n\n⚠ Not enough stock for: ${short.join(', ')}. Check before packing.` : '') + `\n\n✅ Approved. Pack and post it, then reply:\n*TRACK ${order ? order.id : rec.id} <courier> <tracking number>*\nfor example: TRACK ${order ? order.id : rec.id} EE123456789IN\n(couriers: indiapost, delhivery, dtdc, bluedart; leave it out for India Post). The order and the customer are updated by themselves.`;
    const html = printable(rec, db, order, short);
    const wa = await toOwner(txt, { template: cfg.wa.ownerReadyTemplate || 'owner_order_approved', params: [order ? order.id : rec.id, oneLine(rec, db, order)] });
    const em = await mail(`Approved: pack and post order ${order ? order.id : rec.id}`, txt.replace(/\*/g, ''), html);
    return { whatsapp: wa, email: em };
  }
  // a page the owner can print: address label, packing list, links
  function printable(rec, db, order, short) {
    const o = rec.order, sa = o.shippingAddress && (o.shippingAddress.street || o.shippingAddress.name) ? o.shippingAddress : rec.customer.addr, id = order ? order.id : rec.id, g = o.gift || {};
    const rows = o.items.map(i => { const lk = productLink(db, i.productId); return `<tr><td>${esc(i.name)}${i.sku ? `<br><small>${esc(i.sku)}</small>` : ''}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fmt(i.price * i.quantity)}</td><td>${lk ? `<a href="${esc(lk)}">${esc(lk)}</a>` : ''}</td></tr>`; }).join('');
    return `<!doctype html><html><body style="font:15px/1.5 Arial,sans-serif;color:#111;max-width:760px;margin:auto;padding:16px">
<h2 style="margin:0 0 4px">Pack and post: order ${esc(id)}</h2><p style="margin:0 0 14px;color:#555">${esc(rec.id)} · ${esc(rec.customer.name)} · ${esc(rec.customer.phone)}${rec.customer.email ? ' · ' + esc(rec.customer.email) : ''}</p>
${short.length ? `<p style="background:#fff1cf;padding:8px;border-radius:6px">⚠ Not enough stock for: ${esc(short.join(', '))}. Check before packing.</p>` : ''}
<div style="border:3px solid #000;padding:16px;margin:0 0 16px"><div style="font-size:12px;letter-spacing:.15em;text-transform:uppercase">Deliver to</div><div style="font-size:22px;line-height:1.35"><b>${esc(sa && sa.name || rec.customer.name)}</b><br>${esc(sa && sa.street || '')}<br>${esc([sa && sa.city, sa && sa.state].filter(Boolean).join(', '))}<br><b style="font-size:26px;letter-spacing:.1em">${esc(sa && sa.pincode || '')}</b><br>Phone: ${esc(sa && sa.phone || rec.customer.phone)}</div>${g.hideSender ? '<div style="margin-top:8px;font-size:12px">Gift: do not write the sender\'s name on the parcel.</div>' : ''}</div>
<table style="width:100%;border-collapse:collapse" border="1" cellpadding="6"><tr style="background:#eee"><th align="left">Item</th><th>Qty</th><th align="right">Price</th><th align="left">Link</th></tr>${rows}</table>
<p><b>Total ${fmt(o.total)}</b> · payment agreed on WhatsApp</p>
${g.wrap || g.note ? `<p>🎁 ${g.wrap ? 'Gift wrap. ' : ''}${g.note ? 'Note card: ' + esc(g.note) : ''}</p>` : ''}${o.instructions ? `<p>Customer's instructions: ${esc(o.instructions)}</p>` : ''}
<p style="background:#f4efe3;padding:10px;border-radius:6px"><b>After posting</b>, reply on WhatsApp to the shop number:<br><code>TRACK ${esc(id)} EE123456789IN</code><br>(add dtdc, delhivery or bluedart before the number for other couriers). The order and the customer are updated by themselves.</p>
<p style="color:#777;font-size:12px"><button onclick="print()">Print</button> · This is a reference copy from your shop server.</p></body></html>`;
  }

  // ---- 4. the owner posted it and replies with the tracking ----
  async function ship(ref, rest, by = 'whatsapp') {
    const db = shop.get().db || {}; let order = (db.orders || []).find(o => o.id.toLowerCase() === ref.toLowerCase() || (o.webOrderId || '').toLowerCase() === ref.toLowerCase());
    if (!order) return { error: `I could not find order ${ref}. Send the order number exactly as in the message (for example AP-20261105-AB12C or WO-0001).` };
    if (['delivered', 'cancelled'].includes(order.status)) return { error: `Order ${order.id} is already ${order.status}.` };
    const toks = String(rest || '').trim().split(/\s+/).filter(Boolean); let key = '';
    if (toks.length > 1 || (toks.length === 1 && !/\d/.test(toks[0]))) { const w = toks[0].toLowerCase().replace(/[^a-z]/g, ''); key = Object.keys(COURIERS).find(k => COURIERS[k].words.includes(w)) || ''; if (key) toks.shift(); }
    const num = toks.join('').toUpperCase().slice(0, 60); if (!num) return { error: `Please add the tracking number, for example: TRACK ${order.id} EE123456789IN` };
    if (!key) key = /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(num) ? 'indiapost' : 'other';
    const c = COURIERS[key], link = key === 'indiapost' || key === 'other' ? (c.link(num) || '') : c.link(num); let phone = '', cust = '', consented = false, trackingText = '';
    shop.mutate(d => {
      const o = d.orders.find(x => x.id === order.id), t = now(); o.courierKey = key; o.courier = c.name; o.trackingNo = num; o.tracking = (c.name + ' · ' + num).slice(0, 200); o.trackingUrl = /^https?:\/\//.test(link) ? link.slice(0, 300) : '';
      if (['placed', 'confirmed', 'packed'].includes(o.status)) o.status = 'shipped';
      (o.timeline ||= []).push({ status: o.status, time: istStamp(t), note: `Tracking added: ${o.tracking}${by === 'whatsapp' ? ' (by WhatsApp reply)' : ''}` });
      phone = digits(o.phone).length === 10 ? '91' + digits(o.phone) : digits(o.phone); cust = o.customer; const u = (d.users || []).find(x => x.id === o.userId); consented = !!(u && u.consents && u.consents.orderUpdates); order = { ...o };
    });
    let told = 'not-consented';   // (India Post's tracking page is the same for everyone, so the customer is given the number itself)
    if (consented && phone) { const r = await notifyTracking({ orderId: order.id, trackingNo: num, phone, customer: cust, courier: c.name, trackingUrl: key === 'indiapost' || key === 'other' ? '' : order.trackingUrl }); told = r.sent ? (cfg.waLive ? 'sent' : 'dry-run') : r.reason; }
    return { ok: true, order, courier: c.name, number: num, told };
  }

  // ---- the owner's WhatsApp messages ----
  async function command(text, from) {
    const owner = ownerPhone(); if (!owner || waNum(from) !== owner) return null;
    const t = String(text || '').trim(); let m;
    if ((m = /^(?:yes|approve|ok|accept)\s+(wo-\d{1,6})\b/i.exec(t))) { const r = await accept(m[1].toUpperCase(), 'whatsapp'); return r.error ? '⚠ ' + r.error : `✅ ${m[1].toUpperCase()} approved and added to Orders as ${r.orderId}. The pack-and-post details are on their way (WhatsApp and email).`; }
    if ((m = /^(?:no|decline|reject)\s+(wo-\d{1,6})\b\s*(.*)$/is.exec(t))) { const r = await decline(m[1].toUpperCase(), m[2], 'whatsapp'); return r.error ? '⚠ ' + r.error : `Declined ${m[1].toUpperCase()}. The reason is kept on record. Please tell the customer yourself.`; }
    if ((m = /^(?:track|shipped|ship)\s+([a-z0-9]+-[a-z0-9-]+)\s*(.*)$/is.exec(t))) { const r = await ship(m[1], m[2]); if (r.error) return '⚠ ' + r.error; return `✅ ${r.order.id}: ${r.courier} ${r.number} saved, status Shipped. ${{ sent: 'The customer has been told on WhatsApp.', 'dry-run': 'The customer message is prepared (WhatsApp is not live yet).', 'not-consented': 'The customer did not agree to WhatsApp updates, so nothing was sent to them.', 'already-sent': 'The customer already had this tracking number.', 'opted-out': 'The customer asked not to get messages, so nothing was sent.', failed: 'The customer message failed: please send it from the owner app.' }[r.told] || ''}`; }
    if (/^(help|\?|orders?)$/i.test(t)) return 'Order commands:\n*YES WO-0001* approve\n*NO WO-0001 reason* decline\n*TRACK AP-… EE123456789IN* save tracking (add dtdc / delhivery / bluedart before the number if needed)';
    return null;   // not a command: handled as an ordinary message
  }
  return { onNew, accept, decline, afterApproved, ship, command, details, ownerPhone, auto };
}
