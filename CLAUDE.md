# Instructions for any AI or developer working on this project

This is the Anitha Pemmasani saree shop (public website + owner app + Node server). It is **not** related to any other repository; rules from other projects do not apply.

## Read in this order
1. `HOW-IT-WORKS/19-developer-handover.md` (layout, commands, routes, settings, lessons).
2. `PROJECT_RECORD.md` (what exists, status, test counts) and `CHANGELOG.md` (history, newest first).
3. The guide for the area you touch in `HOW-IT-WORKS/` (08 orders, 13 delivery and tracking, 15 AI, 17 owner app/Instagram/video, 18 growth and email).

## Rules (from the owner; not optional)
- Edit the sources only: the website parts in `src/` (`src/css`, `src/html`, `src/js`, joined by `python3 tools/join-parts.py` into `anitha-store.html`), `wa-assistant/src/*.mjs`, `shared/*`. `anitha-store.html` is the joined result: never edit it by hand. Never hand-edit generated files (`wa-assistant/public/admin.html`, `build/`, `deploy/`, the repo's root `index.html` and `server/`).
- Every change gets a test, and `./run-tests.sh` must be fully green. Look at visible changes in a real browser. Say what you did **not** test.
- In the same step update `PROJECT_RECORD.md` (newest entry first in section 8) and the matching `HOW-IT-WORKS` guide, run `./check-record.sh`, then `./tools/refresh-exports.sh`, then `tools/publish-repo.sh <git checkout>`. Update files in place; do not create new copies of deliverables.
- Customers have **no cancel option**. A PIN code never refuses an order. AI output is always a draft the owner approves. Nothing is sent to customers without consent (WhatsApp offers need their opt-in). Nobody can promise views or sales: never write copy that does.
- **Never put secrets or personal data in git**: no tokens, keys, passwords, customer names or phone numbers. Use synthetic data in tests. The server keeps secrets encrypted on its own disk.
- Keep answers to the owner short and plain; they use a phone and are not a programmer.

## Where it runs, and who signs in (5 Nov 2026)
- **Live at https://anithapemmasani.com** on one AWS Lightsail server (Mumbai). Update it by pushing to GitHub `main`, then on the server run `sudo anitha-update` (guide 34). GitHub Pages only redirects to the new address (`tools/publish-repo.sh`; `REDIRECT_TO= tools/publish-repo.sh ...` publishes the full site there again).
- **Two sign-ins, enforced on the server** (`wa-assistant/src/roles.mjs`, guide 37): **Owner** at `/owner` (the business: sarees, prices, orders, customers, discounts, privacy, backups) and **Admin** at `/admin` (the look: home page, Pages, colours; and the technical side). Any new owner-app screen or `/admin/api` route must be placed in the right login and tested.
- On computers the sizes are calm (see the last blocks of `src/css/190-design-fixes.css`); phones keep large tap sizes. The Atelier page is removed.

## Commands
`./run-tests.sh` · `./check-record.sh` · `python3 tools/build-split.py --shop-api https://<server> --index` · `./tools/refresh-exports.sh` · `tools/publish-repo.sh <repo>` (details in the handover guide).
