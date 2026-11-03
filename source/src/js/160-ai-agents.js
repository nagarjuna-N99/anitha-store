// ================= AI agents for the owner (4 Nov 2026). Every one only DRAFTS: nothing is sent, published or changed until the owner presses the button. =================
const AGENT_NOTE = 'Draft only. Nothing is sent. Read it, change it, then send it yourself.';
const waLink = (phone, text) => { let d = String(phone || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text); };
const AG_LANGS = () => AI_LANGS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
// ---------- 3. Order desk: a WhatsApp message for an order ----------
const OD_STAGE = { placed: 'received', confirmed: 'confirmed', packed: 'packed', shipped: 'shipped', out_for_delivery: 'shipped', delivered: 'delivered' };
let OD = null;
function odFacts(src, id) {
  if (src === 'web') { const w = (typeof OV2 !== 'undefined' && OV2.web.find(x => x.id === id)) || WEB.list.find(x => x.id === id); if (!w) return null; const o = w.order || {}, c = w.customer || {}; return { phone: c.phone, firstName: String(c.name || '').split(/\s+/)[0], items: (o.items || []).map(i => ({ name: i.name, qty: i.quantity, price: i.price })), total: o.total, city: (o.shippingAddress || {}).city, gift: !!o.gift, instructions: o.instructions, issues: (w.check && w.check.issues) || [], stage: 'received' }; }
  const o = db.orders.find(x => x.id === id); if (!o) return null;
  return { phone: o.phone, firstName: String(o.customer || '').split(/\s+/)[0], items: (o.items || []).map(i => ({ name: i.name, qty: i.quantity, price: i.price })), total: o.total, city: (o.shippingAddress || {}).city, gift: !!o.gift, instructions: o.instructions, issues: [], tracking: o.tracking, courier: o.courier || o.carrier, stage: OD_STAGE[o.status] || 'received' };
}
function odLocal(f) {
  const n = f.firstName ? ' ' + f.firstName : '', its = f.items.map(i => `${i.name}${i.qty > 1 ? ' × ' + i.qty : ''}`).join(', '), tot = f.total ? ` (₹${gN(f.total)})` : '', chk = f.issues && f.issues.length ? ' We are checking availability and will confirm very soon.' : '';
  return ({ received: `Hello${n}, thank you for your order of ${its}${tot}. We are confirming it and will share the payment details here shortly.${chk}`, confirmed: `Hello${n}, your order of ${its}${tot} is confirmed. We will agree the payment with you here on WhatsApp.`, packed: `Hello${n}, your order of ${its} is packed and will go to the courier soon. We will message you the tracking details.`, shipped: `Hello${n}, your order of ${its} has been handed to the courier.${f.tracking ? ' Tracking: ' + f.tracking + (f.courier ? ' (' + f.courier + ')' : '') + '.' : ' We will share the tracking details shortly.'}`, delivered: `Hello${n}, your order of ${its} was delivered. We hope you love it. If everything is fine, a short review would mean a lot to us.` })[f.stage] + (f.instructions ? ' We have noted your special request.' : '');
}
async function orderDraftOpen(src, id) {
  const f = odFacts(src, id); if (!f) { showToast('Order not found', 'error'); return; } OD = { f, lang: 'en' };
  openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0 0 4px;">✉ Message for ${esc(f.firstName || 'the customer')}</h3><p class="note" style="margin:0 0 12px">${AGENT_NOTE}</p>
    <div class="ai-row" style="gap:12px;align-items:flex-end;flex-wrap:wrap"><label>Language<select id="od-lang" onchange="OD.lang=this.value;odWrite()">${AG_LANGS()}</select></label><button type="button" class="btn-sm btn-info-sm" onclick="odWrite()">↻ Write again</button></div>
    <textarea id="od-text" rows="8" style="width:100%;margin-top:10px" placeholder="Writing…"></textarea><div id="od-note" class="note"></div>
    <div class="pf-actions" style="margin-top:10px"><button type="button" class="btn-sm btn-primary-sm" onclick="odCopy()">📋 Copy</button><button type="button" class="btn-sm btn-info-sm" onclick="odOpen()">💬 Open in WhatsApp</button></div>`);
  await odWrite();
}
async function odWrite() {
  const f = OD.f, t = el_('od-text'), note = el_('od-note'); if (!t) return; t.value = ''; t.placeholder = '✨ writing…'; let text = '', why = '';
  if (aiReady('orderdraft')) { try { text = (await aiCall('orderdraft', { stage: f.stage, firstName: f.firstName, items: f.items, total: f.total, city: f.city, gift: f.gift, instructions: f.instructions, issues: f.issues, tracking: f.tracking, courier: f.courier, shopName: db.settings.businessName, lang: OD.lang })).text.trim(); } catch (e) { why = aiMsg(e); } } else why = aiConnected() ? 'The order helper is switched off (AI Helper tab).' : (BUILD === 'admin' ? 'Claude is not connected: this is the built-in message. Add your Claude key in Settings for a personal one.' : 'Claude is not connected: this is the built-in message.');
  if (!text) { text = odLocal(f); if (OD.lang !== 'en') why = (why ? why + ' ' : '') + 'The built-in message is in English only.'; }
  if (el_('od-text')) { el_('od-text').value = text; el_('od-text').placeholder = ''; } if (note) note.textContent = why ? '🟡 ' + why : '🟢 Written by Claude from the order facts. Please read it.';
}
const odCopy = () => copyText(el_('od-text').value, 'Message copied');
function odOpen() { const t = el_('od-text').value.trim(); if (!t) return; if (!OD.f.phone) { showToast('No phone number on this order', 'error'); return; } window.open(waLink(OD.f.phone, t), '_blank', 'noopener'); }
// ---------- 4. Privacy request helper ----------
let PVD = null;
function pvFacts(t) {
  const d = last10(t.contact), em = String(t.contact || '').includes('@') ? String(t.contact).toLowerCase() : '', u = db.users.find(x => (d.length >= 6 && last10(x.phone) === d) || (em && String(x.email || '').toLowerCase() === em));
  const os = db.orders.filter(o => (u && o.userId === u.id) || (d.length >= 6 && last10(o.phone) === d)), inv = db.invoices.filter(i => os.some(o => o.id === i.orderId)), rv = u ? db.reviews.filter(r => r.userId === u.id) : [];
  return { type: t.type, channel: t.channel || 'site', firstName: String(t.name || '').split(/\s+/)[0], daysLeft: Math.ceil((Date.parse(t.due) - Date.now()) / 86400000), orders: os.length, invoices: inv.length, reviews: rv.length, consent: !!(u && u.consents && (u.consents.orderUpdates || u.consents.marketing)), shopName: db.settings.businessName, officer: db.settings.grievanceOfficer };
}
function pvLocal(f) {
  const n = f.firstName ? ' ' + f.firstName : '', sign = `\n\nWarm regards,\n${f.shopName || 'Anitha Pemmasani'}${f.officer ? '\nGrievance officer: ' + f.officer : ''}`, head = `Hello${n}, thank you for writing to us. We have your request and will answer fully within 30 days. First we need to confirm that it is really you who is asking.`;
  const by = { access: ' After that we will send you a summary of the data we hold about you.', correct: ' Please tell us exactly what is wrong and what it should say; we will fix it.', erase: ' After that we will erase your profile, reviews, alerts and chat. Invoices keep only your name and address until the 6-year tax period ends, and are then anonymised. If you asked us to stop messaging you, your number stays on a do-not-message list so we never write to you again.', withdraw: ' After that we will stop the WhatsApp messages and update your choices.', nominate: ' We have noted the person you named and may ask them to confirm.', grievance: ' We are looking into it and will reply with what we find.' };
  return head + (by[f.type] || '') + sign;
}
async function privDraft(id) {
  const t = ((PRIV.data || {}).tickets || []).find(x => x.id === id); if (!t) return; PVD = { t, f: pvFacts(t), lang: 'en' };
  openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0 0 4px;">✨ Reply to request ${esc(t.id)}</h3><p class="note" style="margin:0 0 12px">${AGENT_NOTE} The reply is built from the type of request and counts only (${PVD.f.orders} order${PVD.f.orders === 1 ? '' : 's'}, ${PVD.f.invoices} invoice${PVD.f.invoices === 1 ? '' : 's'}, ${PVD.f.reviews} review${PVD.f.reviews === 1 ? '' : 's'}); only the first name goes to Claude, never a phone number, email or full name. ${PVD.f.daysLeft < 0 ? `<b style="color:#b03227">This request is ${-PVD.f.daysLeft} day(s) late.</b>` : `${PVD.f.daysLeft} day(s) left to reply.`}</p>
    <div class="ai-row" style="gap:12px;align-items:flex-end;flex-wrap:wrap"><label>Language<select id="pvd-lang" onchange="PVD.lang=this.value;pvdWrite()">${AG_LANGS()}</select></label><button type="button" class="btn-sm btn-info-sm" onclick="pvdWrite()">↻ Write again</button></div>
    <textarea id="pvd-text" rows="11" style="width:100%;margin-top:10px" placeholder="Writing…"></textarea><div id="pvd-note" class="note"></div>
    <div class="pf-actions" style="margin-top:10px"><button type="button" class="btn-sm btn-primary-sm" onclick="copyText(el_('pvd-text').value,'Reply copied')">📋 Copy</button>${/^[+\d\s()-]{7,}$/.test(String(t.contact || '')) ? `<button type="button" class="btn-sm btn-info-sm" onclick="window.open(waLink(PVD.t.contact,el_('pvd-text').value),'_blank','noopener')">💬 Open in WhatsApp</button>` : ''}<button type="button" class="btn-sm btn-info-sm" onclick="pvdNote()">📝 Save as a note on this request</button></div>`);
  await pvdWrite();
}
async function pvdWrite() {
  const f = PVD.f, box = el_('pvd-text'), note = el_('pvd-note'); if (!box) return; box.value = ''; box.placeholder = '✨ writing…'; let text = '', why = '';
  if (aiReady('privacydraft')) { try { text = (await aiCall('privacydraft', { ...f, lang: PVD.lang })).text.trim(); } catch (e) { why = aiMsg(e); } } else why = aiConnected() ? 'The privacy helper is switched off (AI Helper tab).' : 'Claude is not connected: this is the built-in reply. Add your Claude key in Settings for a personal one.';
  if (!text) { text = pvLocal(f); if (PVD.lang !== 'en') why = (why ? why + ' ' : '') + 'The built-in reply is in English only.'; }
  if (el_('pvd-text')) { el_('pvd-text').value = text; el_('pvd-text').placeholder = ''; } if (note) note.textContent = why ? '🟡 ' + why : '🟢 Written by Claude from the request type and counts. Please read it. You are responsible for the answer.';
}
async function pvdNote() { try { await admApi('POST', '/admin/api/privacy/ticket', { id: PVD.t.id, note: 'Reply drafted: ' + el_('pvd-text').value.slice(0, 380) }); showToast('Saved on the request', 'success'); closeModal('adminModal'); renderPrivacyAdmin(el_('adminContent')); } catch (e) { showToast(aiMsg(e), 'error'); } }
// ---------- 5. Weekly content writer ----------
function cwLocal(prods) { return { captions: prods.slice(0, 3).map(p => ({ product: p.name, caption: `${p.name}${(p.colours || []).length ? ' in ' + p.colours.slice(0, 2).join(' & ') : ''}${p.fabric ? ', ' + p.fabric : ''}. Handpicked from Hyderabad. Message us on WhatsApp to order. #handloomsaree #${String(p.category || 'saree').replace(/\W/g, '').toLowerCase()} #anithapemmasani` })), story: null }; }
async function aiContent() {
  const occ = (el_('cw-occ') || {}).value || '', topic = (el_('cw-topic') || {}).value || '', lg = (el_('cw-lang') || {}).value || 'en';
  const prods = db.products.filter(p => p.stock > 0).slice(-10).reverse().map(p => ({ name: p.name, fabric: p.fabric, colours: p.colours, category: p.category, price: p.price })); if (!prods.length) { outBox('cw-out', '<p class="note">Add a few sarees first, then I can write about them.</p>'); return; }
  busy('cw-out', 'writing this week\'s content…'); let d = null, why = '';
  if (aiReady('contentweek')) { try { d = (await aiCall('contentweek', { occasion: occ, topic, lang: lg, products: prods })).data; } catch (e) { why = aiMsg(e); } } else why = aiConnected() ? 'The weekly content writer is switched off (switches above).' : 'Claude is not connected: here are built-in captions only. Add your Claude key in Settings to get a Journal story too.';
  if (!d || !Array.isArray(d.captions)) d = cwLocal(prods); db.settings.contentWeek = isoWeekKey(); saveDB(); CW = d;
  outBox('cw-out', `${why ? `<p class="note">🟡 ${esc(why)}</p>` : '<p class="note">🟢 Written by Claude from your products only. Read before you use anything.</p>'}<h4 class="dash-h4">3 Instagram captions</h4>${d.captions.slice(0, 3).map((c, i) => `<div class="ai-draft"><div class="note" style="margin:0 0 4px"><b>${esc(c.product)}</b></div><textarea rows="${Math.min(8, Math.max(3, Math.ceil(String(c.caption).length / 60)))}">${esc(c.caption)}</textarea><div class="pf-actions"><button type="button" class="btn-sm btn-info-sm" onclick="copyText(this.closest('.ai-draft').querySelector('textarea').value,'Caption copied')">📋 Copy</button></div></div>`).join('')}
    ${d.story ? `<h4 class="dash-h4">A Journal story</h4><div class="ai-draft"><input type="text" id="cw-st-title" value="${esc(d.story.title)}" style="width:100%;margin-bottom:6px"><input type="text" id="cw-st-ex" value="${esc(d.story.excerpt)}" style="width:100%;margin-bottom:6px"><textarea id="cw-st-body" rows="9">${esc(d.story.body)}</textarea><div class="pf-actions"><button type="button" class="btn-sm btn-primary-sm" onclick="cwSaveStory()">Save as a hidden Journal story</button><button type="button" class="btn-sm btn-info-sm" onclick="copyText(el_('cw-st-body').value,'Story copied')">📋 Copy</button></div><p class="note">It is saved <b>hidden</b>. Open <b>Pages → The Journal</b>, add a photo, and tick "Show on the website" when you are happy.</p></div>` : ''}`);
}
let CW = null;
function cwSaveStory() { ensurePages(); db.pages.journal.posts.unshift({ id: 'j' + Date.now().toString(36), date: ymd(new Date()), title: el_('cw-st-title').value.trim() || 'New story', excerpt: el_('cw-st-ex').value.trim(), body: el_('cw-st-body').value.trim(), image: '', alt: '', show: false }); saveDB(); renderPublicPages(); showToast('Saved as a hidden story in Pages → The Journal', 'success'); }
function contentHTML() { const done = db.settings.contentWeek === isoWeekKey(); return `<div class="ai-row"><label>Occasion<select id="cw-occ"><option value="">Nothing special</option>${FESTIVALS.map(f => `<option>${esc(f)}</option>`).join('')}</select></label><label style="flex:1;min-width:180px">Story topic (optional)<input id="cw-topic" placeholder="e.g. how to wash a Kanjeevaram"></label><label>Language<select id="cw-lang">${AG_LANGS()}</select></label></div><button class="btn-sm btn-primary-sm" onclick="aiContent()">✨ Draft this week's content</button> ${done ? '<span class="note">Already drafted this week.</span>' : ''}<div id="cw-out"></div><p class="note">Also in <b>Reviews</b>: "Draft replies for all waiting reviews" in one click.</p>`; }
async function revAiAll() {
  const boxes = [...document.querySelectorAll('input[id^="rr-"]')].filter(t => !t.value.trim()); if (!boxes.length) { showToast('No review is waiting for a reply draft', ''); return; }
  showToast(`✨ Drafting ${boxes.length} repl${boxes.length === 1 ? 'y' : 'ies'}…`, ''); for (const t of boxes) await revAiReply(t.id.slice(3)); showToast('✨ Drafts ready. Read each one, then press Save reply.', 'success');
}
// ---------- 2. Catalogue batch: many photos become many product drafts ----------
const CB = { cancel: false, running: false };
function cbOpen() {
  const cats = [...db.categories, ...db.accessoryCategories];
  openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0 0 4px;">✨ Make drafts from many photos</h3><p class="note" style="margin:0 0 12px">Choose up to 40 photos (one product per photo). For each I read the photo, pick the category, colours and fabric, set the SKU and write the description, tags and SEO. They land in <b>Saved Drafts</b>. You add the <b>price</b>, check, and post. Nothing goes on the website by itself.</p>
    <div class="ai-row" style="gap:12px;flex-wrap:wrap;align-items:flex-end"><label>If I cannot tell the category from a photo, use<select id="cb-cat">${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></label><label>Language<select id="cb-lang">${AG_LANGS()}</select></label></div>
    <input type="file" id="cb-files" accept="image/*" multiple style="margin:12px 0"><div class="pf-actions"><button type="button" class="btn-sm btn-primary-sm" id="cb-go" onclick="cbStart()">Start</button><button type="button" class="btn-sm btn-info-sm" id="cb-stop" onclick="CB.cancel=true" style="display:none">Stop</button></div>
    <div class="note" id="cb-claude" style="margin-top:8px">${aiReady('photo') ? '🟢 Claude will read each photo.' : '🟡 Claude is not connected: drafts use colours found in the photo and the built-in writer. Add your Claude key in Settings for better ones.'}</div><div id="cb-log" style="margin-top:10px;max-height:280px;overflow:auto"></div>`);
}
async function cbOne(file, i, o) {
  const url = await fileToDataUrl(file, 1000, 0.8), allowed = [...db.categories, ...db.accessoryCategories]; let info = {};
  if (aiReady('photo')) { try { info = (await aiCall('photo', { image: await aiShrink(url), categories: allowed, fabrics: fabricChoices() })).data || {}; } catch (e) { info = {}; } }
  const cat = allowed.includes(info.category) ? info.category : o.cat, acc = isAccessory({ category: cat }), cols = Array.isArray(info.colours) && info.colours.length ? info.colours.map(String).slice(0, 4) : await dominantColours(url), fabric = acc ? '' : (info.fabric || FABRIC_BY_CAT[cat] || '');
  let name = [cols[0], acc ? cat : (fabric || cat), acc ? '' : 'Saree'].filter(Boolean).join(' '), n = 1; const taken = x => db.products.some(p => p.name === x) || db.drafts.some(d => d.name === x); const base = name; while (taken(name)) name = `${base} ${++n}`;
  const lc = localCopy({ name, category: cat, colours: cols }, 0); let d = null;
  if (aiReady('describe')) { try { d = (await aiCall('describe', { name, category: cat, kind: acc ? 'accessory' : 'saree', fabric, colours: cols, occasions: occasionsOf({ category: cat, tags: [...(info.occasions || [])] }), lang: o.lang })).data || null; } catch (e) { d = null; } }
  const extra = [info.border, info.pattern, ...(Array.isArray(info.occasions) ? info.occasions : [])].filter(Boolean).map(String);
  const draft = { id: Date.now() + i, image: url, images: [url], sku: pfSkuFor(cat), name, category: cat, price: '', stock: 1, fabric, colours: cols, description: (d && d.description ? String(d.description).trim() : lc.description), tags: uniqCI([...(d && Array.isArray(d.tags) ? d.tags.map(String) : lc.tags), ...extra]).slice(0, 14), seoTitle: fitText((d && d.seoTitle) || lc.seoTitle, 70), metaDescription: fitText((d && d.metaDescription) || lc.metaDescription, 160), altText: fitText((d && d.altText) || lc.altText, 125), slug: uniqueSlug(name), lang: o.lang, date: draftDate(), detailsAt: new Date().toISOString(), batch: true };
  db.drafts.unshift(draft); return draft;
}
async function cbStart() {
  if (CB.running) return; const files = [...(el_('cb-files').files || [])].filter(f => /^image\//.test(f.type)).slice(0, 40); if (!files.length) { showToast('Choose some photos first', 'error'); return; }
  CB.running = true; CB.cancel = false; el_('cb-go').disabled = true; el_('cb-stop').style.display = ''; const log = el_('cb-log'), o = { cat: el_('cb-cat').value, lang: el_('cb-lang').value }; let done = 0, failed = 0; const made = [];
  log.innerHTML = files.map((f, i) => `<div class="va-row" id="cb-r${i}"><span class="va-i">…</span><div>${esc(f.name)} <span class="note" style="margin:0">waiting</span></div></div>`).join('');
  let next = 0; const worker = async () => { while (!CB.cancel) { const i = next++; if (i >= files.length) return; const row = el_('cb-r' + i); try { row.querySelector('.note').textContent = 'working…'; const d = await cbOne(files[i], i, o); made.push(d); done++; row.innerHTML = `<span class="va-i ok">✓</span><div><b>${esc(d.name)}</b> <span class="note" style="margin:0">${esc(d.sku)} · ${esc(d.category)}</span></div>`; if (done % 5 === 0) saveDB(); } catch (e) { failed++; row.innerHTML = `<span class="va-i bad">✕</span><div>${esc(files[i].name)} <span class="note" style="margin:0">could not be read</span></div>`; } } };
  await Promise.all([worker(), worker()]); saveDB(); CB.running = false; el_('cb-go').disabled = false; el_('cb-stop').style.display = 'none';
  if (el_('cb-log')) log.insertAdjacentHTML('afterbegin', `<div class="va-do ok" style="margin-bottom:8px"><h4>${done} draft${done === 1 ? '' : 's'} made${failed ? `, ${failed} photo${failed === 1 ? '' : 's'} skipped` : ''}${CB.cancel ? ' (stopped)' : ''}</h4><p class="note" style="margin:0">Each needs a <b>price</b> before it can be posted. <a onclick="closeModal('adminModal');switchAdminTab('drafts')" style="cursor:pointer;text-decoration:underline">Open Saved Drafts</a></p></div>`);
  if (currentAdminTab === 'drafts') renderAdminContent('drafts');
}
// ---------- 1. Ops watcher: today's note on the Ops pages ----------
async function opsWatchRun() { const b = el_('ow-run'); if (b) { b.disabled = true; b.textContent = 'Writing…'; } try { const r = await admApi('POST', '/admin/api/agents/ops-watch/run', {}); if (OPS.r) OPS.r.watch = r.last; opsDraw(el_('adminContent')); } catch (e) { showToast(aiMsg(e), 'error'); if (b) { b.disabled = false; b.textContent = '✨ Write it now'; } } }
function opsWatchHTML(w) {
  return `<div class="admin-card"><div class="ch" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h3 style="margin:0">🔭 Today's note</h3><span class="g-p ${w && w.via === 'claude' ? 'g-p3' : 'g-p2'}">${w ? (w.via === 'claude' ? 'written by Claude' : 'built-in note') : 'not written yet'}</span>${w ? `<span class="note" style="margin:0">${esc(w.at.slice(0, 16).replace('T', ' '))} UTC${w.emailed ? ' · emailed to you' : ''}</span>` : ''}<span style="flex:1"></span><button type="button" class="btn-sm btn-primary-sm" id="ow-run" onclick="opsWatchRun()">✨ Write it now</button></div>${w ? `<div style="white-space:pre-wrap;margin-top:8px">${esc(w.text)}</div>` : '<p class="note">Every morning at about 8:15 I read the health checks below and write a short note. You get an email when something needs fixing.</p>'}</div>`;
}

// ---- Invoice Management: find and sort by person, month, year or date ----
const INV = { q: '', cust: '', year: '', month: '', from: '', to: '', sort: 'date-desc', group: '' };
const INV_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function invFiltered() {
  const q = INV.q.trim().toLowerCase(), digits = q.replace(/\D/g, '');
  let l = db.invoices.filter(i => {
    const d = String(i.date || '');
    if (q && !(`${i.id} ${i.orderId} ${i.customer} ${i.email || ''} ${i.status || ''}`.toLowerCase().includes(q) || (digits.length >= 4 && String(i.phone || '').replace(/\D/g, '').includes(digits)))) return false;
    if (INV.cust && invKey(i) !== INV.cust) return false;
    if (INV.year && d.slice(0, 4) !== INV.year) return false;
    if (INV.month && d.slice(5, 7) !== INV.month) return false;
    if (INV.from && d < INV.from) return false;
    if (INV.to && d > INV.to) return false;
    return true;
  });
  const by = { 'date-desc': (a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)), 'date-asc': (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)), 'amt-desc': (a, b) => b.amount - a.amount, 'amt-asc': (a, b) => a.amount - b.amount, 'cust-asc': (a, b) => String(a.customer).localeCompare(String(b.customer)) || String(b.date).localeCompare(String(a.date)), 'cust-desc': (a, b) => String(b.customer).localeCompare(String(a.customer)) || String(b.date).localeCompare(String(a.date)), 'id-asc': (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }) };
  return l.sort(by[INV.sort] || by['date-desc']);
}
const invKey = i => (String(i.customer || '').trim().toLowerCase() + '|' + String(i.phone || '').replace(/\D/g, '').slice(-10));
function invRow(inv) { return `<tr><td style="font-family:monospace;font-weight:600;">${esc(inv.id)}</td><td style="font-family:monospace;font-size:12px;">${esc(inv.orderId)}</td><td><div style="font-weight:500;">${esc(inv.customer)}</div><div style="font-size:11px;color:#6b6862;">${esc(inv.email) || '—'}</div></td><td style="font-size:12px;color:#6b6862;">${esc(inv.date)}</td><td style="font-weight:600;">${formatCurrency(inv.amount)}</td><td><span class="status-pill status-paid">${esc(inv.status)}</span></td><td><div class="action-buttons"><button class="btn-sm btn-info-sm" onclick="viewInvoice('${esc(inv.id)}')">View</button><button class="btn-sm" style="background:white;color:var(--gold);border:1px solid var(--gold);" onclick="resendInvoice('${esc(inv.id)}')">Resend</button></div></td></tr>`; }
function invDraw() {
  const body = el_('inv-body'), sum = el_('inv-sum'); if (!body) return; const l = invFiltered(), total = l.reduce((a, i) => a + (+i.amount || 0), 0);
  const gk = { customer: i => i.customer || '—', month: i => String(i.date || '').slice(0, 7), year: i => String(i.date || '').slice(0, 4) }[INV.group];
  let html = '';
  if (!l.length) html = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b6862;">${db.invoices.length ? 'No invoice matches. Clear a filter or change the search.' : 'No invoices generated yet.'}</td></tr>`;
  else if (gk) { const groups = new Map(); l.forEach(i => { const k = gk(i); (groups.get(k) || groups.set(k, []).get(k)).push(i); }); const label = k => INV.group === 'month' && /^\d{4}-\d{2}$/.test(k) ? INV_MONTHS[+k.slice(5) - 1] + ' ' + k.slice(0, 4) : k; html = [...groups].map(([k, g]) => `<tr class="inv-grp"><td colspan="7" style="background:var(--cream);font-weight:600;padding:10px 12px;">${esc(label(k))} <span style="font-weight:400;color:#6b6862;">· ${g.length} invoice${g.length > 1 ? 's' : ''} · ${formatCurrency(g.reduce((a, i) => a + (+i.amount || 0), 0))}</span></td></tr>` + g.map(invRow).join('')).join(''); }
  else html = l.map(invRow).join('');
  body.innerHTML = html; sum.innerHTML = `<b>${l.length}</b> of ${db.invoices.length} invoice${db.invoices.length === 1 ? '' : 's'} · total <b>${formatCurrency(total)}</b>${l.length ? ` · average ${formatCurrency(total / l.length)}` : ''}`;
}
function invSet(k, v) { INV[k] = v; if (k === 'year' || k === 'month') { INV.from = INV.to = ''; const f = el_('inv-from'), t = el_('inv-to'); if (f) f.value = ''; if (t) t.value = ''; } if (k === 'from' || k === 'to') { INV.year = INV.month = ''; const y = el_('inv-year'), m = el_('inv-month'); if (y) y.value = ''; if (m) m.value = ''; } invDraw(); }
function invClear() { Object.assign(INV, { q: '', cust: '', year: '', month: '', from: '', to: '', sort: 'date-desc', group: '' }); renderInvoices(el_('adminContent')); }
function renderInvoices(content) {
  const custs = new Map(); db.invoices.forEach(i => { if (!custs.has(invKey(i))) custs.set(invKey(i), i.customer || '—'); });
  const years = [...new Set(db.invoices.map(i => String(i.date || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort().reverse();
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`;
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;"><h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0;">Invoice Management</h3><button class="btn-sm btn-primary-sm" onclick="openTemplateEditor()">Edit Invoice Template</button></div>
    <div class="admin-card inv-filters"><div class="ai-row" style="flex-wrap:wrap;gap:12px;align-items:flex-end;">
      <label style="flex:2;min-width:220px;">Search<input id="inv-q" type="search" placeholder="Name, phone, invoice or order number" value="${esc(INV.q)}" oninput="invSet('q',this.value)"></label>
      <label style="min-width:170px;">Customer<select id="inv-cust" onchange="invSet('cust',this.value)">${opt('', 'Everyone', INV.cust)}${[...custs].sort((a, b) => a[1].localeCompare(b[1])).map(([k, n]) => opt(k, n, INV.cust)).join('')}</select></label>
      <label style="min-width:110px;">Year<select id="inv-year" onchange="invSet('year',this.value)">${opt('', 'All years', INV.year)}${years.map(y => opt(y, y, INV.year)).join('')}</select></label>
      <label style="min-width:130px;">Month<select id="inv-month" onchange="invSet('month',this.value)">${opt('', 'All months', INV.month)}${INV_MONTHS.map((m, i) => opt(String(i + 1).padStart(2, '0'), m, INV.month)).join('')}</select></label></div>
      <div class="ai-row" style="flex-wrap:wrap;gap:12px;align-items:flex-end;margin-top:10px;">
      <label>From date<input id="inv-from" type="date" value="${esc(INV.from)}" onchange="invSet('from',this.value)"></label><label>To date<input id="inv-to" type="date" value="${esc(INV.to)}" onchange="invSet('to',this.value)"></label>
      <label style="min-width:190px;">Sort by<select id="inv-sort" onchange="invSet('sort',this.value)">${[['date-desc', 'Date: newest first'], ['date-asc', 'Date: oldest first'], ['amt-desc', 'Amount: high to low'], ['amt-asc', 'Amount: low to high'], ['cust-asc', 'Customer: A to Z'], ['cust-desc', 'Customer: Z to A'], ['id-asc', 'Invoice number']].map(([v, l]) => opt(v, l, INV.sort)).join('')}</select></label>
      <label style="min-width:170px;">Group by<select id="inv-group" onchange="invSet('group',this.value)">${[['', 'No grouping'], ['customer', 'Customer'], ['month', 'Month'], ['year', 'Year']].map(([v, l]) => opt(v, l, INV.group)).join('')}</select></label>
      <button type="button" class="btn-sm btn-info-sm" onclick="invClear()">Clear</button></div>
      <p id="inv-sum" class="note" style="margin:12px 0 0;"></p></div>
    <div class="admin-card" style="overflow-x:auto;"><table class="admin-table" style="min-width:1000px;"><thead><tr><th>Invoice ID</th><th>Order ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody id="inv-body"></tbody></table></div>`;
  invDraw();
}
function viewInvoice(invId) {
  const inv = db.invoices.find(x => x.id === invId); if (!inv) return;
  const o = db.orders.find(x => x.id === inv.orderId);
  const items = (o ? o.items : inv.items) || [];
  const pricing = (o ? o.pricing : inv.pricing);
  const s = db.settings, tc = s.templateCustom;
  // Prices are GST-inclusive: show the GST portion contained in what was paid, never add it on top.
  const gstIncluded = inv.amount * s.gstRate / (100 + s.gstRate);
  openModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0;">Invoice: ${esc(inv.id)}</h3>
    </div>
    <div id="invoicePrintArea" style="padding:30px;border:1px solid var(--border);border-radius:4px;color:${esc(tc.secondaryColor)};">
      ${tc.headerText ? `<p style="font-size:12px;color:#666;margin-bottom:15px;">${esc(tc.headerText)}</p>` : ''}
      <div style="display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid ${esc(tc.primaryColor)};">
        <div>${tc.showLogo ? `<img src="${LOGO_URI}" alt="${esc(s.businessName)}" style="height:70px;width:auto;display:block;margin-bottom:8px;"><div style="font-family:'Cormorant Garamond',serif;font-size:20px;margin-bottom:8px;">${esc(s.businessName)}</div>` : ''}<p style="font-size:12px;color:#666;margin-bottom:4px;">${esc(s.address)}</p><p style="font-size:12px;color:#666;"><strong>GSTIN:</strong> ${esc(s.gstNumber)}</p></div>
        <div style="text-align:right;"><h2 style="font-size:24px;font-weight:600;color:${esc(tc.primaryColor)};margin-bottom:10px;">INVOICE</h2><p style="font-size:12px;margin-bottom:4px;"><strong>Invoice #:</strong> ${esc(inv.id)}</p><p style="font-size:12px;"><strong>Date:</strong> ${esc(inv.date)}</p></div>
      </div>
      <p style="font-size:12px;margin-bottom:20px;"><strong>Billed to:</strong> ${esc(inv.customer)}</p>
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;margin-bottom:30px;"><thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:10px;font-size:11px;text-transform:uppercase;">Item</th><th style="text-align:center;padding:10px;font-size:11px;text-transform:uppercase;">Qty</th><th style="text-align:right;padding:10px;font-size:11px;text-transform:uppercase;">Price</th><th style="text-align:right;padding:10px;font-size:11px;text-transform:uppercase;">Total</th></tr></thead><tbody>${items.map(i => `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px;font-size:13px;">${esc(i.name)}</td><td style="padding:10px;font-size:13px;text-align:center;">${i.quantity}</td><td style="padding:10px;font-size:13px;text-align:right;">${formatCurrency(i.price)}</td><td style="padding:10px;font-size:13px;text-align:right;font-weight:600;">${formatCurrency(i.price * i.quantity)}</td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;justify-content:flex-end;"><div style="width:100%;max-width:300px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px;"><span style="color:#666;">Subtotal:</span><span>${formatCurrency(pricing.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px;"><span style="color:#666;">Shipping:</span><span>${formatCurrency(pricing.shipping)}</span></div>
        ${pricing.discount ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px;"><span style="color:#666;">Discount${discountNote(o || inv)}:</span><span>- ${formatCurrency(pricing.discount)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:12px 8px;background:${esc(tc.primaryColor)}20;font-size:16px;font-weight:600;margin-top:4px;"><span>Total:</span><span style="color:${esc(tc.primaryColor)};">${formatCurrency(inv.amount)}</span></div>
        ${tc.showGstBreakdown ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#666;"><span>Includes GST (${s.gstRate}%):</span><span>₹ ${gstIncluded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
      </div></div>
      ${tc.showBankDetails ? `<div style="margin-top:25px;font-size:12px;color:#555;"><strong>Bank:</strong> ${esc(s.bankName)} · A/C ${esc(s.accountNumber)} · IFSC ${esc(s.ifscCode)}</div>` : ''}
      ${tc.termsText ? `<p style="margin-top:15px;font-size:11px;color:#6b6862;">${esc(tc.termsText)}</p>` : ''}
      ${tc.signatureLine ? `<div style="margin-top:40px;text-align:right;"><div style="display:inline-block;border-top:1px solid #999;padding-top:6px;font-size:12px;min-width:180px;text-align:center;">${esc(tc.signatureName)}<br><span style="color:#6b6862;font-size:11px;">${esc(tc.signatureTitle)}</span></div></div>` : ''}
      ${tc.footerText ? `<p style="margin-top:25px;font-size:11px;color:#6b6862;text-align:center;">${esc(tc.footerText)}</p>` : ''}
    </div>
  `);
}

function resendInvoice(invId) {
  const inv = db.invoices.find(x => x.id === invId); if (!inv) return;
  addLog('invoice_resent', invId, '-', 0, 0, 0, `Invoice ${invId} resend requested for ${inv.customer}`); saveDB();
  showToast(`Invoice ${invId} logged as resent (demo: no email/SMS is actually sent)`);
}

function openTemplateEditor() {
  const tc = db.settings.templateCustom;
  openModal(`
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:20px;">Edit Invoice Template</h3>
    <div class="form-group"><label>Header Message</label><input type="text" id="tc-header" value="${esc(tc.headerText)}"></div>
    <div class="form-group"><label>Footer Text</label><input type="text" id="tc-footer" value="${esc(tc.footerText)}"></div>
    <div class="form-group"><label>Terms</label><input type="text" id="tc-terms" value="${esc(tc.termsText)}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
      <div><label style="font-size:11px;color:#6b6862;">Primary Color</label><input type="color" id="tc-primary" value="${esc(tc.primaryColor)}" style="width:100%;height:40px;border:none;cursor:pointer;"></div>
      <div><label style="font-size:11px;color:#6b6862;">Text Color</label><input type="color" id="tc-secondary" value="${esc(tc.secondaryColor)}" style="width:100%;height:40px;border:none;cursor:pointer;"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group"><label>Signature Name</label><input type="text" id="tc-signame" value="${esc(tc.signatureName)}"></div>
      <div class="form-group"><label>Signature Title</label><input type="text" id="tc-sigtitle" value="${esc(tc.signatureTitle)}"></div>
    </div>
    <div style="margin-bottom:15px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;"><input type="checkbox" id="tc-logo" ${tc.showLogo ? 'checked' : ''}> Show Business Name</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;"><input type="checkbox" id="tc-bank" ${tc.showBankDetails ? 'checked' : ''}> Show Bank Details</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;"><input type="checkbox" id="tc-gst" ${tc.showGstBreakdown ? 'checked' : ''}> Show GST Breakdown</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;"><input type="checkbox" id="tc-sig" ${tc.signatureLine ? 'checked' : ''}> Show Signature Line</label>
    </div>
    <button class="btn-full" onclick="saveTemplate()">Save Template</button>
  `);
}
function saveTemplate() {
  const g = id => document.getElementById(id);
  db.settings.templateCustom = { headerText: g('tc-header').value, footerText: g('tc-footer').value, termsText: g('tc-terms').value, primaryColor: g('tc-primary').value, secondaryColor: g('tc-secondary').value, showLogo: g('tc-logo').checked, showBankDetails: g('tc-bank').checked, showGstBreakdown: g('tc-gst').checked, signatureLine: g('tc-sig').checked, signatureName: g('tc-signame').value, signatureTitle: g('tc-sigtitle').value };
  addLog('template_updated', 'Invoice Template', '-', 0, 0, 0, 'Template customized'); saveDB(); closeModal('adminModal'); showToast('Template saved!', 'success');
}

function openCustomerForm() {
  openModal(`
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:20px;">Add New Customer</h3>
    <form onsubmit="handleAddCustomer(event)">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
        <div class="form-group"><label>Full Name *</label><input type="text" id="cu-name" required></div>
        <div class="form-group"><label>Phone *</label><input type="tel" id="cu-phone" required></div>
      </div>
      <div class="form-group"><label>Email *</label><input type="email" id="cu-email" required></div>
      <div class="form-group"><label>Address</label><textarea id="cu-addr" rows="2"></textarea></div>
      <div class="form-group"><label>Status</label><select id="cu-status"><option>Regular</option><option>VIP</option></select></div>
      <button type="submit" class="btn-full">Add Customer</button>
    </form>
  `);
}
function handleAddCustomer(e) {
  e.preventDefault();
  const name = document.getElementById('cu-name').value.trim(), phone = document.getElementById('cu-phone').value.trim();
  if (db.users.some(u => u.phone === phone)) { alert('Phone number already exists!'); return; }
  const u = { id: 'u' + generateId(), name, phone, email: document.getElementById('cu-email').value.trim(), address: document.getElementById('cu-addr').value.trim(), status: document.getElementById('cu-status').value, joined: ymd(new Date()) };
  db.users.push(u); addLog('user_created', u.name, '-', 0, 0, 0, `Customer '${u.name}' added`); saveDB(); closeModal('adminModal'); renderAdminContent('customers'); showToast('Customer added!', 'success');
}

function viewCustomerDetails(userId) {
  const u = db.users.find(x => x.id === userId); if (!u) return;
  const userOrders = db.orders.filter(o => o.userId === userId);
  const st = userStats(u);
  openModal(`
    <div style="display:flex;gap:15px;align-items:center;margin-bottom:20px;">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--gold-light);display:flex;align-items:center;justify-content:center;color:var(--gold);font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;">${esc(initials(u.name))}</div>
      <div><h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:5px;">${esc(u.name)}</h3><p style="font-size:13px;color:#6b6862;">${esc(u.email) || '—'}</p>${u.status === 'VIP' ? '<span class="status-pill status-vip" style="margin-top:5px;display:inline-block;">VIP Customer</span>' : ''}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:15px;margin-bottom:20px;">
      <div style="background:var(--cream);padding:15px;border-radius:4px;text-align:center;"><div style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:5px;">Orders</div><div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;">${st.orders}</div></div>
      <div style="background:var(--cream);padding:15px;border-radius:4px;text-align:center;"><div style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:5px;">Spent</div><div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;">${formatCurrency(st.spent)}</div></div>
      <div style="background:var(--cream);padding:15px;border-radius:4px;text-align:center;"><div style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:5px;">Joined</div><div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;">${esc(u.joined)}</div></div>
      <div style="background:var(--cream);padding:15px;border-radius:4px;text-align:center;"><div style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:5px;">Avg Order</div><div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;">${st.orders ? formatCurrency(Math.round(st.spent / st.orders)) : '₹ 0'}</div></div>
    </div>
    <h4 style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:10px;">Consent history</h4>
    <div style="max-height:160px;overflow-y:auto;margin-bottom:20px;">${db.consentLog.filter(c => c.userId === u.id).slice().reverse().map(c => `<div class="consent-row"><span>${c.granted ? '✓' : '✗'} ${esc(consentLabel[c.type] || c.type)}</span><span style="color:#6b6862;">${c.granted ? 'granted' : 'withdrawn'} · ${esc(c.source)} · v${esc(c.version)} · ${esc(new Date(c.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}</span></div>`).join('') || '<p style="font-size:12px;color:#6b6862;">No consent records.</p>'}</div>
    <h4 style="font-size:11px;text-transform:uppercase;color:#6b6862;margin-bottom:10px;">Order History</h4>
    <div style="max-height:300px;overflow-y:auto;">
      ${userOrders.length ? userOrders.map(o => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--cream);border-radius:4px;margin-bottom:8px;"><div><div style="font-size:13px;font-family:monospace;font-weight:600;">${esc(o.id)}</div><div style="font-size:11px;color:#6b6862;">${esc(o.date)}</div></div><div style="text-align:right;"><div style="font-size:14px;font-weight:600;">${formatCurrency(o.total)}</div><span class="status-pill ${getStatusClass(o.status)}" style="font-size:9px;">${esc(o.status)}</span></div></div>`).join('') : '<p style="text-align:center;color:#6b6862;padding:20px;">No orders yet.</p>'}
    </div>
  `);
}

function addCoupon() {
  const code = document.getElementById('newCouponCode').value.trim().toUpperCase();
  const disc = parseInt(document.getElementById('newCouponDisc').value, 10);
  const type = document.getElementById('newCouponType').value;
  if (!code || !disc || disc <= 0) { alert('Please fill code and a positive discount'); return; }
  if (type === 'percent' && disc > 100) { alert('A percent discount cannot exceed 100'); return; }
  if (db.coupons.find(c => c.code === code)) { alert('Code already exists'); return; }
  const g = id => document.getElementById(id), num = id => Math.max(0, parseInt(g(id).value, 10) || 0), exp = g('newCouponExp').value;
  db.coupons.push({ code, discount: disc, type, active: true, description: `${type === 'percent' ? disc + '%' : '₹' + disc} discount`, minOrder: num('newCouponMin'), maxUses: num('newCouponMax'), expiresAt: exp || '', channel: g('newCouponChan').value, firstOrderOnly: g('newCouponFirst').checked, oncePerCustomer: g('newCouponOnce').checked, announce: g('newCouponAnn').checked });
  saveDB(); renderAdminContent('coupons'); showToast('Coupon added!', 'success');
}
function couponRules(c) { const r = []; if (c.minOrder) r.push('min ₹' + money(c.minOrder)); if (c.expiresAt) r.push('until ' + c.expiresAt); if (c.firstOrderOnly) r.push('first order'); if (c.oncePerCustomer) r.push('once each'); if (c.channel === 'whatsapp') r.push('WhatsApp only'); if (c.channel === 'store') r.push('website only'); if (c.announce) r.push('assistant may mention'); return esc(r.join(' · ') || 'no limits'); }
function toggleCoupon(idx) { db.coupons[idx].active = !db.coupons[idx].active; saveDB(); renderAdminContent('coupons'); }
function deleteCoupon(idx) { if (confirm('Delete?')) { db.coupons.splice(idx, 1); saveDB(); renderAdminContent('coupons'); } }

function clearLogs() { if (!confirm('Clear all audit logs?')) return; db.logs = []; saveDB(); renderAdminContent('logs'); }

function saveSettings() {
  const v = id => document.getElementById(id).value;
  const rate = parseFloat(v('s-gstrate'));
  if (isNaN(rate) || rate < 0) { alert('GST rate must be a non-negative number'); return; }
  if (document.getElementById('s-pin') && !v('s-pin').trim()) { alert('Admin PIN cannot be empty'); return; }
  if (v('s-otp').trim() && !/^https:\/\//i.test(v('s-otp').trim())) { alert('The WhatsApp login service URL must start with https://'); return; }
  if (v('s-site').trim() && !/^https?:\/\/[^\s/]+/i.test(v('s-site').trim())) { alert('Website address must start with https://'); return; }
  Object.assign(db.settings, { businessName: v('s-name'), gstNumber: v('s-gst'), address: v('s-addr'), phone: v('s-phone'), email: v('s-email'), bankName: v('s-bank'), accountNumber: v('s-acc'), ifscCode: v('s-ifsc'), invoicePrefix: v('s-prefix'), gstRate: rate, selectedTemplate: v('s-template'), ...(document.getElementById('s-pin') ? { adminPin: v('s-pin').trim() } : {}), siteUrl: v('s-site').trim().replace(/\/$/, ''), metaDescription: v('s-metadesc').trim(), aiEndpoint: v('s-ai').trim(), otpEndpoint: v('s-otp').trim().replace(/\/$/, ''), dispatchTime: v('s-dispatch').trim() || '3–7 business days', returnDays: Math.max(0, parseInt(v('s-returndays'), 10) || 0), grievanceOfficer: v('s-grievance').trim() });
  addLog('settings_updated', 'Business Settings', '-', 0, 0, 0, 'Settings updated'); SEO_DEFAULT.desc = db.settings.metaDescription || SEO_DEFAULT.desc; seoReset(); seoRefreshHome(); if (saveDB()) showToast('Settings saved!', 'success');
}

