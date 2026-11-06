// ================= STOREFRONT LOGIC =================
function stockBadge(p) {
  const s = p.stock === 0 ? 'Sold Out' : oneOfAKind(p) ? 'One of a kind' : p.stock <= 2 ? `Only ${p.stock} Left` : '';
  return s ? `<div class="stock-badge" style="position:absolute;top:15px;left:15px;background:${p.stock === 0 ? 'var(--charcoal)' : 'var(--gold)'};color:white;padding:4px 10px;border-radius:4px;font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">${s}</div>` : '';
}
function productCardHTML(p) {
  const isFav = favourites.includes(p.id);
  return `
  <div class="product-card">
    <div class="product-img-wrap">
      <img src="${esc(p.image)}" alt="${esc(p.altText || p.name)}" loading="lazy" decoding="async">${(videoInfo(p.video) || {}).type ? '<span class="vid-badge">▶ Video</span>' : ''}
      <button class="product-fav-btn ${isFav ? 'active' : ''}" aria-label="Toggle favourite" onclick="toggleFavourite('${p.id}', event)">${isFav ? '♥' : '♡'}</button>
      <button class="product-share-btn" aria-label="Share this saree" title="Share" onclick="openShare('${p.id}', event)">🔗</button>
      ${stockBadge(p)}
    </div>
    <div class="product-body">
      <div class="product-tag">${esc(p.category)}</div>
      <div class="product-name" onclick="openProductDetail('${p.id}')">${esc(p.name)}</div>
      <div class="product-price">₹ ${money(p.price)}</div>
      ${p.reviews > 0 ? `<div class="card-rating">${starsHTML(p.rating)} <small>${p.rating} (${p.reviews})</small></div>` : ''}
      <div class="product-actions">
        <button class="btn-card btn-view" onclick="openProductDetail('${p.id}')">View Details</button>
        ${p.stock === 0 ? `<button class="btn-card btn-notify ${myAlert(p.id) ? 'set' : ''}" onclick="openStockAlert('${p.id}')">${notifyLabel(p.id)}</button>` : `<button class="btn-card btn-cart" onclick="addToCart('${p.id}')">Add to Cart</button>`}
      </div>
    </div>
  </div>`;
}

function buildScrollTrack() {
  const track = document.getElementById('scrollTrack');
  const shown = arrivalsPick();   // automatic (newest in-stock sarees) or the owner's own choice
  const cards = shown.map(p => `
    <div class="scroll-card">
      <img src="${esc(p.image)}" class="scroll-card-img" alt="${esc(p.name)}">
      <div class="scroll-card-body">
        <div class="scroll-card-tag">${esc(p.category)}</div>
        <div class="scroll-card-name">${esc(p.name)}</div>
        <div class="scroll-card-price">₹ ${money(p.price)}</div>
        <div class="scroll-actions">
          <button class="btn-sm-card btn-view-sm" onclick="openProductDetail('${p.id}')">View</button>
          ${p.stock === 0 ? `<button class="btn-sm-card btn-cart-sm" onclick="openStockAlert('${p.id}')" aria-label="Notify me when back in stock" title="Notify me when back in stock">🔔</button>` : `<button class="btn-sm-card btn-cart-sm" onclick="addToCart('${p.id}')">Add</button>`}
          <button class="btn-sm-card btn-fav-sm ${favourites.includes(p.id) ? 'active' : ''}" aria-label="Toggle favourite" onclick="toggleFavourite('${p.id}', event)">♥</button>
          <button class="btn-sm-card btn-share-sm" aria-label="Share this saree" title="Share" onclick="openShare('${p.id}', event)">🔗</button>
        </div>
      </div>
    </div>`).join('');
  track.innerHTML = cards + cards.replace(/class="scroll-card"/g, 'class="scroll-card dup" aria-hidden="true"');
}

function renderFilterButtons() {
  const wrap = document.getElementById('filterContainer');
  const cats = ['all', ...shopCats()];
  if (!accOn() && SHOP.kind === 'accessory') SHOP.kind = 'saree';
  const kt = document.getElementById('kindTabs'); if (kt) kt.style.display = accOn() ? '' : 'none'; if (kt) kt.innerHTML = [['saree', 'Sarees'], ['accessory', 'Accessories']].filter(x => x[0] === 'saree' || accOn()).map(([k, l]) => `<button type="button" role="tab" id="kind-${k}" aria-selected="${SHOP.kind === k}" class="kind-tab ${SHOP.kind === k ? 'active' : ''}" onclick="shopKind('${k}')">${l}</button>`).join('');
  wrap.innerHTML = cats.map(c => `<button class="filter-btn ${c === currentCategory ? 'active' : ''}" data-cat="${esc(c)}" onclick="filterProducts(this.dataset.cat)">${c === 'all' ? 'All' : esc(c)}</button>`).join('');
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (currentCategory !== 'all' && !shopCats().includes(currentCategory)) currentCategory = 'all';
  const list = visibleProducts();
  // long catalogues are drawn 24 at a time: a phone can draw 24 cards instantly, 150 makes typing and scrolling lag
  const sig = [currentCategory, SHOP.kind, SHOP.q, SHOP.sort, SHOP.fabrics.join(), SHOP.colours.join(), SHOP.min, SHOP.max, SHOP.inStock, SHOP.occasion].join('|');
  if (sig !== SHOP.sig) { SHOP.sig = sig; SHOP.shown = SHOP_PAGE; }
  const shown = list.slice(0, SHOP.shown), left = list.length - shown.length;
  grid.innerHTML = list.length ? shown.map(productCardHTML).join('') + (left > 0 ? `<div class="show-more" style="grid-column:1/-1;text-align:center;padding:14px 0 24px;"><button type="button" class="btn-outline" id="shop-more" style="max-width:320px;margin:0 auto;" onclick="shopMore()">Show ${Math.min(left, SHOP_PAGE)} more · ${left} left</button></div>` : '') : shopEmptyHTML();
  if (typeof renderShopBanner === 'function') renderShopBanner();
  document.getElementById('shop-title').textContent = currentCategory === 'all' ? (SHOP.kind === 'accessory' ? 'Accessories' : 'All Sarees') : currentCategory;
  renderFilterButtons();
  shopMeta(list.length, categoryProducts().length);
  if (SHOP.open) { /* panel counts stay in sync with the category */ }
  if (db.home) renderHomeCategories();
  if (typeof renderOccasions === 'function') { renderOccasions(); renderRecentlySold(); renderRecent(); }
}

function renderFavourites() {
  const grid = document.getElementById('favouritesGrid');
  const favProducts = db.products.filter(p => favourites.includes(p.id));
  if (favProducts.length === 0) {
    grid.innerHTML = `<div class="fav-empty" style="grid-column:1/-1;"><h2>Your Favourites List is Empty</h2><p>Click the ♡ heart icon on any product to add it to your favourites.</p><button class="btn-primary" onclick="navigateTo('shop')" style="margin-top:20px;background:var(--charcoal);color:var(--ivory);">Browse Collection</button></div>`;
    return;
  }
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;"><button type="button" class="btn-outline" id="wishShareBtn" style="margin:0;max-width:320px;" onclick="shareWishlist()">💌 Share my wishlist</button></div>` + favProducts.map(productCardHTML).join('');
}

function toggleFavourite(id, e) {
  if (e) e.stopPropagation();
  if (favourites.includes(id)) { favourites = favourites.filter(x => x !== id); showToast('Removed from favourites'); }
  else { favourites.push(id); showToast('Added to favourites ♥', 'success'); }
  saveFavs();
  renderProducts(); renderFavourites(); buildScrollTrack(); updateFavBadge();
}
function updateFavBadge() { document.getElementById('favCount').textContent = favourites.filter(id => db.products.some(p => p.id === id)).length; }

function filterProducts(category) {
  currentCategory = category;
  renderProducts();
}

function openProductDetail(id) {
  const p = db.products.find(x => x.id === id); if (!p) return;
  recentAdd(id); trackHit('view', { p: 'product' }); trackHit('product', { id });
  RV.open = false; RV.draft = null; RV.shown = 5; RV.photosOnly = false; RV.sort = 'new';
  renderProductModal(p);
  document.getElementById('productModal').classList.add('active');
  updateSeo(p);
}

// ---- Cart: only { id, qty } is stored; price/name/image are always read live from the catalogue ----
function cartLines() {
  return cart.map(c => ({ c, p: db.products.find(x => x.id === c.id) })).filter(x => x.p).map(({ c, p }) => ({ ...p, qty: c.qty }));
}
function pruneCart() {
  cart = cart.filter(c => db.products.some(p => p.id === c.id) && c.qty > 0).map(c => ({ id: c.id, qty: c.qty }));
  cart.forEach(c => { const p = db.products.find(x => x.id === c.id); c.qty = Math.min(c.qty, Math.max(p.stock, 0)); });
  cart = cart.filter(c => c.qty > 0);
}
function addToCart(id) {
  const p = db.products.find(x => x.id === id);
  if (!p || p.stock === 0) return; trackHit('cart', { id });
  const existing = cart.find(c => c.id === id);
  if (existing) {
    if (existing.qty >= p.stock) { showToast(`Only ${p.stock} available`, 'error'); openCart(); return; }
    existing.qty++;
  } else cart.push({ id, qty: 1 });
  saveCart(); updateBadges(); openCart(); cartAnim(window.event && window.event.currentTarget && window.event.currentTarget.tagName === 'BUTTON' ? window.event.currentTarget : null);
}
function removeFromCart(id) { cart = cart.filter(c => c.id !== id); saveCart(); updateBadges(); renderCartDrawer(); }
function updateQty(id, delta) {
  const item = cart.find(c => c.id === id); const p = db.products.find(x => x.id === id);
  if (!item || !p) return;
  const next = item.qty + delta;
  if (next <= 0) { removeFromCart(id); return; }
  if (next > p.stock) { showToast(`Only ${p.stock} available`, 'error'); return; }
  item.qty = next; saveCart(); updateBadges(); renderCartDrawer();
}
function openCart() { pruneCart(); saveCart(); updateBadges(); renderCartDrawer(); document.getElementById('cartDrawer').classList.add('active'); document.getElementById('overlay').classList.add('active'); }
function closeAllDrawers() { document.querySelectorAll('.drawer').forEach(d => d.classList.remove('active')); document.getElementById('overlay').classList.remove('active'); }
function updateBadges() {
  const n = cartLines().reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartCount').textContent = n;
  document.getElementById('mobileCartCount').textContent = n;
}
const cartMobile = () => window.matchMedia('(max-width: 640px)').matches;
let CART_WAS_MOBILE = null;
window.addEventListener('resize', () => { const m = cartMobile(); if (CART_WAS_MOBILE !== null && m !== CART_WAS_MOBILE && document.getElementById('cartDrawer').classList.contains('active')) renderCartDrawer(); CART_WAS_MOBILE = m; });
function renderCartDrawer() {
  CART_WAS_MOBILE = cartMobile();
  const body = document.getElementById('cartBody');
  const lines = cartLines();
  if (lines.length === 0) { body.innerHTML = '<div style="text-align:center;padding:40px;color:#6b6862;">Your cart is empty.</div>'; document.getElementById('cartSummary').innerHTML = ''; return; }
  body.innerHTML = lines.map(c => `
    <div class="cart-item">
      <img src="${esc(c.image)}" alt="${esc(c.name)}">
      <div class="item-info">
        <h4>${esc(c.name)}</h4>
        <p>${esc(c.category)}</p>
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
          <button onclick="updateQty('${c.id}',-1)" style="width:24px;height:24px;border:1px solid #ddd;background:white;">-</button>
          <span style="font-size:13px;font-weight:600;">${c.qty}</span>
          <button onclick="updateQty('${c.id}',1)" style="width:24px;height:24px;border:1px solid #ddd;background:white;">+</button>
        </div>
        <div class="price">₹ ${money(c.price * c.qty)}</div>
      </div>
      <button class="item-remove" aria-label="Remove" onclick="removeFromCart('${c.id}')">×</button>
    </div>`).join('');
  if (lines.some(c => !isAccessory(c))) body.insertAdjacentHTML('beforeend', lookRowHTML(lines.map(c => c.id), 'Add an accessory'));
  body.insertAdjacentHTML('beforeend', '<div id="cartDelivM"></div><div id="cartRemRowM"></div>');
  updateCheckoutTotal(); renderCartDeliv(); cartRemRow();
}

const SHIP_FREE_ABOVE = 10000, SHIP_FEE = 199;
function computeTotals() {
  const subtotal = cartLines().reduce((s, c) => s + c.price * c.qty, 0);
  if (appliedCoupon && !db.coupons.some(c => c.code === appliedCoupon.code && c.active)) appliedCoupon = null;
  if (appliedCoupon && couponProblem(appliedCoupon, subtotal, currentUser())) appliedCoupon = null;
  let couponDiscount = 0;
  if (appliedCoupon) couponDiscount = appliedCoupon.type === 'flat' ? appliedCoupon.discount : Math.round(subtotal * appliedCoupon.discount / 100);
  couponDiscount = Math.min(couponDiscount, subtotal);
  const bd = bundleOffer(), bundleDiscount = Math.min(bd.amount, subtotal - couponDiscount), discount = couponDiscount + bundleDiscount;
  const shipping = subtotal === 0 || subtotal > SHIP_FREE_ABOVE ? 0 : SHIP_FEE;
  const giftF = GIFT.on && GIFT.wrap ? giftFee() : 0, total = Math.max(0, subtotal + shipping + giftF - discount);
  return { subtotal, discount, couponDiscount, bundleDiscount, bundleName: bundleDiscount > 0 ? bd.name : '', shipping, giftFee: giftF, total, points: Math.floor(total / 100) };
}
function updateCheckoutTotal() {
  const t = computeTotals();
  const html = `<div class="summary-row"><span>Subtotal</span><span>₹ ${money(t.subtotal)}</span></div><div class="summary-row"><span>Shipping</span><span>${t.shipping === 0 ? 'FREE' : '₹ ' + t.shipping}</span></div>${t.giftFee ? `<div class="summary-row"><span>Gift wrapping</span><span>₹ ${money(t.giftFee)}</span></div>` : ''}${t.couponDiscount > 0 ? `<div class="summary-row discount"><span>Discount (${esc(appliedCoupon.code)})</span><span>- ₹ ${money(t.couponDiscount)}</span></div>` : ''}${t.bundleDiscount > 0 ? `<div class="summary-row discount"><span>Bundle offer (${esc(t.bundleName)})</span><span>- ₹ ${money(t.bundleDiscount)}</span></div>` : ''}<div class="summary-row total"><span>Total</span><span>₹ ${money(t.total)}</span></div>`;
  document.getElementById('cartSummary').innerHTML = html;
  document.getElementById('checkoutSummary').innerHTML = html;
  document.getElementById('loyaltyMsg').textContent = `You will earn ${t.points} Loyalty Points!`;
}
// Same rules the WhatsApp assistant server applies, so a code behaves identically in both places.
const couponUses = code => db.orders.filter(o => o.coupon === code && o.status !== 'cancelled');
function couponProblem(c, subtotal, user) {
  if (c.expiresAt && Date.parse(c.expiresAt + 'T23:59:59+05:30') < Date.now()) return 'This code has expired';
  if (c.channel === 'whatsapp') return 'This code works only on WhatsApp orders';
  if (c.minOrder && subtotal < c.minOrder) return `Minimum order ₹${money(c.minOrder)} (add ₹${money(c.minOrder - subtotal)} more)`;
  const uses = couponUses(c.code);
  if (c.maxUses && uses.length >= c.maxUses) return 'This code has been fully used';
  const d10 = x => String(x || '').replace(/\D/g, '').slice(-10);
  if (user && c.oncePerCustomer && uses.some(o => d10(o.phone) === d10(user.phone))) return 'You have already used this code';
  if (user && c.firstOrderOnly && db.orders.some(o => d10(o.phone) === d10(user.phone) && o.status !== 'cancelled')) return 'This code is for first orders only';
  return '';
}
function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  const msg = document.getElementById('couponMsg');
  const coupon = db.coupons.find(c => c.code === code && c.active), bad = coupon && couponProblem(coupon, cartLines().reduce((s, l) => s + l.price * l.qty, 0), currentUser());
  if (bad) { appliedCoupon = null; msg.innerHTML = `<span class="coupon-error">✗ ${esc(bad)}</span>`; }
  else if (coupon) { appliedCoupon = coupon; msg.innerHTML = `<span class="coupon-success">✓ ${esc(coupon.description)} applied!</span>`; }
  else { appliedCoupon = null; msg.innerHTML = `<span class="coupon-error">✗ Invalid coupon</span>`; }
  updateCheckoutTotal();
}
