#!/usr/bin/env python3
"""Copies the files in shared/ into the two places that need them:
   - wa-assistant/src/<name>.mjs   (as ES modules)
   - src/js/NNN-shared-NAME.js     (between the // <shared:NAME> markers; then joined into anitha-store.html)
Run after editing anything in shared/. record-check.cjs fails if a copy drifts."""
import os, re, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCKS = [
  ('pincode-core', 'pincode.mjs', 'PIN_STATES, STATE_ALIASES, normState, statesOfPin, stateOfCity, addressCheck, DEFAULT_DELIVERY, addWorkingDays, fmtShortDate, deliveryEstimate'),
  ('slip-core', 'slip.mjs', 'packingSlipHtml'),
  ('erase-core', 'erase.mjs', 'ANON, eDigits, anonOrderCore, scrubLogsCore, eraseCustomerCore, anonymiseExpiredCore'),
]
for name, mjs, names in BLOCKS:
    core = open(os.path.join(root, f'shared/{name}.js'), encoding='utf-8').read().rstrip() + '\n'
    open(os.path.join(root, 'wa-assistant/src', mjs), 'w', encoding='utf-8').write(f'// GENERATED from shared/{name}.js by tools/sync-shared.py. Do not edit here.\n' + core + f'\nexport {{ {names} }};\n')
    # the website gets its own copy: it lives in its own part file src/js/NNN-shared-<name>.js, between the markers
    part = [f for f in os.listdir(os.path.join(root, 'src', 'js')) if f.endswith(f'-shared-{name}.js')]
    assert len(part) == 1, f'src/js/*-shared-{name}.js not found'
    pp = os.path.join(root, 'src', 'js', part[0])
    cur = open(pp, encoding='utf-8', newline='').read()
    assert f'// <shared:{name}>' in cur and f'// </shared:{name}>' in cur
    block = f'// <shared:{name}>\n' + core + f'// </shared:{name}>'
    open(pp, 'w', encoding='utf-8', newline='').write(re.sub(rf'// <shared:{name}>.*?// </shared:{name}>', lambda m: block, cur, flags=re.S))
subprocess.check_call([sys.executable, os.path.join(root, 'tools', 'join-parts.py')])
print('synced', [b[0] for b in BLOCKS])
