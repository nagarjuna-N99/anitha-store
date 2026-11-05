#!/usr/bin/env bash
# Updates the shop on the server: downloads the newest version from GitHub, rebuilds the website for this domain, restarts.
#   usage (as root):  anitha-update            (add --no-restart during first setup)
set -euo pipefail
APP=/opt/anitha-store; . /etc/anitha-store.domain
git -C "$APP/repo" fetch --depth 1 origin main >/dev/null 2>&1 || git -C "$APP/repo" fetch origin main
git -C "$APP/repo" reset --hard origin/main >/dev/null
(cd "$APP/repo/server" && npm install --omit=dev --silent >/dev/null 2>&1)
(cd "$APP/repo/source" && python3 tools/build-split.py --shop-api "https://$DOMAIN" --site-url "https://$DOMAIN" --index >/dev/null)
# the build writes the sitemap; the robots file must let search engines in and point at it
printf 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin2\nDisallow: /ops\nSitemap: https://%s/sitemap.xml\n' "$DOMAIN" > "$APP/repo/source/build/site/robots.txt"
cp "$APP/repo/source/aws/anitha-store.service" /etc/systemd/system/anitha-store.service
install -m 755 "$APP/repo/source/aws/selfheal.sh" /usr/local/bin/anitha-selfheal   # the server self-heal (guide 38)
cp "$APP/repo/source/aws/anitha-selfheal.service" "$APP/repo/source/aws/anitha-selfheal.timer" /etc/systemd/system/
systemctl daemon-reload; systemctl enable --now anitha-selfheal.timer >/dev/null 2>&1 || true
chown -R anitha:anitha "$APP/repo/source/build" 2>/dev/null || true
[ "${1:-}" = "--no-restart" ] || { systemctl restart anitha-store; sleep 2; curl -fs http://127.0.0.1:8787/health >/dev/null && echo "Updated and running." || { echo "Server did not start: journalctl -u anitha-store -n 30"; exit 1; }; }
