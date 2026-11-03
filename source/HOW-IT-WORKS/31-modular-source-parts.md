# 31 · The website is now written in parts (4 Nov 2026)

## Why
The whole shop front end was one file of 7,500 lines. It is now split into small parts, one per feature, so a change touches one small file and nobody has to search a giant one. **Nothing visitors or the owner see has changed**: the joined file is byte for byte the same as before the split (checked), and the built website is identical.

## Where things are
- `src/css/` the styles, in order: base, storefront, drawers and modals, admin, image studio, cart and delivery, home page hero, login and account, product page, drafts, mobile, bottom tab bar, phone polish, owner dashboard, storefront extras, owner app new look, design fixes.
- `src/html/` the page skeleton: head, `body-open`, `storefront` (header, home, collection, care, journal, atelier, footer, tab bar), `admin-view` (the owner app), tail.
- `src/js/` one file per feature, in running order (helpers, build, database, navigation, storefront logic, login and consent, privacy notice, admin logic, image studio, forms, product page and SEO, pages (care, journal, atelier), AI agents, statements, home page and hero, search, banners, alerts, reviews, WhatsApp, cart follow-up, delivery, init, extras, dashboard, AI helpers, drafts, Instagram, social studio, growth, privacy). Files named `*-shared-*.js` are copies of `shared/*.js`: change `shared/` and run `tools/sync-shared.py`.
- `src/manifest.json` the order the parts are joined in.

## How to work
1. Edit a part in `src/`.
2. `python3 tools/join-parts.py` writes `anitha-store.html` (`run-tests.sh`, `tools/build-split.py`, `tools/publish-repo.sh` and `tools/refresh-exports.sh` do this for you; run it yourself before running a single browser test).
3. `./run-tests.sh`, then the usual record, refresh and publish steps.
`python3 tools/join-parts.py --check` fails if `anitha-store.html` differs from the parts. `./check-record.sh` and `tests/parts-test.cjs` run that check, so a hand edit of `anitha-store.html` is caught.

## What did not change
The build (`tools/build-split.py`), the website, the owner app, /admin2, the server, the tests and the deploy all work as before. The pages are still one single-page site (Home, Collection, Saree Care, Journal, Atelier and the product pages open inside it, no separate web addresses). Giving each page its own address is a separate, larger step that has not been done.

## Tests
`tests/parts-test.cjs` (8 checks): every part is in the manifest and listed once, the joined file equals the parts, the page keeps its four style blocks and single script, the three shared blocks have their own parts, syncing shared code changes nothing. Plus the whole existing suite on the joined file.
