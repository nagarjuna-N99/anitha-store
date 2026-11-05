// ================= Website background (Home Page → Background, admin) =================
// A soft, hand-drawn style backdrop behind the whole website: kalamkari paisleys and vines, peacocks and feathers, lotus, festival lamps.
// All art is drawn here in code (original shapes, nothing copied or downloaded), placed at random positions from a "shuffle number" so the same number always gives the same picture.
// The admin builds a look in the preview box first; nothing changes on the website until she presses "Put this on the website". Looks can be saved and swapped for a festival.
const BG_PALETTES = {
  heritage: { name: 'Heritage (indigo, madder, sand)', c: ['#2b3a67', '#a23b2a', '#d9c9a3', '#b8923a'] },
  peacock: { name: 'Peacock (teal, blue, gold)', c: ['#0e5c63', '#2a7fb8', '#9fd3c7', '#c9a227'] },
  festive: { name: 'Festive (maroon, saffron, gold)', c: ['#7a1f1f', '#d9731a', '#f2c46d', '#b8923a'] },
  monsoon: { name: 'Monsoon (green, rose, mist)', c: ['#2f5d50', '#c76b8a', '#cfe3d4', '#b8923a'] },
};
const BG_STYLES = {
  plain: { name: 'Plain (no pattern)', motifs: [], palette: 'heritage' },
  kalamkari: { name: 'Kalamkari', motifs: ['paisley', 'flower', 'vine'], palette: 'heritage' },
  peacock: { name: 'Peacocks', motifs: ['peacock', 'feather', 'lotus'], palette: 'peacock' },
  festive: { name: 'Festival lamps', motifs: ['diya', 'star', 'flower', 'paisley'], palette: 'festive' },
  lotus: { name: 'Lotus and leaves', motifs: ['lotus', 'vine', 'flower'], palette: 'monsoon' },
  custom: { name: 'Claude’s idea', motifs: [], palette: 'heritage' },
};
const BG_DENSITY = { light: 12, medium: 22, rich: 36 };
const BG_MOTIF_IDS = ['paisley', 'flower', 'vine', 'peacock', 'feather', 'lotus', 'diya', 'star'];
const bgHex = v => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '';
const bgRng = seed => { let a = (Number(seed) || 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function bgClean(v) {
  v = v && typeof v === 'object' ? v : {}; const style = BG_STYLES[v.style] ? v.style : 'plain', pal = BG_PALETTES[v.palette] || v.palette === 'custom' ? v.palette : (BG_STYLES[style].palette);
  const colors = (Array.isArray(v.colors) ? v.colors : []).map(bgHex).filter(Boolean).slice(0, 4);
  const motifs = (Array.isArray(v.motifs) ? v.motifs : []).filter(m => BG_MOTIF_IDS.includes(m)).filter((m, i, a) => a.indexOf(m) === i).slice(0, 6);
  return { style, palette: pal === 'custom' && colors.length === 4 ? 'custom' : (BG_PALETTES[pal] ? pal : BG_STYLES[style].palette), colors: colors.length === 4 ? colors : [], motifs, density: BG_DENSITY[v.density] ? v.density : 'medium', strength: Math.min(0.4, Math.max(0.08, Number(v.strength) || 0.26)), seed: Math.max(1, Math.floor(Number(v.seed)) || 1), tint: bgHex(v.tint), name: String(v.name || '').replace(/[<>"]/g, '').slice(0, 40) };
}
const bgColors = s => s.palette === 'custom' && s.colors.length === 4 ? s.colors : (BG_PALETTES[s.palette] || BG_PALETTES.heritage).c;
// ---- the art: each motif is drawn in a 100 x 100 box; c = [main line, accent, soft fill, gold] ----
const BG_ART = {
  paisley: (c, r) => `<path d="M50 6 C86 20 94 58 68 82 C50 98 22 90 18 66 C15 48 30 36 44 42 C55 47 54 62 44 63 C36 64 33 56 38 52" fill="${c[2]}" fill-opacity=".55" stroke="${c[0]}" stroke-width="2.4" stroke-linejoin="round"/><path d="M50 18 C74 28 80 54 64 72 C52 84 34 80 31 66" fill="none" stroke="${c[1]}" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round"/><circle cx="62" cy="36" r="3.2" fill="${c[1]}"/><circle cx="70" cy="52" r="2.6" fill="${c[3]}"/><circle cx="64" cy="68" r="2.2" fill="${c[1]}"/>`,
  flower: (c, r) => Array.from({ length: 8 }, (_, i) => `<ellipse cx="50" cy="26" rx="9" ry="18" transform="rotate(${i * 45} 50 50)" fill="${c[1]}" fill-opacity=".45" stroke="${c[0]}" stroke-width="1.6"/>`).join('') + `<circle cx="50" cy="50" r="9" fill="${c[3]}" stroke="${c[0]}" stroke-width="1.6"/><circle cx="50" cy="50" r="3.4" fill="${c[0]}"/>` + Array.from({ length: 8 }, (_, i) => `<circle cx="${50 + 44 * Math.cos(i * Math.PI / 4 + .39)}" cy="${50 + 44 * Math.sin(i * Math.PI / 4 + .39)}" r="1.8" fill="${c[0]}"/>`).join(''),
  vine: (c, r) => `<path d="M4 62 C24 28 44 86 64 52 S90 40 96 54" fill="none" stroke="${c[0]}" stroke-width="2.2" stroke-linecap="round"/>` + [[20, 44, -30], [38, 66, 160], [56, 54, -50], [74, 46, 140], [88, 50, -20]].map(([x, y, a]) => `<path d="M${x} ${y} q 8 -16 20 -8 q -6 16 -20 8z" transform="rotate(${a} ${x} ${y})" fill="${c[2]}" fill-opacity=".7" stroke="${c[0]}" stroke-width="1.4"/>`).join('') + `<circle cx="64" cy="52" r="3" fill="${c[1]}"/><circle cx="30" cy="52" r="2.4" fill="${c[1]}"/>`,
  feather: (c, r) => `<path d="M50 98 C48 70 52 50 50 30" fill="none" stroke="${c[0]}" stroke-width="2"/>` + Array.from({ length: 11 }, (_, i) => { const y = 36 + i * 5.2, w = 15 - Math.abs(i - 3) * 1.1; return `<path d="M50 ${y} l ${-w} ${-7}M50 ${y} l ${w} ${-7}" stroke="${c[2]}" stroke-width="1.4" stroke-linecap="round"/>`; }).join('') + `<ellipse cx="50" cy="24" rx="15" ry="21" fill="${c[1]}" fill-opacity=".8" stroke="${c[0]}" stroke-width="1.4"/><ellipse cx="50" cy="25" rx="9.5" ry="14" fill="${c[3]}"/><ellipse cx="50" cy="26" rx="5" ry="8" fill="${c[0]}"/><ellipse cx="50" cy="26" rx="2" ry="3.4" fill="${c[2]}"/>`,
  peacock: (c, r) => { let t = ''; for (let i = 0; i < 9; i++) { const a = (-165 + i * 15) * Math.PI / 180, x = 70 + 56 * Math.cos(a), y = 74 + 56 * Math.sin(a); t += `<path d="M70 74 L${x.toFixed(1)} ${y.toFixed(1)}" stroke="${c[0]}" stroke-width="1.4"/><ellipse cx="${(70 + 40 * Math.cos(a)).toFixed(1)}" cy="${(74 + 40 * Math.sin(a)).toFixed(1)}" rx="7" ry="20" transform="rotate(${(i * 15 - 165 + 90).toFixed(0)} ${(70 + 40 * Math.cos(a)).toFixed(1)} ${(74 + 40 * Math.sin(a)).toFixed(1)})" fill="${c[2]}" fill-opacity=".5" stroke="${c[1]}" stroke-width="1.1"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${c[1]}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${c[3]}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" fill="${c[0]}"/>`; } return t + `<ellipse cx="54" cy="76" rx="19" ry="12" fill="${c[0]}"/><path d="M40 70 C30 60 32 46 33 37" fill="none" stroke="${c[0]}" stroke-width="6" stroke-linecap="round"/><circle cx="33" cy="33" r="5.2" fill="${c[0]}"/><path d="M28 32 l-7 2 l7 2z" fill="${c[3]}"/><path d="M33 28 l-2 -7 M36 28 l1 -7 M30 28 l-4 -6" stroke="${c[0]}" stroke-width="1.4"/><circle cx="31" cy="21" r="1.4" fill="${c[1]}"/><circle cx="37.5" cy="20.5" r="1.4" fill="${c[1]}"/><path d="M50 87 l-2 10 M58 87 l1 10" stroke="${c[0]}" stroke-width="1.6"/>`; },
  lotus: (c, r) => [-62, -31, 0, 31, 62].map((a, i) => `<path d="M50 90 C30 70 30 40 50 14 C70 40 70 70 50 90z" transform="rotate(${a} 50 90)" fill="${c[1]}" fill-opacity="${0.22 + (2 - Math.abs(i - 2)) * 0.12}" stroke="${c[0]}" stroke-width="1.5"/>`).join('') + `<circle cx="50" cy="88" r="4" fill="${c[3]}" stroke="${c[0]}" stroke-width="1.2"/><path d="M26 94 q24 8 48 0" fill="none" stroke="${c[2]}" stroke-width="2.4" stroke-linecap="round"/>`,
  diya: (c, r) => `<path d="M18 60 Q50 96 82 60 Z" fill="${c[1]}" fill-opacity=".8" stroke="${c[0]}" stroke-width="2"/><path d="M14 60 H86" stroke="${c[0]}" stroke-width="2.4" stroke-linecap="round"/><path d="M50 14 C64 32 62 48 50 56 C38 48 36 32 50 14z" fill="${c[3]}" stroke="${c[1]}" stroke-width="1.6"/><path d="M50 30 C56 38 55 46 50 50 C45 46 44 38 50 30z" fill="${c[2]}"/><path d="M36 74 q14 8 28 0" fill="none" stroke="${c[3]}" stroke-width="1.6"/><path d="M40 92 H60" stroke="${c[0]}" stroke-width="2"/>`,
  star: (c, r) => { let p = ''; for (let i = 0; i < 16; i++) { const rad = i % 2 ? 17 : 42, a = i * Math.PI / 8 - Math.PI / 2; p += `${(50 + rad * Math.cos(a)).toFixed(1)},${(50 + rad * Math.sin(a)).toFixed(1)} `; } return `<polygon points="${p}" fill="${c[2]}" fill-opacity=".55" stroke="${c[0]}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="50" cy="50" r="6" fill="${c[1]}"/>` + Array.from({ length: 16 }, (_, i) => `<circle cx="${(50 + 47 * Math.cos(i * Math.PI / 8)).toFixed(1)}" cy="${(50 + 47 * Math.sin(i * Math.PI / 8)).toFixed(1)}" r="1.5" fill="${c[3]}"/>`).join(''); },
};
// the whole picture as one SVG (W x H), motifs scattered at random positions: most near the left and right edges so the middle stays calm to read
function bgSvg(spec, W = 1600, H = 1000) {
  const s = bgClean(spec), style = BG_STYLES[s.style]; if (s.style === 'plain') return '';
  const motifs = s.style === 'custom' ? (s.motifs.length ? s.motifs : ['paisley', 'flower']) : style.motifs, c = bgColors(s), rnd = bgRng(s.seed), n = BG_DENSITY[s.density], placed = []; let g = '';
  for (let i = 0; i < n; i++) {
    const id = motifs[Math.floor(rnd() * motifs.length)], size = (id === 'peacock' ? 190 : 125) * (0.65 + rnd() * 0.7); let x = 0, y = 0;
    for (let t = 0; t < 25; t++) { const edge = rnd() < 0.72; x = edge ? (rnd() < 0.5 ? rnd() * 0.24 : 0.76 + rnd() * 0.24) * W : rnd() * W; y = rnd() * H; if (placed.every(p => Math.hypot(p[0] - x, p[1] - y) > (p[2] + size) * 0.5)) break; }
    placed.push([x, y, size]); const rot = Math.round((rnd() - 0.5) * (id === 'peacock' ? 24 : 80)), k = size / 100, flip = rnd() < 0.5 ? -1 : 1;
    g += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot}) scale(${(k * flip).toFixed(3)} ${k.toFixed(3)}) translate(-50 -50)">${BG_ART[id](c, rnd)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><g opacity="${s.strength}">${g}</g></svg>`;
}
const bgUrl = spec => { const svg = bgSvg(spec); return svg ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : 'none'; };
// ---- the website: one fixed layer behind everything ----
function applyBackground() {
  if (typeof BUILD !== 'undefined' && BUILD === 'admin') return;
  const sf = document.getElementById('storefrontView'); if (!sf) return; let el = document.getElementById('siteBg');
  const spec = db && db.home && db.home.background ? bgClean(db.home.background) : null;
  if (!spec || spec.style === 'plain') { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'siteBg'; el.setAttribute('aria-hidden', 'true'); sf.insertBefore(el, sf.firstChild); }
  el.style.backgroundImage = bgUrl(spec); el.style.backgroundColor = spec.tint || ''; el.dataset.style = spec.style;
}
// ---- the admin card: build a look, see it big, then deploy ----
const BG = { draft: null, ideas: [], msg: '', busy: false, saveName: '' };
const bgCurrent = () => bgClean((db.home && db.home.background) || { style: 'plain' });
const bgDraft = () => { if (!BG.draft) BG.draft = bgCurrent(); return BG.draft; };
const bgSame = (a, b) => JSON.stringify(bgClean(a)) === JSON.stringify(bgClean(b));
function bgIdeasBuiltin(text) {
  const t = String(text || '').toLowerCase(), mk = (name, style, palette, density, note, extra) => bgClean({ style, palette, density, strength: 0.24, seed: 1 + Math.floor(Math.random() * 9000), name, ...extra }), out = [];
  const pick = (re, ...ideas) => { if (re.test(t)) out.push(...ideas); };
  pick(/diwali|deepavali|lamp|light/, mk('Diwali lamps', 'festive', 'festive', 'rich'), mk('Golden stars', 'festive', 'festive', 'medium', '', { motifs: ['star', 'diya'] }));
  pick(/pongal|sankranti|harvest|ugadi|new year/, mk('Harvest flowers', 'lotus', 'monsoon', 'medium'), mk('Fresh kalamkari', 'kalamkari', 'heritage', 'medium'));
  pick(/dasara|navaratri|dussehra|durga|temple/, mk('Temple lotus', 'lotus', 'festive', 'medium'), mk('Festive paisley', 'festive', 'festive', 'rich'));
  pick(/wedding|bride|marriage/, mk('Wedding peacocks', 'peacock', 'peacock', 'medium'), mk('Gold paisley', 'kalamkari', 'festive', 'light'));
  pick(/monsoon|rain|summer|cool|calm/, mk('Quiet lotus', 'lotus', 'monsoon', 'light'), mk('Soft kalamkari', 'kalamkari', 'monsoon', 'light'));
  out.push(mk('Classic kalamkari', 'kalamkari', 'heritage', 'medium'), mk('Peacock garden', 'peacock', 'peacock', 'medium'), mk('Festival glow', 'festive', 'festive', 'medium'));
  return out.filter((x, i, a) => a.findIndex(y => y.name === x.name) === i).slice(0, 3);
}
function bgIdeaFromAi(v) { if (!v || typeof v !== 'object') return null; const motifs = (Array.isArray(v.motifs) ? v.motifs : []).filter(m => BG_MOTIF_IDS.includes(m)); const colors = (Array.isArray(v.palette) ? v.palette : []).map(bgHex).filter(Boolean); if (!motifs.length) return null; return bgClean({ style: 'custom', motifs, palette: colors.length === 4 ? 'custom' : 'heritage', colors: colors.length === 4 ? colors : [], density: v.density, strength: v.strength, tint: v.tint, seed: 1 + Math.floor(Math.random() * 9000), name: v.name || 'Claude’s idea' }); }
async function bgAsk() {
  const occ = String((el_('bg-occ') || {}).value || '').trim(); BG.busy = true; BG.msg = 'Asking Claude…'; bgRedraw();
  let ideas = [], note = '';
  try { if (typeof aiReady === 'function' && aiReady('background')) { const j = await aiCall('background', { occasion: occ, current: bgCurrent().name || BG_STYLES[bgCurrent().style].name }); ideas = ((j.data && j.data.ideas) || []).map(bgIdeaFromAi).filter(Boolean).slice(0, 3); if (!ideas.length) note = 'Claude gave nothing usable. Showing built-in ideas instead.'; } } catch (e) { note = aiMsg(e) + ' Showing built-in ideas instead.'; }
  if (!ideas.length) { ideas = bgIdeasBuiltin(occ); note = note || 'Claude is not connected, so these are built-in ideas (add the key in Settings → Security for fresh ones).'; }
  BG.ideas = ideas; BG.msg = note; BG.busy = false; bgRedraw();
}
function bgPreviewHTML(spec) {
  const u = bgUrl(spec), tint = bgClean(spec).tint;
  return `<div class="bg-preview" id="bg-preview" style="background-image:${u.replace(/"/g, '&quot;')};${tint ? 'background-color:' + tint : ''}"><div class="bg-mock"><div class="bg-mock-nav"><b>Anitha Pemmasani</b><span>HOME · COLLECTION · SAREE CARE · JOURNAL</span></div><div class="bg-mock-hero"><small>MOMENT I</small><b>A Tuesday <i>morning.</i></b></div><p>“Light enough to forget you are wearing it, and kind enough to last the whole working day.”</p></div></div>`;
}
function backgroundCardHTML() {
  const d = bgDraft(), cur = bgCurrent(), looks = (db.home && db.home.backgroundLooks) || [], same = bgSame(d, cur), chip = (on, fn, label) => `<button type="button" class="bg-chip ${on ? 'on' : ''}" aria-pressed="${on}" onclick="${fn}">${label}</button>`;
  return `<div class="admin-card" id="bg-card"><h3>🎨 Website background</h3>
    <p class="note" style="margin:0 0 8px">A soft pattern behind the whole website: kalamkari paisleys, peacocks, lotus, festival lamps. Build it below and watch the preview. <b>Nothing changes on the website until you press “Put this on the website”.</b> Change it for each festival, and save looks to bring them back later.</p>
    <p class="note" id="bg-status" style="margin:0 0 6px"></p>
    <div id="bg-preview-box">${bgPreviewHTML(d)}</div>
    <div class="bg-ctl"><div><b>Style</b><div class="bg-chips">${Object.keys(BG_STYLES).filter(k => k !== 'custom' || d.style === 'custom').map(k => chip(d.style === k, `bgSet('style','${k}')`, esc(k === 'custom' ? 'Claude’s idea' + (d.name ? ': ' + d.name : '') : BG_STYLES[k].name))).join('')}</div></div>
    <div><b>Colours</b><div class="bg-chips">${Object.keys(BG_PALETTES).map(k => chip(d.palette === k, `bgSet('palette','${k}')`, `<span class="bg-sw">${BG_PALETTES[k].c.map(x => `<i style="background:${x}"></i>`).join('')}</span> ${esc(BG_PALETTES[k].name.split(' (')[0])}`)).join('')}${d.palette === 'custom' ? chip(true, "bgSet('palette','custom')", `<span class="bg-sw">${d.colors.map(x => `<i style="background:${x}"></i>`).join('')}</span> From the idea`) : ''}</div></div>
    <div><b>How full</b><div class="bg-chips">${['light', 'medium', 'rich'].map(k => chip(d.density === k, `bgSet('density','${k}')`, { light: 'Light', medium: 'Medium', rich: 'Rich' }[k])).join('')}</div></div>
    <div><b>How strong</b> <small id="bg-str-v">${Math.round(d.strength * 100)}%</small><input id="bg-str" type="range" min="8" max="40" step="1" value="${Math.round(d.strength * 100)}" oninput="bgSet('strength',this.value/100,true)" aria-label="How strong the pattern is"></div>
    <div><b>Positions</b> <small>(shuffle number <span id="bg-seed">${d.seed}</span>)</small><div class="bg-chips"><button type="button" class="bg-chip" onclick="bgShuffle()">🔀 Shuffle positions</button></div></div></div>
    <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" id="bg-apply" onclick="bgApply()">🌐 Put this on the website</button><button type="button" class="btn-sm" onclick="bgRemove()">Remove the background</button><button type="button" class="btn-sm" onclick="bgReset()">↺ Back to what the website has now</button></div>
    <div class="th-ai" id="bg-ai"><label for="bg-occ"><b>✨ Ask Claude for a background idea</b> (a festival or a feeling, optional)</label><div class="th-ai-row"><input id="bg-occ" type="text" maxlength="100" placeholder="e.g. Diwali, a wedding season, calm monsoon"><button type="button" class="btn-sm btn-info-sm" onclick="bgAsk()" ${BG.busy ? 'disabled' : ''}>Give me 3 ideas</button></div>
      ${BG.ideas.length ? `<div class="bg-ideas">${BG.ideas.map((x, i) => `<div class="bg-idea"><div class="bg-idea-pic" style="background-image:${bgUrl(x).replace(/"/g, '&quot;')};${x.tint ? 'background-color:' + x.tint : ''}"></div><b>${esc(x.name || 'Idea')}</b><small>${esc(BG_STYLES[x.style].name)} · ${esc(x.density)}</small><button type="button" class="btn-sm btn-info-sm" onclick="bgUseIdea(${i})">Preview this</button></div>`).join('')}</div>` : ''}
      ${BG.msg ? `<p class="note" role="status" style="margin:8px 0 0">${esc(BG.msg)}</p>` : ''}</div>
    <div class="bg-looks"><b>Saved looks</b> <small>(for festivals and seasons)</small>${looks.length ? `<div class="hn-list">${looks.map(l => `<div><span>${esc(l.name)}<small>${esc(BG_STYLES[bgClean(l.spec).style].name)} · ${esc(bgClean(l.spec).density)}</small></span><span class="th-actions" style="margin:0"><button type="button" class="btn-sm" onclick="bgLookPreview('${l.id}')">Preview</button><button type="button" class="btn-sm btn-primary-sm" onclick="bgLookApply('${l.id}')">Put on website</button><button type="button" class="btn-sm" onclick="bgLookDel('${l.id}')">Delete</button></span></div>`).join('')}</div>` : '<p class="note">None yet. Build a look you like, give it a name (for example “Diwali 2026”) and save it.</p>'}
      <div class="th-ai-row"><input id="bg-name" type="text" maxlength="40" placeholder="Name this look, e.g. Diwali 2026" value="${esc(BG.saveName)}" oninput="BG.saveName=this.value"><button type="button" class="btn-sm" onclick="bgSaveLook()">💾 Save this look</button></div></div></div>`;
}
function bgRedraw() { const c = el_('bg-card'); if (!c) return; const t = c.parentNode, y = window.scrollY; c.outerHTML = backgroundCardHTML(); bgStatus(); }
function bgStatus() { const e = el_('bg-status'); if (!e) return; const same = bgSame(bgDraft(), bgCurrent()); e.innerHTML = same ? `On the website now: <b>${esc(bgCurrent().style === 'plain' ? 'no background' : (bgCurrent().name || BG_STYLES[bgCurrent().style].name))}</b>.` : `<b>Preview only</b>: this is not on the website yet. On the website now: ${esc(bgCurrent().style === 'plain' ? 'no background' : (bgCurrent().name || BG_STYLES[bgCurrent().style].name))}.`; e.className = 'note' + (same ? '' : ' bg-unsaved'); const b = el_('bg-apply'); if (b) b.disabled = same; }
function bgLive() { const b = el_('bg-preview-box'); if (b) b.innerHTML = bgPreviewHTML(bgDraft()); const s = el_('bg-seed'); if (s) s.textContent = bgDraft().seed; bgStatus(); }
function bgSet(k, v, soft) {
  const d = bgDraft(); if (k === 'style') { const st = BG_STYLES[v]; d.style = v; if (v !== 'custom') { d.palette = st.palette; d.colors = []; d.motifs = []; d.name = ''; } } else d[k] = v;
  BG.draft = bgClean(d); if (k === 'strength') { const e = el_('bg-str-v'); if (e) e.textContent = Math.round(BG.draft.strength * 100) + '%'; return bgLive(); } if (soft) return bgLive(); bgRedraw();
}
function bgShuffle() { BG.draft = bgClean({ ...bgDraft(), seed: 1 + Math.floor(Math.random() * 99999) }); bgLive(); }
function bgUseIdea(i) { const x = BG.ideas[i]; if (!x) return; BG.draft = bgClean(x); bgRedraw(); const p = el_('bg-preview-box'); if (p) p.scrollIntoView({ block: 'center' }); }
function bgReset() { BG.draft = bgCurrent(); bgRedraw(); }
function bgApply() { const d = bgClean(bgDraft()); db.home.background = d; BG.draft = d; homeLive(false); if (typeof homeFlush === 'function') homeFlush(); applyBackground(); bgRedraw(); showToast('The background is now on the website.', 'success'); }
function bgRemove() { if (!confirm('Remove the background from the website?')) return; BG.draft = bgClean({ style: 'plain' }); bgApply(); showToast('Background removed.', 'success'); }
function bgSaveLook() { const name = String(BG.saveName || '').trim().slice(0, 40); if (!name) return showToast('Give the look a name first, for example Diwali 2026.', 'error'); const L = (db.home.backgroundLooks = db.home.backgroundLooks || []); if (L.length >= 12) return showToast('You can keep up to 12 looks. Delete one first.', 'error'); L.unshift({ id: 'bl' + Date.now().toString(36), name, spec: { ...bgClean(bgDraft()), name } }); BG.saveName = ''; homeLive(false); if (typeof homeFlush === 'function') homeFlush(); bgRedraw(); showToast('Saved. It stays here for next year.', 'success'); }
function bgLookPreview(id) { const l = ((db.home && db.home.backgroundLooks) || []).find(x => x.id === id); if (!l) return; BG.draft = bgClean(l.spec); bgRedraw(); const p = el_('bg-preview-box'); if (p) p.scrollIntoView({ block: 'center' }); }
function bgLookApply(id) { const l = ((db.home && db.home.backgroundLooks) || []).find(x => x.id === id); if (!l) return; BG.draft = bgClean(l.spec); bgApply(); }
function bgLookDel(id) { if (!confirm('Delete this saved look?')) return; db.home.backgroundLooks = ((db.home && db.home.backgroundLooks) || []).filter(x => x.id !== id); homeLive(false); if (typeof homeFlush === 'function') homeFlush(); bgRedraw(); }
