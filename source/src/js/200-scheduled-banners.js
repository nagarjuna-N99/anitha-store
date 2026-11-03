// ================= SCHEDULED BANNERS (hero slides + announcement bar) =================
// Times are entered and shown in Indian Standard Time (IST).
const parseIST = s => s ? Date.parse(s + ':00+05:30') : NaN;
function inWindow(o, now = Date.now()) { const a = parseIST(o.startAt), b = parseIST(o.endAt); return (isNaN(a) || now >= a) && (isNaN(b) || now <= b); }
function schedStatus(o, now = Date.now()) {
  if (!o.enabled) return 'off'; const a = parseIST(o.startAt), b = parseIST(o.endAt);
  if (!isNaN(a) && now < a) return 'scheduled'; if (!isNaN(b) && now > b) return 'expired'; return 'live';
}
const fmtIST = s => { const t = parseIST(s); return isNaN(t) ? '' : new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }); };
function schedChip(o) {
  const st = schedStatus(o), label = { live: 'Live', scheduled: 'Starts ' + fmtIST(o.startAt), expired: 'Ended ' + fmtIST(o.endAt), off: 'Hidden' }[st];
  return `<span class="sch ${st}">${esc(label)}</span>`;
}
function schedFields(kind, i, o) {
  return `<div class="sched"><div class="form-group"><label>Show from (IST) <button type="button" class="linkbtn" onclick="schedSet('${kind}',${i},'startAt','')">clear</button></label><input type="datetime-local" value="${esc(o.startAt || '')}" onchange="schedSet('${kind}',${i},'startAt',this.value)"></div><div class="form-group"><label>Show until (IST) <button type="button" class="linkbtn" onclick="schedSet('${kind}',${i},'endAt','')">clear</button></label><input type="datetime-local" value="${esc(o.endAt || '')}" onchange="schedSet('${kind}',${i},'endAt',this.value)"></div></div>`;
}
function schedSet(kind, i, k, v) {
  const o = kind === 'hero' ? db.home.hero.slides[i] : db.home.announcements[i]; if (!o) return;
  const next = { ...o, [k]: v }, a = parseIST(next.startAt), b = parseIST(next.endAt);
  if (!isNaN(a) && !isNaN(b) && b <= a) { showToast('“Show until” must be after “Show from”', 'error'); renderHomeAdmin(document.getElementById('adminContent')); return; }
  o[k] = v; homeLive(true); renderHomeAdmin(document.getElementById('adminContent'));
}
function heroDup(i) { const s = db.home.hero.slides[i]; if (!s) return; const c = JSON.parse(JSON.stringify(s)); c.id = 'hs' + generateId(); c.title += ' (copy)'; c.startAt = ''; c.endAt = ''; db.home.hero.slides.splice(i + 1, 0, c); renderHomeAdmin(document.getElementById('adminContent')); homeLive(true); }
// announcement bar (the strip at the very top of the store)
let ANN = { i: 0, timer: null, sig: '' };
function activeAnnouncements(now = Date.now()) { return db.home.announcements.filter(a => a.enabled && a.text.trim() && inWindow(a, now)); }
function renderAnnouncement() {
  const bar = document.getElementById('announceBar'); if (!bar) return; clearInterval(ANN.timer);
  const list = activeAnnouncements(); bar.style.display = list.length ? '' : 'none'; if (!list.length) { bar.textContent = ''; return; }
  const show = () => { const a = list[ANN.i % list.length]; bar.innerHTML = esc(a.text).replace(/ · /g, ' <span>·</span> '); };
  ANN.i = 0; show(); if (list.length > 1 && !reducedMotion()) ANN.timer = setInterval(() => { ANN.i++; show(); }, 5000);
}
function scheduleSignature() { return heroVisible().map(s => s.id).join() + '|' + activeAnnouncements().map(a => a.id).join(); }
function scheduleTick() {
  const sig = scheduleSignature(); if (sig === ANN.sig) return; ANN.sig = sig; renderHero(); renderAnnouncement();
  if (isAdminView && currentAdminTab === 'home' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) renderHomeAdmin(document.getElementById('adminContent'));
}
setInterval(() => { if (db.home) scheduleTick(); }, 30000);
function annSet(i, k, v) { const a = db.home.announcements[i]; if (!a) return; a[k] = v; ANN.sig = scheduleSignature(); renderAnnouncement(); homeSaveSoon(); }
function annToggle(i) { db.home.announcements[i].enabled = !db.home.announcements[i].enabled; ANN.sig = scheduleSignature(); renderAnnouncement(); homeSaveSoon(); renderHomeAdmin(document.getElementById('adminContent')); }
function annAdd() { db.home.announcements.push({ id: 'an' + generateId(), enabled: true, text: 'Festive offer: free gift wrapping on all orders', startAt: '', endAt: '' }); ANN.sig = scheduleSignature(); renderAnnouncement(); homeSaveSoon(); renderHomeAdmin(document.getElementById('adminContent')); }
function annDel(i) { db.home.announcements.splice(i, 1); ANN.sig = scheduleSignature(); renderAnnouncement(); homeSaveSoon(); renderHomeAdmin(document.getElementById('adminContent')); }
function annMove(i, d) { const a = db.home.announcements, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; renderAnnouncement(); homeSaveSoon(); renderHomeAdmin(document.getElementById('adminContent')); }
function homeSchedExtras(container) { // adds schedule controls to each hero slide + the announcement card (called at the end of renderHomeAdmin)
  const H = db.home, now = Date.now(), c = { live: 0, scheduled: 0, expired: 0 };
  H.hero.slides.forEach(s => { const st = schedStatus(s, now); if (c[st] !== undefined) c[st]++; });
  container.querySelectorAll('.hs').forEach((el, i) => {
    const s = H.hero.slides[i]; if (!s) return;
    el.querySelector('.hs-head strong').insertAdjacentHTML('afterend', schedChip(s));
    el.querySelector('.hs-head').insertAdjacentHTML('beforeend', `<button class="btn-sm btn-info-sm" onclick="heroDup(${i})" title="Duplicate this slide" aria-label="Duplicate slide">⧉</button>`);
    el.querySelector('.hs-fields').insertAdjacentHTML('beforeend', schedFields('hero', i, s));
  });
  const note = container.querySelector('.hs-bar'); if (note) note.insertAdjacentHTML('afterend', `<div class="note" style="margin-bottom:8px;">Schedule seasonal banners with “Show from / until” under each slide. <strong>${c.live} live</strong> · ${c.scheduled} scheduled · ${c.expired} ended. They appear and disappear by themselves — no one needs to be at the keyboard.</div>`);
  container.insertAdjacentHTML('beforeend', `<div class="admin-card"><h3>📢 Announcement bar</h3><div class="note" style="margin-bottom:10px;">The thin strip at the very top of the store. If several are live at once they rotate. Leave the dates empty to show it always.</div>
    ${H.announcements.map((a, i) => `<div class="ann-row ${a.enabled ? '' : 'off'}"><div class="hs-head" style="margin-bottom:8px;"><strong>Message ${i + 1}</strong>${schedChip(a)}<span style="flex:1"></span><span class="hs-lbl">Show</span><div class="toggle ${a.enabled ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${a.enabled}" onclick="annToggle(${i})"></div><button class="btn-sm btn-info-sm" onclick="annMove(${i},-1)" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn-sm btn-info-sm" onclick="annMove(${i},1)" ${i === H.announcements.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn-sm btn-danger-sm" onclick="annDel(${i})" aria-label="Delete message">🗑</button></div>
      <div class="form-group"><input type="text" value="${esc(a.text)}" maxlength="140" oninput="annSet(${i},'text',this.value)" placeholder="e.g. Diwali sale: 15% off with code DIWALI15"></div>${schedFields('ann', i, a)}</div>`).join('') || '<p style="color:#6b6862;font-size:13px;">No messages — the top strip is hidden.</p>'}
    <button class="btn-sm btn-primary-sm" onclick="annAdd()">＋ Add message</button></div>`);
}

