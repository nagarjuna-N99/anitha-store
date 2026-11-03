// ================= AI HELPERS for the owner (30 Oct 2026) =================
// Every helper only DRAFTS: nothing is sent to customers or saved without the owner pressing the button.
// Connected = the assistant server address + admin token are set (WhatsApp Assistant tab); otherwise built-in drafts are used where they exist.
const AI_FEATURES = [['describe', 'Product descriptions, tags & SEO'], ['photo', 'Read colours & fabric from a photo'], ['reply', 'WhatsApp reply suggestions (Inbox)'], ['write', 'Festival, offer & caption writer'], ['hero', 'Home page words (small heading, title, button)'], ['review', 'Review replies'], ['ask', 'Ask your shop'], ['summary', 'Weekly summary'], ['pricing', 'Pricing & stock ideas'], ['cleanup', 'Data clean-up'], ['translate', 'Translation (Telugu / Hindi / English)'], ['captionpack', 'Caption & hashtag pack (English + Telugu)'], ['followup', 'Follow-up message drafts'], ['orderdraft', 'Order message drafts'], ['privacydraft', 'Privacy request reply drafts'], ['contentweek', 'Weekly content writer']];
const AI_LANGS = [['en', 'English'], ['te', 'తెలుగు Telugu'], ['hi', 'हिन्दी Hindi']];
const aiCfg = () => { const c = { master: true, ...(db.settings.ai || {}) }; AI_FEATURES.forEach(([k]) => { if (c[k] === undefined) c[k] = true; }); return c; };
const aiOn = k => { const c = aiCfg(); return !!c.master && !!c[k]; };
const aiConnected = () => !!waServer() && !!waTok() && (BUILD !== 'admin' || ADM.claude !== false);
const aiReady = k => aiOn(k) && aiConnected();
function aiToggle(k, on) { db.settings.ai = { ...aiCfg(), [k]: !!on }; saveDB(); renderAiHelper(el_('adminContent')); }
async function aiCall(task, input) {
  if (!aiOn(task)) throw new Error('This AI helper is switched off (AI Helper tab → switches).');
  if (!aiConnected()) throw new Error(BUILD === 'admin' ? 'Claude is not connected yet. Add your Claude key in Settings → Security & backup → Claude AI key.' : 'Claude is not connected yet. Open the WhatsApp Assistant tab, enter the assistant address and admin token.');
  return waCall('/api/ai', { method: 'POST', body: JSON.stringify({ task, input }) });
}
const aiMsg = e => (e && e.message) || 'Something went wrong';
const copyText = async (t, label) => { try { await navigator.clipboard.writeText(t); } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (x) {} a.remove(); } showToast(`📋 ${label || 'Copied'}`, 'success'); };

// ---- privacy-safe numbers for "ask", "summary" and "pricing" (no names, phones or addresses) ----
function aiShopData(days) {
  const today = ymd(new Date()), from = addDays(today, -(days - 1)), pFrom = addDays(from, -days), pTo = addDays(from, -1);
  const cur = dashStats(from, today), prev = dashStats(pFrom, pTo), pct = (a, b) => b ? Math.round((a - b) / b * 100) : null;
  const byCat = {}, byProd = {}; cur.os.forEach(o => (o.items || []).forEach(i => { const c = i.category || 'Other'; byCat[c] = (byCat[c] || 0) + i.price * i.quantity; (byProd[i.name] = byProd[i.name] || { name: i.name, sold: 0, revenue: 0 }); byProd[i.name].sold += i.quantity; byProd[i.name].revenue += i.price * i.quantity; }));
  const fabricOf = n => (db.products.find(p => p.name === n) || {}).fabric || '', byFab = {}; Object.values(byProd).forEach(p => { const f = fabricOf(p.name) || 'Unknown'; byFab[f] = (byFab[f] || 0) + p.revenue; });
  const all = db.orders.filter(o => o.status !== 'cancelled'), seen = {}; all.forEach(o => { const k = o.userId || o.phone; seen[k] = (seen[k] || 0) + 1; });
  const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push([monthKey(d), 0]); } all.forEach(o => { const m = months.find(x => x[0] === o.date.slice(0, 7)); if (m) m[1] += o.total; });
  const st = {}; db.orders.forEach(o => { st[o.status] = (st[o.status] || 0) + 1; });
  const soldIds = new Set(all.flatMap(o => (o.items || []).map(i => i.productId)));
  return { periodDays: days, from, to: today, revenue: cur.rev, orders: cur.orders, pieces: cur.units, averageOrder: cur.aov, discountsGiven: cur.discount, giftOrders: cur.gifts,
    changeVsPreviousPeriodPercent: { revenue: pct(cur.rev, prev.rev), orders: pct(cur.orders, prev.orders), pieces: pct(cur.units, prev.units) }, previousPeriod: { revenue: prev.rev, orders: prev.orders },
    revenueByCategory: byCat, revenueByFabric: byFab, bestSellers: Object.values(byProd).sort((a, b) => b.revenue - a.revenue).slice(0, 6), ordersByStatusAllTime: st,
    customers: { total: db.users.length, orderedInPeriod: cur.customers, newInPeriod: cur.newCust, repeatBuyersEver: Object.values(seen).filter(n => n > 1).length }, monthlyRevenueLast6: Object.fromEntries(months),
    stock: { products: db.products.length, piecesInStock: db.products.reduce((s, p) => s + Math.max(0, p.stock), 0), soldOut: db.products.filter(p => p.stock <= 0).map(p => p.name).slice(0, 15), almostSoldOut: db.products.filter(p => p.stock > 0 && p.stock <= (p.threshold || 2)).map(p => p.name).slice(0, 15), neverSold: db.products.filter(p => !soldIds.has(p.id) && p.stock > 0).map(p => p.name).slice(0, 15) },
    pendingOrders: { toConfirm: db.orders.filter(o => o.status === 'placed').length, toPack: db.orders.filter(o => o.status === 'confirmed').length, toShip: db.orders.filter(o => o.status === 'packed').length } };
}

// ---- 1, 2, 10: product form ----
async function pfAiDescribe(quiet) {
  if (!PF.name.trim()) { showToast('Enter the product name first', 'error'); return false; }
  const st = gid_('pf-ai-status'); if (st) st.textContent = '✨ Claude is writing…';
  try {
    const r = await aiCall('describe', { name: PF.name.trim(), category: PF.category, kind: isAccessory({ category: PF.category }) ? 'accessory' : 'saree', fabric: PF.fabric, colours: PF.colours, occasions: occasionsOf({ category: PF.category, tags: PF.tags }), lang: PF.lang || 'en' }), d = r.data || {};
    if (d.description) { PF.description = String(d.description).trim(); gid_('p-desc').value = PF.description; }
    if (Array.isArray(d.tags)) { PF.tags = uniqCI([...PF.tags, ...d.tags.map(String)]).slice(0, 20); pfRenderTags(); }
    if (d.seoTitle) { PF.seoTitle = fitText(String(d.seoTitle), 70); gid_('pf-seo-title').value = PF.seoTitle; }
    if (d.metaDescription) { PF.metaDescription = fitText(String(d.metaDescription), 160); gid_('pf-meta').value = PF.metaDescription; }
    if (d.altText) { PF.altText = fitText(String(d.altText), 125); gid_('pf-alt').value = PF.altText; }
    if (!PF.slugTouched) { PF.slug = slugify(PF.name); gid_('pf-slug').value = PF.slug; }
    pfRenderMeta(); PF.source = 'claude'; if (st) st.textContent = '✨ written by Claude — please read and edit before publishing'; if (!quiet) showToast('✨ Claude wrote a draft. Review it.', 'success'); return true;
  } catch (e) { if (st) st.textContent = ''; if (!quiet) showToast(aiMsg(e), 'error'); return false; }
}
function aiShrink(dataUrl, max = 768) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); }; im.onerror = () => rej(new Error('This photo could not be read')); im.src = dataUrl; }); }
async function pfAiPhoto(quiet) {
  const src = PF.images[0]; if (!src) { showToast('Add a photo first', 'error'); return false; }
  const st = gid_('pf-ai-status'); if (st) st.textContent = '📷 Claude is looking at the photo…';
  try {
    const img = await aiShrink(src), r = await aiCall('photo', { image: img, categories: [...db.categories, ...db.accessoryCategories], fabrics: fabricChoices() }), d = r.data || {}, done = [];
    if (Array.isArray(d.colours) && d.colours.length) { PF.colours = uniqCI([...(PF.colours || []), ...d.colours.map(String)]).slice(0, 6); pfRenderColours(); done.push('colours'); }
    if (d.fabric && !PF.fabric) { PF.fabric = String(d.fabric); const f = gid_('pf-fabric'); if (f) f.value = PF.fabric; PF.fabricTouched = true; done.push('fabric'); }
    if (d.category && [...db.categories, ...db.accessoryCategories].includes(d.category) && !PF.id && PF.category !== d.category) { PF.category = d.category; const c = gid_('p-cat'); if (c) c.value = d.category; done.push('category'); }
    const extra = [d.border, d.pattern, ...(Array.isArray(d.occasions) ? d.occasions : [])].filter(Boolean).map(String); if (extra.length) { PF.tags = uniqCI([...PF.tags, ...extra]).slice(0, 20); pfRenderTags(); done.push('tags'); }
    if (st) st.textContent = done.length ? `📷 Claude suggests: ${done.join(', ')} — check them` : '📷 Claude could not tell much from this photo'; if (!quiet) showToast(done.length ? '📷 Suggestions added. Check them.' : 'Nothing clear in the photo', done.length ? 'success' : ''); return done.length > 0;
  } catch (e) { if (st) st.textContent = ''; if (!quiet) showToast(aiMsg(e), 'error'); return false; }
}
async function pfAiTranslate() {
  const to = gid_('pf-lang') ? gid_('pf-lang').value : 'te'; if (!PF.description.trim()) { showToast('Write or generate the description first', 'error'); return; }
  const st = gid_('pf-ai-status'); if (st) st.textContent = '🌐 translating…';
  try { const r = await aiCall('translate', { text: PF.description, to }); PF.description = r.text.trim(); gid_('p-desc').value = PF.description; PF.lang = to; if (st) st.textContent = '🌐 translated — please read it once'; } catch (e) { if (st) st.textContent = ''; showToast(aiMsg(e), 'error'); }
}

// ---- 5: review replies ----
function localReviewReply(r) { const n = (r.name || '').split(' ')[0]; return r.rating >= 4 ? `Thank you so much${n ? ', ' + n : ''}! We are delighted you love your saree. Your kind words mean a lot to our small team. 💛` : `Thank you for telling us${n ? ', ' + n : ''}. We are sorry this was not the experience you hoped for. Please message us on WhatsApp so we can look into it personally.`; }
async function revAiReply(id) {
  const r = db.reviews.find(x => x.id === id), t = document.getElementById('rr-' + id); if (!r || !t) return; t.disabled = true; const old = t.value; t.value = '✨ drafting…';
  try {
    const p = db.products.find(x => x.id === r.productId) || {};
    t.value = aiReady('review') ? (await aiCall('review', { rating: r.rating, text: r.text, product: p.name, firstName: (r.name || '').split(' ')[0], lang: 'en' })).text.trim().slice(0, 600) : localReviewReply(r);
    showToast(aiReady('review') ? '✨ Draft ready: edit, then Save reply' : '✨ Built-in draft (connect Claude for a personal one). Edit, then Save reply', 'success');
  } catch (e) { t.value = old; showToast(aiMsg(e), 'error'); }
  t.disabled = false; t.focus();
}

// ---- the AI Helper tab ----
const FESTIVALS = ['Ugadi', 'Sankranti', 'Holi', 'Akshaya Tritiya', 'Raksha Bandhan', 'Vinayaka Chavithi', 'Bathukamma', 'Dasara', 'Diwali', 'Karthika Pournami', 'Wedding season', 'New arrivals', 'Thank you to customers', 'End-of-season offer'];
const AIH = { writer: null, ask: null, summary: null, pricing: null, clean: null };
function renderAiHelper(content) {
  if (!content) return; const c = aiCfg(), conn = aiConnected(), open = AIH.open || {};
  const sec = (k, icon, title, sub, body) => `<details class="ai-sec" data-k="${k}" ${open[k] ? 'open' : ''} ontoggle="AIH.open=Object.assign(AIH.open||{},{${k}:this.open})"><summary><span class="ai-ic">${icon}</span><span><b>${title}</b><small>${sub}</small></span>${aiOn(k === 'writer' ? 'write' : k === 'clean' ? 'cleanup' : k) ? '' : '<em class="ai-off">off</em>'}</summary><div class="ai-body">${body}</div></details>`;
  const langSel = id => `<select id="${id}">${AI_LANGS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  content.innerHTML = `
    <div class="admin-card ai-status ${conn ? 'on' : ''}"><div><h3 style="margin:0 0 4px;">✨ AI Helper</h3><p class="note" style="margin:0;">${conn ? '🟢 Claude is connected. Helpers write drafts for you to review. Nothing is sent to customers or saved by itself.' : '🟡 Claude is not connected. Tools that can work without it use built-in drafts. ' + (BUILD === 'admin' ? 'To connect: Settings tab → Security &amp; backup → <b>Claude AI key</b>.' : 'To connect: WhatsApp Assistant tab → assistant address + admin token.')}</p></div>
      <details class="ai-switches"><summary>Switches &amp; privacy</summary>
        <label class="chk-line"><input type="checkbox" ${c.master ? 'checked' : ''} onchange="aiToggle('master',this.checked)"> <b>All AI helpers</b> (master switch)</label>
        ${AI_FEATURES.map(([k, l]) => `<label class="chk-line"><input type="checkbox" ${c[k] ? 'checked' : ''} ${c.master ? '' : 'disabled'} onchange="aiToggle('${k}',this.checked)"> ${l}</label>`).join('')}
        <p class="note">What leaves your store when AI is used: product facts and photos you press the button on; review text (public); the chat you ask a reply for (phone number is never sent); and <b>summarised numbers without any customer names, phones or addresses</b> for Ask / Summary / Pricing. Data clean-up sends customer names and addresses only after you confirm.</p></details></div>
    ${sec('writer', '📣', 'Festival, offer &amp; caption writer', 'Three drafts to choose from, in English, Telugu or Hindi', `
      <div class="ai-row"><label>Write a<select id="aw-kind"><option value="whatsapp">WhatsApp message (to customers who agreed to offers)</option><option value="caption">Instagram caption</option><option value="status">WhatsApp status text</option><option value="festival">Festival greeting</option><option value="offer">Offer announcement</option></select></label>
        <label>Occasion<input id="aw-occ" list="aw-occs" placeholder="e.g. Diwali"><datalist id="aw-occs">${FESTIVALS.map(f => `<option value="${esc(f)}">`).join('')}</datalist></label>
        <label>Language${langSel('aw-lang')}</label><label>Tone<select id="aw-tone"><option>warm</option><option>festive</option><option>elegant</option><option>short and simple</option></select></label></div>
      <div class="ai-row"><label>Feature sarees (optional, up to 3)<select id="aw-prods" multiple size="4">${db.products.filter(p => p.stock > 0).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
        <label>Offer code (optional)<select id="aw-code"><option value="">No offer</option>${db.coupons.filter(x => x.active).map(x => `<option value="${esc(x.code)}">${esc(x.code)} · ${esc(x.description || '')}</option>`).join('')}</select></label></div>
      <button class="btn-sm btn-primary-sm" id="aw-go" onclick="aiWrite()">✨ Write 3 drafts</button><div id="aw-out" class="ai-out"></div>`)}
    ${sec('ask', '💬', 'Ask your shop', 'Plain questions about your own numbers', `
      <div class="ai-chips">${['Which fabric sold best in the last 90 days?', 'Who are my repeat customers (how many)?', 'Which sarees have never sold?', 'How much discount did I give this month?', 'How is this month compared with last month?'].map(q => `<button type="button" onclick="aiAsk(this.textContent)">${esc(q)}</button>`).join('')}</div>
      <div class="ai-row"><label style="flex:1;">Your question<input id="ak-q" placeholder="Ask anything about sales, stock or customers" onkeydown="if(event.key==='Enter')aiAsk()"></label><label>Period<select id="ak-days"><option value="30">30 days</option><option value="90" selected>90 days</option><option value="365">12 months</option></select></label></div>
      <button class="btn-sm btn-primary-sm" onclick="aiAsk()">Ask</button><div id="ak-out" class="ai-out"></div>`)}
    ${sec('summary', '🗓️', 'Weekly summary', 'What sold, what changed, what needs you', `<div class="ai-row"><label>Language${langSel('sm-lang')}</label><label>Period<select id="sm-days"><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label></div><button class="btn-sm btn-primary-sm" onclick="aiSummary()">Write my summary</button><div id="sm-out" class="ai-out"></div>`)}
    ${sec('pricing', '🏷️', 'Pricing &amp; stock ideas', 'Which pieces to feature, bundle, restock or look at again. Ideas only, you decide', `<button class="btn-sm btn-primary-sm" onclick="aiPricing()">Look at my catalogue</button> ${aiReady('pricing') ? '<span class="note">Claude will refine the ideas.</span>' : '<span class="note">Built-in rules (connect Claude for sharper advice).</span>'}<div id="pr-out" class="ai-out"></div>`)}
    ${sec('clean', '🧹', 'Data clean-up', 'Duplicate customers or products, wrong city/state for a PIN, untidy capitals', `<button class="btn-sm btn-primary-sm" onclick="aiClean()">Scan my data</button> <button class="btn-sm btn-info-sm" onclick="aiCleanAi()" ${aiOn('cleanup') ? '' : 'disabled'}>✨ Ask Claude to check spelling</button><div id="cl-out" class="ai-out"></div>`)}
    ${sec('contentweek', '📝', 'Weekly content', 'Three Instagram captions and a Journal story from your products. Drafts only', contentHTML())}
    ${sec('followup', '💌', 'Follow-ups', 'Returning customers to say hello to, with a drafted message you send yourself', fuHTML())}
    ${sec('translate', '🌐', 'Translation', 'Telugu, Hindi or English. Prices, names and SKUs stay exactly as written', `<div class="ai-row"><label style="flex:1;">Text<textarea id="tr-text" rows="4" placeholder="Paste a description, offer or message"></textarea></label></div><div class="ai-row"><label>Translate to${langSel('tr-to')}</label></div><button class="btn-sm btn-primary-sm" onclick="aiTranslate()">Translate</button><div id="tr-out" class="ai-out"></div>`)}
    <p class="note" style="margin-top:16px;">Also built in: <b>Products</b> form (✨ Write with Claude, 📷 Read photo, 🌐 Translate), <b>Reviews</b> (✨ Draft reply) and the assistant <b>Inbox</b> (✨ Suggest a reply).</p>`;
}
const outBox = (id, html) => { const e = el_(id); if (e) e.innerHTML = html; };
const busy = (id, msg) => outBox(id, `<div class="ai-busy">✨ ${msg}</div>`);
const draftCard = (t, extra = '') => `<div class="ai-draft"><textarea rows="${Math.min(8, Math.max(3, Math.ceil(t.length / 60)))}">${esc(t)}</textarea><div class="ai-act"><button type="button" class="btn-sm btn-info-sm" onclick="copyText(this.closest('.ai-draft').querySelector('textarea').value,'Copied')">📋 Copy</button>${extra}</div></div>`;
// 4: writer
function localWrite(i) {
  const o = i.occasion || 'this season', n = (i.products || []).map(p => p.name).slice(0, 3), s = n.length ? ` Do see ${n.join(', ')}.` : '', off = i.offer ? ` Use code ${i.offer.code}.` : '', stop = i.kind === 'whatsapp' ? '\nReply STOP to opt out.' : '', tag = i.kind === 'caption' ? '\n#handloomsaree #silksaree #hyderabad #sareelove #anithapemmasani' : '';
  return [`Warm wishes for ${o} from ${BRAND()}! Our handpicked handloom sarees are ready for you.${s}${off}${stop}${tag}`, `${o}: time to drape something timeless. New pieces have just arrived at ${BRAND()}.${s}${off}${stop}${tag}`, `Celebrate ${o} in pure handloom. Message us for a live video of any saree.${s}${off}${stop}${tag}`];
}
async function aiWrite() {
  const kind = el_('aw-kind').value, occasion = el_('aw-occ').value.trim(), lang = el_('aw-lang').value, tone = el_('aw-tone').value, ids = [...el_('aw-prods').selectedOptions].map(o => o.value).slice(0, 3), code = el_('aw-code').value, cp = db.coupons.find(x => x.code === code);
  const input = { kind, occasion, lang, tone, products: ids.map(id => db.products.find(p => p.id === id)).filter(Boolean).map(p => ({ name: p.name, fabric: p.fabric, price: p.price })), offer: cp ? { code: cp.code, description: cp.description } : null, website: siteBase() || '' };
  busy('aw-out', 'writing three drafts…');
  try { const v = aiReady('write') ? (await aiCall('write', input)).data.variants : localWrite(input); outBox('aw-out', `${aiReady('write') ? '' : '<p class="note">Built-in drafts (connect Claude for richer ones, and for Telugu or Hindi).</p>'}${(v || []).slice(0, 3).map((t, i) => draftCard(String(t), kind === 'whatsapp' || kind === 'status' ? `<a class="btn-sm btn-info-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t)}">Open in WhatsApp</a>` : '')).join('')}${kind === 'whatsapp' ? '<p class="note">Send offer messages only to customers who agreed to receive them (Customers tab shows who).</p>' : ''}`); }
  catch (e) { outBox('aw-out', `<div class="ai-err">${esc(aiMsg(e))}</div>`); }
}
// 6: ask
function localAsk(q, d) {
  const t = q.toLowerCase(), top = Object.entries(d.revenueByCategory).sort((a, b) => b[1] - a[1]), f = Object.entries(d.revenueByFabric).sort((a, b) => b[1] - a[1]);
  if (/fabric/.test(t) && f.length) return `Best-selling fabric in the last ${d.periodDays} days: ${f[0][0]} (${formatCurrency(f[0][1])}).` + (f[1] ? ` Then ${f[1][0]} (${formatCurrency(f[1][1])}).` : '');
  if (/categor|best|top|sold most/.test(t) && top.length) return `Top category in the last ${d.periodDays} days: ${top[0][0]} (${formatCurrency(top[0][1])}).` + (d.bestSellers[0] ? ` Best seller: ${d.bestSellers[0].name}.` : '');
  if (/repeat|return/.test(t)) return `${d.customers.repeatBuyersEver} customer${d.customers.repeatBuyersEver === 1 ? ' has' : 's have'} ordered more than once. ${d.customers.orderedInPeriod} customer${d.customers.orderedInPeriod === 1 ? '' : 's'} ordered in the last ${d.periodDays} days.`;
  if (/never sold|unsold|not sold|slow/.test(t)) return d.stock.neverSold.length ? `Never sold so far: ${d.stock.neverSold.join(', ')}.` : 'Every piece in stock has sold at least once.';
  if (/discount/.test(t)) return `Discounts given in the last ${d.periodDays} days: ${formatCurrency(d.discountsGiven)} across ${d.orders} orders.`;
  if (/compar|last month|vs|growth|more than/.test(t)) { const c = d.changeVsPreviousPeriodPercent; return `Last ${d.periodDays} days: ${formatCurrency(d.revenue)} from ${d.orders} orders. Before that: ${formatCurrency(d.previousPeriod.revenue)} from ${d.previousPeriod.orders} orders (${c.revenue === null ? 'no earlier sales to compare' : (c.revenue >= 0 ? '+' : '') + c.revenue + '% revenue'}).`; }
  if (/revenue|sales|earn|income|sold/.test(t)) return `Last ${d.periodDays} days: ${formatCurrency(d.revenue)} from ${d.orders} orders and ${d.pieces} pieces (average order ${formatCurrency(d.averageOrder)}).`;
  return 'I can answer questions about best fabric or category, revenue, repeat customers, discounts, comparisons and unsold sarees. Connect Claude to answer any question.';
}
async function aiAsk(q) {
  q = (q || el_('ak-q').value || '').trim(); if (!q) { showToast('Type a question', 'error'); return; } el_('ak-q').value = q; const days = +el_('ak-days').value || 90, d = aiShopData(days);
  busy('ak-out', 'looking at your numbers…');
  try { const ans = aiReady('ask') ? (await aiCall('ask', { question: q, data: d, lang: 'en' })).text : localAsk(q, d); outBox('ak-out', `<div class="ai-q">${esc(q)}</div><div class="ai-a">${esc(ans).replace(/\n/g, '<br>')}</div>${aiReady('ask') ? '' : '<p class="note">Built-in answer from your numbers. Connect Claude for any question.</p>'}`); }
  catch (e) { outBox('ak-out', `<div class="ai-err">${esc(aiMsg(e))}</div>`); }
}
// 7: summary
function localSummary(d) {
  const c = d.changeVsPreviousPeriodPercent, ch = c.revenue === null ? 'no earlier period to compare' : `${c.revenue >= 0 ? 'up' : 'down'} ${Math.abs(c.revenue)}% on the period before`, top = d.bestSellers[0], cat = Object.entries(d.revenueByCategory).sort((a, b) => b[1] - a[1])[0], L = [];
  L.push(`• Last ${d.periodDays} days: ${formatCurrency(d.revenue)} from ${d.orders} order${d.orders === 1 ? '' : 's'} and ${d.pieces} piece${d.pieces === 1 ? '' : 's'}, ${ch}.`);
  if (top) L.push(`• Best seller: ${top.name} (${top.sold} sold, ${formatCurrency(top.revenue)})${cat ? `. Top category: ${cat[0]}` : ''}.`);
  L.push(`• Customers: ${d.customers.orderedInPeriod} ordered, ${d.customers.newInPeriod} new accounts, ${d.customers.repeatBuyersEver} repeat buyers overall.`);
  const p = d.pendingOrders; L.push(p.toConfirm + p.toPack + p.toShip ? `• Waiting for you: ${p.toConfirm} to confirm, ${p.toPack} to pack, ${p.toShip} to ship.` : '• No orders are waiting for you.');
  if (d.stock.almostSoldOut.length) L.push(`• Almost sold out: ${d.stock.almostSoldOut.slice(0, 4).join(', ')}.`);
  if (d.stock.neverSold.length) L.push(`• Not sold yet: ${d.stock.neverSold.slice(0, 4).join(', ')}. Consider featuring them or a bundle.`);
  return L.join('\n');
}
async function aiSummary() {
  const days = +el_('sm-days').value || 7, d = aiShopData(days); busy('sm-out', 'writing your summary…');
  try { const t = aiReady('summary') ? (await aiCall('summary', { stats: d, lang: el_('sm-lang').value })).text : localSummary(d); outBox('sm-out', `${aiReady('summary') ? '' : '<p class="note">Built-in summary from your numbers (connect Claude for a richer note, in Telugu or Hindi).</p>'}${draftCard(t)}`); }
  catch (e) { outBox('sm-out', `<div class="ai-err">${esc(aiMsg(e))}</div>`); }
}
// 8: pricing / stock ideas
function pricingRows() {
  const sold = {}; db.orders.filter(o => o.status !== 'cancelled').forEach(o => (o.items || []).forEach(i => { sold[i.productId] = (sold[i.productId] || 0) + i.quantity; }));
  const added = {}; db.logs.filter(l => l.type === 'product_created').forEach(l => { added[l.product] = l.time; });
  return db.products.map(p => { const t = added[p.name], daysListed = t ? Math.max(0, dayDiff(String(t).slice(0, 10), ymd(new Date()))) : 0; return { id: p.id, name: p.name, price: p.price, stock: p.stock, daysListed, sold: sold[p.id] || 0, category: p.category }; });
}
function localPricing(rows) {
  const out = [];
  rows.forEach(r => {
    if (r.stock > 0 && r.sold === 0 && r.daysListed >= 45) out.push({ name: r.name, action: r.price >= 20000 ? 'bundle' : 'small_discount', reason: `Listed ${r.daysListed} days and not sold yet. Try a bundle with an accessory, or a small offer (up to 10%).` });
    else if (r.stock > 0 && r.sold === 0) out.push({ name: r.name, action: 'feature', reason: 'Not sold yet. Feature it on the home page or in a status post.' });
    else if (r.sold >= 2 && r.stock <= 1 && r.stock > 0) out.push({ name: r.name, action: 'restock', reason: `Sold ${r.sold} and only ${r.stock} left. Customers like this design, look for similar pieces.` });
    else if (r.stock <= 0 && r.sold >= 1) out.push({ name: r.name, action: 'restock', reason: 'Sold out. Turn on similar-saree requests and look for something alike.' });
  });
  return out.slice(0, 10);
}
const ACT = { keep: ['✅', 'Keep as is'], feature: ['⭐', 'Feature it'], bundle: ['🎁', 'Make a bundle'], small_discount: ['🏷️', 'Small offer'], restock: ['📦', 'Restock / find similar'], reprice_check: ['🔍', 'Check the price'] };
async function aiPricing() {
  busy('pr-out', 'looking at your catalogue…'); const rows = pricingRows(); let list = localPricing(rows), via = 'rules';
  try { if (aiReady('pricing')) { const r = await aiCall('pricing', { items: rows }); const names = new Set(rows.map(x => x.name)); const ai = (r.data.suggestions || []).filter(x => names.has(x.name) && ACT[x.action]).slice(0, 8).map(x => ({ name: x.name, action: x.action, reason: String(x.reason || '').slice(0, 200) })); if (ai.length) { list = ai; via = 'claude'; } } } catch (e) { via = 'rules (Claude: ' + aiMsg(e) + ')'; }
  outBox('pr-out', `<p class="note">${via === 'claude' ? 'Ideas from Claude based on your sales.' : 'Ideas from built-in rules.'} You decide what to do.</p>` + (list.length ? list.map(s => { const p = db.products.find(x => x.name === s.name) || {}; return `<div class="ai-idea"><span class="ai-tag">${ACT[s.action][0]} ${ACT[s.action][1]}</span><b>${esc(s.name)}</b><small>${esc(s.reason)}</small><div class="ai-act">${p.id ? `<button class="btn-sm btn-info-sm" onclick="openProductForm('${p.id}')">Open product</button>` : ''}${s.action === 'bundle' ? '<button class="btn-sm btn-info-sm" onclick="switchAdminTab(\'bundles\')">Make a bundle</button>' : ''}${s.action === 'small_discount' ? '<button class="btn-sm btn-info-sm" onclick="switchAdminTab(\'coupons\')">Create a coupon</button>' : ''}</div></div>`; }).join('') : '<div class="dash-empty">Nothing stands out right now. 🎉</div>'));
}
// 9: clean-up
const tcase = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
function cleanScan() {
  const items = [], addr = [];
  db.users.forEach(u => { const a = u.addr || {}; if (a.street || a.city || a.state || a.pincode) addr.push({ id: 'u:' + u.id, name: u.name, street: a.street, city: a.city, state: a.state, pin: a.pincode, who: u.name || u.phone, apply: (f, v) => { u.addr = { ...(u.addr || {}), [f === 'pin' ? 'pincode' : f]: v }; if (f === 'name') u.name = v; } });
    (u.addresses || []).forEach(x => addr.push({ id: 'a:' + x.id, name: x.name, street: x.street, city: x.city, state: x.state, pin: x.pincode, who: (u.name || u.phone) + ' · ' + (x.label || 'address'), apply: (f, v) => { x[f === 'pin' ? 'pincode' : f] = v; } })); });
  addr.forEach(a => {
    const bits = []; if (a.city && (a.city !== tcase(a.city) || /\s{2}/.test(a.city))) bits.push(['city', tcase(a.city), 'untidy capitals / spacing']);
    if (a.state && /^[a-z ]+$|^[A-Z ]+$/.test(a.state.trim()) && normState(a.state) && normState(a.state) !== a.state) bits.push(['state', normState(a.state), 'standard state name']);
    const st = statesOfPin(a.pin); if (st && a.state && normState(a.state) && !st.some(x => normState(x) === normState(a.state))) bits.push(['state', st[0], `PIN ${a.pin} belongs to ${st.join(' / ')}`]);
    if (a.name && a.name !== a.name.trim().replace(/\s+/g, ' ')) bits.push(['name', a.name.trim().replace(/\s+/g, ' '), 'extra spaces']);
    bits.forEach(([f, to, why]) => items.push({ kind: 'fix', id: a.id, field: f, from: a[f === 'pin' ? 'pincode' : f], to, why, who: a.who, apply: () => a.apply(f, to) }));
  });
  const byPhone = {}; db.users.forEach(u => { const k = String(u.phone || '').replace(/\D/g, '').slice(-10); if (k) (byPhone[k] = byPhone[k] || []).push(u); }); Object.values(byPhone).filter(l => l.length > 1).forEach(l => items.push({ kind: 'dup', text: `Same phone number on ${l.length} accounts: ${l.map(u => u.name || u.id).join(', ')}` }));
  const byMail = {}; db.users.forEach(u => { const k = String(u.email || '').toLowerCase(); if (k) (byMail[k] = byMail[k] || []).push(u); }); Object.values(byMail).filter(l => l.length > 1).forEach(l => items.push({ kind: 'dup', text: `Same email on ${l.length} accounts: ${l.map(u => u.name || u.id).join(', ')}` }));
  const bySku = {}, byName = {}; db.products.forEach(p => { (bySku[p.sku.toLowerCase()] = bySku[p.sku.toLowerCase()] || []).push(p); (byName[p.name.toLowerCase().trim()] = byName[p.name.toLowerCase().trim()] || []).push(p); });
  Object.values(bySku).filter(l => l.length > 1).forEach(l => items.push({ kind: 'dup', text: `Same SKU on ${l.length} products: ${l[0].sku}` })); Object.values(byName).filter(l => l.length > 1).forEach(l => items.push({ kind: 'dup', text: `Same product name twice: ${l[0].name}` }));
  db.products.forEach(p => { const m = []; if (!p.fabric) m.push('fabric'); if (!(p.colours || []).length && !isAccessory(p)) m.push('colours'); if (!p.description || p.description.length < 30) m.push('description'); if (!(p.images || []).length || /^data:image\/svg/.test(p.image || '')) m.push('real photo'); if (m.length) items.push({ kind: 'missing', pid: p.id, text: `${p.name} is missing: ${m.join(', ')}` }); });
  return { items, addr };
}
let CLEAN = { items: [], addr: [] };
function cleanRender() {
  const it = CLEAN.items; const fixes = it.filter(x => x.kind === 'fix' || x.kind === 'aifix'), rest = it.filter(x => !/fix$/.test(x.kind));
  outBox('cl-out', (fixes.length ? `<h4 class="dash-h4">Safe fixes (${fixes.length})</h4>${fixes.map((x, i) => `<div class="ai-idea"><b>${esc(x.who)}</b><small>${esc(x.field)}: “${esc(x.from)}” → <strong>${esc(x.to)}</strong> · ${esc(x.why)}${x.kind === 'aifix' ? ' · ✨ Claude' : ''}</small><div class="ai-act"><button class="btn-sm btn-primary-sm" onclick="cleanApply(${it.indexOf(x)})">Apply</button><button class="btn-sm btn-info-sm" onclick="cleanSkip(${it.indexOf(x)})">Skip</button></div></div>`).join('')}<button class="btn-sm btn-primary-sm" onclick="cleanApplyAll()">Apply all ${fixes.length}</button>` : '') + (rest.length ? `<h4 class="dash-h4">Needs your eyes (${rest.length})</h4>${rest.map(x => `<div class="ai-idea"><small>${x.kind === 'dup' ? '👥 ' : '📝 '}${esc(x.text)}</small>${x.pid ? `<div class="ai-act"><button class="btn-sm btn-info-sm" onclick="openProductForm('${x.pid}')">Open product</button></div>` : ''}</div>`).join('')}` : '') || '<div class="dash-empty">✅ Everything looks tidy.</div>');
}
function aiClean() { CLEAN = cleanScan(); cleanRender(); }
function cleanApply(i) { const x = CLEAN.items[i]; if (!x || !x.apply) return; x.apply(); CLEAN.items.splice(i, 1); saveDB(); cleanRender(); showToast('Fixed', 'success'); }
function cleanSkip(i) { CLEAN.items.splice(i, 1); cleanRender(); }
function cleanApplyAll() { const list = CLEAN.items.filter(x => x.apply); list.forEach(x => x.apply()); CLEAN.items = CLEAN.items.filter(x => !x.apply); saveDB(); cleanRender(); showToast(`${list.length} fixes applied`, 'success'); }
async function aiCleanAi() {
  if (!aiReady('cleanup')) { showToast(aiConnected() ? 'This helper is switched off' : 'Connect Claude first (WhatsApp Assistant tab)', 'error'); return; }
  if (!CLEAN.addr.length) CLEAN = { ...cleanScan(), items: CLEAN.items.length ? CLEAN.items : cleanScan().items };
  const rows = CLEAN.addr.slice(0, 40); if (!rows.length) { showToast('No addresses to check', ''); return; }
  if (!confirm(`This sends ${rows.length} customer names and addresses to Claude to check spelling (phone numbers are not sent). Continue?`)) return;
  busy('cl-out', 'Claude is checking spelling…');
  try {
    const r = await aiCall('cleanup', { rows: rows.map(a => ({ id: a.id, name: a.name, street: a.street, city: a.city, state: a.state, pin: a.pin })) }), by = Object.fromEntries(rows.map(a => [a.id, a])), digits = s => String(s || '').replace(/\D/g, '');
    (r.data.fixes || []).forEach(f => { const a = by[f.id]; if (!a || !['name', 'street', 'city', 'state'].includes(f.field)) return; const to = String(f.to || '').trim(), from = a[f.field] || ''; if (!to || to === from || to.length > 160 || digits(to) !== digits(from)) return;   // house numbers and PIN digits can never change
      CLEAN.items.push({ kind: 'aifix', id: f.id, field: f.field, from, to, why: String(f.why || 'spelling').slice(0, 80), who: a.who, apply: () => a.apply(f.field, to) }); });
    cleanRender();
  } catch (e) { outBox('cl-out', `<div class="ai-err">${esc(aiMsg(e))}</div>`); }
}
// 10: translate
async function aiTranslate() {
  const text = el_('tr-text').value.trim(), to = el_('tr-to').value; if (!text) { showToast('Paste some text first', 'error'); return; } busy('tr-out', 'translating…');
  try { outBox('tr-out', draftCard((await aiCall('translate', { text, to })).text)); } catch (e) { outBox('tr-out', `<div class="ai-err">${esc(aiMsg(e))}</div>`); }
}
