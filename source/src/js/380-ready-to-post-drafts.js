// ================= READY-TO-POST DRAFTS (30 Oct 2026) =================
// Saving a draft from Image Studio asks for the product details (with AI help); a draft that has everything is "Ready to post".
const DRAFT_FILTER = { v: 'all' };
function draftReady(d) {
  const missing = [], cat = d.category || catFromSku(d.sku);
  if (!draftImages(d).length) missing.push('photo');
  if (!String(d.name || '').trim() || /^AP-[A-Z]{3}-\d+$/i.test(String(d.name).trim())) missing.push('name');
  if (!cat || ![...db.categories, ...db.accessoryCategories].includes(cat)) missing.push('category');
  if (!(Number(d.price) > 0)) missing.push('price');
  if (String(d.description || '').trim().length < 30) missing.push('description');
  const tips = []; if (!d.fabric && !isAccessory({ category: cat })) tips.push('fabric'); if (!(d.colours || []).length && !isAccessory({ category: cat })) tips.push('colours'); if (!(d.tags || []).length) tips.push('tags');
  return { ok: !missing.length, missing, tips };
}
const draftStock = d => Number.isInteger(+d.stock) && +d.stock >= 0 && d.stock !== '' && d.stock != null ? +d.stock : 1;
function ddFields(d) { const o = { name: '', category: '', price: '', stock: 1, fabric: '', colours: [], description: '', tags: [], lang: 'en' }; return Object.assign(o, { name: d.name || '', category: d.category || catFromSku(d.sku) || '', price: d.price || '', stock: draftStock(d), fabric: d.fabric || '', colours: d.colours || [], description: d.description || '', tags: d.tags || [], lang: d.lang || 'en' }); }
let DD = null;   // the draft being completed
async function openDraftDetails(id, fromSave) {
  const d = db.drafts.find(x => x.id === id); if (!d) return;
  const f = ddFields(d); if (f.name && /^AP-[A-Z]{3}-\d+$/i.test(f.name.trim())) f.name = '';
  DD = { id, f, fromSave: !!fromSave, auto: false };
  const opt = c => `<option value="${esc(c)}" ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`;
  openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:4px;">${fromSave ? 'Draft saved. Add the details' : 'Draft details'}</h3>
    <p style="font-size:12px;color:#6b6862;margin-bottom:14px;">Fill these once and the draft is <strong>ready to post</strong> with one tap. ✨ marks what AI can write for you; you can edit everything.</p>
    <div class="dd-top"><img src="${esc(draftImages(d)[0])}" alt="" class="dd-img"><div class="dd-fields">
      <div class="form-group"><label>Product name *</label><input id="dd-name" value="${esc(f.name)}" placeholder="e.g. Maroon Kalamkari Tussar" oninput="ddChanged()"></div>
      <div class="form-group"><label>Category *</label><select id="dd-cat" onchange="ddChanged()"><option value="">Choose…</option><optgroup label="Sarees">${db.categories.map(opt).join('')}</optgroup><optgroup label="Accessories">${db.accessoryCategories.map(opt).join('')}</optgroup></select></div></div></div>
    <div class="dd-grid"><div class="form-group"><label>Price (₹) *</label><input id="dd-price" type="number" min="1" inputmode="numeric" value="${esc(f.price)}" oninput="ddChanged()"></div>
      <div class="form-group"><label>Pieces in stock</label><input id="dd-stock" type="number" min="0" inputmode="numeric" value="${esc(f.stock)}"></div>
      <div class="form-group"><label>Fabric</label><input id="dd-fabric" list="dd-fabrics" value="${esc(f.fabric)}"><datalist id="dd-fabrics">${fabricChoices().map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
      <div class="form-group"><label>Colours (comma separated)</label><input id="dd-colours" value="${esc(f.colours.join(', '))}" placeholder="Maroon, Gold"></div></div>
    <div class="dd-ai"><select id="dd-lang" aria-label="Language">${AI_LANGS.map(([v, l]) => `<option value="${v}" ${f.lang === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="btn-sm btn-info-sm" id="dd-local" onclick="ddAiLocal()">✨ Fill with AI (built-in)</button><button type="button" class="btn-sm btn-primary-sm" id="dd-claude" onclick="ddAiClaude()" ${aiOn('describe') ? '' : 'disabled'}>✨ Write with Claude</button><button type="button" class="btn-sm btn-info-sm" onclick="ddAiPhoto()" ${aiOn('photo') ? '' : 'disabled'}>📷 Read photo</button></div>
    <div class="form-group"><label>Description * <span class="pf-sub" id="dd-count"></span></label><textarea id="dd-desc" rows="5" oninput="ddChanged()" placeholder="Write a few lines, or press ✨ to have AI write it">${esc(f.description)}</textarea></div>
    <div class="form-group"><label>Search tags (comma separated)</label><input id="dd-tags" value="${esc(f.tags.join(', '))}"></div>
    <div id="dd-status" class="dd-status"></div>
    <div class="dd-actions"><button type="button" class="btn-sm btn-info-sm" onclick="closeModal('adminModal')">${fromSave ? 'Later' : 'Cancel'}</button><button type="button" class="btn-sm btn-primary-sm" onclick="ddSave(false)">💾 Save details</button><button type="button" class="btn-full" id="dd-post" style="margin:0;flex:1;" onclick="ddSave(true)">🚀 Save &amp; post now</button></div>`);
  ddChanged();
  if (!f.description.trim() && f.name.trim()) ddAiLocal(true);          // a first AI draft is ready to review straight away
}
function ddRead() { const v = id => (el_(id) || { value: '' }).value.trim(), list = s => s.split(/[,;]/).map(x => x.trim()).filter(Boolean); return { name: v('dd-name'), category: v('dd-cat'), price: parseInt(v('dd-price'), 10) || '', stock: v('dd-stock') === '' ? 1 : Math.max(0, parseInt(v('dd-stock'), 10) || 0), fabric: v('dd-fabric'), colours: uniqCI(list(v('dd-colours'))).slice(0, 8), description: v('dd-desc'), tags: uniqCI(list(v('dd-tags'))).slice(0, 20), lang: v('dd-lang') || 'en' }; }
function ddChanged() {
  if (!DD) return; const f = ddRead(), d = db.drafts.find(x => x.id === DD.id) || {}, r = draftReady({ ...d, ...f }), s = el_('dd-status'), post = el_('dd-post'); const c = el_('dd-count'); if (c) c.textContent = `${f.description.length} characters`;
  if (s) s.innerHTML = r.ok ? '✅ <b>Ready to post.</b>' + (r.tips.length ? ` <small>Nice to add: ${r.tips.join(', ')}.</small>` : '') : `⚠ Still needed: <b>${r.missing.join(', ')}</b>`; if (s) s.className = 'dd-status ' + (r.ok ? 'ok' : 'warn'); if (post) post.disabled = !r.ok;
}
async function ddAiLocal(quiet) {
  const f = ddRead(); if (!f.name) { showToast('Type the product name first', 'error'); el_('dd-name').focus(); return; }
  const d = db.drafts.find(x => x.id === DD.id) || {}, cols = f.colours.length ? f.colours : await dominantColours(draftImages(d)[0]), cat = f.category || 'Handloom';
  const c = localCopy({ name: f.name, category: cat, colours: cols }, 0), kb = kbFor(cat);
  if (!el_('dd-desc').value.trim()) el_('dd-desc').value = c.description; if (!el_('dd-tags').value.trim()) el_('dd-tags').value = c.tags.slice(0, 12).join(', ');
  if (!el_('dd-colours').value.trim() && !isAccessory({ category: cat })) el_('dd-colours').value = cols.join(', ');
  if (!el_('dd-fabric').value.trim() && !isAccessory({ category: cat })) el_('dd-fabric').value = FABRIC_BY_CAT[cat] || '';
  ddChanged(); if (!quiet) showToast('✨ Filled the empty fields. Review and edit.', 'success');
}
async function ddAiClaude() {
  const f = ddRead(); if (!f.name) { showToast('Type the product name first', 'error'); return; } const st = el_('dd-status'); if (st) st.textContent = '✨ Claude is writing…';
  try { const r = await aiCall('describe', { name: f.name, category: f.category, kind: isAccessory({ category: f.category }) ? 'accessory' : 'saree', fabric: f.fabric, colours: f.colours, occasions: occasionsOf({ category: f.category, tags: f.tags }), lang: f.lang }), d = r.data || {};
    if (d.description) el_('dd-desc').value = String(d.description).trim(); if (Array.isArray(d.tags)) el_('dd-tags').value = uniqCI([...f.tags, ...d.tags.map(String)]).slice(0, 14).join(', '); DD.seo = { seoTitle: d.seoTitle, metaDescription: d.metaDescription, altText: d.altText };
    ddChanged(); showToast('✨ Claude wrote a draft. Please read it.', 'success'); } catch (e) { ddChanged(); showToast(aiMsg(e), 'error'); }
}
async function ddAiPhoto() {
  const d = db.drafts.find(x => x.id === DD.id); if (!d) return; const st = el_('dd-status'); if (st) st.textContent = '📷 Claude is looking at the photo…';
  try { const r = await aiCall('photo', { image: await aiShrink(draftImages(d)[0]), categories: [...db.categories, ...db.accessoryCategories], fabrics: fabricChoices() }), x = r.data || {};
    if (Array.isArray(x.colours) && x.colours.length && !el_('dd-colours').value.trim()) el_('dd-colours').value = x.colours.join(', ');
    if (x.fabric && !el_('dd-fabric').value.trim()) el_('dd-fabric').value = x.fabric; if (x.category && !el_('dd-cat').value && [...db.categories, ...db.accessoryCategories].includes(x.category)) el_('dd-cat').value = x.category;
    const extra = [x.border, x.pattern, ...(Array.isArray(x.occasions) ? x.occasions : [])].filter(Boolean); if (extra.length) el_('dd-tags').value = uniqCI([...ddRead().tags, ...extra]).slice(0, 14).join(', ');
    ddChanged(); showToast('📷 Suggestions added. Check them.', 'success'); } catch (e) { ddChanged(); showToast(aiMsg(e), 'error'); }
}
function ddApply(d, f) {
  Object.assign(d, { name: f.name, category: f.category || d.category, price: f.price, stock: f.stock, fabric: f.fabric, colours: f.colours, description: f.description, tags: f.tags, lang: f.lang });
  const c = localCopy({ name: f.name, category: f.category || 'Handloom', colours: f.colours }, 0), seo = (DD && DD.seo) || {};
  d.seoTitle = d.seoTitle || fitText(seo.seoTitle || c.seoTitle, 70); d.metaDescription = d.metaDescription || fitText(seo.metaDescription || c.metaDescription, 160); d.altText = d.altText || fitText(seo.altText || c.altText, 125); d.slug = d.slug || uniqueSlug(f.name);
  if (!d.tags.length) d.tags = c.tags.slice(0, 12); d.detailsAt = new Date().toISOString();
}
function ddSave(post) {
  const d = db.drafts.find(x => x.id === DD.id); if (!d) return; const f = ddRead();
  if (post && !draftReady({ ...d, ...f }).ok) { ddChanged(); showToast('Please fill the missing details first', 'error'); return; }
  ddApply(d, f); if (!saveDB()) return; closeModal('adminModal'); DD = null;
  if (post) { draftPostNow(d.id); return; }
  if (currentAdminTab === 'drafts' || currentAdminTab === 'products') renderAdminContent(currentAdminTab); showToast(draftReady(d).ok ? '✅ Saved. This draft is ready to post.' : 'Details saved', 'success');
}
function draftPostNow(id) {
  const i = db.drafts.findIndex(x => x.id === id), d = db.drafts[i]; if (!d) return false; const r = draftReady(d);
  if (!r.ok) { showToast(`Missing: ${r.missing.join(', ')}`, 'error'); openDraftDetails(id); return false; }
  if (db.products.some(p => p.sku === d.sku)) { showToast(`SKU ${d.sku} is already used by another product. Open the full form to change it.`, 'error'); return false; }
  const imgs = draftImages(d), p = { id: 'p' + generateId(), sku: d.sku, name: d.name.trim(), category: d.category || catFromSku(d.sku), price: Math.round(d.price), stock: draftStock(d), threshold: 2, images: imgs, image: imgs[0], video: d.video || '', fabric: d.fabric || '', colours: (d.colours || []).slice(), description: d.description.trim(), tags: (d.tags || []).slice(), seoTitle: d.seoTitle || '', metaDescription: d.metaDescription || '', altText: d.altText || '', slug: uniqueSlug(d.slug || d.name), rating: 0, reviews: 0, isNew: true };
  db.products.push(p); db.drafts.splice(i, 1); addLog('product_created', p.name, p.sku, 0, 0, p.stock, 'Posted from a draft');
  if (!saveDB()) { db.products.pop(); db.drafts.splice(i, 0, d); return false; }
  refreshAdmin(); renderProducts(); buildScrollTrack(); updateBadges(); seoRefreshHome(); showToast(`🚀 ${p.name} is live in the shop`, 'success'); setTimeout(() => igOffer(p), 400); const n = notifySimilar(p); if (n) showToast(`✨ ${n} customer${n > 1 ? 's' : ''} asked about similar sarees and ${n > 1 ? 'were' : 'was'} queued for a message`, 'success');
  if (currentAdminTab === 'drafts' || currentAdminTab === 'products') renderAdminContent(currentAdminTab); return true;
}
function draftsPostAllReady() { const ids = db.drafts.filter(d => draftReady(d).ok).map(d => d.id); if (!ids.length) { showToast('No drafts are ready yet', 'error'); return; } if (!confirm(`Post ${ids.length} ready draft${ids.length > 1 ? 's' : ''} to the shop now?`)) return; let n = 0; ids.forEach(id => { if (draftPostNow(id)) n++; }); showToast(`🚀 ${n} product${n === 1 ? '' : 's'} posted`, 'success'); }
async function draftsFillAll() {
  let n = 0; for (const d of db.drafts) { if (d.description && d.description.length >= 30 && d.tags && d.tags.length) continue; const name = d.name && !/^AP-[A-Z]{3}-\d+$/i.test(d.name) ? d.name : ''; if (!name) continue;
    const cat = d.category || catFromSku(d.sku) || 'Handloom', cols = (d.colours && d.colours.length) ? d.colours : (isAccessory({ category: cat }) ? [] : await dominantColours(draftImages(d)[0])), c = localCopy({ name, category: cat, colours: cols }, 0);
    d.description = d.description && d.description.length >= 30 ? d.description : c.description; d.tags = d.tags && d.tags.length ? d.tags : c.tags.slice(0, 12); d.colours = cols; d.fabric = d.fabric || (isAccessory({ category: cat }) ? '' : FABRIC_BY_CAT[cat] || ''); d.category = d.category || (cat !== 'Handloom' ? cat : ''); ddApply.call(null, d, { name, category: d.category, price: d.price || '', stock: draftStock(d), fabric: d.fabric, colours: d.colours, description: d.description, tags: d.tags, lang: d.lang || 'en' }); n++; }
  saveDB(); renderAdminContent(currentAdminTab); showToast(n ? `✨ AI filled ${n} draft${n > 1 ? 's' : ''}. Only the price is left to add.` : 'Nothing to fill. Name your drafts first.', n ? 'success' : '');
}
function draftSetFilter(v) { DRAFT_FILTER.v = v; renderAdminContent(currentAdminTab); }
