# 17 · The owner app (separate admin), its security, and Instagram posting

Added 30 Oct 2026. Two files now come from the one source file (`python3 tools/build-split.py`):

| File | Who sees it | What it is |
|---|---|---|
| `build/site/index.html` | **everyone** (put it on any static host: GitHub Pages, Netlify…) | the customers' website. **No admin screens, no PIN, no bank details, no demo customers.** |
| `wa-assistant/public/admin.html` | **only the owner**, served by your server at `https://YOUR-SERVER/admin` | the owner app. The page itself is only a login screen until the server accepts the password |

The old single file `anitha-store.html` is still the source and still works as an all-in-one demo with a PIN (used by the tests and for trying things offline). **Do not host it for real customers.**

## 1. How the separation works
- The shop's data (products, orders, customers, settings…) lives **on the server** (`wa-assistant/data/shop-db.json`, readable only by the server account), not in anyone's browser.
- The website only reads `GET /public/shop`: products, categories, home page, active bundles, announced coupons, approved reviews (first names only) and public settings. Nothing private is in that answer (checked by tests): no PIN, bank details, customers, orders, drafts, logs, secret coupon codes, assistant address.
- Only a signed-in owner can read or change the full data (`/admin/api/*`). A public visitor cannot write anything.
- Saves are **merged**: if a new order arrives while you are editing, your save adds your changes without wiping it.

## 2. Setting up (once)
1. On the server set in `.env`: `ADMIN_SETUP_TOKEN` (16+ random characters), `PUBLIC_URL=https://your-server`, `ALLOWED_ORIGINS=https://your-website` (see `.env.example`). Keep `COOKIE_SECURE` on (default) because the server is on https.
2. Start the server, open `https://your-server/admin`. First visit shows *Create my account*: type the setup token and choose a password (12+ characters, three kinds of characters).
3. Settings → **Security & backup** → set up **2-step sign-in** (authenticator app). Strongly recommended.
4. Settings → Security & backup → **Import a data file** to load your existing `anitha-store-data.json`, or just start editing (a fresh server starts with demo data you can delete).
5. Build the website pointing at the server: `python3 tools/build-split.py --shop-api https://your-server --index` and upload `build/site/index.html`.

## 3. What protects the owner app (and what honestly cannot be promised)
Built in and tested: no default password (first password needs the setup token); passwords stored only as scrypt hashes; login throttled and **locked for 15 minutes after 5 wrong tries** (also 12 against the account); the same message for any wrong login; 2-step sign-in (TOTP, a code works once); random 256-bit session ids kept only as hashes; cookie `HttpOnly`, `SameSite=Strict`, `Secure` + `__Host-` on https; sessions end after 30 minutes idle or 8 hours; every change needs a security token **and** a same-site request (CSRF); no cross-site access (no CORS on the admin); strict page headers (no framing, no sniffing, no referrer); the owner app is not listed on Google; an audit log of every sign-in, failure, lockout and change (never passwords); optional `ADMIN_ALLOWED_IPS` to make `/admin` invisible (404) to everyone else.

**Nothing is unhackable.** Remaining risks you control: a weak or reused password or a phished one (use 2-step sign-in and a unique password); a compromised computer or phone; an unpatched or badly configured server (keep it updated; only ports 80/443 open); someone who gets your `.env` file (it holds the Claude, WhatsApp, payment and Instagram keys: keep it readable only by the server account); and the Instagram token (revoke it in Meta if lost). The customers' website cannot reach any of this.

## 4. Instagram: post when you publish, or at a recommended time
**Where:** (1) when you publish a product (from a draft or the product form) a **📸 Share on Instagram** window opens; (2) 📸 button on each product row; (3) the **📸 Instagram** tab lists scheduled and posted items, with *Post now*, *Cancel*, *Try again* and the link to the post.

**The window:** pick up to 10 photos (a carousel if more than one), edit the caption (Claude drafts it, plus hashtags), choose **Post now**, one of three **recommended times**, or your own time. The server keeps the schedule, so it posts even if you close the page.

**About "recommended times":** Claude suggests slots in the next 7 days using typical Indian Instagram habits (weekday evenings, weekend mornings and evenings) and avoids your other scheduled posts. It does **not** see your account's own statistics, and the window says so. Without Claude connected a built-in rule gives similar slots.

**Safety:** every post is claimed before it is sent and is **never retried automatically if the result is unknown** (no double posts); a temporary Instagram error is retried after 5, 15 and 45 minutes; a daily limit (default 20) holds the rest; photos are converted to JPEG at the right shape (4:5 to 1.91:1) and served from unguessable addresses, deleted after 14 days; the Instagram token never reaches the browser.

**Connecting Instagram (one time, about 30 minutes):**
1. The shop's Instagram must be a **Business or Creator** account, linked to a **Facebook Page**.
2. At developers.facebook.com create an app (type *Business*), add **Instagram Graph API** (and *Facebook Login for Business*), and add yourself as admin/tester. For your **own** account no app review is needed while the app is in development mode.
3. In the Graph API Explorer request a user token with permissions `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, then exchange it for a **long-lived** token and read your **Instagram account id** (`GET /me/accounts?fields=instagram_business_account`). A token made from a long-lived user token for a Page does not expire.
4. On the server put `IG_USER_ID` and `IG_ACCESS_TOKEN` in `.env`, make sure `PUBLIC_URL` is the **https** address of the server (Instagram downloads the photos from it), restart. The Instagram tab shows 🟢 Connected.
Instagram limits: 100 API posts per 24 hours per account (this app stops at 20), captions up to 2,200 characters and 30 hashtags.

## 5. Files on the server (`wa-assistant/data/`)
`admin.json` (password hash, 2-step key), `admin-audit.log`, `shop-db.json` (all shop data), `social.json` (Instagram queue), `media/` (photos for Instagram), plus the assistant's existing files. Back up this folder.

## 6. Not built yet (next stage)
- **Website orders reach the server:** customers' website orders are still created in their own browser (payments on the site are simulated). Real orders come through the **WhatsApp assistant** (real payment links) and appear in the owner app. Moving website checkout to the server with a real payment gateway is the next stage.
- Coupons that are not "announced" cannot be used on the hosted website until the server checks codes (stage 2).
- Reviews, stock alerts and sign-in by customers on the hosted website still need the login service and server endpoints (stage 2).

## Adding the Claude (Anthropic) key (5 Nov 2026)
Settings → Security & backup → **Claude AI key**: paste the key from console.anthropic.com → API keys and press **Save & check key**. The server tests it with Anthropic first, stores it encrypted on the server disk, and starts using it at once. Only the last 4 characters are ever shown again; the key is never sent back to the page. **Remove key** returns to whatever is set in Render (`ANTHROPIC_API_KEY`), if anything. If you ever change `ADMIN_SETUP_TOKEN` in Render, paste the key again. Keep a spending limit on the key in the Anthropic console.
Code: `wa-assistant/src/secrets.mjs` (encrypted store), routes in `adminroutes.mjs`.

## Previews, posting rules and the video analyzer (6 Nov 2026)
**Previews.** After editing a photo, the preview window shows the website page, shop grid and Google, and now **📸 Instagram** (feed, profile grid, Reel/Story safe zones) and **💬 WhatsApp status**. The Share on Instagram dialog has the same preview under "👁 Preview".
**Posting rules.** Red items must be fixed before the post button works. They are Instagram's own limits (photo 320 px minimum and 4:5 to 1.91:1, caption 2,200 characters, 30 hashtags, Reel 3 to 90 s), the no-engagement-bait rule, and for Reels the "own original video" tick. Amber items are advice (tick "post anyway" to override): sharp, bright, 1080 px, 4:5, not a duplicate, a strong first line, a call to action, 3 to 8 hashtags, alt text, the product name in the caption, busy hours (7 to 10 am, 12 to 2 pm, 6 to 10 pm IST), spacing, Reel length 7 to 30 s, a hook line, sound or on-screen text. Nobody can guarantee views or likes, and the app cannot see your account's own numbers.
**Video analyzer** (Instagram tab). Edit your video in CapCut, InShot or your phone, export it (vertical 9:16, 1080p, 30 fps, MP4 H.264, 7 to 30 seconds), then: 1) open the analyzer, pick a product (optional) and your video; 2) wait about as long as the clip; 3) read the score and **Do these first**, fix them in your editor, press **Upload a new version** and watch the score go up; 4) tap the best frame as the cover; 5) optionally **Ask Claude to review the frames**; 6) when it says Ready, write or choose the caption, tick "my own original video", choose a time and post. The video is posted exactly as you uploaded it. For WhatsApp status follow the steps shown in the report (WhatsApp does not let any app post a status for you). The score checks what you control; it cannot predict views. Needs ffmpeg (Render installs `ffmpeg-static`). Limits: 150 MB; Reels 3 to 90 s; status 30 s and 16 MB. Code: `wa-assistant/src/video.mjs`.


**Insights (8 Nov 2026):** to read views, reach and followers the token also needs the permission `instagram_manage_insights`. See 18-growth-and-weekly-email.md.
