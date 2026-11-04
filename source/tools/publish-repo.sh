#!/usr/bin/env bash
# Copies everything into a git checkout so the repository is complete: the public site, the deployable server, and the
# full source with tests and docs (so any person or AI can rebuild, test and change the project).
#   usage: tools/publish-repo.sh /path/to/git/checkout [https://server-address]
# It never copies node_modules, the server's data folder, .env files or backups. Afterwards: git add -A, commit, push.
set -e
cd "$(dirname "$0")/.."
REPO="${1:?usage: tools/publish-repo.sh /path/to/git/checkout [https://server-address]}"; API="${2:-}"
[ -d "$REPO/.git" ] || { echo "$REPO is not a git checkout"; exit 1; }
python3 tools/join-parts.py >/dev/null   # anitha-store.html is the joined src/ parts
python3 tools/make-changelog.py >/dev/null
[ -n "$API" ] && python3 tools/build-split.py --shop-api "$API" --site-url "${SITE_URL:-https://nagarjuna-n99.github.io/anitha-store}" --index >/dev/null
# 1. public site (generated)
cp build/site/index.html "$REPO/index.html"
rm -rf "$REPO/the-atelier"   # the Atelier page was removed (5 Nov 2026)
for d in collection saree-care journal faq terms privacy my-wishlist; do rm -rf "$REPO/$d"; [ -d build/site/$d ] && cp -r build/site/$d "$REPO/$d"; done   # one real page file per address
cp build/site/404.html "$REPO/404.html"; [ -f build/site/sitemap.xml ] && cp build/site/sitemap.xml "$REPO/sitemap.xml" || true
# the old GitHub Pages address now only points visitors to the shop's own address (since 5 Nov 2026). To publish a full copy there again: REDIRECT_TO= tools/publish-repo.sh ...
REDIRECT_TO="${REDIRECT_TO-https://anithapemmasani.com}"; [ -n "$REDIRECT_TO" ] && python3 tools/redirect-pages.py "$REPO" "$REDIRECT_TO" >/dev/null || true
cp shared/brand/logo.png "$REPO/logo.png"; cp shared/brand/icon-512.png "$REPO/logo-512.png"
# 2. the deployable server (generated from wa-assistant, no tests)
rm -rf "$REPO/server"; mkdir -p "$REPO/server"
tar -C wa-assistant --exclude=node_modules --exclude=data --exclude=.env --exclude=tests -cf - . | tar -C "$REPO/server" -xf -
# 3. the full source: everything needed to rebuild and test
rm -rf "$REPO/source"; mkdir -p "$REPO/source"
tar --exclude=node_modules --exclude=wa-assistant/data --exclude=.env --exclude=backups --exclude=archive --exclude=build --exclude=deploy --exclude=.last-published.html --exclude=wa-assistant/.env -cf - . | tar -C "$REPO/source" -xf -
# 4. docs the reader sees first
cp AGENTS.md "$REPO/AGENTS.md"; cp CLAUDE.md "$REPO/CLAUDE.md"; cp CHANGELOG.md "$REPO/CHANGELOG.md"
cat > "$REPO/.gitignore" <<'G'
node_modules/
data/
.env
*.log
secrets.json
.secrets-key
.last-published.html
G
echo "Published into $REPO. Review with: git -C $REPO status"
