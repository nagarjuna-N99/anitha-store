#!/usr/bin/env bash
# Refreshes the deliverables IN PLACE (same file names every time, nothing new is created):
#   anitha-store.html                      the store (already the working file)
#   data-export/anitha-store-data.json     raw store data (the `db` object)
#   data-export/assistant-catalogue.json   what the assistant server receives
#   ../APSilks.zip                         whole project (no node_modules / data / .env)
#   backups/anitha-store.prev.html         ONE rolling backup of the previous store file
# Run after every change, after the tests and ./check-record.sh pass.
set -e
cd "$(dirname "$0")/.."
export PW="${PW:-$(npm root -g)/playwright}"
mkdir -p data-export backups
[ -f .last-published.html ] && cp .last-published.html backups/anitha-store.prev.html
node tools/export-data.cjs
python3 tools/make-changelog.py
python3 tools/join-parts.py >/dev/null   # anitha-store.html is the joined src/ parts
cp anitha-store.html .last-published.html
NAME="$(basename "$PWD")"
rm -f ../APSilks.zip
(cd .. && zip -qr APSilks.zip "$NAME" -x "*/wa-assistant/node_modules/*" "*/wa-assistant/data/*" "*/wa-assistant/.env" "*/.last-published.html")
# Public website build (no admin screens, no PIN) for GitHub Pages / any static host, and the owner app for the server.
# SHOP_API = the https address of your server (leave empty for a demo that works only in the visitor's own browser).
python3 tools/build-split.py ${SHOP_API:+--shop-api "$SHOP_API"} ${SITE_INDEXABLE:+--index}
rm -rf deploy && mkdir -p deploy && cp build/site/index.html deploy/index.html && touch deploy/.nojekyll && cp tools/DEPLOY-README.md deploy/README.md
rm -f ../APSilks-site.zip; (cd deploy && zip -qr ../../APSilks-site.zip . -x ".DS_Store")
echo "Refreshed: anitha-store.html, data-export/*.json, ../APSilks.zip (rolling backup: backups/anitha-store.prev.html)"
