// ================= Social studio: posting rules, previews, video (5 Nov 2026) =================
// The rules follow Instagram's published limits and widely used practice. Nobody can promise views or likes:
// the app can only stop mistakes that cost reach and make the good habits easy.
const SOC = { hook: 125, captionMax: 2200, tagsMax: 30 };
const SOC_BAIT = /\b(l4l|f4f|s4s|like\s*(for|4)\s*like|follow\s*(for|4)\s*follow|share\s*(for|4)\s*share|like\s+(and|&)\s+share\s+to\s+win|tag\s+(\d+|two|three|a few)\s+friends?\s+to\s+win)\b/i;
const SOC_CTA = /\b(order|dm|whatsapp|message|book|call|link in bio|comment|enquire|inquire|shop|visit)\b/i;
const capTags = t => String(t || '').match(/#[\p{L}\p{N}_]+/gu) || [];
const capBody = t => String(t || '').replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim();
const istHour = iso => new Date(new Date(iso).getTime() + 330 * 60_000).getUTCHours();
function socialRules(o) {
  const R = [], add = (level, id, ok, pass, fail) => R.push({ level, id, ok, text: ok ? pass : fail });
  const cap = String(o.caption || ''), tags = capTags(cap), body = capBody(cap), first = cap.trim().slice(0, SOC.hook).replace(/#[\p{L}\p{N}_]+/gu, '').trim();
  const reel = o.kind === 'reel', imgs = (o.images || []).filter(a => !a.err);
  // ---- must pass (Instagram's own limits and its "no engagement bait" rule) ----
  if (reel) {
    const d = o.video ? o.video.duration : 0; add('block', 'video', !!o.video, 'Video is ready.', 'Make the video first.');
    if (o.video) { add('block', 'len', d >= 3 && d <= 90, `Length ${d.toFixed(1)} s is allowed (3 to 90 s).`, `Reels from this tool must be 3 to 90 seconds (this one is ${d.toFixed(1)} s).`); add('block', 'vert', true, 'Vertical 9:16, 1080×1920.', ''); }
    add('block', 'orig', !!o.original, 'Confirmed: your own original video.', 'Tick the box: this is your own original video with no TikTok or other-app watermark. Instagram gives reposted, watermarked clips very little reach.');
  } else {
    add('block', 'img', (o.images || []).length > 0, `${(o.images || []).length} photo(s) chosen.`, 'Choose at least one photo.');
    imgs.forEach((a, i) => { add('block', 'min' + i, Math.min(a.w, a.h) >= 320, `Photo ${i + 1} is big enough.`, `Photo ${i + 1} is too small (${a.w}×${a.h}). Instagram needs at least 320 px.`); const ar = a.w / a.h; add('block', 'ar' + i, ar >= 0.795 && ar <= 1.915, `Photo ${i + 1} has an accepted shape.`, `Photo ${i + 1} is ${a.w}×${a.h}. Instagram's posting service only takes shapes between 4:5 (tall) and 1.91:1 (wide). Crop it in Image Studio.`); });
  }
  add('block', 'cap', !!body, 'Caption written.', 'Write a caption.');
  add('block', 'capmax', cap.length <= SOC.captionMax, 'Caption is within 2,200 characters.', `Caption is ${cap.length} characters; Instagram allows 2,200.`);
  add('block', 'tagsmax', tags.length <= SOC.tagsMax, `${tags.length} hashtag(s), within the limit of 30.`, `${tags.length} hashtags; Instagram allows at most 30.`);
  add('block', 'bait', !SOC_BAIT.test(cap), 'No "like for like / tag friends to win" lines.', 'Remove lines like "like for like", "follow for follow" or "tag 3 friends to win". Instagram says it shows engagement bait to fewer people.');
  // ---- strongly advised (you may tick "post anyway") ----
  if (reel) {
    if (o.video) {
      const d = o.video.duration; add('advice', 'sweet', d >= 7 && d <= 30, `${d.toFixed(0)} s is a good Reel length (about 7 to 30 s is watched to the end most often).`, `${d.toFixed(0)} s. Short Reels (about 7 to 30 s) are usually watched to the end; long ones lose people.`);
      add('advice', 'hook', !!o.video.hook, 'The first 2 seconds have movement.', 'The first 2 seconds are almost still. Open on movement (the pallu flicked, a turn) and a short line of text. Most people decide in the first 2 seconds.');
      add('advice', 'sound', !!o.video.hasAudio, 'Has sound.', 'No sound: add music or a short voice-over, and put a short line of text on screen for people who watch muted.');
    }
  } else if (imgs[0]) {
    const a = imgs[0]; add('advice', 'w', imgs.every(x => x.w >= 1080), 'Photos are at least 1080 px wide.', 'Some photos are under 1080 px wide and will look soft on phones.');
    const r = a.w / a.h; add('advice', 'ratio', r >= 0.74 && r <= 0.86, 'First photo is 4:5 vertical (uses the most screen).', 'The first photo is not 4:5 vertical. 4:5 takes the most room in the feed and usually performs better than square or wide.');
    add('advice', 'sharp', a.blur >= 45 && a.bright >= 70 && a.bright <= 225, 'First photo is sharp and well lit.', 'The first photo looks blurry, dark or washed out. It is what people judge in half a second. Retake it in daylight.');
    add('advice', 'dup', !a.dup, 'First photo is not a duplicate.', 'The first photo looks the same as one you already used.');
  }
  add('advice', 'hookline', first.length >= 25, 'The first line has real words (it is what shows before “more”).', `Only the first ~${SOC.hook} characters show before “more”. Start with the most interesting words (fabric, colour, occasion), not hashtags.`);
  add('advice', 'cta', SOC_CTA.test(body), 'There is a call to action.', 'Tell people what to do: "DM or WhatsApp us to order".');
  add('advice', 'tags', tags.length >= 3 && tags.length <= 8, `${tags.length} hashtags (a few relevant ones is what Instagram recommends).`, tags.length < 3 ? 'Add 3 to 5 relevant hashtags (e.g. #handloomsaree #hyderabadsarees).' : `${tags.length} hashtags. Instagram's advice is a few relevant ones (3 to 5); more has not been shown to help.`);
  if (o.keywords && o.keywords.length) { const low = body.toLowerCase(); add('advice', 'kw', o.keywords.some(k => low.includes(String(k).toLowerCase())), 'Caption names the product, so Instagram search can find it.', 'Mention the saree name, fabric or colour in the caption: Instagram search reads captions.'); }
  if (!reel) add('advice', 'alt', !!(o.alt || '').trim(), 'Alt text is set.', 'Add alt text (describes the photo for screen readers and helps search).');
  if (o.whenIso) { const h = istHour(o.whenIso); add('advice', 'time', (h >= 7 && h < 10) || (h >= 12 && h < 14) || (h >= 18 && h < 22), 'Scheduled at a common busy time.', 'This time is outside the usual busy hours in India (7–10 am, 12–2 pm, 6–10 pm). Instagram does not show your own stats to this app, so these are general hours.'); }
  if (o.recent && o.recent.length) add('advice', 'space', false, '', 'You already posted or scheduled something within 12 hours of this. Spacing posts out reaches more people than two at once.');
  return R;
}
function socialGate(rules, override) { const blocks = rules.filter(r => r.level === 'block' && !r.ok), adv = rules.filter(r => r.level === 'advice' && !r.ok); return { ok: !blocks.length && (!adv.length || !!override), blocks, adv }; }
function socialRulesHTML(rules, ovId) {
  const g = socialGate(rules, false), row = r => `<div class="soc-rule ${r.ok ? 'ok' : r.level === 'block' ? 'bad' : 'warn'}"><span>${r.ok ? '✓' : r.level === 'block' ? '✕' : '⚠'}</span><div>${esc(r.text)}</div></div>`;
  return `<div class="soc-rules"><div class="soc-rules-h"><b>Posting rules</b> <span class="pf-sub">${g.blocks.length ? `${g.blocks.length} must be fixed` : g.adv.length ? `${g.adv.length} strongly advised` : 'all good'}</span></div>
    ${rules.filter(r => !r.ok && r.level === 'block').map(row).join('')}${rules.filter(r => !r.ok && r.level === 'advice').map(row).join('')}
    <details class="soc-passed"><summary>${rules.filter(r => r.ok).length} passed</summary>${rules.filter(r => r.ok).map(row).join('')}</details>
    ${!g.blocks.length && g.adv.length ? `<label class="chk"><input type="checkbox" id="${ovId}" onchange="socRulesChanged()"><span>I have read the advice and want to post anyway</span></label>` : ''}
    <p class="note" style="margin:6px 0 0;">Red items stop the post: they are Instagram's own limits or rules that cost reach. Amber items are advice. These rules reduce mistakes; nobody can promise views or likes, and this app cannot see your account's own statistics.</p></div>`;
}
// ---- previews: Instagram feed, profile grid, story/reel safe zones, WhatsApp status ----
const igHandle = () => (db.settings.instagramHandle || BRAND()).toLowerCase().replace(/[^a-z0-9._]/g, '');
const socCaptionLines = t => { const flat = String(t || '').replace(/\s*\n+\s*/g, ' ').trim(); return flat.length > SOC.hook ? { show: flat.slice(0, SOC.hook).trimEnd(), more: true } : { show: flat, more: false }; };
function pvIgHTML(o) {
  const img = o.img || '', cap = socCaptionLines(o.caption), others = db.products.map(p => (p.images || [p.image])[0]).filter(x => x && x !== img).slice(0, 5);
  const feed = `<div class="soc-col"><h5>Feed</h5><div class="soc-phone"><div class="soc-ig-h"><img class="soc-av" src="${ICON_URI}" alt=""><b>${esc(igHandle())}</b><span class="soc-dots">•••</span></div><div class="soc-img" style="aspect-ratio:4/5">${img ? `<img src="${esc(img)}" alt="">` : ''}</div><div class="soc-ig-a"><span>♡</span><span>💬</span><span>➤</span><span style="margin-left:auto">🔖</span></div><div class="soc-ig-c"><b>${esc(igHandle())}</b> ${esc(cap.show)}${cap.more ? '… <span class="soc-more">more</span>' : ''}</div></div>${cap.more ? `<p class="note">Only the first ~${SOC.hook} characters show before “more”.</p>` : ''}</div>`;
  const grid = `<div class="soc-col"><h5>Profile grid</h5><div class="soc-phone"><div class="soc-ig-h"><img class="soc-av" src="${ICON_URI}" alt=""><b>${esc(igHandle())}</b></div><div class="soc-grid">${[img, ...others].slice(0, 6).map((s, i) => `<div class="${i ? 'dim' : 'me'}">${s ? `<img src="${esc(s)}" alt="">` : ''}</div>`).join('')}</div></div><p class="note">Instagram shows the grid in 3:4 crops: keep the saree in the middle.</p></div>`;
  const story = `<div class="soc-col"><h5>Reel / Story</h5><div class="soc-phone soc-916">${img ? `<img class="soc-fill" src="${esc(img)}" alt="">` : ''}<div class="soc-zone top">Instagram bar</div><div class="soc-zone bot">Buttons and caption cover this</div></div><p class="note">Keep text and the saree out of the shaded areas.</p></div>`;
  return `<div class="soc-prev">${feed}${grid}${story}</div>`;
}
function pvWaHTML(o) {
  const img = o.img || '', cap = String(o.caption || '').replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  return `<div class="soc-prev"><div class="soc-col"><h5>WhatsApp status</h5><div class="soc-phone soc-916 soc-wa"><div class="soc-wa-bar"><i></i></div><div class="soc-wa-h"><img class="soc-av" src="${ICON_URI}" alt=""><div><b>My status</b><small>Just now</small></div></div>${img ? `<img class="soc-contain" src="${esc(img)}" alt="">` : ''}${cap ? `<div class="soc-wa-cap">${esc(cap)}</div>` : ''}<div class="soc-wa-reply">↑ Reply</div></div><p class="note">WhatsApp fits the whole picture and shows the caption near the bottom. A status shows for 24 hours. Pictures are best at 9:16 (1080×1920); a video can be up to 30 seconds.</p></div>
    <div class="soc-col"><h5>What to do</h5><div class="note" style="max-width:260px;">WhatsApp does not let apps post a status for you. Make the picture with <b>📲 Status</b> (Products) or edit a video in your phone app and check it in the <b>🎬 Video analyzer</b> (Instagram tab), then post it from WhatsApp yourself.</div></div></div>`;
}

// ---- rules + previews inside the "Share on Instagram" dialog ----
let IGR_T = null;
function socRulesChanged() { if (IGD && document.getElementById('ig-rules')) igRulesRefresh(true); else if (VA.open) vaRulesRefresh(true); }
function igRulesRefresh(keepOverride) {
  clearTimeout(IGR_T); IGR_T = setTimeout(async () => {
    if (!IGD || !document.getElementById('ig-rules')) return; const p = IGD.p, imgs = (p.images || [p.image]).filter(Boolean), picks = [...document.querySelectorAll('.ig-pick:checked')].map(x => +x.value);
    const ov = document.getElementById('ig-override'), keep = keepOverride && ov && ov.checked, A = [];
    for (const i of picks) { try { const a = await phAnalyze(imgs[i]), oth = []; for (const q of db.products) { if (q.id === p.id) continue; for (const s of (q.images || [q.image]).filter(Boolean).slice(0, 1)) { try { oth.push(await phAnalyze(s)); } catch (e) {} } } A.push({ ...a, dup: oth.some(o => phDist(a.hash, o.hash) <= 5) }); } catch (e) { A.push({ err: true }); } }
    const sel = document.querySelector('input[name=ig-when]:checked'); let whenIso = ''; if (sel) { if (sel.value === 'now') whenIso = new Date().toISOString(); else if (sel.value === 'custom') { const v = document.getElementById('ig-custom').value; whenIso = v ? new Date(v).toISOString() : ''; } else whenIso = sel.value; }
    const recent = (ADM.igJobs || []).filter(j => ['queued', 'posted', 'publishing'].includes(j.status) && whenIso && Math.abs(new Date(j.when || j.postedAt) - new Date(whenIso)) < 12 * 3600_000);
    const kw = [p.name, p.fabric, ...(p.colours || [])].filter(Boolean).flatMap(x => String(x).split(/\s+/)).filter(w => w.length > 3);
    const rules = socialRules({ kind: 'photo', images: picks.map((x, k) => A[k]), caption: document.getElementById('ig-cap').value, alt: p.altText || IGD.plan.altText || '', keywords: kw.slice(0, 6), whenIso, recent });
    const box = document.getElementById('ig-rules'); if (!box) return; box.innerHTML = socialRulesHTML(rules, 'ig-override'); const o2 = document.getElementById('ig-override'); if (o2 && keep) o2.checked = true;
    IGD.rules = rules; igGateUpdate();
    const pv = document.getElementById('ig-prevbox'); if (pv && pv.closest('details') && pv.closest('details').open) pv.innerHTML = pvIgHTML({ img: imgs[picks[0]] || '', caption: document.getElementById('ig-cap').value });
  }, 250);
}
function igGateUpdate() { const b = document.getElementById('ig-go'); if (!b || !IGD.rules) return; const o = document.getElementById('ig-override'), g = socialGate(IGD.rules, o && o.checked); b.disabled = !g.ok; b.title = g.ok ? '' : g.blocks.length ? 'Fix the red items first' : 'Tick “post anyway” or follow the advice'; }
function igPreviewToggle() { const d = document.getElementById('ig-prev'); if (d && d.open) igRulesRefresh(true); }
