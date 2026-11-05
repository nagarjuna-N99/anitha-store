# 38 · Repair assistant, auto-repair and server self-heal (5 Nov 2026)

Three separate helpers keep the shop healthy. **Only the admin login sees them** (Ops page). The owner login cannot open them and the server refuses it.

## 1. Auto-repair (switch ON by default)
Every 10 minutes the shop server runs a very short list of **safe, fixed repairs**, but only when one is really needed. **The AI is not involved.**
| Repair | When it runs by itself | What it does |
|---|---|---|
| `privacy-sweep` | the daily privacy clean-up missed a day | runs it now (old chats, carts, order contact details) |
| `file-modes` | a shop data file became readable by others | makes it private again (owner-only) |
| `good-copy` | there is no known-good copy yet, or it is a day old | saves a copy of the shop data **only if it is valid** (`shop-db.good.json`) |
If `shop-db.json` is ever damaged, the server loads `shop-db.good.json` by itself when it starts, keeps the damaged file aside as `shop-db.json.damaged-<time>`, and writes the event in the log. Two more repairs exist only as buttons (`ops-note`, `retry-reports`). Nothing else is ever changed automatically. Everything is recorded in `repair.json` (last 60 entries) with who did it ("automatic" or "admin"). The switch and "Run the safe repairs now" are on the Ops page, in the **🛠 Repair assistant & auto-repair** card. Code: `wa-assistant/src/repair.mjs`.

## 2. The repair chat (✨)
In the same card the admin types a question ("What is wrong right now?", "Is the PUBLIC_URL warning serious?"). The server sends Claude **only** the red and yellow checks, the recent server errors, what auto-repair and self-heal did, and the list of repairs. Never passwords, keys, tokens or customer data. Claude answers in plain words with steps and may **suggest** repairs from the list: each shows as a button the admin presses. It can never claim to have fixed something, never suggest deleting data, and says so when it is not sure. Without a Claude key, or with the **Repair assistant chat** switch off in AI Helper, the chat gives a plain list built from the checks. Up to 20 questions per 10 minutes. Task `repair` in `wa-assistant/src/aihelper.mjs`.

## 3. Server self-heal (`aws/selfheal.sh`)
A timer on the Lightsail server runs it every 5 minutes (`anitha-selfheal.timer`, installed and refreshed by `sudo anitha-update`). It does three things:
1. If the shop server does not answer **twice in a row** (`/health`), it restarts it.
2. If the web server (Caddy) is stopped, it starts it.
3. If the disk is over 90% full, it deletes data backups older than 3 days and trims old system logs.
It never touches the shop's data, settings or passwords, and writes each action to `/var/lib/anitha-store/selfheal.log` (last 200 lines), which the Ops card shows next to the auto-repair log.

## Ops fixes made on the way (5 Nov 2026, from the first real report)
- **"PUBLIC_URL is https: not set"** (also behind "Website points to this server" and "Instagram cannot fetch photos") was a bug in Ops, which looked in the wrong place. Fixed.
- **"No admin secrets in the public page"** gave a false alarm because the page's code mentions the word `adminPin`. It now looks for the real demo PIN and bank numbers only.
- **"Data survives redeploys"** now accepts the server's own `/var/lib` folder, memory limits fit the 2 GB server, "Helper logins" is now "Owner logins", and Render/GitHub Pages hints are replaced.
- Real items from the report stay yours: download an encrypted backup, switch on 2-step sign-in, set up email, name a grievance officer, and the one order waiting over 3 days.

Tests: `wa-assistant/tests/run.mjs` (the "repair" checks: admin-only, switch, auto-run and no-repeat, damaged file recovery, chat with Claude and without, nothing secret sent, rate limit, Ops fix), `tests/dpdp2-test.cjs` (the card in a real browser) and `tests/selfheal-test.cjs` (the script with stand-in commands). Not tested: Claude's real answers, the real timer on the live server.
