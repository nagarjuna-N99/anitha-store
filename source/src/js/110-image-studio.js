// ================= IMAGE STUDIO =================
// Batch editor built for live work: big stage that fills the screen, collapsible controls, filmstrip,
// full-screen mode, keyboard shortcuts. Colour-safe: no brightness/contrast/saturation filters are ever applied.
const STUDIO_SIZES = {
  product: { w: 800, h: 1000, label: 'Product Card' }, square: { w: 1000, h: 1000, label: 'Square' },
  hero: { w: 1920, h: 1080, label: 'Hero Banner' }, journal: { w: 1200, h: 800, label: 'Journal' },
  category: { w: 600, h: 800, label: 'Category' }, thumb: { w: 400, h: 400, label: 'Thumbnail' }
};
const SKU_CATEGORIES = [['TUS', 'Tussar'], ['MHS', 'Maheswari'], ['BNR', 'Banarasi'], ['KNC', 'Kanjeevaram'], ['PHT', 'Paithani'], ['MYS', 'Mysore Silk'], ['KHD', 'Ponduru Khadi'], ['ORG', 'Organza'], ['CHN', 'Chanderi'], ['BHG', 'Bhagalpuri']];
const STUDIO_BGS = [['#FAF9F6', 'Ivory'], ['#FFFFFF', 'White'], ['#F5F1EA', 'Cream'], ['#D4C4A8', 'Gold'], ['transparent', 'Transparent']];

const S = {
  images: [], current: 0, size: 'product', bg: '#FAF9F6', fitMode: 'cover', quality: 90, oneProduct: true,
  sku: { on: false, cat: '', size: 16, opacity: 90, position: 'bottom-right', font: 'mono', color: '#2C2C2C', boxColor: '#FFFFFF', box: true, shadow: true },
  wm: { on: false, text: 'Anitha Pemmasani', size: 24, opacity: 70, rotation: 0, color: '#2C2C2C', font: 'serif' },
  logo: { on: false, img: null, name: '', size: 120, opacity: 100 },
  wmPos: { x: 0.5, y: 0.9 }, logoPos: { x: 0.5, y: 0.5 },
  open: { sku: false, wm: false, logo: false, export: false }, focus: false, panel: true,
  drag: null, boxes: {}, lockToastAt: 0, raf: 0, ro: null
};
const sGet = path => path.split('.').reduce((o, k) => o[k], S);
function sSet(path, val) { const k = path.split('.'); const last = k.pop(); k.reduce((o, x) => o[x], S)[last] = val; }
const gid = id => document.getElementById(id);
const curImg = () => S.images[S.current];
const pad3 = n => String(n).padStart(3, '0');

// ---- generic control handlers (all live: they redraw on the next animation frame) ----
function scheduleDraw() { if (!S.raf) S.raf = requestAnimationFrame(() => { S.raf = 0; drawStudioCanvas(); }); }
function studioChanged() { studioInvalidate(true); scheduleDraw(); }
function sIn(path, val) { sSet(path, val); if (path === 'sku.cat') regenSkus(); studioChanged(); }
function sSlider(path, val, unit, labelId) { sSet(path, +val); gid(labelId).textContent = val + unit; studioChanged(); }
function sToggle(path, el, sec) {
  const v = !sGet(path); sSet(path, v); el.classList.toggle('active', v); el.setAttribute('aria-checked', v);
  if (sec && v && !S.open[sec]) { S.open[sec] = true; gid('acc-' + sec).classList.add('open'); }
  studioChanged();
}
function accToggle(k) { S.open[k] = !S.open[k]; gid('acc-' + k).classList.toggle('open', S.open[k]); }
function markActive(sel, attr, val) { document.querySelectorAll(sel).forEach(el => el.classList.toggle('active', el.dataset[attr].toLowerCase() === String(val).toLowerCase())); }
function setSize(k) { S.size = k; markActive('[data-size]', 'size', k); studioChanged(); }
function setFit(v) { S.fitMode = v; markActive('[data-fit]', 'fit', v); studioChanged(); }
function setBg(v) {
  S.bg = v; markActive('[data-bg]', 'bg', v);
  const cp = gid('bgCustom'); if (cp) { if (/^#[0-9a-f]{6}$/i.test(v)) cp.value = v; cp.classList.toggle('active', !STUDIO_BGS.some(b => b[0].toLowerCase() === v.toLowerCase())); }
  studioChanged();
}

// ---- SKU ----
function nextSkuStart(code) {
  const re = new RegExp('^AP-' + code + '-(\\d+)$'); let max = 0;
  [...db.products.map(p => p.sku), ...db.drafts.map(d => d.sku)].forEach(s => { const m = re.exec(s || ''); if (m) max = Math.max(max, +m[1]); });
  return max + 1;
}
function regenSkus() {
  const code = S.sku.cat, start = code ? nextSkuStart(code) : 0;
  if (S.oneProduct) { // all photos belong to one product → one shared code
    const auto = code ? `AP-${code}-${pad3(start)}` : 'AP-XXX-001', man = S.images.find(i => i.manualSku);
    S.images.forEach(im => { im.sku = man ? man.sku : auto; im.manualSku = !!man; });
  } else {
    let n = start;
    S.images.forEach(im => { if (!im.manualSku) im.sku = code ? `AP-${code}-${pad3(n++)}` : 'AP-XXX-001'; });
  }
  refreshSkuUI(); refreshFilm();
}
function manualSku(val) {
  const im = curImg(); if (!im) return;
  val = val.trim().toUpperCase();
  const targets = S.oneProduct ? S.images : [im];
  targets.forEach(t => { t.manualSku = !!val; if (val) t.sku = val; });
  if (!val) regenSkus();
  refreshSkuUI(); refreshFilm(); studioInvalidate(S.oneProduct); scheduleDraw();
}
function studioSkuAuto() { S.images.forEach(i => { if (S.oneProduct || i === curImg()) i.manualSku = false; }); regenSkus(); studioInvalidate(S.oneProduct); scheduleDraw(); }
function refreshSkuUI() {
  const im = curImg(), input = gid('skuInput'); if (!input) return;
  if (document.activeElement !== input) input.value = im ? im.sku : '';
  gid('skuAuto').style.display = im && im.manualSku ? '' : 'none';
}
function studioToggleMode() { S.oneProduct = !S.oneProduct; regenSkus(); studioRerender(); showToast(S.oneProduct ? '📦 All photos are now ONE product' : '🗂 Each photo is now a separate product'); }
function studioMove(d) {
  const i = S.current, j = i + d; if (j < 0 || j >= S.images.length) return;
  [S.images[i], S.images[j]] = [S.images[j], S.images[i]]; S.current = j; refreshFilm(); updateStudioControls();
  showToast(j === 0 ? '★ Set as cover photo' : 'Photo moved');
}

// ---- image batch ----
function makeThumb(img) {
  const c = document.createElement('canvas'); c.height = 120; c.width = Math.max(1, Math.min(240, Math.round(120 * img.width / img.height)));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.6);
}
function newStudioItem(name, img, extra = {}) {
  return Object.assign({ id: Date.now() + Math.random(), name, img, thumb: makeThumb(img), pz: { scale: 1, offsetX: 0, offsetY: 0 }, locked: false, sku: 'AP-XXX-001', manualSku: false, processed: null, draftId: null }, extra);
}
function studioAddFiles(files) {
  const list = [...files].filter(f => /^image\//.test(f.type));
  if (!list.length) { showToast('Please choose image files', 'error'); return; }
  let pending = list.length, added = 0;
  const done = () => {
    if (--pending > 0) return;
    if (!added) { showToast('Could not read those images', 'error'); return; }
    S.current = S.images.length - added; // jump to the first newly added image
    regenSkus(); studioRerender(); showToast(`${added} image(s) added`, 'success');
  };
  list.forEach(file => {
    const url = URL.createObjectURL(file); const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); S.images.push(newStudioItem(file.name, im)); added++; done(); };
    im.onerror = () => { URL.revokeObjectURL(url); done(); };
    im.src = url;
  });
}
function studioSelect(i) {
  if (!S.images[i]) return;
  S.current = i; refreshFilm(); updateStudioControls(); drawStudioCanvas();
}
function studioRemove(i) {
  const im = S.images[i]; if (!im) return;
  if (im.processed) URL.revokeObjectURL(im.processed.url);
  S.images.splice(i, 1);
  S.current = Math.max(0, Math.min(S.current > i ? S.current - 1 : S.current, S.images.length - 1));
  regenSkus(); studioRerender();
}
function studioClear() {
  if (!S.images.length || !confirm('Remove all images and reset the studio?')) return;
  S.images.forEach(im => { if (im.processed) URL.revokeObjectURL(im.processed.url); });
  S.images = []; S.current = 0; studioRerender(); showToast('All cleared');
}
function studioRerender() { if (currentAdminTab === 'studio' && isAdminView) renderImageStudio(gid('adminContent')); }
function studioInvalidate(all) {
  (all ? S.images : [curImg()]).forEach(im => { if (im && im.processed) { URL.revokeObjectURL(im.processed.url); im.processed = null; } });
}
function filmHTML() {
  const n = S.images.length, one = S.oneProduct && n > 1;
  return S.images.map((im, i) => `<div class="film-item ${i === S.current ? 'active' : ''}" onclick="studioSelect(${i})" title="${esc(im.name)}"><img src="${esc(im.thumb)}" alt="">${one && i === 0 ? '<div class="film-cover">★ Cover</div>' : ''}<div class="film-sku">${im.locked ? '🔒 ' : ''}${one ? 'Photo ' + (i + 1) : esc(im.sku)}</div><button class="film-x" aria-label="Remove image" onclick="event.stopPropagation();studioRemove(${i})">×</button>${one && i === S.current ? `<div class="film-move"><button aria-label="Move earlier" onclick="event.stopPropagation();studioMove(-1)" ${i === 0 ? 'disabled' : ''}>‹</button><button aria-label="Move later" onclick="event.stopPropagation();studioMove(1)" ${i === n - 1 ? 'disabled' : ''}>›</button></div>` : ''}</div>`).join('')
    + `<div class="film-item film-add" onclick="gid('studioFileInput').click()" title="Add images">＋</div>`;
}
function refreshFilm() { if (gid('studioFilm')) gid('studioFilm').innerHTML = filmHTML(); }

// ---- zoom / lock / nudge ----
function lockToast() { const n = Date.now(); if (n - S.lockToastAt > 1500) { S.lockToastAt = n; showToast('🔒 Position is locked. Click Unlock to adjust.', 'error'); } }
function afterMove() { studioInvalidate(false); scheduleDraw(); updateStudioControls(); }
function studioZoomBy(f) { const im = curImg(); if (!im) return; if (im.locked) { lockToast(); return; } im.pz.scale = Math.max(0.3, Math.min(5, im.pz.scale * f)); afterMove(); }
function studioZoomTo(v) { const im = curImg(); if (!im) return; if (im.locked) { lockToast(); updateStudioControls(); return; } im.pz.scale = Math.max(0.3, Math.min(5, v / 100)); afterMove(); }
function studioResetZoom() { const im = curImg(); if (!im) return; if (im.locked) { lockToast(); return; } im.pz = { scale: 1, offsetX: 0, offsetY: 0 }; afterMove(); showToast('Zoom reset to 100%'); }
function studioNudge(dx, dy) { const im = curImg(); if (!im) return; if (im.locked) { lockToast(); return; } im.pz.offsetX += dx; im.pz.offsetY += dy; afterMove(); }
function studioToggleLock() {
  const im = curImg(); if (!im) return; im.locked = !im.locked;
  updateStudioControls(); refreshFilm();
  showToast(im.locked ? '🔒 Position locked for this image' : '🔓 Position unlocked', im.locked ? 'success' : '');
}
function updateStudioControls() {
  if (!gid('zSlider')) return;
  const im = curImg(), has = !!im;
  ['zIn', 'zOut', 'zSlider', 'zReset', 'zLock'].forEach(id => gid(id).disabled = !has);
  if (!has) return;
  const pct = Math.round(im.pz.scale * 100);
  gid('zSlider').value = pct; gid('zLevel').textContent = pct + '%';
  gid('zLock').textContent = im.locked ? '🔒 Locked' : '🔓 Lock'; gid('zLock').classList.toggle('locked', im.locked);
  gid('stageHint').style.opacity = im.locked ? 0.45 : 1;
  refreshSkuUI();
}
function studioToggleFocus() { S.focus = !S.focus; studioRerender(); }
function studioTogglePanel() { S.panel = !S.panel; studioRerender(); }
function studioKeys(e) {
  if (!isAdminView || currentAdminTab !== 'studio' || !curImg() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('.modal.active')) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target || {}).tagName || '')) return;
  const step = e.shiftKey ? 50 : 10, k = e.key; let used = true;
  if (k === 'ArrowLeft') studioNudge(-step, 0); else if (k === 'ArrowRight') studioNudge(step, 0);
  else if (k === 'ArrowUp') studioNudge(0, -step); else if (k === 'ArrowDown') studioNudge(0, step);
  else if (k === '+' || k === '=') studioZoomBy(1.1); else if (k === '-' || k === '_') studioZoomBy(0.9);
  else if (k === '0') studioResetZoom(); else if (k === 'l' || k === 'L') studioToggleLock();
  else if (k === '[') studioSelect(Math.max(0, S.current - 1)); else if (k === ']') studioSelect(Math.min(S.images.length - 1, S.current + 1));
  else if (k === 'f' || k === 'F') studioToggleFocus();
  else if ((k === ',' || k === '<') && S.oneProduct) studioMove(-1); else if ((k === '.' || k === '>') && S.oneProduct) studioMove(1); else used = false;
  if (used) e.preventDefault();
}
document.addEventListener('keydown', studioKeys);

// ---- rendering (shared by the live view and the export) ----
function renderStudioTo(canvas, im) {
  const ctx = canvas.getContext('2d'), size = STUDIO_SIZES[S.size];
  canvas.width = size.w; canvas.height = size.h;
  if (S.bg === 'transparent') ctx.clearRect(0, 0, size.w, size.h); else { ctx.fillStyle = S.bg; ctx.fillRect(0, 0, size.w, size.h); }
  const img = im.img, pz = im.pz, ir = img.width / img.height, cr = size.w / size.h;
  let bw, bh;
  if (S.fitMode === 'contain') { if (ir > cr) { bw = size.w; bh = size.w / ir; } else { bh = size.h; bw = size.h * ir; } }
  else { if (ir > cr) { bh = size.h; bw = size.h * ir; } else { bw = size.w; bh = size.w / ir; } }
  const dw = bw * pz.scale, dh = bh * pz.scale;
  ctx.drawImage(img, (size.w - dw) / 2 + pz.offsetX, (size.h - dh) / 2 + pz.offsetY, dw, dh); // colour-safe: no filters
  S.boxes = {};
  if (S.sku.on) drawSku(ctx, size, im.sku);
  if (S.wm.on) drawWatermark(ctx, size);
  if (S.logo.on && S.logo.img) drawLogo(ctx, size);
}
// Size the canvas to fill the stage (up or down) while keeping its aspect ratio.
function fitStage() {
  const st = gid('studioStage'), c = gid('studioCanvas'); if (!st || !c || !c.width) return;
  const k = Math.min((st.clientWidth - 24) / c.width, (st.clientHeight - 34 - 24) / c.height); // 34px at the bottom is reserved for the hint line
  if (k > 0) { c.style.width = Math.floor(c.width * k) + 'px'; c.style.height = Math.floor(c.height * k) + 'px'; }
}
function drawStudioCanvas() {
  const im = curImg(), c = gid('studioCanvas'); if (!im || !c) return;
  renderStudioTo(c, im); fitStage();
  const size = STUDIO_SIZES[S.size];
  if (gid('studioReadout')) gid('studioReadout').textContent = `${size.w} × ${size.h}px · ${Math.round(im.pz.scale * 100)}%`;
}
function drawSku(ctx, size, text) {
  const t = S.sku, pad = 24, bp = 10;
  ctx.save(); ctx.globalAlpha = t.opacity / 100;
  const fam = t.font === 'mono' ? "'JetBrains Mono', monospace" : t.font === 'serif' ? "'Cormorant Garamond', serif" : "'Inter', sans-serif";
  const wt = t.font === 'bold' ? '700' : t.font === 'sans' ? '500' : '600';
  ctx.font = `${t.font === 'serif' ? 'italic ' : ''}${wt} ${t.size}px ${fam}`;
  const w = ctx.measureText(text).width, bw = w + bp * 2, bh = t.size + bp * 2, pos = t.position;
  const bx = pos.includes('left') ? pad : pos.includes('right') ? size.w - pad - bw : (size.w - bw) / 2;
  const by = pos.includes('top') ? pad : pos.includes('bottom') ? size.h - pad - bh : (size.h - bh) / 2;
  if (t.box) { ctx.fillStyle = t.boxColor; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = 'rgba(166,124,82,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh); }
  if (t.shadow) { ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1; }
  ctx.fillStyle = t.color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bp, by + bh / 2);
  ctx.restore();
}
function drawWatermark(ctx, size) {
  const w = S.wm, x = S.wmPos.x * size.w, y = S.wmPos.y * size.h;
  ctx.save(); ctx.globalAlpha = w.opacity / 100; ctx.translate(x, y); ctx.rotate(w.rotation * Math.PI / 180);
  const fam = w.font === 'sans-serif' ? "'Inter', sans-serif" : "'Cormorant Garamond', serif";
  ctx.font = `${w.font === 'italic' ? 'italic ' : w.font === 'bold' ? 'bold ' : ''}${w.size}px ${fam}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
  ctx.fillStyle = w.color;
  const text = w.text || 'Anitha Pemmasani';
  ctx.fillText(text, 0, 0);
  S.boxes.wm = { x, y, w: ctx.measureText(text).width, h: w.size * 1.2 };
  ctx.restore();
}
function drawLogo(ctx, size) {
  const l = S.logo, x = S.logoPos.x * size.w, y = S.logoPos.y * size.h;
  const dw = l.size, dh = l.size / (l.img.width / l.img.height);
  ctx.save(); ctx.globalAlpha = l.opacity / 100; ctx.drawImage(l.img, x - dw / 2, y - dh / 2, dw, dh); ctx.restore();
  S.boxes.logo = { x, y, w: dw, h: dh };
}

// ---- drag (image / watermark / logo) ----
function studioCoords(c, e) { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; }
const boxHit = (b, p) => b && Math.abs(p.x - b.x) <= b.w / 2 + 20 && Math.abs(p.y - b.y) <= b.h / 2 + 20;
function bindStudio() {
  const c = gid('studioCanvas');
  if (c) {
    c.addEventListener('pointerdown', e => {
      const im = curImg(); if (!im) return;
      if (im.locked) { lockToast(); return; }
      const p = studioCoords(c, e), size = STUDIO_SIZES[S.size];
      if (S.logo.on && S.logo.img && boxHit(S.boxes.logo, p)) S.drag = { kind: 'logo', dx: p.x - S.logoPos.x * size.w, dy: p.y - S.logoPos.y * size.h };
      else if (S.wm.on && boxHit(S.boxes.wm, p)) S.drag = { kind: 'wm', dx: p.x - S.wmPos.x * size.w, dy: p.y - S.wmPos.y * size.h };
      else S.drag = { kind: 'image', dx: p.x - im.pz.offsetX, dy: p.y - im.pz.offsetY };
      c.setPointerCapture(e.pointerId); c.classList.add('dragging');
    });
    c.addEventListener('pointermove', e => {
      const d = S.drag, im = curImg(); if (!d || !im) return;
      e.preventDefault();
      const p = studioCoords(c, e), size = STUDIO_SIZES[S.size], clamp = v => Math.max(0, Math.min(1, v));
      if (d.kind === 'logo') { S.logoPos.x = clamp((p.x - d.dx) / size.w); S.logoPos.y = clamp((p.y - d.dy) / size.h); }
      else if (d.kind === 'wm') { S.wmPos.x = clamp((p.x - d.dx) / size.w); S.wmPos.y = clamp((p.y - d.dy) / size.h); }
      else { im.pz.offsetX = p.x - d.dx; im.pz.offsetY = p.y - d.dy; }
      studioInvalidate(d.kind !== 'image'); scheduleDraw();
    });
    const end = () => { S.drag = null; c.classList.remove('dragging'); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', e => { e.preventDefault(); studioZoomBy(e.deltaY > 0 ? 0.9 : 1.1); }, { passive: false });
    c.addEventListener('dblclick', () => studioResetZoom());
  }
  const st = gid('studioStage');
  if (st) {
    st.addEventListener('dragover', e => { e.preventDefault(); st.classList.add('dragging'); });
    st.addEventListener('dragleave', e => { if (e.target === st) st.classList.remove('dragging'); });
    st.addEventListener('drop', e => { e.preventDefault(); st.classList.remove('dragging'); studioAddFiles(e.dataTransfer.files); });
    if (S.ro) S.ro.disconnect();
    if (window.ResizeObserver) { S.ro = new ResizeObserver(() => fitStage()); S.ro.observe(st); }
  }
}
function studioLogoUpload(ev) {
  const file = ev.target.files[0]; if (!file) return;
  if (!/^image\//.test(file.type)) { showToast('Please choose an image file', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => { S.logo.img = img; S.logo.name = file.name; gid('logoLabel').textContent = '✓ ' + file.name; S.logo.on = true; const t = gid('tg-logo'); if (t) t.classList.add('active'); studioChanged(); showToast('Logo loaded', 'success'); };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file); ev.target.value = '';
}

// ---- processing / export (images are processed automatically when you download, save or post) ----
function studioProcess(im) {
  return new Promise(res => {
    const c = document.createElement('canvas'); renderStudioTo(c, im);
    const png = S.bg === 'transparent', type = png ? 'image/png' : 'image/jpeg', q = S.quality / 100; // JPEG has no alpha, so transparent exports as PNG
    c.toBlob(blob => blob ? res({ blob, url: URL.createObjectURL(blob), dataUrl: c.toDataURL(type, q), ext: png ? 'png' : 'jpg' }) : res(null), type, q);
  });
}
function studioOverlay() {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:3000;backdrop-filter:blur(4px);';
  ov.innerHTML = `<div style="background:white;padding:40px 50px;border-radius:12px;text-align:center;max-width:400px;"><div style="width:50px;height:50px;border:3px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div><div style="font-family:'Playfair Display',serif;font-size:22px;margin-bottom:8px;">Processing images...</div><div style="font-size:12px;color:#6b6862;margin-bottom:16px;" class="ov-sub">Initializing</div><div style="width:100%;height:4px;background:var(--border);border-radius:2px;overflow:hidden;"><div class="ov-fill" style="height:100%;background:var(--gold);transition:width .3s;width:0%;"></div></div></div>`;
  document.body.appendChild(ov);
  return { set(t, f) { ov.querySelector('.ov-sub').textContent = t; ov.querySelector('.ov-fill').style.width = (f * 100) + '%'; }, close() { ov.remove(); } };
}
async function studioEnsure(list, label) {
  const todo = list.filter(im => !im.processed); if (!todo.length) return true;
  const ov = todo.length > 1 ? studioOverlay() : null;
  try {
    for (let i = 0; i < todo.length; i++) {
      if (ov) ov.set(`${label || 'Processing'} ${i + 1} of ${todo.length}...`, (i + 1) / todo.length);
      const r = await studioProcess(todo[i]);
      if (!r) { showToast('Could not process ' + todo[i].name, 'error'); return false; }
      todo[i].processed = r;
    }
    return true;
  } finally { if (ov) ov.close(); }
}
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
async function studioDownloadAll() {
  if (!S.images.length || !(await studioEnsure(S.images))) return;
  const used = {};
  const files = S.images.map(im => {
    let n = `${im.name.replace(/\.[^/.]+$/, '')}_${S.size}.${im.processed.ext}`;
    if (used[n]) n = n.replace(/(\.\w+)$/, `_${used[n]++}$1`); else used[n] = 1;
    return { name: n, blob: im.processed.blob };
  });
  if (files.length === 1) { saveBlob(files[0].blob, files[0].name); showToast('✅ Image downloaded', 'success'); return; }
  if (window.JSZip) {
    showToast('📦 Creating ZIP...');
    const zip = new JSZip(), folder = zip.folder(`AP_Saree_Images_${S.size}`);
    files.forEach(f => folder.file(f.name, f.blob));
    saveBlob(await zip.generateAsync({ type: 'blob' }), `AP_Saree_Images_${S.size}_${Date.now()}.zip`);
    showToast('✅ ZIP downloaded!', 'success');
  } else {
    files.forEach((f, i) => setTimeout(() => saveBlob(f.blob, f.name), i * 300));
    showToast('ZIP library unavailable offline - downloading files individually');
  }
}

// ---- drafts / publish ----
const draftDate = () => new Date().toLocaleDateString('en-IN');
async function studioSaveDrafts(all) {
  if (S.oneProduct) return studioSaveProductDraft();
  const list = all ? S.images : [curImg()].filter(Boolean); if (!list.length) return;
  if (!(await studioEnsure(list, 'Saving'))) return;
  const backup = db.drafts.slice(), assigned = [];
  list.forEach((im, n) => {
    const old = im.draftId ? db.drafts.find(x => x.id === im.draftId) : null;
    const d = Object.assign({}, old || {}, { id: im.draftId || Date.now() + n, image: im.processed.dataUrl, images: [im.processed.dataUrl], sku: im.sku, size: S.size, date: draftDate(), bg: S.bg, name: (old && old.name) || cleanName(im.name) || im.sku, category: (old && old.category) || catFromSku(im.sku) });
    const idx = im.draftId ? db.drafts.findIndex(x => x.id === im.draftId) : -1;
    if (idx >= 0) db.drafts[idx] = d; else { db.drafts.unshift(d); im.draftId = d.id; assigned.push(im); }
  });
  if (!saveDB()) { db.drafts = backup; assigned.forEach(im => im.draftId = null); return; }
  showToast(`💾 ${list.length} draft(s) saved`, 'success');
  if (list.length === 1 && list[0].draftId && db.drafts.some(x => x.id === list[0].draftId)) openDraftDetails(list[0].draftId, true);
  else if (list.length > 1) { showToast('Open Saved Drafts to add details, or press ✨ Fill all with AI', ''); }
}
// One product, many photos → ONE draft holding every photo in order (cover first).
async function studioSaveProductDraft() {
  if (!S.images.length) return;
  if (!(await studioEnsure(S.images, 'Saving'))) return;
  const first = S.images[0], did = (S.images.find(i => i.draftId) || {}).draftId, old = did ? db.drafts.find(x => x.id === did) : null;
  const imgs = S.images.map(i => i.processed.dataUrl), backup = db.drafts.slice();
  const d = Object.assign({}, old || {}, { id: old ? old.id : Date.now(), name: (old && old.name) || cleanName(first.name) || first.sku, sku: first.sku, images: imgs, image: imgs[0], size: S.size, bg: S.bg, date: draftDate(), category: (old && old.category) || catFromSku(first.sku) });
  if (old) db.drafts[db.drafts.findIndex(x => x.id === old.id)] = d; else db.drafts.unshift(d);
  if (!saveDB()) { db.drafts = backup; return; }
  S.images.forEach(i => i.draftId = d.id);
  showToast(`💾 Draft saved — 1 product with ${imgs.length} photo${imgs.length > 1 ? 's' : ''}`, 'success');
  openDraftDetails(d.id, true);
}
function studioContext(list) {
  const first = list[0], d = db.drafts.find(x => x.id === first.draftId) || {};
  return { d, name: d.name || cleanName(first.name), category: d.category || catFromSku(first.sku) || db.categories[0] || '' };
}
async function studioPost() {
  const list = S.oneProduct ? S.images : [curImg()].filter(Boolean); if (!list.length) return;
  if (!(await studioEnsure(list, 'Preparing'))) return;
  const { d, name, category } = studioContext(list);
  pendingDraftId = list[0].draftId;
  openProductForm(null, Object.assign({}, d, { id: undefined, images: list.map(i => i.processed.dataUrl), sku: list[0].sku, name, category }));
}
async function studioPreview() {
  const list = S.oneProduct ? S.images : [curImg()].filter(Boolean); if (!list.length) return;
  if (!(await studioEnsure(list, 'Preparing preview'))) return;
  const { d, name, category } = studioContext(list), imgs = list.map(i => i.processed.dataUrl);
  const c = localCopy({ name, category, colours: await dominantColours(imgs[0]) }, 0);
  openPreview({ id: 'studio-preview', name: name || 'Untitled product', sku: list[0].sku, category, price: d.price || 0, stock: 1, images: imgs, image: imgs[0], video: d.video || '', description: d.description || c.description, tags: d.tags && d.tags.length ? d.tags : c.tags, seoTitle: d.seoTitle || c.seoTitle, metaDescription: d.metaDescription || c.metaDescription, slug: d.slug || slugify(name), altText: d.altText || c.altText });
}

function deleteDraft(index) { if (!confirm('Delete this draft?')) return; db.drafts.splice(index, 1); saveDB(); renderAdminContent('drafts'); }
function clearAllDrafts() { if (!confirm('Delete all drafts?')) return; db.drafts = []; saveDB(); renderAdminContent('drafts'); }
function publishDraft(index) { const d = db.drafts[index]; if (!d) return; pendingDraftId = d.id; openProductForm(null, Object.assign({}, d, { id: undefined, category: d.category || catFromSku(d.sku) })); }
async function editDraft(index) {
  const d = db.drafts[index]; if (!d) return;
  if (S.images.length && !confirm('Replace the photos currently in the studio with this draft?')) return;
  let loaded;
  try { loaded = await Promise.all(draftImages(d).map(src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }))); }
  catch (e) { showToast('Could not load that draft', 'error'); return; }
  S.images.forEach(im => { if (im.processed) URL.revokeObjectURL(im.processed.url); });
  S.images = loaded.map((im, k) => newStudioItem(`${d.name || d.sku} ${k + 1}`, im, { sku: d.sku, manualSku: true, draftId: d.id }));
  S.oneProduct = true; S.current = 0; S.size = d.size in STUDIO_SIZES ? d.size : 'product'; if (d.bg) S.bg = d.bg; S.fitMode = 'cover';
  switchAdminTab('studio');
}

// ---- UI ----
function renderImageStudio(container) {
  const oldSide = container.querySelector('.studio-side'), keepScroll = oldSide ? oldSide.scrollTop : 0;
  const has = S.images.length > 0, im = curImg(), many = S.images.length > 1;
  document.body.classList.toggle('studio-focus', S.focus);
  const lab = t => `<label class="mini-label">${t}</label>`;
  const sl = (id, label, path, min, max, unit = '') => `<div class="slider-group"><div class="slider-label"><span>${label}</span><span id="sv-${id}">${sGet(path)}${unit}</span></div><input type="range" min="${min}" max="${max}" value="${sGet(path)}" oninput="sSlider('${path}',this.value,'${unit}','sv-${id}')"></div>`;
  const tgl = (path, sec, id) => `<div class="toggle ${sGet(path) ? 'active' : ''}" ${id ? `id="${id}"` : ''} role="switch" tabindex="0" aria-checked="${!!sGet(path)}" onclick="event.stopPropagation();sToggle('${path}',this${sec ? `,'${sec}'` : ''})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();sToggle('${path}',this${sec ? `,'${sec}'` : ''})}"></div>`;
  const row = (label, path) => `<div class="toggle-row"><span class="toggle-label">${label}</span>${tgl(path)}</div>`;
  const sel = (path, list) => `<select class="input-field" onchange="sIn('${path}',this.value)">${list.map(([v, l]) => `<option value="${v}" ${sGet(path) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const col = (path, title) => `<input type="color" class="input-field color-pick" value="${esc(sGet(path))}" title="${title}" oninput="sIn('${path}',this.value)">`;
  const acc = (key, title, body, togglePath) => `<div class="acc ${S.open[key] ? 'open' : ''}" id="acc-${key}"><div class="acc-head" onclick="accToggle('${key}')"><span class="acc-title">${title}</span>${togglePath ? tgl(togglePath, key, 'tg-' + key) : ''}<span class="acc-caret">▾</span></div><div class="acc-body">${body}</div></div>`;
  const isHex = /^#[0-9a-f]{6}$/i.test(S.bg), customActive = !STUDIO_BGS.some(b => b[0].toLowerCase() === S.bg.toLowerCase());
  const size = STUDIO_SIZES[S.size];

  const side = `
    <div class="studio-side studio-controls">
      <div class="acc open always">
        <div class="acc-head" style="cursor:default"><span class="acc-title">Position &amp; Zoom</span><span class="mono" id="zLevel" style="font-size:13px;font-weight:600;">100%</span></div>
        <div class="acc-body">
          <div class="zoom-row"><button class="zoom-btn" id="zOut" onclick="studioZoomBy(0.9)" disabled aria-label="Zoom out" title="Zoom out (−)">−</button><input type="range" id="zSlider" min="30" max="500" value="100" oninput="studioZoomTo(this.value)" disabled><button class="zoom-btn" id="zIn" onclick="studioZoomBy(1.1)" disabled aria-label="Zoom in" title="Zoom in (+)">+</button></div>
          <div class="zoom-row" style="margin-top:8px;"><button class="btn-sm" id="zReset" onclick="studioResetZoom()" disabled style="flex:1;padding:9px;background:white;border:1px solid var(--border);" title="Reset zoom &amp; position (0)">⟲ Reset</button><button class="btn-sm btn-lock" id="zLock" onclick="studioToggleLock()" disabled style="flex:1;padding:9px;" title="Lock this image (L)">🔓 Lock</button></div>
          ${lab('Image fit')}
          <div class="seg">${[['cover', 'Cover'], ['contain', 'Contain']].map(([v, l]) => `<div class="seg-btn ${S.fitMode === v ? 'active' : ''}" data-fit="${v}" onclick="setFit('${v}')">${l}</div>`).join('')}</div>
        </div>
      </div>
      <div class="acc open always">
        <div class="acc-head" style="cursor:default"><span class="acc-title">Canvas</span></div>
        <div class="acc-body">
          <div class="size-grid">${Object.entries(STUDIO_SIZES).map(([k, v]) => `<div class="size-btn ${S.size === k ? 'active' : ''}" data-size="${k}" onclick="setSize('${k}')">${v.label}<small>${v.w} × ${v.h}</small></div>`).join('')}</div>
          ${lab('Background')}
          <div class="bg-row">${STUDIO_BGS.map(([v, l]) => `<div class="bg-swatch ${v === 'transparent' ? 'transparent' : ''} ${S.bg.toLowerCase() === v.toLowerCase() ? 'active' : ''}" data-bg="${v}" style="${v === 'transparent' ? '' : 'background:' + v}" title="${l}" onclick="setBg('${v}')"></div>`).join('')}<input type="color" id="bgCustom" class="bg-swatch bg-custom ${customActive ? 'active' : ''}" value="${isHex ? S.bg : '#FAF9F6'}" title="Custom colour" oninput="setBg(this.value)"></div>
        </div>
      </div>
      ${acc('sku', 'Product Code (SKU)', `
        ${lab('Category (auto-numbers every image)')}
        <select class="input-field" onchange="sIn('sku.cat',this.value)"><option value="">— Select category —</option>${SKU_CATEGORIES.map(([c, n]) => `<option value="${c}" ${S.sku.cat === c ? 'selected' : ''}>${n}</option>`).join('')}</select>
        ${lab(S.oneProduct ? 'Product code (shared by all photos)' : 'Code on this image')}
        <div class="input-row"><input type="text" id="skuInput" class="input-field mono" value="${esc(im ? im.sku : '')}" ${has ? '' : 'disabled'} oninput="manualSku(this.value)" onblur="refreshSkuUI()" style="flex:1;"><button class="btn-sm" id="skuAuto" onclick="studioSkuAuto()" style="display:none;flex:0 0 auto;background:white;border:1px solid var(--border);" title="Go back to the automatic number">↺ Auto</button></div>
        ${sl('skuSize', 'Font size', 'sku.size', 10, 40)}${sl('skuOp', 'Opacity', 'sku.opacity', 30, 100, '%')}
        <div class="input-row"><div>${lab('Position')}${sel('sku.position', [['top-left', 'Top Left'], ['top-right', 'Top Right'], ['bottom-left', 'Bottom Left'], ['bottom-right', 'Bottom Right'], ['center', 'Center']])}</div><div>${lab('Font')}${sel('sku.font', [['mono', 'Monospace'], ['sans', 'Sans Serif'], ['serif', 'Serif'], ['bold', 'Bold']])}</div></div>
        <div class="input-row" style="margin-top:10px;">${col('sku.color', 'Text colour')}${col('sku.boxColor', 'Box background')}</div>
        ${row('Border box', 'sku.box')}${row('Shadow', 'sku.shadow')}`, 'sku.on')}
      ${acc('wm', 'Watermark', `
        <input type="text" class="input-field" value="${esc(S.wm.text)}" placeholder="Watermark text" oninput="sIn('wm.text',this.value)" style="margin-bottom:10px;">
        ${sl('wmSize', 'Size', 'wm.size', 10, 80)}${sl('wmOp', 'Opacity', 'wm.opacity', 10, 100, '%')}${sl('wmRot', 'Rotation', 'wm.rotation', -45, 45, '°')}
        <div class="input-row">${col('wm.color', 'Colour')}<div style="flex:2;">${sel('wm.font', [['serif', 'Serif (Elegant)'], ['sans-serif', 'Sans Serif'], ['italic', 'Italic'], ['bold', 'Bold']])}</div></div>`, 'wm.on')}
      ${acc('logo', 'Logo Overlay', `
        <button class="btn-sm" style="width:100%;padding:10px;background:white;border:1px dashed var(--gold);margin-bottom:10px;" onclick="gid('logoInput').click()"><span id="logoLabel">${S.logo.img ? '✓ ' + esc(S.logo.name) : '＋ Upload logo (PNG)'}</span></button>
        <input type="file" id="logoInput" accept="image/*" hidden onchange="studioLogoUpload(event)">
        ${sl('logoSize', 'Size', 'logo.size', 40, 400)}${sl('logoOp', 'Opacity', 'logo.opacity', 10, 100, '%')}`, 'logo.on')}
      ${acc('export', 'Export Quality', `${sl('quality', 'JPEG quality', 'quality', 70, 100, '%')}<div class="note">Transparent backgrounds export as PNG. Drafts and products are stored in this browser, so lower quality keeps more of them.</div>`)}
    </div>`;

  container.innerHTML = `
    <div class="studio-app ${S.panel ? '' : 'panel-hidden'}">
      ${side}
      <div class="studio-main">
        <div class="studio-bar">
          <button class="btn-sm btn-info-sm" onclick="gid('studioFileInput').click()">＋ Add images</button>
          <button class="btn-sm ${S.oneProduct ? 'btn-primary-sm' : 'btn-info-sm'}" onclick="studioToggleMode()" title="One product: all photos are saved together as a single product. Separate: every photo becomes its own product.">${S.oneProduct ? `📦 One product · ${S.images.length} photo${S.images.length === 1 ? '' : 's'}` : '🗂 Separate products'}</button>
          <span class="studio-readout" id="studioReadout">${size.w} × ${size.h}px</span>
          <span class="safe-chip" title="No brightness, contrast, saturation or warmth filters are ever applied">🛡️ Colour-safe</span>
          <span style="flex:1"></span>
          <button class="btn-sm btn-info-sm" onclick="studioTogglePanel()" title="Show or hide the controls">${S.panel ? '⇤ Hide controls' : '⇥ Show controls'}</button>
          <button class="btn-sm btn-info-sm" onclick="studioToggleFocus()" title="Full screen editing (F)">${S.focus ? '✕ Exit full screen' : '⛶ Full screen'}</button>
          <span class="bar-sep"></span>
          <button class="btn-sm btn-info-sm" onclick="studioPreview()" ${has ? '' : 'disabled'} title="See how it will look in your shop">👁 Preview</button>
          <button class="btn-sm btn-success-sm" onclick="studioDownloadAll()" ${has ? '' : 'disabled'}>${many ? '📦 Download ZIP' : '⬇ Download'}</button>
          <button class="btn-sm btn-info-sm" onclick="studioSaveDrafts(false)" ${has ? '' : 'disabled'}>${S.oneProduct ? '💾 Save product draft' : '💾 Save Draft'}</button>
          ${many && !S.oneProduct ? `<button class="btn-sm btn-info-sm" onclick="studioSaveDrafts(true)">💾 Save all ${S.images.length}</button>` : ''}
          <button class="btn-sm btn-primary-sm" onclick="studioPost()" ${has ? '' : 'disabled'}>🚀 Publish product</button>
          <button class="btn-sm btn-danger-sm" onclick="studioClear()" ${has ? '' : 'disabled'} title="Remove all images">↺ Clear</button>
        </div>
        <input type="file" id="studioFileInput" accept="image/*" multiple hidden onchange="studioAddFiles(this.files);this.value=''">
        <div class="studio-stage" id="studioStage">
          <div class="studio-empty" id="studioEmpty" style="${has ? 'display:none;' : ''}" onclick="gid('studioFileInput').click()">
            <div style="font-size:44px;">📸</div>
            <h3>Drop saree images here</h3>
            <p>or click to choose files — JPG, PNG or WebP, any number at once.</p>
          </div>
          <canvas id="studioCanvas" style="display:${has ? 'block' : 'none'};"></canvas>
          <div class="stage-hint" id="stageHint" style="${has ? '' : 'display:none;'}">Drag to move (watermark &amp; logo too) · Scroll or +/− to zoom · Arrows nudge (Shift ×5) · L lock · [ ] switch photo · , . reorder · F full screen</div>
        </div>
        <div class="film" id="studioFilm">${filmHTML()}</div>
      </div>
    </div>`;
  bindStudio();
  refreshSkuUI();
  updateStudioControls();
  if (has) drawStudioCanvas();
  const ns = container.querySelector('.studio-side'); if (ns) ns.scrollTop = keepScroll;
}

