// ================= BROWSING UPGRADE (7 Nov 2026) =================
// 1. a photo that cannot load shows a calm "photo coming soon" card instead of broken alt text
// 2. search: results appear in a panel directly under the search bar (photo, name, price), with the keyboard and tap both working
// 3. Nalli-style filter bar: Show Filters, Price / Colour / Fabric drop-downs, "N ITEMS", Sort
// 4. Quick View: a small window with the photos, price and Add to bag, without leaving the page
// 5. hover effects: the photo of a category tile changes while the mouse is over it
// 6. Follow us links (Facebook, Instagram) at the bottom of every page; the owner edits them in Home page → Follow us
const IMG_PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f3ede1"/><g fill="none" stroke="#c96a11" stroke-width="2" opacity=".55"><path d="M110 150h80l10 120H100z"/><path d="M130 150v-14a20 20 0 0 1 40 0v14"/></g><text x="150" y="320" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#6b6558">Photo coming soon</text></svg>');
document.addEventListener('error', e => {
  const t = e.target; if (!t || t.tagName !== 'IMG' || t.dataset.ph) return;
  if (t.matches('.brand-logo,.soc-av') || t.closest('.admin-shell,#adminApp')) return;
  if (t.classList.contains('pc-alt') || t.classList.contains('sc-alt')) { t.remove(); return; }   // a second photo that will not load is simply not used
  t.dataset.ph = '1'; t.classList.add('img-ph'); t.removeAttribute('srcset'); t.src = IMG_PH;
}, true);

// ---------- search under the search bar ----------
const SD = { i: -1, list: [], n: 0 };
const sdTerms = q => String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1 && !STOP_WORDS.has(t));
function sdHl(text, q) {
  const ts = sdTerms(q); const raw = String(text || ''); if (!ts.length) return esc(raw);
  const re = new RegExp('(' + ts.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig');
  return raw.split(re).map((part, k) => k % 2 ? `<mark>${esc(part)}</mark>` : esc(part)).join('');
}
function searchResults(q) {
  const terms = tokenise(q); if (!terms.length) return [];
  return db.products.filter(p => !isAccessory(p) || accOn()).map(p => [p, searchScore(p, terms)]).filter(x => x[1] > 0)
    .sort((a, b) => b[1] - a[1] || (b[0].stock > 0) - (a[0].stock > 0)).map(x => x[0]);
}
function searchDropRender(q) {
  const d = document.getElementById('searchDrop'), inp = document.getElementById('shop-q'); if (!d) return;
  q = String(q || '').trim(); SD.i = -1; SD.list = [];
  const chips = db.categories.slice(0, 8).map(c => `<button type="button" class="sd-chip" data-cat="${esc(c)}" onclick="closeNavSearch();filterAndShowShop(this.dataset.cat)">${esc(c)}</button>`).join('');
  let h;
  if (!q) h = `<div class="sd-h">Browse by type</div><div class="sd-chips">${chips}</div><div class="sd-hint">Or type a word: a place (kanchipuram), a colour (red), an occasion (wedding).</div>`;
  else {
    const all = searchResults(q); SD.list = all.slice(0, 6); SD.n = all.length;
    h = all.length ? `<div class="sd-h">${all.length} ${all.length === 1 ? 'saree' : 'sarees'} found</div>` + SD.list.map((p, k) => {
      const pic = pcPics(p)[0] || '';
      return `<div class="sd-row" role="option" id="sd-${k}" tabindex="-1" aria-selected="false" data-id="${esc(p.id)}" onclick="searchOpen(this.dataset.id)"><span class="sd-pic">${pic ? `<img src="${esc(pic)}" alt="" loading="lazy">` : ''}</span><span class="sd-t"><b>${sdHl(p.name, q)}</b><small>${esc(p.category)}${p.fabric ? ' · ' + esc(p.fabric) : ''}${p.stock === 0 ? ' · <i>Sold out</i>' : oneOfAKind(p) ? ' · single piece' : ''}</small></span><span class="sd-p">${p.price ? '₹ ' + money(p.price) : ''}</span></div>`;
    }).join('') + `<button type="button" class="sd-all" onclick="searchAll()">See all ${all.length} ${all.length === 1 ? 'result' : 'results'} for “${esc(q)}” →</button>`
      : `<div class="sd-empty"><b>No sarees match “${esc(q)}”.</b><span>Try a fabric (silk, cotton), a place (kanchipuram, banarasi) or a colour.</span></div><div class="sd-chips">${chips}</div>`;
  }
  d.innerHTML = h; d.hidden = false; if (inp) { inp.setAttribute('aria-expanded', 'true'); inp.removeAttribute('aria-activedescendant'); }
}
function searchInput(v) {
  const c = document.getElementById('shop-q-clear'); if (c) c.style.display = v ? '' : 'none';
  SHOP.q = v; if (document.getElementById('page-shop').classList.contains('active')) { clearTimeout(SHOP_T); SHOP_T = setTimeout(renderProducts, 150); }
  searchDropRender(v);
}
function searchAll() { const v = (document.getElementById('shop-q') || {}).value || ''; closeNavSearch(); shopSearch(v, true); if (v && !document.getElementById('page-shop').classList.contains('active')) navigateTo('shop'); }
function searchOpen(id) { closeNavSearch(); openProductDetail(id); }
function searchKey(e) {
  const n = SD.list.length, inp = e.target;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!n) return; e.preventDefault(); SD.i = e.key === 'ArrowDown' ? (SD.i + 1) % n : (SD.i - 1 + n) % n;
    SD.list.forEach((_, k) => { const r = document.getElementById('sd-' + k); if (r) { r.classList.toggle('on', k === SD.i); r.setAttribute('aria-selected', k === SD.i); } });
    inp.setAttribute('aria-activedescendant', 'sd-' + SD.i); const r = document.getElementById('sd-' + SD.i); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') { e.preventDefault(); if (SD.i >= 0 && SD.list[SD.i]) searchOpen(SD.list[SD.i].id); else if (inp.value.trim()) searchAll(); }
}

// ---------- filter drop-downs (Price / Colour / Fabric) ----------
const FDD = { open: '' };
function fddData() {
  const prods = categoryProducts().length ? categoryProducts() : kindProducts(), count = arr => { const m = {}; arr.forEach(v => { m[v] = (m[v] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
  return { fabrics: count(prods.map(p => p.fabric).filter(Boolean)), colours: count(prods.flatMap(p => p.colours || [])) };
}
function fddHTML(k) {
  const D = fddData(), act = (a, b) => (+SHOP.min || 0) === a && (b === '' ? SHOP.max === '' : +SHOP.max === b) && (SHOP.min !== '' || SHOP.max !== '');
  if (k === 'price') {
    const pre = [['Any price', '', ''], ['Under ₹20,000', '', 20000], ['₹20,000 – ₹50,000', 20000, 50000], ['Above ₹50,000', 50000, '']];
    return pre.map(([l, a, b]) => { const on = a === '' && b === '' ? SHOP.min === '' && SHOP.max === '' : (SHOP.min === String(a) || (a === '' && SHOP.min === '')) && (SHOP.max === String(b) || (b === '' && SHOP.max === '')); return `<button type="button" class="fdd-o ${on ? 'on' : ''}" onclick="fddPrice(${a === '' ? "''" : a},${b === '' ? "''" : b})">${l}</button>`; }).join('')
      + `<div class="fdd-r"><input id="fdd-min" type="number" min="0" inputmode="numeric" placeholder="Min ₹" value="${esc(SHOP.min)}" aria-label="Minimum price"><span>to</span><input id="fdd-max" type="number" min="0" inputmode="numeric" placeholder="Max ₹" value="${esc(SHOP.max)}" aria-label="Maximum price"><button type="button" class="fdd-go" onclick="fddRange()">Go</button></div>`;
  }
  if (k === 'colour') return D.colours.length ? `<div class="swatches">${D.colours.map(([c, n]) => `<button type="button" class="swatch ${SHOP.colours.includes(c) ? 'on' : ''}" data-v="${esc(c)}" style="background:${colourCss(c)}" title="${esc(c)} (${n})" aria-label="${esc(c)} (${n})" aria-pressed="${SHOP.colours.includes(c)}" onclick="shopToggle('colours',this.dataset.v);fddRefresh()"></button>`).join('')}</div>` : '<p class="note">No colours set on products yet.</p>';
  return D.fabrics.length ? D.fabrics.map(([f, n]) => `<label class="chk-line"><input type="checkbox" ${SHOP.fabrics.includes(f) ? 'checked' : ''} data-v="${esc(f)}" onchange="shopToggle('fabrics',this.dataset.v);fddRefresh()"> ${esc(f)} <small>(${n})</small></label>`).join('') : '<p class="note">No fabric set on products yet.</p>';
}
function fddCloseAll() { FDD.open = ''; ['price', 'colour', 'fabric'].forEach(k => { const b = document.getElementById('fdd-b-' + k), p = document.getElementById('fdd-p-' + k); if (p) p.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }); }
function fddToggle(k) { const was = FDD.open === k; fddCloseAll(); if (was) return; FDD.open = k; const p = document.getElementById('fdd-p-' + k), b = document.getElementById('fdd-b-' + k); if (!p) return; p.innerHTML = fddHTML(k); p.hidden = false; b.setAttribute('aria-expanded', 'true'); }
function fddRefresh() {
  const n = { price: SHOP.min !== '' || SHOP.max !== '' ? 1 : 0, colour: SHOP.colours.length, fabric: SHOP.fabrics.length }, L = { price: 'Price', colour: 'Colour', fabric: 'Fabric' };
  for (const k of Object.keys(L)) { const b = document.getElementById('fdd-b-' + k); if (b) { b.classList.toggle('has', !!n[k]); b.innerHTML = `${L[k]}${n[k] ? ` <small>(${n[k]})</small>` : ''} <span class="car" aria-hidden="true">▾</span>`; } }
  if (FDD.open) { const p = document.getElementById('fdd-p-' + FDD.open); if (p && !p.hidden) p.innerHTML = fddHTML(FDD.open); }
}
function fddPrice(a, b) { SHOP.min = a === '' ? '' : String(a); SHOP.max = b === '' ? '' : String(b); renderProducts(); if (SHOP.open) renderShopPanel(); fddRefresh(); }
function fddRange() { let a = document.getElementById('fdd-min').value, b = document.getElementById('fdd-max').value; if (a !== '' && b !== '' && +a > +b) [a, b] = [b, a]; SHOP.min = a; SHOP.max = b; renderProducts(); if (SHOP.open) renderShopPanel(); fddRefresh(); }
document.addEventListener('click', e => { if (FDD.open && !e.composedPath().some(n => n.classList && n.classList.contains('fdd-w'))) fddCloseAll(); });   // composedPath: the menu redraws itself on a choice, so the pressed button is already detached when this runs

// ---------- Quick View ----------
const QV = { id: '', i: 0, from: null };
function qvEl() {
  let el = document.getElementById('quickView'); if (el) return el;
  el = document.createElement('div'); el.id = 'quickView'; el.className = 'qv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Quick View');
  el.addEventListener('click', e => { if (e.target === el) qvClose(); }); document.body.appendChild(el); return el;
}
function qvHTML(p) {
  const pics = pcPics(p), fav = favourites.includes(p.id), sold = p.stock === 0;
  const avail = sold ? 'Sold out' : oneOfAKind(p) ? 'A single designer piece: only 1 available' : p.stock <= 2 ? `Only ${p.stock} left` : 'In stock';
  const chips = [p.fabric, ...(p.colours || []).slice(0, 3)].filter(Boolean).map(c => `<span class="pp-chip">${esc(c)}</span>`).join('');
  const desc = String(p.description || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  return `<button type="button" class="qv-x" aria-label="Close Quick View" onclick="qvClose()">×</button>
    <div class="qv-pics"><div class="qv-main"><img id="qvMain" src="${esc(pics[QV.i] || p.image)}" alt="${esc(p.altText || p.name)}"></div>${pics.length > 1 ? `<div class="qv-th">${pics.map((u, k) => `<button type="button" class="${k === QV.i ? 'on' : ''}" aria-label="Photo ${k + 1}" onclick="qvPick(${k})"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</div>
    <div class="qv-info"><div class="product-tag">${esc(p.category)}</div><h3 class="qv-name">${esc(p.name)}</h3><div class="qv-price">${p.price ? '₹ ' + money(p.price) : ''}</div><div class="qv-av ${sold ? 'out' : ''}">${esc(avail)}</div>${chips ? `<div class="pp-chips">${chips}</div>` : ''}${desc ? `<p class="qv-desc">${esc(desc)}${String(p.description || '').length > 220 ? '…' : ''}</p>` : ''}
      <div class="qv-btns">${sold ? `<button type="button" class="btn-full" onclick="qvClose();openStockAlert('${p.id}')">${notifyLabel(p.id)}</button>` : `<button type="button" class="btn-full" onclick="qvClose();addToCart('${p.id}')">Add to bag</button>`}<button type="button" class="btn-outline" onclick="openProductDetail('${p.id}')">View full details</button><button type="button" class="qv-fav ${fav ? 'active' : ''}" aria-label="Toggle favourite" aria-pressed="${fav}" onclick="toggleFavourite('${p.id}', event);qvRedraw()">${fav ? '♥' : '♡'} Wishlist</button></div></div>`;
}
function qvRedraw() { const p = db.products.find(x => x.id === QV.id), el = document.getElementById('quickView'); if (p && el && el.classList.contains('active')) el.innerHTML = `<div class="qv-box">${qvHTML(p)}</div>`; }
function qvOpen(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); } const p = db.products.find(x => x.id === id); if (!p) return;
  QV.id = id; QV.i = 0; QV.from = document.activeElement; trackHit('view', { p: 'quick' });
  const el = qvEl(); el.innerHTML = `<div class="qv-box">${qvHTML(p)}</div>`; el.classList.add('active'); document.documentElement.classList.add('qv-open');
  const x = el.querySelector('.qv-x'); if (x) x.focus();
}
function qvPick(k) { QV.i = k; qvRedraw(); const t = document.querySelector('#quickView .qv-th button.on'); if (t) t.focus(); }
function qvClose() { const el = document.getElementById('quickView'); if (!el || !el.classList.contains('active')) return; el.classList.remove('active'); el.innerHTML = ''; document.documentElement.classList.remove('qv-open'); try { if (QV.from && document.contains(QV.from)) QV.from.focus(); } catch (e) { /* the button is gone */ } }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (document.documentElement.classList.contains('qv-open')) qvClose(); else if (FDD.open) fddCloseAll(); } });

// ---------- the photo of a category tile changes while the mouse is over it ----------
const TILE_T = new WeakMap(), TILE_SEL = '.category-item,.chap-tile';
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest(TILE_SEL); if (!t || TILE_T.has(t) || !(window.matchMedia && matchMedia('(hover: hover)').matches)) return;
  const img = t.querySelector('img'); if (!img || !t.dataset.cat) return; const cur = img.getAttribute('src');
  const pics = sareeList().filter(p => p.category === t.dataset.cat && p.stock > 0).flatMap(pcPics).filter((u, k, a) => u !== cur && a.indexOf(u) === k).slice(0, 8); if (!pics.length) return;
  let i = 0; const step = () => { img.classList.remove('swap'); void img.offsetWidth; img.src = pics[i++ % pics.length]; img.classList.add('swap'); };
  step(); TILE_T.set(t, { timer: setInterval(step, 1200), img, cur });
});
document.addEventListener('mouseout', e => {
  const t = e.target.closest && e.target.closest(TILE_SEL); if (!t || !TILE_T.has(t) || t.contains(e.relatedTarget)) return;
  const s = TILE_T.get(t); clearInterval(s.timer); s.img.classList.remove('swap'); s.img.src = s.cur; TILE_T.delete(t);
});

// ---------- Follow us ----------
const FB_DEFAULT = 'https://www.facebook.com/profile.php?id=100086623513019';
const followCfg = () => ({ show: true, facebook: FB_DEFAULT, instagram: '', ...((db.home && db.home.follow) || {}) });
function followLinks() {
  const f = followCfg(), out = []; if (f.show === false) return out;
  const fb = String(f.facebook || '').trim(); if (/^https:\/\/(www\.|m\.)?(facebook\.com|fb\.com|fb\.me)\//i.test(fb)) out.push({ k: 'facebook', label: 'Facebook', href: fb });
  let ig = String(f.instagram || '').trim().replace(/^@/, ''); const m = ig.match(/^https:\/\/(www\.)?instagram\.com\/([A-Za-z0-9._]+)/i); if (m) ig = m[2];
  if (/^[A-Za-z0-9._]{2,30}$/.test(ig)) out.push({ k: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' + ig + '/' });
  return out;
}
const FOLLOW_SVG = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V7c0-.8.2-1.2 1.3-1.2H17V3h-2.4C12 3 10.8 4.5 10.8 6.8v1.7H9v2.9h1.8V21H14v-9.6h2.4L17 8.5Z" fill="currentColor"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="7" r="1.1" fill="currentColor"/></svg>'
};
function renderFollow() {
  const el = document.getElementById('followUs'); if (!el) return; const L = followLinks();
  el.style.display = L.length ? '' : 'none';
  el.innerHTML = L.length ? `<span class="follow-t">Follow us</span>${L.map(l => `<a class="follow-a ${l.k}" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer" aria-label="${l.label} (opens in a new tab)">${FOLLOW_SVG[l.k]}<span>${l.label}</span></a>`).join('')}` : '';
}
// admin: Home page → Follow us
function followSet(k, v) { if (!db.home.follow) db.home.follow = {}; if (k === 'show') db.home.follow.show = db.home.follow.show === false; else db.home.follow[k] = String(v || '').replace(/[<>"\s]/g, '').slice(0, 200); renderFollow(); homeSaveSoon(); if (k === 'show') { const c = el_('adminContent'); if (c) renderHomeAdmin(c); } }
function followCardHTML() {
  const f = followCfg(), tog = `<div class="toggle ${f.show !== false ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${f.show !== false}" onclick="followSet('show')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></div>`;
  return `<div class="admin-card" id="follow-card"><h3 style="margin:0 0 4px">🔗 Follow us (bottom of every page)</h3><p class="note" style="margin:0 0 10px">The Facebook and Instagram buttons shown at the bottom of the website. Paste the link of your page. For Instagram you can also type just the name, like <b>anithapemmasani</b>. Leave a box empty to hide that button.</p>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><b>Show the buttons</b>${tog}</div>
    <label class="note" for="fol-fb">Facebook page link</label><input id="fol-fb" type="url" value="${esc(f.facebook)}" placeholder="https://www.facebook.com/…" onchange="followSet('facebook',this.value)" style="width:100%;min-height:44px;margin-bottom:10px;box-sizing:border-box;padding:0 10px">
    <label class="note" for="fol-ig">Instagram name or link</label><input id="fol-ig" type="text" value="${esc(f.instagram)}" placeholder="yourname  or  https://www.instagram.com/yourname" onchange="followSet('instagram',this.value)" style="width:100%;min-height:44px;box-sizing:border-box;padding:0 10px">
    ${f.instagram ? '' : '<p class="note" style="margin:8px 0 0;color:#8a4b0f">The Instagram button is hidden until you type your Instagram name here.</p>'}</div>`;
}

// ---------- the starter demo sarees (admin) ----------
// They carry stock-photo links and exist only to show how the shop looks. The server never sends them to customers; this lets the owner see them and remove them in one press.
const isSampleProd = p => !!p && /^p\d{1,2}$/.test(String(p.id)) && (() => { const u = [p.image, ...(p.images || [])].filter(Boolean); return u.length > 0 && u.every(x => /^https:\/\/images\.unsplash\.com\//.test(String(x))); })();
function sampleNoticeHTML() {
  const n = db.products.filter(isSampleProd).length; if (!n) return '';
  return `<div class="admin-card" id="sample-note" style="border:2px solid #C96A11;margin-bottom:14px"><h3 style="margin:0 0 4px">🧵 ${n} sample ${n === 1 ? 'saree' : 'sarees'} (demo photos)</h3><p class="note" style="margin:0 0 10px">These came with the app only to show how the shop looks. <b>Customers do not see them</b> and the WhatsApp assistant never offers them. Remove them when you are ready to post your own sarees.</p><button type="button" class="btn-sm btn-primary-sm" onclick="removeSamples()">Remove the ${n} sample ${n === 1 ? 'saree' : 'sarees'}</button></div>`;
}
function removeSamples() {
  const ids = db.products.filter(isSampleProd).map(p => p.id); if (!ids.length) return; if (!confirm(`Remove ${ids.length} sample sarees? Your own sarees are not touched.`)) return;
  db.products = db.products.filter(p => !ids.includes(p.id)); db.stockAlerts.forEach(a => { if (ids.includes(a.productId) && a.status === 'waiting') a.status = 'cancelled'; });
  cart = cart.filter(c => !ids.includes(c.id)); favourites = favourites.filter(f => !ids.includes(f)); saveCart(); saveFavs();
  saveDB(); renderAdminContent('products'); renderProducts(); buildScrollTrack(); updateBadges(); updateFavBadge(); showToast('Sample sarees removed', 'success');
}
