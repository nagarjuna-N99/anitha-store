// Calmer sizes on computers, "Notes from the loom" sign-up, website colours (presets, own colours, photo match, AI ideas, readability guard).
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1216, height: 760 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(600);
  let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x === undefined ? '' : x); } else console.log('PASS', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---- sizes on a computer ----
  await ev(() => document.getElementById('new-arrivals').scrollIntoView()); await sleep(300);
  const sc = await ev(() => { const c = document.querySelector('.scroll-card'), bt = document.querySelector('.scroll-card .btn-sm-card'); return { w: c.getBoundingClientRect().width, h: bt.getBoundingClientRect().height, name: parseFloat(getComputedStyle(c.querySelector('.scroll-card-name')).fontSize) }; });
  ok('home: new-arrival cards are about 250px wide with small quiet buttons (34px high) and a 17px name', Math.abs(sc.w - 250) < 2 && sc.h >= 33 && sc.h <= 38 && sc.name === 17, JSON.stringify(sc));
  await ev(() => navigateTo('shop')); await sleep(500);
  const gr = await ev(() => { const g = document.getElementById('productGrid'), cols = getComputedStyle(g).gridTemplateColumns.split(' ').length, kt = document.querySelector('.kind-tab').getBoundingClientRect().height, fb = document.querySelector('.filter-btn').getBoundingClientRect().height; return { cols, kt, fb }; });
  ok('collection: four or more cards across, and the tabs and filter chips are slim (about 34px)', gr.cols >= 4 && gr.kt <= 38 && gr.fb <= 38, JSON.stringify(gr));
  const cp = await ev(() => { const bn = document.querySelector('.hero-slider.shop-banner'), c = document.querySelector('.product-card'); return { banner: bn ? bn.getBoundingClientRect().height : 0, title: bn ? parseFloat(getComputedStyle(bn.querySelector('.hero-title')).fontSize) : 0, name: parseFloat(getComputedStyle(c.querySelector('.product-name')).fontSize), btn: c.querySelector('.pc-qv').getBoundingClientRect().height, fav: c.querySelector('.product-fav-btn').getBoundingClientRect().width, h2: parseFloat(getComputedStyle(document.getElementById('shop-title')).fontSize) }; });
  ok('collection page: a short banner (about 150 to 215px) with a 34px title, a 28px page heading, and cards with a 19px name and finger-sized round buttons (about 42px)', cp.banner >= 140 && cp.banner <= 215 && cp.title === 34 && cp.h2 === 28 && cp.name === 19 && cp.btn >= 40 && cp.btn <= 44 && cp.fav >= 40 && cp.fav <= 44, JSON.stringify(cp));

  // ---- notes block on the website ----
  await ev(() => navigateTo('home')); await sleep(300);
  ok('home: "Notes from the loom" shows our own words, an email box, a tick box with the exact wording, and a link to the Privacy Policy', await ev(() => { const s = document.getElementById('homeNotes'); return /Notes from the loom/.test(s.textContent) && !!s.querySelector('#hn-email') && /agree to receive occasional notes from Anitha Pemmasani by email/.test(s.textContent) && /Privacy Policy/.test(s.textContent) && getComputedStyle(s).display !== 'none'; }));
  await p.fill('#hn-email', 'not-an-email'); await p.click('#hn-btn'); ok('notes: a bad email is refused with a clear message', await ev(() => /valid email/.test(document.getElementById('hn-msg').textContent)));
  await p.fill('#hn-email', 'reader@example.com'); await p.click('#hn-btn'); ok('notes: without the tick it asks for it and sends nothing', await ev(() => /tick the box/.test(document.getElementById('hn-msg').textContent)));
  await p.check('#hn-ok'); await p.click('#hn-btn'); await sleep(200); ok('notes: in this practice copy (no shop server) it says nothing was saved', await ev(() => /practice copy/.test(document.getElementById('hn-msg').textContent)));
  // with a shop server address it posts exactly the email and the tick, without cookies
  const sent = []; await ev(() => { window.__SHOP_API = 'https://shop.test'; window.fetch = (u, o) => { window.__sent = { u, body: o && o.body, cred: o && o.credentials }; return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }); }; }); await p.fill('#hn-email', 'reader@example.com'); await p.click('#hn-btn'); await sleep(200);
  ok('notes: with a server it posts only the email and the tick to /public/notes, without cookies, then thanks the visitor and clears the form', await ev(() => { const s = window.__sent; return s && s.u === 'https://shop.test/public/notes' && JSON.parse(s.body).email === 'reader@example.com' && JSON.parse(s.body).consent === true && s.cred === 'omit' && /Thank you/.test(document.getElementById('hn-msg').textContent) && document.getElementById('hn-email').value === ''; }));
  ok('notes: the page checks itself for a phone-sized tap (button 46px, tick 20px)', await ev(() => document.getElementById('hn-btn').getBoundingClientRect().height >= 44 && document.getElementById('hn-ok').getBoundingClientRect().width >= 20));

  // ---- owner: notes card ----
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('home'); }); await sleep(600);
  ok('owner app, Home Page: a "Notes from the loom" card and a "Website colours" card are there', await ev(() => !!document.getElementById('notes-card') && !!document.getElementById('theme-card')));
  await ev(() => { const t = document.querySelector('#notes-card textarea'); t.value = 'Our own words for the notes.'; t.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('owner: changing the words changes the website at once', await ev(() => /Our own words for the notes\./.test(document.getElementById('homeNotes').textContent)));
  await ev(() => notesIdea()); await sleep(200); ok('owner: "Suggest other words" cycles to another wording', await ev(() => db.home.notes.title !== 'Notes from the loom' && document.getElementById('homeNotes').textContent.includes(db.home.notes.title)));
  await ev(() => document.querySelector('#notes-card .toggle').click()); ok('owner: the switch hides the block on the website', await ev(() => getComputedStyle(document.getElementById('homeNotes')).display === 'none' && db.home.notes.show === false));
  await ev(() => document.querySelector('#notes-card .toggle').click());

  // ---- website colours ----
  const css = n => ev(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase(), n);
  ok('colours: the original colours are in place to begin with', await css('--gold') === '#8a6038' && await css('--ivory') === '#faf9f6');
  await ev(() => themePreset(1)); await sleep(200);
  ok('colours: choosing "Peacock" recolours the whole website at once and is saved in the home settings', await css('--gold') === '#0e5c63' && await css('--ivory') === '#f6faf9' && await ev(() => db.home.theme.accent === '#0e5c63'));
  await ev(() => themeUndo()); await sleep(100); ok('colours: Undo goes back to the colours from before', await css('--gold') === '#8a6038');
  await ev(() => themePick('accent', '#f5d38a')); await sleep(100);
  const fixed = await css('--gold'); ok('colours: a main colour that is too pale to read is deepened automatically (readable on the page and section colours)', fixed !== '#f5d38a' && await ev(h => hxRatio(h, '#faf9f6') >= 4.5 && hxRatio(h, '#f5f1ea') >= 4.5, fixed), fixed);
  await ev(() => themePick('bg', '#202020')); await sleep(100); ok('colours: a dark page background is lightened so text stays readable', await ev(() => hxLum(db.home.theme.bg) >= 0.8));
  await ev(() => themeReset()); await sleep(100); ok('colours: "Original colours" restores everything', await css('--gold') === '#8a6038' && await css('--charcoal') === '#2c2c2c');
  await ev(() => { db.home.theme.accent = 'url(javascript:1)'; applyTheme(); }); ok('colours: a damaged colour value is never used (falls back to the original)', await css('--gold') === '#8a6038');
  await ev(() => themeReset());
  // photo match: the photo cannot be opened offline, so it must say so kindly and change nothing
  await ev(() => { db.home.hero.slides[0].image = 'https://own.example/p.jpg'; }); await p.click('#theme-card button:has-text("Match my banner photo")'); await sleep(800);
  ok('colours: "Match my banner photo" says kindly when the photo cannot be read, and changes nothing', await ev(() => /photo|Photo/.test(document.querySelector('#theme-card .note[role=status]') ? document.querySelector('#theme-card .note[role=status]').textContent : '') && db.home.theme.accent.toLowerCase() === '#8a6038'));
  // AI ideas (Claude answers are drafts)
  await p.fill('#theme-mood', 'lotus pond'); await p.click('#theme-card button:has-text("Suggest 3 ideas")'); await sleep(300);
  ok('colours AI: without Claude connected it still offers 3 ready-made colour sets that fit the words, and says so', await ev(() => document.querySelectorAll('#theme-card .th-draft').length === 3 && /not connected/i.test(document.querySelector('#theme-card .note[role=status]').textContent) && document.querySelector('#theme-card .th-draft b').textContent === 'Rose'));
  await ev(() => { db.settings.assistantUrl = 'https://assistant.test'; sessionStorage.setItem('wa_admin_tok', 't'); window.aiCall = async (task, input) => { window.__aiTask = { task, input }; return { data: { palettes: [{ name: 'Lotus', accent: '#9b3a55', ink: '#2e1a22', bg: '#fcf7f8', cream: '#f6e9ed', sage: '#7a6a70', why: 'Soft pink like a lotus' }, { name: 'Bad one', accent: 'red', ink: '#000000', bg: '#ffffff', cream: '#eeeeee', sage: '#999999', why: 'invalid colour word' }, { name: 'Moss', accent: '#3f6b3a', ink: '#1b2a1a', bg: '#f8faf6', cream: '#eaf0e4', sage: '#6c7f63', why: 'Calm green' }] } }; }; renderHomeAdmin(document.getElementById('adminContent')); });
  await p.fill('#theme-mood', 'lotus pond'); await p.click('#theme-card button:has-text("Suggest 3 ideas")'); await sleep(500);
  ok('colours AI: asks for ideas using the mood and the current colours, and shows only valid ideas as drafts (nothing changes yet)', await ev(() => window.__aiTask.task === 'palette' && window.__aiTask.input.mood === 'lotus pond' && window.__aiTask.input.current.accent === '#8a6038' && document.querySelectorAll('#theme-card .th-draft').length === 2 && getComputedStyle(document.documentElement).getPropertyValue('--gold').trim().toLowerCase() === '#8a6038'));
  await p.click('#theme-card .th-draft button'); await sleep(200); ok('colours AI: "Use these" applies the chosen idea to the website', await css('--gold') === '#9b3a55' && await ev(() => db.home.theme.sage === '#7a6a70'));
  await ev(() => themeReset());
  // ---- AI help for the Notes wording (also works without Claude) ----
  await ev(() => { sessionStorage.removeItem('wa_admin_tok'); renderHomeAdmin(document.getElementById('adminContent')); });
  await ev(() => { window.__t0 = db.home.notes.title; });
  await p.fill('#notes-ai-mood', 'warm'); await p.click('#notes-card button:has-text("Suggest 3 wordings")'); await sleep(300);
  ok('notes AI: without Claude it shows 3 built-in wordings and says so; nothing changes until "Use these"', await ev(() => document.querySelectorAll('#notes-card .th-draft').length === 3 && /not connected/i.test(document.querySelector('#notes-card .note[role=status]').textContent) && db.home.notes.title === window.__t0));
  await ev(() => { sessionStorage.setItem('wa_admin_tok', 't'); window.aiCall = async (task, input) => { window.__aiNotes = { task, input }; return { data: { variants: [{ label: 'Letters', title: 'A letter from the loom', text: 'Now and then we write a few lines about a saree or a weave.', button: 'Write to me' }, { label: '', title: '', text: '', button: '' }, { label: 'x'.repeat(90), title: 'T'.repeat(90), text: 'y'.repeat(400), button: 'b'.repeat(60) }] } }; }; renderHomeAdmin(document.getElementById('adminContent')); });
  await p.fill('#notes-ai-mood', 'like a letter'); await p.click('#notes-card button:has-text("Suggest 3 wordings")'); await sleep(300);
  ok('notes AI: with Claude it asks for wording from the mood and the current text, drops empty drafts and trims over-long ones', await ev(() => window.__aiNotes.task === 'notes' && window.__aiNotes.input.mood === 'like a letter' && !!window.__aiNotes.input.current.title && document.querySelectorAll('#notes-card .th-draft').length === 2 && [...document.querySelectorAll('#notes-card .th-draft')].every(d => d.textContent.length < 520)));
  await p.click('#notes-card .th-draft button'); await sleep(200);
  ok('notes AI: "Use these" puts the wording on the home page at once', await ev(() => db.home.notes.title === 'A letter from the loom' && db.home.notes.button === 'Write to me' && /A letter from the loom/.test(document.getElementById('homeNotes').textContent)));
  ok('AI Helper switches: the three home-page helpers are listed so they can be switched off', await ev(() => ['Moments wording', 'Notes from the loom wording', 'Website colour ideas'].every(l => AI_FEATURES.some(f => f[1].startsWith(l)))));
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
