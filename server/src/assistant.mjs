import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { brief, stockLabel } from './catalogue.mjs';
import { priceOrder } from './orders.mjs';
import { validateCoupon, triesLeft, noteFailure, publicOffers, normCode } from './coupons.mjs';
import crypto from 'node:crypto';

const MAX_STEPS = 6;
export const FALLBACK_TEXT = 'Sorry, I could not answer that just now. I have passed your message to Anitha and she will reply to you personally.';

export const TOOLS = [
  {
    name: 'search_products',
    description: 'Search the shop catalogue. Use for any request to browse or find sarees or accessories (jewellery, blouses, bags). Returns up to 6 matches with price and availability. Always use this before naming a saree or price.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free words, e.g. "red silk wedding" or a name or SKU' },
        type: { type: 'string', enum: ['saree', 'accessory'], description: 'Limit to sarees or to accessories; omit to search both' },
        category: { type: 'string', description: 'Exact category such as Banarasi, Kanjeevaram, Tussar, Maheswari, Paithani' },
        fabric: { type: 'string' }, colour: { type: 'string' },
        min_price: { type: 'number', description: 'Rupees' }, max_price: { type: 'number', description: 'Rupees' },
        in_stock_only: { type: 'boolean' }, limit: { type: 'integer', minimum: 1, maximum: 6 },
      },
    },
  },
  {
    name: 'get_product',
    description: 'Full details of one saree (description, fabric, colours, price, availability). Use when the customer asks about a specific saree.',
    input_schema: { type: 'object', properties: { id: { type: 'string', description: 'Product id or SKU from search_products' } }, required: ['id'] },
  },
  {
    name: 'send_product_photos',
    description: 'Send photos of one saree to the customer in the chat. Max 3.',
    input_schema: { type: 'object', properties: { id: { type: 'string' }, count: { type: 'integer', minimum: 1, maximum: 3 } }, required: ['id'] },
  },
  {
    name: 'create_order_request',
    description: 'Record an order request for Anitha to confirm. Call ONLY after the customer has clearly said yes to the read-back of their details. Prices are taken from the catalogue, not from you. The server double-checks the PIN code against the city and state. If it doubts the address it asks you to confirm with the customer once; after that the order is always accepted.',
    input_schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['id', 'quantity'] }, minItems: 1 },
        customer_name: { type: 'string', description: 'The buyer' }, address: { type: 'string', description: 'Buyer delivery address (house/street/area). Not needed when a gift recipient is given.' },
        city: { type: 'string' }, state: { type: 'string' }, pincode: { type: 'string', description: 'PIN code of the delivery address' },
        contact_phone: { type: 'string', description: 'Only if different from the WhatsApp number' }, note: { type: 'string' },
        address_confirmed: { type: 'boolean', description: 'true ONLY after the customer confirmed an address the server asked them to double-check' },
        discount_code: { type: 'string', description: 'A code the customer gave you. The server re-checks it; if invalid the order is not created.' },
        gift: { type: 'object', description: 'Only if the customer wants gift options', properties: {
          wrap: { type: 'boolean', description: 'gift wrapping (fee is added by the server)' }, note_card: { type: 'string', description: 'Message for the note card, max 250 characters' },
          hide_sender: { type: 'boolean', description: 'keep the buyer name, prices and invoice out of the parcel' },
          recipient: { type: 'object', description: 'Ship to someone else', properties: { name: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, pincode: { type: 'string' } }, required: ['name', 'address', 'pincode'] } } },
      },
      required: ['items', 'customer_name'],
    },
  },
  {
    name: 'check_delivery',
    description: 'Expected delivery dates for a PIN code. We accept orders for any address, so never tell a customer they cannot order. Use when the customer asks "do you deliver to...", "how long will it take".',
    input_schema: { type: 'object', properties: { pincode: { type: 'string' } }, required: ['pincode'] },
  },
  {
    name: 'check_address',
    description: 'Check that a PIN code, city and state agree. Returns ok, or a doubt (confirm / mismatch / invalid): in that case ask the customer once to double-check; if they confirm, carry on.',
    input_schema: { type: 'object', properties: { pincode: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' } }, required: ['pincode'] },
  },
  {
    name: 'update_delivery_address',
    description: 'Change the delivery address of one of THIS customer\'s orders, only before it is dispatched. Never use for another person\'s order.',
    input_schema: { type: 'object', properties: { order_id: { type: 'string' }, address: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, pincode: { type: 'string' }, address_confirmed: { type: 'boolean' } }, required: ['order_id', 'address', 'pincode'] },
  },
  {
    name: 'get_saved_address',
    description: 'The delivery address from this customer\'s previous order, so you can ask "Shall I deliver to the same address as last time?".',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_customer_cart',
    description: 'What this customer left in their shopping cart on the website (only if they agreed to cart reminders). Use when they reply to a cart reminder or ask about "my cart".',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'check_discount_code',
    description: 'Check a discount code the CUSTOMER gave you against the sarees they want, and get the exact price. Only use codes the customer typed or that list_offers returned. The server decides if the code is valid and the amount; you cannot change it.',
    input_schema: { type: 'object', properties: { code: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['id', 'quantity'] }, minItems: 1 } }, required: ['code', 'items'] },
  },
  {
    name: 'list_offers',
    description: 'Public offers and discount codes the shop wants you to mention. Use when the customer asks about offers or discounts. Never reveal any code that is not returned here.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_order_status',
    description: 'Status of this customer\'s recent orders (requested, waiting for payment, paid, shipped). Use whenever they ask about an order or whether their payment went through. Never say a payment was received unless this tool says status is "paid" or "shipped".',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'handoff_to_owner',
    description: 'Pass the conversation to Anitha. Use for complaints, refunds, existing orders, custom work, bulk orders, anything not answerable from tools/policies, or if the customer asks for a human.',
    input_schema: { type: 'object', properties: { reason: { type: 'string', description: 'One short sentence' }, summary: { type: 'string', description: 'What the customer wants, in 1-3 sentences, for Anitha to read' } }, required: ['reason', 'summary'] },
  },
];

export function buildSystem(cfg, catalogue) {
  let persona = '';
  try { persona = fs.readFileSync(path.join(cfg.knowledgeDir, 'persona.md'), 'utf8'); } catch { persona = 'You are the shop assistant.'; }
  let fallback = '';
  try { fallback = fs.readFileSync(path.join(cfg.knowledgeDir, 'policies.md'), 'utf8'); } catch { /* none */ }
  const shopName = catalogue.shop.name || 'Anitha Pemmasani';
  const policies = catalogue.policiesText(fallback);
  const ov = catalogue.overview();
  const ordersOff = catalogue.shop.ordersOn === false;
  const gf = Number(catalogue.data.giftWrapFee) || 0;
  return `${persona.replaceAll('{{SHOP_NAME}}', shopName)}${ordersOff ? '\n\n# Orders are OFF in this chat\nThe owner has switched off taking orders in WhatsApp. Still help with questions, sarees, photos and offers, but never collect an address or payment details and never call create_order_request. When the customer wants to buy, kindly send them to the website' + (catalogue.shop.siteUrl ? ' (' + catalogue.shop.siteUrl + ')' : '') + ' to order.' : ''}\n\n# Gifting\nGift wrapping: ${gf ? '₹' + gf.toLocaleString('en-IN') : 'free'}. A note card is free. We can ship to a different address and keep the sender's name, prices and invoice out of the parcel.\n\n# Shop policies (the only source for policy answers)\n${policies}\n\n# What the shop sells (overview; use tools for details)\n${ov.categories.map(c => `${c.name}: ${c.count} saree(s), ₹${c.price_from_inr.toLocaleString('en-IN')} to ₹${c.price_to_inr.toLocaleString('en-IN')}`).join('\n') || 'Catalogue not uploaded yet.'}`;
}

function buildLines(catalogue, items) {
  const lines = [];
  for (const it of Array.isArray(items) ? items : []) {
    const p = catalogue.find(it.id); const q = Math.min(Math.max(parseInt(it.quantity, 10) || 1, 1), 5);
    if (!p) return { error: `Unknown product ${it.id}.` };
    if (!(p.stock >= q)) return { error: `${p.name} is ${stockLabel(p)}${p.stock > 0 ? ` (cannot take ${q})` : ''}. Tell the customer and offer alternatives.` };
    lines.push({ id: p.id, name: p.name, sku: p.sku || '', slug: p.slug || '', quantity: q, price: p.price });
  }
  return { lines };
}
function tryCoupon(ctx, code, lines) {
  const { catalogue, store, conv } = ctx;
  if (triesLeft(store, conv.phone) <= 0) return { ok: false, reason: 'Too many wrong codes. Tell the customer that Anitha will help with discounts personally and call handoff_to_owner.' };
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const r = validateCoupon({ catalogue, store, code, phone: conv.phone, subtotal });
  if (!r.ok) noteFailure(store, conv.phone);
  return r;
}
function isHttp(u) { return /^https?:\/\//i.test(u || ''); }
const PIN = /^[1-9][0-9]{5}$/;

// Executes one tool call. Never throws: errors go back to the model as is_error results.
export async function runTool(name, input, ctx) {
  const { catalogue, store, conv } = ctx;
  try {
    if (name === 'search_products') {
      const r = catalogue.search(input || {});
      return { ok: true, data: { count: r.length, products: r.map(brief), note: r.length ? undefined : 'No matches. Try fewer words or another category.' } };
    }
    if (name === 'get_product') {
      const p = catalogue.find(input?.id);
      if (!p) return { ok: false, data: 'No such product. Use an id from search_products.' };
      return { ok: true, data: { ...brief(p), sku: p.sku, description: p.description || '', tags: p.tags || [], photos_available: (p.images?.length ? p.images : [p.image]).filter(isHttp).length } };
    }
    if (name === 'send_product_photos') {
      const p = catalogue.find(input?.id);
      if (!p) return { ok: false, data: 'No such product.' };
      const urls = (p.images?.length ? p.images : [p.image]).filter(isHttp).slice(0, Math.min(+input.count || 1, 3));
      if (!urls.length) return { ok: false, data: 'No photo is available to send for this saree. Describe it in words and offer the link.' };
      urls.forEach((u, i) => ctx.out.images.push({ url: u, caption: i === 0 ? `${p.name} · ₹${Number(p.price).toLocaleString('en-IN')}` : '' }));
      return { ok: true, data: `Queued ${urls.length} photo(s). They are sent right after your reply.` };
    }
    if (name === 'create_order_request') {
      if (catalogue.shop.ordersOn === false) return { ok: true, data: { order_created: false, ordering_paused: true, message: 'Taking orders in this chat is switched off right now. Do not collect address or payment details. Warmly invite the customer to order on the website' + (catalogue.shop.siteUrl ? ' (' + catalogue.shop.siteUrl + ')' : '') + ' and offer to answer any question or share photos meanwhile.' } };
      if (!Array.isArray(input?.items) || !input.items.length) return { ok: false, data: 'No items.' };
      const b = buildLines(catalogue, input.items); if (b.error) return { ok: false, data: b.error };
      const lines = b.lines; let total = 0;
      const g = input.gift && typeof input.gift === 'object' ? input.gift : {}, rc = g.recipient && typeof g.recipient === 'object' && (g.recipient.name || g.recipient.address) ? g.recipient : null;
      const str = (v, n = 200) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
      const buyer = str(input.customer_name, 80);
      if (buyer.length < 2) return { ok: false, data: 'Customer name is missing.' };
      const ship = rc ? { name: str(rc.name, 80), phone: String(rc.phone || '').replace(/\D/g, '').slice(0, 15), address: str(rc.address, 300), city: str(rc.city, 60), state: str(rc.state, 60), pincode: String(rc.pincode || '').replace(/\s/g, '') }
        : { name: buyer, phone: conv.phone, address: str(input.address, 300), city: str(input.city, 60), state: str(input.state, 60), pincode: String(input.pincode || '').replace(/\s/g, '') };
      if (ship.name.length < 2) return { ok: false, data: 'The recipient name is missing.' };
      if (ship.address.length < 10) return { ok: false, data: 'Delivery address looks incomplete. Ask for house/flat, street, area and city.' };
      if (ship.pincode.length < 3) return { ok: false, data: 'The PIN code is missing. Ask the customer for it.' };
      // PIN problems never stop an order: ask the customer ONCE to double-check, then take the order as confirmed. We ship regardless.
      const chk = await ctx.orders.checkAddress(ship), est = ctx.orders.deliveryFor(ship.pincode);
      const doubt = chk.status !== 'ok' || (est.ok && !est.serviceable);
      if (doubt && !input.address_confirmed) return { ok: true, data: { order_created: false, needs_confirmation: true, message: [chk.status !== 'ok' && chk.message, est.ok && !est.serviceable && est.reason].filter(Boolean).join(' ') + ' Ask the customer kindly to double-check. If they say it is correct (or insist), call create_order_request again with address_confirmed true; never refuse the order because of the PIN code.' } };
      const dup = store.s.orders.find(o => o.phone === conv.phone && o.status === 'new' && Date.now() - o.createdAt < 10 * 60000 && JSON.stringify(o.items.map(i => [i.id, i.quantity])) === JSON.stringify(lines.map(i => [i.id, i.quantity])));
      if (dup) return { ok: true, data: { order_request_id: dup.id, total_inr: dup.total, already_recorded: true } };
      let coupon = null;
      if (input.discount_code && String(input.discount_code).trim()) {
        const r = tryCoupon(ctx, input.discount_code, lines);
        if (!r.ok) return { ok: false, data: r.reason + ' The order was NOT created. Tell the customer, and ask whether to go ahead without the code.' };
        coupon = { ...r.coupon, amount: r.discount };
      }
      const wantsGift = !!(g.wrap || g.note_card || g.hide_sender || rc), giftFee = g.wrap ? Math.max(0, Number(catalogue.data.giftWrapFee) || 0) : 0;
      const gift = wantsGift ? { wrap: !!g.wrap, note: str(g.note_card, 250), hideSender: !!g.hide_sender, fee: giftFee } : null;
      const pr = priceOrder(catalogue, lines, coupon ? coupon.amount : 0, giftFee); total = pr.total;
      const rec = store.addOrder({ pricing: pr, coupon, gift, shipTo: ship, billTo: { name: buyer, address: str(input.address, 300), city: str(input.city, 60), state: str(input.state, 60), pincode: String(input.pincode || '').replace(/\s/g, '') || ship.pincode },
        addressCheck: { status: doubt ? (chk.status !== 'ok' ? chk.status : 'unserved') : 'ok', confirmed: doubt }, delivery: est.ok && est.serviceable ? est : undefined, trackToken: crypto.randomBytes(16).toString('hex'),
        phone: conv.phone, customerName: buyer, contactPhone: str(input.contact_phone, 20), address: ship.address, pincode: ship.pincode, note: str(input.note, 300), items: lines, total, source: 'whatsapp-assistant' });
      ctx.out.orderId = rec.id; ctx.notify?.({ kind: 'order', conv, order: rec });
      const auto = ctx.cfg?.payments?.approval === 'auto';
      return { ok: true, data: { order_request_id: rec.id, items_total_inr: pr.subtotal, discount_inr: pr.discount, gift_wrap_inr: pr.giftWrap, shipping_inr: pr.shipping, total_inr: total, expected_delivery: est.ok && est.serviceable ? est.label + ' (after payment)' : 'Not estimated: tell the customer Anitha will confirm the delivery date', next: auto
        ? 'A secure payment link is sent automatically in this chat right after your message. Tell the customer the total and that the order is confirmed once the payment is received. Do NOT write any link yourself.'
        : 'Tell the customer the total, and that Anitha will check and send a secure payment link here shortly; the order is confirmed once the payment is received. Do NOT write any link yourself.' } };
    }
    if (name === 'check_delivery') {
      const e = ctx.orders.deliveryFor(input?.pincode);
      return { ok: true, data: !e.ok ? { valid_pin: false, reason: e.reason } : e.serviceable ? { serviceable: true, expected_delivery: e.label, note: 'Counted from the day payment is received; Sundays are not counted.' } : { serviceable: false, can_still_order: true, reason: e.reason } };
    }
    if (name === 'check_address') {
      const r = await ctx.orders.checkAddress({ pincode: input?.pincode, city: input?.city, state: input?.state });
      return { ok: true, data: { result: r.status, message: r.message || 'PIN, city and state agree.' } };
    }
    if (name === 'update_delivery_address') {
      const r = await ctx.orders.updateAddress({ phone: conv.phone, orderId: String(input?.order_id || ''), address: input?.address, city: input?.city, state: input?.state, pincode: input?.pincode, confirmed: !!input?.address_confirmed });
      if (r.error) return { ok: false, data: r.error };
      if (r.needsConfirmation) return { ok: true, data: { updated: false, needs_confirmation: true, message: r.message + ' Ask the customer to confirm, then call update_delivery_address again with address_confirmed true.' } };
      return { ok: true, data: { updated: true, expected_delivery: r.delivery, note: r.packed ? 'The parcel was already packed; Anitha has been told to repack/relabel it. Tell the customer she will confirm.' : 'Anitha has been told. Tell the customer the new address is saved.' } };
    }
    if (name === 'get_saved_address') {
      const last = store.s.orders.find(o => o.phone === conv.phone && o.billTo && o.billTo.address);
      return { ok: true, data: last ? { name: last.billTo.name, address: last.billTo.address, city: last.billTo.city, state: last.billTo.state, pincode: last.billTo.pincode } : 'No saved address for this customer.' };
    }
    if (name === 'get_customer_cart') {
      const c = store.s.carts?.[conv.phone];
      if (!c || !c.consent?.granted || !c.items.length) return { ok: true, data: 'No saved cart for this customer. Ask what they are looking for.' };
      const items = c.items.map(i => { const p = catalogue.find(i.id); return p ? { id: p.id, name: p.name, quantity: i.qty, price_inr: p.price, availability: stockLabel(p), link: p.link || '' } : null; }).filter(Boolean);
      return { ok: true, data: { items, total_inr: items.filter(i => i.availability !== 'sold out').reduce((s, i) => s + i.price_inr * i.quantity, 0) } };
    }
    if (name === 'check_discount_code') {
      const b = buildLines(catalogue, input?.items); if (b.error) return { ok: false, data: b.error };
      const r = tryCoupon(ctx, input?.code, b.lines);
      if (!r.ok) return { ok: true, data: { valid: false, reason: r.reason } };
      const pr = priceOrder(catalogue, b.lines, r.discount);
      return { ok: true, data: { valid: true, code: r.coupon.code, discount_inr: pr.discount, items_total_inr: pr.subtotal, shipping_inr: pr.shipping, total_inr: pr.total } };
    }
    if (name === 'list_offers') {
      const o = publicOffers(catalogue); return { ok: true, data: o.length ? o : 'No public offers right now. Do not mention or invent any discount.' };
    }
    if (name === 'get_order_status') {
      const list = ctx.orders ? ctx.orders.statusFor(conv.phone) : [];
      return { ok: true, data: list.length ? list : 'No orders found for this customer.' };
    }
    if (name === 'handoff_to_owner') {
      const h = store.addHandoff({ phone: conv.phone, name: conv.name, reason: String(input?.reason || '').slice(0, 200), summary: String(input?.summary || '').slice(0, 600) });
      conv.status = 'human'; ctx.out.handoffId = h.id; ctx.notify?.({ kind: 'handoff', conv, handoff: h });
      return { ok: true, data: 'Handed over. Write one short kind message telling the customer Anitha will reply personally.' };
    }
    return { ok: false, data: `Unknown tool ${name}` };
  } catch (e) {
    return { ok: false, data: 'Tool failed: ' + (e.message || e) };
  }
}

export function makeClient(cfg) {
  return new Anthropic({ apiKey: cfg.anthropicKey || 'missing', ...(cfg.anthropicBaseUrl ? { baseURL: cfg.anthropicBaseUrl } : {}), maxRetries: 2, timeout: 45_000 });
}

// One customer turn. Returns { texts, images, handoffId, orderId, error? }.
export async function respond({ cfg, client, store, catalogue, conv, text, notify, orders }) {
  const out = { texts: [], images: [], handoffId: null, orderId: null };
  const ctx = { catalogue, store, conv, out, notify, orders, cfg };
  const history = conv.history.slice(-cfg.historyTurns);
  while (history.length && history[0].role !== 'user') history.shift();
  const messages = [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: text }];
  const system = [{ type: 'text', text: buildSystem(cfg, catalogue), cache_control: { type: 'ephemeral' } }];
  let finalText = '';
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      store.bumpUsage();
      const res = await client.messages.create({ model: cfg.model, max_tokens: 1024, system, tools: TOOLS, output_config: { effort: 'low' }, messages });
      if (res.stop_reason === 'refusal') { out.error = 'refusal'; break; }
      const textNow = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (res.stop_reason !== 'tool_use') { finalText = textNow; if (res.stop_reason === 'max_tokens' && !textNow) out.error = 'max_tokens'; break; }
      messages.push({ role: 'assistant', content: res.content });
      const results = await Promise.all(res.content.filter(b => b.type === 'tool_use').map(async b => {
        const r = await runTool(b.name, b.input, ctx);
        return { type: 'tool_result', tool_use_id: b.id, content: typeof r.data === 'string' ? r.data : JSON.stringify(r.data), ...(r.ok ? {} : { is_error: true }) };
      }));
      messages.push({ role: 'user', content: results });
      if (step === MAX_STEPS - 1) out.error = 'too_many_steps';
    }
  } catch (e) {
    out.error = 'api_error'; out.errorDetail = e?.message || String(e);
  }
  if (!finalText && out.handoffId) finalText = 'Thank you. Anitha will reply to you personally.';
  if (!finalText || out.error) {
    if (!out.handoffId) { // never leave a customer hanging: hand over
      const h = store.addHandoff({ phone: conv.phone, name: conv.name, reason: 'Assistant could not answer (' + (out.error || 'empty reply') + ')', summary: 'Customer said: ' + text.slice(0, 300) });
      conv.status = 'human'; out.handoffId = h.id; notify?.({ kind: 'handoff', conv, handoff: h });
    }
    finalText = finalText || FALLBACK_TEXT;
  }
  out.texts = splitForWhatsApp(finalText);
  conv.history.push({ role: 'user', content: text }, { role: 'assistant', content: finalText });
  conv.history = conv.history.slice(-cfg.historyTurns * 2);
  return out;
}

export function splitForWhatsApp(t, max = 1500) {
  const parts = []; let rest = String(t).trim();
  while (rest.length > max) { let i = rest.lastIndexOf('\n', max); if (i < 400) i = rest.lastIndexOf(' ', max); if (i < 400) i = max; parts.push(rest.slice(0, i).trim()); rest = rest.slice(i).trim(); }
  if (rest) parts.push(rest); return parts;
}
