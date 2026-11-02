# 01 · The store

**One file:** `anitha-store.html` (in the APSilks folder). Open it in a browser and you have the shop; the "Switch to Admin" button (asks for the PIN, default `1234`) opens the admin portal.

**Where data lives (demo phase):** the browser's `localStorage`, key `ap_db_v70`, as one object `db`:
`settings, categories, accessoryCategories, products, users, orders, invoices, logs, coupons, bundles, drafts, consentLog, home, reviews, stockAlerts, similarAlerts, outbox`. The cart is separate (`ap_cart`), the wishlist `ap_favourites`, recently viewed `ap_recent`, the login session `ap_session`. **Every field is listed in `16-data-reference.md`.** Because it is browser storage:
- every phone/browser has its **own** copy of the shop until hosting gives it a real backend;
- about 5 MB is available (photos use most of it); the page warns when storage is full;
- "Reset Data" in the admin brings back the demo products.

**What the store does (map):** shop for sarees and accessories, search and filters, occasions, bundles, wishlist, cart and checkout with gifts and saved addresses, delivery and PIN check, order tracking, reviews, back-in-stock and similar-saree alerts, FAQ; admin: dashboard, home editor, products and bulk upload, categories, Image Studio and ready-to-post drafts, orders, invoices, customers, coupons, bundles, delivery, WhatsApp assistant, stock alerts, AI helper, logs, settings. Phones are the main screen: see `02-storefront.md`.

**Parts inside the file** (all plain JavaScript, no framework): storefront rendering, cart/checkout, account + OTP login, consent log, product form and Image Studio, SEO pack generator, home-page editor, search/filters, banners, stock alerts, reviews, phone layout + tab bar, WhatsApp chat button + assistant admin tab, cart follow-up, discount codes.

**Safety habits in the code:** all user text is HTML-escaped; saving checks for full storage; consents are append-only; prices/totals are recomputed from products, never trusted from the page.

**Moving to hosting:** the storefront and admin keep working as they are; the pieces that need a server are listed in `11-go-live-checklist.md`.

**Files are updated in place.** The store file, `data-export/anitha-store-data.json` (raw store data), `data-export/assistant-catalogue.json` and the project zip always keep the same names and are overwritten after each change by `tools/refresh-exports.sh`. Only one rolling backup (`backups/anitha-store.prev.html`) is kept.
