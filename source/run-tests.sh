#!/usr/bin/env bash
# Runs every automated test: the assistant server and all browser suites. Needs: node 20+, `npm i -g playwright` (Chromium).
cd "$(dirname "$0")"
export PW="${PW:-$(npm root -g)/playwright}"
python3 tools/build-split.py --shop-api http://127.0.0.1:8787 >/dev/null || exit 1   # the website and the owner app
(cd wa-assistant && npm install --silent >/dev/null 2>&1; npm test 2>&1 | grep -E "FAIL|passed|ALL PASSED|FAILED" | tail -3)
export SHOW_SAMPLES=1   # the browser suites run on the demo data, which the server normally hides from customers
for t in tests/*.cjs; do printf '%-28s ' "$t"; node "$t" 2>&1 | grep -E '^FAIL|FAILED|ALL PASSED' | tr '\n' ' '; echo; done
