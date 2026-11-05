// ================= STORY CHAPTERS ON THE HOME PAGE =================
// Short "chapters" by occasion: a big photo panel with a title, a line of weaves, a quote in the shop's own words and three category tiles.
// The owner writes them in Owner app → Home Page → Story chapters. Use *word* in a title to set that word in italics.
const CH_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function chaptersDefault() {
  return { show: true, items: [
    { id: 'ch1', show: true, title: 'A Tuesday *morning.*', words: 'Everyday · Tussar · Ponduru Khadi · Mysore Silk', quote: 'Light enough to forget you are wearing it, and kind enough to last the whole working day.', by: 'Anitha Pemmasani', image: '', tiles: [{ category: 'Tussar', image: '' }, { category: 'Ponduru Khadi', image: '' }, { category: 'Mysore Silk', image: '' }], link: 'Enter this chapter' },
    { id: 'ch2', show: true, title: 'A cousin’s *wedding.*', words: 'Occasion · Maheswari · Banarasi · Paithani', quote: 'Not the bride, and not in the front row, but the one whose saree people still ask about the next morning.', by: 'Anitha Pemmasani', image: '', tiles: [{ category: 'Maheswari', image: '' }, { category: 'Banarasi', image: '' }, { category: 'Paithani', image: '' }], link: 'Enter this chapter' },
    { id: 'ch3', show: true, title: 'A festival, *at home.*', words: 'Festive · Kanjeevaram · Banarasi', quote: 'Lamps on the window sill, flowers at the door, and a silk that has waited all year for this morning.', by: 'Anitha Pemmasani', image: '', tiles: [{ category: 'Kanjeevaram', image: '' }, { category: 'Banarasi', image: '' }, { category: 'Paithani', image: '' }], link: 'Enter this chapter' }
  ] };
}
function chaptersGet() { const c = db.home && db.home.chapters; return c && Array.isArray(c.items) ? c : chaptersDefault(); }
const chEsc = t => esc(String(t || '')).replace(/\*([^*]+)\*/g, '<em>$1</em>');
function renderHomeChapters() {
  const sec = document.getElementById('homeChapters'); if (!sec) return; const C = chaptersGet(), items = C.items.filter(c => c.show !== false);
  if (C.show === false || !items.length) { sec.innerHTML = ''; sec.style.display = 'none'; return; }
  sec.style.display = '';
  sec.innerHTML = items.map((c, n) => {
    const img = safeImg(c.image), tiles = (c.tiles || []).filter(t => t && db.categories.includes(t.category)).slice(0, 3), first = tiles[0] ? tiles[0].category : '';
    return `<article class="chap" aria-label="${esc(String(c.title || '').replace(/\*/g, ''))}"><div class="chap-hero"${img ? ` style="background-image:url('${esc(img).replace(/'/g, '%27')}')"` : ''}><div class="chap-in"><span class="chap-no">Chapter ${CH_ROMAN[n] || n + 1}</span><h2 class="chap-title">${chEsc(c.title)}</h2>${c.words ? `<p class="chap-words">${esc(c.words)}</p>` : ''}</div></div>
      ${c.quote ? `<blockquote class="chap-quote"><p>“${esc(String(c.quote).replace(/^[“"]|[”"]$/g, ''))}”</p>${c.by ? `<cite>— ${esc(c.by)}</cite>` : ''}</blockquote>` : ''}
      ${tiles.length ? `<div class="chap-tiles">${tiles.map(t => { const im = safeImg(t.image) || catTileImage({ category: t.category, image: '' }); return `<div class="chap-tile" role="link" tabindex="0" data-cat="${esc(t.category)}" onclick="filterAndShowShop(this.dataset.cat)" onkeydown="if(event.key==='Enter')filterAndShowShop(this.dataset.cat)">${im ? `<img src="${esc(im)}" alt="${esc(t.category)} sarees" loading="lazy" onerror="this.style.display='none'">` : ''}<span>${esc(t.category)} →</span></div>`; }).join('')}</div>` : ''}
      ${first ? `<a class="chap-enter" role="link" tabindex="0" data-cat="${esc(first)}" onclick="filterAndShowShop(this.dataset.cat)" onkeydown="if(event.key==='Enter')filterAndShowShop(this.dataset.cat)">${esc(c.link || 'Enter this chapter')} →</a>` : ''}</article>`;
  }).join('');
}
// ---- owner: edit the chapters ----
function chData() { if (!db.home.chapters || !Array.isArray(db.home.chapters.items)) db.home.chapters = chaptersDefault(); return db.home.chapters; }
function chLive(redraw) { renderHomeChapters(); homeSaveSoon(); if (redraw) { const c = el_('adminContent'); if (c) renderHomeAdmin(c); } }
function chSet(i, k, v) { const c = chData().items[i]; if (c) { c[k] = v; chLive(false); } }
function chToggle(i) { const c = chData().items[i]; if (c) { c.show = c.show === false; chLive(true); } }
function chAllToggle() { const C = chData(); C.show = C.show === false; chLive(true); }
function chTile(i, t, k, v) { const c = chData().items[i]; if (!c) return; c.tiles = c.tiles || []; while (c.tiles.length <= t) c.tiles.push({ category: '', image: '' }); c.tiles[t][k] = v; chLive(k === 'category'); }
function chAdd() { const C = chData(); if (C.items.length >= 8) return showToast('Up to 8 chapters', 'error'); C.items.push({ id: 'ch' + Date.now().toString(36), show: true, title: 'A new *chapter.*', words: '', quote: '', by: 'Anitha Pemmasani', image: '', tiles: [], link: 'Enter this chapter' }); chLive(true); }
function chDel(i) { if (!confirm('Delete this chapter?')) return; chData().items.splice(i, 1); chLive(true); }
function chMove(i, d) { const a = chData().items, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; chLive(true); }
function chRestore() { if (!confirm('Replace your chapters with the 3 sample chapters?')) return; db.home.chapters = chaptersDefault(); chLive(true); }
function chaptersCardHTML() {
  const C = chaptersGet(), tog = (on, fn) => `<div class="toggle ${on ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${!!on}" onclick="${fn}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></div>`, cats = db.categories;
  return `<div class="admin-card" id="chapters-card"><h3>📖 Story chapters</h3>
    <p class="note" style="margin:0 0 8px">Short chapters by occasion on the home page: a photo panel, a title, a quote in your own words and three category tiles. Put *stars* around a word in the title to set it in italics.</p>
    <div class="hs-bar"><span>Show the chapters on the home page</span>${tog(C.show !== false, 'chAllToggle()')}</div>
    ${chAiPanelHTML()}
    <div class="ch-list">${C.items.map((c, i) => `<details class="ch-item"><summary>${esc(String(c.title || 'Chapter').replace(/\*/g, ''))}${c.show === false ? ' <small>(hidden)</small>' : ''}</summary><div class="ch-body">
      <div class="hs-bar"><span>Show this chapter</span>${tog(c.show !== false, `chToggle(${i})`)}</div>
      <div class="th-actions"><button type="button" class="btn-sm btn-info-sm" onclick="chAi(${i})">✨ Rewrite this chapter with Claude</button></div>
      <div class="hs-grid2"><div class="form-group"><label>Title</label><input type="text" maxlength="60" value="${esc(c.title)}" oninput="chSet(${i},'title',this.value)"></div><div class="form-group"><label>Line of weaves under the title</label><input type="text" maxlength="90" value="${esc(c.words)}" oninput="chSet(${i},'words',this.value)"></div></div>
      <div class="form-group"><label>Quote (your own words)</label><textarea rows="2" maxlength="180" oninput="chSet(${i},'quote',this.value)">${esc(c.quote)}</textarea></div>
      <div class="hs-grid2"><div class="form-group"><label>Signed by</label><input type="text" maxlength="60" value="${esc(c.by)}" oninput="chSet(${i},'by',this.value)"></div><div class="form-group"><label>Link text</label><input type="text" maxlength="30" value="${esc(c.link)}" oninput="chSet(${i},'link',this.value)"></div></div>
      <div class="form-group"><label>Big photo (leave empty for a calm dark panel)</label><div class="hs-img-row"><input type="text" value="${esc(String(c.image || '').startsWith('data:') ? '' : c.image || '')}" placeholder="${String(c.image || '').startsWith('data:') ? 'Uploaded photo in use — paste a link to replace' : 'https://… image link'}" onchange="chSet(${i},'image',this.value)"><button class="btn-sm btn-primary-sm" onclick="homePick('chap',${i})">⬆ Upload photo</button></div></div>
      <div class="ch-tiles">${[0, 1, 2].map(t => { const tl = (c.tiles || [])[t] || { category: '', image: '' }; return `<div class="form-group"><label>Tile ${t + 1}</label><select onchange="chTile(${i},${t},'category',this.value)"><option value="">(none)</option>${cats.map(k => `<option${k === tl.category ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select><button class="btn-sm" style="margin-top:6px" onclick="homePick('ctile','${i},${t}')">⬆ Own photo</button></div>`; }).join('')}</div>
      <div class="th-actions"><button type="button" class="btn-sm" onclick="chMove(${i},-1)">↑ Up</button><button type="button" class="btn-sm" onclick="chMove(${i},1)">↓ Down</button><button type="button" class="btn-sm" onclick="chDel(${i})">🗑 Delete</button></div></div></details>`).join('')}</div>
    <div class="th-actions"><button type="button" class="btn-sm btn-info-sm" onclick="chAdd()">＋ Add a chapter</button><button type="button" class="btn-sm" onclick="chRestore()">↺ Use the 3 sample chapters</button></div></div>`;
}

// ---- ✨ AI help for the chapters: Claude drafts three chapters (or three rewrites of one); nothing changes until the owner presses "Use this" ----
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
  const tiles = (Array.isArray(v && v.tiles) ? v.tiles : []).map(t => cats.find(c => c.toLowerCase() === s(t, 40).toLowerCase())).filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).slice(0, 3);
  const o = { title: s(v && v.title, 60), words: s(v && v.words, 90), quote: s(v && v.quote, 180), tiles }; return o.title && o.quote ? o : null;
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
  if (CH_AI.target === 'new') { if (C.items.length >= 8) return showToast('Up to 8 chapters', 'error'); C.items.push({ id: 'ch' + Date.now().toString(36), show: true, title: d.title, words: d.words, quote: d.quote, by: 'Anitha Pemmasani', image: '', tiles, link: 'Enter this chapter' }); }
  else { const c = C.items[CH_AI.target]; if (!c) return; c.title = d.title; c.words = d.words; c.quote = d.quote; c.tiles = tiles.map(t => { const old = (c.tiles || []).find(x => x.category === t.category); return old || t; }); }
  CH_AI = { drafts: [], target: null, msg: 'Applied. You can still change any word.', n: CH_AI.n }; chLive(true);
}
function chAiPanelHTML() {
  const on = typeof aiReady === 'function' && aiReady('chapters'), tgt = CH_AI.target === 'new' ? 'a new chapter' : CH_AI.target != null ? 'chapter ' + (CH_AI.target + 1) : '';
  return `<div class="th-ai" id="ch-ai"><label for="ch-ai-occ"><b>✨ Write chapters with Claude</b> (a few words about the moment or occasion, optional)</label><div class="th-ai-row"><input id="ch-ai-occ" type="text" maxlength="100" placeholder="e.g. a morning at the temple, a daughter's engagement"><button type="button" class="btn-sm btn-info-sm" onclick="chAi('new')"${on ? '' : ' title="Add your Claude key in Settings for fresh ideas; built-in ideas show without it"'}>Suggest 3 chapters</button></div>
    ${CH_AI.drafts.length ? `<p class="note" style="margin:8px 0 0">Drafts for ${esc(tgt)}:</p><div class="th-presets">${CH_AI.drafts.map((d, i) => `<div class="th-draft" style="max-width:300px"><b>${esc(d.title.replace(/\*/g, ''))}</b><small>${esc(d.words)}</small><small>“${esc(d.quote)}”</small>${d.tiles.length ? `<small>Tiles: ${esc(d.tiles.join(', '))}</small>` : ''}<button type="button" class="btn-sm btn-info-sm" onclick="chAiUse(${i})">Use this</button></div>`).join('')}</div>` : ''}
    ${CH_AI.msg ? `<p class="note" role="status" style="margin:8px 0 0">${esc(CH_AI.msg)}</p>` : ''}</div>`;
}
