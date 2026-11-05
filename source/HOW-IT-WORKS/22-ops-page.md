# 22 · The Ops page (for the developer)

**What it is:** one read-only health check of the whole shop. It changes nothing and never shows a secret (only "set" or "missing"). Press **Check again**, tick **Re-check every minute**, or **Copy report as text** to paste into a ticket.

## Two ways to open it
1. **Stand-alone (for the developer): `https://<your server>/ops`.** Its own key, `OPS_TOKEN`, no owner login: it works even if the owner app is broken or locked. Set `OPS_TOKEN` in the Render environment (24+ random characters); if empty or shorter the page does not exist (404). The key is typed on the page and kept only in that tab (no cookie). Eight wrong tries lock it for 15 minutes; wrong tries go in the activity log (`ops-login`). Give it to the developer only.
2. **Inside the owner app: 🩺 Ops** (admin only since 5 Nov 2026; the owner login gets 403).

## Previews: Instagram and WhatsApp
- **📸 Instagram:** connected or not, posts today against the daily limit, queued / posted / failed counts, last follower count, and the **latest 6 posts** (photo, product, caption, time, status, error, link to the live post).
- **💬 WhatsApp:** live or dry-run, chats, how many wrote in the last 24 h, how many are with a person, unread, STOP count, last customer message and activity, owner alerts on/off, the **6 most recent chats** with whether the free 24-hour reply window is open, and in dry-run what it *would have sent* (type and template only).
- **Privacy:** customer message text is never shown and numbers are masked (last 4 digits). WhatsApp has no shop "status" (stories) feature, so "status" means the connection and activity above.

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
Code: `src/ops.mjs` (the checks and previews), `src/opspage.mjs` (the stand-alone page), routes in `adminroutes.mjs` (`GET /ops`, `GET /ops/api/report`, `GET /admin/api/ops`), screen `renderOpsAdmin` in `anitha-store.html`, tests in `tests/run.mjs` (ops:) and `tests/dpdp2-test.cjs`.
