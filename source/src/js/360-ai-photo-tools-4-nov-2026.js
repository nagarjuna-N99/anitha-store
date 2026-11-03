// ================= AI & photo tools, 4 Nov 2026 =================
// ---- photo quality + duplicate check (runs in the browser, no AI, no cost) ----
const PH_CACHE = new Map();
function phLoad(src) { return new Promise((res, rej) => { const im = new Image(); if (/^https?:/i.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('load')); im.src = src; }); }
function phGray(im, cw, ch) { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, cw, ch); const d = x.getImageData(0, 0, cw, ch).data, g = new Float32Array(cw * ch); for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; return g; }
async function phAnalyze(src) {
  if (PH_CACHE.has(src)) return PH_CACHE.get(src);
  const im = await phLoad(src), w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 192 / Math.max(w, h)), cw = Math.max(9, Math.round(w * k)), ch = Math.max(9, Math.round(h * k));
  const g = phGray(im, cw, ch); let sum = 0; for (let i = 0; i < g.length; i++) sum += g[i];
  let ls = 0, ls2 = 0, n = 0; for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) { const i = y * cw + x, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - cw] - g[i + cw]; ls += l; ls2 += l * l; n++; }
  const blur = n ? ls2 / n - (ls / n) * (ls / n) : 0, hg = phGray(im, 9, 8); let hash = ''; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hash += hg[y * 9 + x] > hg[y * 9 + x + 1] ? '1' : '0';
  const r = { w, h, blur, bright: sum / g.length, hash }; PH_CACHE.set(src, r); return r;
}
const phDist = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };
function phIssues(a, others) {
  const out = [], mn = Math.min(a.w, a.h);
  if (mn < 600) out.push(['bad', `Small photo (${a.w}×${a.h}). It will look soft on phones and Instagram. Use at least 1080 px wide.`]); else if (mn < 900) out.push(['warn', `Photo is ${a.w}×${a.h}; 1080 px wide is better for Instagram.`]);
  if (a.blur < 25) out.push(['bad', 'Looks blurry. Retake it holding the phone steady, in daylight.']); else if (a.blur < 45) out.push(['warn', 'Slightly soft. Check it at full size before posting.']);
  if (a.bright < 70) out.push(['warn', 'Quite dark. Daylight near a window shows the true colour of a saree.']); else if (a.bright > 225) out.push(['warn', 'Very bright, details may be washed out.']);
  const dup = others.find(o => phDist(a.hash, o.hash) <= 5); if (dup) out.push(['bad', `Looks the same as ${dup.where}. Is this a duplicate?`]);
  return out;
}
async function phOthers(selfIdx) {
  const list = [];
  for (let i = 0; i < PF.images.length; i++) if (i !== selfIdx) { try { list.push({ ...(await phAnalyze(PF.images[i])), where: `your photo ${i + 1} in this product` }); } catch (e) {} }
  for (const p of db.products) { if (PF.id && p.id === PF.id) continue; for (const src of (p.images || [p.image]).filter(Boolean).slice(0, 2)) { try { list.push({ ...(await phAnalyze(src)), where: `a photo of “${p.name}”` }); } catch (e) {} } }
  return list;
}
async function pfPhotoCheck() {
  const box = gid_('pf-photocheck'); if (!box) return; if (!PF.images.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="note">📷 Checking photos…</div>'; const rows = [];
  for (let i = 0; i < PF.images.length; i++) {
    try { const a = await phAnalyze(PF.images[i]), iss = phIssues(a, await phOthers(i)); rows.push(`<div class="ph-row ${iss.some(x => x[0] === 'bad') ? 'bad' : iss.length ? 'warn' : 'ok'}"><b>Photo ${i + 1}</b> ${iss.length ? iss.map(x => esc(x[1])).join(' ') : '✓ Sharp, well lit, not a duplicate.'}</div>`); }
    catch (e) { rows.push(`<div class="ph-row"><b>Photo ${i + 1}</b> could not be checked.</div>`); }
  }
  if (gid_('pf-photocheck')) gid_('pf-photocheck').innerHTML = rows.join('');
}
// ---- one click: read the photos, then write the whole listing ----
// ---- one click for the whole product form, and automatic fill when the category changes ----
function pfCodeFor(cat) { const f = SKU_CATEGORIES.find(([, n]) => n.toLowerCase() === String(cat).toLowerCase()); if (f) return f[0]; const w = String(cat).replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w.map(x => x[0]).join('') + w[0].slice(1) : (w[0] || 'XXX')).slice(0, 3).toUpperCase().padEnd(3, 'X'); }
function pfSkuFor(cat) { const code = pfCodeFor(cat); let n = nextSkuStart(code); return `AP-${code}-${pad3(n)}`; }
function pfApplySku() { if (PF.id || PF.skuTouched) return false; const sku = pfSkuFor(PF.category); if (sku === PF.sku) return false; PF.sku = sku; const i = gid_('p-sku'); if (i) i.value = sku; return true; }
let PF_AUTO = 0;
async function pfCategoryChanged() {
  const skuChanged = pfApplySku(), id = ++PF_AUTO, st = gid_('pf-ai-status'), accessory = isAccessory({ category: PF.category });
  if (PF.descTouched && PF.tagsTouched && PF.seoTouched) { if (skuChanged && st) st.textContent = '✨ SKU updated for ' + PF.category; return; }
  const out = await aiCopy({ name: PF.name.trim() || (PF.category + (accessory ? '' : ' Saree')), category: PF.category, sku: PF.sku, price: PF.price, images: PF.images, colours: PF.colours && PF.colours.length ? PF.colours : undefined }, 0);
  if (id !== PF_AUTO) return; // a newer choice is already being written
  if (!PF.colours || !PF.colours.length) { PF.colours = out.colours || []; pfRenderColours(); }
  if (!PF.descTouched) { PF.description = out.description; const d = gid_('p-desc'); if (d) d.value = out.description; }
  if (!PF.tagsTouched) { PF.tags = out.tags.slice(0, 20); pfRenderTags(); }
  if (!PF.seoTouched) { PF.seoTitle = out.seoTitle; PF.metaDescription = out.metaDescription; PF.altText = out.altText; ['pf-seo-title', 'pf-meta', 'pf-alt'].forEach((k, i) => { const e = gid_(k); if (e) e.value = [PF.seoTitle, PF.metaDescription, PF.altText][i]; }); }
  if (!PF.slugTouched && PF.name.trim()) { PF.slug = slugify(PF.name); const sl = gid_('pf-slug'); if (sl) sl.value = PF.slug; }
  pfRenderMeta(); PF.source = out.source; if (st) st.textContent = `✨ filled for ${PF.category}${skuChanged ? ', SKU ' + PF.sku : ''}: description, tags and SEO (edit freely; what you typed is kept)`;
}
async function pfAutoAll() {
  const btn = gid_('pf-auto'); if (!btn || btn.disabled) return; const st = gid_('pf-ai-status'), say = t => { if (st) st.textContent = t; }, did = [], claude = aiReady('describe'), lang = (gid_('pf-lang') || {}).value || PF.lang || 'en';
  btn.disabled = true; const old = btn.textContent; btn.textContent = '✨ Working…'; PF.lang = lang; PF_AUTO++;
  try {
    if (PF.images[0] && aiReady('photo')) { say('📷 reading the photo…'); if (await pfAiPhoto(true)) did.push('photo'); }
    if (!PF.name.trim()) { const nm = [(PF.colours || [])[0], PF.fabric, isAccessory({ category: PF.category }) ? PF.category : 'Saree'].filter(Boolean).join(' ') || (PF.category + ' Saree'); PF.name = nm; const n = gid_('p-name'); if (n) n.value = nm; did.push('name'); }
    if (pfApplySku()) did.push('SKU');
    say('✨ writing the description, tags and SEO…'); let wrote = false;
    if (claude) wrote = await pfAiDescribe(true);
    if (!wrote) { PF.descTouched = false; await pfGenerate('all', true); did.push(claude ? 'description, tags and SEO (built-in, Claude was busy)' : 'description, tags and SEO'); } else did.push('description, tags and SEO (Claude)');
    PF.descTouched = false; PF.tagsTouched = false; PF.seoTouched = false; pfPhotoCheck();
    const note = lang !== 'en' && !wrote ? ' The built-in writer writes English only; connect Claude for ' + (AI_LANGS.find(x => x[0] === lang) || [0, lang])[1] + '.' : '';
    say('✨ ' + did.join(', ') + ' done: please read and edit before publishing.' + note); showToast('✨ All filled in one go. Review it.', 'success');
  } catch (e) { say(''); showToast(aiMsg(e), 'error'); }
  btn.disabled = false; btn.textContent = old;
}
const pfAiAll = pfAutoAll;
// ---- weekly business note on the dashboard ----
const isoWeekKey = () => { const d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-W' + String(Math.ceil(((t - y) / 86400000 + 1) / 7)).padStart(2, '0'); };
let WK_BUSY = false, WK_FAILED = false;
function dashWeeklyShow(w, busyMsg, err) {
  const box = el_('dash-weekly'); if (!box) return;
  box.innerHTML = `<h3>🗓️ This week at a glance ${w ? `<span class="pf-sub">${w.via === 'claude' ? '· written by Claude' : '· built-in summary'}</span>` : ''}</h3>${busyMsg ? `<div class="ai-busy">✨ ${esc(busyMsg)}</div>` : ''}${err ? `<div class="ai-err">${esc(err)}</div>` : ''}${w ? `<div class="wk-text">${esc(w.text).replace(/\n/g, '<br>')}</div>` : ''}<div class="ai-act"><button type="button" class="btn-sm btn-info-sm" onclick="dashWeekly(true)" ${WK_BUSY ? 'disabled' : ''}>↻ ${w ? 'Write it again' : 'Write this week’s note'}</button>${w ? `<button type="button" class="btn-sm btn-info-sm" onclick="copyText(db.settings.weekly.text,'Note copied')">Copy</button>` : ''}</div>`;
}
async function dashWeekly(force) {
  if (!el_('dash-weekly')) return; const key = isoWeekKey(), w = db.settings.weekly;
  if (!force && w && w.key === key) { dashWeeklyShow(w); return; }
  if (WK_BUSY || (!force && WK_FAILED)) { dashWeeklyShow(w); return; }
  WK_BUSY = true; dashWeeklyShow(w, 'writing your weekly note…');
  try { const d = aiShopData(7); let text, via = 'built-in'; if (aiReady('summary')) { text = (await aiCall('summary', { stats: d, lang: 'en' })).text; via = 'claude'; } else text = localSummary(d); db.settings.weekly = { key, text, via, at: nowISO() }; saveDB(); WK_BUSY = false; dashWeeklyShow(db.settings.weekly); }
  catch (e) { WK_BUSY = false; WK_FAILED = true; dashWeeklyShow(w, null, aiMsg(e)); }
}
// ---- follow-ups: returning customers, with a drafted message you send yourself ----
function fuSent() { db.settings.followups = db.settings.followups || {}; return db.settings.followups; }
function fuCandidates() {
  const today = ymd(new Date()), sent = fuSent(), out = [], last = {};
  db.orders.filter(o => o.status !== 'cancelled' && o.userId).forEach(o => { if (!last[o.userId] || o.date > last[o.userId].date) last[o.userId] = o; });
  let hidden = 0;
  Object.values(last).forEach(o => {
    const u = db.users.find(x => x.id === o.userId); if (!u || !u.phone) return; const c = u.consents || {}, first = String(u.name || o.customer || '').split(/\s+/)[0] || '';
    const days = Math.round((new Date(today) - new Date(o.date)) / 86400000), recent = k => sent[u.id + '|' + k] && Math.round((new Date(today) - new Date(sent[u.id + '|' + k])) / 86400000) < 30;
    const items = (o.items || []).map(i => i.name).slice(0, 2), cat = ((o.items || [])[0] || {}).category || '';
    if (o.status === 'delivered' && days >= 7 && days <= 45 && !db.reviews.some(r => r.orderId === o.id)) { if (!c.orderUpdates) hidden++; else if (!recent('review')) out.push({ uid: u.id, seg: 'review', first, phone: u.phone, items, cat, days, order: o.id }); }
    else if (days >= 60) { if (!c.marketing) hidden++; else if (!recent('dormant')) out.push({ uid: u.id, seg: 'dormant', first, phone: u.phone, items, cat, days, order: o.id }); }
  });
  return { rows: out.sort((a, b) => b.days - a.days).slice(0, 40), hidden };
}
function fuHTML() {
  const { rows, hidden } = fuCandidates(), lab = { review: 'Recently delivered, no review yet', dormant: 'Past buyer, 60+ days ago' };
  return `<p class="note">Only customers who agreed to WhatsApp messages are listed (order updates for review requests, offers for the rest). ${hidden ? `${hidden} other customer(s) are not listed because they did not agree.` : ''} Anyone you contact is hidden for 30 days. You press send; nothing goes out by itself.</p>
    ${rows.length ? rows.map((r, i) => `<div class="fu-row" id="fu-${i}"><div><b>${esc(r.first || 'Customer')}</b> · ${esc(lab[r.seg])} · ${r.days} days ago<div class="note" style="margin:0;">${esc(r.items.join(', '))}</div></div><button type="button" class="btn-sm btn-primary-sm" onclick="fuDraft(${i})">✨ Draft message</button><div class="fu-out" id="fu-out-${i}"></div></div>`).join('') : '<p class="note">Nobody to follow up with right now.</p>'}`;
}
function fuLocal(r) { const hi = r.first ? `Hi ${r.first}, ` : 'Hello, '; return r.seg === 'review' ? `${hi}we hope you are enjoying your saree from ${BRAND()}. 💛 If you have a minute, a short review (photos welcome) would mean a lot to us.\nReply STOP if you prefer not to get messages.` : `${hi}it has been a while! New handloom pieces have arrived at ${BRAND()}. Message us if you would like to see a few.\nReply STOP if you prefer not to get messages.`; }
async function fuDraft(i) {
  const r = fuCandidates().rows[i]; if (!r) return; busy('fu-out-' + i, 'drafting…'); let text;
  try { text = aiReady('followup') ? (await aiCall('followup', { segment: r.seg, firstName: r.first, items: r.items, category: r.cat, daysSince: r.days, siteUrl: db.settings.siteUrl || '', lang: 'en' })).text.trim() : fuLocal(r); } catch (e) { outBox('fu-out-' + i, `<div class="ai-err">${esc(aiMsg(e))}</div>`); return; }
  outBox('fu-out-' + i, `<textarea rows="4" id="fu-t-${i}">${esc(text)}</textarea><div class="ai-act"><button type="button" class="btn-sm btn-primary-sm" onclick="fuOpen(${i})" style="background:#25D366;border-color:#25D366;">Open WhatsApp to send</button><button type="button" class="btn-sm btn-info-sm" onclick="copyText(el_('fu-t-${i}').value,'Copied')">Copy</button></div>${aiReady('followup') ? '' : '<p class="note">Built-in wording (connect Claude for a more personal draft).</p>'}`);
}
function fuOpen(i) {
  const r = fuCandidates().rows[i], t = el_('fu-t-' + i); if (!r || !t) return; const ph = waPhone(r.phone); if (!ph) return showToast('No phone number', 'error');
  fuSent()[r.uid + '|' + r.seg] = ymd(new Date()); saveDB(); window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(t.value), '_blank', 'noopener');
  const row = el_('fu-' + i); if (row) row.classList.add('done'); showToast('Marked as contacted. Hidden for 30 days.', 'success');
}
// ---- Instagram caption pack: English + Telugu, hashtags, status line ----
function packLocal(p) {
  const f = [p.fabric, ...(p.colours || []).slice(0, 2)].filter(Boolean).join(', '), oo = oneOfAKind(p) ? ' A single designer piece.' : '';
  const base = `${p.name}${f ? ' (' + f + ')' : ''}.${oo} DM or WhatsApp us to order.`;
  return { en: { caption: base, hashtags: ['handloomsaree', 'hyderabadsarees', 'sareelove', 'designersaree', 'ethnicwear', 'sareesofinstagram'] }, te: { caption: `${p.name}. ఆర్డర్ కోసం మాకు DM లేదా WhatsApp చేయండి.`, hashtags: ['handloomsaree', 'telugusarees', 'sareelove'] }, status: { en: `New: ${p.name}. Message us to order.`, te: `కొత్తగా: ${p.name}. ఆర్డర్ కోసం మెసేజ్ చేయండి.` }, local: true };
}
async function igPack() {
  const p = IGD && IGD.p; if (!p) return; busy('ig-pack', 'writing the English and Telugu pack…'); let d;
  try { d = aiReady('captionpack') ? (await aiCall('captionpack', { name: p.name, category: p.category, fabric: p.fabric, colours: p.colours, occasions: occasionsOf(p), description: p.description, price: p.price, oneOfAKind: oneOfAKind(p) })).data : packLocal(p); } catch (e) { outBox('ig-pack', `<div class="ai-err">${esc(aiMsg(e))}</div>`); return; }
  IGD.pack = d; const tags = a => (a || []).map(h => '#' + String(h).replace(/[^\w]/g, '')).filter(h => h.length > 1).join(' ');
  const card = (k, lab) => `<div class="ai-draft"><b>${lab}</b><textarea rows="4" readonly>${esc((d[k] || {}).caption || '')}\n\n${esc(tags((d[k] || {}).hashtags))}</textarea><div class="ai-act"><button type="button" class="btn-sm btn-primary-sm" onclick="igUsePack('${k}')">Use this caption</button><button type="button" class="btn-sm btn-info-sm" onclick="igCopyPack('${k}')">Copy</button></div></div>`;
  outBox('ig-pack', `${d.local ? '<p class="note">Built-in wording (connect Claude for a personal pack).</p>' : ''}${card('en', 'English')}${card('te', 'తెలుగు Telugu')}${d.status ? `<div class="ai-draft"><b>WhatsApp status line</b><textarea rows="2" readonly>${esc((d.status.en || '') + '\n' + (d.status.te || ''))}</textarea><div class="ai-act"><button type="button" class="btn-sm btn-info-sm" onclick="copyText(IGD.pack.status.en + '\\n' + IGD.pack.status.te,'Copied')">Copy</button></div></div>` : ''}`);
}
const igPackText = k => { const d = (IGD.pack || {})[k] || {}, h = (d.hashtags || []).map(x => '#' + String(x).replace(/[^\w]/g, '')).filter(x => x.length > 1).join(' '); return (d.caption || '') + (h ? '\n\n' + h : ''); };
function igUsePack(k) { const t = el_('ig-cap'); if (t) { t.value = igPackText(k); igCount(); showToast('Caption replaced. Check it before posting.', 'success'); } }
function igCopyPack(k) { copyText(igPackText(k), 'Copied'); }

// ---- saved drafts, grouped by category (inside Products, and on the Saved Drafts tab) ----
function draftCat(d) { return d.category || catFromSku(d.sku) || 'No category yet'; }
function draftCardHTML(d) {
  const i = db.drafts.indexOf(d), imgs = draftImages(d), r = draftReady(d), cat = d.category || catFromSku(d.sku) || '';
  const facts = [d.name && !/^AP-[A-Z]{3}-\d+$/i.test(d.name) ? esc(d.name) : '<i>no name yet</i>', cat ? esc(cat) : '<i>no category</i>', d.price > 0 ? '₹ ' + money(d.price) : '<i>no price</i>', `${draftStock(d)} pc`].join(' · ');
  return `<div class="draft-card ${r.ok ? 'is-ready' : 'needs'}" data-id="${esc(String(d.id))}"><div class="draft-cover"><img src="${esc(imgs[0])}" alt="${esc(d.name || d.sku)}"><span class="draft-n">📷 ${imgs.length}</span><span class="draft-state ${r.ok ? 'ok' : 'warn'}">${r.ok ? '✅ Ready to post' : '⚠ Needs details'}</span>${imgs.length > 1 ? `<div class="draft-strip">${imgs.slice(1, 5).map(s => `<img src="${esc(s)}" alt="">`).join('')}${imgs.length > 5 ? `<span>+${imgs.length - 5}</span>` : ''}</div>` : ''}</div>
    <div class="draft-card-body"><h5>${esc(d.sku)}</h5><p class="dc-facts">${facts}</p>
    ${r.ok ? `<p class="dc-sub">${esc(fitText(d.description, 90))}</p>${r.tips.length ? `<p class="dc-tip">Nice to add: ${r.tips.join(', ')}</p>` : ''}` : `<p class="dc-miss">Missing: <b>${r.missing.join(', ')}</b></p>`}
    <div class="draft-card-actions">${r.ok ? `<button class="btn-sm btn-primary-sm dc-post" onclick="draftPostNow(${typeof d.id === 'number' ? d.id : `'${esc(String(d.id))}'`})">🚀 Post now</button>` : `<button class="btn-sm btn-primary-sm dc-add" onclick="openDraftDetails(${typeof d.id === 'number' ? d.id : `'${esc(String(d.id))}'`})">✏️ Add details</button>`}<button class="btn-sm btn-info-sm" onclick="${r.ok ? `openDraftDetails(${typeof d.id === 'number' ? d.id : `'${esc(String(d.id))}'`})` : `previewDraft(${i})`}">${r.ok ? '✏️ Details' : '👁 Preview'}</button><button class="btn-sm btn-info-sm" onclick="previewDraft(${i})" aria-label="Preview">${r.ok ? '👁' : ''}</button><button class="btn-sm btn-info-sm" onclick="publishDraft(${i})" title="Open the full product form">Full form</button><button class="btn-sm btn-info-sm" onclick="editDraft(${i})" title="Edit the photos in Image Studio">🎨</button><button class="btn-sm btn-danger-sm" onclick="deleteDraft(${i})" aria-label="Delete draft">🗑️</button></div></div></div>`;
}
let DRAFT_OPEN = {};
function draftsByCategoryHTML(compact) {
  if (!db.drafts.length) return `<div class="admin-card drafts-by-cat" style="text-align:center;padding:30px 20px;"><div style="font-size:34px;">📝</div><h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;margin:8px 0;">No drafts saved yet</h3><p style="color:#666;font-size:14px;margin-bottom:14px;">Edit photos in Image Studio and save them as a product draft. You will be asked for the details, with AI help.</p><button class="btn-sm btn-primary-sm" onclick="switchAdminTab('studio')">🎨 Go to Image Studio</button></div>`;
  const ready = db.drafts.filter(d => draftReady(d).ok).length, need = db.drafts.length - ready, F = DRAFT_FILTER.v;
  const shown = db.drafts.filter(d => F === 'all' || (F === 'ready') === draftReady(d).ok), groups = {}; shown.forEach(d => { (groups[draftCat(d)] = groups[draftCat(d)] || []).push(d); });
  const known = [...db.categories, ...db.accessoryCategories, 'No category yet'], order = known.filter(c => groups[c]).concat(Object.keys(groups).filter(c => !known.includes(c)));
  return `<div class="drafts-by-cat"><div class="dbc-head"><h3>📝 Saved drafts by category <span class="pf-sub">(${db.drafts.length})</span></h3>
    <div class="dbc-bar"><div class="seg" role="tablist" aria-label="Show">${[['all', `All ${db.drafts.length}`], ['ready', `✅ Ready ${ready}`], ['need', `⚠ Needs details ${need}`]].map(([k, l]) => `<button type="button" class="${F === k ? 'on' : ''}" onclick="draftSetFilter('${k}')">${l}</button>`).join('')}</div>
      <button class="btn-sm btn-primary-sm" id="drafts-post-all" onclick="draftsPostAllReady()" ${ready ? '' : 'disabled'}>🚀 Post all ready (${ready})</button><button class="btn-sm btn-info-sm" id="drafts-fill-all" onclick="draftsFillAll()" ${need ? '' : 'disabled'}>✨ Fill all with AI</button></div>
    <div class="dbc-chips">${order.map(c => `<button type="button" class="dbc-chip" onclick="draftToggle('${esc(c).replace(/'/g, '&#39;')}', true)">${esc(c)} <b>${groups[c].length}</b></button>`).join('')}</div></div>
    ${order.length ? order.map(c => `<details class="dbc-group" data-cat="${esc(c)}" ${DRAFT_OPEN[c] !== false && (!compact || DRAFT_OPEN[c] || order.length === 1) ? 'open' : ''} ontoggle="DRAFT_OPEN[this.dataset.cat]=this.open"><summary><span>${esc(c)}</span><b>${groups[c].filter(d => draftReady(d).ok).length}/${groups[c].length} ready</b></summary><div class="drafts-grid">${groups[c].map(draftCardHTML).join('')}</div></details>`).join('') : '<div class="dash-empty">No drafts in this view.</div>'}</div>`;
}
function draftToggle(cat) { DRAFT_OPEN[cat] = true; const d = [...document.querySelectorAll('.dbc-group')].find(x => x.dataset.cat === cat); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }

// ---- add-to-cart success animation: the button becomes a green disc with a check, "N in your cart" ----
function cartCount() { return cart.reduce((s, c) => s + c.qty, 0); }
function cartAnim(btn) {
  const n = cartCount(), reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let o = document.getElementById('atcPop'); if (o) o.remove();
  o = document.createElement('div'); o.id = 'atcPop'; o.className = 'atc-pop' + (reduce ? ' still' : ''); o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite');
  o.innerHTML = `<div class="atc-card"><svg class="atc-disc" viewBox="0 0 120 120" aria-hidden="true"><circle class="atc-ring" cx="60" cy="60" r="52"/><circle class="atc-fill" cx="60" cy="60" r="46"/><path class="atc-check" d="M38 62 L54 77 L84 45"/></svg><div class="atc-text"><b>${n}</b> in your cart</div></div>`;
  document.body.appendChild(o);
  if (btn && btn.classList) { btn.classList.add('atc-btn-done'); setTimeout(() => btn.classList.remove('atc-btn-done'), 1300); }
  setTimeout(() => { o.classList.add('out'); setTimeout(() => o.remove(), 260); }, reduce ? 900 : 1250);
}
