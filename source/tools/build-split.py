#!/usr/bin/env python3
"""Builds the two separate pages from the one source file anitha-store.html.

  build/site/index.html          the PUBLIC website  (no admin screens, no PIN, no demo customers). Put it on any static host.
  wa-assistant/public/admin.html the OWNER app       (served only by the server at /admin, behind a real login)

Usage: python3 tools/build-split.py [--shop-api https://shop.example.com] [--index]   (--index lets Google list the website)
"""
import re, sys, os, argparse
ap = argparse.ArgumentParser(); ap.add_argument('--shop-api', default=''); ap.add_argument('--index', action='store_true'); a = ap.parse_args()
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, 'anitha-store.html'), encoding='utf-8').read()

def strip_div(html, open_pat):
    """remove one <div ...> element whose opening tag matches open_pat, with everything inside it"""
    m = re.search(open_pat, html); assert m, 'not found: ' + open_pat
    i, depth = m.start(), 0
    for t in re.finditer(r'<(/?)div\b[^>]*>', html[m.start():]):
        depth += -1 if t.group(1) else 1
        if depth == 0: return html[:i] + html[m.start() + t.end():]
    raise SystemExit('unbalanced div for ' + open_pat)

def common(h):
    # demo bank details and the demo PIN never ship in either hosted file
    h = re.sub(r"bankName: '[^']*', accountNumber: '[^']*', ifscCode: '[^']*'", "bankName: '', accountNumber: '', ifscCode: ''", h)
    h = h.replace("adminPin: '1234'", "adminPin: ''")
    h = re.sub(r'<button id="view-toggle"[^>]*>.*?</button>', '', h, flags=re.S)
    h = re.sub(r'\s*<li class="owner-entry"[^>]*>.*?</li>', '', h)
    h = re.sub(r'<li class="owner-foot">.*?</li>', '', h)
    return h

def inject(h, script, title=None, robots=None):
    assert '<head>' in h
    extra = ('<meta name="robots" content="%s">' % robots if robots else '') + '<script>%s</script>' % script
    h = h.replace('<head>', '<head>' + extra, 1)
    if title: h = re.sub(r'<title>.*?</title>', '<title>%s</title>' % title, h, count=1, flags=re.S)
    return h

# ---- the public website ----
site = common(src)
site = strip_div(site, r'<div id="adminView"[^>]*>')
site = strip_div(site, r'<div class="admin-mobile-nav" id="adminMobileNav">')
site = site.replace('<!-- ================= ADMIN', '<!-- ================= ADMIN')            # comments are harmless
site = inject(site, "window.__BUILD='site';window.__SHOP_API=%s;" % repr(a.shop_api.rstrip('/')).replace("'", '"'), robots=None if a.index else 'noindex, nofollow')
assert "adminPin: '1234'" not in site and 'HDFC0001234' not in site and '50100123456789' not in site, 'a secret is still in the public site'
assert 'id="adminView"' not in site and 'id="adminMobileNav"' not in site and 'id="view-toggle"' not in site
os.makedirs(os.path.join(root, 'build', 'site'), exist_ok=True)
open(os.path.join(root, 'build', 'site', 'index.html'), 'w', encoding='utf-8').write(site)

# ---- the owner app ----
adm = common(src)
adm = inject(adm, "window.__BUILD='admin';", title='Owner admin', robots='noindex, nofollow')
os.makedirs(os.path.join(root, 'wa-assistant', 'public'), exist_ok=True)
open(os.path.join(root, 'wa-assistant', 'public', 'admin.html'), 'w', encoding='utf-8').write(adm)
print('built: build/site/index.html (%d KB), wa-assistant/public/admin.html (%d KB)' % (len(site) // 1024, len(adm) // 1024))
