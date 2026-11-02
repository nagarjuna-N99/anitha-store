const { chromium } = require(process.env.PW || 'playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
  let ok = true; const t = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) ok = false; }; const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('1234'));
  await p.goto('file://' + path.resolve(__dirname, '../anitha-store.html')); await p.waitForTimeout(800);
  const ev = (f, a) => p.evaluate(f, a);
  // ---- photo quality: sharp / blurry / dark / duplicate / small ----
  const r = await ev(async () => {
    const mk = (w, h, draw, filter) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); if (filter) x.filter = filter; draw(x, w, h); return c.toDataURL('image/jpeg', 0.95); };
    const pat = (x, w, h) => { x.fillStyle = '#c8a060'; x.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${(i * 37) % 360},60%,${30 + (i * 13) % 40}%)`; x.fillRect((i * 97) % w, (i * 53) % h, 18, 40); } };
    const sharp = mk(1200, 1200, pat), blurry = mk(1200, 1200, pat, 'blur(14px)'), dark = mk(1200, 1200, (x, w, h) => { pat(x, w, h); x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(0, 0, w, h); }), small = mk(400, 400, pat);
    const A = await phAnalyze(sharp), B = await phAnalyze(blurry), D = await phAnalyze(dark), S = await phAnalyze(small);
    return { sharp: phIssues(A, []).map(x => x[1]), blurry: phIssues(B, []).map(x => x[1]), dark: phIssues(D, []).map(x => x[1]), small: phIssues(S, []).map(x => x[1]), dup: phIssues(A, [{ ...A, where: 'your photo 1' }]).map(x => x[1]), blurVals: [A.blur, B.blur] };
  });
  t('sharp, bright, large photo passes with no issue', r.sharp.length === 0);
  t('blurry photo is flagged', r.blurry.some(x => /blurry|soft/i.test(x)));
  t('dark photo is flagged', r.dark.some(x => /dark/i.test(x)));
  t('small photo is flagged', r.small.some(x => /Small photo/.test(x)));
  t('the same photo twice is flagged as a duplicate', r.dup.some(x => /same as/.test(x)));
  // ---- weekly note on the dashboard (built-in, no Claude) ----
  await ev(() => { if (!isAdminView) toggleView(); db.settings.weekly = null; switchAdminTab('dashboard'); }); await p.waitForTimeout(500);
  t('dashboard shows a weekly note card with text', await ev(() => { const e = document.getElementById('dash-weekly'); return !!e && /This week at a glance/.test(e.innerText) && e.querySelector('.wk-text') && e.querySelector('.wk-text').innerText.length > 20; }));
  t('weekly note saved once for this week (no repeat writing)', await ev(() => db.settings.weekly && db.settings.weekly.key === isoWeekKey() && db.settings.weekly.via === 'built-in'));
  // ---- follow-ups ----
  await ev(() => {
    const old = ymd(new Date(Date.now() - 90 * 864e5)), rec = ymd(new Date(Date.now() - 10 * 864e5));
    db.users.push({ id: 'fu1', name: 'Asha Rao', phone: '+919811111111', consents: { marketing: true, orderUpdates: true } }, { id: 'fu2', name: 'No Consent', phone: '+919822222222', consents: {} }, { id: 'fu3', name: 'Meena K', phone: '+919833333333', consents: { orderUpdates: true } });
    db.orders.push({ id: 'F1', userId: 'fu1', customer: 'Asha Rao', phone: '+919811111111', date: old, status: 'delivered', total: 100, items: [{ name: 'Green Tussar', category: 'Tussar', quantity: 1, price: 100 }], timeline: [] },
      { id: 'F2', userId: 'fu2', customer: 'No Consent', phone: '+919822222222', date: old, status: 'delivered', total: 100, items: [{ name: 'Blue Silk', quantity: 1, price: 100 }], timeline: [] },
      { id: 'F3', userId: 'fu3', customer: 'Meena K', phone: '+919833333333', date: rec, status: 'delivered', total: 100, items: [{ name: 'Red Khadi', quantity: 1, price: 100 }], timeline: [] });
    switchAdminTab('ai'); document.querySelectorAll('.ai-sec').forEach(d => d.open = true);
  });
  const fu = await ev(() => fuCandidates());
  t('follow-ups list only customers who agreed (offers for dormant, order updates for review)', fu.rows.length === 2 && fu.rows.some(x => x.uid === 'fu1' && x.seg === 'dormant') && fu.rows.some(x => x.uid === 'fu3' && x.seg === 'review') && !fu.rows.some(x => x.uid === 'fu2'));
  t('and says how many were left out', fu.hidden >= 1 && /did not agree/.test(await ev(() => document.querySelector('[data-k=followup]').innerText)));
  const i1 = fu.rows.findIndex(x => x.uid === 'fu1');
  await ev(i => fuDraft(i), i1); await p.waitForTimeout(150);
  t('draft has the first name and the STOP line', await ev(i => { const v = document.getElementById('fu-t-' + i).value; return /Asha/.test(v) && /STOP/.test(v); }, i1));
  await ev(() => { window._o = []; window.open = u => { window._o.push(u); return null; }; }); await ev(i => fuOpen(i), i1);
  t('Open WhatsApp goes to the right number with the message', await ev(() => window._o[0].startsWith('https://wa.me/919811111111?text=') && /Asha/.test(decodeURIComponent(window._o[0]))));
  t('contacted customer is hidden afterwards', await ev(() => !fuCandidates().rows.some(x => x.uid === 'fu1')));
  // ---- caption pack (built-in) ----
  await ev(() => { IGD = { p: db.products[0], plan: null }; document.body.insertAdjacentHTML('beforeend', '<textarea id="ig-cap"></textarea><span id="ig-count"></span><div id="ig-pack"></div>'); });
  await ev(() => igPack()); await p.waitForTimeout(150);
  t('caption pack shows English and Telugu cards', await ev(() => { const x = document.getElementById('ig-pack').innerText; return /English/.test(x) && /Telugu/.test(x) && /[ఀ-౿]/.test(document.getElementById('ig-pack').innerHTML); }));
  await ev(() => igUsePack('te')); t('Use this caption fills the Instagram caption box', await ev(() => /[ఀ-౿]/.test(document.getElementById('ig-cap').value) && /#/.test(document.getElementById('ig-cap').value)));
  // ---- post image maker: 4:5 + logo ----
  await ev(() => { openStatusImage(db.products[0].id); siFmt('post'); }); await p.waitForTimeout(400);
  t('Instagram post image is 1080×1350', await ev(() => { const c = document.getElementById('si-canvas'); return c.width === 1080 && c.height === 1350; }));
  // ---- posting rules (pure) ----
  const good = { kind: 'photo', images: [{ w: 1080, h: 1350, blur: 90, bright: 130 }], caption: 'Handwoven green Tussar saree with a zari border, perfect for weddings. DM or WhatsApp us to order.\n\n#handloomsaree #hyderabadsarees #tussarsaree', alt: 'green saree', keywords: ['Tussar'] };
  const rl = o => ev(o => socialRules(o), o), gate = r => ev(r => socialGate(r, false), r);
  let r1 = await rl(good); t('rules: a strong post passes everything', r1.every(x => x.ok) && (await gate(r1)).ok);
  r1 = await rl({ ...good, caption: 'like for like #a' }); t('rules: "like for like" is a red item', r1.some(x => x.id === 'bait' && !x.ok) && !(await gate(r1)).ok);
  r1 = await rl({ ...good, caption: 'Pretty saree\n' + Array.from({ length: 31 }, (_, i) => '#t' + i).join(' ') }); t('rules: more than 30 hashtags is red', r1.some(x => x.id === 'tagsmax' && !x.ok));
  r1 = await rl({ ...good, images: [{ w: 3000, h: 800, blur: 90, bright: 130 }] }); t('rules: a 3.75:1 panorama is red (Instagram will not accept it)', r1.some(x => x.id === 'ar0' && !x.ok));
  r1 = await rl({ ...good, images: [{ w: 200, h: 250, blur: 90, bright: 130 }] }); t('rules: a tiny photo is red', r1.some(x => x.id === 'min0' && !x.ok));
  r1 = await rl({ ...good, caption: '#a #b #c #d #e #f #g #h #i #j #k' }); t('rules: hashtags-only caption fails the hook, call-to-action and tag-count advice', r1.filter(x => !x.ok && x.level === 'advice').map(x => x.id).sort().join() === 'cta,hookline,kw,tags' || r1.filter(x => !x.ok && x.level === 'advice').length >= 3);
  r1 = await rl({ ...good, images: [{ w: 1080, h: 1080, blur: 20, bright: 130 }] }); t('rules: advice (not red) for a blurry square photo; "post anyway" unlocks', !(await gate(r1)).ok && (await ev(r => socialGate(r, true).ok, r1)));
  const rv = await rl({ kind: 'reel', video: { duration: 12, hook: true, hasAudio: true }, original: false, caption: good.caption, keywords: ['Tussar'] }); t('rules: a Reel needs the "my own original video" confirmation', rv.some(x => x.id === 'orig' && !x.ok) && !(await gate(rv)).ok);
  const rv2 = await rl({ kind: 'reel', video: { duration: 120, hook: false, hasAudio: false }, original: true, caption: good.caption }); t('rules: a 120 s Reel is red; no hook + no sound is advice', rv2.some(x => x.id === 'len' && !x.ok) && rv2.some(x => x.id === 'hook' && !x.ok) && rv2.some(x => x.id === 'sound' && !x.ok));
  // ---- previews ----
  await ev(() => { openPreview({ id: 'x', name: 'Test Saree', category: 'Tussar', price: 100, stock: 1, images: [db.products[0].images[0]], image: db.products[0].images[0], description: 'd', tags: [] }); pvSet('tab', 'ig'); });
  t('preview modal has an Instagram tab with feed, grid and story', await ev(() => document.querySelectorAll('#previewBody .soc-col').length === 3 && [...document.querySelectorAll('.pv-tabs button')].some(b => /Instagram/.test(b.textContent))));
  await ev(() => pvSet('tab', 'wa')); t('preview modal has a WhatsApp status tab (9:16, caption near the bottom)', await ev(() => !!document.querySelector('#previewBody .soc-wa .soc-contain') && /WhatsApp status/i.test(document.getElementById('previewBody').innerText)));
  t('long captions are cut at about 125 characters with "more"', await ev(() => pvIgHTML({ img: '', caption: 'x'.repeat(300) }).includes('soc-more') && !pvIgHTML({ img: '', caption: 'short' }).includes('soc-more')));
  t('no JS errors', errs.length === 0); if (errs.length) console.log(errs);
  console.log(ok ? 'ALL PASSED' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1);
})();
