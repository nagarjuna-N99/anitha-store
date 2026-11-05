// ================= WEBSITE COLOURS + "NOTES FROM THE LOOM" =================
// Colours: db.home.theme holds five colours that recolour the public website (set in Owner app → Home Page → Website colours).
// Notes: a small sign-up on the home page (an email and a tick). Nothing is sent automatically; the owner reads the list and writes to these people herself.

// ---- colours ----
const THEME_DEFAULT = { accent: '#8A6038', ink: '#2C2C2C', bg: '#FAF9F6', cream: '#F5F1EA', sage: '#5B6F61' };
const THEME_KEYS = [['accent', 'Main colour', 'Small headings, links, the Add button'], ['ink', 'Text and dark buttons', 'Almost black'], ['bg', 'Page background', 'Very light'], ['cream', 'Section background', 'A little deeper than the page'], ['sage', 'Second colour', 'Small details']];
const THEME_PRESETS = [
  { name: 'Heritage (original)', ...THEME_DEFAULT },
  { name: 'Peacock', accent: '#0E5C63', ink: '#10282B', bg: '#F6FAF9', cream: '#E8F1EF', sage: '#5B7F7A' },
  { name: 'Rose', accent: '#9B3A55', ink: '#2E1A22', bg: '#FCF7F8', cream: '#F6E9ED', sage: '#7A6A70' },
  { name: 'Indigo', accent: '#33408F', ink: '#1A1D33', bg: '#F8F8FC', cream: '#E9EAF5', sage: '#5E6288' },
  { name: 'Forest', accent: '#3F6B3A', ink: '#1B2A1A', bg: '#F8FAF6', cream: '#EAF0E4', sage: '#6C7F63' },
  { name: 'Saffron', accent: '#A35A00', ink: '#2B1D0E', bg: '#FDF9F2', cream: '#F7EBD6', sage: '#7D7355' }
];
const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
function themeGet() { const t = (db.home && db.home.theme) || {}, o = {}; Object.keys(THEME_DEFAULT).forEach(k => { o[k] = isHex(t[k]) ? t[k].toLowerCase() : THEME_DEFAULT[k].toLowerCase(); }); return o; }
// keep every colour readable: dark enough text, an accent that reads on both backgrounds, page lighter than sections
function themeFix(t) {
  const o = { ...t }; let note = [];
  const dark = (hex, bgs, need) => { const [h, s, l] = rgbHsl(...[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))); let L = l * 100, out = hex; for (let n = 0; n < 40 && bgs.some(b => hxRatio(out, b) < need); n++) { L = Math.max(4, L - 2); out = hslHex(h, s * 100, L); } return out; };
  const a = dark(o.accent, [o.bg, o.cream], 4.5); if (a !== o.accent) { o.accent = a; note.push('main colour deepened so small text stays readable'); }
  const i = dark(o.ink, [o.bg, o.cream], 7); if (i !== o.ink) { o.ink = i; note.push('text colour deepened'); }
  if (hxLum(o.bg) < 0.8) { const [h, s] = rgbHsl(...[1, 3, 5].map(k => parseInt(o.bg.slice(k, k + 2), 16))); o.bg = hslHex(h, Math.min(s * 100, 40), 97); note.push('page background lightened'); }
  if (hxLum(o.cream) < 0.6) { const [h, s] = rgbHsl(...[1, 3, 5].map(k => parseInt(o.cream.slice(k, k + 2), 16))); o.cream = hslHex(h, Math.min(s * 100, 40), 92); note.push('section background lightened'); }
  const sg = dark(o.sage, [o.bg], 3); if (sg !== o.sage) o.sage = sg;
  Object.keys(o).forEach(k => { o[k] = String(o[k]).toLowerCase(); });
  return { theme: o, note: note.join('; ') };
}
function applyTheme() {
  if (typeof BUILD !== 'undefined' && BUILD === 'admin') return;   // the owner app keeps its own colours; it shows swatches instead
  const t = themeGet(), r = document.documentElement.style, [h, s] = rgbHsl(...[1, 3, 5].map(i => parseInt(t.accent.slice(i, i + 2), 16)));
  r.setProperty('--gold', t.accent); r.setProperty('--charcoal', t.ink); r.setProperty('--ivory', t.bg); r.setProperty('--cream', t.cream); r.setProperty('--sage', t.sage); r.setProperty('--gold-light', hslHex(h, Math.min(60, s * 100), 74));
}
let THEME_PREV = null, THEME_DRAFTS = [], THEME_MSG = '';
function themeSet(t, say) { THEME_PREV = { ...themeGet() }; const f = themeFix(t); db.home.theme = f.theme; THEME_MSG = (say || 'Colours changed.') + (f.note ? ' (' + f.note + ')' : ''); applyTheme(); homeSaveSoon(); const c = el_('adminContent'); if (c) renderHomeAdmin(c); }
function themePick(k, v) { if (!isHex(v)) return; themeSet({ ...themeGet(), [k]: v }, 'Colour changed.'); }
function themePreset(i) { const p = THEME_PRESETS[i]; if (p) themeSet({ accent: p.accent, ink: p.ink, bg: p.bg, cream: p.cream, sage: p.sage }, p.name + ' colours applied.'); }
function themeUndo() { if (THEME_PREV) { const p = THEME_PREV; THEME_PREV = null; db.home.theme = { ...p }; THEME_MSG = 'Went back to the colours you had before.'; applyTheme(); homeSaveSoon(); const c = el_('adminContent'); if (c) renderHomeAdmin(c); } }
function themeReset() { themeSet({ ...THEME_DEFAULT }, 'Back to the original colours.'); }
async function themeFromPhoto() {
  const s = (db.home.hero.slides || []).find(x => x.enabled !== false && safeImg(x.image)); if (!s) { THEME_MSG = 'Add a banner photo first (Banner slides above).'; return renderHomeAdmin(el_('adminContent')); }
  try { const r = await heroAnalyze(s), h = r.hue, sat = Math.max(28, Math.min(62, r.sat * 100 + 18)); themeSet({ accent: hslHex(h, sat, 30), ink: hslHex(h, 30, 12), bg: hslHex(h, 35, 97), cream: hslHex(h, 30, 93), sage: hslHex((h + 40) % 360, 18, 40) }, 'Colours matched to your banner photo.'); }
  catch (e) { THEME_MSG = (e && e.message) || 'Could not read the photo.'; renderHomeAdmin(el_('adminContent')); }
}
const THEME_MOODS = { Peacock: 'peacock teal blue green sea water calm cool feather', Rose: 'rose pink lotus blush soft romantic bride wedding', Indigo: 'indigo blue night evening royal deep denim', Forest: 'forest green leaf nature fresh garden calm earth', Saffron: 'saffron orange gold festive diwali warm marigold turmeric haldi', 'Heritage (original)': 'heritage brown classic traditional warm original' };
function themeBuiltin(mood) { const w = String(mood || '').toLowerCase().split(/[^a-z]+/).filter(Boolean), cur = themeGet().accent; return THEME_PRESETS.filter(p => p.accent.toLowerCase() !== cur).map(p => ({ p, sc: w.filter(x => (THEME_MOODS[p.name] || '').includes(x)).length })).sort((a, b) => b.sc - a.sc).slice(0, 3).map(({ p }) => ({ name: p.name, why: 'A ready-made colour set', accent: p.accent, ink: p.ink, bg: p.bg, cream: p.cream, sage: p.sage })); }
async function themeAi() {
  const mood = (el_('theme-mood') || {}).value || ''; THEME_MSG = 'Asking Claude for ideas…'; THEME_DRAFTS = []; renderHomeAdmin(el_('adminContent'));
  try {
    if (!(typeof aiReady === 'function' && aiReady('palette'))) { THEME_DRAFTS = themeBuiltin(mood); THEME_MSG = 'Claude is not connected, so these are ready-made colour sets that fit your words best (add the key in Settings for fresh ideas). Nothing changes until you press "Use these".'; return renderHomeAdmin(el_('adminContent')); }
    const s = (db.home.hero.slides || []).find(x => x.enabled !== false && safeImg(x.image)); let photo = {}; if (s) { try { const r = await heroAnalyze(s); photo = { colour: hueName(r.hue), tone: r.tone, photoHex: r.accent }; } catch (e) { /* the photo is optional */ } }
    const t = themeGet(), j = await aiCall('palette', { mood, ...photo, categories: db.categories.slice(0, 8), current: { accent: t.accent, ink: t.ink, bg: t.bg } });
    THEME_DRAFTS = ((j.data && j.data.palettes) || []).filter(p => ['accent', 'ink', 'bg', 'cream', 'sage'].every(k => isHex(p[k]))).slice(0, 3).map(p => ({ name: String(p.name || 'Idea').slice(0, 30), why: String(p.why || '').slice(0, 120), accent: p.accent, ink: p.ink, bg: p.bg, cream: p.cream, sage: p.sage }));
    THEME_MSG = THEME_DRAFTS.length ? 'Here are 3 ideas. Nothing changes until you press "Use these".' : 'Claude gave nothing usable. Try again with a few words about the mood.';
  } catch (e) { THEME_MSG = aiMsg(e); THEME_DRAFTS = themeBuiltin(mood); THEME_MSG += ' Showing ready-made colour sets instead.'; }
  renderHomeAdmin(el_('adminContent'));
}
function themeUseDraft(i) { const p = THEME_DRAFTS[i]; if (p) { THEME_DRAFTS = []; themeSet({ accent: p.accent, ink: p.ink, bg: p.bg, cream: p.cream, sage: p.sage }, p.name + ' colours applied.'); } }
function themeCardHTML() {
  const t = themeGet(), sw = p => `<span class="th-sw" aria-hidden="true">${['accent', 'ink', 'bg', 'cream', 'sage'].map(k => `<i style="background:${p[k]}"></i>`).join('')}</span>`, canAi = typeof aiReady === 'function' && aiReady('palette');
  return `<div class="admin-card" id="theme-card"><h3>🎨 Website colours</h3>
    <p class="note" style="margin:0 0 10px">Change the colours of the whole public website. Pick a ready set, match your banner photo, or let Claude suggest ideas. Words stay readable: colours that are too light for the text are deepened automatically.</p>
    <div class="th-presets">${THEME_PRESETS.map((p, i) => `<button type="button" class="th-preset" onclick="themePreset(${i})">${sw(p)}<span>${esc(p.name)}</span></button>`).join('')}</div>
    <div class="th-grid">${THEME_KEYS.map(([k, l, d]) => `<label class="th-pick"><input type="color" value="${t[k]}" onchange="themePick('${k}',this.value)" aria-label="${esc(l)}"><span><b>${esc(l)}</b><small>${esc(d)}</small></span></label>`).join('')}</div>
    <div class="th-actions"><button type="button" class="btn-sm btn-info-sm" onclick="themeFromPhoto()">🖼 Match my banner photo</button><button type="button" class="btn-sm" onclick="themeUndo()"${THEME_PREV ? '' : ' disabled'}>↩ Undo</button><button type="button" class="btn-sm" onclick="themeReset()">Original colours</button></div>
    <div class="th-ai"><label for="theme-mood"><b>✨ Ask Claude for colour ideas</b> (a few words about the feeling, optional)</label><div class="th-ai-row"><input id="theme-mood" type="text" maxlength="100" placeholder="e.g. peacock feathers, calm and festive" value=""><button type="button" class="btn-sm btn-info-sm" onclick="themeAi()"${canAi ? '' : ' title="Add your Claude key in Settings first"'}>Suggest 3 ideas</button></div></div>
    ${THEME_DRAFTS.length ? `<div class="th-presets">${THEME_DRAFTS.map((p, i) => `<div class="th-draft">${sw(p)}<b>${esc(p.name)}</b><small>${esc(p.why)}</small><button type="button" class="btn-sm btn-info-sm" onclick="themeUseDraft(${i})">Use these</button></div>`).join('')}</div>` : ''}
    ${THEME_MSG ? `<p class="note" role="status" style="margin:10px 0 0">${esc(THEME_MSG)}</p>` : ''}</div>`;
}

// ---- Notes from the loom ----
const NOTES_CONSENT = 'I agree to receive occasional notes from Anitha Pemmasani by email. I can ask to stop at any time.';
const NOTES_IDEAS = [
  { title: 'Notes from the loom', text: 'Now and then we write a short note: a new saree off the loom, how a weave is made, a reminder before a festival. A few lines, only when there is something worth saying.' },
  { title: 'A letter from the loom', text: 'When a special piece arrives or a weaver teaches us something new, we write it down and send it to you. Never every week, never a flood.' },
  { title: 'Stay close to the weave', text: 'Hear first about one-of-a-kind pieces, and read small stories from the looms of Telangana and beyond. We write rarely and never share your address.' }
];
function notesDefault() { return { show: true, label: 'Written with care', title: NOTES_IDEAS[0].title, text: NOTES_IDEAS[0].text, button: 'Send me the notes' }; }
function notesGet() { const n = (db.home && db.home.notes) || {}, d = notesDefault(); return { show: n.show !== false, label: n.label == null ? d.label : n.label, title: n.title || d.title, text: n.text || d.text, button: n.button || d.button }; }
function renderHomeNotes() {
  const sec = document.getElementById('homeNotes'); if (!sec) return; const n = notesGet();
  if (!n.show) { sec.innerHTML = ''; sec.style.display = 'none'; return; }
  sec.style.display = '';
  sec.innerHTML = `<div class="hn-box"><div class="hn-copy">${n.label ? `<div class="section-label">${esc(n.label)}</div>` : ''}<h2 class="hn-title">${esc(n.title)}</h2><p>${esc(n.text)}</p></div>
    <form class="hn-form" onsubmit="notesJoin(event)" novalidate><label for="hn-email" class="hn-lab">Your email address</label><input id="hn-email" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="you@example.com">
      <label class="hn-agree"><input type="checkbox" id="hn-ok"><span>${esc(NOTES_CONSENT)}</span></label>
      <button type="submit" class="hn-btn" id="hn-btn">${esc(n.button)}</button>
      <p class="hn-fine">We use your email only to send these notes. Read our <a onclick="navigateTo('privacy')">Privacy Policy</a>. To stop, just write to us and we will remove you.</p><p class="hn-msg" id="hn-msg" role="status" aria-live="polite"></p></form></div>`;
}
async function notesJoin(ev) {
  ev.preventDefault(); const em = el_('hn-email').value.trim(), ok = el_('hn-ok').checked, msg = el_('hn-msg'), btn = el_('hn-btn'); msg.className = 'hn-msg';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg.textContent = 'Please enter a valid email address.'; msg.classList.add('bad'); return; }
  if (!ok) { msg.textContent = 'Please tick the box to say you would like to receive our notes.'; msg.classList.add('bad'); return; }
  const api = typeof window.__SHOP_API === 'string' ? window.__SHOP_API.replace(/\/+$/, '') : '';
  if (!api) { msg.textContent = 'Thank you! (This is a practice copy of the shop, so nothing was saved.)'; msg.classList.add('ok'); return; }
  btn.disabled = true;
  try { const r = await fetch(api + '/public/notes', { method: 'POST', body: JSON.stringify({ email: em, consent: true }), credentials: 'omit' }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.'); el_('hn-email').value = ''; el_('hn-ok').checked = false; msg.textContent = 'Thank you. Your first note will reach you when we next have something to share.'; msg.classList.add('ok'); }
  catch (e) { msg.textContent = (e && e.message) || 'Something went wrong. Please try again.'; msg.classList.add('bad'); }
  btn.disabled = false;
}
function notesSet(k, v) { const n = db.home.notes = Object.assign(notesDefault(), db.home.notes || {}); n[k] = v; renderHomeNotes(); homeSaveSoon(); }
function notesToggle(el) { const n = notesGet(); notesSet('show', !n.show); el.classList.toggle('active', !n.show); el.setAttribute('aria-checked', !n.show); }
function notesIdea() { const n = notesGet(), i = (NOTES_IDEAS.findIndex(x => x.title === n.title) + 1) % NOTES_IDEAS.length; db.home.notes = Object.assign(notesDefault(), db.home.notes || {}, { title: NOTES_IDEAS[i].title, text: NOTES_IDEAS[i].text }); renderHomeNotes(); homeSaveSoon(); renderHomeAdmin(el_('adminContent')); }
let NOTES_LIST = null;
async function notesLoad() { if (typeof BUILD === 'undefined' || BUILD !== 'admin') return; try { NOTES_LIST = await admApi('GET', '/admin/api/notes'); } catch (e) { NOTES_LIST = { items: [], total: 0, error: true }; } const box = el_('notes-list'); if (box) box.innerHTML = notesListHTML(); }
function notesListHTML() {
  if (!NOTES_LIST) return '<p class="note">Loading…</p>'; const L = NOTES_LIST.items || [];
  if (NOTES_LIST.error) return '<p class="note">Could not load the list. Try again in a moment.</p>';
  return `<p class="note" style="margin:0 0 8px"><b>${NOTES_LIST.total || 0}</b> ${NOTES_LIST.total === 1 ? 'person has' : 'people have'} signed up. Nothing is sent automatically: you write to them yourself, from your own email.</p>${L.length ? `<div class="hn-list">${L.slice(0, 50).map(x => `<div><span>${esc(x.email)}<small>${esc(String(x.at).slice(0, 10))}</small></span><button type="button" class="btn-sm" onclick="notesRemove('${esc(x.email).replace(/'/g, '')}')">Remove</button></div>`).join('')}</div>` : ''}
    ${L.length ? '<button type="button" class="btn-sm btn-info-sm" onclick="notesCsv()">⬇ Download the list (CSV)</button>' : ''}`;
}
async function notesRemove(email) { if (!confirm('Remove ' + email + ' from the notes list?')) return; try { await admApi('POST', '/admin/api/notes/remove', { email }); showToast('Removed', 'success'); } catch (e) { showToast(aiMsg(e), 'error'); } notesLoad(); }
function notesCsv() { const rows = [['email', 'signed up', 'wording agreed to']].concat(((NOTES_LIST && NOTES_LIST.items) || []).map(x => [x.email, x.at, x.consent])), csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'notes-signups.csv'; document.body.appendChild(a); a.click(); a.remove(); }
function notesCardHTML() {
  const n = notesGet(), tog = (on, fn) => `<div class="toggle ${on ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${!!on}" onclick="${fn}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></div>`;
  setTimeout(notesLoad, 0);
  return `<div class="admin-card" id="notes-card"><h3>✉ Notes from the loom</h3>
    <div class="hs-bar"><span>Show the email sign-up at the bottom of the home page</span>${tog(n.show, 'notesToggle(this)')}</div>
    <div class="hs-grid2"><div class="form-group"><label>Small heading</label><input type="text" maxlength="40" value="${esc(n.label)}" oninput="notesSet('label',this.value)"></div><div class="form-group"><label>Title</label><input type="text" maxlength="60" value="${esc(n.title)}" oninput="notesSet('title',this.value)"></div></div>
    <div class="form-group"><label>Words</label><textarea rows="3" maxlength="260" oninput="notesSet('text',this.value)">${esc(n.text)}</textarea></div>
    <div class="hs-grid2"><div class="form-group"><label>Button</label><input type="text" maxlength="30" value="${esc(n.button)}" oninput="notesSet('button',this.value)"></div><div class="form-group"><label>&nbsp;</label><button type="button" class="btn-sm btn-info-sm" onclick="notesIdea()">✨ Suggest other words</button></div></div>
    ${notesAiHTML()}
    <p class="note">Visitors must tick a box saying they agree. The exact words they agreed to are saved with their email. The list is below.</p>
    <div id="notes-list">${notesListHTML()}</div></div>`;
}

// ---- ✨ AI help for the Notes block: three drafts; nothing changes until "Use these" ----
let NOTES_AI = { drafts: [], msg: '', n: 0 };
function notesAiClean(v) { const s = (x, n) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n), o = { label: s(v && v.label, 40), title: s(v && v.title, 60), text: s(v && v.text, 260), button: s(v && v.button, 30) }; return o.title && o.text ? { ...o, button: o.button || 'Send me the notes' } : null; }
async function notesAi() {
  const mood = ((el_('notes-ai-mood') || {}).value || '').trim(); NOTES_AI = { drafts: [], msg: 'Asking Claude…', n: NOTES_AI.n }; const c = el_('adminContent'); if (c) renderHomeAdmin(c);
  let list = [], note = '';
  try { if (typeof aiReady === 'function' && aiReady('notes')) { const n = notesGet(), j = await aiCall('notes', { mood, categories: (db.categories || []).slice(0, 8), current: { title: n.title, text: n.text } }); list = ((j.data && j.data.variants) || []).map(notesAiClean).filter(Boolean).slice(0, 3); note = list.length ? 'Here are 3 drafts from Claude. Nothing changes until you press "Use these".' : 'Claude gave nothing usable. Try again.'; } }
  catch (e) { note = aiMsg(e) + ' Showing built-in wording instead.'; }
  if (!list.length && !/nothing usable/.test(note)) { list = NOTES_IDEAS.map(x => notesAiClean({ label: 'Written with care', title: x.title, text: x.text, button: 'Send me the notes' })); note = note || 'Claude is not connected, so this is built-in wording (add the key in Settings for fresh ideas).'; }
  NOTES_AI.drafts = list; NOTES_AI.msg = note; if (c) renderHomeAdmin(c);
}
function notesAiUse(i) { const d = NOTES_AI.drafts[i]; if (!d) return; db.home.notes = Object.assign(notesDefault(), db.home.notes || {}, { label: d.label, title: d.title, text: d.text, button: d.button }); NOTES_AI = { drafts: [], msg: 'Applied. You can still change any word.', n: NOTES_AI.n }; renderHomeNotes(); homeSaveSoon(); renderHomeAdmin(el_('adminContent')); }
function notesAiHTML() {
  const on = typeof aiReady === 'function' && aiReady('notes');
  return `<div class="th-ai"><label for="notes-ai-mood"><b>✨ Write it with Claude</b> (a few words about the feeling, optional)</label><div class="th-ai-row"><input id="notes-ai-mood" type="text" maxlength="100" placeholder="e.g. warm and simple, like a letter to a friend"><button type="button" class="btn-sm btn-info-sm" onclick="notesAi()"${on ? '' : ' title="Add your Claude key in Settings for fresh ideas; built-in wording shows without it"'}>Suggest 3 wordings</button></div>
    ${NOTES_AI.drafts.length ? `<div class="th-presets">${NOTES_AI.drafts.map((d, i) => `<div class="th-draft" style="max-width:300px"><small>${esc(d.label)}</small><b>${esc(d.title)}</b><small>${esc(d.text)}</small><small>Button: ${esc(d.button)}</small><button type="button" class="btn-sm btn-info-sm" onclick="notesAiUse(${i})">Use these</button></div>`).join('')}</div>` : ''}
    ${NOTES_AI.msg ? `<p class="note" role="status" style="margin:8px 0 0">${esc(NOTES_AI.msg)}</p>` : ''}</div>`;
}
