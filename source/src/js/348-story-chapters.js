// ================= STORY CHAPTERS ON THE HOME PAGE =================
// Short "moments" by occasion: a big photo panel with a title, a line of weaves, a quote in the shop's own words and three category tiles.
// The owner writes them in Owner app → Home Page → Moments. Use *word* in a title to set that word in italics.
const CH_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function chaptersDefault() {
  return { show: true, size: 'standard', items: [
    { id: 'ch1', show: true, title: 'A Tuesday *morning.*', words: 'Everyday · Tussar · Ponduru Khadi · Mysore Silk', quote: 'Light enough to forget you are wearing it, and kind enough to last the whole working day.', by: 'Anitha Pemmasani', image: '', tiles: [{ category: 'Tussar', image: '' }, { category: 'Ponduru Khadi', image: '' }, { category: 'Mysore Silk', image: '' }], link: 'See these sarees' },
    { id: 'ch2', show: true, title: 'A cousin’s *wedding.*', words: 'Occasion · Maheswari · Banarasi · Paithani', quote: 'Not the bride, and not in the front row, but the one whose saree people still ask about the next morning.', by: 'Anitha Pemmasani', image: '', tiles: [{ category: 'Maheswari', image: '' }, { category: 'Banarasi', image: '' }, { category: 'Paithani', image: '' }], link: 'See these sarees' },
    { id: 'ch3', show: true, title: 'A festival, *at home.*', words: 'Festive · Kanjeevaram · Banarasi', quote: 'Lamps on the window sill, flowers at the door, and a silk that has waited all year for this morning.', by: 'Anitha Pemmasani', image: '', tiles: [{ category: 'Kanjeevaram', image: '' }, { category: 'Banarasi', image: '' }, { category: 'Paithani', image: '' }], link: 'See these sarees' }
  ] };
}
function chaptersGet() { const c = db.home && db.home.chapters; return c && Array.isArray(c.items) ? c : chaptersDefault(); }
const chLink = c => { const l = String((c && c.link) || '').trim(); return !l || /^Enter this chapter$/i.test(l) ? 'See these sarees' : l; };
const chEsc = t => esc(String(t || '')).replace(/\*([^*]+)\*/g, '<em>$1</em>');
function renderHomeChapters() {
  const sec = document.getElementById('homeChapters'); if (!sec) return; const C = chaptersGet(), items = C.items.filter(c => c.show !== false);
  if (C.show === false || !items.length) { sec.innerHTML = ''; sec.style.display = 'none'; return; }
  sec.style.display = ''; sec.dataset.size = chSizeOf();
  sec.innerHTML = items.map((c, n) => {
    const img = safeImg(c.image), tiles = (c.tiles || []).filter(t => t && db.categories.includes(t.category)).slice(0, 6), first = tiles[0] ? tiles[0].category : '';
    return `<article class="chap" aria-label="${esc(String(c.title || '').replace(/\*/g, ''))}"><div class="chap-hero"${img ? ` style="background-image:url('${esc(img).replace(/'/g, '%27')}')"` : ''}><div class="chap-in"><span class="chap-no">Moment ${CH_ROMAN[n] || n + 1}</span><h2 class="chap-title">${chEsc(c.title)}</h2>${c.words ? `<p class="chap-words">${esc(c.words)}</p>` : ''}</div></div>
      ${c.quote ? `<blockquote class="chap-quote"><p>“${esc(String(c.quote).replace(/^[“"]|[”"]$/g, ''))}”</p>${c.by ? `<cite>— ${esc(c.by)}</cite>` : ''}</blockquote>` : ''}
      ${tiles.length ? `<div class="chap-tiles">${tiles.map(t => { const im = safeImg(t.image) || catTileImage({ category: t.category, image: '' }); return `<div class="chap-tile" role="link" tabindex="0" data-cat="${esc(t.category)}" onclick="filterAndShowShop(this.dataset.cat)" onkeydown="if(event.key==='Enter')filterAndShowShop(this.dataset.cat)">${im ? `<img src="${esc(im)}" alt="${esc(t.category)} sarees" loading="lazy" onerror="this.style.display='none'">` : ''}<span>${esc(t.category)} →</span></div>`; }).join('')}</div>` : ''}
      ${first ? `<a class="chap-enter" role="link" tabindex="0" data-cat="${esc(first)}" onclick="filterAndShowShop(this.dataset.cat)" onkeydown="if(event.key==='Enter')filterAndShowShop(this.dataset.cat)">${esc(chLink(c))} →</a>` : ''}</article>`;
  }).join('');
}
// ---- owner: edit the moments ----
function chData() { if (!db.home.chapters || !Array.isArray(db.home.chapters.items)) db.home.chapters = chaptersDefault(); return db.home.chapters; }
function chLive(redraw) { renderHomeChapters(); homeSaveSoon(); if (redraw) { const c = el_('adminContent'); if (c) renderHomeAdmin(c); } }
function chSet(i, k, v) { const c = chData().items[i]; if (c) { c[k] = v; chLive(false); } }
function chRemoveImg(i) { const c = chData().items[i]; if (!c) return; c.image = ''; chLive(true); showToast('Photo removed. The panel is plain dark again.', 'success'); }
function chTileToggle(i, cat) {
  const c = chData().items[i]; if (!c || !db.categories.includes(cat)) return; c.tiles = (c.tiles || []).filter(t => t && t.category);
  const k = c.tiles.findIndex(t => t.category === cat);
  if (k >= 0) c.tiles.splice(k, 1); else { if (c.tiles.length >= 6) return showToast('Up to 6 collections under one moment. Untick one first.', 'error'); c.tiles.push({ category: cat, image: '' }); }
  chLive(true);
}
function chTileMove(i, k, d) { const c = chData().items[i]; if (!c || !c.tiles) return; const j = k + d; if (j < 0 || j >= c.tiles.length) return; [c.tiles[k], c.tiles[j]] = [c.tiles[j], c.tiles[k]]; chLive(true); }
function chTileOwn(i, k) { homePick('ctile', i + ',' + k); }
function chTileOwnClear(i, k) { const c = chData().items[i]; if (c && c.tiles && c.tiles[k]) { c.tiles[k].image = ''; chLive(true); } }
function chAiRow(i) { chAi(i).then(() => { const e = el_('ch-ai'); if (e) e.scrollIntoView({ block: 'center' }); }); }
function chEdit(i) { const d = document.querySelectorAll('#chapters-card .ch-item')[i]; if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } }
// one size for ALL the moments on the home page (chosen once, applied to every moment)
const CH_SIZES = [['compact', 'Compact', 'A slim band. Quick to scroll past.'], ['standard', 'Standard', 'The calm default.'], ['large', 'Large', 'A wide, tall panel with big words, like a magazine opening.'], ['full', 'Full screen', 'Edge to edge and almost the height of the screen.']];
const chSizeOf = () => { const k = (chaptersGet() || {}).size; return CH_SIZES.some(x => x[0] === k) ? k : 'standard'; };
function chSize(k) { if (!CH_SIZES.some(x => x[0] === k)) return; chData().size = k; chLive(true); showToast('Moment size: ' + CH_SIZES.find(x => x[0] === k)[1] + '. It applies to every moment.', 'success'); }
// every heading photo in one place, visible at once (no need to open each moment): thumbnail, upload / replace, remove, "fill the whole screen"
function chPhotosHTML() {
  const C = chaptersGet(), tog = (on, fn) => `<div class="toggle ${on ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${!!on}" onclick="${fn}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></div>`;
  return `<div class="ch-photos" id="ch-photos"><h4 class="dash-h4" style="margin:12px 0 4px">📚 Your moments: size, photo, collections, order, delete</h4>
    <div class="ch-size" role="radiogroup" aria-label="Size of every moment"><div class="ch-size-h"><b>Size of the moments</b> <small>(one choice for all of them)</small></div><div class="ch-size-btns">${CH_SIZES.map(([k, l, d]) => `<button type="button" role="radio" aria-checked="${chSizeOf() === k}" class="ch-size-b ${chSizeOf() === k ? 'on' : ''}" onclick="chSize('${k}')"><span class="ch-size-pic ch-size-${k}" aria-hidden="true"><i></i></span><b>${l}</b><small>${d}</small></button>`).join('')}</div></div>
    <p class="note" style="margin:0 0 8px">One row per moment. Choose the big photo behind its heading, the collections shown under it, its order, and delete it here. Add a landscape photo (wider than tall, at least 1600 px wide looks best). A soft dark layer keeps the words readable. The size above decides how tall and wide the panels are, for every moment.</p>
    ${C.items.map((c, i) => { const im = safeImg(c.image), sel = (c.tiles || []).filter(t => t && db.categories.includes(t.category)); return `<div class="ch-photo-row"><div class="ch-thumb"${im ? ` style="background-image:url('${esc(im).replace(/'/g, '%27')}')"` : ''}>${im ? '' : '<small>no photo</small>'}</div><div class="ch-photo-main"><b>${esc(String(c.title || 'Moment').replace(/\*/g, ''))}</b>${c.show === false ? ' <small>(hidden)</small>' : ''}<div class="th-actions" style="margin:6px 0 0"><button type="button" class="btn-sm btn-primary-sm" onclick="homePick('chap',${i})">⬆ ${im ? 'Replace photo' : 'Add photo'}</button>${im ? `<button type="button" class="btn-sm" onclick="chRemoveImg(${i})">Remove photo</button>` : ''}<button type="button" class="btn-sm" onclick="chEdit(${i})">✎ Edit words</button><button type="button" class="btn-sm btn-info-sm" onclick="chAiRow(${i})">✨ Write all words</button><button type="button" class="btn-sm" onclick="chMove(${i},-1)" title="Move up">↑</button><button type="button" class="btn-sm" onclick="chMove(${i},1)" title="Move down">↓</button><button type="button" class="btn-sm" onclick="chToggle(${i})">${c.show === false ? '👁 Show' : '🙈 Hide'}</button><button type="button" class="btn-sm btn-danger-sm" onclick="chDel(${i})">🗑 Delete moment</button></div>
      <div class="ch-colls"><div class="ch-colls-h">Collections shown under this moment <small>(${sel.length} of 6: tick the ones you want)</small></div><div class="ch-chips">${db.categories.map(k => `<label class="ch-chip ${sel.some(t => t.category === k) ? 'on' : ''}"><input type="checkbox" ${sel.some(t => t.category === k) ? 'checked' : ''} onchange="chTileToggle(${i},this.dataset.cat)" data-cat="${esc(k)}"> ${esc(k)}</label>`).join('') || '<small>Add categories first (Categories tab).</small>'}</div>
      ${sel.length ? `<div class="ch-sel">${(c.tiles || []).map((t, k) => !t || !db.categories.includes(t.category) ? '' : `<div class="ch-sel-row"><span>${k + 1}. ${esc(t.category)}${t.image ? ' <small>(own photo)</small>' : ''}</span><button type="button" class="btn-sm" onclick="chTileMove(${i},${k},-1)" title="Earlier">↑</button><button type="button" class="btn-sm" onclick="chTileMove(${i},${k},1)" title="Later">↓</button><button type="button" class="btn-sm" onclick="chTileOwn(${i},${k})">⬆ Own photo</button>${t.image ? `<button type="button" class="btn-sm" onclick="chTileOwnClear(${i},${k})">Use the product photo</button>` : ''}</div>`).join('')}</div>` : '<small class="note">No collection ticked: this moment shows no tiles and no “See these sarees” link.</small>'}</div></div></div>`; }).join('')}</div>`;
}
function chToggle(i) { const c = chData().items[i]; if (c) { c.show = c.show === false; chLive(true); } }
function chAllToggle() { const C = chData(); C.show = C.show === false; chLive(true); }
function chTile(i, t, k, v) { const c = chData().items[i]; if (!c) return; c.tiles = c.tiles || []; while (c.tiles.length <= t) c.tiles.push({ category: '', image: '' }); c.tiles[t][k] = v; chLive(k === 'category'); }
function chAdd() { const C = chData(); if (C.items.length >= 8) return showToast('Up to 8 moments', 'error'); C.items.push({ id: 'ch' + Date.now().toString(36), show: true, title: 'A new *moment.*', words: '', quote: '', by: 'Anitha Pemmasani', image: '', tiles: [], link: 'See these sarees' }); chLive(true); }
function chDel(i) { if (!confirm('Delete this moment?')) return; chData().items.splice(i, 1); chLive(true); }
function chMove(i, d) { const a = chData().items, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; chLive(true); }
function chRestore() { if (!confirm('Replace your moments with the 3 sample moments?')) return; db.home.chapters = chaptersDefault(); chLive(true); }
function chaptersCardHTML() {
  const C = chaptersGet(), tog = (on, fn) => `<div class="toggle ${on ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${!!on}" onclick="${fn}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></div>`, cats = db.categories;
  return `<div class="admin-card" id="chapters-card"><h3>📖 Moments</h3>
    <p class="note" style="margin:0 0 8px">Short moments by occasion on the home page: a photo panel, a title, a quote in your own words and three category tiles. Put *stars* around a word in the title to set it in italics.</p>
    <div class="hs-bar"><span>Show the moments on the home page</span>${tog(C.show !== false, 'chAllToggle()')}</div>
    ${chPhotosHTML()}
    ${chAiPanelHTML()}
    <div class="ch-list">${C.items.map((c, i) => `<details class="ch-item"><summary>${esc(String(c.title || 'Moment').replace(/\*/g, ''))}${c.show === false ? ' <small>(hidden)</small>' : ''}</summary><div class="ch-body">
      <div class="hs-bar"><span>Show this moment</span>${tog(c.show !== false, `chToggle(${i})`)}</div>
      <div class="th-actions"><button type="button" class="btn-sm btn-info-sm" onclick="chAi(${i})">✨ Rewrite this moment with Claude</button></div>
      <div class="hs-grid2"><div class="form-group"><label>Title</label><input type="text" maxlength="60" value="${esc(c.title)}" oninput="chSet(${i},'title',this.value)"></div><div class="form-group"><label>Line of weaves under the title</label><input type="text" maxlength="90" value="${esc(c.words)}" oninput="chSet(${i},'words',this.value)"></div></div>
      <div class="form-group"><label>Quote (your own words)</label><textarea rows="2" maxlength="180" oninput="chSet(${i},'quote',this.value)">${esc(c.quote)}</textarea></div>
      <div class="hs-grid2"><div class="form-group"><label>Signed by</label><input type="text" maxlength="60" value="${esc(c.by)}" oninput="chSet(${i},'by',this.value)"></div><div class="form-group"><label>Link text</label><input type="text" maxlength="30" value="${esc(chLink(c))}" oninput="chSet(${i},'link',this.value)"></div></div>
      <div class="form-group"><label>Big photo (leave empty for a calm dark panel)</label><div class="hs-img-row"><input type="text" value="${esc(String(c.image || '').startsWith('data:') ? '' : c.image || '')}" placeholder="${String(c.image || '').startsWith('data:') ? 'Uploaded photo in use — paste a link to replace' : 'https://… image link'}" onchange="chSet(${i},'image',this.value)"><button class="btn-sm btn-primary-sm" onclick="homePick('chap',${i})">⬆ Upload photo</button></div></div>
      <p class="note" style="margin:6px 0 0">Which collections appear under this moment, the moment photo, its order and Delete are in <b>Your moments</b> at the top of this card.</p>
      <div class="th-actions"><button type="button" class="btn-sm" onclick="chMove(${i},-1)">↑ Up</button><button type="button" class="btn-sm" onclick="chMove(${i},1)">↓ Down</button><button type="button" class="btn-sm" onclick="chDel(${i})">🗑 Delete</button></div></div></details>`).join('')}</div>
    <div class="th-actions"><button type="button" class="btn-sm btn-info-sm" onclick="chAdd()">＋ Add a moment</button><button type="button" class="btn-sm" onclick="chRestore()">↺ Use the 3 sample moments</button></div></div>`;
}

// ---- ✨ AI help for the chapters: Claude drafts three moments (or three rewrites of one); nothing changes until the owner presses "Use this" ----
const CH_IDEAS = [
  { title: 'A rainy *afternoon.*', words: 'Everyday · Mysore Silk · Ponduru Khadi', quote: 'Tea on the verandah, the radio low, and a saree that feels like a soft old friend.', tiles: ['Mysore Silk', 'Ponduru Khadi', 'Tussar'] },
  { title: 'A visit to the *temple.*', words: 'Festive · Kanjeevaram · Maheswari', quote: 'Silk that rustles gently on the steps, and colours that look their best in morning light.', tiles: ['Kanjeevaram', 'Maheswari', 'Paithani'] },
  { title: 'A family *reunion.*', words: 'Occasion · Banarasi · Paithani · Tussar', quote: 'Three generations in one room, and a saree you can be photographed in a hundred times.', tiles: ['Banarasi', 'Paithani', 'Tussar'] },
  { title: 'A quiet *celebration.*', words: 'Evening · Maheswari · Banarasi', quote: 'No grand hall, just a few people who matter, and a drape that suits the evening.', tiles: ['Maheswari', 'Banarasi', 'Kanjeevaram'] }
];
let CH_AI = { drafts: [], target: null, msg: '', n: 0 };
const chaiCats = () => db.categories || [];
function chaiClean(v) {
  const s = (x, n) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n), cats = chaiCats();
  const tiles = (Array.isArray(v && v.tiles) ? v.tiles : []).map(t => cats.find(c => c.toLowerCase() === s(t, 40).toLowerCase())).filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).slice(0, 6);
  const o = { title: s(v && v.title, 60), words: s(v && v.words, 90), quote: s(v && v.quote, 180), link: s(v && v.link, 28), tiles }; return o.title && o.quote ? o : null;
}
async function chAi(target) {
  const occ = ((el_('ch-ai-occ') || {}).value || '').trim() || (target !== 'new' && chData().items[target] ? String(chData().items[target].title || '').replace(/\*/g, '') : '');
  CH_AI = { drafts: [], target, msg: 'Asking Claude…', n: CH_AI.n }; const c = el_('adminContent'); if (c) renderHomeAdmin(c);
  let list = [], note = '';
  try {
    if (typeof aiReady === 'function' && aiReady('chapters')) { const cur = target !== 'new' ? chData().items[target] : null, j = await aiCall('chapters', { occasion: occ, categories: chaiCats().slice(0, 12), existing: chData().items.map(x => String(x.title || '').replace(/\*/g, '')), current: cur ? { title: cur.title, quote: cur.quote } : undefined }); list = ((j.data && j.data.variants) || []).map(chaiClean).filter(Boolean).slice(0, 3); note = list.length ? 'Here are 3 drafts from Claude. Nothing changes until you press "Use this".' : 'Claude gave nothing usable. Try again with a few words about the occasion.'; }
  } catch (e) { note = aiMsg(e) + ' Showing built-in ideas instead.'; }
  if (!list.length && !/nothing usable/.test(note)) { const k = CH_AI.n++ % CH_IDEAS.length; list = [0, 1, 2].map(i => chaiClean(CH_IDEAS[(k + i) % CH_IDEAS.length])).filter(Boolean); note = note || 'Claude is not connected, so these are built-in ideas (add the key in Settings for fresh ones).'; }
  CH_AI.drafts = list; CH_AI.msg = note; if (c) renderHomeAdmin(c);
}
function chAiUse(i) {
  const d = CH_AI.drafts[i]; if (!d) return; const C = chData(), tiles = d.tiles.map(cat => ({ category: cat, image: '' }));
  if (CH_AI.target === 'new') { if (C.items.length >= 8) return showToast('Up to 8 moments', 'error'); C.items.push({ id: 'ch' + Date.now().toString(36), show: true, title: d.title, words: d.words, quote: d.quote, by: 'Anitha Pemmasani', image: '', tiles, link: d.link || 'See these sarees' }); }
  else { const c = C.items[CH_AI.target]; if (!c) return; c.title = d.title; c.words = d.words; c.quote = d.quote; if (d.link) c.link = d.link; c.tiles = tiles.map(t => { const old = (c.tiles || []).find(x => x.category === t.category); return old || t; }); }
  CH_AI = { drafts: [], target: null, msg: 'Applied. You can still change any word.', n: CH_AI.n }; chLive(true);
}
// ✨ write ALL the words (title, line of weaves, quote, button text) for every moment you already have, keeping each one's collections and photos
async function chAiAll() {
  const occ = ((el_('ch-ai-occ') || {}).value || '').trim(), items = chData().items; if (!items.length) return showToast('Add a moment first.', 'error');
  CH_AI = { drafts: [], all: [], target: 'all', msg: 'Asking Claude to write all the words…', n: CH_AI.n }; const c = el_('adminContent'); if (c) renderHomeAdmin(c);
  let out = [], note = '';
  try {
    if (typeof aiReady === 'function' && aiReady('chapters')) { const j = await aiCall('chapters', { mode: 'all', occasion: occ, categories: chaiCats().slice(0, 12), items: items.map(x => ({ title: String(x.title || '').replace(/\*/g, ''), tiles: (x.tiles || []).map(t => t && t.category).filter(Boolean) })) }); out = Array.isArray(j.data && j.data.items) ? j.data.items : []; }
  } catch (e) { note = aiMsg(e) + ' Filling the gaps with plain built-in words instead.'; }
  const clean = (v, x) => { const f = chaiClean({ ...v, tiles: (x.tiles || []).map(t => t.category) }); return f ? { ...f, tiles: (x.tiles || []).map(t => t.category) } : null; };
  CH_AI.all = items.map((x, i) => clean(out[i] || {}, x) || { title: String(x.title || 'A new *moment.*'), words: ['Occasion'].concat((x.tiles || []).map(t => t.category)).slice(0, 4).join(' · '), quote: x.quote || '', link: chLink(x), tiles: (x.tiles || []).map(t => t.category), builtin: true });
  if (!out.length && !note) note = 'Claude is not connected, so these are plain built-in words (add the key in Settings → Security → Claude AI key for full wording).';
  CH_AI.msg = note || 'Drafts ready for every moment. Nothing changes until you press Use.'; if (c) renderHomeAdmin(c);
}
function chAiAllUse(i) { const d = (CH_AI.all || [])[i], c = chData().items[i]; if (!d || !c) return; c.title = d.title; c.words = d.words; if (d.quote) c.quote = d.quote; if (d.link) c.link = d.link; const all = CH_AI.all; all[i] = null; CH_AI.msg = `Moment ${i + 1} updated. You can still change any word.`; chLive(true); }
function chAiAllApply() { (CH_AI.all || []).forEach((d, i) => { if (d) { const c = chData().items[i]; if (c) { c.title = d.title; c.words = d.words; if (d.quote) c.quote = d.quote; if (d.link) c.link = d.link; } } }); CH_AI = { drafts: [], all: null, target: null, msg: 'All the words were updated. You can still change any of them.', n: CH_AI.n }; chLive(true); }
function chAiPanelHTML() {
  const on = typeof aiReady === 'function' && aiReady('chapters'), tgt = CH_AI.target === 'new' ? 'a new moment' : CH_AI.target != null ? 'moment ' + (CH_AI.target + 1) : '';
  return `<div class="th-ai" id="ch-ai"><label for="ch-ai-occ"><b>✨ Write moments with Claude</b> (a few words about the occasion, optional)</label><div class="th-ai-row"><input id="ch-ai-occ" type="text" maxlength="100" placeholder="e.g. a morning at the temple, a daughter's engagement"><button type="button" class="btn-sm btn-info-sm" onclick="chAi('new')"${on ? '' : ' title="Add your Claude key in Settings for fresh ideas; built-in ideas show without it"'}>Suggest 3 new moments</button><button type="button" class="btn-sm btn-primary-sm" onclick="chAiAll()">✨ Write ALL the words for my moments</button></div>
    <p class="note" style="margin:4px 0 0;font-size:.78rem">“Write ALL the words” rewrites the title, the line of weaves, the quote and the button text of every moment you have, and keeps each one's collections and photos. You choose what to keep.</p>
    ${(CH_AI.all || []).some(Boolean) ? `<p class="note" style="margin:8px 0 0">Words for every moment <button type="button" class="btn-sm btn-primary-sm" onclick="chAiAllApply()">Use all</button></p><div class="th-presets">${CH_AI.all.map((d, i) => d ? `<div class="th-draft" style="max-width:320px"><small>Moment ${i + 1}${d.builtin ? ' (built-in)' : ''}</small><b>${esc(d.title.replace(/\*/g, ''))}</b><small>${esc(d.words)}</small>${d.quote ? `<small>“${esc(d.quote)}”</small>` : ''}<small>Button: ${esc(d.link || 'See these sarees')}</small><button type="button" class="btn-sm btn-info-sm" onclick="chAiAllUse(${i})">Use this</button></div>` : '').join('')}</div>` : ''}
    ${CH_AI.drafts.length ? `<p class="note" style="margin:8px 0 0">Drafts for ${esc(tgt)}:</p><div class="th-presets">${CH_AI.drafts.map((d, i) => `<div class="th-draft" style="max-width:300px"><b>${esc(d.title.replace(/\*/g, ''))}</b><small>${esc(d.words)}</small><small>“${esc(d.quote)}”</small>${d.tiles.length ? `<small>Tiles: ${esc(d.tiles.join(', '))}</small>` : ''}<button type="button" class="btn-sm btn-info-sm" onclick="chAiUse(${i})">Use this</button></div>`).join('')}</div>` : ''}
    ${CH_AI.msg ? `<p class="note" role="status" style="margin:8px 0 0">${esc(CH_AI.msg)}</p>` : ''}</div>`;
}
