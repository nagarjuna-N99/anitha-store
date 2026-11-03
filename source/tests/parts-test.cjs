// The website is written as parts in src/ and joined into anitha-store.html. These checks keep that honest.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'); let fails = 0; const ok = (n, c) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n); };
const man = JSON.parse(fs.readFileSync(path.join(root, 'src', 'manifest.json'), 'utf8')).parts;
const listed = man.flatMap(p => p.file ? [p.file] : p.files);
const onDisk = ['css', 'html', 'js'].flatMap(d => fs.readdirSync(path.join(root, 'src', d)).map(f => d + '/' + f));
ok('every part file on disk is in the manifest (nothing left out of the page)', onDisk.sort().join() === [...listed].sort().join());
ok('no part is listed twice', new Set(listed).size === listed.length);
ok('there is a part for each feature: more than 40 script parts, css parts, and the storefront and owner app markup', listed.filter(f => f.startsWith('js/')).length > 40 && listed.filter(f => f.startsWith('css/')).length >= 15 && listed.includes('html/' + onDisk.find(f => /storefront\.html$/.test(f)).split('/')[1]));
let r = cp.spawnSync('python3', [path.join(root, 'tools', 'join-parts.py'), '--check']);
ok('anitha-store.html is exactly the joined parts (nobody edited it by hand)', r.status === 0);
const html = fs.readFileSync(path.join(root, 'anitha-store.html'), 'utf8');
ok('the joined page still has all four style blocks, the body and a single script', (html.match(/^<style/gm) || []).length === 4 && /<body>/.test(html) && /<\/body>\s*<\/html>\s*$/.test(html));
const shared = listed.filter(f => /shared-/.test(f)); ok('the three shared code blocks have their own part files', shared.length === 3);
r = cp.spawnSync('python3', [path.join(root, 'tools', 'sync-shared.py')]); ok('syncing the shared code changes nothing (parts and server copies agree)', r.status === 0 && cp.spawnSync('python3', [path.join(root, 'tools', 'join-parts.py'), '--check']).status === 0);
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
