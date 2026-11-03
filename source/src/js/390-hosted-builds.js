// ================= HOSTED BUILDS (30 Oct 2026) =================
// site: the public website reads what the owner published from the server (read-only).
// admin: the owner app. Sign-in, saving, security and Instagram all go through the server, never through this browser's storage.
const SHOP_API = () => String(window.__SHOP_API || ((document.querySelector('meta[name="shop-api"]') || {}).content) || '').replace(/\/+$/, '');
async function shopSync() {
  const api = SHOP_API(); if (!api) return;
  try {
    const r = await fetch(api + '/public/shop', { cache: 'no-cache' }); if (!r.ok) throw new Error('shop ' + r.status); const p = await r.json(); if (p.empty) return;
    db.settings = Object.assign({}, db.settings, p.settings); db.categories = p.categories; db.accessoryCategories = p.accessoryCategories; db.products = p.products; if (p.home) db.home = p.home; if (p.pages) db.pages = p.pages; db.bundles = p.bundles; db.coupons = p.coupons; db.accessorySeeded = true;
    const u = currentUser(), mine = u ? (db.reviews || []).filter(x => x.userId === u.id && x.status !== 'approved') : []; db.reviews = [...p.reviews, ...mine];
    try { localStorage.setItem('ap_db_v70', JSON.stringify(db)); } catch (e) { /* storage full: the page still works from memory */ }
    ensureProductFields(); syncHomeCats(); pruneCart(); renderProducts(); buildScrollTrack(); renderHome(); renderPublicPages(); updateBadges(); updateFavBadge(); seoRefreshHome();
  } catch (e) { /* offline or server down: keep showing the last copy */ }
}

const ADM = { ready: false, signedIn: false, csrf: '', version: 0, state: null, dirty: false, inflight: false, timer: 0, poll: 0, ig: false, claude: false, igJobs: [] };
async function admApi(method, path, body) {
  const r = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(ADM.csrf ? { 'X-CSRF-Token': ADM.csrf } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (r.status === 401 && ADM.signedIn) { ADM.signedIn = false; admGate('expired'); }
  if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong (' + r.status + ')'), { status: r.status, data: j }); return j;
}
// ---- the sign-in screen (the only thing the page shows until the server says yes) ----
function admGate(mode, msg) {
  let g = document.getElementById('admGate');
  if (!g) { g = document.createElement('div'); g.id = 'admGate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); document.body.appendChild(g); }
  const st = ADM.state || {}, setup = mode === 'setup', twofa = st.twoFactor;
  g.innerHTML = `<form class="adm-box" onsubmit="return admSubmit(event,'${mode}')" autocomplete="off">
    <img src="${LOGO_URI}" alt="Anitha Pemmasani" style="height:84px;width:auto;display:block;margin:0 auto 6px"><p class="adm-sub" style="text-align:center">Owner admin</p>
    ${mode === 'expired' ? '<p class="adm-note">Your session ended. Sign in again. Your changes are kept and will be saved.</p>' : ''}${mode === 'loading' ? '<p class="adm-sub">Connecting…</p>' : ''}${mode === 'error' ? `<p class="adm-err">${esc(msg || 'Cannot reach the server.')}</p><button type="button" class="adm-btn" onclick="admBoot()">Try again</button>` : ''}
    ${mode === 'loading' || mode === 'error' ? '' : `${setup ? '<p class="adm-note">First time here. Choose your password. You need the <b>setup token</b> from the server settings (ADMIN_SETUP_TOKEN).</p><label>Setup token<input id="adm-token" type="password" autocomplete="off" required></label>' : ''}
    ${!setup ? '<label>Your name <span class="note">(helpers only; owner leaves this empty)</span><input id="adm-user" maxlength="30" autocomplete="username"></label>' : ''}
    <label>${setup ? 'New password (12+ characters)' : 'Password'}<input id="adm-pw" type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" required minlength="${setup ? 12 : 1}" autofocus></label>
    ${setup ? '<label>Repeat password<input id="adm-pw2" type="password" autocomplete="new-password" required></label>' : ''}
    ${!setup && twofa ? '<label>6-digit code from your authenticator app<input id="adm-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" required></label>' : ''}
    <p id="adm-msg" class="adm-err" role="alert">${esc(msg || '')}</p><button class="adm-btn" id="adm-go" type="submit">${setup ? 'Create my account' : 'Sign in'}</button>
    <p class="adm-foot">Not listed on Google. Every sign-in attempt is recorded.</p>`}</form>`;
  g.style.display = 'flex'; const f = g.querySelector('input'); if (f) setTimeout(() => f.focus(), 50);
}
async function admSubmit(e, mode) {
  e.preventDefault(); const v = id => (document.getElementById(id) || { value: '' }).value, msg = t => { document.getElementById('adm-msg').textContent = t; }, btn = document.getElementById('adm-go'); btn.disabled = true; msg('');
  try {
    if (mode === 'setup') { if (v('adm-pw') !== v('adm-pw2')) { msg('The two passwords are not the same.'); btn.disabled = false; return false; } await admApi('POST', '/admin/api/setup', { setupToken: v('adm-token'), password: v('adm-pw') }); ADM.state = await admApi('GET', '/admin/api/state'); admGate('login', 'Account created. Now sign in.'); return false; }
    const r = await admApi('POST', '/admin/api/login', { password: v('adm-pw'), code: v('adm-code'), name: v('adm-user') }); ADM.csrf = r.csrf; ADM.signedIn = true; await admRole();
    if (ADM.ready) { document.getElementById('admGate').style.display = 'none'; if (ADM.dirty) admSaveNow(); else admPoll(); return false; }   // the session had ended: keep what was typed, it is saved now
    await admEnter();
  } catch (err) { msg(err.status === 429 && err.data && err.data.retryAfter ? `Too many wrong attempts. Try again in ${Math.ceil(err.data.retryAfter / 60)} minutes.` : err.message); btn.disabled = false; const p = document.getElementById('adm-pw'); if (p) { p.value = ''; p.focus(); } }
  return false;
}
async function admBoot() {
  admGate('loading');
  try { ADM.state = await admApi('GET', '/admin/api/state'); ADM.ig = !!ADM.state.instagram; ADM.claude = !!ADM.state.claude; if (ADM.state.signedIn) { ADM.csrf = ADM.state.csrf; ADM.signedIn = true; ADM.role = ADM.state.role || 'owner'; ADM.user = ADM.state.user || 'owner'; await admEnter(); } else admGate(ADM.state.configured ? 'login' : 'setup'); }
  catch (e) { admGate('error', 'Cannot reach the server: ' + e.message); }
}
// a link from the new owner screen (/admin2) such as /admin#orders opens that tab
function admHashTab() { const t = String(location.hash || '').slice(1); return t && document.querySelector('[data-tab="' + t.replace(/[^a-z-]/g, '') + '"]') && !(t === 'privacy' || t === 'ops') || (t && isOwnerRole() && /^(privacy|ops)$/.test(t)) ? t.replace(/[^a-z-]/g, '') : ''; }
async function admEnter() {
  const g = await admApi('GET', '/admin/api/db'); ADM.version = g.version;
  const demo = !g.db; const fresh = normalizeDB(g.db || JSON.parse(JSON.stringify(defaultDB)));
  ['adminPin', 'otpEndpoint', 'aiEndpoint', 'assistantUrl'].forEach(k => { delete fresh.settings[k]; }); for (const k of Object.keys(db)) delete db[k]; Object.assign(db, fresh);
  ADM.ready = true; document.getElementById('admGate').style.display = 'none'; init(); admApplyRole(); ov2Init(); navRestore();
  isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); document.body.classList.add('admin-on', 'adm-app'); switchAdminTab(admHashTab() || currentAdminTab || 'dashboard');
  if (demo) { ADM.dirty = true; admSetBadge('Starting with demo data. Import your own in Settings → Security & backup, or just edit this.'); admQueueSave(); }
  clearInterval(ADM.poll); ADM.poll = setInterval(admPoll, 20_000); admSetBadge();
}
// ---- saving: debounced, merged on the server, never overwrites newer changes made elsewhere ----
function admSetBadge(t) { let b = document.getElementById('admSync'); if (!b) { b = document.createElement('div'); b.id = 'admSync'; b.setAttribute('role', 'status'); document.body.appendChild(b); } b.textContent = t || (ADM.dirty || ADM.inflight ? 'Saving…' : '✓ Saved to the server'); b.className = (t && /not saved|offline/i.test(t)) ? 'bad' : ''; }
function admQueueSave() { ADM.dirty = true; clearTimeout(ADM.timer); ADM.timer = setTimeout(admSaveNow, 700); admSetBadge(); }
async function admSaveNow() {
  if (ADM.inflight) { ADM.timer = setTimeout(admSaveNow, 500); return; } if (!ADM.signedIn) return; ADM.inflight = true; ADM.dirty = false; admSetBadge('Saving…');
  try {
    const r = await admApi('PUT', '/admin/api/db', { db, baseVersion: ADM.version }); ADM.version = r.version;
    if (r.merged) { const keep = Object.keys(db); for (const k of keep) delete db[k]; Object.assign(db, normalizeDB(r.db)); admRefreshView(); }
    ADM.inflight = false; admSetBadge();
  } catch (e) {
    ADM.inflight = false; ADM.dirty = true;
    if (e.status === 409) { admSetBadge('Not saved: the shop changed a lot elsewhere. Reload this page.'); showToast('Reload the page: the shop changed elsewhere.', 'error'); }
    else if (e.status === 401) admSetBadge('Not saved yet: sign in again.'); else { admSetBadge('Not saved: offline. Retrying…'); ADM.timer = setTimeout(admSaveNow, 5000); }
  }
}
function admRefreshView() { if (document.querySelector('.modal.active') || currentAdminTab === 'studio') return; const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#adminContent')) return;   // never redraw under someone who is typing
  try { renderAdminContent(currentAdminTab); } catch (e) { /* the tab is not drawn yet */ } }
async function admPoll() {
  if (!ADM.signedIn || ADM.dirty || ADM.inflight) return;
  try { const v = await admApi('GET', '/admin/api/version'); if (v.version > ADM.version) { const g = await admApi('GET', '/admin/api/db'); if (ADM.dirty || ADM.inflight) return; ADM.version = g.version; for (const k of Object.keys(db)) delete db[k]; Object.assign(db, normalizeDB(g.db)); admRefreshView(); admSetBadge('Updated: a new order or change arrived'); setTimeout(() => admSetBadge(), 4000); } } catch (e) { /* try again next time */ }
}
// ---- Settings → Security & backup ----
function admSecurityHTML() {
  if (BUILD !== 'admin') return '';
  if (!isOwnerRole()) return admStaffSecurityHTML();
  const tf = ADM.state && ADM.state.twoFactor;
  return `<div class="admin-card" id="adm-security"><h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:12px;">Security &amp; backup</h4>
    <div class="ai-row"><label>Current password<input id="sec-cur" type="password" autocomplete="current-password"></label><label>New password (12+ characters)<input id="sec-new" type="password" autocomplete="new-password"></label></div>
    <button class="btn-sm btn-primary-sm" onclick="admChangePw()">Change password (signs out other devices)</button><div id="sec-pw-msg" class="note"></div>
    <h4 class="dash-h4">2-step sign-in ${tf ? '<span class="status-pill status-active">ON</span>' : '<span class="status-pill status-inactive">OFF</span>'}</h4>
    <p class="note">${tf ? 'A 6-digit code from your authenticator app is needed at every sign-in.' : 'Strongly recommended: sign-in also needs a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator…).'}</p>
    ${tf ? '<div class="ai-row"><label>Password to switch it off<input id="sec-2off" type="password" autocomplete="current-password"></label></div><button class="btn-sm btn-danger-sm" onclick="admTwoFactorOff()">Switch off 2-step sign-in</button>' : '<div class="ai-row"><label>Your password<input id="sec-2pw" type="password" autocomplete="current-password"></label></div><button class="btn-sm btn-primary-sm" onclick="admTwoFactorStart()">Set up 2-step sign-in</button>'}
    <div id="sec-2fa" class="note"></div>
    <h4 class="dash-h4">Claude AI key <span id="sec-ai-pill"></span></h4>
    <p class="note">Switches on the ✨ AI helpers. Get a key at console.anthropic.com → API keys. It is stored <b>encrypted on your server</b>, is never shown again (only the last 4 characters), and is only used to talk to Anthropic. Pasting a new key replaces the old one.</p>
    <div class="ai-row"><label style="flex:1;">Anthropic API key<input id="sec-aikey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…"></label></div>
    <div class="pf-actions"><button class="btn-sm btn-primary-sm" id="sec-ai-save" onclick="admSaveAiKey()">Save &amp; check key</button><button class="btn-sm btn-danger-sm" id="sec-ai-rm" onclick="admRemoveAiKey()" style="display:none;">Remove key</button></div><div id="sec-ai-msg" class="note"></div>
    <h4 class="dash-h4">Team logins (helpers)</h4><p class="note">A helper signs in with their own name and password and can work on products and orders. They cannot open Privacy, backups, email, keys or this list.</p><div id="sec-team" class="note">Loading…</div><h4 class="dash-h4">Backup</h4><div class="pf-actions"><button class="btn-sm btn-info-sm" onclick="admDownloadBackup()">⬇ Download an encrypted backup of the whole shop</button><label class="btn-sm btn-info-sm" style="cursor:pointer;">⬆ Import a data file<input type="file" accept="application/json,.json" hidden onchange="admImport(this)"></label></div><div id="sec-bk" class="note"></div>
    <h4 class="dash-h4">Recent sign-in activity</h4><div id="sec-audit" class="note">Loading…</div>
    <div class="pf-actions" style="margin-top:14px;"><button class="btn-sm btn-danger-sm" onclick="admSignOut()">Sign out</button></div></div>`;
}
function admAiKeyShow(r) {
  ADM.claude = !!r.set; const pill = document.getElementById('sec-ai-pill'), rm = document.getElementById('sec-ai-rm'), m = document.getElementById('sec-ai-msg');
  if (pill) pill.innerHTML = r.set ? '<span class="status-pill status-active">ON</span>' : '<span class="status-pill status-inactive">OFF</span>';
  if (rm) rm.style.display = r.source === 'owner' ? '' : 'none';
  if (m) m.textContent = r.set ? `Key ending …${r.last4} is active${r.source === 'server' ? ' (set in the server settings)' : r.updatedAt ? ' (saved ' + new Date(r.updatedAt).toLocaleDateString('en-IN') + ')' : ''}.` : 'No key yet: the AI helpers use built-in drafts where they exist.';
}
async function admLoadAiKey() { try { admAiKeyShow(await admApi('GET', '/admin/api/ai-key')); } catch (e) {} }
async function admSaveAiKey() {
  const inp = document.getElementById('sec-aikey'), m = document.getElementById('sec-ai-msg'), b = document.getElementById('sec-ai-save'); if (!inp) return;
  const key = inp.value.trim(); if (!key) { m.textContent = 'Paste your key first.'; return; }
  b.disabled = true; m.textContent = 'Checking the key with Anthropic…';
  try { const r = await admApi('POST', '/admin/api/ai-key', { key }); inp.value = ''; admAiKeyShow(r); showToast('Claude is connected', 'success'); if (typeof renderAiHelper === 'function' && document.querySelector('.ai-status')) renderAiHelper(el_('adminContent')); }
  catch (e) { m.textContent = aiMsg(e); } finally { b.disabled = false; }
}
async function admRemoveAiKey() {
  if (!confirm('Remove the saved key? The AI helpers will stop working until you add one again.')) return;
  try { admAiKeyShow(await admApi('POST', '/admin/api/ai-key/remove', {})); showToast('Key removed', 'success'); } catch (e) { showToast(aiMsg(e), 'error'); }
}
async function admLoadAudit() { const e = document.getElementById('sec-audit'); if (!e) return; try { const r = await admApi('GET', '/admin/api/audit'); e.innerHTML = r.events.slice(0, 12).map(x => `<div class="dd-row"><span>${x.ok ? '✅' : '⚠️'} ${esc(x.ev)}<small> · ${esc(new Date(x.t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))} IST · ${esc(x.ip)}${x.extra ? ' · ' + esc(x.extra) : ''}</small></span></div>`).join('') || 'Nothing yet.'; } catch (err) { e.textContent = err.message; } }
async function admChangePw() { const m = document.getElementById('sec-pw-msg'); try { await admApi('POST', '/admin/api/password', { current: document.getElementById('sec-cur').value, next: document.getElementById('sec-new').value }); m.textContent = '✓ Password changed. Other devices were signed out.'; document.getElementById('sec-cur').value = document.getElementById('sec-new').value = ''; } catch (e) { m.textContent = e.message; } }
async function admTwoFactorStart() { const m = document.getElementById('sec-2fa'); try { const r = await admApi('POST', '/admin/api/2fa/start', { password: document.getElementById('sec-2pw').value }); m.innerHTML = `<p>In your authenticator app choose <b>Enter a setup key</b> and type this key:</p><p class="adm-key">${esc(r.secret.match(/.{1,4}/g).join(' '))}</p><p><a href="${esc(r.uri)}">Open in my authenticator app</a> (on a phone)</p><div class="ai-row"><label>Then type the 6-digit code it shows<input id="sec-2code" inputmode="numeric" maxlength="6"></label></div><button class="btn-sm btn-primary-sm" onclick="admTwoFactorConfirm()">Turn on</button><div id="sec-2err" class="adm-err" role="alert"></div>`; } catch (e) { m.textContent = e.message; } }
async function admTwoFactorConfirm() { const m = document.getElementById('sec-2fa'); try { await admApi('POST', '/admin/api/2fa/confirm', { code: document.getElementById('sec-2code').value }); ADM.state.twoFactor = true; showToast('2-step sign-in is ON', 'success'); renderAdminContent('settings'); } catch (e) { document.getElementById('sec-2err').textContent = e.message; } }
async function admTwoFactorOff() { try { await admApi('POST', '/admin/api/2fa/off', { password: document.getElementById('sec-2off').value }); ADM.state.twoFactor = false; showToast('2-step sign-in is OFF', ''); renderAdminContent('settings'); } catch (e) { document.getElementById('sec-2fa').textContent = e.message; } }
async function admDownloadBackup() {
  const m = () => document.getElementById('sec-bk');
  try {
    const g = await admApi('GET', '/admin/api/db'); let pass = prompt('A backup holds every customer\'s name, phone and address, so it is locked with a password.\n\nChoose a backup password (at least 8 characters). You need it to restore the backup, and it cannot be recovered if you forget it.'); if (pass === null) return;
    let out, name;
    if (pass.length >= 8) { out = await encJson(g.db, pass); out.createdAt = new Date().toISOString(); name = 'anitha-store-backup-encrypted-' + ymd(new Date()) + '.json'; db.settings.lastEncBackup = new Date().toISOString(); saveDB(); }
    else { if (!confirm('That password is too short, so the backup would NOT be locked and anyone who gets the file could read your customers\' details.\n\nDownload an unlocked backup anyway?')) return; out = g.db; name = 'anitha-store-backup-UNLOCKED-' + ymd(new Date()) + '.json'; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); admApi('POST', '/admin/api/privacy/log', { event: 'backup-downloaded' }).catch(() => {});
  } catch (e) { if (m()) m().textContent = e.message; }
}
function admImport(inp) {
  const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader();
  r.onload = async () => { try { let d = JSON.parse(r.result); if (d && d.enc === 'aes-gcm-pbkdf2') { const pw = prompt('This backup is locked. Enter its password:'); if (pw === null) return; d = await decJson(d, pw); } if (!confirm('This replaces everything in the shop with the contents of this file. Continue?')) return; const x = await admApi('POST', '/admin/api/import', { db: d }); ADM.version = x.version; const g = await admApi('GET', '/admin/api/db'); for (const k of Object.keys(db)) delete db[k]; Object.assign(db, normalizeDB(g.db)); ADM.version = g.version; renderAdminContent('settings'); showToast(x.erasedAgain ? `✅ Data imported. ${x.erasedAgain} customer(s) who had been erased were removed again.` : '✅ Data imported', 'success'); } catch (e) { document.getElementById('sec-bk').textContent = 'Import failed: ' + e.message; } };
  r.readAsText(f);
}
async function admSignOut() { try { await admApi('POST', '/admin/api/logout', {}); } catch (e) { /* already out */ } ADM.signedIn = false; location.reload(); }

