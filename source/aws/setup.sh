#!/usr/bin/env bash
# One-time setup of the whole shop on ONE Ubuntu 24.04 machine (the AWS Lightsail server).
#   usage (as root):  bash setup.sh yourdomain.com
# It installs Node 20 and Caddy (the front door that gets the free HTTPS certificate), downloads the shop from GitHub,
# builds the website for your domain, starts the server, and sets up a daily backup. Safe to run again.
set -euo pipefail
DOMAIN="${1:?usage: bash setup.sh yourdomain.com}"
REPO_URL="${REPO_URL:-https://github.com/nagarjuna-N99/anitha-store.git}"
APP=/opt/anitha-store; DATA=/var/lib/anitha-store; ENVF=/etc/anitha-store.env
[ "$(id -u)" = 0 ] || { echo "Run as root: sudo bash setup.sh $DOMAIN"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "== 1/7 packages"
apt-get update -y >/dev/null; apt-get install -y curl git ca-certificates gnupg python3 debian-keyring debian-archive-keyring apt-transport-https ufw >/dev/null
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null; apt-get install -y nodejs >/dev/null
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y >/dev/null; apt-get install -y caddy >/dev/null
fi
# a little swap so a busy moment (photo or video work) cannot run the 2 GB machine out of memory
if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi

echo "== 2/7 the shop's own user and folders"
id anitha >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin anitha
mkdir -p "$APP" "$DATA" /var/backups/anitha-store; chown -R anitha:anitha "$DATA"
[ -d "$APP/repo/.git" ] && git -C "$APP/repo" pull --ff-only || git clone --depth 1 "$REPO_URL" "$APP/repo"

echo "== 3/7 settings file (kept private, never in git)"
if [ ! -f "$ENVF" ]; then
  TOKEN="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
  cat > "$ENVF" <<ENV
NODE_ENV=production
PORT=8787
DATA_DIR=$DATA
SITE_DIR=$APP/repo/source/build/site
TRUST_PROXY=1
PUBLIC_URL=https://$DOMAIN
SITE_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,https://nagarjuna-n99.github.io
ADMIN_SETUP_TOKEN=$TOKEN
# fill these in later if you use them (leave the line out otherwise):
# ANTHROPIC_API_KEY=
# OPS_TOKEN=
ENV
  chmod 600 "$ENVF"; echo "   created $ENVF"
else echo "   $ENVF already exists, kept as it is"; fi
sed -i "s#^SITE_DIR=.*#SITE_DIR=$APP/repo/source/build/site#" "$ENVF"

echo "== 4/7 update script"
install -m 755 "$APP/repo/source/aws/update.sh" /usr/local/bin/anitha-update
install -m 755 "$APP/repo/source/aws/backup.sh" /usr/local/bin/anitha-backup
echo "DOMAIN=$DOMAIN" > /etc/anitha-store.domain
/usr/local/bin/anitha-update --no-restart

echo "== 5/7 the server as a service"
install -m 644 "$APP/repo/source/aws/anitha-store.service" /etc/systemd/system/anitha-store.service
systemctl daemon-reload; systemctl enable anitha-store >/dev/null; systemctl restart anitha-store

echo "== 6/7 HTTPS front door for $DOMAIN"
sed "s/__DOMAIN__/$DOMAIN/g" "$APP/repo/source/aws/Caddyfile" > /etc/caddy/Caddyfile
systemctl enable caddy >/dev/null; systemctl restart caddy

install -m 755 "$APP/repo/source/aws/selfheal.sh" /usr/local/bin/anitha-selfheal
cp "$APP/repo/source/aws/anitha-selfheal.service" "$APP/repo/source/aws/anitha-selfheal.timer" /etc/systemd/system/
systemctl daemon-reload; systemctl enable --now anitha-selfheal.timer >/dev/null
echo "== 7/7 daily backup (03:30), keeps 14 days; self-heal every 5 minutes"
cat > /etc/cron.d/anitha-backup <<'CRON'
30 3 * * * root /usr/local/bin/anitha-backup >> /var/log/anitha-backup.log 2>&1
CRON
ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw --force enable >/dev/null

sleep 3
echo; echo "Server check:"; curl -s http://127.0.0.1:8787/health || echo "(server not answering yet: run  journalctl -u anitha-store -n 30)"
echo; echo "Owner-app first-time setup code (needed once, at https://$DOMAIN/admin):"; grep '^ADMIN_SETUP_TOKEN=' "$ENVF" | cut -d= -f2
