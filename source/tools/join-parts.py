#!/usr/bin/env python3
"""Joins the part files in src/ (listed in src/manifest.json) into anitha-store.html.
The website is written as small parts: src/css/*.css, src/html/*.html (header, storefront, owner app, ...) and
src/js/*.js (one file per feature). Edit the parts, then run this. anitha-store.html is the joined result: do not edit it by hand.
   python3 tools/join-parts.py          join (writes anitha-store.html only if it changed)
   python3 tools/join-parts.py --check  exit 1 if anitha-store.html is not exactly the joined parts"""
import json, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(rel): return open(os.path.join(root, 'src', rel), encoding='utf-8', newline='').read()
def join():
    m = json.load(open(os.path.join(root, 'src', 'manifest.json'), encoding='utf-8'))['parts']; out = []
    for p in m:
        if 'file' in p: out.append(read(p['file']))
        else: out.append(p['open'] + ''.join(read(f) for f in p['files']) + p['close'])
    return ''.join(out)
if __name__ == '__main__':
    html = join(); target = os.path.join(root, 'anitha-store.html')
    cur = open(target, encoding='utf-8', newline='').read() if os.path.exists(target) else None
    if '--check' in sys.argv:
        if cur != html: print('anitha-store.html is not the joined src/ parts. Run: python3 tools/join-parts.py'); sys.exit(1)
        print('anitha-store.html matches src/'); sys.exit(0)
    if cur != html: open(target, 'w', encoding='utf-8', newline='').write(html); print('joined src/ -> anitha-store.html')
    else: print('anitha-store.html already up to date')
