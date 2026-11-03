# 32 · Every page has its own web address (5 Nov 2026)

## The addresses (public website)
| Page | Address |
|---|---|
| Home | `/` |
| Collection | `/collection/` |
| Saree Care | `/saree-care/` |
| Journal | `/journal/` |
| The Atelier | `/the-atelier/` |
| Questions | `/faq/` |
| Terms | `/terms/` |
| Privacy Policy | `/privacy/` |
| My Wishlist | `/my-wishlist/` |
| A page the owner added | `/page/<name>/` |
| One saree | `/product/<name>/` |
(On GitHub Pages they sit under `/anitha-store/`.)

## What the visitor gets
- The address in the browser changes as they move around, so they can copy it, share it, open it in a new tab, bookmark it, and use the Back and Forward buttons.
- Opening an address directly shows that page. Each page has its own title and description.
- Old links still work: `#/product/<name>`, `#/terms`, `#/faq`, `#/cart` and the shared wishlist link `#/wishlist/...` (the messages the server sends use these). They are tidied into the new address.
- An address that does not exist opens the home page.

## How it works (no server needed)
- The page is still one app. `tools/build-split.py` writes one real page file for each fixed address (`build/site/collection/index.html` and so on, each with its own title, description and canonical link) plus `404.html`, which is the same app: GitHub Pages shows it for addresses that have no file (a saree, a page the owner added), and the app opens the right page.
- `tools/build-split.py --site-url <public address>` sets the canonical links, `sitemap.xml` and the base path (`/anitha-store/`). `tools/publish-repo.sh` passes `https://nagarjuna-n99.github.io/anitha-store` (override with `SITE_URL=...`).
- The code is `src/js/065-page-addresses.js`. It is switched on only on the public website opened over http(s). The owner app and a page opened from a file behave exactly as before.

## The owner app too
Every screen of the owner app has its own address: `/admin/orders/`, `/admin/products/`, `/admin/home/` and so on (the new look: `/admin2/orders/`). The address changes as you move between screens, Back and Forward work, and you can bookmark a screen or open it in a new tab. You still sign in first; the address only says which screen to show. The server sends the same page for all of these (`wa-assistant/src/adminroutes.mjs`, nothing is baked in), and `/admin/api/...` is never mistaken for a screen. The old `/admin#orders` links still work.

## Search engines
`robots.txt` still says "do not crawl" (the owner's earlier choice), so Google is not told to list the site. When you are ready, change `robots.txt`; the sitemap is already published.

## Tests
`tests/addresses-test.cjs` (25 checks): the page files and sitemap; opening each address directly; the menu links; clicking moves without reloading; Back and Forward; a saree address (open, direct visit, close); old links; an unknown address.
Owner app: `tests/admin-app-test.cjs` (+4 checks: address follows the screen, Back, opening a screen directly) and the server test (+2).
Not tested: the live GitHub Pages site, pages the owner adds, and a custom domain.
