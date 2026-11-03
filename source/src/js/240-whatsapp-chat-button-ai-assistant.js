// ================= WHATSAPP CHAT BUTTON + AI ASSISTANT (admin) =================
// The customer taps a button that opens a WhatsApp chat with the shop. If the optional assistant server
// (folder wa-assistant) is connected to the shop's WhatsApp Business number, it answers using the catalogue
// published from here. Without the server the button simply opens a normal chat that the owner answers.
const WA_POLICY_FIELDS = [
  ['shipping', 'Shipping & delivery', 'e.g. Free shipping above ₹10,000. Delivery in 5–7 working days across India.'],
  ['returns', 'Returns & exchanges', 'e.g. Exchange within 7 days if unwashed and tags intact. Handloom colour may vary slightly.'],
  ['payment', 'Payment', 'e.g. UPI or bank transfer after Anitha confirms the order. We never ask for card numbers or OTPs on chat.'],
  ['care', 'Saree care', 'e.g. Dry clean only for the first wash. Store in a muslin cloth.'],
  ['timings', 'Shop timings', 'e.g. Mon–Sat, 10 am – 7 pm'],
  ['custom', 'Anything else customers ask', 'e.g. blouse stitching, fall & pico, festival offers, wholesale'],
];
const waPol = () => ({ shipping: 'Free shipping on orders above ₹10,000.', returns: '', payment: '', care: '', timings: '', custom: '', ...(db.settings.waPolicies || {}) });
const waNumber = () => { const n = String(db.settings.waNumber || db.settings.phone || '').replace(/\D/g, ''); return n.length === 10 ? '91' + n : n; };
const waOrdersOn = () => db.settings.waOrdersOn !== false;
const waChatEnabled = () => db.settings.waChatOn !== false && waNumber().length >= 11;
const waGreeting = () => db.settings.waGreeting || "Hi! I'm interested in {name} (₹{price}). {link}";
const waServer = () => BUILD === 'admin' ? location.origin : String(db.settings.assistantUrl || '').trim().replace(/\/+$/, '');
const waTok = () => { if (BUILD === 'admin') return ADM.signedIn ? 'session' : ''; try { return sessionStorage.getItem('wa_admin_tok') || ''; } catch (e) { return ''; } };
function waChatLink(p) {
  const msg = waGreeting().replace('{name}', p ? p.name : 'your sarees').replace('{price}', p ? money(p.price) : '').replace('{link}', p ? (richLink(p) || storeLink(p)) : '').replace(/\s+\n/g, '\n').trim();
  return `https://wa.me/${waNumber()}?text=${encodeURIComponent(msg)}`;
}
function waChatButtonHTML(p, preview) {
  if (!waChatEnabled()) return '';
  return `<a class="btn-outline wa-chat" style="margin-top:10px;display:block;text-align:center;text-decoration:none;" ${preview ? 'aria-disabled="true"' : `href="${esc(waChatLink(p))}" target="_blank" rel="noopener"`}>💬 Chat with us about this saree</a>`;
}
function waFooterLink() { const a = document.getElementById('footWa'); if (!a) return; if (waChatEnabled()) { a.href = waChatLink(null); a.target = '_blank'; a.rel = 'noopener'; a.parentElement.style.display = ''; } else a.parentElement.style.display = 'none'; }

// ---- catalogue sent to the assistant ----
function buildAssistantCatalogue() {
  const s = db.settings;
  return {
    shop: { name: BRAND(), ordersOn: waOrdersOn(), phone: s.phone || '', address: s.address || '', siteUrl: siteBase() || '', gstNumber: s.gstNumber || '', gstRate: +s.gstRate || 0, invoicePrefix: s.invoicePrefix || 'AP-INV' },
    policies: waPol(), pricing: { shippingFee: SHIP_FEE, freeShippingAbove: SHIP_FREE_ABOVE }, delivery: deliveryCfg(), giftWrapFee: giftFee(),
    coupons: db.coupons.map(c => ({ code: c.code, type: c.type, discount: c.discount, active: c.active, description: c.description || '', minOrder: c.minOrder || 0, expiresAt: c.expiresAt || '', maxUses: c.maxUses || 0, oncePerCustomer: !!c.oncePerCustomer, firstOrderOnly: !!c.firstOrderOnly, announce: !!c.announce, channel: c.channel || 'all' })),
    couponUsage: waCouponUsage(), pastBuyers: [...new Set(db.orders.filter(o => o.status !== 'cancelled').map(o => String(o.phone || '').replace(/\D/g, '').slice(-10)).filter(x => x.length === 10))],
    products: db.products.map(p => ({ id: p.id, type: isAccessory(p) ? 'accessory' : 'saree', name: p.name, sku: p.sku, category: p.category, fabric: p.fabric || '', colours: p.colours || [], price: p.price, stock: p.stock, description: p.description || '', tags: p.tags || [], image: /^https?:/i.test(p.image) ? p.image : '', images: (p.images || []).filter(i => /^https?:/i.test(i)), link: richLink(p) || (siteBase() ? storeLink(p) : ''), slug: p.slug })),
  };
}
// website-side coupon use (WhatsApp orders are already counted by the assistant server, so they are left out here)
function waCouponUsage() { const u = {}; db.orders.filter(o => o.coupon && o.source !== 'whatsapp' && o.status !== 'cancelled').forEach(o => { const x = u[o.coupon] = u[o.coupon] || { total: 0, phones: [] }; x.total++; x.phones.push(String(o.phone || '').replace(/\D/g, '').slice(-10)); }); return u; }
const waHash = o => { const s = JSON.stringify(o); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };
const waCatHash = () => waHash(buildAssistantCatalogue());
function waStatus(msg, kind) { const e = document.getElementById('wa-status'); if (e) { e.textContent = msg; e.style.color = kind === 'error' ? 'var(--red)' : kind === 'ok' ? '#2e7d46' : '#666'; } }
async function waCall(path, opts) {
  const url = waServer(); if (!/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)) throw new Error('Enter the assistant address first (it must start with https://)');
  const r = await fetch(url + path, { ...opts, credentials: 'same-origin', headers: BUILD === 'admin' ? { 'X-CSRF-Token': ADM.csrf, 'Content-Type': 'application/json' } : { Authorization: 'Bearer ' + waTok(), 'Content-Type': 'application/json' } });
  if (r.status === 401) { if (BUILD === 'admin') { ADM.signedIn = false; admGate('expired'); } throw new Error(BUILD === 'admin' ? 'Please sign in again.' : 'The admin token was not accepted by the assistant'); }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'The assistant answered with an error (' + r.status + ')');
  return j;
}
async function waCheck() {
  waStatus('Checking…');
  try {
    const h = await fetch(waServer() + '/health').then(r => r.json());
    let s = null; if (waTok()) s = await waCall('/api/status');
    waStatus(`Connected · WhatsApp: ${h.whatsapp === 'live' ? 'live' : 'test mode (not sending)'} · Claude key: ${h.claude ? 'set' : 'MISSING'} · model ${h.model}${s ? ` · ${s.callsToday} assistant calls today` : ''}${s ? '' : ' · enter the admin token to continue'}`, h.claude ? 'ok' : 'error');
  } catch (e) { waStatus('Could not reach the assistant: ' + (e.message || e) + '. Is it running, and does ALLOWED_ORIGINS include this store?', 'error'); }
}
let WA_PUB_BUSY = false;
async function waPublish(auto) {
  if (WA_PUB_BUSY) return; WA_PUB_BUSY = true;
  try {
    if (!waTok()) throw new Error('Enter the admin token first');
    const body = buildAssistantCatalogue(), r = await waCall('/api/catalogue', { method: 'POST', body: JSON.stringify(body) });
    db.settings.waLastPublish = { at: new Date().toISOString(), hash: waHash(body), products: r.products, withPhotos: r.withPhotos }; saveDB();
    if (!auto) showToast(`✓ ${r.products} sarees and your policies sent to the assistant`, 'success'); else waStatus('Updated automatically at ' + new Date().toLocaleTimeString('en-IN'), 'ok');
    if (document.getElementById('wa-fresh')) waRenderFresh();
  } catch (e) { waStatus(e.message || String(e), 'error'); if (!auto) showToast(e.message || 'Could not publish', 'error'); }
  finally { WA_PUB_BUSY = false; }
}
let waAutoT = null;
function waAutoSoon() {
  if (!db.settings.waAutoPublish || !waServer() || !waTok()) return;
  clearTimeout(waAutoT); waAutoT = setTimeout(() => { if (waCatHash() !== (db.settings.waLastPublish || {}).hash) waPublish(true); }, 4000);
}
function waDownloadCatalogue() { const blob = new Blob([JSON.stringify({ ...buildAssistantCatalogue(), exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'catalogue.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function waRenderFresh() {
  const e = document.getElementById('wa-fresh'); if (!e) return; const lp = db.settings.waLastPublish;
  const noPhoto = db.products.filter(p => !(/^https?:/i.test(p.image) || (p.images || []).some(i => /^https?:/i.test(i)))).length;
  e.innerHTML = !lp ? '<span class="cchip" style="background:#fdecea;color:var(--red);">Not sent yet</span>' : lp.hash === waCatHash() ? `<span class="cchip ok">Up to date</span> <span class="note" style="margin:0;">last sent ${esc(fmtDate(lp.at))} · ${lp.products} sarees</span>` : `<span class="cchip" style="background:#fff3cd;color:#8a6d00;">Changed since last send — publish again</span>`;
  if (noPhoto) e.innerHTML += `<div class="note" style="margin-top:6px;">${noPhoto} saree${noPhoto > 1 ? 's have' : ' has'} photos stored only in this browser. WhatsApp can only send photos that have a web address, so the assistant describes those in words until the store is hosted.</div>`;
}
function waSet(k, v) { db.settings[k] = v; saveDB(); }
function waOrdersSwitch(on) { db.settings.waOrdersOn = !!on; addLog('settings_changed', 'WhatsApp chat orders', '-', 0, 0, 0, `Orders in WhatsApp chat turned ${on ? 'ON' : 'OFF'}`); saveDB(); const n = document.getElementById('wa-orders-note'); if (n) n.textContent = on ? 'ON: customers can order and pay inside the chat.' : 'OFF: the assistant still answers questions, shows sarees and photos, but will not take orders. It sends customers to the website to order. Send/publish to the assistant after changing this.'; waAutoSoon(); showToast(on ? 'Chat orders are ON' : 'Chat orders are OFF (publish to the assistant to apply)', on ? 'success' : ''); }
function waSetPol(k, v) { db.settings.waPolicies = { ...waPol(), [k]: v }; saveDB(); waRenderFresh(); waAutoSoon(); }
function waSetTok(v) { try { v ? sessionStorage.setItem('wa_admin_tok', v) : sessionStorage.removeItem('wa_admin_tok'); } catch (e) {} }
function renderWaAdmin(container) {
  const y = window.scrollY, s = db.settings, pol = waPol();
  container.innerHTML = `<p style="color:#666;font-size:14px;margin-bottom:16px;max-width:760px;">Customers tap <strong>💬 Chat with us</strong> and land in a WhatsApp chat with your business number. Once the assistant is connected, it answers questions about your sarees, sends photos and collects order requests. It <strong>hands over to you</strong> for complaints, refunds, custom work or anything it is unsure about. You always confirm every order and payment yourself.</p>
    <div class="admin-card" id="wa-orders-card"><h3>Orders in WhatsApp chat</h3>
      <label class="chk-line"><input type="checkbox" id="wa-orders-on" ${waOrdersOn() ? 'checked' : ''} onchange="waOrdersSwitch(this.checked)"> <strong>Take orders in WhatsApp chat</strong> (the assistant collects the address and sends a payment link)</label>
      <div class="note" id="wa-orders-note">${waOrdersOn() ? 'ON: customers can order and pay inside the chat.' : 'OFF: the assistant still answers questions, shows sarees and photos, but will not take orders. It sends customers to the website to order. Send/publish to the assistant after changing this.'}</div></div>
    <div class="admin-card"><h3>1 · Chat button</h3>
      <label class="chk-line"><input type="checkbox" ${s.waChatOn !== false ? 'checked' : ''} onchange="waSet('waChatOn',this.checked);refreshWaPreview();waFooterLink()"> Show “Chat with us” on every saree page and in the footer</label>
      <div class="form-group" style="max-width:420px;margin-top:12px;"><label>Shop WhatsApp number (with country code)</label><input id="wa-num" value="${esc(s.waNumber || '')}" placeholder="${esc(s.phone || '+91 98765 43210')}" oninput="waSet('waNumber',this.value);refreshWaPreview();waFooterLink()"><div class="note">This must be the number you register with WhatsApp Business for the assistant. Empty = your shop phone number.</div></div>
      <div class="form-group" style="max-width:560px;"><label>Message the customer starts with</label><input id="wa-greet" value="${esc(waGreeting())}" oninput="waSet('waGreeting',this.value);refreshWaPreview()"><div class="note">Use {name}, {price} and {link} — they are filled in for each saree.</div></div>
      <div class="note" id="wa-preview" style="word-break:break-all;"></div></div>
    <div class="admin-card"><h3>2 · What the assistant may tell customers</h3>
      <p class="note" style="margin-bottom:12px;">The assistant only states policies written here. If a question is not covered it says it will check with you instead of guessing. Prices, stock, fabric and colours come straight from your products.</p>
      ${WA_POLICY_FIELDS.map(([k, l, ph]) => `<div class="form-group"><label>${l}</label><textarea rows="2" placeholder="${esc(ph)}" oninput="waSetPol('${k}',this.value)">${esc(pol[k])}</textarea></div>`).join('')}</div>
    ${BUILD === 'admin' ? `<div class="admin-card"><h3>3 · The assistant</h3><p class="note" style="margin-bottom:10px;">This owner app runs on the same server as the assistant, so it is already connected and signed in. Nothing to type.</p><div class="pf-actions"><button class="btn-sm btn-primary-sm" onclick="waPublish(false)">📤 Send sarees &amp; policies to assistant</button><button class="btn-sm btn-info-sm" onclick="waOpen('/test')">💬 Try the assistant (test chat)</button><button class="btn-sm btn-info-sm" onclick="waOpen('/inbox')">📥 Open inbox</button></div><div id="wa-fresh" style="margin-top:10px;"></div><div id="wa-status" class="note" style="margin-top:8px;"></div></div>` : `<div class="admin-card"><h3>3 · Connect the assistant</h3>
      <div class="form-group" style="max-width:520px;"><label>Assistant address</label><input id="wa-url" value="${esc(s.assistantUrl || '')}" placeholder="https://assistant.yourshop.com" oninput="waSet('assistantUrl',this.value.trim())"></div>
      <div class="form-group" style="max-width:520px;"><label>Admin token <span class="pf-sub">(kept only until you close this tab, never saved with your shop data)</span></label><input id="wa-tok" type="password" autocomplete="off" value="${esc(waTok())}" oninput="waSetTok(this.value)"></div>
      <div class="pf-actions"><button class="btn-sm btn-info-sm" onclick="waCheck()">Check connection</button><button class="btn-sm btn-primary-sm" onclick="waPublish(false)">📤 Send sarees &amp; policies to assistant</button><button class="btn-sm btn-info-sm" onclick="waDownloadCatalogue()">⬇ Download catalogue.json</button></div>
      <div id="wa-fresh" style="margin-top:10px;"></div><div id="wa-status" class="note" style="margin-top:8px;"></div>
      <label class="chk-line" style="margin-top:12px;"><input type="checkbox" ${s.waAutoPublish ? 'checked' : ''} onchange="waSet('waAutoPublish',this.checked);waAutoSoon()"> Send updates automatically when I change a product or stock (while this tab is open)</label>
      <div class="pf-actions" style="margin-top:14px;"><button class="btn-sm btn-info-sm" onclick="waOpen('/test')">💬 Try the assistant (test chat)</button><button class="btn-sm btn-info-sm" onclick="waOpen('/inbox')">📥 Open inbox (hand-overs &amp; order requests)</button></div></div>
    </div>`}
    ${waCartCardHTML()}
    ${waOrdersCardHTML()}
    <div class="admin-card"><h3>Setup checklist</h3><ol style="line-height:1.9;font-size:14px;padding-left:20px;">
      <li>Host the <code>wa-assistant</code> folder on any small server (Node 20+). Copy <code>.env.example</code> to <code>.env</code> and fill it in — the README lists every step.</li>
      <li>Create a <strong>Claude API key</strong> at console.anthropic.com and put it in <code>ANTHROPIC_API_KEY</code>. Set a monthly spend limit there too.</li>
      <li>Create a <strong>WhatsApp Business Platform</strong> app at developers.facebook.com, add your business number, and copy the phone-number ID, access token and app secret into <code>.env</code>.</li>
      <li>In Meta’s WhatsApp settings set the webhook to <code>${esc(waServer() || 'https://your-assistant')}/webhook</code> using your <code>WA_VERIFY_TOKEN</code>, and subscribe to “messages”.</li>
      <li>Put this store’s address in <code>ALLOWED_ORIGINS</code>, enter the assistant address and admin token above, then press <strong>Send sarees &amp; policies</strong>.</li>
      <li>Try the test chat, then message your own number from another phone before telling customers.</li></ol></div>`;
  refreshWaPreview(); waRenderFresh(); waCartLoad(); waOrdersLoad(); window.scrollTo(0, y);
}
function refreshWaPreview() { const e = document.getElementById('wa-preview'); if (!e) return; const p = db.products[0]; e.textContent = waChatEnabled() ? 'Opens: ' + waChatLink(p) : 'Button is hidden (turned off, or no valid WhatsApp number).'; }
function waOpen(path) { const u = waServer(); if (!/^https?:\/\//i.test(u)) return showToast('Enter the assistant address first', 'error'); window.open(u + path, '_blank', 'noopener'); }

