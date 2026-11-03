// ================= INSTAGRAM (owner app) =================
// Post a product to Instagram right when you publish it, or at a time recommended by Claude. The server does the posting
// (Instagram's official API) and keeps the schedule, so it works even when this page is closed.
function igPrepJpeg(src, max = 1440) {
  return new Promise((res, rej) => {
    const im = new Image(); if (/^https?:/i.test(src)) im.crossOrigin = 'anonymous';
    im.onload = () => {
      let w = im.naturalWidth, h = im.naturalHeight, cw = w, ch = h; const r = w / h;
      if (r < 0.8) cw = Math.round(h * 0.8); else if (r > 1.91) ch = Math.round(w / 1.91);   // Instagram only accepts 4:5 to 1.91:1
      const k = Math.min(1, max / Math.max(cw, ch)), c = document.createElement('canvas'); c.width = Math.round(cw * k); c.height = Math.round(ch * k); const x = c.getContext('2d');
      x.fillStyle = '#F7F4EC'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, Math.round((cw - w) / 2 * k), Math.round((ch - h) / 2 * k), Math.round(w * k), Math.round(h * k));
      try { res(c.toDataURL('image/jpeg', 0.9)); } catch (e) { rej(new Error('This photo is hosted on another website and cannot be sent to Instagram. Open the product and upload the photo into it.')); }
    };
    im.onerror = () => rej(new Error('A photo could not be read.')); im.src = src;
  });
}
const igWhen = iso => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
let IGD = null;
async function igOffer(p, opts) {
  if (!p) return; if (BUILD !== 'admin' || !ADM.ig) { if (opts && opts.force) showToast(BUILD === 'admin' ? 'Instagram is not connected on the server yet (see Instagram tab).' : 'Instagram posting works in the owner app on your server.', 'error'); return; }
  IGD = { p, plan: null }; openModal(`<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:4px;">📸 Share on Instagram</h3><div id="ig-body" class="ai-busy">✨ Claude is planning the caption and the best times…</div>`);
  try { IGD.plan = await admApi('POST', '/admin/api/social/plan', { product: { name: p.name, category: p.category, fabric: p.fabric, colours: p.colours, price: p.price, description: p.description, occasions: occasionsOf(p), oneOfAKind: oneOfAKind(p), lang: 'en' } }); } catch (e) { document.getElementById('ig-body').innerHTML = `<div class="ai-err">${esc(e.message)}</div>`; return; }
  const pl = IGD.plan, imgs = (p.images || [p.image]).filter(Boolean).slice(0, 10), caption = pl.caption + (pl.hashtags.length ? '\n\n' + pl.hashtags.map(h => '#' + h).join(' ') : '');
  document.getElementById('ig-body').className = ''; document.getElementById('ig-body').innerHTML = `
    <p class="note">${pl.via === 'claude' ? '✨ Written and timed by Claude' : 'Built-in suggestion (connect Claude for a personal caption)'}. Times are suggestions based on typical Indian Instagram habits: Claude cannot see your account's own statistics.</p>
    <div class="ig-photos">${imgs.map((s, i) => `<label class="ig-ph"><input type="checkbox" class="ig-pick" value="${i}" ${i === 0 ? 'checked' : ''} onchange="igRulesRefresh(true)"><img src="${esc(s)}" alt="Photo ${i + 1}"></label>`).join('')}</div>
    <div class="form-group"><label>Caption <span class="pf-sub" id="ig-count"></span></label><textarea id="ig-cap" rows="7" oninput="igCount();igRulesRefresh(true)">${esc(caption)}</textarea><div class="ai-act"><button type="button" class="btn-sm btn-info-sm" onclick="igPack()">✨ Caption pack: English + తెలుగు + hashtags</button></div><div id="ig-pack"></div></div>
    <div class="form-group"><label>When to post</label><div class="ig-when">
      <label class="ig-opt"><input type="radio" name="ig-when" value="now" onchange="igRulesRefresh(true)"> <b>Post now</b></label>
      ${pl.slots.map((s, i) => `<label class="ig-opt"><input type="radio" name="ig-when" value="${esc(s.iso)}" ${i === 0 ? 'checked' : ''} onchange="igRulesRefresh(true)"> <b>${esc(igWhen(s.iso))}</b> <small>${i === 0 ? '⭐ recommended · ' : ''}${esc(s.why)}</small></label>`).join('')}
      <label class="ig-opt"><input type="radio" name="ig-when" value="custom"> <b>Pick a time</b> <input type="datetime-local" id="ig-custom" onchange="igRulesRefresh(true)" onfocus="document.querySelector('input[name=ig-when][value=custom]').checked=true"></label></div></div>
    <details id="ig-prev" ontoggle="igPreviewToggle()"><summary>👁 Preview: Instagram feed, grid, story and WhatsApp status</summary><div id="ig-prevbox"></div></details>
    <div id="ig-rules"></div>
    <div id="ig-msg" class="note"></div><div class="dd-actions"><button class="btn-sm btn-info-sm" onclick="closeModal('adminModal')">Not now</button><button class="btn-full" id="ig-go" style="margin:0;flex:1;" onclick="igSubmit()" disabled>📸 Post / Schedule</button></div>`;
  igCount(); igRulesRefresh(false);
}
function igCount() { const t = document.getElementById('ig-cap').value, tags = (t.match(/#[\p{L}\p{N}_]+/gu) || []).length, e = document.getElementById('ig-count'); if (e) { e.textContent = `${t.length}/2200 characters · ${tags}/30 hashtags`; e.style.color = t.length > 2200 || tags > 30 ? '#b04a4a' : ''; } }
async function igSubmit() {
  const p = IGD.p, msg = t => { document.getElementById('ig-msg').textContent = t; }, btn = document.getElementById('ig-go'), picks = [...document.querySelectorAll('.ig-pick:checked')].map(x => +x.value), sel = document.querySelector('input[name=ig-when]:checked');
  if (!picks.length) { msg('Choose at least one photo.'); return; } if (!sel) { msg('Choose when to post.'); return; }
  { const g = socialGate(IGD.rules || [], (document.getElementById('ig-override') || {}).checked); if (!g.ok) { msg(g.blocks.length ? 'Fix the red items in the posting rules first.' : 'Tick “post anyway” or follow the advice first.'); return; } }
  let when = sel.value; if (when === 'custom') { const v = document.getElementById('ig-custom').value; if (!v) { msg('Pick a date and time.'); return; } when = new Date(v).toISOString(); }
  btn.disabled = true; msg('Preparing photos…');
  try {
    const imgs = (p.images || [p.image]).filter(Boolean), ids = []; for (const i of picks) { const jpg = await igPrepJpeg(imgs[i]); ids.push((await admApi('POST', '/admin/api/social/media', { dataUrl: jpg })).id); msg(`Uploaded ${ids.length} of ${picks.length}…`); }
    const r = await admApi('POST', '/admin/api/social/post', { mediaIds: ids, caption: document.getElementById('ig-cap').value, when, productId: p.id, productName: p.name }), j = r.job;
    closeModal('adminModal'); if (j.status === 'posted') showToast('📸 Posted on Instagram', 'success'); else if (j.status === 'queued' && when !== 'now') showToast('🗓 Scheduled for ' + igWhen(j.when) + ' (IST)', 'success'); else showToast('Instagram: ' + (j.error || j.status), 'error');
    if (currentAdminTab === 'social') renderSocialAdmin(document.getElementById('adminContent'));
  } catch (e) { msg(e.message); btn.disabled = false; }
}
