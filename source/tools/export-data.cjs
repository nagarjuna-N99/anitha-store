const { chromium } = require(process.env.PW); const fs = require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage();await p.route(/^https?:\/\//,r=>r.abort());await p.goto('file://'+process.cwd()+'/anitha-store.html');
const out=await p.evaluate(()=>({store:JSON.parse(JSON.stringify(db)),catalogue:buildAssistantCatalogue()}));
fs.writeFileSync('data-export/anitha-store-data.json',JSON.stringify(out.store,null,2));
fs.writeFileSync('data-export/assistant-catalogue.json',JSON.stringify(out.catalogue,null,2));
console.log(Object.keys(out.store).join(','), out.store.products.length);await b.close()})()
