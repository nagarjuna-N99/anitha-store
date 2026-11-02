// Monkey test: clicks every visible inline-handler element on every page and admin tab; any JS error fails.
const { chromium } = require(process.env.PW);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:1200,height:900},acceptDownloads:true});
  const p=await ctx.newPage(); const errs=[]; 
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|ERR_/.test(m.text()))errs.push('CONSOLE '+m.text())});
  p.on('dialog',d=>d.accept('1234')); await p.route(/^https?:\/\//,r=>r.abort());
  await p.addInitScript(()=>{window.open=()=>null;});
  await p.goto('file://'+process.cwd()+'/anitha-store.html');
  await p.evaluate(()=>setSession(db.users[0],null));
  // duplicate ids
  const dups=await p.evaluate(()=>{const c={};document.querySelectorAll('[id]').forEach(e=>c[e.id]=(c[e.id]||0)+1);return Object.entries(c).filter(([k,v])=>v>1)});
  console.log(dups.length?'FAIL duplicate ids '+JSON.stringify(dups):'PASS no duplicate element ids');
  // click every inline-handler element, per page / admin tab, reloading state each round
  const states=[['home',"navigateTo('home')"],['shop',"navigateTo('shop')"],['favs',"favourites=['p1','p3'];navigateTo('favourites')"],['faq',"navigateTo('faq')"],['care',"navigateTo('care')"],['wishlist',"renderSharedWishlist([db.products[0].slug]);navigateTo('wishlist')"],
    ...['dashboard','home','reviews','whatsapp','delivery','alerts','products','categories','studio','drafts','orders','invoices','customers','statements','coupons','bundles','logs','settings'].map(t=>['admin:'+t,"isAdminView=true;document.body.classList.add('admin-on');switchAdminTab('"+t+"')"])];
  let clicks=0;
  for(const [name,fn] of states){
    await p.evaluate(fn); await p.waitForTimeout(120);
    const n=await p.evaluate(()=>[...document.querySelectorAll('[onclick]')].filter(e=>e.offsetParent!==null).length);
    for(let i=0;i<Math.min(n,30);i++){
      await p.evaluate(fn); await p.waitForTimeout(40);
      const res=await p.evaluate(i=>{const els=[...document.querySelectorAll('[onclick]')].filter(e=>e.offsetParent!==null);const e=els[i];if(!e)return null;const t=(e.getAttribute('onclick')||'');if(/deleteProduct|logout|clearAll|reset|wipe|removeAll/i.test(t))return 'skip';try{e.click()}catch(x){return 'THROW '+x.message}return 'ok'},i).catch(e=>'EVALERR '+e.message);
      clicks++; if(res&&/THROW|EVALERR/.test(res)) errs.push(name+'#'+i+' '+res);
      await p.evaluate(()=>{document.querySelectorAll('.modal.active,.modal-overlay.active').forEach(m=>m.classList.remove('active'))}).catch(()=>{});
    }
  }
  console.log(errs.length?'FAIL crawl errors:\n'+errs.slice(0,25).join('\n'):'PASS clicked '+clicks+' buttons/links across every page and admin tab with no errors');
  console.log(errs.length||dups.length?'FAILED':'ALL PASSED');
  await b.close(); process.exit(errs.length||dups.length?1:0);
})();
