// ================= WhatsApp promotions (owner only) =================
// Reports on regular vs promotional messages, what they cost, other running costs (total expenses), the template list with AI wording help,
// and promotions to customers who said yes to offers. The server does the counting and the sending; this page only shows and asks.
const PR = { d: null, rep: null, range: '30', msg: '', ai: null, aiBusy: false, edit: null };
const prMoney = n => '₹' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const prDay = t => new Date(t + 330 * 60_000).toISOString().slice(0, 10);
function prRangeDates(r) {
  const t = Date.now(), today = prDay(t), first = today.slice(0, 7) + '-01';
  if (r === '1') return [today, today]; if (r === '7') return [prDay(t - 6 * 86400_000), today]; if (r === 'month') return [first, today];
  if (r === 'last') { const e = prDay(Date.parse(first + 'T00:00:00Z') - 86400_000); return [e.slice(0, 7) + '-01', e]; }
  return [prDay(t - 29 * 86400_000), today];
}
async function renderPromo(c, keep) {
  if (!keep) c.innerHTML = '<div class="admin-card"><h3>💬 WhatsApp promotions</h3><p class="note">Loading…</p></div>';
  try { const [f, t] = prRangeDates(PR.range); [PR.d, PR.rep] = await Promise.all([admApi('GET', '/admin/api/promo'), admApi('GET', `/admin/api/promo/report?from=${f}&to=${t}`)]); }
  catch (e) { c.innerHTML = `<div class="admin-card"><h3>💬 WhatsApp promotions</h3><p class="note">${esc(aiMsg(e))}</p></div>`; return; }
  prDraw(c);
}
function prDraw(c) {
  c = c || el_('adminContent'); if (!c || !PR.d) return; const d = PR.d, r = PR.rep, K = d.kinds, tile = (l, v, s) => `<div class="g-tile"><small>${l}</small><b>${v}</b><span>${s || '&nbsp;'}</span></div>`;
  const kinds = ['service', 'utility', 'marketing', 'authentication'], row = (name, o) => `<tr><td>${esc(name)}</td><td>${o.sent}</td><td>${o.failed || 0}</td><td>${o.dry || 0}</td><td>${prMoney(o.cost)}</td></tr>`;
  const tbl = (head, rows) => rows.length ? `<table class="pr-tbl"><thead><tr><th>${head}</th><th>Sent</th><th>Failed</th><th>Simulated</th><th>Cost</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="note">Nothing in this period yet.</p>';
  const srcName = { assistant: 'Chat assistant replies', order: 'Order updates', cart: 'Cart reminders', otp: 'Sign-in codes', promo: 'Promotions', 'promo-test': 'Promotion test sends', other: 'Other' };
  const approved = d.templates.filter(t => t.kind === 'marketing' && t.status === 'approved');
  const live = d.live ? '' : '<div class="grow-remind" style="background:#fff7e0;border-color:#ecd48a"><div><b>WhatsApp is not connected yet.</b><div class="note" style="margin:2px 0 0">Nothing real is sent. Messages are only <b>simulated</b> and cost nothing, so you can practise safely. Connect WhatsApp in the WhatsApp tab to go live.</div></div></div>';
  c.innerHTML = `<div class="admin-card"><h3>💬 WhatsApp promotions, templates and costs</h3>${live}
    <p class="note">Only customers who said yes to offers can receive a promotion, and anyone who sends STOP is left out. Nothing goes out between 9 pm and 9 am. Prices below are rough starting values: check Meta's current price list for India and edit them.</p>
    <p class="note" style="font-size:.78rem">This tool is not part of WhatsApp or Meta. Amounts are your own estimate from the prices you enter, not a bill.</p></div>

  <div class="admin-card"><h3>📊 Messages and costs</h3>
    <div class="th-actions">${[['1', 'Today'], ['7', '7 days'], ['30', '30 days'], ['month', 'This month'], ['last', 'Last month']].map(([k, l]) => `<button type="button" class="btn-sm ${PR.range === k ? 'btn-primary-sm' : ''}" onclick="prRange('${k}')">${l}</button>`).join('')}<button type="button" class="btn-sm" onclick="prCsv()">⬇ Download list (CSV)</button></div>
    <div class="g-tiles">${kinds.map(k => tile(esc(K[k]), r.byKind[k].sent, `${prMoney(r.byKind[k].cost)}${r.byKind[k].failed ? ' · ' + r.byKind[k].failed + ' failed' : ''}${r.byKind[k].dry ? ' · ' + r.byKind[k].dry + ' simulated' : ''}`)).join('')}</div>
    <div class="g-tiles" style="margin-top:10px">${tile('Message costs', prMoney(r.messageCost), 'sent messages only')}${tile('Other running costs', prMoney(r.otherCosts), 'server, domain…')}${tile('Total expenses', prMoney(r.totalExpenses), r.from + ' to ' + r.to)}</div>
    <h4 class="dash-h4">By kind</h4>${tbl('Kind', kinds.map(k => row(K[k], r.byKind[k])))}
    <h4 class="dash-h4">By where the message came from</h4>${tbl('Source', Object.keys(r.bySource).map(k => row(srcName[k] || k, r.bySource[k])))}
    <h4 class="dash-h4">By month</h4>${tbl('Month', Object.keys(r.byMonth).sort().map(k => row(k, r.byMonth[k])))}
    <h4 class="dash-h4">By promotion</h4>${tbl('Promotion', r.campaigns.map(x => row(x.name, x)))}</div>

  <div class="admin-card"><h3>💰 Prices and other running costs</h3>
    <div class="pr-grid">${kinds.map(k => `<label>${esc(K[k])} (₹ per message)<input id="pr-rate-${k}" type="number" min="0" max="100" step="0.01" value="${d.rates[k]}"></label>`).join('')}</div>
    <label class="pr-wide">Note to yourself (where the prices come from)<input id="pr-rate-note" maxlength="200" value="${esc(d.ratesNote || '')}" placeholder="for example: Meta price list for India, checked on…"></label>
    <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" onclick="prSaveRates()">Save prices</button></div>
    <h4 class="dash-h4">Other running costs</h4>
    ${d.expenses.length ? `<div class="hn-list">${d.expenses.map(e => `<div><span>${esc(e.label)}: ${prMoney(e.amount)} ${e.every === 'month' ? 'every month' : 'once'}<small>from ${esc(e.from)}${e.note ? ' · ' + esc(e.note) : ''}</small></span><button type="button" class="btn-sm" onclick="prDelExpense('${e.id}')">Remove</button></div>`).join('')}</div>` : '<p class="note">None added yet. Add the server, domain, Claude and other costs so the total is complete.</p>'}
    <div class="pr-grid"><label>What for<input id="pr-x-label" maxlength="80" placeholder="Server"></label><label>Amount (₹)<input id="pr-x-amt" type="number" min="0" step="0.01"></label><label>How often<select id="pr-x-every"><option value="month">Every month</option><option value="once">Once</option></select></label><label>From<input id="pr-x-from" type="date" value="${prDay(Date.now())}"></label></div>
    <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" onclick="prAddExpense()">Add cost</button></div></div>

  <div class="admin-card"><h3>📝 Message templates</h3>
    <p class="note">WhatsApp only lets you start a conversation, or send a promotion, with a template that Meta has approved. Write one here (or let the AI draft it), copy it into Meta's template manager, and when Meta approves it mark it <b>Approved</b> here.</p>
    ${d.templates.length ? d.templates.map(t => `<div class="pr-tpl"><div><b>${esc(t.name)}</b> <span class="pr-badge pr-${t.status}">${t.status}</span> <small>${esc(K[t.kind] || t.kind)} · ${esc(t.lang)}</small></div><div class="pr-body">${esc(t.body).replace(/\n/g, '<br>')}</div>${t.issues.length ? `<div class="pr-warn">⚠ ${esc(t.issues[0])}</div>` : ''}<div class="th-actions"><button type="button" class="btn-sm" onclick="prEditTpl('${esc(t.name)}')">Edit</button><button type="button" class="btn-sm" onclick="prCopyTpl('${esc(t.name)}')">Copy for Meta</button>${['submitted', 'approved', 'rejected'].filter(s => s !== t.status).map(s => `<button type="button" class="btn-sm" onclick="prSetStatus('${esc(t.name)}','${s}')">Mark ${s}</button>`).join('')}<button type="button" class="btn-sm" onclick="prDelTpl('${esc(t.name)}')">Delete</button></div></div>`).join('') : '<p class="note">No templates yet.</p>'}
    <h4 class="dash-h4">${PR.edit ? 'Edit template' : 'New template'}</h4>
    <div class="pr-grid"><label>Name (small letters and _)<input id="pr-t-name" maxlength="60" placeholder="diwali_offer_2026" value="${esc(PR.edit ? PR.edit.name : '')}" ${PR.edit ? 'readonly' : ''}></label><label>Kind<select id="pr-t-kind"><option value="marketing">Promotion (marketing)</option><option value="utility">Order update (utility)</option><option value="authentication">Sign-in code</option></select></label><label>Language<select id="pr-t-lang"><option value="en">English</option><option value="te">Telugu</option><option value="hi">Hindi</option></select></label></div>
    <label class="pr-wide">Wording. Use {{1}} for the customer's first name and {{2}}, {{3}} for other details<textarea id="pr-t-body" rows="5" maxlength="1100">${esc(PR.edit ? PR.edit.body : '')}</textarea></label>
    <label class="pr-wide">One example for each {{ }}, separated by commas (Meta asks for these)<input id="pr-t-ex" maxlength="300" value="${esc(PR.edit ? (PR.edit.example || []).join(', ') : '')}"></label>
    <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" onclick="prSaveTpl()">Save template</button>${PR.edit ? '<button type="button" class="btn-sm" onclick="prEditTpl(null)">Cancel</button>' : ''}</div>
    <div class="ai-sec"><h4 class="dash-h4">✨ Ask AI to write the wording</h4>
      <div class="pr-grid"><label>What is the message for<input id="pr-ai-goal" maxlength="200" placeholder="Diwali collection announcement"></label><label>Facts you want in it (only these will be used)<input id="pr-ai-offer" maxlength="200" placeholder="New Kanjivaram sarees from 20 Oct"></label></div>
      <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" id="pr-ai-btn" onclick="prAiDraft()">✨ Draft 3 versions</button></div>
      <p class="note" style="font-size:.78rem">The AI never invents a discount or price. It only suggests: nothing is saved or sent until you press “Use this” and then Save.</p>
      ${PR.ai ? PR.ai.map((v, i) => `<div class="pr-tpl"><b>${esc(v.name)}</b> <small>${esc(v.note || '')}</small><div class="pr-body">${esc(v.body).replace(/\n/g, '<br>')}</div><div class="th-actions"><button type="button" class="btn-sm" onclick="prUseAi(${i})">Use this</button></div></div>`).join('') : ''}</div></div>

  <div class="admin-card"><h3>📣 Promotions</h3>
    <p class="note">${d.audience.recipients} customer${d.audience.recipients === 1 ? '' : 's'} can receive a promotion now (${d.audience.noConsent} said no to offers, ${d.audience.optedOut} sent STOP, ${d.audience.noPhone} have no phone number). Sent today: ${d.sentToday} of ${d.settings.dailyCap} allowed.${d.quiet ? ' <b>It is quiet time now (9 pm to 9 am): promotions wait until morning.</b>' : ''}</p>
    ${d.campaigns.length ? d.campaigns.map(x => `<div class="pr-tpl"><div><b>${esc(x.name)}</b> <span class="pr-badge pr-${x.status}">${{ draft: 'not started', sending: 'sending', done: 'finished', stopped: 'stopped' }[x.status] || x.status}</span> <small>template ${esc(x.template)} · sent ${x.sent}${x.failed ? ', failed ' + x.failed : ''}${x.expected ? ' of ' + x.expected : ''}</small></div><div class="th-actions">${x.status === 'draft' ? `<button type="button" class="btn-sm" onclick="prTest('${x.id}')">Send a test to my number</button><button type="button" class="btn-sm btn-primary-sm" onclick="prStart('${x.id}')">Start…</button>` : ''}${x.status === 'sending' ? `<button type="button" class="btn-sm" onclick="prStop('${x.id}')">Stop</button>` : ''}${x.status !== 'sending' ? `<button type="button" class="btn-sm" onclick="prDelCamp('${x.id}')">Delete</button>` : ''}</div></div>`).join('') : '<p class="note">No promotions yet.</p>'}
    <h4 class="dash-h4">New promotion</h4>
    ${approved.length ? `<div class="pr-grid"><label>Name<input id="pr-c-name" maxlength="80" placeholder="Diwali 2026"></label><label>Template (approved)<select id="pr-c-tpl" onchange="prCampParams()">${approved.map(t => `<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('')}</select></label></div><div id="pr-c-params" class="pr-grid"></div>
    <div class="th-actions"><button type="button" class="btn-sm btn-primary-sm" onclick="prNewCamp()">Create (nothing is sent yet)</button></div>` : '<p class="note">You need an <b>approved</b> promotion template first. Write one above, send it to Meta, and mark it Approved here when Meta says yes.</p>'}
    <label class="pr-wide" style="margin-top:10px">Most promotions to send in one day<input id="pr-cap" type="number" min="1" max="5000" value="${d.settings.dailyCap}" style="max-width:120px"></label><div class="th-actions"><button type="button" class="btn-sm" onclick="prSaveCap()">Save limit</button></div></div>
  <p class="note" id="pr-msg" aria-live="polite">${esc(PR.msg)}</p>`;
  if (el_('pr-c-tpl')) prCampParams();
}
const prSay = m => { PR.msg = m; const e = el_('pr-msg'); if (e) e.textContent = m; showToast(m, 'success'); };
const prFail = e => { PR.msg = aiMsg(e); const x = el_('pr-msg'); if (x) x.textContent = PR.msg; showToast(PR.msg, 'error'); };
const prVal = id => (el_(id) || {}).value || '';
async function prDo(fn, ok) { try { const r = await fn(); await renderPromo(el_('adminContent'), true); if (ok) prSay(ok); return r; } catch (e) { prFail(e); } }
function prRange(k) { PR.range = k; renderPromo(el_('adminContent'), true); }
async function prCsv() {
  try { const [f, t] = prRangeDates(PR.range), r = await fetch(`/admin/api/promo/export?from=${f}&to=${t}`, { credentials: 'same-origin' }); if (!r.ok) throw new Error('Could not make the list'); const b = await r.blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `whatsapp-messages-${f}-to-${t}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  catch (e) { prFail(e); }
}
function prSaveRates() { const rates = {}; ['service', 'utility', 'marketing', 'authentication'].forEach(k => { rates[k] = prVal('pr-rate-' + k); }); prDo(() => admApi('POST', '/admin/api/promo/rates', { rates, note: prVal('pr-rate-note') }), 'Prices saved.'); }
function prAddExpense() { prDo(() => admApi('POST', '/admin/api/promo/expense', { label: prVal('pr-x-label'), amount: prVal('pr-x-amt'), every: prVal('pr-x-every'), from: prVal('pr-x-from') }), 'Cost added.'); }
function prDelExpense(id) { if (confirm('Remove this cost?')) prDo(() => admApi('POST', '/admin/api/promo/expense/remove', { id }), 'Removed.'); }
function prTplBody() { return { name: prVal('pr-t-name'), kind: prVal('pr-t-kind'), lang: prVal('pr-t-lang'), body: prVal('pr-t-body'), example: prVal('pr-t-ex').split(',').map(x => x.trim()).filter(Boolean) }; }
function prSaveTpl() { const b = prTplBody(); b.status = PR.edit ? PR.edit.status : 'draft'; PR.edit = null; prDo(() => admApi('POST', '/admin/api/promo/template', b), 'Template saved as a draft. Check the warning under it, if any.'); }
function prEditTpl(n) { PR.edit = n ? PR.d.templates.find(t => t.name === n) : null; prDraw(); if (PR.edit) { el_('pr-t-kind').value = PR.edit.kind; el_('pr-t-lang').value = PR.edit.lang; el_('pr-t-body').scrollIntoView({ block: 'center' }); } }
function prSetStatus(name, status) { const t = PR.d.templates.find(x => x.name === name); prDo(() => admApi('POST', '/admin/api/promo/template', { ...t, status }), 'Marked ' + status + '.'); }
function prDelTpl(n) { if (confirm('Delete this template from your list? (It stays in Meta until you remove it there.)')) prDo(() => admApi('POST', '/admin/api/promo/template/remove', { name: n }), 'Deleted.'); }
function prCopyTpl(n) { const t = PR.d.templates.find(x => x.name === n); copyText(`Name: ${t.name}\nCategory: ${t.kind.toUpperCase()}\nLanguage: ${t.lang}\n\n${t.body}\n\nExamples: ${(t.example || []).join(' | ')}`, 'Template'); }
async function prAiDraft() {
  const goal = prVal('pr-ai-goal').trim(); if (!goal) { prFail(new Error('Write what the message is for.')); return; }
  const input = { goal, offer: prVal('pr-ai-offer'), kind: prVal('pr-t-kind') === 'utility' ? 'utility' : 'marketing', lang: prVal('pr-t-lang') || 'en', shop: (db.settings && db.settings.businessName) || 'Anitha Pemmasani' };
  PR.aiBusy = true; const b = el_('pr-ai-btn'); if (b) { b.disabled = true; b.textContent = 'Writing…'; }
  try {
    let v = null, note = '';
    try { v = (await aiCall('watemplate', input)).data.variants; } catch (e) { note = ' (Claude is not available, so these are plain built-in versions: ' + aiMsg(e) + ')'; }
    if (!Array.isArray(v) || !v.length) v = (await admApi('POST', '/admin/api/promo/template/draft', input)).variants;
    PR.ai = v.slice(0, 3).map(x => ({ name: String(x.name || 'my_template'), kind: x.kind === 'utility' ? 'utility' : 'marketing', body: String(x.body || ''), example: Array.isArray(x.example) ? x.example : [], note: String(x.note || '') })); PR.msg = 'Drafts ready: choose one, edit it, then save.' + note;
  } catch (e) { prFail(e); }
  PR.aiBusy = false; prDraw(); if (PR.ai && el_('pr-ai-btn')) el_('pr-ai-btn').scrollIntoView({ block: 'center' });
}
function prUseAi(i) { const v = PR.ai[i]; PR.edit = null; prDraw(); el_('pr-t-name').value = v.name; el_('pr-t-kind').value = v.kind; el_('pr-t-body').value = v.body; el_('pr-t-ex').value = v.example.join(', '); el_('pr-t-body').scrollIntoView({ block: 'center' }); prSay('Filled in. Read it, change what you like, then press Save template.'); }
function prCampParams() {
  const t = PR.d.templates.find(x => x.name === prVal('pr-c-tpl')), box = el_('pr-c-params'); if (!t || !box) return; const n = t.vars.length;
  box.innerHTML = t.vars.map((v, i) => `<label>Value for {{${v}}}${i === 0 ? ' (the customer\'s first name is filled in for you)' : ''}<input class="pr-c-par" maxlength="200" value="${i === 0 ? '@name' : ''}" placeholder="${i === 0 ? '@name' : 'text or link'}"></label>`).join('') || '<p class="note">This template has no variables.</p>';
}
function prNewCamp() { const params = [...document.querySelectorAll('.pr-c-par')].map(x => x.value.trim()); prDo(() => admApi('POST', '/admin/api/promo/campaign', { name: prVal('pr-c-name'), template: prVal('pr-c-tpl'), params }), 'Created. Send yourself a test, then press Start.'); }
async function prTest(id) { const to = prompt('Your own WhatsApp number with country code (for example 919876543210):'); if (!to) return; prDo(async () => { const r = await admApi('POST', '/admin/api/promo/campaign/test', { id, to }); PR.msg = r.dry ? 'Simulated test: WhatsApp is not connected, nothing was really sent.' : 'Test sent to your number.'; }); }
async function prStart(id) {
  try {
    const x = PR.d.campaigns.find(c => c.id === id), e = await admApi('POST', '/admin/api/promo/campaign/estimate', { template: x.template });
    if (!confirm(`Send “${x.name}” to ${e.recipients} customer${e.recipients === 1 ? '' : 's'}?\nRough cost: ${prMoney(e.estimate)} (${prMoney(e.perMessage)} each).\nIt sends only between 9 am and 9 pm, and never twice to the same person.${PR.d.live ? '' : '\n\nWhatsApp is not connected: this will only be simulated.'}`)) return;
    await admApi('POST', '/admin/api/promo/campaign/approve', { id, confirmCount: e.recipients }); await renderPromo(el_('adminContent'), true); prSay('Started.');
  } catch (e) { prFail(e); renderPromo(el_('adminContent'), true); }
}
function prStop(id) { prDo(() => admApi('POST', '/admin/api/promo/campaign/stop', { id }), 'Stopped.'); }
function prDelCamp(id) { if (confirm('Delete this promotion from the list?')) prDo(() => admApi('POST', '/admin/api/promo/campaign/remove', { id }), 'Deleted.'); }
function prSaveCap() { prDo(() => admApi('POST', '/admin/api/promo/settings', { dailyCap: prVal('pr-cap') }), 'Limit saved.'); }
