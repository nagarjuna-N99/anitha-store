// ================= REPAIR ASSISTANT + AUTO-REPAIR (Ops page, admin only) =================
// Auto-repair: a short list of safe, fixed repairs that run by themselves every 10 minutes while the switch is ON (the AI is not involved).
// The chat: the admin asks questions; Claude (or a plain built-in answer) reads the Ops checks and explains them; it can only suggest repairs, the admin presses them.
const REPAIR = { status: null, msgs: [], busy: false, note: '' };
async function repairLoad() { try { REPAIR.status = await admApi('GET', '/admin/api/repair'); } catch (e) { REPAIR.status = null; REPAIR.note = aiMsg(e); } const b = el_('repair-box'); if (b) b.innerHTML = repairInnerHTML(); }
function repairInnerHTML() {
  const s = REPAIR.status, tog = (on, fn) => `<div class="toggle ${on ? 'active' : ''}" role="switch" tabindex="0" aria-checked="${!!on}" onclick="${fn}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></div>`;
  if (!s || !Array.isArray(s.actions)) return `<p class="note">${esc(REPAIR.note || 'Loading…')}</p>`;
  const label = id => ((s.actions.find(a => a.id === id) || {}).label) || id, when = t => String(t || '').slice(0, 16).replace('T', ' ');
  const logs = [...(s.log || []).map(e => ({ t: e.at, who: e.by === 'auto' ? 'automatic' : 'admin', text: (e.ok === false ? '⚠ ' : '') + (e.note || e.action) })), ...(s.selfheal || []).map(e => ({ t: e.t, who: 'server self-heal', text: e.note || e.action }))].sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 12);
  const chat = REPAIR.msgs.map(m => m.who === 'me' ? `<div class="rp-me">${esc(m.text)}</div>` : `<div class="rp-bot"><div>${esc(m.text).replace(/\n/g, '<br>')}</div>${(m.steps || []).length ? `<ol>${m.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}${(m.actions || []).length ? `<div class="th-actions">${m.actions.map(a => `<button type="button" class="btn-sm btn-info-sm" onclick="repairRun(['${esc(a)}'])">🛠 ${esc(label(a))}</button>`).join('')}</div>` : ''}<small class="note">${m.via === 'claude' ? '✨ Claude read the checks · it only suggests: you press the buttons' : 'Plain answer from the checks'}</small></div>`).join('');
  return `<div class="hs-bar"><span><b>Auto-repair</b>: every 10 minutes it fixes a few safe things by itself (a missed daily privacy clean-up, loosened file permissions, and it keeps a known-good copy of the shop data). Nothing else is ever changed automatically.</span>${tog(s.enabled, 'repairToggle()')}</div>
    <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" onclick="repairRun()">▶ Run the safe repairs now</button>${s.lastGoodCopy ? `<small class="note">Last known-good copy of the shop data: ${esc(when(s.lastGoodCopy))} UTC</small>` : '<small class="note">No known-good copy yet: press the button once.</small>'}</div>
    <div class="rp-chat" id="rp-chat" aria-live="polite">${chat || '<p class="note" style="margin:0">Ask anything about the red and yellow lines above, in your own words. For example: “What is wrong right now?”, “Is the PUBLIC_URL warning serious?”, “How do I connect WhatsApp?”.</p>'}${REPAIR.busy ? '<div class="rp-bot"><small class="note">Reading the checks…</small></div>' : ''}</div>
    <div class="th-ai-row"><input id="rp-q" type="text" maxlength="500" placeholder="Ask the repair assistant…" onkeydown="if(event.key==='Enter'){event.preventDefault();repairAsk()}"><button type="button" class="btn-sm btn-info-sm" onclick="repairAsk()">✨ Ask</button></div>
    <div class="th-actions">${['What is wrong right now?', 'What should I fix first?', 'Is anything urgent?'].map(q => `<button type="button" class="btn-sm" onclick="repairAsk('${q.replace(/'/g, '')}')">${q}</button>`).join('')}</div>
    <h4 class="dash-h4" style="margin-top:12px">What has been repaired</h4>
    ${logs.length ? `<div class="hn-list">${logs.map(l => `<div><span>${esc(l.text)}<small>${esc(when(l.t))} · ${esc(l.who)}</small></span></div>`).join('')}</div>` : '<p class="note">Nothing needed repairing yet.</p>'}`;
}
function repairCardHTML() { setTimeout(repairLoad, 0); return `<div class="admin-card" id="repair-card"><h3 style="margin:0 0 6px">🛠 Repair assistant &amp; auto-repair</h3><div id="repair-box"><p class="note">Loading…</p></div></div>`; }
async function repairToggle() { try { REPAIR.status = await admApi('POST', '/admin/api/repair/enabled', { enabled: !REPAIR.status.enabled }); } catch (e) { showToast(aiMsg(e), 'error'); } el_('repair-box').innerHTML = repairInnerHTML(); }
async function repairRun(ids) {
  try { const r = await admApi('POST', '/admin/api/repair/run', { ids }); REPAIR.status = r; const bad = (r.results || []).filter(x => !x.ok); showToast(bad.length ? bad[0].note : ((r.results || []).map(x => x.note).join(' ') || 'Done'), bad.length ? 'error' : 'success'); } catch (e) { showToast(aiMsg(e), 'error'); }
  const b = el_('repair-box'); if (b) b.innerHTML = repairInnerHTML();
}
async function repairAsk(text) {
  const inp = el_('rp-q'), q = String(text || (inp && inp.value) || '').trim(); if (!q || REPAIR.busy) return; if (inp) inp.value = '';
  REPAIR.msgs.push({ who: 'me', text: q }); REPAIR.busy = true; const b = el_('repair-box'); if (b) b.innerHTML = repairInnerHTML();
  try {
    const history = REPAIR.msgs.slice(0, -1).slice(-6).map(m => ({ who: m.who, text: m.text })), r = await admApi('POST', '/admin/api/repair/chat', { message: q, history, ai: typeof aiOn === 'function' ? aiOn('repair') : true });
    REPAIR.msgs.push({ who: 'bot', text: r.reply, steps: r.steps, actions: r.actions, via: r.via });
  } catch (e) { REPAIR.msgs.push({ who: 'bot', text: 'Sorry, I could not answer: ' + aiMsg(e), steps: [], actions: [], via: 'built-in' }); }
  REPAIR.busy = false; if (b) b.innerHTML = repairInnerHTML(); const c = el_('rp-chat'); if (c) c.scrollTop = c.scrollHeight;
}
