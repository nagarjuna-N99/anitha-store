// ================= STOREFRONT EXTRAS (26 Oct 2026) =================
// occasions · recently viewed · wishlist sharing · similar-saree alerts · bundles · colour note + video/daylight jumps
// · one-of-a-kind wording · bulk CSV upload · status image maker · FAQ
const oneOfAKind = p => !!p && !isAccessory(p) && p.stock === 1;

// ---- occasions ----
const OCC_MAP = { Wedding: 'Wedding', Bridal: 'Wedding', Festive: 'Festive', Traditional: 'Festive', Office: 'Office', Casual: 'Office', Party: 'Party', Cocktail: 'Party' };
const OCCASIONS = [['Wedding', '💍', 'Wedding & bridal'], ['Festive', '🪔', 'Festive'], ['Office', '💼', 'Office & everyday'], ['Party', '✨', 'Party & evening']];
const GIFT_BUDGET = 10000;
function occasionsOf(p) {
  const s = new Set(), add = o => { if (OCC_MAP[o]) s.add(OCC_MAP[o]); };
  (p.occasions || []).forEach(add);
  (p.tags || []).forEach(t => { const k = Object.keys(OCC_MAP).find(x => x.toLowerCase() === String(t).toLowerCase()); if (k) add(k); });
  ((kbFor(p.category) || {}).occ || []).forEach(add);
  return [...s];
}
// "Find it faster / Shop by occasion": the heading, the tiles and what each tile matches are the owner's (Home Page → Shop by occasion, with AI ideas). Without any edits it is the four standard tiles.
const OCC_WORDS = { Wedding: ['wedding', 'bridal'], Festive: ['festive', 'traditional'], Office: ['office', 'casual', 'everyday'], Party: ['party', 'cocktail', 'evening', 'reception'] };
const occDefault = () => ({ show: true, label: 'Find it faster', title: 'Shop by occasion', gift: { show: true, max: GIFT_BUDGET }, items: OCCASIONS.map(([k, ic, label]) => ({ id: k, icon: ic, label, words: OCC_WORDS[k] || [], cats: [], show: true })) });
const occCfg = () => { const o = db.home && db.home.occasions; return o && Array.isArray(o.items) ? { ...occDefault(), ...o, gift: { ...occDefault().gift, ...(o.gift || {}) } } : occDefault(); };
const occTokens = p => { const kb = kbFor(p.category) || {}, t = new Set(); [...(p.occasions || []), ...(p.tags || []), ...(kb.occ || [])].forEach(x => t.add(String(x).toLowerCase().trim())); String(p.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).forEach(x => t.add(x)); return t; };
// does saree p belong under tile `id`? (its own words, its whole categories, or the standard four's old rules)
function occHas(p, id) {
  const it = occCfg().items.find(x => x.id === id); if (!it) return occasionsOf(p).includes(id);
  if ((it.cats || []).includes(p.category)) return true;
  if (OCC_WORDS[it.id] && occasionsOf(p).includes(it.id)) return true;
  const w = (it.words || []).map(x => String(x).toLowerCase().trim()).filter(Boolean); if (!w.length) return false; const tk = occTokens(p); return w.some(x => tk.has(x));
}
const occLabel = id => { const it = occCfg().items.find(x => x.id === id); return it ? it.label : id; };
function renderOccasions() {
  const el = document.getElementById('occasionSection'); if (!el) return; const C = occCfg();
  if (C.show === false) { el.style.display = 'none'; el.innerHTML = ''; return; } el.style.display = '';
  const sarees = sareeList(), n = id => sarees.filter(p => p.stock > 0 && occHas(p, id)).length;
  const tiles = C.items.filter(it => it.show !== false && n(it.id) > 0).map(it => `<button type="button" class="occ-tile" data-occ="${esc(it.id)}" onclick="occasionGo(this.dataset.occ)"><span class="occ-ic" aria-hidden="true">${esc(it.icon)}</span><span class="occ-t">${esc(it.label)}</span><small>${n(it.id)} available</small></button>`)
    .concat(C.gift.show !== false && sarees.some(p => p.stock > 0 && p.price <= C.gift.max) ? [`<button type="button" class="occ-tile" data-occ="gift" onclick="occasionGo('gift')"><span class="occ-ic" aria-hidden="true">🎁</span><span class="occ-t">Gifts under ₹${money(C.gift.max)}</span><small>${sarees.filter(p => p.stock > 0 && p.price <= C.gift.max).length} available</small></button>`] : [])
    .concat(!accOn() ? [] : [`<button type="button" class="occ-tile" data-occ="accessory" onclick="occasionGo('accessory')"><span class="occ-ic" aria-hidden="true">💎</span><span class="occ-t">Accessories</span><small>${accessoryList().filter(p => p.stock > 0).length} available</small></button>`]);
  el.innerHTML = `<div class="section-header"><div class="section-label">${esc(C.label)}</div><h2 class="section-title">${esc(C.title)}</h2></div><div class="occ-grid">${tiles.join('')}</div>`;
}
function occasionGo(k) {
  navigateTo('shop');
  if (k === 'accessory') { shopResetFilters(); shopKind('accessory'); return; }
  shopKind('saree'); shopResetFilters(); currentCategory = 'all';
  if (k === 'gift') SHOP.max = String(occCfg().gift.max); else SHOP.occasion = k;
  renderProducts(); if (SHOP.open) renderShopPanel();
}

// ---- recently viewed (this phone only) ----
let RECENT = safeParse('ap_recent', []); if (!Array.isArray(RECENT)) RECENT = [];
function recentAdd(id) {
  RECENT = [id, ...RECENT.filter(x => x !== id)].slice(0, 8);
  try { localStorage.setItem('ap_recent', JSON.stringify(RECENT)); } catch (e) {}
  renderRecent();
}
function renderRecent() {
  const el = document.getElementById('recentSection'); if (!el) return;
  const list = RECENT.map(id => db.products.find(p => p.id === id)).filter(Boolean);
  el.innerHTML = list.length ? `<div class="section-header"><div class="section-label">Pick up where you left off</div><h2 class="section-title">Recently viewed</h2></div><div class="recent-track">${list.map(p => `<div class="recent-card" onclick="openProductDetail('${p.id}')"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><div class="rc-name">${esc(p.name)}</div><div class="rc-price">${p.stock > 0 ? '₹ ' + money(p.price) : 'Sold out'}</div></div>`).join('')}</div>` : '';
}

// ---- wishlist sharing ----
function wishLink() {
  const slugs = favourites.map(id => (db.products.find(p => p.id === id) || {}).slug).filter(Boolean).slice(0, 20);
  if (!slugs.length) return '';
  const b = siteBase();
  return (b ? b + '/' : location.href.split('#')[0]) + '#/wishlist/' + slugs.map(encodeURIComponent).join(',');
}
function shareWishlist() {
  const link = wishLink(); if (!link) { showToast('Add a few favourites first', 'error'); return; }
  const text = `Take a look at my wishlist from ${BRAND()}`, enc = encodeURIComponent, online = !!siteBase() || /^https?:/.test(location.protocol);
  el_('shareBody').innerHTML = `<h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:14px;">Share my wishlist</h3>
    <p style="font-size:13px;color:#666;margin-bottom:12px;">Send your favourite sarees to family or friends. They see only the sarees, not your account.</p>
    <label class="mini-label">Link to my wishlist</label>
    <div class="share-link"><input id="share-url" readonly value="${esc(link)}" onfocus="this.select()"><button class="btn-sm btn-primary-sm" onclick="shareCopy('share-url')">Copy</button></div>
    <div class="share-btns"><a class="share-b wa" id="wish-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${enc(text + '\n' + link)}">WhatsApp</a>
    <a class="share-b" target="_blank" rel="noopener" href="https://t.me/share/url?url=${enc(link)}&text=${enc(text)}">Telegram</a>
    <a class="share-b" href="mailto:?subject=${enc(text)}&body=${enc(text + ':\n' + link)}">Email</a></div>
    ${online ? '' : '<div class="note" style="color:#9a6b00;">This link will work for other people once your store is online and your website address is saved in Admin → Settings.</div>'}`;
  el_('shareModal').classList.add('active');
}
function renderSharedWishlist(slugs) {
  const el = document.getElementById('wishlistShared'); if (!el) return;
  const list = slugs.slice(0, 20).map(s => db.products.find(p => p.slug === s)).filter(Boolean);
  el.innerHTML = `<div class="section-header"><div class="section-label">Shared with you</div><h2 class="section-title">A friend’s wishlist</h2></div>
    ${list.length ? `<div class="product-grid">${list.map(productCardHTML).join('')}</div>` : '<div class="fav-empty"><h2>These sarees are no longer available</h2><p>Browse the latest collection instead.</p></div>'}
    <div style="text-align:center;margin:26px 0;"><button class="btn-primary" onclick="navigateTo('shop')">Browse the whole collection</button></div>`;
}

// ---- product page extras: colour note, video / daylight jumps, one-of-a-kind, bundle teaser ----
function pageExtrasHTML(p, gk, opts) {
  if (!p || opts.preview && !p.name) return '';
  const media = productMedia(p), vi = media.findIndex(m => m.type === 'video'), imgN = media.filter(m => m.type === 'img').length;
  const jumps = [];
  if (vi >= 0) jumps.push(`<button type="button" class="jump-btn" data-jump="video" onclick="galSelect('${gk}',${vi})">▶ Watch it draped</button>`);
  if (p.daylight && imgN > 1) jumps.push(`<button type="button" class="jump-btn" data-jump="daylight" onclick="galSelect('${gk}',${imgN - 1})">☀ See the daylight photo</button>`);
  return `${oneOfAKind(p) ? `<div class="one-kind">✦ A single designer piece. Once it is sold, this exact saree can be made again only on order${typeof waChatEnabled === 'function' && waChatEnabled() ? `: <a href="${esc(waChatLink(p))}" target="_blank" rel="noopener">message us on WhatsApp</a> if you would like one` : ': message us on WhatsApp if you would like one'}.</div>` : ''}
    ${jumps.length ? `<div class="jump-row">${jumps.join('')}</div>` : ''}
    ${isAccessory(p) ? '' : `<p class="colour-note">Colours can look slightly different on every screen${p.daylight ? '; the ☀ daylight photo shows the truest colour' : ''}. Message us for a live video of this saree.</p>`}
    ${opts.preview ? '' : bundleTeaserHTML(p)}`;
}

// ---- bundles ----
function bundleItems(b) { return b.productIds.map(id => db.products.find(p => p.id === id)); }
function bundleValue(b) { const items = bundleItems(b); if (items.some(x => !x)) return null; const sum = items.reduce((s, p) => s + p.price, 0); return { sum, off: Math.min(sum, b.type === 'flat' ? b.value : Math.round(sum * b.value / 100)) }; }
function bundleOffer() {
  const ids = new Set(cart.filter(c => c.qty > 0).map(c => c.id));
  let best = { amount: 0, name: '' };
  (db.bundles || []).filter(b => b.active && b.productIds.length >= 2 && b.productIds.every(id => ids.has(id))).forEach(b => { const v = bundleValue(b); if (v && v.off > best.amount) best = { amount: v.off, name: b.name }; });
  return best;
}
function bundleTeaserHTML(p) {
  const bs = (db.bundles || []).filter(b => b.active && b.productIds.includes(p.id) && bundleItems(b).every(x => x && x.stock > 0)).slice(0, 1);
  return bs.map(b => { const v = bundleValue(b); return v && v.off > 0 ? `<div class="bundle-box"><strong>Buy together &amp; save ₹${money(v.off)}</strong><div class="bundle-items">${bundleItems(b).map(x => esc(x.name)).join(' + ')}</div><button type="button" class="btn-sm btn-primary-sm bundle-add" onclick="addBundle('${b.id}')">Add all to cart · ₹ ${money(v.sum - v.off)}</button></div>` : ''; }).join('');
}
function addBundle(id) {
  const b = (db.bundles || []).find(x => x.id === id); if (!b) return;
  const items = bundleItems(b); if (items.some(x => !x || x.stock <= 0)) { showToast('One of these is no longer available', 'error'); return; }
  items.forEach(p => { if (!cart.some(c => c.id === p.id)) cart.push({ id: p.id, qty: 1 }); });
  saveCart(); updateBadges(); closeModal('productModal'); openCart();
}
let BUN_SEL = [];
function renderBundlesAdmin(content) {
  const bs = db.bundles || [];
  content.innerHTML = `<div class="admin-card"><h3>Bundles (buy together &amp; save)</h3>
    <p class="note" style="margin-bottom:12px;">When a customer has <strong>all</strong> the pieces of a bundle in the cart on the website, the bundle discount is applied automatically (one bundle offer per order). Chat (WhatsApp) orders use discount codes instead.</p>
    <div class="coupon-form" style="flex-wrap:wrap;"><input type="text" id="bun-name" placeholder="Bundle name (e.g. Kanjeevaram + Bangles)" style="flex:2;min-width:200px;">
      <select id="bun-type" style="flex:1;"><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select>
      <input type="number" id="bun-val" min="1" placeholder="Value" style="flex:1;"></div>
    <div id="bun-pick" style="max-height:200px;overflow:auto;border:1px solid #eee;border-radius:6px;padding:8px;margin:10px 0;">${db.products.map(p => `<label class="chk-line"><input type="checkbox" class="bun-chk" value="${p.id}"> ${esc(p.name)} <small>(₹ ${money(p.price)}${isAccessory(p) ? ' · accessory' : ''})</small></label>`).join('')}</div>
    <button class="btn-sm btn-primary-sm" id="bun-add" onclick="bundleSave()">Add bundle</button></div>
    <div class="admin-card" style="margin-top:16px;"><table class="admin-table"><thead><tr><th>Bundle</th><th>Items</th><th>Offer</th><th>Status</th><th></th></tr></thead><tbody>${bs.map((b, i) => { const v = bundleValue(b); return `<tr class="bun-row"><td>${esc(b.name)}</td><td>${bundleItems(b).map(x => esc(x ? x.name : '(removed)')).join(' + ')}</td><td>${b.type === 'flat' ? '₹ ' + money(b.value) : b.value + '%'}${v ? ` <small>(saves ₹ ${money(v.off)})</small>` : ''}</td><td><span class="status-pill ${b.active ? 'status-active' : 'status-inactive'}">${b.active ? 'Active' : 'Paused'}</span></td><td><button class="btn-sm btn-info-sm" onclick="bundleToggle(${i})">${b.active ? 'Pause' : 'Activate'}</button> <button class="btn-sm btn-danger-sm" onclick="bundleDelete(${i})">Delete</button></td></tr>`; }).join('') || '<tr><td colspan="5" style="color:#6b6862;">No bundles yet.</td></tr>'}</tbody></table></div>`;
}
function bundleSave() {
  const name = (el_('bun-name').value || '').trim(), type = el_('bun-type').value, value = +el_('bun-val').value, ids = [...document.querySelectorAll('.bun-chk:checked')].map(x => x.value);
  if (!name) { showToast('Give the bundle a name', 'error'); return; }
  if (ids.length < 2) { showToast('Pick at least two items', 'error'); return; }
  if (!(value > 0) || (type === 'percent' && value > 50)) { showToast(type === 'percent' ? 'Percent must be between 1 and 50' : 'Enter the rupee amount off', 'error'); return; }
  const sum = ids.reduce((s, id) => s + (db.products.find(p => p.id === id) || { price: 0 }).price, 0);
  if (type === 'flat' && value >= sum) { showToast('The flat amount must be less than the items’ total', 'error'); return; }
  db.bundles.push({ id: 'b' + generateId(), name, productIds: ids, type, value, active: true });
  addLog('bundle_created', name, '-', 0, 0, 0, `Bundle '${name}' created`); saveDB(); renderBundlesAdmin(el_('adminContent')); showToast('Bundle added', 'success');
}
function bundleToggle(i) { const b = db.bundles[i]; if (!b) return; b.active = !b.active; saveDB(); renderBundlesAdmin(el_('adminContent')); }
function bundleDelete(i) { const b = db.bundles[i]; if (!b || !confirm(`Delete bundle '${b.name}'?`)) return; db.bundles.splice(i, 1); saveDB(); renderBundlesAdmin(el_('adminContent')); }

// ---- "tell me about similar sarees" ----
const mySimilar = pid => { const u = currentUser(); return u ? db.similarAlerts.find(a => a.sourceId === pid && a.userId === u.id && a.status === 'waiting') : null; };
function similarBand(p) { return { min: Math.round(p.price * 0.7), max: Math.round(p.price * 1.3) }; }
function openSimilarAlert(pid) {
  const p = db.products.find(x => x.id === pid); if (!p || isAccessory(p)) return;
  const u = currentUser(); if (!u) { openAuth(() => openSimilarAlert(pid)); return; }
  const mine = mySimilar(pid), b = similarBand(p), what = `${p.fabric || p.category} sarees around ₹${money(b.min)} – ₹${money(b.max)}`;
  el_('alertBody').innerHTML = `<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:12px;">${mine ? 'You are on the list' : 'Tell me about similar sarees'}</h3>
    <div class="share-item"><img src="${esc(p.image)}" alt=""><div><div style="font-weight:600;">${esc(p.name)}</div><div style="font-size:12px;color:#6b6862;">sold out · every piece is one of a kind</div></div></div>
    ${mine ? `<p style="font-size:13px;color:#555;margin:12px 0;">We will send <strong>one</strong> WhatsApp message to ${esc(maskPhone(u.phone))} when a new saree like this arrives: ${esc(what)}.</p><button class="btn-outline" style="color:var(--red);border-color:var(--red);" onclick="similarCancel('${mine.id}')">Stop telling me</button>`
      : `<p style="font-size:13px;color:#555;margin:12px 0;">We will let you know when a new saree like this arrives: <strong>${esc(what)}</strong>.</p><div class="consent-box" id="sa-consent-row" style="margin:14px 0;"><label class="chk"><input type="checkbox" id="sa-consent"><span>Send me <strong>one WhatsApp message</strong> at ${esc(maskPhone(u.phone))} when a similar saree is added. I can stop this any time.</span></label></div><button class="btn-full" id="sa-go" onclick="similarSubscribe('${p.id}')">Tell me</button>`}`;
  el_('alertModal').classList.add('active');
}
function similarSubscribe(pid) {
  const u = currentUser(), p = db.products.find(x => x.id === pid); if (!u || !p) return;
  if (!el_('sa-consent').checked) { el_('sa-consent-row').classList.add('invalid'); showToast('Please tick the box to allow the WhatsApp message', 'error'); return; }
  if (mySimilar(pid)) { closeModal('alertModal'); return; }
  const b = similarBand(p), backup = db.consentLog.length, a = { id: 'sa' + generateId(), sourceId: pid, userId: u.id, phone: u.phone, category: p.category, fabric: p.fabric || '', min: b.min, max: b.max, status: 'waiting', createdAt: nowISO(), notifiedAt: null };
  recordConsent(u, 'similarAlert', true, 'product', pid); db.similarAlerts.push(a);
  if (!saveDB()) { db.similarAlerts.pop(); db.consentLog.length = backup; return; }
  closeModal('alertModal'); refreshStockUI(); showToast('✨ Done — we will tell you when a similar saree arrives', 'success');
}
function similarCancel(id) {
  const a = db.similarAlerts.find(x => x.id === id), u = currentUser(); if (!a || !u || a.userId !== u.id || a.status !== 'waiting') return;
  a.status = 'cancelled'; a.cancelledAt = nowISO(); recordConsent(u, 'similarAlert', false, 'product', a.sourceId); saveDB(); closeModal('alertModal'); refreshStockUI(); showToast('You will not be messaged about this');
}
// a new saree (or a restock) is published: each matching waiting customer gets exactly ONE queued message
function notifySimilar(np) {
  if (!np || np.stock <= 0 || isAccessory(np)) return 0; let n = 0;
  db.similarAlerts.filter(a => a.status === 'waiting' && a.sourceId !== np.id && np.price >= a.min && np.price <= a.max && (np.category === a.category || (a.fabric && np.fabric === a.fabric))).forEach(a => {
    const u = db.users.find(x => x.id === a.userId), granted = db.consentLog.filter(c => c.userId === a.userId && c.type === 'similarAlert' && c.ref === a.sourceId).slice(-1)[0];
    if (!u || u.deletionRequestedAt || !granted || !granted.granted) { a.status = 'skipped'; return; }
    a.status = 'notified'; a.notifiedAt = nowISO();
    if (!db.outbox.some(m => m.alertId === a.id)) { db.outbox.push({ id: 'ob' + generateId(), type: 'similar_arrival', alertId: a.id, userId: u.id, to: u.phone, productId: np.id, productName: np.name, link: richLink(np) || storeLink(np), status: 'queued', createdAt: nowISO(), error: '' }); n++; }
  });
  if (n || db.similarAlerts.some(a => a.status === 'skipped')) { saveDB(); dispatchOutbox(); }
  return n;
}
function similarSummaryHTML() {
  const w = db.similarAlerts.filter(a => a.status === 'waiting').length, q = db.outbox.filter(m => m.type === 'similar_arrival' && m.status === 'queued').length, sent = db.outbox.filter(m => m.type === 'similar_arrival' && m.status === 'sent').length;
  return `<div class="admin-card" id="similar-summary" style="margin-bottom:16px;"><h3>Similar-saree requests</h3><p class="note">Customers who missed a one-of-a-kind saree and asked to hear about similar ones. <strong>${w}</strong> waiting · <strong>${q}</strong> queued · <strong>${sent}</strong> sent. They are messaged once, automatically, when you publish a matching new saree (same category or fabric, price within ±30%). Needs an approved WhatsApp template named <code>similar_arrival</code> with the same variables as <code>back_in_stock</code>.</p></div>`;
}

// ---- bulk upload from a spreadsheet (CSV) ----
const BULK_COLS = ['sku', 'name', 'category', 'price', 'stock', 'fabric', 'colours', 'description', 'tags', 'photo_urls', 'video'];
function parseCSV(text) {
  text = String(text || '').replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || '', d = first.includes('\t') && !first.includes(',') ? '\t' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some(x => x.trim() !== '')) rows.push(row);
  return rows;
}
function bulkCsvTemplate() {
  const ex = ['AP-TUS-010', 'Olive Green Tussar', 'Tussar', '24500', '1', 'Tussar Silk', 'Green;Gold', 'Hand-painted border with a rich pallu.', 'tussar;festive', 'https://example.com/photo1.jpg;https://example.com/photo2.jpg', ''];
  const txt = BULK_COLS.join(',') + '\n' + ex.map(csvCell).join(',') + '\n';
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = 'products-template.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const NO_PHOTO = 'data:image/svg+xml;base64,' + btoa("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'><rect width='400' height='500' fill='#f3ede1'/><text x='200' y='250' font-family='serif' font-size='26' fill='#a8741a' text-anchor='middle'>Photo coming soon</text></svg>");
let BULK = { rows: [] };
function bulkValidate(text) {
  const table = parseCSV(text); if (table.length < 2) return { error: 'The file needs a header row and at least one product row.', rows: [] };
  const head = table[0].map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_')), idx = {}; BULK_COLS.forEach(c => { idx[c] = head.indexOf(c); });
  if (idx.name < 0 || idx.price < 0) return { error: 'The header row must include at least the columns "name" and "price". Use the CSV template.', rows: [] };
  const allCats = [...db.categories, ...db.accessoryCategories], seen = new Set(db.products.map(p => p.sku.toLowerCase())), skuNext = {};
  const cell = (r, c) => idx[c] >= 0 ? String(r[idx[c]] ?? '').trim() : '', list = v => v.split(/[;|]/).map(x => x.trim()).filter(Boolean);
  const rows = table.slice(1).map((r, i) => {
    const errs = [], warns = [], name = cell(r, 'name'), price = Number(cell(r, 'price').replace(/[₹,\s]/g, '')), stockRaw = cell(r, 'stock'), stock = stockRaw === '' ? 1 : Number(stockRaw);
    const cat = allCats.find(c => c.toLowerCase() === cell(r, 'category').toLowerCase());
    if (!name) errs.push('name is missing');
    if (!(price >= 0) || cell(r, 'price') === '') errs.push('price is not a number');
    if (!Number.isInteger(stock) || stock < 0) errs.push('stock must be a whole number');
    if (!cat) errs.push(`category "${cell(r, 'category')}" does not exist (${allCats.join(', ')})`);
    let sku = cell(r, 'sku').toUpperCase();
    if (!sku && cat) { const code = (SKU_CATEGORIES.find(c => c[1] === cat) || [isAccessory({ category: cat }) ? 'ACC' : cat.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')])[0]; skuNext[code] = skuNext[code] || nextSkuStart(code); do { sku = `AP-${code}-${String(skuNext[code]++).padStart(3, '0')}`; } while (seen.has(sku.toLowerCase())); }
    if (sku && seen.has(sku.toLowerCase()) && !errs.length) errs.push(`SKU ${sku} already exists`);
    const photos = list(cell(r, 'photo_urls')), good = photos.filter(u => /^https?:\/\//i.test(u));
    if (photos.length && good.length < photos.length) warns.push('some photo links were ignored (they must start with http)');
    if (!good.length) warns.push('no photo: a "Photo coming soon" picture is used. Add photos later with Edit');
    const vid = cell(r, 'video'); let video = ''; if (vid) { const vi = videoInfo(vid); if (vi && !vi.error) video = vid; else warns.push('video link not recognised, ignored'); }
    if (!errs.length) seen.add(sku.toLowerCase());
    return { line: i + 2, ok: !errs.length, errs, warns, data: errs.length ? null : { sku, name, category: cat, price: Math.round(price), stock, fabric: cell(r, 'fabric') || FABRIC_BY_CAT[cat] || '', colours: list(cell(r, 'colours')), description: cell(r, 'description'), tags: list(cell(r, 'tags')), images: good.length ? good : [NO_PHOTO], video } };
  });
  return { rows };
}
function openBulk() {
  BULK = { rows: [] };
  openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:6px;">Bulk upload products</h3>
    <p style="font-size:12px;color:#6b6862;margin-bottom:12px;">Fill the <strong>CSV template</strong> in Excel or Google Sheets (File → Save as CSV), then choose it here. Photos are added as web links; you can also add them later with Edit. Nothing is saved until you press <em>Add products</em>.</p>
    <input type="file" id="bulk-file" accept=".csv,text/csv,text/plain" onchange="bulkRead(this)">
    <div class="form-group" style="margin-top:10px;"><label>…or paste rows copied from your sheet</label><textarea id="bulk-text" rows="4" oninput="bulkPreview(this.value)" placeholder="sku,name,category,price,stock,…"></textarea></div>
    <div id="bulk-preview"></div>`, true);
}
function bulkRead(inp) { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { el_('bulk-text').value = r.result; bulkPreview(r.result); }; r.readAsText(f); }
function bulkPreview(text) {
  const box = el_('bulk-preview'); if (!text.trim()) { box.innerHTML = ''; BULK.rows = []; return; }
  const res = bulkValidate(text); BULK.rows = res.rows;
  if (res.error) { box.innerHTML = `<div class="note" style="color:var(--red);">${esc(res.error)}</div>`; return; }
  const good = res.rows.filter(r => r.ok).length;
  box.innerHTML = `<p style="margin:10px 0;font-weight:600;"><span id="bulk-ok">${good}</span> ready · <span id="bulk-bad">${res.rows.length - good}</span> with problems (skipped)</p>
    <div style="max-height:240px;overflow:auto;"><table class="admin-table"><thead><tr><th>Row</th><th>Product</th><th>Result</th></tr></thead><tbody>${res.rows.map(r => `<tr class="bulk-row ${r.ok ? 'ok' : 'bad'}"><td>${r.line}</td><td>${esc(r.ok ? r.data.name : '')}</td><td>${r.ok ? '✅ ok' : '❌ ' + esc(r.errs.join('; '))}${r.warns.length ? `<div style="font-size:11px;color:#9a6b00;">${esc(r.warns.join('; '))}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>
    <button class="btn-full" id="bulk-go" style="margin-top:12px;" ${good ? '' : 'disabled'} onclick="bulkCommit()">Add ${good} product${good === 1 ? '' : 's'}</button>`;
}
function bulkCommit() {
  const ok = BULK.rows.filter(r => r.ok); if (!ok.length) return; const before = db.products.length;
  ok.forEach(r => {
    const d = r.data, auto = localCopy({ name: d.name, category: d.category, colours: d.colours }, 0);
    db.products.push({ id: 'p' + generateId(), ...d, image: d.images[0], threshold: 2, rating: 0, reviews: 0, isNew: true, description: d.description || auto.description || '', tags: d.tags.length ? d.tags : (auto.tags || []).slice(0, 8), seoTitle: auto.seoTitle, metaDescription: auto.metaDescription, altText: auto.altText, slug: uniqueSlug(d.name) });
    addLog('product_created', d.name, d.sku, 0, 0, d.stock, 'Added by bulk upload');
  });
  if (!saveDB()) { db.products.length = before; return; }
  closeModal('adminModal'); refreshAdmin(); renderProducts(); buildScrollTrack(); renderOccasions(); seoRefreshHome();
  showToast(`✅ ${ok.length} product${ok.length === 1 ? '' : 's'} added`, 'success');
  db.products.slice(before).forEach(np => notifySimilar(np));
}

// ---- status image (WhatsApp status / Instagram story) ----
const SI = { id: null, fmt: 'story', enh: false };
function openStatusImage(pid) {
  const p = db.products.find(x => x.id === pid); if (!p) return; SI.id = pid; SI.fmt = 'story';
  openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:6px;">Status image</h3>
    <p style="font-size:12px;color:#6b6862;margin-bottom:10px;">A ready-to-post picture for your WhatsApp status or Instagram story. Download it and post.</p>
    <div style="display:flex;gap:8px;margin-bottom:10px;"><button class="btn-sm btn-info-sm" id="si-story" onclick="siFmt('story')">Story 9:16</button><button class="btn-sm btn-info-sm" id="si-square" onclick="siFmt('square')">Square 1:1</button><button class="btn-sm btn-info-sm" id="si-post" onclick="siFmt('post')">Instagram post 4:5</button></div>
    <label class="chk" style="margin-bottom:8px;"><input type="checkbox" id="si-enh" onchange="SI.enh=this.checked;siDraw()"><span>✨ Brighten &amp; lift colours (gentle auto-fix for dull photos)</span></label>
    <div style="text-align:center;"><canvas id="si-canvas" style="max-width:100%;max-height:60vh;border:1px solid #eee;border-radius:6px;"></canvas></div>
    <div id="si-msg" class="note"></div>
    <button class="btn-full" id="si-dl" style="margin-top:12px;" onclick="siDownload()">⬇ Download image</button>`);
  siDraw();
}
function siFmt(f) { SI.fmt = f; siDraw(); }
function siWrap(ctx, text, x, y, maxW, lh, maxLines) {
  const words = String(text).split(/\s+/); let line = '', lines = [];
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line); lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh)); return y + lines.length * lh;
}
function siDraw() {
  const p = db.products.find(x => x.id === SI.id), c = el_('si-canvas'); if (!p || !c) return;
  const W = 1080, H = SI.fmt === 'story' ? 1920 : SI.fmt === 'post' ? 1350 : 1080; c.width = W; c.height = H; const ctx = c.getContext('2d');
  const photoH = SI.fmt === 'story' ? 1180 : SI.fmt === 'post' ? 880 : 660;
  ctx.fillStyle = '#F7F4EC'; ctx.fillRect(0, 0, W, H);
  const draw = img => {
    ctx.fillStyle = '#F7F4EC'; ctx.fillRect(0, 0, W, H);
    if (img) { const r = Math.max(W / img.width, photoH / img.height), w = img.width * r, h = img.height * r; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, photoH); ctx.clip(); if (SI.enh && 'filter' in ctx) ctx.filter = 'brightness(1.08) contrast(1.08) saturate(1.1)'; ctx.drawImage(img, (W - w) / 2, (photoH - h) / 2, w, h); ctx.restore(); }
    else { ctx.fillStyle = '#e9dfca'; ctx.fillRect(0, 0, W, photoH); }
    const y0 = photoH + 70; ctx.textAlign = 'center'; ctx.fillStyle = '#C96A11'; ctx.font = '600 34px Montserrat, Arial, sans-serif'; ctx.fillText(String(p.category).toUpperCase(), W / 2, y0);
    ctx.fillStyle = '#2E2D29'; ctx.font = '600 70px "Cormorant Garamond", Georgia, serif'; const yEnd = siWrap(ctx, p.name, W / 2, y0 + 80, W - 140, 78, 2);
    ctx.font = '600 64px "Cormorant Garamond", Georgia, serif'; ctx.fillStyle = '#C96A11'; ctx.fillText('₹ ' + money(p.price), W / 2, yEnd + 30);
    const tag = p.stock <= 0 ? 'Sold' : oneOfAKind(p) ? 'One of a kind' : p.stock <= 2 ? `Only ${p.stock} left` : '';
    if (tag) { ctx.font = '600 32px Montserrat, Arial, sans-serif'; ctx.fillStyle = '#2E2D29'; ctx.fillText('✦ ' + tag + ' ✦', W / 2, yEnd + 90); }
    ctx.fillStyle = '#8C8C88'; ctx.font = '500 30px Montserrat, Arial, sans-serif'; ctx.fillText(`${BRAND()} · ${db.settings.phone}`, W / 2, H - 50);
    { const lg = new Image(); lg.onload = () => { const lw = 300, lh = lw * lg.height / lg.width; ctx.save(); ctx.globalAlpha = .94; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(36, 36, lw + 32, lh + 24, 18) : ctx.rect(36, 36, lw + 32, lh + 24); ctx.fill(); ctx.globalAlpha = 1; ctx.drawImage(lg, 52, 48, lw, lh); ctx.restore(); }; lg.src = LOGO_URI; }
    SI.drawn = true;
  };
  const src = p.image; if (!src) { draw(null); return; }
  const img = new Image(); if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
  img.onload = () => draw(img); img.onerror = () => { draw(null); const m = el_('si-msg'); if (m) m.textContent = 'This photo could not be loaded, so the picture has no photo.'; };
  img.src = src;
}
function siDownload() {
  const p = db.products.find(x => x.id === SI.id), c = el_('si-canvas'); if (!p || !c) return;
  try { c.toBlob(b => { if (!b) { showToast('Could not create the image', 'error'); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${p.slug || 'saree'}-${SI.fmt}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png'); }
  catch (e) { showToast('This photo is hosted on another site and cannot be exported. Upload the photo into the product and try again.', 'error'); }
}

// ---- FAQ ----
function faqItems() {
  const ph = db.settings.phone || '';
  return [
    ['Is every saree really only one piece?', 'Yes. Most of our sarees are single designer pieces. Once a saree is sold, that exact saree can be made again only on order: message us on WhatsApp if you would like one. You can also tap “Tell me about similar sarees” on its page and we will message you once when a similar one arrives.'],
    ['Will the colour match the photos?', 'We photograph every saree with care, but screens differ. Many pages have a ☀ daylight photo that shows the truest colour, and we are happy to send a live video on WhatsApp before you buy.'],
    ['How much is delivery, and how long does it take?', `We ship to every PIN code. Delivery is free on orders above ₹${money(SHIP_FREE_ABOVE)}; otherwise it is ₹${SHIP_FEE}. Enter your PIN on a product page to see an estimated delivery date.`],
    ['Can I cancel an order?', 'No. Orders cannot be cancelled once placed, because every piece is unique and prepared for you. Before dispatch you can correct your delivery address from My Account → Track.'],
    ['Can I send a saree as a gift?', `Yes. At checkout choose gift wrapping (₹${money(giftFee())}), add a note card, ship it directly to the recipient and hide your name on the parcel and slip.`],
    ['How do I pay?', 'Online at checkout, or through the secure payment link we send on WhatsApp. We never ask for card numbers, OTPs or UPI PINs in a chat.'],
    ['How do I care for my saree?', 'Every fabric is different. Our Saree Care Guide explains washing, drying, ironing and storing.', 'care'],
    ...(accOn() ? [['Do you sell accessories?', 'Yes: jewellery, blouses and blouse fabric, and bags and potlis. Open the Accessories tab in the shop. They are ordered and delivered like sarees.']] : []),
    ['What are your shipping, return and privacy policies?', 'They are written in full in our Terms and Privacy pages.', 'terms'],
    ['How can I reach you?', `Message or call ${ph}, or write to ${db.settings.email || 'us'}. We reply on WhatsApp.`]
  ];
}
function renderFaq() {
  const el = document.getElementById('faqBody'); if (!el) return; const items = faqItems();
  el.innerHTML = `<div class="section-header"><div class="section-label">Help</div><h2 class="section-title">Frequently asked questions</h2></div><div class="faq-list">${items.map(([q, a, link], i) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}${link === 'care' ? ' <a onclick="navigateTo(\'care\')">Open the care guide</a>' : link === 'terms' ? ' <a onclick="openLegal(\'terms\',\'shipping\')">Read the shipping policy</a>' : ''}</p></details>`).join('')}</div>`;
  setLd('ld-faq', { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  try { document.title = `FAQ | ${BRAND()}`; } catch (e) {}
}

// ---- recently sold showcase + "request a similar piece" (26 Oct 2026) ----
const soldOn = () => db.settings.showRecentlySold !== false;
function soldSwitch(on) { db.settings.showRecentlySold = !!on; saveDB(); renderRecentlySold(); }
function recentlySold() {
  const last = {};
  db.orders.filter(o => o.status !== 'cancelled').forEach(o => (o.items || []).forEach(i => { if (!last[i.productId] || o.date > last[i.productId]) last[i.productId] = o.date; }));
  return sareeList().filter(p => p.stock <= 0)
    .map(p => ({ p, date: last[p.id] || '' }))
    .sort((a, b) => (b.date > a.date) - (b.date < a.date))
    .slice(0, 8);
}
function renderRecentlySold() {
  const el = document.getElementById('soldSection'); if (!el) return;
  const list = soldOn() ? recentlySold() : [];
  el.innerHTML = list.length ? `<div class="section-header"><div class="section-label">Loved by our customers</div><h2 class="section-title">Recently sold</h2></div><p class="sold-note">Every saree is a single piece. These found their homes; tell us what you like and we will look for a similar one.</p><div class="sold-track">${list.map(({ p, date }) => `<div class="sold-card" data-pid="${p.id}"><div class="sold-img"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><span class="sold-tag">Sold${date ? ' · ' + esc(fmtDate(date)) : ''}</span></div><div class="rc-name">${esc(p.name)}</div><div class="sold-actions"><button type="button" class="btn-sm btn-primary-sm sold-req" onclick="openSimilarRequest('${p.id}')">Request a similar piece</button><button type="button" class="btn-sm btn-info-sm sold-notify" onclick="openSimilarAlert('${p.id}')">Tell me when one arrives</button></div></div>`).join('')}</div>` : '';
}
function fabricChoices() { return [...new Set([...Object.values(FABRIC_BY_CAT), ...sareeList().map(p => p.fabric).filter(Boolean)])].sort(); }
function openSimilarRequest(pid) {
  const p = db.products.find(x => x.id === pid); if (!p || isAccessory(p)) return;
  const b = similarBand(p), fab = p.fabric || FABRIC_BY_CAT[p.category] || '', col = (p.colours || [])[0] || '', u = currentUser();
  el_('alertBody').innerHTML = `<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:12px;">Request a similar piece</h3>
    <div class="share-item"><img src="${esc(p.image)}" alt=""><div><div style="font-weight:600;">${esc(p.name)}</div><div style="font-size:12px;color:#6b6862;">tell us what you would like; we reply on WhatsApp</div></div></div>
    <div class="form-group" style="margin-top:12px;"><label>Fabric</label><select id="sr-fabric"><option value="">Any fabric</option>${fabricChoices().map(f => `<option ${f === fab ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Colour</label><input id="sr-colour" value="${esc(col)}" placeholder="e.g. maroon, green"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="form-group"><label>Budget from (₹)</label><input id="sr-min" type="number" min="0" value="${b.min}"></div><div class="form-group"><label>to (₹)</label><input id="sr-max" type="number" min="0" value="${b.max}"></div></div>
    <div class="form-group"><label>Anything else (optional)</label><textarea id="sr-note" rows="2" placeholder="occasion, border, blouse, delivery date…"></textarea></div>
    <button class="btn-full" id="sr-go" onclick="similarRequestSend('${p.id}')">Send on WhatsApp</button>
    <div class="note" id="sr-note-msg" style="margin-top:8px;">This opens WhatsApp with your request ready to send to ${esc(BRAND())}. Nothing is sent until you press send there.</div>`;
  el_('alertModal').classList.add('active');
}
function similarRequestText(p, v) {
  const u = currentUser(), lines = [`Hello ${BRAND()}, I would like a piece similar to *${p.name}* (${p.sku}), which is sold.`];
  lines.push(`Fabric: ${v.fabric || 'any'}`, `Colour: ${v.colour || 'any'}`);
  const min = v.min === '' ? null : +v.min, max = v.max === '' ? null : +v.max;
  lines.push('Budget: ' + (min != null && max != null ? `₹${money(min)} – ₹${money(max)}` : max != null ? `up to ₹${money(max)}` : min != null ? `from ₹${money(min)}` : 'flexible'));
  if (v.note) lines.push(`Note: ${v.note}`);
  if (u && u.name) lines.push(`Name: ${u.name}`);
  return lines.join('\n');
}
function similarRequestSend(pid) {
  const p = db.products.find(x => x.id === pid); if (!p) return;
  const v = { fabric: el_('sr-fabric').value, colour: el_('sr-colour').value.trim().slice(0, 60), min: el_('sr-min').value, max: el_('sr-max').value, note: el_('sr-note').value.trim().slice(0, 300) };
  if (v.min !== '' && v.max !== '' && +v.min > +v.max) { showToast('Budget “from” is more than “to”', 'error'); return; }
  const text = similarRequestText(p, v), num = waNumber();
  if (num.length < 11) { el_('sr-note-msg').innerHTML = 'WhatsApp number is not set up yet. Please copy this message and send it to us:<pre style="white-space:pre-wrap;margin-top:6px;">' + esc(text) + '</pre>'; return; }
  window.__lastSimilarRequest = text; trackHit('wa', {});
  const w = window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  closeModal('alertModal'); showToast('Opening WhatsApp…', 'success');
}

// ---- admin tables: label every cell so the phone layout can show them as cards ----
function stackAdminTables() {
  document.querySelectorAll('table.admin-table').forEach(t => {
    const heads = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (td.dataset.label === undefined) td.dataset.label = heads[i] || ''; }));
    t.classList.add('stack');
  });
}
let STACK_T = 0;
new MutationObserver(() => { if (STACK_T) return; STACK_T = requestAnimationFrame(() => { STACK_T = 0; stackAdminTables(); }); }).observe(document.body, { childList: true, subtree: true });

// ---- place prediction: type a PIN or a city and the rest is suggested (works offline; the customer can always edit) ----
const PIN3_CITY = { 500: 'Hyderabad', 501: 'Hyderabad', 502: 'Sangareddy', 503: 'Nizamabad', 504: 'Adilabad', 505: 'Karimnagar', 506: 'Warangal', 507: 'Khammam', 508: 'Nalgonda', 509: 'Mahabubnagar',
  515: 'Anantapur', 516: 'Kadapa', 517: 'Tirupati', 518: 'Kurnool', 520: 'Vijayawada', 521: 'Vijayawada', 522: 'Guntur', 523: 'Ongole', 524: 'Nellore', 530: 'Visakhapatnam', 531: 'Visakhapatnam', 532: 'Srikakulam', 533: 'Rajahmundry', 534: 'Eluru',
  560: 'Bengaluru', 570: 'Mysuru', 575: 'Mangaluru', 580: 'Hubballi', 600: 'Chennai', 625: 'Madurai', 620: 'Tiruchirappalli', 641: 'Coimbatore', 682: 'Kochi', 695: 'Thiruvananthapuram',
  400: 'Mumbai', 411: 'Pune', 440: 'Nagpur', 422: 'Nashik', 110: 'New Delhi', 700: 'Kolkata', 380: 'Ahmedabad', 395: 'Surat', 390: 'Vadodara', 302: 'Jaipur', 226: 'Lucknow', 208: 'Kanpur', 221: 'Varanasi', 800: 'Patna', 462: 'Bhopal', 452: 'Indore', 751: 'Bhubaneswar', 834: 'Ranchi', 781: 'Guwahati', 160: 'Chandigarh', 141: 'Ludhiana', 143: 'Amritsar' };
const PLACE_GROUPS = { 'chk-pin': ['chk-pin', 'chk-city', 'chk-state'], 'chk-city': ['chk-pin', 'chk-city', 'chk-state'], 'chk-state': ['chk-pin', 'chk-city', 'chk-state'],
  'ac-pin': ['ac-pin', 'ac-city', 'ac-state'], 'ac-city': ['ac-pin', 'ac-city', 'ac-state'], 'ac-state': ['ac-pin', 'ac-city', 'ac-state'],
  'ab-pin': ['ab-pin', 'ab-city', 'ab-state'], 'ab-city': ['ab-pin', 'ab-city', 'ab-state'], 'ab-state': ['ab-pin', 'ab-city', 'ab-state'],
  'gift-pin': ['gift-pin', 'gift-city', 'gift-state'], 'gift-city': ['gift-pin', 'gift-city', 'gift-state'], 'gift-state': ['gift-pin', 'gift-city', 'gift-state'] };
const titleCase = w => String(w).replace(/\b[a-z]/g, c => c.toUpperCase());
(function placeLists() {
  const cities = [...new Set(Object.values(CITY_STATE).flatMap(l => l.split(' ')).filter(c => c.length > 2 && c !== 'navi').map(titleCase).concat(Object.values(PIN3_CITY)))].sort();
  const mk = (id, arr) => { const d = document.createElement('datalist'); d.id = id; d.innerHTML = arr.map(x => `<option value="${esc(x)}">`).join(''); document.body.appendChild(d); };
  mk('dl-cities', cities); mk('dl-states', [...KNOWN_STATES].sort());
})();
function placeFill(el, value, force) { if (!el || !value) return; if (el.value.trim() && el.dataset.auto !== '1' && !force) return; if (el.value === value) return; el.value = value; el.dataset.auto = '1'; const ev = new Event('input', { bubbles: true }); ev.auto = true; el.dispatchEvent(ev); }
function placePredict(id) {
  const g = PLACE_GROUPS[id]; if (!g) return; const [pinId, cityId, stateId] = g, pin = el_(pinId), city = el_(cityId), state = el_(stateId); if (!pin || !city || !state) return;
  const p = pin.value.replace(/\D/g, '');
  if (id === pinId && p.length >= 3) { const st = statesOfPin(p.length === 6 ? p : p + '0000'); const c3 = PIN3_CITY[p.slice(0, 3)]; if (p.length === 6) { const cur = normState(state.value), clash = !!(st && state.value.trim() && !st.some(x => normState(x) === cur) && state.dataset.typed !== '1' && city.dataset.typed !== '1');   /* the PIN belongs to another state than the one shown: replace both */
    if (c3) placeFill(city, c3, clash); const pick = c3 && stateOfCity(c3) ? stateOfCity(c3) : (st && st.length === 1 ? st[0] : ''); placeFill(state, pick, clash); } }
  if (id === cityId) { const st = stateOfCity(city.value); if (st) placeFill(state, st); }
}
document.addEventListener('input', e => {
  const t = e.target; if (!t || !PLACE_GROUPS[t.id]) return;
  if (!e.auto) { delete t.dataset.auto; t.dataset.typed = '1'; }   // the customer typed here: never overwrite it again
  if (!e.auto) placePredict(t.id);
});
document.addEventListener('focusin', e => { const t = e.target; if (!t || !PLACE_GROUPS[t.id] || t.getAttribute('list')) return; if (/city$/.test(t.id)) { t.setAttribute('list', 'dl-cities'); t.autocomplete = 'address-level2'; } else if (/state$/.test(t.id)) { t.setAttribute('list', 'dl-states'); t.autocomplete = 'address-level1'; } else { t.setAttribute('inputmode', 'numeric'); t.maxLength = 6; t.autocomplete = 'postal-code'; } });
