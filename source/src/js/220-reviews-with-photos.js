// ================= REVIEWS WITH PHOTOS =================
const RV = { pid: null, sort: 'new', photosOnly: false, shown: 5, open: false, draft: null };
const reviewsFor = (pid, status = 'approved') => db.reviews.filter(r => r.productId === pid && (!status || r.status === status));
const starsHTML = n => { const k = Math.round(n || 0); return `<span class="stars" role="img" aria-label="${n} out of 5 stars">${'★'.repeat(k)}${'☆'.repeat(5 - k)}</span>`; };
function recalcRatings() {
  let ch = false;
  db.products.forEach(p => { const rs = reviewsFor(p.id), n = rs.length, avg = n ? Math.round(rs.reduce((s, r) => s + r.rating, 0) / n * 10) / 10 : 0; if (p.reviews !== n || p.rating !== avg) { p.reviews = n; p.rating = avg; ch = true; } });
  return ch;
}
function canReview(u, pid) { return !!u && db.orders.some(o => o.userId === u.id && o.status === 'delivered' && o.items.some(i => i.productId === pid)); }
const displayName = u => { const parts = String(u.name || '').trim().split(/\s+/).filter(Boolean); return parts.length ? parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '') : 'Customer'; };
// "Complete the look": in-stock accessories shown beside a saree (product page and cart)
function lookRowHTML(skipIds, title) {
  const list = accessoryList().filter(a => a.stock > 0 && !skipIds.includes(a.id)).slice(0, 4);
  if (!list.length) return '';
  return `<section class="look-row" aria-label="${esc(title)}" style="margin:18px 0;"><h4 style="font-family:'Cormorant Garamond',serif;font-size:20px;margin-bottom:10px;">${esc(title)}</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">${list.map(a => `<div class="look-card" style="border:1px solid #eee;border-radius:6px;padding:8px;background:#fff;text-align:center;"><img src="${esc(a.image)}" alt="${esc(a.name)}" loading="lazy" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="openProductDetail('${a.id}')"><div style="font-size:12px;margin:6px 0 2px;">${esc(a.name)}</div><div style="font-size:12px;font-weight:600;">₹ ${money(a.price)}</div><button type="button" class="btn-sm btn-primary-sm look-add" style="margin-top:6px;width:100%;" onclick="addToCart('${a.id}')">Add</button></div>`).join('')}</div></section>`;
}
function renderProductModal(p) {
  document.getElementById('productModalBody').innerHTML = productPageHTML(p, 'gal-' + p.id) + (isAccessory(p) ? '' : lookRowHTML([], 'Complete the look')) + `<section class="reviews" id="rv-root" aria-label="Customer reviews"></section>`;
  CUR_PID = p.id; renderReviews();
}
function renderReviews() {
  const root = document.getElementById('rv-root'); if (!root) return;
  const p = db.products.find(x => x.id === CUR_PID); if (!p) return; const u = currentUser();
  const all = reviewsFor(p.id), mine = u ? db.reviews.filter(r => r.productId === p.id && r.userId === u.id) : [], myOther = mine.filter(r => r.status !== 'approved');
  const avg = all.length ? Math.round(all.reduce((s, r) => s + r.rating, 0) / all.length * 10) / 10 : 0, bars = [5, 4, 3, 2, 1].map(n => [n, all.filter(r => r.rating === n).length]);
  let list = all.slice(); if (RV.photosOnly) list = list.filter(r => r.photos.length);
  list.sort(RV.sort === 'high' ? (a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt) : RV.sort === 'low' ? (a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt) : (a, b) => b.createdAt.localeCompare(a.createdAt));
  const eligible = canReview(u, p.id), hasMine = mine.length > 0;
  const cta = hasMine ? '' : !u ? `<button class="btn-outline" style="margin:0;" onclick="rvStart()">✍ Write a review</button><div class="note">Sign in with WhatsApp. Only customers who have received this saree can review it.</div>` : eligible ? (RV.open ? '' : `<button class="btn-outline" style="margin:0;" onclick="rvStart()">✍ Write a review</button>`) : `<div class="note">Only customers who have received this saree can review it.</div>`;
  const reviewHTML = (r, own) => `<article class="rv-item"><div class="rv-head"><div class="rv-av">${esc((r.name || '?')[0].toUpperCase())}</div><div><strong>${esc(r.name)}</strong> <span class="rv-ver">✓ Verified purchase</span><div>${starsHTML(r.rating)} <span class="rv-date">${esc(fmtDate(r.createdAt))}</span></div></div>${own ? `<span style="flex:1"></span>${r.status !== 'approved' ? `<span class="cchip ${r.status === 'rejected' ? 'bad' : ''}">${r.status === 'pending' ? 'Pending approval — only you can see this' : 'Not published'}</span>` : ''}<button class="linkbtn" onclick="rvDelete('${r.id}')">Delete</button>` : ''}</div>${r.title ? `<div class="rv-title">${esc(r.title)}</div>` : ''}<p class="rv-text">${esc(r.text)}</p>${r.photos.length ? `<div class="rv-photos">${r.photos.map((s, i) => `<img class="rv-ph" src="${esc(s)}" alt="Photo ${i + 1} from ${esc(r.name)}'s review" loading="lazy" onclick="openLightbox('${r.id}',${i})">`).join('')}</div>` : ''}${r.reply && r.status === 'approved' ? `<div class="rv-reply"><strong>Reply from ${esc(BRAND())}</strong><p>${esc(r.reply)}</p></div>` : ''}</article>`;
  const d = RV.draft;
  const form = RV.open && eligible && !hasMine && d ? `<div class="rv-form"><h4>Your review of ${esc(p.name)}</h4>
    <div class="rv-stars-in" id="rv-stars" role="radiogroup" aria-label="Your rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${n <= d.rating ? 'on' : ''}" role="radio" aria-checked="${n === d.rating}" aria-label="${n} star${n > 1 ? 's' : ''}" onclick="rvRate(${n})">★</button>`).join('')}</div>
    <div class="form-group"><input id="rv-title" maxlength="80" placeholder="Headline (optional)" value="${esc(d.title)}" oninput="RV.draft.title=this.value"></div>
    <div class="form-group"><textarea id="rv-text" rows="4" maxlength="800" placeholder="What did you like? Fabric, colour, drape, packing…" oninput="RV.draft.text=this.value">${esc(d.text)}</textarea></div>
    <div class="rv-photos" id="rv-photos-in">${d.photos.map((s, i) => `<div class="rv-pin"><img src="${esc(s)}" alt="Your photo ${i + 1}"><button type="button" aria-label="Remove photo" onclick="rvDelPhoto(${i})">×</button></div>`).join('')}${d.photos.length < 3 ? `<button type="button" class="rv-add" onclick="document.getElementById('rv-files').click()">📷<small>Add photo</small></button>` : ''}</div><input type="file" id="rv-files" accept="image/*" multiple hidden onchange="rvAddPhotos(this.files);this.value=''">
    <div class="form-group" style="margin-top:12px;"><label>Name shown with your review</label><input id="rv-name" maxlength="30" value="${esc(d.name)}" oninput="RV.draft.name=this.value"></div>
    <div class="consent-box" id="rv-consent-row"><label class="chk"><input type="checkbox" id="rv-consent" ${d.consent ? 'checked' : ''} onchange="RV.draft.consent=this.checked"><span>I agree that my review, photos and the name above can be <strong>shown publicly</strong> on this store. <a onclick="event.preventDefault();event.stopPropagation();openLegalModal('privacy')">Privacy Policy</a> <em>(required)</em></span></label></div>
    <div class="rv-actions"><button class="btn-full" onclick="rvSubmit()">Submit review</button><button class="btn-outline" onclick="rvCancel()">Cancel</button></div></div>` : '';
  root.innerHTML = `<h3 class="rv-h">Customer reviews</h3>
    <div class="rv-summary">${all.length ? `<div class="rv-avg"><div class="rv-num">${avg.toFixed(1)}</div>${starsHTML(avg)}<div class="note" style="margin:2px 0 0;">${all.length} review${all.length > 1 ? 's' : ''}</div></div><div class="rv-bars">${bars.map(([n, c]) => `<div class="rv-bar"><span>${n}★</span><div><i style="width:${all.length ? c / all.length * 100 : 0}%"></i></div><span>${c}</span></div>`).join('')}</div>` : '<div class="rv-avg"><div class="note" style="margin:0;font-size:13px;">No reviews yet — be the first to share how it looks and feels.</div></div>'}<div class="rv-cta">${cta}</div></div>
    ${form}
    ${myOther.length ? `<div class="rv-mine">${myOther.map(r => reviewHTML(r, true)).join('')}</div>` : ''}
    ${all.length > 1 || RV.photosOnly ? `<div class="rv-filters"><select onchange="RV.sort=this.value;RV.shown=5;renderReviews()" aria-label="Sort reviews"><option value="new" ${RV.sort === 'new' ? 'selected' : ''}>Newest</option><option value="high" ${RV.sort === 'high' ? 'selected' : ''}>Highest rated</option><option value="low" ${RV.sort === 'low' ? 'selected' : ''}>Lowest rated</option></select><label class="chk-line"><input type="checkbox" ${RV.photosOnly ? 'checked' : ''} onchange="RV.photosOnly=this.checked;RV.shown=5;renderReviews()"> With photos only</label></div>` : ''}
    <div class="rv-list">${list.slice(0, RV.shown).map(r => reviewHTML(r, !!(u && r.userId === u.id))).join('')}${!list.length && all.length ? '<p class="note">No reviews with photos yet.</p>' : ''}</div>
    ${list.length > RV.shown ? `<button class="btn-outline" onclick="RV.shown+=5;renderReviews()">Show more reviews (${list.length - RV.shown})</button>` : ''}`;
}
function rvStart() {
  const p = db.products.find(x => x.id === CUR_PID); if (!p) return;
  const go = () => { const u = currentUser(); if (u && canReview(u, p.id) && !db.reviews.some(r => r.productId === p.id && r.userId === u.id)) { RV.open = true; RV.draft = { rating: 0, title: '', text: '', photos: [], name: displayName(u), consent: false }; } renderReviews(); const f = document.querySelector('.rv-form'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  if (!currentUser()) openAuth(go); else go();
}
function rvCancel() { RV.open = false; RV.draft = null; renderReviews(); }
function rvRate(n) { RV.draft.rating = n; document.querySelectorAll('#rv-stars button').forEach((b, i) => { b.classList.toggle('on', i < n); b.setAttribute('aria-checked', i + 1 === n); }); }
async function rvAddPhotos(files) {
  const d = RV.draft; if (!d) return; const list = [...files].filter(f => /^image\//.test(f.type)).slice(0, 3 - d.photos.length);
  try { for (const f of list) d.photos.push(await fileToDataUrl(f, 900, 0.78)); } catch (e) { showToast('Could not read one of the photos', 'error'); }
  renderReviews();
}
function rvDelPhoto(i) { RV.draft.photos.splice(i, 1); renderReviews(); }
function rvSubmit() {
  const u = currentUser(), p = db.products.find(x => x.id === CUR_PID), d = RV.draft; if (!u || !p || !d) return;
  d.title = (document.getElementById('rv-title') || {}).value || d.title; d.text = (document.getElementById('rv-text') || {}).value || d.text; d.name = ((document.getElementById('rv-name') || {}).value || d.name).trim(); d.consent = !!(document.getElementById('rv-consent') || {}).checked;
  if (!d.rating) return showToast('Please choose a star rating', 'error');
  if (d.text.trim().length < 10) return showToast('Please write at least a sentence (10 characters)', 'error');
  if (d.name.length < 2) return showToast('Please enter the name to show', 'error');
  if (!d.consent) { document.getElementById('rv-consent-row').classList.add('invalid'); return showToast('Please tick the box to allow your review to be shown publicly', 'error'); }
  if (!canReview(u, p.id) || db.reviews.some(r => r.productId === p.id && r.userId === u.id)) return showToast('You have already reviewed this saree', 'error');
  const order = db.orders.find(o => o.userId === u.id && o.status === 'delivered' && o.items.some(i => i.productId === p.id)), rid = 'rv' + generateId(), backup = db.consentLog.length;
  recordConsent(u, 'reviewPublic', true, 'review', rid);
  const r = { id: rid, productId: p.id, userId: u.id, orderId: order.id, name: d.name, rating: d.rating, title: d.title.trim(), text: d.text.trim(), photos: d.photos.slice(), status: db.settings.autoApproveReviews ? 'approved' : 'pending', createdAt: nowISO(), reply: '', replyAt: null };
  db.reviews.push(r); recalcRatings();
  if (!saveDB()) { db.reviews.pop(); db.consentLog.length = backup; recalcRatings(); return; }
  RV.open = false; RV.draft = null; renderReviews(); renderProducts(); buildScrollTrack(); updateNavCounts();
  showToast(r.status === 'approved' ? '✓ Thank you! Your review is live' : '✓ Thank you! Your review will appear once we approve it', 'success');
}
function rvDelete(id) {
  const r = db.reviews.find(x => x.id === id), u = currentUser(); if (!r || !u || r.userId !== u.id) return;
  if (!confirm('Delete your review?')) return;
  db.reviews = db.reviews.filter(x => x.id !== id); recordConsent(u, 'reviewPublic', false, 'review', id); recalcRatings(); saveDB();
  renderReviews(); renderProducts(); buildScrollTrack(); updateNavCounts(); if (document.getElementById('accountModal').classList.contains('active')) renderAccount(); showToast('Review deleted');
}
let LB = { rid: null, i: 0 };
function openLightbox(rid, i) { LB = { rid, i }; renderLightbox(); document.getElementById('lightboxModal').classList.add('active'); }
function renderLightbox() { const r = db.reviews.find(x => x.id === LB.rid); if (!r) return; const n = r.photos.length; document.getElementById('lightboxBody').innerHTML = `<img src="${esc(r.photos[LB.i])}" alt="Review photo ${LB.i + 1} of ${n}">${n > 1 ? `<button class="lb-nav prev" aria-label="Previous photo" onclick="lbStep(-1)">‹</button><button class="lb-nav next" aria-label="Next photo" onclick="lbStep(1)">›</button>` : ''}<div class="lb-cap">${esc(r.name)} · ${LB.i + 1}/${n}</div>`; }
function lbStep(d) { const r = db.reviews.find(x => x.id === LB.rid); if (!r) return; LB.i = (LB.i + d + r.photos.length) % r.photos.length; renderLightbox(); }
function reviewsStaticHTML(p) {
  const rs = reviewsFor(p.id).slice(0, 10); if (!rs.length) return '';
  return `<section><h2>Customer reviews (${p.reviews}, average ${p.rating}/5)</h2>${rs.map(r => `<article><p><strong>${esc(r.name)}</strong> — ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}${r.title ? ' · ' + esc(r.title) : ''}</p><p>${esc(r.text)}</p>${r.reply ? `<p><em>Reply from ${esc(BRAND())}: ${esc(r.reply)}</em></p>` : ''}</article>`).join('')}</section>`;
}
function reviewsLd(p) { return reviewsFor(p.id).slice(0, 5).map(r => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: r.createdAt.slice(0, 10), reviewRating: { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5' }, ...(r.title ? { name: r.title } : {}), reviewBody: r.text })); }

// ---- admin: reviews ----
const RA = { filter: 'pending' };
function updateNavCounts() {
  const set = (k, n) => document.querySelectorAll(`[data-nc="${k}"]`).forEach(e => { e.textContent = n || ''; e.style.display = n ? 'inline-block' : 'none'; });
  set('reviews', db.reviews.filter(r => r.status === 'pending').length); set('alerts', db.stockAlerts.filter(a => a.status === 'waiting').length);
}
function revAfter() { recalcRatings(); saveDB(); renderProducts(); buildScrollTrack(); updateNavCounts(); renderReviewsAdmin(document.getElementById('adminContent')); }
function revSet(id, status) { const r = db.reviews.find(x => x.id === id); if (!r) return; r.status = status; r.moderatedAt = nowISO(); addLog('review_' + status, (db.products.find(p => p.id === r.productId) || {}).name || '', '-', 0, 0, 0, `Review by ${r.name} ${status}`); revAfter(); showToast(status === 'approved' ? '✓ Review published' : 'Review ' + status, status === 'approved' ? 'success' : ''); }
function revRemove(id) { if (!confirm('Delete this review permanently?')) return; db.reviews = db.reviews.filter(x => x.id !== id); revAfter(); }
function revReply(id) { const r = db.reviews.find(x => x.id === id), t = document.getElementById('rr-' + id); if (!r || !t) return; r.reply = t.value.trim().slice(0, 600); r.replyAt = r.reply ? nowISO() : null; saveDB(); showToast(r.reply ? '✓ Reply saved' : 'Reply removed', 'success'); }
function revAuto(on) { db.settings.autoApproveReviews = !!on; saveDB(); showToast(on ? 'New reviews from verified buyers will be published automatically' : 'New reviews now wait for your approval'); }
function renderReviewsAdmin(container) {
  const y = window.scrollY, rs = db.reviews.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), cnt = k => rs.filter(r => r.status === k).length;
  const list = RA.filter === 'all' ? rs : rs.filter(r => r.status === RA.filter), user = id => db.users.find(u => u.id === id) || {};
  container.innerHTML = `<div class="home-top"><p style="color:#666;font-size:14px;">Only customers who have <strong>received</strong> a saree can review it (“Verified purchase”).</p><label class="chk-line" style="margin:0;"><input type="checkbox" ${db.settings.autoApproveReviews ? 'checked' : ''} onchange="revAuto(this.checked)"> Publish new reviews automatically</label></div>
    <div style="margin-bottom:10px"><button class="btn-sm btn-primary-sm" onclick="revAiAll()" ${aiOn('review') ? '' : 'disabled'}>✨ Draft replies for all waiting reviews</button> <span class="note">Fills each reply box with a draft. You read it and press Save reply.</span></div>
    <div class="pv-tabs" style="display:inline-flex;margin-bottom:16px;">${[['pending', 'Pending'], ['approved', 'Published'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, l]) => `<button class="${RA.filter === k ? 'active' : ''}" onclick="RA.filter='${k}';renderReviewsAdmin(document.getElementById('adminContent'))">${l}${k !== 'all' ? ` (${cnt(k)})` : ` (${rs.length})`}</button>`).join('')}</div>
    ${list.map(r => { const p = db.products.find(x => x.id === r.productId) || { name: '(deleted saree)', image: '' }, u = user(r.userId); return `<div class="admin-card rv-admin"><div style="display:flex;gap:14px;flex-wrap:wrap;"><img src="${esc(p.image)}" alt="" style="width:54px;height:68px;object-fit:cover;border-radius:6px;"><div style="flex:1;min-width:220px;"><div style="font-weight:600;">${esc(p.name)}</div><div style="font-size:12px;color:#6b6862;">${esc(r.name)} · ${esc(u.phone || '')} · order ${esc(r.orderId)} · ${esc(fmtDate(r.createdAt))}</div><div style="margin:4px 0;">${starsHTML(r.rating)} <span class="status-pill ${r.status === 'approved' ? 'status-paid' : r.status === 'pending' ? 'status-placed' : 'status-cancelled'}">${r.status === 'approved' ? 'published' : r.status}</span></div></div><div class="action-buttons" style="align-self:flex-start;">${r.status !== 'approved' ? `<button class="btn-sm btn-primary-sm" onclick="revSet('${r.id}','approved')">✓ Publish</button>` : ''}${r.status !== 'rejected' ? `<button class="btn-sm btn-info-sm" onclick="revSet('${r.id}','rejected')">Reject</button>` : ''}<button class="btn-sm btn-danger-sm" onclick="revRemove('${r.id}')">Delete</button></div></div>
      ${r.title ? `<div style="font-weight:600;margin-top:8px;">${esc(r.title)}</div>` : ''}<p style="font-size:13px;line-height:1.6;white-space:pre-line;margin:6px 0;">${esc(r.text)}</p>
      ${r.photos.length ? `<div class="rv-photos">${r.photos.map((s, i) => `<img class="rv-ph" src="${esc(s)}" alt="Review photo ${i + 1}" onclick="openLightbox('${r.id}',${i})">`).join('')}</div>` : ''}
      <div class="form-group" style="margin:10px 0 0;"><label>Your reply (shown under the review once published)</label><div class="hs-img-row"><input type="text" id="rr-${r.id}" maxlength="600" value="${esc(r.reply)}" placeholder="Thank the customer…"><button class="btn-sm btn-info-sm rv-ai" onclick="revAiReply('${r.id}')" ${aiOn('review') ? '' : 'disabled'}>✨ Draft</button><button class="btn-sm btn-primary-sm" onclick="revReply('${r.id}')">Save reply</button></div></div></div>`; }).join('') || `<div class="admin-card" style="text-align:center;padding:40px;color:#6b6862;">${RA.filter === 'pending' ? 'Nothing waiting for approval 🎉' : 'No reviews here yet.'}</div>`}`;
  window.scrollTo(0, y);
}
function acctExtraHTML(u) {
  const al = db.stockAlerts.filter(a => a.userId === u.id && a.status !== 'cancelled' && a.status !== 'skipped').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), rv = db.reviews.filter(r => r.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pn = id => (db.products.find(p => p.id === id) || { name: '(removed)' }).name;
  return `${al.length ? `<h4 class="acct-h" style="margin-top:22px;">Back-in-stock alerts</h4>` : ''}${al.length ? al.map(a => `<div class="acct-order"><div><div style="font-size:13px;font-weight:600;">${esc(pn(a.productId))}</div><div style="font-size:11px;color:#6b6862;">${a.status === 'waiting' ? 'Waiting · asked ' + esc(fmtDate(a.createdAt)) : 'Notified ' + esc(fmtDate(a.notifiedAt))}</div></div>${a.status === 'waiting' ? `<button class="linkbtn" onclick="alertCancel('${a.id}','account')">Cancel</button>` : '<span class="cchip ok">sent</span>'}</div>`).join('') : ''}
    ${rv.length ? `<h4 class="acct-h" style="margin-top:22px;">My reviews</h4>` : ''}${rv.length ? rv.map(r => `<div class="acct-order"><div><div style="font-size:13px;font-weight:600;">${esc(pn(r.productId))}</div><div style="font-size:11px;color:#6b6862;">${starsHTML(r.rating)} · ${r.status === 'approved' ? 'published' : r.status === 'pending' ? 'waiting for approval' : 'not published'}</div></div><button class="linkbtn" onclick="rvDelete('${r.id}')">Delete</button></div>`).join('') : ''}`;
}

// ---- product form: fabric & colours (used by the shop filters) ----
function pfRenderColours() {
  const box = gid_('pf-colours'); if (!box) return; const cols = PF.colours || [];
  box.innerHTML = cols.map((c, i) => `<span class="chip"><i class="dot" style="background:${colourCss(c)}"></i>${esc(c)}<button type="button" onclick="pfDelColour(${i})" aria-label="Remove ${esc(c)}">×</button></span>`).join('') || '<span class="note" style="margin:0;">None yet — add the main colours so customers can filter by colour</span>';
}
function pfAddColour(v) { if (!v) return; PF.colours = PF.colours || []; if (!PF.colours.includes(v)) PF.colours.push(v); pfRenderColours(); }
function pfDelColour(i) { PF.colours.splice(i, 1); pfRenderColours(); }
async function pfDetectColours() {
  if (!PF.images[0]) return showToast('Add a photo first', 'error');
  const c = await dominantColours(PF.images[0], 3);
  if (!c.length) return showToast('Could not read colours from this photo — please add them by hand', 'error');
  PF.colours = uniqCI([...(PF.colours || []), ...c]); pfRenderColours(); showToast('✨ Colours detected: ' + c.join(', '), 'success');
}
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightboxModal').classList.contains('active')) return;
  if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'ArrowRight') lbStep(1);
});

