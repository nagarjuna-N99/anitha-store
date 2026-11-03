// ================= PUBLISH / EDIT PRODUCT FORM =================
let PF = null;
async function fileToDataUrl(file, max = 1600, q = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}
function openProductForm(id = null, prefill = null) {
  const p = id ? db.products.find(x => x.id === id) : null, src = p || prefill || {};
  const images = src.images && src.images.length ? src.images.slice() : (src.image ? [src.image] : []);
  PF = { id: p ? p.id : null, name: src.name || '', sku: src.sku || '', category: src.category || db.categories[0] || '', price: p ? p.price : (src.price || ''), stock: p ? p.stock : 1, images, video: src.video || '', description: src.description || '', tags: (src.tags || []).slice(), seoTitle: src.seoTitle || '', metaDescription: src.metaDescription || '', slug: src.slug || '', altText: src.altText || '', slugTouched: !!src.slug, variant: 0, source: '', fabric: src.fabric || FABRIC_BY_CAT[src.category || db.categories[0]] || '', fabricTouched: !!src.fabric, colours: (src.colours || []).slice(), daylight: !!src.daylight, skuTouched: !!(src.sku && (p || prefill)), descTouched: !!src.description, tagsTouched: !!(src.tags && src.tags.length), seoTouched: !!(src.seoTitle || src.metaDescription) };
  if (!PF.id && !PF.sku) PF.sku = pfSkuFor(PF.category);
  renderProductForm();
  if (!PF.description.trim() && PF.name.trim()) pfGenerate('all', true);
}
function renderProductForm() {
  const q = PF, opt = c => `<option value="${esc(c)}" ${q.category === c ? 'selected' : ''}>${esc(c)}</option>`, catOptions = `<optgroup label="Sarees">${db.categories.map(opt).join('')}</optgroup><optgroup label="Accessories">${db.accessoryCategories.map(opt).join('')}</optgroup>`;
  openModal(`
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:4px;">${q.id ? 'Edit Product' : 'Publish New Product'}</h3>
    <p style="font-size:12px;color:#6b6862;margin-bottom:18px;">Photos, video, description, tags and SEO — everything is editable. Click <strong>👁 Preview</strong> to see it as customers will.</p>
    <form onsubmit="pfSave(event)" novalidate>
      <div class="pf-grid">
        <div>
          <div class="pf-sec"><h4>Photos <span id="pf-count" class="pf-sub"></span></h4><div id="pf-photocheck" class="ph-check" aria-live="polite"></div><div id="pf-gallery" class="pf-thumbs"></div><div class="note">The first photo is the cover. Use ‹ › to reorder, × to remove.</div>
            <input type="file" id="pf-files" accept="image/*" multiple hidden onchange="pfAddPhotos(this.files);this.value=''"></div>
          <div class="pf-sec"><h4>Basics</h4>
            <div class="form-group"><label>Product Name *</label><input type="text" id="p-name" value="${esc(q.name)}" oninput="pfSet('name',this.value)"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label>SKU *</label><input type="text" id="p-sku" value="${esc(q.sku)}" oninput="pfSet('sku',this.value)"></div>
              <div class="form-group"><label>Category *</label><select id="p-cat" onchange="pfSet('category',this.value)">${catOptions}</select></div>
              <div class="form-group"><label>Price (₹) *</label><input type="number" id="p-price" min="0" value="${q.price}" oninput="pfSet('price',this.value)"></div>
              <div class="form-group"><label>Stock Qty *</label><input type="number" id="p-stock" min="0" value="${q.stock}" oninput="pfSet('stock',this.value)"></div>
            </div>
            <div class="form-group"><label>Fabric <span class="pf-sub">(used for shop filters)</span></label><input type="text" id="pf-fabric" list="pf-fabric-list" value="${esc(q.fabric)}" oninput="pfSet('fabric',this.value)" placeholder="e.g. Pure Silk"><datalist id="pf-fabric-list">${FABRIC_SUGGEST.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div>
            <div class="form-group"><label>Colours <span class="pf-sub">(used for shop filters)</span></label><div id="pf-colours" class="chips"></div><div class="pf-actions"><select id="pf-colour-add" onchange="pfAddColour(this.value);this.value=''" style="padding:8px;border:1px solid var(--border);border-radius:6px;font-size:12px;"><option value="">＋ Add colour…</option>${COLOR_NAMES.map(c => `<option value="${esc(c[0])}">${esc(c[0])}</option>`).join('')}</select><button type="button" class="btn-sm btn-info-sm" onclick="pfDetectColours()">✨ Detect from cover photo</button></div></div></div>
          <div class="pf-sec"><h4>Video URL <span class="pf-sub">(optional)</span></h4>
            <input type="text" id="pf-video" class="input-field" value="${esc(q.video)}" placeholder="https://youtu.be/…  or Vimeo / .mp4 link" oninput="pfSet('video',this.value)" style="font-size:13px;padding:11px;">
            <div id="pf-video-hint" class="note"></div>
            <label class="chk" style="margin-top:10px;"><input type="checkbox" id="pf-daylight" ${q.daylight ? 'checked' : ''} onchange="pfSet('daylight',this.checked)"><span>The <strong>last photo</strong> was taken in natural daylight (customers can jump to it to see the true colour)</span></label></div>
        </div>
        <div>
          <div class="pf-sec"><h4>Description <span class="pf-sub" id="pf-ai-status"></span></h4>
            <textarea id="p-desc" class="input-field" rows="11" oninput="pfSet('description',this.value)" style="font-size:13px;line-height:1.6;padding:12px;">${esc(q.description)}</textarea>
            <div class="pf-actions pf-claude"><button type="button" class="btn-sm btn-primary-sm" id="pf-auto" onclick="pfAutoAll()" title="One click: reads the photo, sets the category details, SKU, description, tags and SEO">✨ Auto-fill everything</button><select id="pf-lang" aria-label="Language" onchange="PF.lang=this.value">${AI_LANGS.map(([v, l]) => `<option value="${v}" ${(PF.lang || 'en') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <p id="pf-ai-note" class="note" style="margin:6px 0 0;">${aiReady('describe') ? '🟢 Claude is connected: one click reads the photo and writes everything.' : '🟡 Claude is not connected, so one click uses the built-in writer. ' + (BUILD === 'admin' ? 'For personal writing add your Claude key: <a onclick="closeModal();switchAdminTab(\'settings\')" style="cursor:pointer;text-decoration:underline">Settings → Claude AI key</a>.' : '')}</p>
            <details id="pf-more" class="pf-more"><summary class="note" style="cursor:pointer;">Fine-tune one part only</summary><div class="pf-actions"><button type="button" class="btn-sm btn-info-sm" id="pf-gen" onclick="pfGenerate('description')">✨ ${q.description ? 'Regenerate' : 'Generate'} description</button><button type="button" class="btn-sm btn-info-sm" onclick="pfGenerate('all')">✨ Regenerate everything</button><button type="button" class="btn-sm btn-info-sm" id="pf-ai-write" onclick="pfAiDescribe()" ${aiOn('describe') ? '' : 'disabled'}>✨ Write with Claude</button><button type="button" class="btn-sm btn-info-sm" onclick="pfAiPhoto()" ${aiOn('photo') ? '' : 'disabled'}>📷 Read photo</button><button type="button" class="btn-sm btn-info-sm" onclick="pfAiTranslate()" ${aiOn('translate') ? '' : 'disabled'}>🌐 Translate</button></div></details></div>
          <div class="pf-sec"><h4>Tags <span class="pf-sub">(used for search &amp; SEO keywords)</span></h4><div id="pf-tags" class="chips"></div>
            <div class="pf-actions"><button type="button" class="btn-sm btn-info-sm" onclick="pfGenerate('tags')">✨ Suggest tags</button></div></div>
          <div class="pf-sec"><h4>SEO</h4>
            <div class="form-group"><label>SEO title <span id="pf-c-title" class="pf-count"></span></label><input type="text" id="pf-seo-title" value="${esc(q.seoTitle)}" oninput="pfSet('seoTitle',this.value)"></div>
            <div class="form-group"><label>Meta description <span id="pf-c-meta" class="pf-count"></span></label><textarea id="pf-meta" rows="3" oninput="pfSet('metaDescription',this.value)">${esc(q.metaDescription)}</textarea></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="form-group"><label>URL slug</label><input type="text" id="pf-slug" value="${esc(q.slug)}" oninput="pfSet('slug',this.value)"></div><div class="form-group"><label>Photo alt text</label><input type="text" id="pf-alt" value="${esc(q.altText)}" oninput="pfSet('altText',this.value)"></div></div>
            <div class="serp" id="pf-serp"></div>
            <div class="pf-actions"><button type="button" class="btn-sm btn-info-sm" onclick="pfGenerate('seo')">✨ Auto-fill SEO</button></div></div>
        </div>
      </div>
      <div class="pf-footer"><button type="button" class="btn-outline" style="margin:0;flex:1;" onclick="pfPreview()">👁 Preview</button><button type="submit" class="btn-full" style="flex:2;">${q.id ? 'Save Changes' : '🚀 Publish to Storefront'}</button></div>
    </form>`, true);
  pfRenderGallery(); pfRenderTags(); pfRenderMeta(); pfRenderColours();
}
function pfProduct() {
  const q = PF; return { id: q.id || 'preview', name: q.name.trim(), sku: q.sku.trim().toUpperCase(), category: q.category, price: parseInt(q.price, 10) || 0, stock: parseInt(q.stock, 10) || 0, images: q.images, image: q.images[0] || '', video: q.video.trim(), fabric: (q.fabric || '').trim(), colours: (q.colours || []).slice(), description: q.description, tags: q.tags, seoTitle: q.seoTitle, metaDescription: q.metaDescription, slug: q.slug || slugify(q.name), altText: q.altText, daylight: !!q.daylight };
}
function pfSet(k, v) {
  PF[k] = v;
  if (k === 'sku') PF.skuTouched = true; if (k === 'description') PF.descTouched = true; if (['seoTitle', 'metaDescription', 'altText'].includes(k)) PF.seoTouched = true;
  if (k === 'fabric') PF.fabricTouched = true;
  if (k === 'category' && !PF.fabricTouched && FABRIC_BY_CAT[v]) { PF.fabric = FABRIC_BY_CAT[v]; const f = gid_('pf-fabric'); if (f) f.value = PF.fabric; }
  if (k === 'name' && !PF.slugTouched) { PF.slug = slugify(v); const s = gid_('pf-slug'); if (s) s.value = PF.slug; }
  if (k === 'slug') { PF.slugTouched = true; PF.slug = slugify(v); }
  if (k === 'category') pfCategoryChanged();
  if (k === 'video') pfRenderMeta(); else if (['seoTitle', 'metaDescription', 'slug', 'name'].includes(k)) pfRenderMeta();
}
function pfRenderMeta() {
  const q = PF, vi = videoInfo(q.video), h = gid_('pf-video-hint');
  if (h) { h.style.color = vi && vi.error ? 'var(--red)' : 'var(--sage)'; h.textContent = !vi ? 'Shown on the product page next to the photos.' : vi.error ? '✗ ' + vi.error : '✓ ' + vi.label + ' detected'; }
  const ct = gid_('pf-c-title'), cm = gid_('pf-c-meta');
  if (ct) { ct.textContent = `${q.seoTitle.length}/60`; ct.className = 'pf-count' + (q.seoTitle.length > 60 || (q.seoTitle.length && q.seoTitle.length < 30) ? ' warn' : ''); }
  if (cm) { cm.textContent = `${q.metaDescription.length}/155`; cm.className = 'pf-count' + (q.metaDescription.length > 155 || (q.metaDescription.length && q.metaDescription.length < 80) ? ' warn' : ''); }
  const sp = gid_('pf-serp'), host = (siteBase() || 'https://yourstore.com').replace(/^https?:\/\//, '');
  if (sp) sp.innerHTML = `<div class="serp-url">${esc(host)} › product › ${esc(q.slug || slugify(q.name) || '…')}</div><div class="serp-title">${esc(q.seoTitle || q.name || 'Product title')}</div><div class="serp-desc">${esc(q.metaDescription || fitText(q.description, 155) || 'Meta description appears here.')}</div>`;
}
function pfRenderGallery() {
  const g = gid_('pf-gallery'), n = PF.images.length; if (!g) return;
  gid_('pf-count').textContent = n ? `· ${n}` : '';
  g.innerHTML = PF.images.map((s, i) => `<div class="pf-thumb"><img src="${esc(s)}" alt="Photo ${i + 1}">${i === 0 ? '<span class="pf-cover">★ Cover</span>' : ''}<div class="pf-tools"><button type="button" onclick="pfMoveImg(${i},-1)" ${i === 0 ? 'disabled' : ''} aria-label="Move earlier">‹</button><button type="button" onclick="pfMoveImg(${i},1)" ${i === n - 1 ? 'disabled' : ''} aria-label="Move later">›</button><button type="button" onclick="pfDelImg(${i})" aria-label="Remove photo">×</button></div></div>`).join('')
    + `<div class="pf-thumb pf-add" onclick="gid_('pf-files').click()" title="Add photos">＋<small>Add photos</small></div>`;
}
async function pfAddPhotos(files) {
  const list = [...files].filter(f => /^image\//.test(f.type)); if (!list.length) return;
  try { for (const f of list) PF.images.push(await fileToDataUrl(f)); } catch (e) { showToast('Could not read one of the images', 'error'); }
  pfRenderGallery(); showToast(`${list.length} photo(s) added`, 'success'); pfPhotoCheck();
}
function pfMoveImg(i, d) { const j = i + d; if (j < 0 || j >= PF.images.length) return; [PF.images[i], PF.images[j]] = [PF.images[j], PF.images[i]]; pfRenderGallery(); }
function pfDelImg(i) { PF.images.splice(i, 1); pfRenderGallery(); }
function pfRenderTags() {
  const t = gid_('pf-tags'); if (!t) return;
  t.innerHTML = PF.tags.map((x, i) => `<span class="chip">${esc(x)}<button type="button" onclick="pfDelTag(${i})" aria-label="Remove tag ${esc(x)}">×</button></span>`).join('') + `<input type="text" id="pf-tag-in" class="chip-input" placeholder="Add tag + Enter" onkeydown="pfTagKey(event)" onblur="pfAddTag(this.value);this.value=''">`;
}
function pfAddTag(v) { v = String(v || '').replace(/,/g, ' ').trim(); if (!v) return; if (!PF.tags.some(t => t.toLowerCase() === v.toLowerCase())) { PF.tags.push(v); PF.tagsTouched = true; pfRenderTags(); const i = gid_('pf-tag-in'); if (i) i.focus(); } }
function pfTagKey(e) { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); pfAddTag(e.target.value); e.target.value = ''; } else if (e.key === 'Backspace' && !e.target.value && PF.tags.length) { PF.tags.pop(); pfRenderTags(); const i = gid_('pf-tag-in'); if (i) i.focus(); } }
function pfDelTag(i) { PF.tags.splice(i, 1); PF.tagsTouched = true; pfRenderTags(); }
async function pfGenerate(which, silent) {
  if (!PF.name.trim()) { showToast('Enter the product name first', 'error'); const n = gid_('p-name'); if (n) n.focus(); return; }
  const st = gid_('pf-ai-status'); if (st) st.textContent = '✨ writing…';
  document.querySelectorAll('.pf-actions button').forEach(b => b.disabled = true);
  PF.variant += (silent ? 0 : 1);
  const out = await aiCopy({ name: PF.name.trim(), category: PF.category, sku: PF.sku, price: PF.price, images: PF.images, colours: PF.colours && PF.colours.length ? PF.colours : undefined }, PF.variant);
  if (!PF.colours || !PF.colours.length) { PF.colours = out.colours || []; pfRenderColours(); }
  if (which === 'all' || which === 'description') { PF.description = out.description; gid_('p-desc').value = out.description; }
  if (which === 'all') PF.tags = out.tags; else if (which === 'tags') PF.tags = uniqCI([...PF.tags, ...out.tags]).slice(0, 20);
  if (which === 'all' || which === 'seo') {
    PF.seoTitle = out.seoTitle; PF.metaDescription = out.metaDescription; PF.altText = out.altText;
    if (!PF.slugTouched) PF.slug = slugify(PF.name);
    gid_('pf-seo-title').value = PF.seoTitle; gid_('pf-meta').value = PF.metaDescription; gid_('pf-alt').value = PF.altText; gid_('pf-slug').value = PF.slug;
  }
  PF.source = out.source; pfRenderTags(); pfRenderMeta();
  document.querySelectorAll('.pf-actions button').forEach(b => b.disabled = false);
  const gen = gid_('pf-gen'); if (gen) gen.textContent = '✨ Regenerate description';
  if (st) st.textContent = out.source === 'endpoint' ? '✨ written by your AI service — review & edit' : out.source === 'local-fallback' ? '✨ AI service unavailable — built-in draft, review & edit' : '✨ AI-assisted draft (category knowledge + photo colours) — review & edit';
  if (!silent) showToast('✨ Updated — review and edit as you like', 'success');
}
function pfPreview() { openPreview(pfProduct()); }
function pfSave(e) {
  e.preventDefault(); const q = PF, d = pfProduct();
  const fail = (msg, id) => { showToast(msg, 'error'); const el = id && gid_(id); if (el) { el.classList.add('invalid'); el.focus(); } };
  document.querySelectorAll('#adminModalBody .invalid').forEach(x => x.classList.remove('invalid'));
  if (!d.name) return fail('Product name is required', 'p-name');
  if (!d.sku) return fail('SKU is required', 'p-sku');
  if (db.products.some(p => p.sku === d.sku && p.id !== q.id)) return fail('Another product already uses this SKU', 'p-sku');
  if (String(q.price) === '' || isNaN(d.price) || d.price < 0) return fail('Enter a valid price', 'p-price');
  if (String(q.stock) === '' || d.stock < 0) return fail('Enter a valid stock quantity', 'p-stock');
  if (!d.images.length) return showToast('Add at least one photo', 'error');
  const vi = videoInfo(d.video); if (vi && vi.error) return fail('Video: ' + vi.error, 'pf-video');
  const auto = localCopy({ name: d.name, category: d.category, colours: q.colours || [] }, 0);
  const data = { ...d, description: d.description.trim(), seoTitle: (q.seoTitle || '').trim() || auto.seoTitle, metaDescription: (q.metaDescription || '').trim() || auto.metaDescription, altText: (q.altText || '').trim() || auto.altText, tags: q.tags.length ? q.tags : auto.tags, slug: uniqueSlug(q.slug || d.name, q.id) };
  delete data.id;
  let restockedNow = false;
  if (q.id) {
    const idx = db.products.findIndex(p => p.id === q.id), old = db.products[idx];
    if (data.stock !== old.stock) addLog(data.stock > old.stock ? 'stock_in' : 'stock_out', data.name, data.sku, data.stock - old.stock, old.stock, data.stock, 'Manual stock edit');
    db.products[idx] = { ...old, ...data };
    restockedNow = old.stock <= 0 && data.stock > 0;
    addLog('product_updated', data.name, data.sku, 0, 0, 0, 'Product updated');
  } else {
    Object.assign(data, { id: 'p' + generateId(), threshold: 2, rating: 0, reviews: 0, isNew: true });
    db.products.push(data);
    addLog('product_created', data.name, data.sku, 0, 0, data.stock, 'New product added');
    if (pendingDraftId !== null) { db.drafts = db.drafts.filter(x => x.id !== pendingDraftId); pendingDraftId = null; }
  }
  if (!saveDB()) { if (!q.id) db.products.pop(); return; }
  closeModal('adminModal'); refreshAdmin(); renderProducts(); buildScrollTrack(); updateBadges(); seoRefreshHome();
  showToast('Product saved!', 'success'); if (!q.id) { const np = db.products[db.products.length - 1]; setTimeout(() => igOffer(np), 400); }
  if (restockedNow) afterRestock(db.products.find(x => x.id === q.id));
  if (restockedNow || !q.id) { const np = q.id ? db.products.find(x => x.id === q.id) : db.products[db.products.length - 1]; const ns = notifySimilar(np); if (ns) showToast(`✨ ${ns} customer${ns > 1 ? 's' : ''} asked about similar sarees and ${ns > 1 ? 'were' : 'was'} queued for a WhatsApp message`, 'success'); }
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const p = db.products.find(x => x.id === id); if (!p) return;
  db.products = db.products.filter(x => x.id !== id);
  db.stockAlerts.forEach(a => { if (a.productId === id && a.status === 'waiting') a.status = 'cancelled'; });
  cart = cart.filter(c => c.id !== id); favourites = favourites.filter(f => f !== id);
  saveCart(); saveFavs();
  addLog('product_deleted', p.name, p.sku, 0, p.stock, 0, 'Product deleted');
  saveDB(); renderAdminContent('products'); renderProducts(); buildScrollTrack(); updateBadges(); updateFavBadge();
}

let CAT_KIND = 'saree';
function openCategoryForm(kind) { CAT_KIND = kind === 'accessory' ? 'accessory' : 'saree'; openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:20px;">Create New ${CAT_KIND === 'accessory' ? 'Accessory ' : ''}Category</h3><form onsubmit="handleAddCategory(event)"><div class="form-group"><label>Category Name</label><input type="text" id="cat-name" required placeholder="e.g., Silk Cotton"></div><button type="submit" class="btn-full">Create Category</button></form>`); }
function handleAddCategory(e) {
  e.preventDefault();
  const name = document.getElementById('cat-name').value.trim(); if (!name) return;
  if ([...db.categories, ...db.accessoryCategories].some(c => c.toLowerCase() === name.toLowerCase())) { alert('Category already exists!'); return; }
  (CAT_KIND === 'accessory' ? db.accessoryCategories : db.categories).push(name); addLog('category_created', name, '-', 0, 0, 0, `Category '${name}' created`); saveDB();
  closeModal('adminModal'); renderAdminContent('categories'); renderFilterButtons();
}
function deleteAccCategory(idx) {
  const name = db.accessoryCategories[idx]; if (name === undefined) return;
  const count = db.products.filter(p => p.category === name).length;
  if (count > 0) { alert(`Cannot delete. Contains ${count} products.`); return; }
  if (!confirm(`Delete '${name}'?`)) return;
  db.accessoryCategories.splice(idx, 1); addLog('category_deleted', name, '-', 0, 0, 0, `Accessory category '${name}' deleted`); saveDB();
  renderAdminContent('categories'); renderProducts();
}
function deleteCategory(idx) {
  const name = db.categories[idx]; if (name === undefined) return;
  const count = db.products.filter(p => p.category === name).length;
  if (count > 0) { alert(`Cannot delete. Contains ${count} products.`); return; }
  if (!confirm(`Delete '${name}'?`)) return;
  db.categories.splice(idx, 1); addLog('category_deleted', name, '-', 0, 0, 0, `Category '${name}' deleted`); saveDB();
  renderAdminContent('categories'); renderProducts();
}

function viewOrderDetails(orderId) {
  const o = db.orders.find(x => x.id === orderId); if (!o) return;
  openModal(`
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:5px;">Order Details</h3>
    <p style="font-size:12px;color:#6b6862;font-family:monospace;margin-bottom:20px;">${esc(o.id)}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
      <div style="background:var(--cream);padding:15px;border-radius:4px;"><div style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:5px;">Status</div><span class="status-pill ${getStatusClass(o.status)}">${esc(o.status)}</span></div>
      <div style="background:var(--cream);padding:15px;border-radius:4px;"><div style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:5px;">Date</div><div style="font-size:13px;">${esc(o.date)}</div></div>
    </div>
    <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:10px;">Items Ordered</h4>
    <div style="margin-bottom:20px;">${o.items.map(i => `<div style="display:flex;gap:15px;padding:12px;background:var(--cream);border-radius:4px;margin-bottom:8px;"><img src="${esc(i.image)}" alt="" style="width:50px;height:60px;object-fit:cover;border-radius:4px;"><div style="flex:1;"><div style="font-size:13px;font-weight:500;">${esc(i.name)}</div><div style="font-size:11px;color:#6b6862;font-family:monospace;">SKU: ${esc(i.sku)}</div><div style="display:flex;justify-content:space-between;margin-top:5px;font-size:12px;"><span>Qty: ${i.quantity}</span><span style="font-weight:600;">${formatCurrency(i.price)}</span></div></div></div>`).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;">
      <div><h4 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:10px;">Customer</h4><div style="background:var(--cream);padding:15px;border-radius:4px;font-size:13px;"><div style="font-weight:500;margin-bottom:5px;">${esc(o.customer)}</div><div style="color:#666;margin-bottom:3px;">📞 ${esc(o.phone)}</div><div style="color:#666;">✉️ ${esc(o.email) || '—'}</div></div></div>
      <div><h4 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:10px;">Pricing</h4><div style="background:var(--cream);padding:15px;border-radius:4px;font-size:13px;"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="color:#666;">Subtotal:</span><span>${formatCurrency(o.pricing.subtotal)}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="color:#666;">Shipping:</span><span>${formatCurrency(o.pricing.shipping)}</span></div>${o.pricing.discount ? `<div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="color:#666;">Discount${discountNote(o)}:</span><span>- ${formatCurrency(o.pricing.discount)}</span></div>` : ''}<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);font-weight:600;font-size:15px;"><span>Total:</span><span>${formatCurrency(o.pricing.total)}</span></div></div></div>
    </div>
    ${orderExtraHTML(o)}
  `);
}

function nextInvoiceId() {
  const nums = [...db.invoices.map(i => i.id), ...db.orders.map(o => o.invoiceId)].filter(Boolean).map(id => parseInt(String(id).split('-').pop(), 10) || 0);
  return `${db.settings.invoicePrefix}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

function confirmOrderAndSendInvoice(orderId) {
  const o = db.orders.find(x => x.id === orderId);
  if (!o || o.status !== 'placed' || o.invoiceGenerated) return;
  o.status = 'confirmed'; o.timeline.push({ status: 'confirmed', time: getTimestamp(), note: 'Order confirmed and invoice generated' });
  const invId = nextInvoiceId();
  o.invoiceGenerated = true; o.invoiceId = invId;
  db.invoices.push({ id: invId, orderId: o.id, customer: o.customer, email: o.email || '', phone: o.phone, amount: o.total, date: ymd(new Date()), status: 'sent', template: db.settings.selectedTemplate, items: o.items, shippingAddress: o.shippingAddress, pricing: o.pricing });
  addLog('order_confirmed', `Order ${o.id}`, '-', 0, 0, 0, `Order confirmed, invoice ${invId} generated`);
  addLog('invoice_sent', invId, '-', 0, 0, 0, `Invoice ${invId} generated for ${o.customer}`);
  saveDB(); renderAdminContent('orders');
  const cu = db.users.find(x => x.id === o.userId), optIn = !!(cu && cu.consents && cu.consents.orderUpdates);
  showToast(`Invoice ${invId} generated. ${optIn ? 'Customer opted in to WhatsApp order updates (demo: nothing is actually sent).' : 'Customer has NOT opted in to WhatsApp updates - do not message them.'}`, optIn ? 'success' : 'error');
}

function updateOrderStatus(orderId, newStatus) {
  const o = db.orders.find(x => x.id === orderId); if (!o || o.status === newStatus) return;
  const old = o.status, restocked = [];
  if (old === 'cancelled' && newStatus !== 'cancelled' && o.restocked) {
    // re-reserving stock for a revived order
    const short = o.items.find(i => { const p = db.products.find(x => x.id === i.productId); return p && p.stock < i.quantity; });
    if (short) { alert(`Cannot reopen: not enough stock for ${short.name}.`); renderAdminContent('orders'); return; }
    o.items.forEach(i => { const p = db.products.find(x => x.id === i.productId); if (p) { const prev = p.stock; p.stock -= i.quantity; addLog('stock_out', p.name, p.sku, -i.quantity, prev, p.stock, `Order ${o.id} reopened`); } });
    o.restocked = false;
  }
  o.status = newStatus;
  const askShip = newStatus === 'shipped';
  if (newStatus === 'cancelled' && !o.restocked) {
    o.items.forEach(i => { const p = db.products.find(x => x.id === i.productId); if (p) { const prev = p.stock; p.stock += i.quantity; addLog('stock_in', p.name, p.sku, i.quantity, prev, p.stock, `Order ${o.id} cancelled`); if (prev <= 0) restocked.push(p); } });
    o.restocked = true;
  }
  o.timeline.push({ status: newStatus, time: getTimestamp(), note: `Status changed from ${old} to ${newStatus}` });
  addLog('status_update', `Order ${orderId}`, '-', 0, 0, 0, `Status: ${old} → ${newStatus}`);
  saveDB(); renderAdminContent('orders'); renderProducts(); buildScrollTrack();
  restocked.forEach(afterRestock);
  if (askShip) openShipDialog(orderId);
}

