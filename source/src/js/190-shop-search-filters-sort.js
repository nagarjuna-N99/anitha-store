// ================= SHOP SEARCH, FILTERS & SORT =================
const isAccessory = p => !!p && (db.accessoryCategories || []).includes(p.category);
const sareeList = () => db.products.filter(p => !isAccessory(p));
const accOn = () => !(db.settings && db.settings.showAccessories === false);   // the owner can hide accessories from the website (Categories tab)
const accessoryList = () => accOn() ? db.products.filter(isAccessory) : [];
const SHOP_PAGE = 24;
const SHOP = { shown: SHOP_PAGE, sig: '', kind: 'saree', occasion: '', q: '', sort: 'featured', fabrics: [], colours: [], min: '', max: '', inStock: false, open: false };
const FABRIC_BY_CAT = { 'Tussar': 'Tussar Silk', 'Maheswari': 'Silk Cotton', 'Banarasi': 'Banarasi Silk', 'Kanjeevaram': 'Kanjeevaram Silk', 'Paithani': 'Paithani Silk', 'Mysore Silk': 'Crepe Silk', 'Ponduru Khadi': 'Khadi Cotton', 'Organza': 'Organza', 'Chanderi': 'Chanderi Silk Cotton', 'Bhagalpuri': 'Bhagalpuri Silk' };
const FABRIC_SUGGEST = ['Pure Silk', 'Silk Cotton', 'Cotton', 'Khadi Cotton', 'Tussar Silk', 'Banarasi Silk', 'Kanjeevaram Silk', 'Paithani Silk', 'Crepe Silk', 'Organza', 'Georgette', 'Linen'];
const STOP_WORDS = new Set(['saree', 'sarees', 'sari', 'saris', 'the', 'a', 'for', 'in', 'and', 'with', 'of']);
const SYN = { kanchipuram: 'kanjeevaram', kanchi: 'kanjeevaram', kancheepuram: 'kanjeevaram', conjeevaram: 'kanjeevaram', kanjivaram: 'kanjeevaram', kanjeevaram: 'kanjeevaram', benarasi: 'banarasi', banarsi: 'banarasi', varanasi: 'banarasi', banaras: 'banarasi', maheshwari: 'maheswari', maheshwar: 'maheswari', tassar: 'tussar', tasar: 'tussar', tusser: 'tussar', paithni: 'paithani', mysoor: 'mysore', pattu: 'silk', khaadi: 'khadi' };
function guessColours(name) {
  const n = ' ' + String(name || '').toLowerCase().replace(/[^a-z ]/g, ' ') + ' ';
  return COLOR_NAMES.map(c => c[0]).filter(c => n.includes(' ' + c.toLowerCase() + ' '));
}
const colourCss = name => { const c = COLOR_NAMES.find(x => x[0] === name); return c ? `rgb(${c[1]},${c[2]},${c[3]})` : '#ccc'; };
function lev(a, b) {
  if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function tokenise(q) { return String(q || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\- ]/g, ' ').split(/\s+/).filter(t => t && !STOP_WORDS.has(t)).map(t => SYN[t] || t); }
function fieldScore(text, term) {
  const t = String(text || '').toLowerCase(); if (t.includes(term)) return 2;
  if (term.length >= 5) for (const w of t.split(/[^a-z0-9]+/)) if (w && Math.abs(w.length - term.length) <= 2 && lev(term, w) <= (term.length >= 8 ? 2 : 1)) return 1;
  return 0;
}
function searchScore(p, terms) {
  let total = 0;
  for (const term of terms) {
    const s = Math.max(fieldScore(p.name, term) * 5, fieldScore(p.sku, term) * 5, fieldScore(p.category, term) * 3, fieldScore(p.fabric, term) * 3, fieldScore((p.colours || []).join(' '), term) * 3, fieldScore((p.tags || []).join(' '), term) * 2, fieldScore(p.description, term));
    if (!s) return 0; total += s;
  }
  return total;
}
const shopCats = () => SHOP.kind === 'accessory' ? db.accessoryCategories : db.categories;
const kindProducts = () => SHOP.kind === 'accessory' ? accessoryList() : sareeList();
function categoryProducts() { return currentCategory === 'all' ? kindProducts() : kindProducts().filter(p => p.category === currentCategory); }
const kindWord = n => SHOP.kind === 'accessory' ? (n === 1 ? 'accessory' : 'accessories') : (n === 1 ? 'saree' : 'sarees');
function shopMore() { SHOP.shown += SHOP_PAGE; const y = window.scrollY; renderProducts(); window.scrollTo(0, y); }
function shopKind(k) { if (k === 'accessory' && !accOn()) k = 'saree'; if (SHOP.kind === k) return; SHOP.kind = k; SHOP.occasion = ''; currentCategory = 'all'; SHOP.fabrics = []; SHOP.colours = []; SHOP.min = ''; SHOP.max = ''; shopSearch('', true); renderProducts(); if (SHOP.open) renderShopPanel(); const q = document.getElementById('shop-q'); if (q) { q.placeholder = k === 'accessory' ? 'Search accessories - try "jhumka", "bangles", "blouse"' : 'Search sarees - try "kanchipuram", "red silk", "wedding"'; q.setAttribute('aria-label', 'Search ' + kindWord(2)); } }
function visibleProducts() {
  let list = categoryProducts().slice(); const terms = tokenise(SHOP.q), scores = new Map();
  if (terms.length) list = list.filter(p => { const s = searchScore(p, terms); scores.set(p.id, s); return s > 0; });
  if (SHOP.occasion) list = list.filter(p => occasionsOf(p).includes(SHOP.occasion));
  if (SHOP.fabrics.length) list = list.filter(p => SHOP.fabrics.includes(p.fabric));
  if (SHOP.colours.length) list = list.filter(p => (p.colours || []).some(c => SHOP.colours.includes(c)));
  const min = parseInt(SHOP.min, 10), max = parseInt(SHOP.max, 10);
  if (!isNaN(min)) list = list.filter(p => p.price >= min);
  if (!isNaN(max)) list = list.filter(p => p.price <= max);
  if (SHOP.inStock) list = list.filter(p => p.stock > 0);
  let sort = SHOP.sort; if (terms.length && sort === 'featured') sort = 'relevance'; if (!terms.length && sort === 'relevance') sort = 'featured';
  const idx = new Map(db.products.map((p, i) => [p.id, i]));
  const cmp = {
    relevance: (a, b) => scores.get(b.id) - scores.get(a.id) || idx.get(a.id) - idx.get(b.id),
    featured: (a, b) => (b.stock > 0) - (a.stock > 0) || idx.get(a.id) - idx.get(b.id),
    new: (a, b) => idx.get(b.id) - idx.get(a.id),
    'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name), rating: (a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0)
  }[sort] || (() => 0);
  return list.sort(cmp);
}
const shopFilterCount = () => (SHOP.occasion ? 1 : 0) + SHOP.fabrics.length + SHOP.colours.length + (SHOP.min !== '' || SHOP.max !== '' ? 1 : 0) + (SHOP.inStock ? 1 : 0);
function initShopToolbar() {
  const nsb = document.getElementById('navSearch'); if (nsb) nsb.innerHTML = `<div class="shop-search"><span aria-hidden="true">🔍</span><input id="shop-q" type="search" placeholder="Search sarees — try “kanchipuram”, “red silk”, “wedding”" oninput="shopSearch(this.value)" onkeydown="if(event.key==='Enter'){closeNavSearch();}" aria-label="Search sarees" autocomplete="off"><button type="button" class="shop-q-clear" id="shop-q-clear" aria-label="Clear search" onclick="shopSearch('',true)" style="display:none;">×</button></div><button type="button" class="nav-search-close" aria-label="Close search" onclick="closeNavSearch()">Close</button>`;
  const box = document.getElementById('shopToolbar'); if (!box) return;
  box.innerHTML = `<div class="shop-bar"><button type="button" class="btn-filters" id="shop-filter-btn" onclick="shopTogglePanel()" aria-expanded="false">Filter &amp; sort <span class="fcount" id="shop-fcount"></span></button></div>
    <div class="shop-panel" id="shop-panel"><div class="shop-sortrow"><label for="shop-sort">Sort by</label><select id="shop-sort" onchange="shopSort(this.value)" aria-label="Sort sarees"><option value="featured">Featured</option><option value="new">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name A–Z</option><option value="rating">Top rated</option></select></div><div id="shop-panel-body"></div></div>
    <div class="shop-meta"><div id="shop-active" class="chips"></div></div>`;}
function renderShopPanel() {
  const body = document.getElementById('shop-panel-body'); if (!body) return;
  const prods = categoryProducts().length ? categoryProducts() : kindProducts(), count = (arr, key) => { const m = {}; arr.forEach(v => { m[v] = (m[v] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
  const fabrics = count(prods.map(p => p.fabric).filter(Boolean)), colours = count(prods.flatMap(p => p.colours || []));
  const prices = prods.map(p => p.price), lo = prices.length ? Math.min(...prices) : 0, hi = prices.length ? Math.max(...prices) : 0;
  body.innerHTML = `<div class="shop-groups">
    <div><h5>Fabric</h5>${fabrics.length ? fabrics.map(([f, n]) => `<label class="chk-line"><input type="checkbox" ${SHOP.fabrics.includes(f) ? 'checked' : ''} data-v="${esc(f)}" onchange="shopToggle('fabrics',this.dataset.v)"> ${esc(f)} <small>(${n})</small></label>`).join('') : '<p class="note">No fabric set on products yet.</p>'}</div>
    <div><h5>Colour</h5><div class="swatches">${colours.length ? colours.map(([c, n]) => `<button type="button" class="swatch ${SHOP.colours.includes(c) ? 'on' : ''}" data-v="${esc(c)}" style="background:${colourCss(c)}" title="${esc(c)} (${n})" aria-label="${esc(c)} (${n})" aria-pressed="${SHOP.colours.includes(c)}" onclick="shopToggle('colours',this.dataset.v,this)"></button>`).join('') : '<p class="note">No colours set on products yet.</p>'}</div></div>
    <div><h5>Price (₹)</h5><div class="price-row"><input id="shop-min" type="number" min="0" placeholder="${lo}" value="${esc(SHOP.min)}" onchange="shopPrice()" aria-label="Minimum price"><span>to</span><input id="shop-max" type="number" min="0" placeholder="${hi}" value="${esc(SHOP.max)}" onchange="shopPrice()" aria-label="Maximum price"></div>
      <div class="presets"><button type="button" onclick="shopPreset('',20000)">Under ₹20,000</button><button type="button" onclick="shopPreset(20000,50000)">₹20,000 – ₹50,000</button><button type="button" onclick="shopPreset(50000,'')">Above ₹50,000</button></div>
      <h5 style="margin-top:16px;">Availability</h5><label class="chk-line"><input type="checkbox" id="shop-stock" ${SHOP.inStock ? 'checked' : ''} onchange="shopStock(this.checked)"> In stock only</label></div></div>
    <div style="text-align:right;margin-top:8px;"><button type="button" class="linkbtn" onclick="shopClearAll()">Clear all filters</button></div>`;
}
function shopMeta(n, total) {
  const c = document.getElementById('shop-count'); if (!c) return;
  const f = shopFilterCount() + (SHOP.q.trim() ? 1 : 0);
  c.textContent = f ? `Showing ${n} of ${total} ${kindWord(total)}` : `${total} ${kindWord(total)}`;
  const fc = document.getElementById('shop-fcount'); if (fc) { fc.textContent = shopFilterCount() ? shopFilterCount() : ''; fc.style.display = shopFilterCount() ? 'inline-block' : 'none'; }
  const sort = document.getElementById('shop-sort'); if (sort) { sort.options[0].text = SHOP.q.trim() ? 'Best match' : 'Featured'; if (sort.value !== SHOP.sort) sort.value = SHOP.sort; }
  const chips = [];
  if (SHOP.q.trim()) chips.push(['q', '', `“${SHOP.q.trim()}”`]);
  if (SHOP.occasion) chips.push(['occasion', '', (OCCASIONS.find(o => o[0] === SHOP.occasion) || [0, 0, SHOP.occasion])[2]]);
  SHOP.fabrics.forEach(v => chips.push(['fabrics', v, v])); SHOP.colours.forEach(v => chips.push(['colours', v, v]));
  if (SHOP.min !== '' || SHOP.max !== '') chips.push(['price', '', `₹${SHOP.min !== '' ? money(SHOP.min) : '0'} – ${SHOP.max !== '' ? '₹' + money(SHOP.max) : 'any'}`]);
  if (SHOP.inStock) chips.push(['stock', '', 'In stock']);
  document.getElementById('shop-active').innerHTML = (chips.length ? '<span class="flabel">Filtered</span>' : '') + chips.map(([k, v, l]) => `<span class="chip">${esc(l)}<button type="button" data-k="${k}" data-v="${esc(v)}" onclick="shopRemove(this.dataset.k,this.dataset.v)" aria-label="Remove filter ${esc(l)}">×</button></span>`).join('') + (chips.length > 1 ? `<button type="button" class="linkbtn" onclick="shopClearAll()">Clear all</button>` : '');
}
function shopEmptyHTML() {
  const filtered = shopFilterCount() || SHOP.q.trim();
  return `<div class="fav-empty" style="grid-column:1/-1;"><h2>${filtered ? 'No ' + kindWord(2) + ' match your search' : 'No products in this category yet'}</h2>${filtered ? `<p>Try fewer filters or a different word.</p><button class="btn-primary" style="margin-top:14px;background:var(--charcoal);color:var(--ivory);" onclick="shopClearAll()">Clear search &amp; filters</button>` : ''}</div>`;
}
let SHOP_T = null;
function shopSearch(v, now) { if (v && !document.getElementById('page-shop').classList.contains('active')) navigateTo('shop'); SHOP.q = v; const i = document.getElementById('shop-q'); if (now && i) i.value = v; document.getElementById('shop-q-clear').style.display = v ? '' : 'none'; clearTimeout(SHOP_T); SHOP_T = setTimeout(renderProducts, now ? 0 : 120); }
function shopSort(v) { SHOP.sort = v; renderProducts(); }
function shopTogglePanel() { SHOP.open = !SHOP.open; document.getElementById('shop-panel').classList.toggle('open', SHOP.open); document.getElementById('shop-filter-btn').setAttribute('aria-expanded', SHOP.open); if (SHOP.open) renderShopPanel(); }
function shopToggle(kind, val, el) { const a = SHOP[kind], i = a.indexOf(val); if (i >= 0) a.splice(i, 1); else a.push(val); if (el) { el.classList.toggle('on'); el.setAttribute('aria-pressed', i < 0); } renderProducts(); }
function shopPrice() { SHOP.min = document.getElementById('shop-min').value; SHOP.max = document.getElementById('shop-max').value; if (SHOP.min !== '' && SHOP.max !== '' && +SHOP.min > +SHOP.max) { [SHOP.min, SHOP.max] = [SHOP.max, SHOP.min]; document.getElementById('shop-min').value = SHOP.min; document.getElementById('shop-max').value = SHOP.max; } renderProducts(); }
function shopPreset(min, max) { SHOP.min = min === '' ? '' : String(min); SHOP.max = max === '' ? '' : String(max); document.getElementById('shop-min').value = SHOP.min; document.getElementById('shop-max').value = SHOP.max; renderProducts(); }
function shopStock(on) { SHOP.inStock = !!on; renderProducts(); }
function shopRemove(kind, val) {
  if (kind === 'q') { shopSearch('', true); return; }
  if (kind === 'fabrics' || kind === 'colours') SHOP[kind] = SHOP[kind].filter(x => x !== val);
  if (kind === 'occasion') SHOP.occasion = '';
  if (kind === 'price') { SHOP.min = ''; SHOP.max = ''; } if (kind === 'stock') SHOP.inStock = false;
  renderProducts(); if (SHOP.open) renderShopPanel();
}
function shopClearAll() { SHOP.occasion = ''; SHOP.fabrics = []; SHOP.colours = []; SHOP.min = ''; SHOP.max = ''; SHOP.inStock = false; shopSearch('', true); if (SHOP.open) renderShopPanel(); }
function shopResetFilters() { SHOP.sort = 'featured'; shopClearAll(); }
// The one search of the website lives in the top bar on every page: the 🔍 opens a search bar under the header; typing shows the results on the Collection page.
function openNavSearch() { const p = document.getElementById('navSearch'), nv = document.querySelector('nav'); if (!p || !nv) return; p.style.top = Math.round(nv.getBoundingClientRect().bottom) + 'px'; p.hidden = false; setTimeout(() => { const i = document.getElementById('shop-q'); if (i) { i.focus(); i.select(); } }, 30); }
function closeNavSearch() { const p = document.getElementById('navSearch'); if (p) p.hidden = true; }
function shopFocusSearch() { const p = document.getElementById('navSearch'); if (p && !p.hidden) { closeNavSearch(); return; } openNavSearch(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNavSearch(); });
document.addEventListener('click', e => { const p = document.getElementById('navSearch'); if (p && !p.hidden && !p.contains(e.target) && !(e.target.closest && e.target.closest('.nav-icon[aria-label="Search"]'))) closeNavSearch(); });

