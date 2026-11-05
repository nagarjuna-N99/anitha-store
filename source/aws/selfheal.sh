#!/usr/bin/env bash
# Server self-heal. Runs every 5 minutes (anitha-selfheal.timer). It only does three safe things and writes each one to a log the Ops page shows:
#   1. if the shop server does not answer twice in a row, restart it
#   2. if the web server (Caddy) is stopped, start it
#   3. if the disk is over 90% full, delete data backups older than 3 days and trim old system logs
# It never touches the shop's data, settings or passwords.
set -u
DATA="${SELFHEAL_DATA:-/var/lib/anitha-store}"; LOG="${SELFHEAL_LOG:-$DATA/selfheal.log}"; STATE="${SELFHEAL_STATE:-/run/anitha-selfheal.fails}"
URL="${SELFHEAL_URL:-http://127.0.0.1:8787/health}"; BACKUPS="${SELFHEAL_BACKUPS:-/var/backups/anitha-store}"
log() { printf '{"t":"%s","action":"%s","note":"%s"}\n' "$(date -Is)" "$1" "$2" >> "$LOG" 2>/dev/null; tail -n 200 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG" 2>/dev/null; chown anitha:anitha "$LOG" 2>/dev/null; chmod 640 "$LOG" 2>/dev/null; }
mkdir -p "$DATA" 2>/dev/null

# 1. the shop server
if curl -fsS -m 8 "$URL" >/dev/null 2>&1; then rm -f "$STATE"; else
  n=$(( $(cat "$STATE" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$STATE"
  if [ "$n" -ge 2 ]; then
    if systemctl restart anitha-store; then log restart-server "The shop server did not answer twice in a row, so it was restarted."; else log restart-server-failed "The shop server did not answer and the restart did not work. Check: journalctl -u anitha-store -n 80"; fi
    rm -f "$STATE"
  fi
fi

# 2. the web server (HTTPS front door)
if ! systemctl is-active --quiet caddy; then
  if systemctl restart caddy; then log restart-caddy "The web server (Caddy) was stopped, so it was started again."; else log restart-caddy-failed "The web server was stopped and could not be started. Check: journalctl -u caddy -n 80"; fi
fi

# 3. the disk
use="$(df --output=pcent "$DATA" 2>/dev/null | tail -1 | tr -dc '0-9')"
if [ -n "${use:-}" ] && [ "$use" -ge 90 ]; then
  find "$BACKUPS" -name 'anitha-data-*.tar.gz' -mtime +3 -delete 2>/dev/null
  journalctl --vacuum-size=100M >/dev/null 2>&1
  apt-get clean >/dev/null 2>&1
  log free-disk "The disk was ${use}% full: removed data backups older than 3 days and trimmed old system logs."
fi
exit 0
