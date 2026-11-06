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
const BG_MOTIF_IDS = ['paisley', 'flower', 'vine', 'peacock', 'feather', 'lotus', 'diya', 'star', 'sun', 'kolam', 'mandala', 'jasmine', 'mango'];
const BG_LAYOUTS = { scatter: 'Scattered', border: 'Frame around the edges', corners: 'Big corners', vine: 'Flowing vine', tile: 'Repeating pattern' };
const bgHex = v => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '';
const bgRng = seed => { let a = (Number(seed) || 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function bgClean(v) {
  v = v && typeof v === 'object' ? v : {}; const style = BG_STYLES[v.style] ? v.style : 'plain', pal = BG_PALETTES[v.palette] || v.palette === 'custom' ? v.palette : (BG_STYLES[style].palette);
  const colors = (Array.isArray(v.colors) ? v.colors : []).map(bgHex).filter(Boolean).slice(0, 4);
  const motifs = (Array.isArray(v.motifs) ? v.motifs : []).filter(m => BG_MOTIF_IDS.includes(m)).filter((m, i, a) => a.indexOf(m) === i).slice(0, 6);
  return { style, palette: pal === 'custom' && colors.length === 4 ? 'custom' : (BG_PALETTES[pal] ? pal : BG_STYLES[style].palette), colors: colors.length === 4 ? colors : [], motifs, density: BG_DENSITY[v.density] ? v.density : 'medium', layout: BG_LAYOUTS[v.layout] ? v.layout : 'scatter', strength: Math.min(0.4, Math.max(0.08, Number(v.strength) || 0.26)), seed: Math.max(1, Math.floor(Number(v.seed)) || 1), tint: bgHex(v.tint), name: String(v.name || '').replace(/[<>"]/g, '').slice(0, 40) };
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
  sun: (c, r) => Array.from({ length: 24 }, (_, i) => `<path d="M50 50 L${(50 + (i % 2 ? 36 : 44) * Math.cos(i * Math.PI / 12)).toFixed(1)} ${(50 + (i % 2 ? 36 : 44) * Math.sin(i * Math.PI / 12)).toFixed(1)}" stroke="${i % 2 ? c[1] : c[0]}" stroke-width="${i % 2 ? 1.6 : 2.4}" stroke-linecap="round"/>`).join('') + `<circle cx="50" cy="50" r="21" fill="${c[3]}" fill-opacity=".85" stroke="${c[0]}" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="${c[2]}" stroke="${c[1]}" stroke-width="1.6"/>`,
  kolam: (c, r) => `<path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="${c[1]}" stroke-width="2"/><path d="M50 24 L76 50 L50 76 L24 50 Z" fill="${c[2]}" fill-opacity=".5" stroke="${c[0]}" stroke-width="2"/><path d="M50 40 C60 40 60 60 50 60 C40 60 40 40 50 40z" fill="none" stroke="${c[0]}" stroke-width="1.6"/>` + [[50, 6], [94, 50], [50, 94], [6, 50], [28, 28], [72, 28], [72, 72], [28, 72], [50, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c[3]}" stroke="${c[0]}" stroke-width=".8"/>`).join(''),
  mandala: (c, r) => Array.from({ length: 12 }, (_, i) => `<ellipse cx="50" cy="26" rx="6" ry="19" transform="rotate(${i * 30} 50 50)" fill="${c[1]}" fill-opacity=".38" stroke="${c[0]}" stroke-width="1.2"/>`).join('') + Array.from({ length: 12 }, (_, i) => `<ellipse cx="50" cy="35" rx="4" ry="10" transform="rotate(${i * 30 + 15} 50 50)" fill="${c[2]}" fill-opacity=".7" stroke="${c[0]}" stroke-width="1"/>`).join('') + `<circle cx="50" cy="50" r="9" fill="${c[3]}" stroke="${c[0]}" stroke-width="1.4"/><circle cx="50" cy="50" r="3.4" fill="${c[0]}"/>`,
  jasmine: (c, r) => `<path d="M10 90 C30 60 50 50 80 14" fill="none" stroke="${c[0]}" stroke-width="2" stroke-linecap="round"/>` + [[26, 74, -40], [44, 56, 30], [60, 40, -30]].map(([x, y, a]) => `<path d="M${x} ${y} q 8 -14 18 -6 q -6 14 -18 6z" transform="rotate(${a} ${x} ${y})" fill="${c[2]}" fill-opacity=".8" stroke="${c[0]}" stroke-width="1.2"/>`).join('') + [[34, 62], [52, 46], [72, 24]].map(([x, y]) => Array.from({ length: 5 }, (_, i) => `<ellipse cx="${x}" cy="${y - 7}" rx="4.4" ry="8" transform="rotate(${i * 72} ${x} ${y})" fill="#fffdf8" fill-opacity=".9" stroke="${c[0]}" stroke-width="1"/>`).join('') + `<circle cx="${x}" cy="${y}" r="2.6" fill="${c[3]}"/>`).join(''),
  mango: (c, r) => `<path d="M50 6 C82 10 94 42 86 68 C78 92 52 98 38 86 C28 76 36 62 47 64 C56 66 58 77 52 80" fill="${c[2]}" fill-opacity=".6" stroke="${c[0]}" stroke-width="2.4" stroke-linejoin="round"/><path d="M50 20 C74 26 82 48 74 66 C66 82 50 84 44 76" fill="none" stroke="${c[1]}" stroke-width="1.8"/><path d="M50 34 C64 38 68 52 62 62" fill="none" stroke="${c[0]}" stroke-width="1.4"/>` + [[58, 42], [66, 56], [60, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c[1]}"/>`).join('') + `<path d="M46 6 q-2 -4 -8 -4 q 2 5 8 4z" fill="${c[0]}"/>`,
};
// the whole picture as one SVG (W x H), motifs scattered at random positions: most near the left and right edges so the middle stays calm to read
function bgSvg(spec, W = 1600, H = 1000) {
  const portrait = H > W;   // phones: a tall picture, so the art is not cropped away when it is fitted to a narrow screen
  const s = bgClean(spec), style = BG_STYLES[s.style]; if (s.style === 'plain') return '';
  const motifs = s.style === 'custom' ? (s.motifs.length ? s.motifs : ['paisley', 'flower']) : style.motifs, c = bgColors(s), rnd = bgRng(s.seed), n = BG_DENSITY[s.density], pick = () => motifs[Math.floor(rnd() * motifs.length)];
  const base = id => (id === 'peacock' ? 190 : id === 'mandala' || id === 'sun' ? 110 : 125) * (portrait ? 0.9 : 1), items = []; let extra = '';
  const add = (id, x, y, size, rot) => items.push({ id, x, y, size, rot });
  if (s.layout === 'border') {   // a frame of art around the edges, the middle left clear
    const per = 2 * (W + H), step = per / Math.max(8, Math.round(n * 1.15)); for (let d = rnd() * step * 0.5, i = 0; d < per; d += step, i++) {
      const id = pick(), inset = 0.045; let x, y, face; const t = d; if (t < W) { x = t; y = H * inset; face = 180; } else if (t < W + H) { x = W * (1 - inset); y = t - W; face = 270; } else if (t < 2 * W + H) { x = 2 * W + H - t; y = H * (1 - inset); face = 0; } else { x = W * inset; y = per - t; face = 90; }
      add(id, x, y, base(id) * (0.85 + rnd() * 0.4), Math.round(face + (rnd() - 0.5) * 50)); }
  } else if (s.layout === 'corners') {   // four big motifs in the corners and a few small ones beside them
    [[0.1, 0.12, 25], [0.9, 0.12, -25], [0.1, 0.88, -25], [0.9, 0.88, 25]].forEach(([fx, fy, rot]) => { const id = pick(); add(id, fx * W, fy * H, base(id) * (portrait ? 2.2 : 2.6) * (0.85 + rnd() * 0.3), rot + Math.round((rnd() - 0.5) * 20)); });
    for (let i = 0; i < Math.round(n * 0.7); i++) { const id = pick(), cx = rnd() < 0.5 ? 0 : 1, cy = rnd() < 0.5 ? 0 : 1, x = (cx ? 1 - rnd() * 0.3 : rnd() * 0.3) * W, y = (cy ? 1 - rnd() * 0.32 : rnd() * 0.32) * H; add(id, x, y, base(id) * (0.4 + rnd() * 0.4), Math.round((rnd() - 0.5) * 90)); }
  } else if (s.layout === 'vine') {   // one flowing line across the picture with motifs growing along it
    const waves = 1 + rnd() * 1.5, phase = rnd() * 6.28, amp = 0.3, pts = [], N = Math.max(10, Math.round(n * 0.9));
    const at = u => portrait ? [W * (0.5 + amp * Math.sin(u * 6.283 * waves + phase)), H * (0.04 + 0.92 * u)] : [W * (0.03 + 0.94 * u), H * (0.5 + amp * Math.sin(u * 6.283 * waves + phase))];
    for (let i = 0; i <= 40; i++) pts.push(at(i / 40)); extra = `<path d="M${pts.map(q => q[0].toFixed(0) + ' ' + q[1].toFixed(0)).join(' L')}" fill="none" stroke="${c[0]}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    for (let i = 0; i < N; i++) { const u = (i + 0.5) / N, [x, y] = at(u), id = pick(), side = i % 2 ? 1 : -1, off = (40 + rnd() * 50) * side; add(id, portrait ? x + off : x, portrait ? y : y + off, base(id) * (0.8 + rnd() * 0.45), Math.round((portrait ? side * 20 : side * 25) + (rnd() - 0.5) * 40)); }
  } else if (s.layout === 'tile') {   // an even repeating pattern, every other row shifted half a step
    const sp = Math.sqrt(W * H / Math.max(8, n * 1.25)), rows = Math.ceil(H / sp) + 1, cols = Math.ceil(W / sp) + 1;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const id = motifs[(i + j * 2 + Math.floor(rnd() * 2)) % motifs.length]; add(id, (i + (j % 2 ? 0.5 : 0)) * sp, j * sp, Math.min(sp * 0.9, base(id) * 1.05), Math.round((rnd() - 0.5) * 24)); }
  } else {   // scattered: most near the left and right edges so the middle stays calm to read
    const placed = []; for (let i = 0; i < n; i++) {
      const id = pick(), size = base(id) * (0.65 + rnd() * 0.7); let x = 0, y = 0;
      for (let t = 0; t < 25; t++) { const edge = rnd() < (portrait ? 0.45 : 0.72); x = edge ? (rnd() < 0.5 ? rnd() * (portrait ? 0.3 : 0.24) : 1 - rnd() * (portrait ? 0.3 : 0.24)) * W : rnd() * W; y = rnd() * H; if (placed.every(q => Math.hypot(q[0] - x, q[1] - y) > (q[2] + size) * 0.5)) break; }
      placed.push([x, y, size]); add(id, x, y, size, Math.round((rnd() - 0.5) * (id === 'peacock' ? 24 : 80)));
    }
  }
  const g = items.map(m => { const k = m.size / 100, flip = rnd() < 0.5 ? -1 : 1; return `<g transform="translate(${m.x.toFixed(0)} ${m.y.toFixed(0)}) rotate(${m.rot}) scale(${(k * flip).toFixed(3)} ${k.toFixed(3)}) translate(-50 -50)">${BG_ART[m.id](c, rnd)}</g>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><g opacity="${s.strength}">${extra}${g}</g></svg>`;
}
const bgDims = () => (typeof window !== 'undefined' && window.innerWidth < window.innerHeight * 0.95) ? [800, 1400] : [1600, 1000];
const bgUrl = (spec, dims) => { const d = dims || bgDims(), svg = bgSvg(spec, d[0], d[1]); return svg ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : 'none'; };
// ---- the website: one fixed layer behind everything ----
let BG_SHAPE = ''; window.addEventListener && window.addEventListener('resize', () => { clearTimeout(window.__bgT); window.__bgT = setTimeout(() => { const sh = bgDims().join('x'); if (sh !== BG_SHAPE && document.getElementById('siteBg')) applyBackground(); }, 250); });
function applyBackground() {
  if (typeof BUILD !== 'undefined' && BUILD === 'admin') return;
  const sf = document.getElementById('storefrontView'); if (!sf) return; let el = document.getElementById('siteBg');
  const spec = db && db.home && db.home.background ? bgClean(db.home.background) : null;
  if (!spec || spec.style === 'plain') { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'siteBg'; el.setAttribute('aria-hidden', 'true'); sf.insertBefore(el, sf.firstChild); }
  BG_SHAPE = bgDims().join('x'); el.style.backgroundImage = bgUrl(spec); el.style.backgroundColor = spec.tint || ''; el.dataset.style = spec.style;
}
// ---- the admin card: build a look, see it big, then deploy ----
const BG = { draft: null, ideas: [], shown: [], round: 0, msg: '', busy: false, saveName: '' };
const bgCurrent = () => bgClean((db.home && db.home.background) || { style: 'plain' });
const bgDraft = () => { if (!BG.draft) BG.draft = bgCurrent(); return BG.draft; };
const bgSame = (a, b) => JSON.stringify(bgClean(a)) === JSON.stringify(bgClean(b));
const bgHex2 = (h, sat, lig) => { h = ((h % 360) + 360) % 360; sat /= 100; lig /= 100; const k = n => (n + h / 30) % 12, a = sat * Math.min(lig, 1 - lig), f = n => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))), x = v => Math.round(v * 255).toString(16).padStart(2, '0'); return '#' + x(f(0)) + x(f(8)) + x(f(4)); };
const bgPick = a => a[Math.floor(Math.random() * a.length)];
const BG_NAMES = { kalamkari: ['Kalamkari garden', 'Loom paisleys', 'Madder and indigo'], peacock: ['Peacock courtyard', 'Feather fan', 'Mor pankh'], festive: ['Festival glow', 'Lamps and stars', 'Golden evening'], lotus: ['Lotus pond', 'Temple lotus', 'Quiet lotus'], custom: ['Handloom bloom', 'Silk and sun', 'Mango and jasmine', 'Rangoli corners', 'Morning mandala'] };
// a brand-new design, made on the spot from random choices (a new look every press, no Claude needed)
function bgSurprise() {
  const style = bgPick(['kalamkari', 'peacock', 'festive', 'lotus', 'custom']), layout = bgPick(Object.keys(BG_LAYOUTS)), h = Math.floor(Math.random() * 360), dark = bgHex2(h, 45, 22), accent = bgHex2(h + bgPick([20, 160, 200, 340]), 58, 44), soft = bgHex2(h + 8, 32, 86), gold = bgHex2(bgPick([38, 42, 46]), 62, 50);
  const motifs = style === 'custom' ? [...BG_MOTIF_IDS].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2)) : [];
  return bgClean({ style, layout, density: bgPick(['light', 'medium', 'medium', 'rich']), strength: 0.22 + Math.random() * 0.1, seed: 1 + Math.floor(Math.random() * 99999), motifs, palette: style === 'custom' || Math.random() < 0.6 ? 'custom' : bgPick(Object.keys(BG_PALETTES)), colors: [dark, accent, soft, gold], name: bgPick(BG_NAMES[style]) + (layout === 'border' ? ' frame' : layout === 'corners' ? ' corners' : layout === 'vine' ? ' vine' : layout === 'tile' ? ' pattern' : '') });
}
function bgIdeasBuiltin(text) {
  const t = String(text || '').toLowerCase(), mk = (name, style, palette, density, layout, motifs) => bgClean({ style, palette, density, layout, motifs: motifs || [], strength: 0.24, seed: 1 + Math.floor(Math.random() * 99999), name }), want = [];
  const pick = (re, ...ideas) => { if (re.test(t)) want.push(...ideas); };
  pick(/diwali|deepavali|lamp|light|glow/, mk('Diwali lamps', 'festive', 'festive', 'rich', 'border'), mk('Golden stars', 'custom', 'festive', 'medium', 'tile', ['star', 'diya', 'sun']), mk('Rangoli corners', 'custom', 'festive', 'medium', 'corners', ['kolam', 'diya', 'mandala']));
  pick(/pongal|sankranti|harvest|ugadi|new year|mango/, mk('Harvest sun', 'custom', 'monsoon', 'medium', 'scatter', ['sun', 'mango', 'jasmine']), mk('Fresh kalamkari', 'kalamkari', 'heritage', 'medium', 'vine'), mk('Mango leaves frame', 'custom', 'monsoon', 'light', 'border', ['mango', 'vine', 'flower']));
  pick(/dasara|navaratri|dussehra|durga|temple|goddess/, mk('Temple lotus', 'lotus', 'festive', 'medium', 'border'), mk('Navaratri mandala', 'custom', 'festive', 'rich', 'tile', ['mandala', 'lotus', 'kolam']), mk('Festive paisley corners', 'festive', 'festive', 'rich', 'corners'));
  pick(/wedding|bride|marriage|reception/, mk('Wedding peacocks', 'peacock', 'peacock', 'medium', 'corners'), mk('Gold paisley vine', 'kalamkari', 'festive', 'light', 'vine'), mk('Jasmine frame', 'custom', 'peacock', 'medium', 'border', ['jasmine', 'lotus', 'paisley']));
  pick(/monsoon|rain|summer|cool|calm|quiet/, mk('Quiet lotus', 'lotus', 'monsoon', 'light', 'scatter'), mk('Soft kalamkari', 'kalamkari', 'monsoon', 'light', 'tile'));
  const shown = new Set(BG.shown), out = []; want.sort(() => Math.random() - 0.5).forEach(x => { if (out.length < 3 && !shown.has(x.name)) out.push(x); });
  while (out.length < 3) { const x = bgSurprise(); if (!out.some(y => y.name === x.name) && !shown.has(x.name)) out.push(x); else if (Math.random() < 0.3) { x.name += ' ' + (out.length + 2); out.push(x); } }
  return out.slice(0, 3);
}
function bgIdeaFromAi(v) {
  if (!v || typeof v !== 'object') return null; const motifs = (Array.isArray(v.motifs) ? v.motifs : []).filter(m => BG_MOTIF_IDS.includes(m)); const colors = (Array.isArray(v.palette) ? v.palette : []).map(bgHex).filter(Boolean); if (!motifs.length) return null;
  return bgClean({ style: 'custom', motifs, palette: colors.length === 4 ? 'custom' : 'heritage', colors: colors.length === 4 ? colors : [], density: v.density, layout: v.layout, strength: Math.max(0.2, Number(v.strength) || 0.26), tint: v.tint, seed: 1 + Math.floor(Math.random() * 99999), name: v.name || 'Claude’s idea' });
}
// the colours the website itself uses (Home Page → Website colours): the background should sit well with them
const bgPageColours = () => { const t = (db.home && db.home.theme) || {}, o = {}; ['accent', 'ink', 'bg', 'cream', 'sage'].forEach(k => { const h = bgHex(t[k]); if (h) o[k] = h; }); return { accent: o.accent || '#8a6038', ink: o.ink || '#2c2c2c', bg: o.bg || '#faf9f6', cream: o.cream || '#f5f1ea', sage: o.sage || '#5b6f61' }; };
function bgIdeasFromPage(pc) {   // three designs built from the page's own colours (no Claude needed)
  const mk = (name, style, layout, motifs, colors, density) => bgClean({ style, layout, motifs, palette: 'custom', colors, density, strength: 0.26, seed: 1 + Math.floor(Math.random() * 99999), name, tint: '' });
  const gold = '#b8923a';
  return [mk('Page colours frame', 'custom', 'border', ['paisley', 'flower', 'vine'], [pc.ink, pc.accent, pc.cream, gold], 'medium'), mk('Page colours corners', 'custom', 'corners', ['lotus', 'mandala', 'jasmine'], [pc.accent, pc.sage, pc.cream, gold], 'medium'), mk('Page colours vine', 'custom', 'vine', ['mango', 'feather', 'flower'], [pc.sage, pc.accent, pc.cream, gold], 'light')];
}
async function bgMatch() {
  const occ = String((el_('bg-occ') || {}).value || '').trim(), pc = bgPageColours(); BG.busy = true; BG.round++; BG.msg = 'Asking Claude to match the colours of your page…'; bgRedraw();
  let ideas = [], note = '';
  try { if (typeof aiReady === 'function' && aiReady('background')) { const j = await aiCall('background', { mode: 'match', occasion: occ, current: bgCurrent().name || BG_STYLES[bgCurrent().style].name, pageColours: pc, avoid: BG.shown.slice(-9), round: BG.round }); ideas = ((j.data && j.data.ideas) || []).map(bgIdeaFromAi).filter(Boolean).slice(0, 3); if (!ideas.length) note = 'Claude gave nothing usable. Showing designs built from your page colours instead.'; } } catch (e) { note = aiMsg(e) + ' Showing designs built from your page colours instead.'; }
  if (!ideas.length) { ideas = bgIdeasFromPage(pc); note = note || 'Claude is not connected, so these three are built directly from your page colours (add the key in Settings → Security for Claude\'s own ideas).'; }
  BG.ideas = ideas; BG.shown.push(...ideas.map(x => x.name)); BG.msg = note; BG.busy = false; bgRedraw();
}
async function bgAsk() {
  const occ = String((el_('bg-occ') || {}).value || '').trim(); BG.busy = true; BG.round++; BG.msg = 'Asking Claude…'; bgRedraw();
  let ideas = [], note = '';
  try { if (typeof aiReady === 'function' && aiReady('background')) { const j = await aiCall('background', { occasion: occ, current: bgCurrent().name || BG_STYLES[bgCurrent().style].name, avoid: BG.shown.slice(-9), round: BG.round }); ideas = ((j.data && j.data.ideas) || []).map(bgIdeaFromAi).filter(Boolean).slice(0, 3); if (!ideas.length) note = 'Claude gave nothing usable. Showing built-in ideas instead.'; } } catch (e) { note = aiMsg(e) + ' Showing built-in ideas instead.'; }
  if (!ideas.length) { ideas = bgIdeasBuiltin(occ); note = note || 'Claude is not connected, so these are built-in designs, new each time (add the key in Settings → Security for Claude\'s own ideas).'; }
  BG.ideas = ideas; BG.shown.push(...ideas.map(x => x.name)); BG.msg = note; BG.busy = false; bgRedraw();
}
function bgSurpriseMe() { BG.draft = bgSurprise(); bgRedraw(); const p = el_('bg-preview-box'); if (p) p.scrollIntoView({ block: 'center' }); }
function bgPreviewHTML(spec) {
  const u = bgUrl(spec, [1600, 1000]), tint = bgClean(spec).tint;
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
    <div><b>Layout</b><div class="bg-chips">${Object.keys(BG_LAYOUTS).map(k => chip(d.layout === k, `bgSet('layout','${k}')`, BG_LAYOUTS[k])).join('')}</div></div>
    <div><b>How full</b><div class="bg-chips">${['light', 'medium', 'rich'].map(k => chip(d.density === k, `bgSet('density','${k}')`, { light: 'Light', medium: 'Medium', rich: 'Rich' }[k])).join('')}</div></div>
    <div><b>How strong</b> <small id="bg-str-v">${Math.round(d.strength * 100)}%</small><input id="bg-str" type="range" min="8" max="40" step="1" value="${Math.round(d.strength * 100)}" oninput="bgSet('strength',this.value/100,true)" aria-label="How strong the pattern is"></div>
    <div><b>Positions</b> <small>(shuffle number <span id="bg-seed">${d.seed}</span>)</small><div class="bg-chips"><button type="button" class="bg-chip" onclick="bgShuffle()">🔀 Shuffle positions</button></div></div></div>
    <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" id="bg-apply" onclick="bgApply()">🌐 Put this on the website</button><button type="button" class="btn-sm" onclick="bgRemove()">Remove the background</button><button type="button" class="btn-sm" onclick="bgReset()">↺ Back to what the website has now</button><button type="button" class="btn-sm btn-info-sm" onclick="bgSurpriseMe()">🎲 Surprise me with a new design</button></div>
    <div class="th-ai" id="bg-ai"><label for="bg-occ"><b>✨ Ask Claude for a background idea</b> (a festival or a feeling, optional)</label><div class="bg-pagecol"><span>Colours of your page:</span>${(() => { const pc = bgPageColours(); return Object.entries(pc).map(([k, v]) => `<i class="bg-pc" style="background:${v}" title="${esc(k)} ${esc(v)}"></i>`).join(''); })()}<button type="button" class="btn-sm btn-primary-sm" onclick="bgMatch()" ${BG.busy ? 'disabled' : ''}>✨ Suggest backgrounds that match my page colours</button></div>
      <div class="th-ai-row"><input id="bg-occ" type="text" maxlength="100" placeholder="e.g. Diwali, a wedding season, calm monsoon"><button type="button" class="btn-sm btn-info-sm" onclick="bgAsk()" ${BG.busy ? 'disabled' : ''}>${BG.ideas.length ? 'Give me 3 NEW ideas' : 'Give me 3 ideas'}</button></div>
      ${BG.ideas.length ? `<div class="bg-ideas">${BG.ideas.map((x, i) => `<div class="bg-idea"><div class="bg-idea-pic" style="background-image:${bgUrl(x, [1600, 1000]).replace(/"/g, '&quot;')};${x.tint ? 'background-color:' + x.tint : ''}"></div><b>${esc(x.name || 'Idea')}</b><small>${esc(BG_LAYOUTS[x.layout])} · ${esc(x.density)}</small><button type="button" class="btn-sm btn-info-sm" onclick="bgUseIdea(${i})">Preview this</button></div>`).join('')}</div>` : ''}
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
