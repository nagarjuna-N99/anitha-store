// ================= HOME PAGE: HERO SLIDES, CATEGORY STRIP, SECTIONS =================
// Everything on the storefront home page is driven by db.home, edited in Admin → Home Page (changes show instantly).
const HOME_PAGES_BASE = [['care', 'Saree Care'], ['journal', 'Journal'], ['favourites', 'Favourites'], ['terms', 'Terms & Conditions'], ['privacy', 'Privacy Policy']];
const safeImg = u => /^(https?:\/\/|data:image\/)/i.test(String(u || '')) ? String(u) : '';
function defaultHome() {
  return {
    hero: { autoplay: true, interval: 6, slides: [{ id: 'hs1', enabled: true, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=2574', focus: 'center', pos: 'left', overlay: 85, eyebrow: 'Est. Hyderabad', title: 'The Art of Slow Weaving', subtitle: 'Curated pure handloom sarees, honoring the legacy of Indian master artisans.', btnText: 'Explore the Collection', link: { type: 'shop', value: '' } }] },
    quote: { show: true, text: 'Every thread is a story, woven slowly and worn for years.', by: 'Anitha Pemmasani' },
    notes: { show: true, label: 'Written with care', title: 'Notes from the loom', text: 'Now and then we write a short note: a new saree off the loom, how a weave is made, a reminder before a festival. A few lines, only when there is something worth saying.', button: 'Send me the notes' },
    theme: { accent: '#8A6038', ink: '#2C2C2C', bg: '#FAF9F6', cream: '#F5F1EA', sage: '#5B6F61' },
    categories: { show: true, label: 'Shop by category', title: 'Find your weave', items: [
      { category: 'Tussar', enabled: true, image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800' },
      { category: 'Maheswari', enabled: true, image: 'https://images.unsplash.com/photo-1583391733958-e04f9715d184?q=80&w=800' },
      { category: 'Banarasi', enabled: true, image: 'https://images.unsplash.com/photo-1610189012906-4b2a8f8e0c9b?q=80&w=800' },
      { category: 'Kanjeevaram', enabled: true, image: 'https://images.unsplash.com/photo-1596205849889-98e400c784c1?q=80&w=800' }
    ] },
    announcements: [{ id: 'an1', enabled: true, text: 'Complimentary Shipping on Orders Above ₹10,000 · Authentic Handloom Guarantee', startAt: '', endAt: '' }],
    shopBanner: { enabled: true, image: '', eyebrow: 'Our collection', title: 'Handloom sarees, handpicked', subtitle: 'Browse by weave, colour and occasion.', btnText: '', link: { type: 'none', value: '' }, pos: 'center', focus: 'center', overlay: 45, zoom: 100, focusX: 50 },
    arrivals: { show: true, label: 'Handpicked', title: 'New Arrivals', ids: [] },
    signature: { show: true, label: 'Curated Edits', title: 'The Signature Collection', tiles: [
      { id: 'sg1', title: 'The Bridal Edit', subtitle: 'Pure Kanjeevaram', category: 'Kanjeevaram', image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=1200' },
      { id: 'sg2', title: 'Maheswari Silk', subtitle: 'Timeless Elegance', category: 'Maheswari', image: 'https://images.unsplash.com/photo-1583391733958-e04f9715d184?q=80&w=800' }
    ] }
  };
}
// Make sure the home settings are complete, and that every category in the shop has an entry (new ones start hidden).
function syncHomeCats() {
  const d = defaultHome(); let changed = false;
  if (!db.home || typeof db.home !== 'object') { db.home = d; changed = true; }
  const H = db.home;
  ['hero', 'categories', 'arrivals', 'signature', 'shopBanner', 'quote', 'notes', 'theme'].forEach(k => { if (!H[k] || typeof H[k] !== 'object') { H[k] = d[k]; changed = true; } });
  if (!Array.isArray(H.hero.slides)) { H.hero.slides = []; changed = true; }
  if (!Array.isArray(H.categories.items)) { H.categories.items = []; changed = true; }
  if (!Array.isArray(H.signature.tiles)) { H.signature.tiles = []; changed = true; }
  if (!Array.isArray(H.arrivals.ids)) { H.arrivals.ids = []; changed = true; }
  if (!Array.isArray(H.announcements)) { H.announcements = d.announcements; changed = true; }
  const before = H.categories.items.length;
  H.categories.items = H.categories.items.filter(i => db.categories.includes(i.category));
  if (H.categories.items.length !== before) changed = true;
  db.categories.forEach(c => { if (!H.categories.items.some(i => i.category === c)) { H.categories.items.push({ category: c, enabled: false, image: '' }); changed = true; } });
  return changed;
}

// ---- storefront rendering ----
const HERO = { i: 0, timer: null, paused: false };
const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
// ---- text style for each hero slide (font, size, weight, case, spacing, colours...) ----
const HERO_FONTS = [['', 'Website default (Cormorant)', "'Cormorant Garamond', serif", ''], ['Cormorant Garamond', 'Cormorant Garamond', "'Cormorant Garamond', serif", ''], ['Bodoni Moda', 'Bodoni Moda (fashion)', "'Bodoni Moda', Georgia, serif", 'Bodoni+Moda:ital,wght@0,400;0,700;1,400;1,700'], ['Playfair Display', 'Playfair Display (classic)', "'Playfair Display', Georgia, serif", 'Playfair+Display:ital,wght@0,400;0,700;1,400;1,700'], ['DM Serif Display', 'DM Serif Display (soft)', "'DM Serif Display', Georgia, serif", 'DM+Serif+Display:ital@0;1'], ['Abril Fatface', 'Abril Fatface (very bold)', "'Abril Fatface', Georgia, serif", 'Abril+Fatface'], ['Gloock', 'Gloock (sturdy)', "'Gloock', Georgia, serif", 'Gloock'], ['Instrument Serif', 'Instrument Serif (slim)', "'Instrument Serif', Georgia, serif", 'Instrument+Serif:ital@0;1'], ['Fraunces', 'Fraunces (warm)', "'Fraunces', Georgia, serif", 'Fraunces:ital,wght@0,400;0,700;1,400;1,700'], ['Syne', 'Syne (modern)', "'Syne', system-ui, sans-serif", 'Syne:wght@400;700'], ['Inter', 'Inter (plain)', "'Inter', system-ui, sans-serif", '']];
const FONT_LOADED = new Set();
function ensureFont(name) { const f = HERO_FONTS.find(x => x[0] === name); if (!f || !f[3] || FONT_LOADED.has(name)) return; FONT_LOADED.add(name); try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f[3] + '&display=swap'; document.head.appendChild(l); } catch (e) { } }
const fontCss = name => { const f = HERO_FONTS.find(x => x[0] === name); return f ? f[2] : ''; };
const TYPE_SHADOW = { none: 'none', soft: '0 2px 14px rgba(0,0,0,.45)', strong: '0 2px 4px rgba(0,0,0,.7), 0 4px 24px rgba(0,0,0,.6)' };
const okHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
function heroTypeVars(t) {
  if (!t) return [];
  const v = []; if (t.font) { ensureFont(t.font); v.push(`--t-font:${fontCss(t.font)}`); }
  if (t.weight) v.push(`--t-weight:${+t.weight || 400}`); if (t.style === 'normal' || t.style === 'italic') v.push(`--t-style:${t.style}`);
  if (t.size && +t.size !== 100) v.push(`--t-scale:${(Math.max(50, Math.min(180, +t.size)) / 100).toFixed(2)}`);
  if (['uppercase', 'capitalize', 'lowercase'].includes(t.case)) v.push(`--t-case:${t.case}`);
  if (t.spacing) v.push(`--t-ls:${Math.max(-2, Math.min(12, +t.spacing))}px`); if (t.lh) v.push(`--t-lh:${Math.max(0.8, Math.min(1.8, +t.lh))}`);
  if (t.subSize && +t.subSize !== 100) v.push(`--st-scale:${(Math.max(70, Math.min(160, +t.subSize)) / 100).toFixed(2)}`);
  if (t.subFont === 'title' && t.font) v.push(`--st-font:${fontCss(t.font)}`);
  if (TYPE_SHADOW[t.shadow] && t.shadow !== 'none') v.push(`--t-shadow:${TYPE_SHADOW[t.shadow]}`);
  if (okHex(t.ink)) v.push(`--hero-title:${t.ink}`); if (okHex(t.subInk)) v.push(`--hero-sub:${t.subInk}`); if (okHex(t.accentInk)) v.push(`--hero-accent:${t.accentInk}`);
  if (okHex(t.btnBg)) v.push(`--hero-btn-bg:${t.btnBg}`); if (okHex(t.btnInk)) v.push(`--hero-btn-ink:${t.btnInk}`);
  return v;
}
// All slides share one look (font, size, weight, spacing...) so the banner feels like one design; the words and the colours (which depend on each photo) stay separate.
// the slide editor also edits the Collection page banner: index -1 is the banner (same fields, same controls)
// Collection banners: -1 is the default banner, -2, -3 ... are the banners of each category (in the order of BAN_CATS)
const BAN_CATS = () => [...db.categories, ...(db.accessoryCategories || [])];
function catBannerObj(cat) { const m = db.home.categoryBanners = db.home.categoryBanners || {}; return m[cat] = m[cat] || { enabled: true, image: '', eyebrow: '', title: '', subtitle: '', btnText: '', link: { type: 'none', value: '' }, pos: 'center', focus: 'center', overlay: 45, zoom: 100, focusX: 50 }; }
const HSL = i => i === -1 ? db.home.shopBanner : i < -1 ? catBannerObj(BAN_CATS()[-i - 2]) : db.home.hero.slides[i];
const HSLV = i => i === -1 ? shopBannerSlide('all') : i < -1 ? shopBannerSlide(BAN_CATS()[-i - 2]) : db.home.hero.slides[i];   // the slide as it is drawn (the banner borrows the first home photo until it has its own)
const LOOK_KEYS = ['font', 'weight', 'style', 'size', 'case', 'spacing', 'lh', 'subSize', 'subFont', 'shadow', 'btnStyle', 'preset', 'auto', 'why'];
const sameLook = () => !(db.home && db.home.hero && db.home.hero.sameLook === false);
function heroEffType(s) {
  const own = s.type || {}; if (!sameLook()) return own;
  const base = (db.home.hero.slides.find(x => x.type && Object.keys(x.type).length) || {}).type; if (!base) return own;
  const out = {}; LOOK_KEYS.forEach(k => { if (base[k] !== undefined) out[k] = base[k]; });
  ['ink', 'subInk', 'accentInk', 'btnBg', 'btnInk'].forEach(k => { if (own[k] !== undefined) out[k] = own[k]; }); return out;
}
function heroShareLook(i) {
  if (!sameLook()) return; const src = HSL(i); if (!src) return; const t = src.type || {};
  [...db.home.hero.slides.map((x, j) => [x, j]), [db.home.shopBanner, -1]].forEach(([x, j]) => { if (j === i || !x) return; x.type = x.type || {}; LOOK_KEYS.forEach(k => { if (t[k] === undefined) delete x.type[k]; else x.type[k] = t[k]; }); });
}
function heroSlideHTML(s, i, active, tag) {
  const A = Math.max(0, Math.min(90, +s.overlay || 0)) / 100, pos = ['left', 'center', 'right'].includes(s.pos) ? s.pos : 'left', focus = ['top', 'center', 'bottom'].includes(s.focus) ? s.focus : 'center';
  const grad = pos === 'center' ? `linear-gradient(rgba(30,25,20,${(A * 0.7).toFixed(2)}),rgba(30,25,20,${(A * 0.7).toFixed(2)}))` : `linear-gradient(${pos === 'right' ? 270 : 90}deg,rgba(30,25,20,${A.toFixed(2)}) 0%,rgba(30,25,20,${(A * 0.47).toFixed(2)}) 50%,rgba(30,25,20,${(A * 0.12).toFixed(2)}) 100%)`;
  const img = safeImg(s.image).replace(/["\\\n\r]/g, ''), z = Math.max(100, Math.min(250, +s.zoom || 100)), fx = Math.max(0, Math.min(100, s.focusX == null ? 50 : +s.focusX)), fy = { top: 0, center: 50, bottom: 100 }[focus], th = s.theme || {};
  const ty = heroEffType(s), vars = [th.ink && `--hero-ink:${th.ink}`, th.accent && `--hero-accent:${th.accent}`, th.btnBg && `--hero-btn-bg:${th.btnBg}`, th.btnInk && `--hero-btn-ink:${th.btnInk}`].filter(Boolean).concat(heroTypeVars(ty)).join(';');
  return `<div class="hero-slide pos-${pos} ${active ? 'active' : ''} ${th.btnBg ? 'themed' : ''} ${okHex(ty.btnBg) ? 'btn-custom' : ''} ${ty.btnStyle === 'outline' ? 'btn-outline' : ''}" ${vars ? `style="${esc(vars)}"` : ''} role="group" aria-roledescription="slide" aria-label="Slide ${i + 1}" ${active ? '' : 'aria-hidden="true"'}>
    <div class="hero-img" style="${esc(`background-image:url("${img}");background-position:${fx}% ${fy}%;transform:scale(${(z / 100).toFixed(2)});transform-origin:${fx}% ${fy}%`)}"></div><div class="hero-shade" style="${esc(`background:${grad}`)}"></div>
    <div class="hero-content">${s.eyebrow ? `<div class="hero-est">${esc(s.eyebrow)}</div>` : ''}<${tag} class="hero-title">${esc(s.title)}</${tag}>${s.subtitle ? `<p class="hero-subtitle">${esc(s.subtitle)}</p>` : ''}${s.btnText && s.link && s.link.type !== 'none' ? `<a class="btn-primary" role="button" tabindex="${active ? 0 : -1}" onclick="heroGo('${esc(s.id)}')" onkeydown="if(event.key==='Enter')heroGo('${esc(s.id)}')">${esc(s.btnText)}</a>` : ''}</div></div>`;
}
const heroVisible = () => db.home.hero.slides.filter(s => s.enabled && safeImg(s.image) && inWindow(s));
// ---- hero colours: read the photo and pick text, button and header colours that match it and stay readable ----
const hxLum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const hxRatio = (a, b) => { const x = hxLum(a), y = hxLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function hslHex(h, sat, l) { sat /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); }
function rgbHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, sat = 0; if (d) { sat = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; } return [h, sat, l]; }
const rgbHexOf = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
async function heroAnalyze(s) {
  const src = safeImg(s.image); if (!src) throw new Error('Add a photo to this slide first');
  const img = await new Promise((res, rej) => { const i = new Image(); if (/^https?:/i.test(src)) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('Could not open this photo')); i.src = src; });
  const W = 64, H = 36, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }), z = Math.max(100, +s.zoom || 100) / 100, fx = (s.focusX == null ? 50 : +s.focusX) / 100, fy = { top: 0, center: .5, bottom: 1 }[s.focus] ?? .5;
  const iw = img.naturalWidth, ih = img.naturalHeight, ar = W / H; let sw = iw, sh = iw / ar; if (sh > ih) { sh = ih; sw = ih * ar; } sw /= z; sh /= z; const sx = (iw - sw) * fx, sy = (ih - sh) * fy;
  x.drawImage(img, sx, sy, sw, sh, 0, 0, W, H); let d; try { d = x.getImageData(0, 0, W, H).data; } catch (e) { throw new Error('This photo\'s website does not allow reading it. Upload the photo instead (⬆ Upload photo).'); }
  const pos = ['left', 'center', 'right'].includes(s.pos) ? s.pos : 'left', A = Math.max(0, Math.min(90, +s.overlay || 0)) / 100;
  const alphaAt = u => pos === 'center' ? A * 0.7 : (() => { const t = pos === 'right' ? 1 - u : u; return t <= 0.5 ? A * (1 - 0.53 * t / 0.5) : A * (0.47 - 0.35 * (t - 0.5) / 0.5); })();
  const zone = u => pos === 'left' ? u < 0.6 : pos === 'right' ? u > 0.4 : u > 0.2 && u < 0.8;
  let sumL = 0, sumL2 = 0, sumS = 0, n = 0, hw = 0, hx = 0, hy = 0, satBest = []; const area = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = (j * W + i) * 4, r = d[k], g = d[k + 1], b = d[k + 2], [h, sa, l] = rgbHsl(r, g, b); const lm = hxLum(rgbHexOf(r, g, b)); sumL += lm; sumL2 += lm * lm; sumS += sa; n++; const w = sa * (1 - Math.abs(2 * l - 1)); hw += w; hx += Math.cos(h * Math.PI / 180) * w; hy += Math.sin(h * Math.PI / 180) * w; if (sa > 0.3 && l > 0.2 && l < 0.8) satBest.push([r, g, b, sa]);
    const u = i / W, v = j / H; if (zone(u) && v > 0.15 && v < 0.9) area.push([r, g, b, alphaAt(u)]); }
  const hue = hw > 0.5 ? (Math.atan2(hy, hx) * 180 / Math.PI + 360) % 360 : 30, avgL = sumL / n;
  const behind = (extra = 0) => area.map(([r, g, b, a]) => { const aa = Math.min(0.92, a + extra); return rgbHexOf(r * (1 - aa) + 30 * aa, g * (1 - aa) + 25 * aa, b * (1 - aa) + 20 * aa); });
  const p10 = (hex, bg) => { const r = bg.map(b => hxRatio(hex, b)).sort((p, q) => p - q); return r[Math.floor(r.length * 0.1)] || 0; };
  const light = hslHex(hue, 30, 96), dark = hslHex(hue, 35, 10); let extra = 0, ink = light, best;
  for (;; extra += 0.04) { const bg = behind(extra), pl = p10(light, bg), pd = p10(dark, bg); ink = pd > pl ? dark : light; best = Math.max(pl, pd); if (best >= 4.5 || (A + extra) >= 0.9 || pd > pl) break; }
  const newOverlay = Math.min(90, Math.round((A + extra) * 100));
  let ar_ = 0, ag = 0, ab = 0; satBest.sort((p, q) => q[3] - p[3]).slice(0, Math.max(8, satBest.length >> 3)).forEach(q => { ar_ += q[0]; ag += q[1]; ab += q[2]; }); const m = Math.max(1, Math.min(satBest.length, Math.max(8, satBest.length >> 3)));
  let ah = hue, as = 55; if (satBest.length) { const [h, sa] = rgbHsl(ar_ / m, ag / m, ab / m); ah = h; as = Math.max(35, Math.min(75, sa * 100)); }
  const bgNow = behind(extra), lightBg = ink === dark; let accent = null; for (let l = lightBg ? 28 : 72; lightBg ? l >= 10 : l <= 92; l += lightBg ? -3 : 3) { const cand = hslHex(ah, as, l); if (p10(cand, bgNow) >= 3) { accent = cand; break; } } if (!accent) accent = ink;
  const btnBg = accent, btnInk = hxRatio('#ffffff', btnBg) >= hxRatio('#1a1511', btnBg) ? '#ffffff' : '#1a1511';
  const tone = avgL < 0.28 ? 'dark' : 'light', headerBg = hslHex(hue, 34, 95), headerInk = hslHex(hue, 32, 14);
  return { busy: Math.sqrt(Math.max(0, sumL2 / n - (sumL / n) ** 2)), sat: sumS / n, ink, accent, btnBg, btnInk, headerBg, headerInk, tone, overlay: newOverlay, raised: newOverlay > Math.round(A * 100), contrast: Math.round(best * 10) / 10, hue: Math.round(hue) };
}
// "AI" text style: reads how dark, colourful and busy the photo is and picks a matching type style (no key needed).
function heroAutoType(r) {
  const dark = r.tone === 'dark', busy = r.busy > 0.16, vivid = r.sat > 0.45, t = { auto: true, size: 100, weight: 400, style: 'italic', case: 'none', spacing: 0, lh: 1.1, subSize: 100, shadow: busy ? 'soft' : 'none' };
  let why;
  if (dark && !vivid) { t.font = 'Bodoni Moda'; t.weight = 700; why = 'a dark, calm photo suits sharp, elegant letters'; }
  else if (dark) { t.font = 'Playfair Display'; t.weight = 700; why = 'a dark, colourful photo suits a strong classic serif'; }
  else if (vivid) { t.font = 'DM Serif Display'; t.weight = 400; why = 'a bright, colourful photo suits soft, rounded letters'; }
  else { t.font = 'Cormorant Garamond'; t.weight = 600; why = 'a light, quiet photo suits fine, airy letters'; }
  if (busy) { if (t.font === 'Cormorant Garamond') t.font = 'Playfair Display'; t.weight = 700; t.size = 105; why += '; the photo is detailed, so the letters are bolder with a soft shadow'; }
  t.why = why; return t;
}
function heroTypeSet(i, k, v) {
  const s = HSL(i); if (!s) return; s.type = s.type || {};
  if (['size', 'spacing', 'lh', 'subSize', 'weight'].includes(k) && v !== '') v = +v;
  if (v === '' || v === null) delete s.type[k]; else s.type[k] = v;
  s.type.auto = false; if (k === 'font') ensureFont(v);
  if (LOOK_KEYS.includes(k)) heroShareLook(i);
  homeLive(true); heroPreview(i); if (sameLook()) [...db.home.hero.slides.keys(), -1].forEach(j => { if (j !== i) heroPreview(j); });
}
function heroTypeReset(i) { const s = HSL(i); if (!s) return; if (sameLook()) { db.home.hero.slides.forEach(x => { delete x.type; }); delete db.home.shopBanner.type; } else delete s.type; homeLive(true); renderHomeAdmin(document.getElementById('adminContent')); }
function heroTypeAutoToggle(i, on) { const s = HSL(i); if (!s) return; if (on) { heroStyleAuto(i, true); } else { s.type = s.type || {}; s.type.auto = false; homeLive(true); renderHomeAdmin(document.getElementById('adminContent')); } }
async function heroStyleAuto(i, quiet) {
  const s = HSL(i), b = document.getElementById('hty-auto-' + i); if (!s) return; if (b) { b.disabled = true; b.textContent = 'Reading the photo…'; }
  try { const r = await heroAnalyze(HSLV(i)); s.type = heroAutoType(r); heroShareLook(i); s.theme = { ink: r.ink, accent: r.accent, btnBg: r.btnBg, btnInk: r.btnInk, headerBg: r.headerBg, headerInk: r.headerInk, tone: r.tone, v: 2 }; if (r.raised) s.overlay = r.overlay; homeLive(true); applyHeaderTheme(); renderHomeAdmin(document.getElementById('adminContent')); if (!quiet) showToast('Text style set: ' + s.type.why + '. Change anything below.', 'success'); }
  catch (e) { if (b) { b.disabled = false; b.textContent = '✨ Auto-style the text for this photo'; } showToast(e.message || 'Could not read this photo', 'error'); }
}
const hueName = h => h < 15 || h >= 345 ? 'red' : h < 45 ? 'orange or brown' : h < 70 ? 'golden yellow' : h < 160 ? 'green' : h < 200 ? 'teal' : h < 255 ? 'blue' : h < 290 ? 'purple' : 'pink or magenta';
function heroLocalWords(r) {
  const col = hueName(r.hue), cats = db.categories.slice(0, 3).join(', ') || 'handloom sarees';
  return [{ eyebrow: 'Est. Hyderabad', title: 'Woven slowly, worn for years', subtitle: `Pure handloom sarees in ${col} and more, chosen one by one.`, button: 'Shop the collection' }, { eyebrow: 'New arrivals', title: 'Handloom, the way it should be', subtitle: `Fresh from the loom: ${cats}.`, button: 'See what is new' }, { eyebrow: 'Handpicked', title: 'A saree with a story', subtitle: 'Each piece is selected for its weave, its colour and its maker.', button: 'Explore sarees' }];
}
async function heroWriteWords(i) {
  const s = HSL(i), box = document.getElementById('hwd-' + i); if (!s || !box) return; box.innerHTML = '<span class="note">Thinking…</span>';
  let r = { hue: 30, tone: 'light' }; try { r = await heroAnalyze(HSLV(i)); } catch (e) { }
  let v, ai = aiReady('hero');
  try { v = ai ? (await aiCall('hero', { colour: hueName(r.hue), tone: r.tone, categories: db.categories.slice(0, 8), current: { title: s.title, subtitle: s.subtitle } })).data.variants : heroLocalWords(r); } catch (e) { v = heroLocalWords(r); ai = false; }
  window.HERO_WORDS = v || [];
  box.innerHTML = `${ai ? '' : '<p class="note" style="margin:0 0 6px">Built-in drafts (connect Claude for richer ones).</p>'}${(v || []).map((x, n) => `<div class="hw-opt"><div><b>${esc(x.title)}</b><br><span class="note" style="margin:0">${esc(x.eyebrow || '')} · ${esc(x.subtitle || '')} · button: ${esc(x.button || '')}</span></div><button type="button" class="btn-sm btn-primary-sm" onclick="heroUseWords(${i},${n})">Use these words</button></div>`).join('')}`;
}
function heroUseWords(i, n) { const s = HSL(i), w = (window.HERO_WORDS || [])[n]; if (!s || !w) return; s.eyebrow = String(w.eyebrow || '').slice(0, 40); s.title = String(w.title || '').slice(0, 80); s.subtitle = String(w.subtitle || '').slice(0, 200); if (w.button) s.btnText = String(w.button).slice(0, 30); homeLive(true); renderHomeAdmin(document.getElementById('adminContent')); showToast('Words added. They are a draft: change anything you like.', 'success'); }
// the text style panel inside each slide
function heroSameLook(on, i) { db.home.hero.sameLook = !!on; if (on) heroShareLook(i); homeLive(true); renderHomeAdmin(document.getElementById('adminContent')); }
const HFOLD = new Set();
const HERO_PRESETS = { Elegant: { font: 'Bodoni Moda', weight: 700, style: 'italic', size: 100 }, Bold: { font: 'Abril Fatface', weight: 400, style: 'normal', size: 100, shadow: 'soft' }, Modern: { font: 'Syne', weight: 700, style: 'normal', case: 'uppercase', spacing: 2, size: 75, lh: 1.2 }, Soft: { font: 'DM Serif Display', weight: 400, style: 'italic', size: 105 }, Classic: { font: 'Cormorant Garamond', weight: 600, style: 'italic', size: 105 } };
function heroPreset(i, name) { const s = HSL(i), p = HERO_PRESETS[name]; if (!s || !p) return; s.type = Object.assign({ auto: false, preset: name, subSize: 100, lh: 1.1 }, p); ensureFont(p.font); heroShareLook(i); homeLive(true); renderHomeAdmin(document.getElementById('adminContent')); }
// the one simple row: pick a look
function heroLookUI(s, i) {
  const t = s.type || {}, auto = t.auto !== false, chip = (on, fn, label, id) => `<button type="button" class="hs-chip ${on ? 'on' : ''}" ${id ? `id="${id}"` : ''} onclick="${fn}">${label}</button>`;
  return `<div class="form-group hs-look"><label>Look of the words</label><div class="hs-chips">${chip(auto, `heroTypeAutoToggle(${i},true)`, '✨ Auto (matches the photo)', 'hty-auto-' + i)}${Object.keys(HERO_PRESETS).map(n => chip(!auto && t.preset === n, `heroPreset(${i},'${n}')`, n)).join('')}</div>${auto && t.why ? `<span class="note" style="margin:4px 0 0">Auto look: ${esc(t.why)}.</span>` : ''}<label class="chk" style="margin:8px 0 0"><input type="checkbox" ${sameLook() ? 'checked' : ''} onchange="heroSameLook(this.checked, ${i})"><span>Same look on all slides (only the words and colours differ)</span></label></div>`;
}
function heroTypeUI(s, i) {
  const t = s.type || {}, auto = t.auto !== false, sel = (k, opts, cur) => `<select onchange="heroTypeSet(${i},'${k}',this.value)">${opts.map(([v, l]) => `<option value="${v}" ${String(cur ?? '') === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const rng = (k, label, min, max, step, val, unit) => `<div class="form-group"><label>${label} <span class="mono" style="color:var(--gold);">${val}${unit}</span></label><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${label}" oninput="this.previousElementSibling.lastElementChild.textContent=this.value+'${unit}';heroTypeSet(${i},'${k}',this.value)"></div>`;
  const col = (k, label, fallback) => `<div class="form-group"><label>${label}</label><div class="hs-img-row"><input type="color" value="${okHex(t[k]) ? t[k] : fallback}" aria-label="${label}" oninput="heroTypeSet(${i},'${k}',this.value)" style="width:48px;padding:2px;flex:none"><button type="button" class="btn-sm btn-info-sm" onclick="heroTypeSet(${i},'${k}','');renderHomeAdmin(document.getElementById('adminContent'))">Auto</button></div></div>`;
  const th = s.theme || {};
  return `<div class="hs-type"><h5 class="hs-sub">Text options</h5>
    <div class="hs-grid3"><div class="form-group"><label>Big heading font</label>${sel('font', HERO_FONTS.map(f => [f[0], f[1]]), t.font)}</div><div class="form-group"><label>Weight</label>${sel('weight', [['', 'Default'], [400, 'Regular'], [600, 'Semi-bold'], [700, 'Bold'], [800, 'Extra bold']], t.weight)}</div><div class="form-group"><label>Style</label>${sel('style', [['', 'Default (italic)'], ['italic', 'Italic'], ['normal', 'Upright']], t.style)}</div></div>
    <div class="hs-grid3"><div class="form-group"><label>Letters</label>${sel('case', [['', 'As typed'], ['uppercase', 'CAPITALS'], ['capitalize', 'Each Word Capital'], ['lowercase', 'all small']], t.case)}</div><div class="form-group"><label>Shadow behind text</label>${sel('shadow', [['', 'None'], ['soft', 'Soft'], ['strong', 'Strong']], t.shadow)}</div><div class="form-group"><label>Description font</label>${sel('subFont', [['', 'Plain (website text)'], ['title', 'Same as the title']], t.subFont)}</div></div>
    <div class="hs-grid3">${rng('size', 'Big heading size', 50, 180, 5, t.size || 100, '%')}${rng('spacing', 'Space between letters', -2, 12, 0.5, t.spacing || 0, 'px')}${rng('lh', 'Space between lines', 0.8, 1.8, 0.05, t.lh || 1.1, '')}</div>
    <div class="hs-grid3">${rng('subSize', 'Description size', 70, 160, 5, t.subSize || 100, '%')}<div class="form-group"><label>Button look</label>${sel('btnStyle', [['', 'Filled'], ['outline', 'Outline only']], t.btnStyle)}</div><div class="form-group"><label>&nbsp;</label><button type="button" class="btn-sm btn-info-sm" onclick="heroTypeReset(${i})">Reset text style</button></div></div>
    <div class="hs-grid3">${col('ink', 'Big heading colour', th.ink || '#ffffff')}${col('subInk', 'Description colour', th.ink || '#ffffff')}${col('accentInk', 'Small heading colour', th.accent || '#d4c4a8')}</div>
    <div class="hs-grid3">${col('btnBg', 'Button colour', th.btnBg || '#faf9f6')}${col('btnInk', 'Button text colour', th.btnInk || '#2c2c2c')}<div class="form-group"><label>&nbsp;</label></div></div>
    <div class="hs-theme"><button type="button" class="btn-sm btn-info-sm" id="hm-${i}" onclick="heroMatch(${i})">🎨 Match text and top-bar colours to this photo</button>${heroSwatches(s.theme)}${s.theme ? `<button type="button" class="btn-sm btn-info-sm" onclick="heroThemeClear(${i})">Clear matched colours</button>` : ''}</div>
  </div>`;
}
async function heroMatch(i) {
  const s = HSL(i), b = document.getElementById('hm-' + i); if (!s) return; if (b) { b.disabled = true; b.textContent = 'Reading the photo…'; }
  try { const r = await heroAnalyze(HSLV(i)); s.theme = { ink: r.ink, accent: r.accent, btnBg: r.btnBg, btnInk: r.btnInk, headerBg: r.headerBg, headerInk: r.headerInk, tone: r.tone, v: 2 }; if (r.raised) s.overlay = r.overlay; homeLive(true); applyHeaderTheme(); renderHomeAdmin(document.getElementById('adminContent')); showToast(`Colours matched. Text contrast ${r.contrast}:1${r.raised ? '; the photo was darkened a little to keep the words readable' : ''}. The top bar and shop name follow the photo.`, 'success'); }
  catch (e) { if (b) { b.disabled = false; b.textContent = '🎨 Match text and top-bar colours to this photo'; } showToast(e.message || 'Could not read this photo', 'error'); }
}
function heroThemeClear(i) { const s = HSL(i); if (!s) return; delete s.theme; homeLive(true); applyHeaderTheme(); renderHomeAdmin(document.getElementById('adminContent')); }
function heroZoomReset(i) { const s = HSL(i); if (!s) return; s.zoom = 100; s.focusX = 50; homeLive(true); renderHomeAdmin(document.getElementById('adminContent')); }
const AUTO_H = new WeakMap(), AUTO_T = {}, AUTO_SEEN = new Set();
// The top bar is always a pale tint of the photo's main colour with a deep shade of the same colour for the name and menu, so it sits well on the ivory page.
function navFromTheme(t) { const h = rgbHsl(...[1, 3, 5].map(i => parseInt(String(t.headerBg).slice(i, i + 2), 16)))[0]; return { bg: hslHex(h, 34, 95), ink: hslHex(h, 32, 14) }; }
function applyHeaderTheme() {
  const r = document.documentElement, nav = document.querySelector('nav'); if (!nav || !db.home) return; const pg = document.getElementById('page-home'), s = heroVisible()[HERO.i]; let t = s && s.theme;
  if (!t && s && db.home.headerMatch !== false && safeImg(s.image)) { if (!AUTO_H.has(s)) { AUTO_H.set(s, null); heroAnalyze(s).then(a => { AUTO_H.set(s, { headerBg: a.headerBg }); applyHeaderTheme(); }).catch(() => { }); } t = AUTO_H.get(s); }
  if (db.home.headerMatch !== false && t && t.headerBg && pg && pg.classList.contains('active')) { const c = navFromTheme(t); r.style.setProperty('--nav-bg', c.bg); r.style.setProperty('--nav-ink', c.ink); }
  else { r.style.removeProperty('--nav-bg'); r.style.removeProperty('--nav-ink'); }
  nav.classList.remove('dark'); navOverSync();
}
// On the home page the header is drawn straight on the hero photo (no bar). Once the visitor scrolls it becomes the light bar.
function navOverSync() {
  const pg = document.getElementById('page-home'), over = !!(pg && pg.classList.contains('active') && !isAdminView);
  document.body.classList.toggle('nav-over', over); document.body.classList.toggle('nav-top', over && window.scrollY < 30);
}
window.addEventListener('scroll', () => { if (typeof navOverSync === 'function') navOverSync(); }, { passive: true });
// Automatic colours: when a hero photo is added or moved, the colours are picked again and saved with the slide.
function heroAuto(i, raise, styleText) {
  clearTimeout(AUTO_T[i]); AUTO_T[i] = setTimeout(async () => {
    const s = db.home && HSL(i); if (!s || db.home.autoColours === false || !safeImg(s.image)) return;
    try { const r = await heroAnalyze(HSLV(i)); s.theme = { ink: r.ink, accent: r.accent, btnBg: r.btnBg, btnInk: r.btnInk, headerBg: r.headerBg, headerInk: r.headerInk, tone: r.tone, v: 2 }; if (styleText && (!s.type || s.type.auto !== false)) { const peer = sameLook() && db.home.hero.slides.find(x => x !== s && x.type && x.type.font); if (peer) { s.type = s.type || {}; LOOK_KEYS.forEach(k => { if (peer.type[k] === undefined) delete s.type[k]; else s.type[k] = peer.type[k]; }); } else { s.type = heroAutoType(r); heroShareLook(i); } } if (raise && r.raised) s.overlay = r.overlay; homeLive(true); applyHeaderTheme(); if (isAdminView && currentAdminTab === 'home' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) renderHomeAdmin(document.getElementById('adminContent')); } catch (e) { }
  }, 500);
}
function heroAutoAll() { [...(db.home.hero.slides || []).map((s, i) => [s, i]), [shopBannerSlide(), -1]].forEach(([s, i]) => { const key = s.id + '|' + String(s.image).slice(-40) + '|' + (s.zoom || 100); if ((!s.theme || s.theme.v !== 2) && safeImg(s.image) && !AUTO_SEEN.has(key)) { AUTO_SEEN.add(key); heroAuto(i, true); } }); }
function heroSwatches(t) { return t ? `<span class="hm-sw" title="Text" style="background:${esc(t.ink)}"></span><span class="hm-sw" title="Accent and button" style="background:${esc(t.accent)}"></span><span class="hm-sw" title="Top bar" style="background:${esc(t.headerBg)}"></span>` : ''; }

function renderHero() {
  const box = document.getElementById('homeHero'); if (!box) return;
  const slides = heroVisible(); clearInterval(HERO.timer);
  if (!slides.length) { box.innerHTML = ''; return; }
  if (HERO.i >= slides.length) HERO.i = 0;
  const many = slides.length > 1;
  box.innerHTML = `<section class="hero-slider" aria-roledescription="carousel" aria-label="Featured collections" onmouseenter="HERO.paused=true" onmouseleave="HERO.paused=false" onfocusin="HERO.paused=true" onfocusout="HERO.paused=false">
    ${slides.map((s, k) => heroSlideHTML(s, k, k === HERO.i, k === 0 ? 'h1' : 'h2')).join('')}
    ${many ? `<button class="hero-arrow prev" aria-label="Previous slide" onclick="heroStep(-1)">‹</button><button class="hero-arrow next" aria-label="Next slide" onclick="heroStep(1)">›</button><div class="hero-dots">${slides.map((s, k) => `<button class="${k === HERO.i ? 'active' : ''}" aria-label="Go to slide ${k + 1}" onclick="heroShow(${k})"></button>`).join('')}</div>` : ''}</section>`;
  applyHeaderTheme();
  if (many && db.home.hero.autoplay && !reducedMotion()) HERO.timer = setInterval(() => { if (!HERO.paused && !document.hidden) heroStep(1); }, Math.max(3, +db.home.hero.interval || 6) * 1000);
}
function heroShow(k) {
  const slides = document.querySelectorAll('#homeHero .hero-slide'); if (!slides.length) return;
  HERO.i = (k + slides.length) % slides.length;
  slides.forEach((el, n) => { const on = n === HERO.i; el.classList.toggle('active', on); el.setAttribute('aria-hidden', on ? 'false' : 'true'); const b = el.querySelector('.btn-primary'); if (b) b.tabIndex = on ? 0 : -1; });
  document.querySelectorAll('#homeHero .hero-dots button').forEach((b, n) => b.classList.toggle('active', n === HERO.i)); applyHeaderTheme();
}
function heroStep(d) { heroShow(HERO.i + d); }
function heroGo(id) {
  const s = id === 'shopbanner' ? shopBannerSlide() : db.home.hero.slides.find(x => x.id === id); if (!s || !s.link) return; const l = s.link;
  if (l.type === 'shop') { navigateTo('shop'); filterProducts('all'); }
  else if (l.type === 'category' && db.categories.includes(l.value)) filterAndShowShop(l.value);
  else if (l.type === 'product') { const p = db.products.find(x => x.id === l.value); if (p) { navigateTo('shop'); openProductDetail(p.id); } }
  else if (l.type === 'page' && homePages().some(x => x[0] === l.value)) { if (l.value === 'terms' || l.value === 'privacy') openLegal(l.value); else navigateTo(l.value); }
  else if (l.type === 'url' && /^https?:\/\//i.test(l.value)) window.open(l.value, '_blank', 'noopener');
}
function catTileImage(i) {
  const custom = safeImg(i.image); if (custom) return custom;
  const p = db.products.find(x => x.category === i.category && x.image); return p ? p.image : '';
}
function renderHomeCategories() {
  const sec = document.getElementById('collection'), blk = document.getElementById('catBlock'); if (!sec || !db.home) return;
  const items = db.home.categories.items.filter(i => i.enabled && db.categories.includes(i.category)), on = db.home.categories.show !== false && items.length;
  sec.style.display = on ? '' : 'none'; if (blk) blk.style.display = on ? '' : 'none';
  const lb = document.getElementById('catLabel'), tt = document.getElementById('catTitle'); if (lb) lb.textContent = db.home.categories.label || ''; if (tt) tt.textContent = db.home.categories.title || ''; if (lb) lb.style.display = db.home.categories.label ? '' : 'none'; if (tt) tt.style.display = db.home.categories.title ? '' : 'none';
  sec.innerHTML = items.map(i => { const img = catTileImage(i); return `<div class="category-item" role="link" tabindex="0" data-cat="${esc(i.category)}" onclick="filterAndShowShop(this.dataset.cat)" onkeydown="if(event.key==='Enter')filterAndShowShop(this.dataset.cat)"><div class="cat-img">${img ? `<img src="${esc(img)}" alt="${esc(i.category)} sarees" loading="lazy">` : '<div class="cat-ph"></div>'}</div><span class="category-name">${esc(i.category)}</span></div>`; }).join('');
}
// a short quote between the banner and the categories (the owner writes it, or switches it off)
function renderHomeQuote() {
  const sec = document.getElementById('homeQuote'), q = db.home && db.home.quote; if (!sec) return;
  if (!q || q.show === false || !String(q.text || '').trim()) { sec.innerHTML = ''; sec.style.display = 'none'; return; }
  sec.style.display = ''; sec.innerHTML = `<blockquote class="hq"><span class="hq-orn" aria-hidden="true">✦</span><p>“${esc(String(q.text).trim().replace(/^[“"]|[”"]$/g, ''))}”</p>${String(q.by || '').trim() ? `<cite>${esc(q.by)}</cite>` : ''}</blockquote>`;
}
const QUOTE_IDEAS = ['Every thread is a story, woven slowly and worn for years.', 'A handloom saree is made by hand, one thread at a time.', 'Some things are worth waiting for. A handloom is one of them.', 'Wear the weave. Carry the story.', 'Slow weaving, lasting beauty.', 'Made by hands that have known the loom for generations.'];
function quoteSet(k, v) { db.home.quote[k] = v; homeLive(false); }
function quoteToggle(el) { const q = db.home.quote; q.show = q.show === false; el.classList.toggle('active', q.show !== false); el.setAttribute('aria-checked', q.show !== false); homeLive(false); }
function quoteIdea() { const q = db.home.quote, i = (QUOTE_IDEAS.indexOf(q.text) + 1) % QUOTE_IDEAS.length; q.text = QUOTE_IDEAS[i]; homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function renderArrivalsHead() {
  const a = db.home.arrivals, sec = document.getElementById('new-arrivals'); if (!sec) return;
  sec.style.display = a.show === false ? 'none' : '';
  document.getElementById('arrLabel').textContent = a.label; document.getElementById('arrTitle').textContent = a.title;
}
function renderSignature() {
  const g = db.home.signature, sec = document.getElementById('signatureSection'); if (!sec) return;
  const tiles = g.tiles.filter(t => db.categories.includes(t.category) && safeImg(t.image));
  sec.style.display = g.show === false || !tiles.length ? 'none' : '';
  sec.innerHTML = `<div class="section-header"><div class="section-label">${esc(g.label)}</div><h2 class="section-title">${esc(g.title)}</h2></div><div class="curated-grid">${tiles.map(t => `<div class="curated-item" role="link" tabindex="0" data-cat="${esc(t.category)}" onclick="filterAndShowShop(this.dataset.cat)" onkeydown="if(event.key==='Enter')filterAndShowShop(this.dataset.cat)"><img src="${esc(safeImg(t.image))}" alt="${esc(t.title)}" loading="lazy"><div class="curated-overlay"><h3>${esc(t.title)}</h3><p>${esc(t.subtitle)}</p><a class="curated-link">View Collection</a></div></div>`).join('')}</div>`;
}
let BAN_SEL = -1;
function banSelect(v) { BAN_SEL = +v; renderHomeAdmin(document.getElementById('adminContent')); }
function banReset(i) { const c = BAN_CATS()[-i - 2]; if (db.home.categoryBanners) delete db.home.categoryBanners[c]; homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); showToast('This category uses the automatic banner again', 'success'); }
function renderHome() { applyTheme(); renderHomeNotes(); renderHomeQuote(); renderShopBanner(); renderOccasions(); renderRecentlySold(); renderRecent(); renderHero(); renderHomeCategories(); renderArrivalsHead(); renderSignature(); ANN.sig = scheduleSignature(); renderAnnouncement(); renderPublicPages(); }

// ---- admin: saving (applies to the storefront instantly, written to storage a moment later) ----
let HOME_TIMER = null;
function homeStatus(t) { const e = document.getElementById('home-status'); if (e) e.textContent = t; }
function homeSaveSoon() { clearTimeout(HOME_TIMER); homeStatus('Saving…'); HOME_TIMER = setTimeout(homeFlush, 400); }
function homeFlush() { if (HOME_TIMER === null) return true; clearTimeout(HOME_TIMER); HOME_TIMER = null; const ok = saveDB(); homeStatus(ok ? '✓ Saved — live on your store' : '⚠ Not saved (browser storage is full)'); return ok; }
window.addEventListener('beforeunload', () => { if (HOME_TIMER !== null) homeFlush(); });
// The banner at the top of the Collection page: a photo with words (the owner sets both; AI can colour and word it). It uses the same text look as the home page banner.
function shopBannerSlide(cat) {
  const B = db.home.shopBanner || {}, first = (db.home.hero.slides.find(x => safeImg(x.image)) || {}).image || '';
  const gen = Object.assign({}, B, { id: 'shopbanner', image: safeImg(B.image) ? B.image : first, link: B.link || { type: 'none', value: '' } });
  if (!cat || cat === 'all') return gen;
  // a category banner: whatever the owner filled in for it, and for the rest the category's own name, its count and one of its photos
  const own = (db.home.categoryBanners || {})[cat], list = db.products.filter(x => x.category === cat), isAcc = (db.accessoryCategories || []).includes(cat), n = list.length;
  const pic = (list.find(x => x.stock > 0 && safeImg(x.image)) || list.find(x => safeImg(x.image)) || {}).image || '';
  const auto = { eyebrow: 'Our collection', title: cat, subtitle: `${n} ${isAcc ? (n === 1 ? 'accessory' : 'accessories') : (n === 1 ? 'saree' : 'sarees')}` };
  const pick = k => own && String(own[k] || '').trim() ? own[k] : auto[k], sty = own || B;
  return Object.assign({}, gen, { id: 'shopbanner-' + cat, eyebrow: pick('eyebrow'), title: pick('title'), subtitle: pick('subtitle'), image: own && safeImg(own.image) ? own.image : (pic || gen.image), enabled: B.enabled !== false && !(own && own.enabled === false), pos: sty.pos, focus: sty.focus, overlay: sty.overlay, zoom: sty.zoom, focusX: sty.focusX, theme: own ? own.theme : undefined, type: own ? own.type : undefined, btnText: own ? own.btnText : '', link: own && own.link ? own.link : { type: 'none', value: '' } });
}
function renderShopBanner() {
  const box = document.getElementById('shopBanner'); if (!box || !db.home) return; const s = shopBannerSlide(typeof currentCategory !== 'undefined' ? currentCategory : 'all');
  const html = s.enabled === false || !safeImg(s.image) || !(s.title || s.subtitle) ? '' : `<div class="hero-slider shop-banner">${heroSlideHTML(s, -1, true, 'h2')}</div>`;
  if (box._h === html) return; box._h = html; box.innerHTML = html; box.style.display = html ? '' : 'none';
}
function homeLive(redrawHero) { if (redrawHero) renderHero(); renderHomeCategories(); renderArrivalsHead(); renderSignature(); renderShopBanner(); renderHomeQuote(); renderHomeNotes(); homeSaveSoon(); }
let HOME_PICK = null;
function homePick(kind, idx) { HOME_PICK = { kind, idx }; document.getElementById('home-file').click(); }
async function homeFileChosen(files) {
  const f = files[0], pick = HOME_PICK; document.getElementById('home-file').value = ''; if (!f || !pick) return;
  if (!/^image\//.test(f.type)) { showToast('Please choose an image file', 'error'); return; }
  let url; try { url = await fileToDataUrl(f, pick.kind === 'hero' ? 1920 : 1000); } catch (e) { showToast('Could not read that image', 'error'); return; }
  const target = pick.kind === 'hero' ? HSL(pick.idx) : pick.kind === 'cat' ? db.home.categories.items[pick.idx] : db.home.signature.tiles[pick.idx];
  if (!target) return;
  const prev = target.image; target.image = url;
  if (!saveDB()) { target.image = prev; return; }
  HOME_TIMER = null; renderHomeAdmin(document.getElementById('adminContent')); homeLive(true); homeFlush(); showToast('✓ Image updated', 'success'); if (pick.kind === 'hero') heroAuto(pick.idx, true, true);
}

// ---- admin: hero slides ----
function heroSet(i, k, v) {
  const s = HSL(i); if (!s) return;
  if (k === 'image') { v = String(v).trim(); if (v && !safeImg(v)) { showToast('Image link must start with https://', 'error'); return renderHomeAdmin(document.getElementById('adminContent')); } }
  if (k === 'overlay' || k === 'zoom' || k === 'focusX') v = +v;
  s[k] = v; homeLive(true); heroPreview(i); if (['image', 'zoom', 'focusX', 'focus', 'pos'].includes(k)) heroAuto(i, k === 'image', k === 'image');
}
function heroLinkType(i, t) { const s = HSL(i); s.link = { type: t, value: t === 'category' ? db.categories[0] || '' : t === 'product' ? (db.products[0] || {}).id || '' : t === 'page' ? homePages()[0][0] : '' }; renderHomeAdmin(document.getElementById('adminContent')); homeLive(true); }
function heroLinkValue(i, v) { const s = HSL(i); if (s.link.type === 'url' && v.trim() && !/^https?:\/\//i.test(v.trim())) { showToast('Link must start with https://', 'error'); return; } s.link.value = v.trim(); homeLive(true); }
// The slide preview is the real website, drawn at this device's own width and then scaled to fit, so fonts, colours and line spacing are exactly what visitors see.
function heroPrevNav(s) {
  const t = s && s.theme, c = db.home.headerMatch !== false && t && t.headerBg ? navFromTheme(t) : null, st = c ? `--nav-bg:${c.bg};--nav-ink:${c.ink}` : '';
  return `<nav class="hs-fnav" ><div class="nav-left" style="display:flex;align-items:center;gap:15px;"><button class="hamburger-btn" tabindex="-1" aria-hidden="true"><span></span><span></span><span></span></button><a class="nav-brand"><img class="brand-mark" alt="" src="${ICON_URI}" width="40" height="40"><span>Anitha Pemmasani</span></a></div><ul class="nav-links"><li><a>Home</a></li><li><a>Collection</a></li><li><a>Saree Care</a></li><li><a>Journal</a></li></ul><div class="nav-icons"><div class="nav-icon">🔍</div><div class="nav-icon">♡</div><div class="nav-icon">👤</div><div class="nav-icon">🛒</div></div></nav>`;
}
function heroFit(box) {
  const st = box && box.querySelector('.hs-stage'); if (!st) return; const w = window.innerWidth, k = Math.min(1, box.clientWidth / w || 1);
  st.style.width = w + 'px'; st.style.transform = `scale(${k})`; box.style.height = Math.ceil(st.offsetHeight * k) + 'px';
}
function heroFitAll() { document.querySelectorAll('.hs-win').forEach(heroFit); }
window.addEventListener('resize', () => { if (typeof heroFitAll === 'function') heroFitAll(); });
function heroPrevHTML(s, i) { return safeImg(s.image) ? `<div class="hs-stage">${i < 0 ? '' : heroPrevNav(s)}<div class="hero-slider${i < 0 ? ' shop-banner' : ''}">${heroSlideHTML(s, i, true, 'div')}</div></div>` : '<div class="hs-noimg" style="height:160px">No image yet — add a link or upload one</div>'; }
function heroPreview(i) { const s = HSLV(i), box = document.getElementById('hsprev-' + i); if (s && box) { box.innerHTML = heroPrevHTML(s, i); heroFit(box); } }
function heroAdd() { db.home.hero.slides.push({ id: 'hs' + generateId(), enabled: true, image: '', focus: 'center', pos: 'left', overlay: 60, eyebrow: '', title: 'New slide', subtitle: '', btnText: 'Shop now', link: { type: 'shop', value: '' } }); renderHomeAdmin(document.getElementById('adminContent')); homeLive(true); window.scrollTo(0, document.body.scrollHeight); }
function heroDel(i) { if (!confirm('Delete this slide?')) return; db.home.hero.slides.splice(i, 1); renderHomeAdmin(document.getElementById('adminContent')); homeLive(true); }
function heroMove(i, d) { const a = db.home.hero.slides, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; renderHomeAdmin(document.getElementById('adminContent')); homeLive(true); }
function heroToggle(i, el) { const s = HSL(i); s.enabled = !s.enabled; el.classList.toggle('active', s.enabled); el.setAttribute('aria-checked', s.enabled); homeLive(true); renderHomeAdmin(document.getElementById('adminContent')); }
function heroSetting(k, v) { db.home.hero[k] = k === 'interval' ? +v : v; homeLive(true); }
// ---- admin: categories on the home page ----
function homeCatToggle(i) { const it = db.home.categories.items[i]; it.enabled = !it.enabled; homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function homeCatMove(i, d) { const a = db.home.categories.items, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function homeCatImage(i, v) { v = String(v).trim(); if (v && !safeImg(v)) { showToast('Image link must start with https://', 'error'); return; } db.home.categories.items[i].image = v; homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function homeCatAll(on) { db.home.categories.items.forEach(i => i.enabled = on); homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
// ---- admin: sections & signature collection ----
function homeSecToggle(sec, el) { const o = db.home[sec]; o.show = o.show === false; el.classList.toggle('active', o.show !== false); el.setAttribute('aria-checked', o.show !== false); homeLive(false); }
function arrPick(id, on) { const a = db.home.arrivals; a.ids = (a.ids || []).filter(x => x !== id); if (on) a.ids.push(id); buildScrollTrack(); homeLive(false); const n = document.getElementById('arr-count'); if (n) n.textContent = arrCountText(); }
function arrClear() { db.home.arrivals.ids = []; buildScrollTrack(); homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function arrCountText() { const n = (db.home.arrivals.ids || []).length; return n ? n + ' chosen — only these show on the website' : 'None chosen — the website shows every product marked new'; }
function arrPickerHTML() {
  const ids = db.home.arrivals.ids || [], list = sareeList(), cats = db.categories.filter(c => list.some(p => p.category === c));
  return `<div class="form-group"><label>Choose the sarees to show (from all your categories)</label><div id="arr-count" class="note" style="margin:0 0 6px;">${arrCountText()}</div>
    ${cats.map(c => `<details class="arr-cat" ${list.some(p => p.category === c && ids.includes(p.id)) ? 'open' : ''}><summary>${esc(c)} <span class="note" style="margin:0">(${list.filter(p => p.category === c).length})</span></summary>
      <div class="arr-list">${list.filter(p => p.category === c).map(p => `<label class="chk arr-item"><input type="checkbox" ${ids.includes(p.id) ? 'checked' : ''} onchange="arrPick('${p.id}',this.checked)"><span>${esc(p.name)} <span class="note" style="margin:0">₹ ${money(p.price)}</span></span></label>`).join('')}</div></details>`).join('')}
    <button class="btn-sm btn-info-sm" onclick="arrClear()" ${ids.length ? '' : 'disabled'}>Clear my choice (show all new)</button></div>`;
}
function homeSecText(sec, k, v) { db.home[sec][k] = v; homeLive(false); }
function sigSet(i, k, v) { const t = db.home.signature.tiles[i]; if (!t) return; if (k === 'image') { v = String(v).trim(); if (v && !safeImg(v)) { showToast('Image link must start with https://', 'error'); return; } } t[k] = v; homeLive(false); if (k === 'image') renderHomeAdmin(document.getElementById('adminContent')); }
function sigAdd() { if (db.home.signature.tiles.length >= 4) { showToast('You can show up to 4 collections', 'error'); return; } db.home.signature.tiles.push({ id: 'sg' + generateId(), title: 'New collection', subtitle: '', category: db.categories[0] || '', image: '' }); homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function sigDel(i) { db.home.signature.tiles.splice(i, 1); homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function sigMove(i, d) { const a = db.home.signature.tiles, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; homeLive(false); renderHomeAdmin(document.getElementById('adminContent')); }
function viewSiteUrl() { return (db.settings.siteUrl || '').trim() || (typeof ADM !== 'undefined' && ADM.state && ADM.state.siteUrl) || ''; }
function viewHome() {
  homeFlush();
  if (BUILD === 'admin') { const u = viewSiteUrl(); if (!/^https?:\/\//i.test(u)) { showToast('Your website address is not set. Add it in Settings → Website address.', 'error'); return; } window.open(u, '_blank', 'noopener'); return; }
  if (isAdminView) toggleView(); navigateTo('home'); window.scrollTo(0, 0);
}

function renderHomeAdmin(container) {
  const y = window.scrollY; syncHomeCats(); const H = db.home, hs = H.hero.slides; heroAutoAll();
  const catOpts = sel => db.categories.map(c => `<option value="${esc(c)}" ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  const prodOpts = sel => db.products.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  const pageOpts = sel => homePages().map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`).join('');
  const tog = (on, fn) => `<div class="toggle ${on ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${!!on}" onclick="${fn}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></div>`;
  const slideHTML = (s, i) => {
    const l = s.link || { type: 'none', value: '' };
    const isB = i < 0;
    return `<div class="hs ${s.enabled ? '' : 'off'}">
      <div class="hs-prev"><div class="hs-win" id="hsprev-${i}">${heroPrevHTML(isB ? shopBannerSlide() : s, i)}</div></div>
      <div class="hs-fields">
        ${isB ? `<div class="hs-head"><strong>${i === -1 ? 'Default banner (All sarees)' : 'Banner: ' + esc(BAN_CATS()[-i - 2])}</strong><span style="flex:1"></span><span class="hs-lbl">Show</span>${tog(s.enabled !== false, `heroToggle(${i},this)`)}${i < -1 ? `<button class="btn-sm btn-info-sm" onclick="banReset(${i})">Use the automatic banner</button>` : ''}</div>` : `<div class="hs-head"><strong>Slide ${i + 1}</strong>${s.enabled ? '' : '<span class="cchip">hidden</span>'}<span style="flex:1"></span><span class="hs-lbl">Show</span>${tog(s.enabled, `heroToggle(${i},this)`)}<button class="btn-sm btn-info-sm" onclick="heroMove(${i},-1)" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn-sm btn-info-sm" onclick="heroMove(${i},1)" ${i === hs.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn-sm btn-danger-sm" onclick="heroDel(${i})" aria-label="Delete slide">🗑</button></div>`}
        <div class="form-group"><label>Image</label><div class="hs-img-row"><input type="text" value="${esc(s.image.startsWith('data:') ? '' : s.image)}" placeholder="${s.image.startsWith('data:') ? 'Uploaded photo in use — paste a link to replace' : 'https://… image link'}" onchange="heroSet(${i},'image',this.value)"><button class="btn-sm btn-primary-sm" onclick="homePick('hero',${i})">⬆ Upload photo</button></div></div>
        <div class="hs-grid2"><div class="form-group"><label>Small heading</label><input type="text" value="${esc(s.eyebrow)}" onchange="heroSet(${i},'eyebrow',this.value)" oninput="heroSet(${i},'eyebrow',this.value)"></div><div class="form-group"><label>Title</label><input type="text" value="${esc(s.title)}" oninput="heroSet(${i},'title',this.value)"></div></div>
        <div class="form-group"><label>Description</label><textarea rows="2" oninput="heroSet(${i},'subtitle',this.value)">${esc(s.subtitle)}</textarea></div>
        <div class="form-group"><label>Button text</label><input type="text" value="${esc(s.btnText)}" oninput="heroSet(${i},'btnText',this.value)"></div>
        <div class="hs-theme"><button type="button" class="btn-sm btn-info-sm" onclick="heroWriteWords(${i})">✨ Suggest the words</button><span class="note" style="margin:0">Three drafts to choose from. Nothing changes until you press "Use these words".</span></div><div id="hwd-${i}" class="hw-list"></div>
        ${heroLookUI(s, i)}
        <details class="hs-fold" ${HFOLD.has(i) ? 'open' : ''} ontoggle="this.open ? HFOLD.add(${i}) : HFOLD.delete(${i})"><summary>More options (photo position, button link, text style, colours)</summary>
        <h5 class="hs-sub">Photo</h5>
        <div class="hs-grid3"><div class="form-group"><label>Text position</label><select onchange="heroSet(${i},'pos',this.value)">${[['left', 'Left'], ['center', 'Centre'], ['right', 'Right']].map(([v, t]) => `<option value="${v}" ${s.pos === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label>Photo focus</label><select onchange="heroSet(${i},'focus',this.value)">${[['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']].map(([v, t]) => `<option value="${v}" ${s.focus === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label>Dark overlay <span class="mono" style="color:var(--gold);">${s.overlay}%</span></label><input type="range" min="0" max="90" value="${s.overlay}" oninput="this.previousElementSibling.lastElementChild.textContent=this.value+'%';heroSet(${i},'overlay',this.value)"></div></div>
        <div class="hs-grid3"><div class="form-group"><label>Zoom <span class="mono" style="color:var(--gold);">${Math.max(100, +s.zoom || 100)}%</span></label><input type="range" min="100" max="250" step="5" value="${Math.max(100, +s.zoom || 100)}" aria-label="Zoom the hero photo" oninput="this.previousElementSibling.lastElementChild.textContent=this.value+'%';heroSet(${i},'zoom',this.value)"></div>
          <div class="form-group"><label>Move photo left / right <span class="mono" style="color:var(--gold);">${s.focusX == null ? 50 : +s.focusX}%</span></label><input type="range" min="0" max="100" value="${s.focusX == null ? 50 : +s.focusX}" aria-label="Move the hero photo sideways" oninput="this.previousElementSibling.lastElementChild.textContent=this.value+'%';heroSet(${i},'focusX',this.value)"></div>
          <div class="form-group"><label>&nbsp;</label><button type="button" class="btn-sm btn-info-sm" onclick="heroZoomReset(${i})">Reset zoom</button></div></div>
        <h5 class="hs-sub">Button</h5>
        <div class="form-group"><label>Button opens</label><div class="hs-img-row"><select onchange="heroLinkType(${i},this.value)" style="flex:1">${[['none', 'No button'], ['shop', 'All sarees'], ['category', 'A category'], ['product', 'A product'], ['page', 'A page'], ['url', 'A website link']].map(([v, t]) => `<option value="${v}" ${l.type === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
            ${l.type === 'category' ? `<select onchange="heroLinkValue(${i},this.value)" style="flex:1">${catOpts(l.value)}</select>` : l.type === 'product' ? `<select onchange="heroLinkValue(${i},this.value)" style="flex:1">${prodOpts(l.value)}</select>` : l.type === 'page' ? `<select onchange="heroLinkValue(${i},this.value)" style="flex:1">${pageOpts(l.value)}</select>` : l.type === 'url' ? `<input type="text" value="${esc(l.value)}" placeholder="https://…" onchange="heroLinkValue(${i},this.value)" style="flex:1">` : ''}</div></div>
        ${heroTypeUI(s, i)}
        </details>
      </div></div>`;
  };
  const items = H.categories.items, shown = items.filter(i => i.enabled).length;
  container.innerHTML = `
    <input type="file" id="home-file" accept="image/*" hidden onchange="homeFileChosen(this.files)">
    <div class="admin-card" id="sold-toggle-card"><label class="chk-line"><input type="checkbox" id="sold-on" ${soldOn() ? 'checked' : ''} onchange="soldSwitch(this.checked)"> <strong>Show “Recently sold” on the home page</strong> (sold-out sarees as proof, each with “Request a similar piece”)</label></div>
    <div class="home-top"><p style="color:#666;font-size:14px;">Everything here changes your store's home page <strong>instantly</strong>.</p><span class="note" id="home-status" style="margin:0;"></span><button class="btn-sm btn-primary-sm" onclick="viewHome()">👁 View home page</button></div>

    <div class="admin-card">
      <h3>🖼 Hero slides</h3>
      <div class="hs-bar"><span>Top bar</span>${tog(H.headerMatch !== false, `db.home.headerMatch=db.home.headerMatch===false;this.classList.toggle('active');this.setAttribute('aria-checked',db.home.headerMatch!==false);homeLive(true);applyHeaderTheme()`)}<span>follows the hero photo's colours</span><span class="hs-gap"></span><span>Autoplay</span>${tog(H.hero.autoplay, `heroSetting('autoplay',!db.home.hero.autoplay);this.classList.toggle('active');this.setAttribute('aria-checked',db.home.hero.autoplay)`)}<span>change every</span><select onchange="heroSetting('interval',this.value)" style="width:auto;">${[3, 4, 5, 6, 8, 10].map(n => `<option value="${n}" ${+H.hero.interval === n ? 'selected' : ''}>${n} seconds</option>`).join('')}</select><span style="flex:1"></span><button class="btn-sm btn-primary-sm" onclick="heroAdd()">＋ Add slide</button></div>
      ${hs.filter(s => s.enabled && safeImg(s.image)).length === 0 ? '<div class="home-warn">⚠ No visible slide — your home page has no hero banner right now. Add an image or turn a slide on.</div>' : ''}
      ${hs.length > 1 ? '<div class="note" style="margin-bottom:10px;">With 2 or more visible slides, visitors see a slideshow with arrows and dots.</div>' : ''}
      ${hs.map(slideHTML).join('') || '<p style="text-align:center;color:#6b6862;padding:24px;">No slides yet.</p>'}
    </div>

    <div class="admin-card" id="quote-card">
      <h3>❝ Quote under the banner</h3>
      <div class="hs-bar"><span>Show a short quote between the banner and the categories</span>${tog(H.quote.show !== false, `quoteToggle(this)`)}</div>
      <div class="form-group"><label>Quote</label><textarea rows="2" maxlength="160" oninput="quoteSet('text',this.value)">${esc(H.quote.text)}</textarea></div>
      <div class="hs-grid2"><div class="form-group"><label>Signed by (optional)</label><input type="text" maxlength="60" value="${esc(H.quote.by)}" oninput="quoteSet('by',this.value)"></div><div class="form-group"><label>&nbsp;</label><button type="button" class="btn-sm btn-info-sm" onclick="quoteIdea()">✨ Suggest another quote</button></div></div>
    </div>

    ${themeCardHTML()}
    ${notesCardHTML()}

    <div class="admin-card">
      <h3>🏷 Categories on the home page</h3>
      <div class="hs-grid2"><div class="form-group"><label>Small heading above the categories</label><input type="text" maxlength="40" value="${esc(H.categories.label)}" oninput="homeSecText('categories','label',this.value)"></div><div class="form-group"><label>Title above the categories</label><input type="text" maxlength="60" value="${esc(H.categories.title)}" oninput="homeSecText('categories','title',this.value)"></div></div>
      <div class="hs-bar"><span>Show this strip</span>${tog(H.categories.show !== false, `homeSecToggle('categories',this)`)}<span class="note" style="margin:0;">${shown} of ${items.length} categories shown</span><span style="flex:1"></span><button class="btn-sm btn-info-sm" onclick="homeCatAll(true)">Select all</button><button class="btn-sm btn-info-sm" onclick="homeCatAll(false)">Clear</button></div>
      <div class="note" style="margin-bottom:10px;">Tick the categories you want customers to see, use ↑ ↓ to set the order. With no photo chosen, the newest product photo of that category is used. New categories you create start unticked.</div>
      ${items.map((it, i) => { const img = catTileImage(it), n = db.products.filter(p => p.category === it.category).length; return `<div class="hc-row ${it.enabled ? '' : 'off'}">
        <input type="checkbox" class="hc-chk" ${it.enabled ? 'checked' : ''} onchange="homeCatToggle(${i})" aria-label="Show ${esc(it.category)} on the home page">
        <div class="hc-thumb">${img ? `<img src="${esc(img)}" alt="">` : '<span>no photo</span>'}</div>
        <div class="hc-name"><strong>${esc(it.category)}</strong><small>${n} product${n === 1 ? '' : 's'} · ${it.image ? (it.image.startsWith('data:') ? 'uploaded photo' : 'custom link') : 'automatic photo'}</small></div>
        <div class="hc-actions"><input type="text" placeholder="Photo link (optional)" value="${esc(it.image && !it.image.startsWith('data:') ? it.image : '')}" onchange="homeCatImage(${i},this.value)"><button class="btn-sm btn-info-sm" onclick="homePick('cat',${i})">⬆ Upload</button>${it.image ? `<button class="btn-sm btn-info-sm" onclick="homeCatImage(${i},'')">Auto</button>` : ''}<button class="btn-sm btn-info-sm" onclick="homeCatMove(${i},-1)" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn-sm btn-info-sm" onclick="homeCatMove(${i},1)" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></div></div>`; }).join('') || '<p style="color:#6b6862;">Create categories first (Categories tab).</p>'}
    </div>

    <div class="admin-card" id="shop-banner-card">
      <h3>🖼 Collection page banners</h3>
      <p class="note" style="margin:0 0 6px">The picture and words at the top of the Collection page. <b>Each category has its own banner.</b> Without any setup a category shows its name, how many pieces it has and one of its photos. Pick a category below to change its photo or words; it is edited exactly like a home page slide.</p>
      <div class="form-group"><label>Edit the banner of</label><select id="ban-sel" onchange="banSelect(this.value)">${[-1, ...BAN_CATS().map((_, k) => -(k + 2))].map(v => { const c = v === -1 ? '' : BAN_CATS()[-v - 2], o = (H.categoryBanners || {})[c], own = !!o && (o.image || o.title || o.subtitle || o.eyebrow); return `<option value="${v}" ${BAN_SEL === v ? 'selected' : ''}>${v === -1 ? 'All sarees (the default banner)' : esc(c) + (own ? ' · own banner' : ' · automatic')}</option>`; }).join('')}</select></div>
      ${slideHTML(HSL(BAN_SEL), BAN_SEL)}
    </div>

    <div class="admin-card">
      <h3>✨ Other home page sections</h3>
      <div class="hs-sec"><div class="hs-bar" style="margin:0 0 8px;"><strong>New Arrivals slider</strong><span style="flex:1"></span><span class="hs-lbl">Show</span>${tog(H.arrivals.show !== false, `homeSecToggle('arrivals',this)`)}</div>
        <div class="hs-grid2"><div class="form-group"><label>Small heading</label><input type="text" value="${esc(H.arrivals.label)}" oninput="homeSecText('arrivals','label',this.value)"></div><div class="form-group"><label>Title</label><input type="text" value="${esc(H.arrivals.title)}" oninput="homeSecText('arrivals','title',this.value)"></div></div>
        ${arrPickerHTML()}</div>
      <div class="hs-sec"><div class="hs-bar" style="margin:0 0 8px;"><strong>Signature collection</strong><span style="flex:1"></span><span class="hs-lbl">Show</span>${tog(H.signature.show !== false, `homeSecToggle('signature',this)`)}<button class="btn-sm btn-primary-sm" onclick="sigAdd()" ${H.signature.tiles.length >= 4 ? 'disabled' : ''}>＋ Add collection</button></div>
        <div class="hs-grid2"><div class="form-group"><label>Small heading</label><input type="text" value="${esc(H.signature.label)}" oninput="homeSecText('signature','label',this.value)"></div><div class="form-group"><label>Title</label><input type="text" value="${esc(H.signature.title)}" oninput="homeSecText('signature','title',this.value)"></div></div>
        ${H.signature.tiles.map((t, i) => `<div class="sg-row"><div class="hc-thumb big">${safeImg(t.image) ? `<img src="${esc(t.image)}" alt="">` : '<span>no photo</span>'}</div>
          <div class="sg-fields"><div class="hs-grid2"><div class="form-group"><label>Title</label><input type="text" value="${esc(t.title)}" oninput="sigSet(${i},'title',this.value)"></div><div class="form-group"><label>Subtitle</label><input type="text" value="${esc(t.subtitle)}" oninput="sigSet(${i},'subtitle',this.value)"></div></div>
          <div class="hs-grid2"><div class="form-group"><label>Opens category</label><select onchange="sigSet(${i},'category',this.value)">${catOpts(t.category)}</select></div><div class="form-group"><label>Photo</label><div class="hs-img-row"><input type="text" value="${esc(t.image.startsWith('data:') ? '' : t.image)}" placeholder="${t.image.startsWith('data:') ? 'Uploaded photo in use' : 'https://… link'}" onchange="sigSet(${i},'image',this.value)"><button class="btn-sm btn-primary-sm" onclick="homePick('sig',${i})">⬆ Upload</button></div></div></div></div>
          <div class="sg-act"><button class="btn-sm btn-info-sm" onclick="sigMove(${i},-1)" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn-sm btn-info-sm" onclick="sigMove(${i},1)" ${i === H.signature.tiles.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn-sm btn-danger-sm" onclick="sigDel(${i})" aria-label="Delete collection">🗑</button></div></div>`).join('') || '<p style="color:#6b6862;font-size:13px;">No collections yet.</p>'}
      </div>
    </div>`;
  homeSchedExtras(container);
  heroFitAll(); setTimeout(heroFitAll, 60);
  window.scrollTo(0, y);
}

