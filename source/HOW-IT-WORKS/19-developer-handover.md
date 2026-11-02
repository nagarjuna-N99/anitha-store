# 19 · Developer handover (for the next person or AI)

Read this first, then `PROJECT_RECORD.md` (status and history) and `CHANGELOG.md` (what changed, newest first). Last updated 10 Nov 2026.

## What this is
A saree shop for Anitha Pemmasani (Hyderabad): a public website, a password-protected **owner app**, and a Node server that holds the shop data and talks to WhatsApp, Instagram, Claude (Anthropic) and email. Nothing here belongs to any other project.

## Layout (the folder `source/` in git; the same layout on the owner's computer)
| Path | What it is |
|---|---|
| `anitha-store.html` | **The single source** of the whole front end (store, owner app, demo). About 900 KB, one file, no framework. A runtime flag decides what it is: `const BUILD = window.__BUILD || 'dev'` → `dev` all-in-one demo (admin PIN in the demo), `site` public website, `admin` owner app. |
| `tools/build-split.py` | Builds `build/site/index.html` (public site: admin screens, demo PIN and bank details removed, `window.__SHOP_API`) and `wa-assistant/public/admin.html` (owner app). Flags `--shop-api <https url>`, `--index` (copy to `deploy/`/root index). |
| `tools/refresh-exports.sh` | After tests pass: refreshes `data-export/*.json`, the zip, the site build, `CHANGELOG.md`. Same file names every time (never create new copies). |
| `tools/sync-shared.py` | Copies `shared/*.js` (PIN-code and packing-slip logic used by both browser and server) into `anitha-store.html` and `wa-assistant/src`. Run after editing `shared/`. |
| `tools/make-changelog.py` | Writes `CHANGELOG.md` from section 8 of `PROJECT_RECORD.md` (that section is the one place history is written). |
| `tools/publish-repo.sh <repo>` | Copies everything needed into the git repository (see "Publishing"). |
| `wa-assistant/` | The Node 20 server (`server.mjs`, `src/*.mjs`, `public/*.html`, `tests/run.mjs`). Deployed as `server/` in git. `public/admin.html` is **generated**: never edit it by hand. |
| `shared/` | Code shared by browser and server, plus `brand/` (logo files). |
| `tests/*.cjs` | 28 Playwright browser suites. `wa-assistant/tests/run.mjs` is the server suite (444 checks). |
| `run-tests.sh`, `check-record.sh`, `record-check.cjs` | Run everything; check that the docs match the code. |
| `HOW-IT-WORKS/` | The guides 00 to 19 (owner guide, security, Instagram, AI, growth, this file). |
| `data-export/` | `anitha-store-data.json` (the complete demo shop data object) and `assistant-catalogue.json` (what the assistant server receives). |

## The commands (from the project folder)
```
./run-tests.sh                      # builds, then every suite; all must pass ("ALL PASSED", 444/444)
./check-record.sh                   # the docs must mention every tool, tab, file and the version numbers
python3 tools/build-split.py --shop-api https://<server> --index   # site + owner app
./tools/refresh-exports.sh          # exports, changelog, zip (run after the two above are green)
tools/publish-repo.sh /path/to/git/checkout   # copy to git, then commit and push
```
Browser tests need Playwright (`PW=$(npm root -g)/playwright`) and a Chromium. The server tests and the video analyzer need `ffmpeg` on the machine (the server itself uses the `ffmpeg-static` package on a host).

## How a change is made (the owner's standing rules)
1. Change the code. Edit `anitha-store.html` (not the generated `admin.html` or `build/`), `wa-assistant/src/*.mjs`, or `shared/`.
2. Add or update a test; run `./run-tests.sh` until it is all green. Anything visible must also be looked at in a real browser.
3. In the **same step** update `PROJECT_RECORD.md` (status + newest change-log entry at the top of section 8) and the matching `HOW-IT-WORKS` guide, then run `./check-record.sh`.
4. Run `./tools/refresh-exports.sh`, then publish to git. Update files in place; never create `v2` copies.
5. Rules from the owner: customers have **no cancel option**; a PIN code never makes an order refuse (it only warns); everything an AI writes is a draft the owner approves; **no secrets, tokens or personal data in git** (the server stores secrets encrypted on its own disk).

## How the pieces talk
- **Public site** (GitHub Pages, `index.html`) reads `GET /public/shop` (a safe whitelist of products, categories, home, active bundles, announced coupons, approved reviews with first names) and sends anonymous counts to `POST /public/hit`. CORS allows only `ALLOWED_ORIGINS`.
- **Owner app** (`/admin` on the server) signs in with a password (scrypt), optional 2-step code, 8-hour sessions, lockout after 5 wrong tries, CSRF token + same-site check on every change. Writes are JSON only, **except** `POST /admin/api/video/upload` (raw video, still needs the session and CSRF token). The shop data is one JSON object on the server (`shop-db.json`), saved with versions and a three-way merge so two devices cannot overwrite each other.
- **Server** (`wa-assistant/server.mjs`): WhatsApp Cloud API assistant (inbox, orders, payment links, reminders), Claude helpers (`src/aihelper.mjs`), Instagram posting and insights (`src/instagram.mjs`), video analyzer (`src/video.mjs`, ffmpeg), growth report + weekly email (`src/analytics.mjs`, `report.mjs`, `mailer.mjs`), encrypted secrets (`src/secrets.mjs`: the Claude key and email login are stored in `secrets.json` encrypted with a key derived from `ADMIN_SETUP_TOKEN`).
- **Timers** (`server.mjs`): every minute reminders and order sweeps; every 30 s the Instagram queue, the report check (weekly Monday 8:00 IST, monthly 1st 8:30 IST, daily 21:00 IST if switched on; claimed in `reports.json` before sending) and the daily follower snapshot.

## Environment settings (names only; values live in the host's settings, never in git)
Required to start the owner app: `DATA_DIR`, `ADMIN_SETUP_TOKEN` (first sign-up and encryption key: do not change it later), `PUBLIC_URL` (the server's own **https** address, no trailing slash), `ALLOWED_ORIGINS` (the website's origin), `SITE_URL`. Optional: `ANTHROPIC_API_KEY` (or paste it in the app: Settings → Security & backup), `CLAUDE_MODEL`, `IG_USER_ID`, `IG_ACCESS_TOKEN`, `IG_DAILY_CAP`, `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `OWNER_PHONE`, the template names (`ORDER_SHIPPED_TEMPLATE` …), `PAYMENT_PROVIDER`, `RAZORPAY_*`, `COOKIE_SECURE`, `ADMIN_ALLOWED_IPS`, `PINCODE_LOOKUP`, `FFMPEG_PATH`. The full list with defaults is `wa-assistant/src/config.mjs` and `.env.example`.

## Server routes
Public: `GET /health`, `GET /public/shop`, `POST /public/hit`, `GET /media/<id>.jpg|.mp4`, `GET /admin` (the owner app page), WhatsApp `GET|POST /webhook`, `POST /payments/webhook`, `POST /cart/sync`, `/inbox` and `/test` pages.
Owner (session + CSRF): `/admin/api/` `state, setup, login, logout, db (GET/PUT), version, import, password, 2fa/*, audit, ai-key (+/remove), email (+/remove, /test), growth (+/plan, /done), report/send (kind), report/preview (kind), report/prefs, notify-tracking, social/(status, media, plan, post, cancel, now, retry), video/(upload, job, review)`.
Assistant (bearer `ADMIN_TOKEN` or the owner session): `/api/ai`, `/api/ai/reply`, `/api/inbox*`, `/api/orders/*`, `/api/carts*`, `/api/catalogue`, `/api/status`, `/api/test-chat`.

## The shop data object (`db`)
`settings` (businessName, address, phone, siteUrl, waNumber, delivery, templateCustom, ai switches, igRemindUntil, weekly note …), `categories`, `accessoryCategories`, `products` (id, sku, name, category, price, stock, threshold, images, description, tags, fabric, colours, slug, seo fields; one piece each is the norm), `users`, `orders` (items, shippingAddress, payment, pricing, timeline, tracking, instructions, gift), `invoices`, `logs`, `coupons`, `drafts`, `consentLog`, `home`, `reviews`, `stockAlerts`, `outbox`, `similarAlerts`, `bundles`. A complete example is `data-export/anitha-store-data.json`. **It is demo data only**: the PIN 1234, the bank details, the GST number, the sample customers and orders are placeholders for testing. The real shop data lives only on the server (`DATA_DIR/shop-db.json`) and is backed up from the owner app (Settings → Security & backup → Download a backup); it must never be committed.

## Things that were learned the hard way (do not repeat)
- A top-level `let`/`const` in the page is **not** on `window`; tests use `typeof X !== 'undefined'`.
- `innerText` follows CSS `text-transform`: headings that are uppercase need case-insensitive test matches.
- Raw-body requests (video) are blocked by the JSON-only CSRF rule unless the route is whitelisted in `adminauth.authorize`.
- An unauthenticated upload gets a reset connection (the server answers before reading the body): tests treat that as refused.
- `navigator.webdriver` is true in Playwright: the counter ignores it on purpose, so tests override it.
- Instagram: photos shaped outside 4:5 to 1.91:1 are rejected; a Reel needs an https `PUBLIC_URL` and a file Instagram can download; the daily cap is enforced; a post is claimed before the network call and never retried when the result is unknown.
- The 14-day media sweep must skip files used by queued posts (fixed).
- Orders placed on the public website are **not** sent to the server yet (stage 2); the owner sees orders added or imported in the app.
- Gmail needs an App Password; the saved Claude key and email password cannot be read if `ADMIN_SETUP_TOKEN` changes.

## Publishing to git (`tools/publish-repo.sh`)
The repository has: the public site (`index.html`, `404.html`, logos), `render.yaml`, `server/` (the deployable server, no tests), and `source/` (everything above, so a person or AI can rebuild, test and change the project). `server/` and `index.html` are generated from `source/`: edit in `source/`, then run the script. Hosting is currently Render (the owner plans to move): see HOW-IT-WORKS/17 and the moving checklist in `PROJECT_RECORD.md`.

## Not built yet (ideas the owner has asked about or deferred)
Website checkout that creates orders on the server with a real payment gateway; customer login and reviews on the hosted site; automatic delivery status from India Post (no free public feed); on-screen captions inside the app (editing is done in CapCut/InShot, the app analyses); Instagram analytics beyond what the Graph API gives.
