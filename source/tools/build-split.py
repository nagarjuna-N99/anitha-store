#!/usr/bin/env python3
"""Builds the two separate pages from the one source file anitha-store.html.

  build/site/index.html          the PUBLIC website  (no admin screens, no PIN, no demo customers). Put it on any static host.
  wa-assistant/public/admin.html the OWNER app       (served only by the server at /admin, behind a real login)

Usage: python3 tools/build-split.py [--shop-api https://shop.example.com] [--site-url https://www.example.com/shop] [--index]
   (--index lets Google list the website; --site-url is the public address, used for each page's canonical link and sitemap.xml)
Also writes one real page file per address (build/site/collection/index.html, saree-care/, journal/, faq/, terms/, privacy/, my-wishlist/),
404.html (opens the right page for product and owner-made pages) and sitemap.xml.
"""
import re, sys, os, argparse
ap = argparse.ArgumentParser(); ap.add_argument('--shop-api', default=''); ap.add_argument('--index', action='store_true'); ap.add_argument('--site-url', default=''); a = ap.parse_args()
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import subprocess, sys; subprocess.check_call([sys.executable, os.path.join(root, 'tools', 'join-parts.py')], stdout=subprocess.DEVNULL)   # anitha-store.html is the joined src/ parts
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
from urllib.parse import urlparse
base_path = (urlparse(a.site_url).path.rstrip('/') + '/') if a.site_url else ''
site = inject(site, "window.__BUILD='site';window.__SHOP_API=%s;%s" % (repr(a.shop_api.rstrip('/')).replace("'", '"'), ("window.__BASE='%s';" % base_path) if base_path else ''), robots=None if a.index else 'noindex, nofollow')
assert "adminPin: '1234'" not in site and 'HDFC0001234' not in site and '50100123456789' not in site, 'a secret is still in the public site'
assert 'id="adminView"' not in site and 'id="adminMobileNav"' not in site and 'id="view-toggle"' not in site
os.makedirs(os.path.join(root, 'build', 'site'), exist_ok=True)
open(os.path.join(root, 'build', 'site', 'index.html'), 'w', encoding='utf-8').write(site)

# ---- one real page file for every fixed address (same app; the head says what the page is) ----
import shutil
BRAND = 'Anitha Pemmasani'
PAGES = {
  'collection': ('Handloom Sarees Collection', 'Browse pure handloom sarees from Hyderabad: Tussar, Maheshwari, Banarasi, Kanjeevaram, Paithani, Mysore silk and Ponduru Khadi.'),
  'saree-care': ('Saree Care Guide', 'How to wash, dry, iron and store handloom silk, tussar and cotton sarees so they last for years.'),
  'journal': ('Journal', 'Stories from the loom: weaves, weavers and the care behind each handloom saree.'),
  'faq': ('Questions and Answers', 'Delivery, payment, care and returns: answers to common questions.'),
  'terms': ('Terms & Conditions', 'The terms for buying from ' + BRAND + '.'),
  'privacy': ('Privacy Policy', 'How ' + BRAND + ' looks after your personal data.'),
  'my-wishlist': ('My Wishlist', 'The sarees you saved.'),
}
site_url = a.site_url.rstrip('/')
def esc_attr(t): return t.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')
def page_head(h, path, title, desc):
    full = '%s | %s' % (title, BRAND)
    h = re.sub(r'<title>.*?</title>', lambda m: '<title>%s</title>' % esc_attr(full).replace('&amp;', '&amp;'), h, count=1, flags=re.S)
    h = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + esc_attr(desc) + m.group(2), h, count=1)
    h = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + esc_attr(full) + m.group(2), h, count=1)
    h = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + esc_attr(desc) + m.group(2), h, count=1)
    extra = ''
    if site_url: extra += '<link rel="canonical" href="%s/%s/"><meta property="og:url" content="%s/%s/">' % (site_url, path, site_url, path)
    if path == 'my-wishlist': extra += '<meta name="robots" content="noindex, nofollow">'
    return h.replace('</title>', '</title>' + extra, 1)
outdir = os.path.join(root, 'build', 'site')
for d in list(PAGES) + ['product', 'page']:
    shutil.rmtree(os.path.join(outdir, d), ignore_errors=True)
shutil.rmtree(os.path.join(outdir, 'the-atelier'), ignore_errors=True)   # the Atelier page was removed (5 Nov 2026): never leave an old folder behind
for path, (title, desc) in PAGES.items():
    os.makedirs(os.path.join(outdir, path), exist_ok=True)
    open(os.path.join(outdir, path, 'index.html'), 'w', encoding='utf-8').write(page_head(site, path, title, desc))
# 404.html: for addresses without a file (a saree, a page the owner added) it is the same app, which opens the right page
open(os.path.join(outdir, '404.html'), 'w', encoding='utf-8').write(site)
if site_url:
    urls = [''] + [p + '/' for p in PAGES if p != 'my-wishlist']
    open(os.path.join(outdir, 'sitemap.xml'), 'w', encoding='utf-8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join('  <url><loc>%s/%s</loc></url>\n' % (site_url, u) for u in urls) + '</urlset>\n')


# ---- the owner app ----
adm = common(src)
adm = inject(adm, "window.__BUILD='admin';", title='Owner admin', robots='noindex, nofollow')
os.makedirs(os.path.join(root, 'wa-assistant', 'public'), exist_ok=True)
open(os.path.join(root, 'wa-assistant', 'public', 'admin.html'), 'w', encoding='utf-8').write(adm)
print('built: build/site/index.html (%d KB), wa-assistant/public/admin.html (%d KB)' % (len(site) // 1024, len(adm) // 1024))
