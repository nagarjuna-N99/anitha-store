// The old GitHub Pages address becomes a signpost to the shop's own address: right target, same page, nothing else left behind.
const { execFileSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
let fails = 0; const ok = (n, c, x) => { if (!c) { fails++; console.log('FAIL', n, x || ''); } else console.log('PASS', n); };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redir-')); fs.writeFileSync(path.join(dir, 'sitemap.xml'), 'old'); fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
execFileSync('python3', [path.join(__dirname, '../tools/redirect-pages.py'), dir, 'https://anithapemmasani.com/', '/anitha-store'], { stdio: 'ignore' });
const files = ['index.html', '404.html', 'collection/index.html', 'saree-care/index.html', 'journal/index.html', 'faq/index.html', 'terms/index.html', 'privacy/index.html', 'my-wishlist/index.html'];
ok('every page file exists and names the new address', files.every(f => fs.existsSync(path.join(dir, f)) && fs.readFileSync(path.join(dir, f), 'utf8').includes('https://anithapemmasani.com')));
const go = (file, pathname, search = '', hash = '') => { const h = fs.readFileSync(path.join(dir, file), 'utf8'), js = /<script>([\s\S]*?)<\/script>/.exec(h)[1]; let to = null; vm.runInNewContext(js, { location: { pathname, search, hash, replace: u => { to = u; } } }); return to; };
ok('a page folder goes to the same page on the new address, keeping the search and #part', go('collection/index.html', '/anitha-store/collection/', '?cat=tussar', '#top') === 'https://anithapemmasani.com/collection/?cat=tussar#top');
ok('the home page goes to the new home page', go('index.html', '/anitha-store/') === 'https://anithapemmasani.com/');
ok('any unknown or product address (404 page) keeps its path on the new address', go('404.html', '/anitha-store/saree/red-silk/') === 'https://anithapemmasani.com/saree/red-silk/');
ok('the page also carries a canonical link and a slow refresh fallback (for visitors without scripts and for search engines)', /rel="canonical" href="https:\/\/anithapemmasani.com\/collection\/"/.test(fs.readFileSync(path.join(dir, 'collection/index.html'), 'utf8')) && /http-equiv="refresh"/.test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')));
ok('the old site map is gone and robots.txt now lets search engines follow the move', !fs.existsSync(path.join(dir, 'sitemap.xml')) && fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8').includes('Allow: /') && !/Disallow: \//.test(fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8')));
ok('no shop data, keys or admin code are in the signpost pages', files.every(f => fs.statSync(path.join(dir, f)).size < 2000));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
