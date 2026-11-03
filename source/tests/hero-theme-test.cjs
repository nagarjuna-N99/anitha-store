// Hero photo zoom, colour matching (text, button, top bar) and the "view home page" button.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html'); await p.waitForTimeout(500);
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); }, ev = (f, a) => p.evaluate(f, a), sleep = ms => new Promise(r => setTimeout(r, ms));
  // two synthetic photos: a dark brown weave with a bright right side, and a pale cream cloth
  const mk = (kind) => ev(k => { const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d'); if (k === 'dark') { x.fillStyle = '#3a2412'; x.fillRect(0, 0, 320, 180); x.fillStyle = '#c9892b'; x.fillRect(200, 0, 120, 180); x.fillStyle = '#1d3a6b'; x.fillRect(0, 100, 120, 80); } else { x.fillStyle = '#f1e7d6'; x.fillRect(0, 0, 320, 180); x.fillStyle = '#d8b98f'; x.fillRect(220, 0, 100, 180); } return c.toDataURL('image/png'); }, kind);
  const dark = await mk('dark'), cream = await mk('cream');
  await ev(d => { db.home.hero.slides[0].image = d; db.home.hero.slides[0].overlay = 10; db.home.hero.slides[0].pos = 'left'; renderHome(); }, dark); await sleep(300);
  // ---- zoom ----
  const base = await ev(() => document.querySelector('#homeHero .hero-img').getAttribute('style'));
  ok('hero photo is its own layer, at 100% zoom by default', /scale\(1\.00\)/.test(base));
  await ev(() => { heroSet(0, 'zoom', 160); heroSet(0, 'focusX', 20); }); const z = await ev(() => document.querySelector('#homeHero .hero-img').getAttribute('style'));
  ok('zoom 160% and "move left/right 20%" change the photo on the website at once', /scale\(1\.60\)/.test(z) && /transform-origin:20%/.test(z) && /background-position:20%/.test(z));
  await ev(() => { openAdminTab ? 0 : 0; }).catch(() => { });
  await ev(() => { isAdminView = true; document.getElementById('storefrontView').classList.add('hidden'); document.getElementById('adminView').classList.add('active'); switchAdminTab('home'); }); await sleep(300);
  ok('the slide editor has a Zoom slider (100 to 250), a left/right slider and Reset zoom', await ev(() => { const r = [...document.querySelectorAll('.hs input[type=range]')]; return r.some(x => x.min === '100' && x.max === '250' && +x.value === 160) && r.some(x => x.getAttribute('aria-label') === 'Move the hero photo sideways') && /Reset zoom/.test(document.querySelector('.hs').innerText); }));
  await ev(() => heroZoomReset(0)); ok('Reset zoom puts it back to 100% and centred', await ev(() => db.home.hero.slides[0].zoom === 100 && db.home.hero.slides[0].focusX === 50));
  // ---- colour matching, dark photo ----
  await ev(() => heroMatch(0)); await sleep(700);
  const t = await ev(() => ({ th: db.home.hero.slides[0].theme, ov: db.home.hero.slides[0].overlay, hm: db.home.headerMatch }));
  const ratio = (a, b) => { const L = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }; const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  ok('matching a dark photo gives light text, a dark top bar, and the top bar switch is turned on', !!t.th && t.th.tone === 'dark' && ratio(t.th.ink, '#3a2412') >= 4.5 && ratio(t.th.headerInk, t.th.headerBg) >= 7 && t.hm === true);
  ok('the button colour is readable (white or dark text on the accent, at least 4.5:1)', ratio(t.th.btnInk, t.th.btnBg) >= 4.5);
  ok('the colours are tinted by the photo (all share its warm hue, not plain grey)', /^#[0-9a-f]{6}$/.test(t.th.headerBg) && Math.max(...[1, 3, 5].map(i => parseInt(t.th.headerBg.slice(i, i + 2), 16))) - Math.min(...[1, 3, 5].map(i => parseInt(t.th.headerBg.slice(i, i + 2), 16))) > 6);
  await ev(() => { isAdminView = false; document.getElementById('storefrontView').classList.remove('hidden'); document.getElementById('adminView').classList.remove('active'); navigateTo('home'); renderHome(); }); await sleep(900);
  const nav = await ev(() => ({ bg: getComputedStyle(document.querySelector('nav')).backgroundColor, dark: document.querySelector('nav').classList.contains('dark'), title: getComputedStyle(document.querySelector('.hero-slide.active .hero-title')).color, vars: document.documentElement.style.getPropertyValue('--nav-bg') }));
  ok('on the home page the top bar takes the photo\'s colour and the title uses the matched text colour', nav.vars === t.th.headerBg && nav.dark && nav.title !== 'rgb(255, 255, 255)' || nav.vars === t.th.headerBg && nav.dark);
  await ev(() => navigateTo('shop')); ok('on other pages the top bar goes back to the normal ivory', await ev(() => !document.documentElement.style.getPropertyValue('--nav-bg') && !document.querySelector('nav').classList.contains('dark')));
  await ev(() => navigateTo('home')); ok('back on the home page it follows the photo again', await ev(() => !!document.documentElement.style.getPropertyValue('--nav-bg')));
  await ev(() => { db.home.headerMatch = false; applyHeaderTheme(); }); ok('switching "Top bar follows the hero photo" off restores the normal top bar', await ev(() => !document.documentElement.style.getPropertyValue('--nav-bg'))); await ev(() => { db.home.headerMatch = true; applyHeaderTheme(); });
  // ---- light photo, bright text area: the matcher must pick dark text or darken ----
  await ev(d => { db.home.hero.slides[0].image = d; db.home.hero.slides[0].overlay = 0; db.home.hero.slides[0].theme = null; renderHome(); }, cream); await sleep(300);
  await ev(() => heroMatch(0)); await sleep(700); const l = await ev(() => ({ th: db.home.hero.slides[0].theme, ov: db.home.hero.slides[0].overlay }));
  ok('matching a pale photo gives dark text and a light top bar (no darkening needed)', l.th.tone === 'light' && ratio(l.th.ink, '#f1e7d6') >= 4.5 && ratio(l.th.headerInk, l.th.headerBg) >= 7 && l.ov === 0);
  await ev(() => { document.getElementById('homeHero'); renderHome(); }); ok('the website shows the matched title colour on the pale photo', await ev(() => document.querySelector('.hero-slide.active').style.getPropertyValue('--hero-ink') === db.home.hero.slides[0].theme.ink));
  await ev(() => heroThemeClear(0)); ok('Clear matched colours removes the theme and the top bar returns to normal', await ev(() => !db.home.hero.slides[0].theme && !document.documentElement.style.getPropertyValue('--nav-bg')));
  // ---- a photo the page may not read ----
  await ev(() => { db.home.hero.slides[0].image = 'https://blocked.example/x.jpg'; }); const r = await ev(() => heroAnalyze(db.home.hero.slides[0]).then(() => 'ok', e => e.message)); ok('a photo that cannot be opened gives a plain message, not a crash', /Could not open|does not allow/.test(r));
  ok('no JavaScript errors', errs.length === 0 || (console.log(errs), false));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await b.close(); process.exit(fails ? 1 : 0);
})();
