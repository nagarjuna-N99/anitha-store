// ================= PRODUCT PAGE: delivery date line, details table, why shop with us, questions, related sarees, sticky add bar (5 Nov 2026) =================
// Everything here only shows facts the shop really has (its own settings and catalogue). Nothing is promised that the shop does not offer.
const DEFAULT_SAREE_LENGTH = '5.5 metres, with a blouse piece';
const sareeLengthOf = p => String(p.length || (db.settings.sareeLength === undefined ? DEFAULT_SAREE_LENGTH : db.settings.sareeLength) || '').trim();
const shipText = price => price > SHIP_FREE_ABOVE ? 'Free shipping' : `Shipping ₹${SHIP_FEE} (free above ₹${money(SHIP_FREE_ABOVE)})`;
function arrivesInner(p) {
  const pin = savedPin();
  if (pin && pinOk(pin)) { const est = deliveryEstimate(deliveryCfg(), pin); if (est.ok && est.serviceable) return `<b>${esc(est.label)}</b><span>${esc(est.state)} · ${esc(shipText(p.price))}</span>`; }
  return `<b>Delivery date</b><span>Enter your PIN code below to see it · ${esc(shipText(p.price))}</span>`;
}
function arrivesHTML(p, gk) { return p && p.price ? `<div class="arrives" id="arr-${gk}"><span aria-hidden="true">🚚</span><div>${arrivesInner(p)}</div></div>` : ''; }
function updateArrives(gk) { const e = document.getElementById('arr-' + gk); const p = db.products.find(x => 'gal-' + x.id === gk); if (e && p) e.lastElementChild.innerHTML = arrivesInner(p); }
const capFirst = t => String(t || '').replace(/^the /i, '').replace(/^./, c => c.toUpperCase());
function detailsTableHTML(p, inStock) {
  const kb = (typeof CAT_KB !== 'undefined' && CAT_KB[p.category]) || {}, rows = [], add = (k, v) => { if (v) rows.push(`<tr><th scope="row">${k}</th><td>${v}</td></tr>`); };
  if (!isAccessory(p)) { add('Weave', esc(p.fabric || '')); add('Colours', esc((p.colours || []).join(', '))); }
  add('Category', esc(p.category)); if (!isAccessory(p)) { add('Origin', esc(capFirst(kb.origin))); add('Length', esc(sareeLengthOf(p))); add('Care', esc(kb.care || '')); }
  add('SKU', esc(p.sku)); add('Availability', inStock ? (oneOfAKind(p) ? 'One of a kind' : p.stock <= 2 ? `Only ${p.stock} left` : 'In stock') : 'Sold out');
  if (p.rating) add('Rating', `${p.rating} (${p.reviews} review${p.reviews === 1 ? '' : 's'})`);
  return `<table class="dtable" aria-label="Product details"><tbody>${rows.join('')}</tbody></table>`;
}
function trustHTML() {
  const s = db.settings, rd = +s.returnDays || 0, items = [['🧵', 'Hand-picked, one of a kind', 'Every saree is picked by us, and each one is a single piece. Once it is sold, that exact saree can be made again only on order: ask us on WhatsApp.'], ['🚚', `Free shipping above ₹${money(SHIP_FREE_ABOVE)}`, `Below that, shipping is ₹${SHIP_FEE}.`], ['📦', `Dispatch in ${esc(s.dispatchTime || '3–7 business days')}`, 'Track your order in My Account.']];
  if (rd > 0) items.push(['↩', `${rd}-day returns`, 'The full policy is in our <a onclick="closeModal(\'productModal\');navigateTo(\'terms\')">Terms</a>.']);
  if (s.waNumber || s.phone) items.push(['💬', 'Ask us on WhatsApp', 'Questions about this saree? We reply there.']);
  return `<section class="trust" aria-label="Why shop with us"><h3>Why shop with us</h3><div class="trust-grid">${items.map(([i, t, d]) => `<div class="trust-it"><span aria-hidden="true">${i}</span><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div></section>`;
}
function productFaqHTML() {
  const all = faqItems(), pick = [2, 1, 5, 6, 0].map(i => all[i]).filter(Boolean);
  return `<section class="pp-faq" aria-label="Questions"><h3>A few questions people ask</h3>${pick.map(([q, a]) => `<details class="pp-q"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}<p class="note" style="margin:10px 0 0"><a onclick="closeModal('productModal');navigateTo('faq')">See all questions →</a></p></section>`;
}
function relatedList(p, n = 4) {
  const pool = db.products.filter(x => x.id !== p.id && isAccessory(x) === isAccessory(p)), tags = new Set((p.tags || []).map(t => String(t).toLowerCase())), cols = new Set((p.colours || []).map(c => String(c).toLowerCase()));
  const score = x => (x.category === p.category ? 3 : 0) + (p.fabric && x.fabric === p.fabric ? 2 : 0) + (x.colours || []).filter(c => cols.has(String(c).toLowerCase())).length + (x.tags || []).filter(t => tags.has(String(t).toLowerCase())).length + (p.price && Math.abs(x.price - p.price) / p.price < 0.4 ? 1 : 0) + (x.stock > 0 ? 1 : 0);
  return pool.map(x => [x, score(x)]).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, n).map(a => a[0]);
}
function relatedHTML(p) {
  const list = relatedList(p); if (!list.length) return '';
  const card = x => `<a class="rel-card" role="link" tabindex="0" onclick="openProductDetail('${x.id}')" onkeydown="if(event.key==='Enter')openProductDetail('${x.id}')"><div class="rel-img">${safeImg(x.image) ? `<img src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy">` : ''}${x.stock === 0 ? '<span class="rel-tag">Sold out</span>' : ''}</div><div class="rel-cat">${esc(x.category)}</div><div class="rel-name">${esc(x.name)}</div><div class="rel-price">₹ ${money(x.price)}</div></a>`;
  return `<section class="related" aria-label="You may also like"><h3>You may also like</h3><div class="rel-grid">${list.map(card).join('')}</div>${p.category ? `<p class="note" style="margin:12px 0 0;text-align:center"><a onclick="closeModal('productModal');filterAndShowShop('${esc(p.category).replace(/'/g, "\\'")}')">See all ${esc(p.category)} →</a></p>` : ''}</section>`;
}
// the sticky bar shows only once the page's own Add to cart button has scrolled out of sight, so the two never sit on top of each other
function buyBarWatch() {
  const bar = document.querySelector('#productModalBody .buy-bar'), btn = document.querySelector('#productModalBody .buy-btn'); if (!bar || !btn) return;
  const upd = () => { const r = btn.getBoundingClientRect(); if (r.height) bar.classList.toggle('off', r.bottom > 0 && r.top < (window.innerHeight || 800)); };
  window.__buyBarSync = upd;   // lets a test ask for the same re-check the next screen frame would do
  clearInterval(window.__bbTimer); upd();
  // photos loading and text wrapping move the button without any scroll, so it is re-checked a few times a second while the page is open (a cheap read, stops when the page closes)
  window.__bbTimer = setInterval(() => { if (!document.body.contains(bar)) return clearInterval(window.__bbTimer); upd(); }, 100);
  let sp = document.getElementById('productModalBody'); while (sp && sp !== document.body) { sp.addEventListener('scroll', upd, { passive: true }); sp = sp.parentElement; }
}
function buyBarHTML(p) {
  const inStock = p.stock > 0; return `<div class="buy-bar"><div class="bb-price"><small>${esc(p.category)}</small><b>${p.price ? '₹ ' + money(p.price) : ''}</b></div>${inStock ? `<button type="button" class="btn-full bb-btn" onclick="addToCart('${p.id}');closeModal('productModal');">Add to cart</button>` : `<button type="button" class="btn-full bb-btn" onclick="openStockAlert('${p.id}')">${esc(notifyLabel(p.id))}</button>`}</div>`;
}
