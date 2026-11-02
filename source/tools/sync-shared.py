#!/usr/bin/env python3
"""Copies the files in shared/ into the two places that need them:
   - wa-assistant/src/<name>.mjs   (as ES modules)
   - anitha-store.html             (between the // <shared:NAME> markers)
Run after editing anything in shared/. record-check.cjs fails if a copy drifts."""
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCKS = [
  ('pincode-core', 'pincode.mjs', 'PIN_STATES, STATE_ALIASES, normState, statesOfPin, stateOfCity, addressCheck, DEFAULT_DELIVERY, addWorkingDays, fmtShortDate, deliveryEstimate'),
  ('slip-core', 'slip.mjs', 'packingSlipHtml'),
]
p = os.path.join(root, 'anitha-store.html'); html = open(p, encoding='utf-8').read()
for name, mjs, names in BLOCKS:
    core = open(os.path.join(root, f'shared/{name}.js'), encoding='utf-8').read().rstrip() + '\n'
    open(os.path.join(root, 'wa-assistant/src', mjs), 'w', encoding='utf-8').write(f'// GENERATED from shared/{name}.js by tools/sync-shared.py. Do not edit here.\n' + core + f'\nexport {{ {names} }};\n')
    block = f'// <shared:{name}>\n' + core + f'// </shared:{name}>'
    if f'// <shared:{name}>' in html:
        html = re.sub(rf'// <shared:{name}>.*?// </shared:{name}>', lambda m: block, html, flags=re.S)
    else:
        anchor = '\n// ================= INIT ================='
        assert html.count(anchor) == 1
        html = html.replace(anchor, '\n' + block + '\n' + anchor)
open(p, 'w', encoding='utf-8').write(html); print('synced', [b[0] for b in BLOCKS])
