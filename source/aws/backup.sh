#!/usr/bin/env bash
# Copies the shop's data folder (orders, customers, settings, photos) into one dated file; keeps the newest 14.
set -euo pipefail
OUT=/var/backups/anitha-store; mkdir -p "$OUT"
F="$OUT/anitha-data-$(date +%F).tar.gz"
tar -C /var/lib -czf "$F.tmp" anitha-store && mv "$F.tmp" "$F"; chmod 600 "$F"
ls -1t "$OUT"/anitha-data-*.tar.gz | tail -n +15 | xargs -r rm -f
echo "$(date -Is) backup ok: $F ($(du -h "$F" | cut -f1))"
