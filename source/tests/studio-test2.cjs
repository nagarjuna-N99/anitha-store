const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctxt = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const p = await ctxt.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/Failed to load resource|ERR_FAILED/.test(m.text()) && errs.push('console: '+m.text()));
  p.on('dialog', d => d.accept('1234'));
  await p.route(/^https?:\/\//, r => r.abort());
  await p.goto('file://' + process.cwd() + '/anitha-store.html');
  let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
  const raf = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { toggleView(); S.oneProduct = false; switchAdminTab('studio'); });
  const mk = (color, w, h) => p.evaluate(async ([color, w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, w, h); const bl = await new Promise(r => c.toBlob(r, 'image/png')); return Array.from(new Uint8Array(await bl.arrayBuffer())); }, [color, w, h]);
  const add = async (arr, name) => p.evaluate(([arr, name]) => studioAddFiles([new File([new Uint8Array(arr)], name, { type: 'image/png' })]), [arr, name]);

  // ---- duplicates gone ----
  const txt = await p.evaluate(() => document.getElementById('adminContent').innerText);
  ok('no "Process All" / "Save All Drafts" / SKU preview / AP Image Studio heading', !/Process All|Save All Drafts|Live Preview|AP Image Studio/.test(txt) && !(await p.$('#skuPreviewText')) && !(await p.$('#skuDisplay')));
  ok('single upload entry point in toolbar (+ empty-state drop zone)', (await p.$$('button:has-text("Add images")')).length === 1);
  ok('empty state shown', await p.evaluate(() => getComputedStyle(gid('studioEmpty')).display !== 'none'));

  await add(await mk('#b03060', 600, 800), 'red saree.png');
  await p.waitForFunction(() => S.images.length === 1 && document.querySelectorAll('.film-item:not(.film-add)').length === 1);
  await add(await mk('#2060b0', 800, 600), 'blue_saree.png');
  await p.waitForFunction(() => S.images.length === 2);
  ok('filmstrip shows 2 + add tile; new image selected', await p.evaluate(() => document.querySelectorAll('.film-item').length === 3 && S.current === 1));
  ok('multi-image: Save-all + ZIP labels appear', await p.evaluate(() => /Save all 2/.test(document.querySelector('.studio-bar').innerText) && /Download ZIP/.test(document.querySelector('.studio-bar').innerText)));
  await p.evaluate(() => studioSelect(0)); await raf();

  // ---- bigger edit view ----
  const geo = () => p.evaluate(() => { const s = gid('studioStage').getBoundingClientRect(), c = gid('studioCanvas').getBoundingClientRect(); return { sw: s.width, sh: s.height, cw: c.width, ch: c.height, ratio: c.width / c.height }; });
  let g = await geo();
  ok(`canvas fills the stage (stage ${Math.round(g.sw)}x${Math.round(g.sh)}, canvas ${Math.round(g.cw)}x${Math.round(g.ch)})`, (g.sh - g.ch < 70 || g.sw - g.cw < 30) && g.cw <= g.sw && g.ch <= g.sh);
  ok('canvas aspect ratio preserved (800:1000)', Math.abs(g.ratio - 0.8) < 0.01);
  ok('stage is tall (>= 60% of viewport)', g.sh >= 950 * 0.6);
  const normalH = g.ch;
  await p.evaluate(() => { const s = gid('studioStage').parentElement.querySelector('.studio-bar'); });
  await p.click('button:has-text("Full screen")'); await raf(); await raf();
  ok('full screen hides admin sidebar/header', await p.evaluate(() => document.body.classList.contains('studio-focus') && getComputedStyle(document.querySelector('.admin-sidebar')).display === 'none'));
  g = await geo();
  ok(`full screen canvas is bigger (${Math.round(normalH)} → ${Math.round(g.ch)})`, g.ch > normalH + 40);
  await p.click('button:has-text("Hide controls")'); await raf(); await raf();
  const g2 = await geo();
  ok('hide controls widens the stage', g2.sw > g.sw + 250 && !(await p.isVisible('.studio-side')));
  await p.click('button:has-text("Show controls")'); await p.click('button:has-text("Exit full screen")'); await raf();
  ok('exit restores layout', await p.evaluate(() => !document.body.classList.contains('studio-focus') && !!document.querySelector('.admin-sidebar') && getComputedStyle(document.querySelector('.admin-sidebar')).display !== 'none'));
  await p.evaluate(() => { S.size = 'thumb'; }); await p.evaluate(() => setSize('thumb')); await raf();
  g = await geo();
  ok('small 400x400 output is scaled UP to fill the stage', g.cw > 500);
  await p.evaluate(() => setSize('product')); await raf();

  // ---- controls are live & don't lose scroll ----
  await p.evaluate(() => { S.open.wm = true; S.open.logo = true; S.open.export = true; ['wm','logo','export'].forEach(k => gid('acc-'+k).classList.add('open')); const sd = document.querySelector('.studio-side'); sd.scrollTop = 150; window.__st = sd.scrollTop; });
  await p.evaluate(() => setBg('#D4C4A8')); await p.evaluate(() => setFit('contain')); await raf();
  ok('bg/fit/size changes keep panel scroll (no re-render)', await p.evaluate(() => document.querySelector('.studio-side').scrollTop === window.__st && window.__st > 50));
  ok('contain letterbox shows chosen bg live', await p.evaluate(() => { const c = gid('studioCanvas'); const d = c.getContext('2d').getImageData(3, 3, 1, 1).data; return d[0]===0xD4 && d[1]===0xC4 && d[2]===0xA8; }));
  await p.evaluate(() => { setFit('cover'); setBg('#FAF9F6'); }); await raf();
  ok('colour preserved (no filters)', await p.evaluate(() => { const c = gid('studioCanvas'); const d = c.getContext('2d').getImageData(c.width/2, c.height/2, 1, 1).data; return d[0]===0xb0 && d[1]===0x30 && d[2]===0x60; }));
  ok('size/bg/fit buttons mark exactly one active', await p.evaluate(() => document.querySelectorAll('[data-size].active').length === 1 && document.querySelectorAll('[data-bg].active').length === 1 && document.querySelectorAll('[data-fit].active').length === 1));

  // ---- SKU ----
  await p.click('#acc-sku .acc-head');
  ok('accordion opens', await p.isVisible('#acc-sku .acc-body'));
  await p.selectOption('#acc-sku select >> nth=0', 'TUS');
  ok('auto SKU continues after catalogue', await p.evaluate(() => S.images.map(i => i.sku).join() === 'AP-TUS-003,AP-TUS-004' && gid('skuInput').value === 'AP-TUS-003'));
  await p.fill('#skuInput', 'ap-custom-9');
  ok('manual SKU per image + Auto button appears', await p.evaluate(() => S.images[0].sku === 'AP-CUSTOM-9' && S.images[1].sku === 'AP-TUS-004' && gid('skuAuto').style.display !== 'none'));
  await p.click('#skuAuto');
  ok('Auto restores numbering', await p.evaluate(() => S.images[0].sku === 'AP-TUS-003' && !S.images[0].manualSku));
  await p.click('#tg-sku');
  ok('header toggle turns SKU on', await p.evaluate(() => S.sku.on));
  await p.click('#tg-wm');
  ok('toggling a section on auto-opens it', await p.evaluate(() => S.wm.on && document.getElementById('acc-wm').classList.contains('open')));
  await raf();
  ok('watermark hitbox measured', await p.evaluate(() => S.boxes.wm && S.boxes.wm.w > 20));
  const logo = await mk('#00aa00', 100, 50);
  await p.evaluate(arr => { const f = new File([new Uint8Array(arr)], 'logo.png', { type: 'image/png' }); const dt = new DataTransfer(); dt.items.add(f); const i = gid('logoInput'); i.files = dt.files; i.dispatchEvent(new Event('change')); }, logo);
  await p.waitForFunction(() => !!S.logo.img && S.logo.on);
  await raf();
  ok('uploading a logo switches it on', await p.evaluate(() => gid('tg-logo').classList.contains('active') && Math.round(S.boxes.logo.h) === 60));

  // ---- drag / zoom / lock ----
  const drag = async (fx, fy, dx, dy) => { const bb = await p.locator('#studioCanvas').boundingBox(); await p.mouse.move(bb.x + bb.width*fx, bb.y + bb.height*fy); await p.mouse.down(); await p.mouse.move(bb.x + bb.width*fx + dx, bb.y + bb.height*fy + dy, { steps: 4 }); await p.mouse.up(); await raf(); };
  const lp0 = await p.evaluate(() => ({...S.logoPos}));
  await drag(0.5, 0.5, 30, 20);
  ok('drag logo', await p.evaluate(l => S.logoPos.x > l.x && curImg().pz.offsetX === 0, lp0));
  const wp0 = await p.evaluate(() => ({...S.wmPos}));
  await drag(0.5, 0.9, -40, -30);
  ok('drag watermark', await p.evaluate(w => S.wmPos.x < w.x && S.wmPos.y < w.y, wp0));
  await drag(0.1, 0.3, 50, 0);
  ok('drag empty area pans image', await p.evaluate(() => curImg().pz.offsetX > 20));
  await p.click('#zIn'); await p.click('#zIn'); await raf();
  ok('zoom +,+ = 121% (readout + header update)', await p.evaluate(() => Math.round(curImg().pz.scale*100) === 121 && gid('zLevel').textContent === '121%' && /121%/.test(gid('studioReadout').textContent)));
  const bb = await p.locator('#studioCanvas').boundingBox(); await p.mouse.move(bb.x+20, bb.y+20); await p.mouse.wheel(0, 100); await raf();
  ok('wheel zoom out', await p.evaluate(() => curImg().pz.scale < 1.21));
  await p.dblclick('#studioCanvas'); await raf();
  ok('double-click resets zoom & position', await p.evaluate(() => curImg().pz.scale === 1 && curImg().pz.offsetX === 0));

  // ---- keyboard (focus the page body, not an input) ----
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('Shift+ArrowDown'); await raf();
  ok('arrows nudge 10px, Shift×5', await p.evaluate(() => curImg().pz.offsetX === 10 && curImg().pz.offsetY === 50));
  await p.keyboard.press('+'); await raf();
  ok('+ zooms in', await p.evaluate(() => Math.round(curImg().pz.scale*100) === 110));
  await p.keyboard.press('0'); await raf();
  ok('0 resets', await p.evaluate(() => curImg().pz.scale === 1 && curImg().pz.offsetX === 0));
  await p.keyboard.press(']'); await raf();
  ok('] next image, [ previous', await p.evaluate(() => S.current === 1) );
  await p.keyboard.press('['); 
  await p.keyboard.press('l'); await raf();
  ok('L locks', await p.evaluate(() => curImg().locked));
  const off = await p.evaluate(() => curImg().pz.offsetX);
  await p.keyboard.press('ArrowLeft'); await drag(0.1, 0.3, 60, 0); await p.click('#zIn');
  ok('locked: keys, drag and zoom ignored', await p.evaluate(o => curImg().pz.offsetX === o && curImg().pz.scale === 1, off));
  ok('lock icon in filmstrip; lock is per image', await p.evaluate(() => /🔒/.test(document.querySelector('.film-item.active .film-sku').textContent) && !S.images[1].locked));
  await p.keyboard.press('l');
  await p.fill('#skuInput', 'x'); await p.keyboard.press('ArrowRight');
  ok('shortcuts ignored while typing in a field', await p.evaluate(() => curImg().pz.offsetX === 0));
  await p.fill('#skuInput', ''); await p.evaluate(() => document.activeElement.blur());

  // ---- export / drafts / post (processing is automatic) ----
  const dls = []; p.on('download', d => dls.push(d.suggestedFilename()));
  await p.evaluate(() => studioDownloadAll()); await p.waitForTimeout(1500);
  ok('Download auto-processes: 2 files named *_product.jpg', dls.length === 2 && dls.every(n => /_product\.jpg$/.test(n)));
  await p.evaluate(() => sIn('wm.size', 40));
  ok('changing a setting invalidates processed images', await p.evaluate(() => S.images.every(i => !i.processed)));
  await p.click('.bg-swatch.transparent'); await raf();
  await p.evaluate(() => studioEnsure(S.images));
  ok('transparent bg exports png', await p.evaluate(() => S.images.every(i => i.processed.ext === 'png')));
  await p.click('.bg-swatch >> nth=0');
  await p.evaluate(() => studioSaveDrafts(true)); await p.waitForFunction(() => db.drafts.length === 2);
  await p.evaluate(() => studioSaveDrafts(false)); await p.waitForTimeout(400);
  ok('drafts saved, re-save updates in place', await p.evaluate(() => db.drafts.length === 2 && db.drafts.every(d => d.image.startsWith('data:image/jpeg'))));
  await p.evaluate(() => studioPost()); await p.waitForSelector('#p-name');
  ok('post prefills name/sku/category/image', await p.evaluate(() => gid('p-name').value === 'red saree' && gid('p-sku').value === 'AP-TUS-003' && gid('p-cat').value === 'Tussar' && PF.images[0].startsWith('data:image')));
  await p.fill('#p-desc', 'Test'); await p.fill('#p-price', '1000');
  await p.evaluate(() => document.querySelector('#adminModalBody form').requestSubmit());
  ok('product created, its draft consumed', await p.evaluate(() => db.products.some(x => x.sku === 'AP-TUS-003') && db.drafts.length === 1));

  // ---- persistence / filmstrip actions ----
  await p.evaluate(() => { document.querySelector('.studio-side').scrollTop = 120; S.open.export = true; switchAdminTab('orders'); switchAdminTab('studio'); });
  ok('state survives tab switch (images, settings, open sections)', await p.evaluate(() => document.querySelectorAll('.film-item:not(.film-add)').length === 2 && S.wm.size === 40 && S.logo.img && gid('acc-export').classList.contains('open')));
  await p.evaluate(() => { document.querySelector('.studio-side').scrollTop = 120; studioRerender(); });
  ok('panel scroll preserved across re-render', await p.evaluate(() => document.querySelector('.studio-side').scrollTop === 120));
  ok('focus mode is cleared when leaving the studio tab', await p.evaluate(() => { S.focus = true; studioRerender(); switchAdminTab('orders'); const r = !document.body.classList.contains('studio-focus'); S.focus = false; switchAdminTab('studio'); return r; }));
  await p.evaluate(() => editDraft(0)); await p.waitForFunction(() => S.images.length === 1 && S.images[0].draftId);
  ok('edit draft replaces the batch with that product', await p.evaluate(() => S.images[0].manualSku && S.current === 0 && S.oneProduct));
  await p.evaluate(() => studioRemove(0));
  ok('remove image', await p.evaluate(() => S.images.length === 0));
  console.log('page errors:', errs.length ? errs : 'none');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await b.close();
})();
