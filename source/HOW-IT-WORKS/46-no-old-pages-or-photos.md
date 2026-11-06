# 46 · Why nobody sees an old page, old data or old photos after an update (6 Nov 2026)

The owner saw the old page and old photos on a phone even after refreshing. The causes were layered, so the fix is too. Code: `src/js/390-hosted-builds.js` (`shopSync`, `shopPoll`, `shopBuildCheck`, the admin poll), `wa-assistant/src/sitehost.mjs`, `wa-assistant/src/adminroutes.mjs` (`/public/shop`, `/public/version`, `/admin/api/version`), `tools/build-split.py` (the build stamp).

## What was wrong
- The website painted a **saved copy from the phone first** (or sample sarees for a first-time visitor) and only then replaced it. If anything went wrong on the way, the old copy simply stayed.
- The shop data was allowed to be cached for 15 seconds, other site files for an hour.
- Nothing told an **already open** page (or a page the phone kept in memory, or the browser's back/forward memory) that the shop had changed or that the website itself had been updated.
- One failing step in the update code could stop all the later steps without any sign.

## What happens now
1. **The page waits for the server's answer** before showing content (`html.shop-wait`, at most 2.5 seconds). The old copy never flashes up. If the server cannot be reached, the saved copy is shown as a fallback and nothing is erased. A **first-time** visitor who cannot reach the server sees an honest "We could not load the latest shop just now" with a **Try again** button, never sample sarees.
2. **The answer is never cached**: `/public/shop` is `no-store`, and every request has its own fresh address. A failed try is repeated twice. Every step that redraws the page runs on its own, so one broken part cannot stop the others.
3. **An open page updates itself.** Every minute it asks the tiny `/public/version` ("did anything change?") and refreshes if the shop was saved. It also checks the moment the phone wakes, the tab comes back, the internet returns, or the browser hands back an old page from its back/forward memory.
4. **Every build has a stamp** (`window.__BUILD_STAMP`). If the server's build is newer than the page's, the page **reloads itself once** (never in a loop). The owner and admin apps do the same (they ask `/admin/api/version` every 20 seconds and when the tab comes back), unless there are unsaved changes.
5. **All site files are re-checked on every visit** (`no-cache` with an ETag): an unchanged file costs almost nothing (answer 304), a changed one is sent in full. Photos uploaded in the owner app get a new address each time, so they cannot be mixed up with an old one.

## What the owner can still do
If a phone is stuck on something very old (an old build from before this fix), closing the tab and opening the address again loads the new page once; after that it keeps itself up to date.

Tests: `tests/fresh-site-test.cjs` (real server and real browser: the held-back page, no old title or product name, fresh addresses, updating by itself, back/forward memory, an older build reloading, the offline fallback, the first-visitor message, the owner app reloading), and the `website:` checks in `wa-assistant/tests/run.mjs` (ETag, 304, stamp, no-store).
