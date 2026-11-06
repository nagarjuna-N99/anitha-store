// ================= Product page in the "reference page" pattern (6 Nov 2026) =================
// Top: photos with a counter and a Share button, then chips (Sold out / free shipping / one of a kind), the name, SKU, price and the buttons.
// Then a breadcrumb and one card: The Weave, The Mood, Best For, Caring for, About this piece, and a small facts table.
// To the RIGHT on a computer (below the photos on a phone) sits a list of similar sarees to choose from; for a sold-out saree it reads "Close matches, still available".
// Every sentence comes from the shop's own category facts and the owner's own description: nothing is claimed that the shop did not write.
const REAL_CATEGORIES = ['Mangalgiri', 'Maheswari', 'Ponduru Khadi', 'Fancy/Cocktail', 'Georgettes', 'Benaras', 'Kanjeevaram', 'Gadwals', 'Mysore Silk', 'Patola', 'Narayanpet'];
Object.assign(CAT_KB, {
  'Mangalgiri': { fabric: 'Mangalgiri handloom cotton', origin: 'Mangalagiri in Andhra Pradesh', note: 'a crisp, breathable cotton with the classic border and a firm hand-feel that softens with wear', occ: ['Office', 'Casual', 'Festive', 'Everyday'], care: 'Hand wash in cold water with a mild detergent. Starch lightly and iron on the reverse for the crisp look.', kw: ['Mangalgiri Saree', 'Mangalagiri Cotton Saree', 'Handloom Cotton Saree'], silk: false },
  'Fancy/Cocktail': { fabric: 'contemporary party-wear fabrics', origin: 'our curated designers and weaving partners', note: 'a modern drape with shimmer, embellishment or fusion detailing', occ: ['Party', 'Cocktail', 'Reception', 'Gifting'], care: 'Dry clean only. Store folded with tissue paper and keep sharp jewellery away from embellished areas.', kw: ['Cocktail Saree', 'Fancy Saree', 'Party Wear Saree'], silk: false },
  'Georgettes': { fabric: 'georgette', origin: "India's textile centres", note: 'a light, flowing fall that drapes softly and travels well', occ: ['Party', 'Office', 'Festive', 'Reception'], care: 'Dry clean recommended. If washing, use cold water and dry in shade.', kw: ['Georgette Saree', 'Party Wear Georgette Saree'], silk: false },
  'Benaras': { fabric: 'Benaras silk', origin: 'the looms of Varanasi', note: 'rich zari brocade work with intricate woven motifs', occ: ['Wedding', 'Festive', 'Bridal', 'Party'], care: 'Dry clean only. Store folded in muslin and refold every few months.', kw: ['Benaras Saree', 'Banarasi Silk Saree', 'Zari Saree'], silk: true },
  'Gadwals': { fabric: 'Gadwal cotton-silk', origin: 'Gadwal in Telangana', note: 'a light cotton body joined to a silk border and a zari pallu', occ: ['Festive', 'Office', 'Wedding', 'Temple Wear'], care: 'Dry clean the first time. Later, hand wash gently in cold water and dry in shade.', kw: ['Gadwal Saree', 'Gadwal Silk Saree', 'Gadwal Cotton Saree'], silk: true },
  'Patola': { fabric: 'Patola silk (double ikat)', origin: 'Gujarat', note: 'bold geometric ikat patterns woven so the design shows on both sides', occ: ['Wedding', 'Festive', 'Bridal', 'Traditional'], care: 'Dry clean only. Store folded in muslin, away from direct sunlight.', kw: ['Patola Saree', 'Patola Silk Saree', 'Ikat Saree'], silk: true },
  'Narayanpet': { fabric: 'Narayanpet cotton and silk-cotton', origin: 'Narayanpet in Telangana', note: 'light handloom cotton with temple-style borders and a contrast pallu', occ: ['Casual', 'Office', 'Festive', 'Everyday'], care: 'Hand wash gently in cold water and dry in shade to protect the colours.', kw: ['Narayanpet Saree', 'Narayanpet Cotton Saree', 'Temple Border Saree'], silk: false },
});
Object.assign(FABRIC_BY_CAT, { 'Mangalgiri': 'Handloom Cotton', 'Fancy/Cocktail': 'Fancy Fabric', 'Georgettes': 'Georgette', 'Benaras': 'Benaras Silk', 'Gadwals': 'Cotton Silk', 'Patola': 'Patola Silk', 'Narayanpet': 'Cotton Silk' });
[['MNG', 'Mangalgiri'], ['FNC', 'Fancy/Cocktail'], ['GEO', 'Georgettes'], ['BEN', 'Benaras'], ['GAD', 'Gadwals'], ['PTL', 'Patola'], ['NRP', 'Narayanpet']].forEach(r => { if (!SKU_CATEGORIES.some(x => x[1] === r[1])) SKU_CATEGORIES.push(r); });
const CAT_MOOD = { 'Mangalgiri': 'Crisp and everyday: easy to wear all day.', 'Maheswari': 'Light and graceful: quiet elegance.', 'Ponduru Khadi': 'Natural and soft: handspun comfort.', 'Fancy/Cocktail': 'Bold and modern: made for the evening.', 'Georgettes': 'Flowy and light: effortless movement.', 'Benaras': 'Rich and regal: brocade with a story.', 'Kanjeevaram': 'Timeless and heirloom: made to be passed on.', 'Gadwals': 'Light with a rich border: everyday festive.', 'Mysore Silk': 'Smooth and elegant: polished simplicity.', 'Patola': 'Graphic and collectible: a bold ikat statement.', 'Narayanpet': 'Warm and classic: simple temple borders.' };
const ppMood = p => CAT_MOOD[p.category] || 'Hand-picked by us: one of a kind.';
const ppCatJs = c => String(c || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
function ppBreadcrumb(p) { return `<div class="pp-crumbs" role="navigation" aria-label="Breadcrumb"><a onclick="closeModal('productModal');navigateTo('home')">Home</a><span aria-hidden="true">/</span><a onclick="closeModal('productModal');navigateTo('shop')">The Collection</a>${p.category ? `<span aria-hidden="true">/</span><a onclick="closeModal('productModal');filterAndShowShop('${esc(ppCatJs(p.category))}')">${esc(p.category)}</a>` : ''}</div>`; }
function ppChips(p) {
  const c = []; if (!(p.stock > 0)) c.push('Sold out'); else if (typeof oneOfAKind === 'function' && oneOfAKind(p)) c.push('One of a kind'); else if (p.stock <= 2) c.push(`Only ${p.stock} left`);
  if (p.price && p.price > SHIP_FREE_ABOVE) c.push('Free shipping');
  return c.length ? `<div class="pp-chips">${c.map(x => `<span class="pp-chip ${x === 'Sold out' ? 'out' : ''}">${esc(x)}</span>`).join('')}</div>` : '';
}
function ppStoryCard(p, inStock) {
  const kb = kbFor(p.category), acc = isAccessory(p), cat = p.category || 'this saree';
  const occ = [...new Set([...(p.occasions || []), ...((kb && kb.occ) || [])].map(x => String(x)))].slice(0, 5);
  if (acc) return `<section class="pp-story" aria-label="About this piece"><h4>About this piece</h4><p class="detail-desc">${esc(p.description || 'No description yet.')}</p>${tagChips(p.tags)}${detailsTableHTML(p, inStock)}</section>`;
  return `<section class="pp-story" aria-label="About this saree">
    <h4>The Weave</h4><p>${esc(capFirst(kb.fabric))} from ${esc(kb.origin)}: ${esc(kb.note)}.</p>
    <h4>The Mood</h4><p>${esc(ppMood(p))}</p>
    ${occ.length ? `<h4>Best For</h4><div class="chips">${occ.map(o => `<span class="chip ro">${esc(o)}</span>`).join('')}</div>` : ''}
    <h4>Caring for ${esc(cat)}</h4><p>${esc(kb.care || 'Dry clean recommended.')}</p>
    <h4>About this piece</h4><p class="detail-desc">${esc(p.description || 'No description yet.')}</p>${tagChips(p.tags)}
    ${detailsTableHTML(p, inStock)}</section>`;
}
// the right-hand list (computer) / row under the photos (phone)
function ppSimilarHTML(p) {
  const sold = !(p.stock > 0), list = relatedList(p, 12).filter(x => !sold || x.stock > 0).slice(0, 6); if (!list.length) return '';
  const card = x => `<a class="rel-card" role="link" tabindex="0" onclick="openProductDetail('${x.id}')" onkeydown="if(event.key==='Enter')openProductDetail('${x.id}')"><div class="rel-img">${safeImg(x.image) ? `<img src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy">` : ''}${x.stock === 0 ? '<span class="rel-tag">Sold out</span>' : ''}</div><div class="rel-cat">${esc(x.category)}</div><div class="rel-name">${esc(x.name)}</div><div class="rel-price">${x.price ? '₹ ' + money(x.price) : ''}</div></a>`;
  return `<aside class="pp-similar related" aria-label="${sold ? 'Close matches' : 'Similar sarees'}"><h3>${sold ? 'Close matches, <em>still available.</em>' : 'Similar <em>sarees.</em>'}</h3><p class="note">${sold ? 'This one has been claimed. These are its nearest matches you can order today.' : 'More to choose from: tap any one to open it.'}</p><div class="rel-grid">${list.map(card).join('')}</div>${p.category ? `<p class="note" style="margin:10px 0 0"><a onclick="closeModal('productModal');filterAndShowShop('${esc(ppCatJs(p.category))}')">See all ${esc(p.category)} →</a></p>` : ''}${typeof waChatEnabled === 'function' && waChatEnabled() ? `<p class="note" style="margin:6px 0 0"><a href="${esc(waChatLink(p))}" target="_blank" rel="noopener">Not quite it? Chat with us to find it →</a></p>` : ''}</aside>`;
}
function ppLayoutHTML(p) {
  const inStock = p.stock > 0;
  return `<div class="pp-layout"><div class="pp-top">${productPageHTML(p, 'gal-' + p.id, { noStory: true })}</div>${ppSimilarHTML(p)}<div class="pp-rest">${ppBreadcrumb(p)}${ppStoryCard(p, inStock)}${trustHTML()}${productFaqHTML()}${isAccessory(p) ? '' : lookRowHTML([], 'Complete the look')}<section class="reviews" id="rv-root" aria-label="Customer reviews"></section></div></div>${buyBarHTML(p)}`;
}
