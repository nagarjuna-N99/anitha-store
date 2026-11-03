# 22 · The Ops page (for the developer)

**Where:** owner app → 🩺 **Ops** (owner only; helpers cannot see it, and the server refuses them: `GET /admin/api/ops` returns 403).
**What it is:** one read-only health check of the whole shop. It changes nothing and never shows a secret (only "set" or "missing"). Press **Check again**, tick **Re-check every minute**, or **Copy report as text** to paste into a ticket.

Each line is ✓ ok, ! warn, ✕ fail or i info. Problems are open by default and show a "→ fix" hint.

| Area | What it checks |
|---|---|
| Server | uptime (a recent restart is flagged), memory vs the 512 MB limit, event-loop delay, PUBLIC_URL is https, secure cookies, data folder writable, free disk space, data is on the mounted disk (not erased by a deploy) |
| Shop data | file present and size, duplicate SKUs, negative stock, products without photos, orders stuck "placed" over 3 days, payments pending over 5 days, low stock, encrypted-backup age, damaged JSON files |
| Security | owner account exists, 2-step sign-in, ADMIN_TOKEN strength, IP limit, failed sign-ins and lock-outs in 24 h, last sign-in (time, address), helper count |
| Public website | SITE_URL reachable and fast, the page points to this server, ALLOWED_ORIGINS contains the website (else orders are refused), no admin secrets in the public page, visitor counting |
| Orders & payments | website orders waiting (and how long), orders with price/stock warnings, payment provider, Razorpay keys, WhatsApp orders to import |
| WhatsApp | live or dry-run, WA_APP_SECRET (webhook signature), verify token, owner number, customers waiting for a person, cart reminders |
| AI helpers | Anthropic key, calls today vs the daily limit |
| Instagram | connected, last follower snapshot (an old one means the token expired) |
| Email | mail settings, last weekly/monthly report (failed ones show the error) |
| Privacy (DPDP) | open / late requests, open breaches (72-hour rule), daily clean-up ran, grievance officer, erased-list size |
| Recent errors | server errors since it started (kept in memory, last 50) |

**Not checked on purpose:** it does not call Meta, Instagram, Razorpay or the mail server (that would use quota or send mail). To test those, use Test email in Growth and look at the Render logs.

**Adding a check:** edit `wa-assistant/src/ops.mjs` (`add('Group', C(id, status, title, detail, fix))`), add a line to `tests/run.mjs` if it needs one, and update this table.
Code: `src/ops.mjs`, route in `adminroutes.mjs`, screen `renderOpsAdmin` in `anitha-store.html`, tests in `tests/run.mjs` (ops:) and `tests/dpdp2-test.cjs`.
