#!/usr/bin/env python3
"""Turns the GitHub Pages copy of the website into a signpost to the real address (the shop's own server).
usage: python3 tools/redirect-pages.py <checkout-folder> <https://new-address> [old-path-prefix, default /anitha-store]
Every page file (home, each page folder, 404.html) becomes a tiny page that sends the visitor to the same page on the new address
(keeping the path, search and #part). The old site map is removed and robots.txt lets search engines follow the move."""
import os, sys, json
repo, target = sys.argv[1], sys.argv[2].rstrip('/'); prefix = (sys.argv[3] if len(sys.argv) > 3 else '/anitha-store').rstrip('/')
PAGES = ['collection', 'saree-care', 'journal', 'faq', 'terms', 'privacy', 'my-wishlist']
def stub(path):
    url = target + path
    js = "var t=%s,p=location.pathname;if(p.indexOf(%s)===0)p=p.slice(%d);location.replace(t+(p||'/')+location.search+location.hash)" % (json.dumps(target), json.dumps(prefix + '/'), len(prefix))
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anitha Pemmasani: we have moved</title>'
            '<link rel="canonical" href="%s"><meta http-equiv="refresh" content="1;url=%s"><script>%s</script></head>'
            '<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px"><h1 style="font-weight:600">Anitha Pemmasani</h1><p>We have a new address.</p><p><a href="%s">%s</a></p></body></html>\n') % (url, url, js, url, url)
def write(rel, path):
    f = os.path.join(repo, rel); os.makedirs(os.path.dirname(f) or repo, exist_ok=True); open(f, 'w', encoding='utf-8').write(stub(path))
write('index.html', '/'); write('404.html', '/')
for p in PAGES: write(p + '/index.html', '/' + p + '/')
sm = os.path.join(repo, 'sitemap.xml')
if os.path.exists(sm): os.remove(sm)
open(os.path.join(repo, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\n')
print('Pages copy now points to', target)
