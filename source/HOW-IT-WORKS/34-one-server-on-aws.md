# 34 · The whole shop on one server (AWS Lightsail)

Goal: website, owner app, WhatsApp assistant, orders and data all on **one machine** at **https://anithapemmasani.com**, instead of GitHub Pages (website) plus Render (server). Nothing in the shop's features changes.

**How it fits together**
- One Ubuntu 24.04 machine in Mumbai (Lightsail, 2 GB, static IP `13.207.223.102`).
- **Caddy** is the front door: it gets and renews the free HTTPS certificate, redirects `www` to the main address, compresses pages, and hands every request to the shop server on `127.0.0.1:8787`.
- The **shop server** (`wa-assistant`, run as the `anitha-store` service) now also serves the public website. Set `SITE_DIR` to the folder the build makes (`build/site`) and these work from the same address: `/`, `/collection/`, `/faq/` and the other page folders, `sitemap.xml`, `robots.txt`, product pages (through `404.html`, as before), plus everything the server already did (`/admin`, `/webhook`, `/public/...`, `/health`). Code: `wa-assistant/src/sitehost.mjs`. Without `SITE_DIR` the server behaves exactly as before (Render keeps working unchanged).
- Because the site and the server share one address, no cross-site setup (`ALLOWED_ORIGINS`) is needed for the new address. The old GitHub Pages address stays in the list until it is switched off.
- **Real visitor addresses:** behind Caddy every connection looks like it comes from the machine itself, which would make all visitors share one sign-in lockout and one rate limit. `TRUST_PROXY=1` makes the server use the address Caddy recorded, but only for connections from the machine itself, so nobody can pick their own address (`wa-assistant/src/clientip.mjs`).
- Data lives in `/var/lib/anitha-store` (`DATA_DIR`). Secrets live in `/etc/anitha-store.env` (owner-only file, never in git).

**Files** (all in `aws/`): `setup.sh` (one-time install), `update.sh` (`anitha-update`: download newest version from GitHub, rebuild the website for the domain, restart), `backup.sh` (daily 03:30, keeps 14 days in `/var/backups/anitha-store`), `anitha-store.service`, `Caddyfile`.

**First-time setup (on the server, as root):** `git clone https://github.com/nagarjuna-N99/anitha-store.git /opt/anitha-store/repo && bash /opt/anitha-store/repo/source/aws/setup.sh anithapemmasani.com`. It prints the one-time first-time setup code at the end. That first account is the **Admin** (`/admin`); create the **Owner** login in Settings (guide 37) and give her `/owner`.

**Updating later:** push to GitHub `main`, then on the server run `anitha-update`. (Render and GitHub Pages also deploy from `main` while they are still on.)

**Moving over from Render (do in this order, at a quiet time):**
1. In the old owner app: Settings → backup/export of the shop data. Keep the file.
2. On the new server: open `https://<server address>/admin`, set the owner password with the setup code, then restore the backup there.
3. Point the domain at the server: in Hostinger add an **A record** `@` → `13.207.223.102` and an **A record** `www` → `13.207.223.102`. Caddy gets the certificate by itself once DNS has changed (usually minutes).
4. Change the WhatsApp (Meta) webhook address and the Instagram/payment callback addresses to `https://anithapemmasani.com/webhook` (and the payment webhook path). Keep the same verify token.
5. Test an order and the owner app on the new address. Keep Render and GitHub Pages running a few days, then switch them off.
6. Turn on **automatic snapshots** for the instance in Lightsail (a whole-machine backup, a few cents a month) in addition to the daily data backup.

**Costs:** the 2 GB plan is about $12 a month; the account's credits cover the first months. Upgrade the AWS account from the Free plan before the credits or the free period end.

Tests: `tests/onebox-test.cjs` (8 checks, a real browser against the server serving the real build), plus 16 server checks for serving the site safely and for the visitor address. **Not tested here:** a real Ubuntu install of `setup.sh`, the real certificate, real DNS, WhatsApp/Meta callbacks on the new address.

**The old GitHub address (5 Nov 2026):** `tools/publish-repo.sh` now publishes the GitHub Pages copy as a signpost to `https://anithapemmasani.com` (`tools/redirect-pages.py`). Each old page sends visitors to the same page on the new address. To publish the whole site to Pages again, run `REDIRECT_TO= tools/publish-repo.sh <repo> <server>`. Test: `tests/redirect-test.cjs`. Customers' cart, wish list and sign-in are stored per address in their browser, so they start fresh on the new address.

**Self-heal (added 5 Nov 2026):** `sudo anitha-update` also installs a 5-minute timer that restarts a stopped shop server or web server and frees disk when it is over 90% full (guide 38).
