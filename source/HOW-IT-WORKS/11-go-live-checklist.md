# 11 · Go-live checklist

1. **Host the store** (any static host + HTTPS) and set `Settings → website address` (used for links, sitemap, share links).
2. **Backend/login service:** `/otp/send`, `/otp/verify` (returns a token) and a token check (`POST {phone, token} → {ok:true}`) — needed for real login and cart reminders. Replace demo OTP.
3. **Host `wa-assistant`** (Node 20+, HTTPS, process manager). Copy `.env.example` → `.env`: `ANTHROPIC_API_KEY`, `ADMIN_TOKEN`, `SITE_URL`, `ALLOWED_ORIGINS`, `PUBLIC_URL`, `CUSTOMER_TOKEN_CHECK_URL`. Back up `data/`.
4. **Claude:** create an API key, set a monthly spend limit, keep `MAX_CLAUDE_CALLS_PER_DAY`.
5. **WhatsApp Business Platform (Meta):** business number (not used in the normal app), phone-number ID, permanent token, app secret, webhook `https://…/webhook` with `WA_VERIFY_TOKEN`, subscribe to *messages*.
6. **Templates (Meta approval):** `cart_reminder_1`, `cart_reminder_2`, `payment_link`, `payment_received`, `order_packed`, `order_shipped`, `order_out_for_delivery`, `order_delivered`, `invoice_ready`, `review_request`, owner alert (`OWNER_ALERT_TEMPLATE`). Wording in the assistant README and the store admin tab.
7. **Payments:** decide the gateway. Razorpay: test keys → webhook `https://…/payments/webhook` (events `payment_link.paid/expired/cancelled`) → one test order → then live keys. Other gateway: add an adapter in `src/payments.mjs`.
8. **Store admin → WhatsApp Assistant:** address + token → *Send sarees & policies* → fill policy boxes → try `/test` → message the business number from another phone.
9. **Delivery rules:** admin → Delivery & Gifting (zones, days, PINs that need a check, gift fee) and your GSTIN/GST rate in Settings; send them to the assistant; ask your accountant to check the invoice PDF.
10. **Lawyer review** of Terms and Privacy; confirm GST/invoice details in Settings.
11. **Switch off demo:** (also hide the *Switch to Admin* button on desktop for customers if you prefer: the phone layout already hides it), change the admin PIN, remove demo products/customers, test a real order end-to-end, set up backups.
- Create the WhatsApp message template `similar_arrival` (variables: product, link, brand) next to `back_in_stock`, and make sure the login/message service accepts it.
12. **AI helpers:** Claude is used by the AI Helper, Product form, Draft details and Inbox through the assistant server (`ANTHROPIC_API_KEY`). Set a monthly spend limit at Anthropic; the server also limits AI helpers to 40 requests a minute. Switch helpers off in Admin → AI Helper if you do not want them.
13. **Backups until a backend exists:** the whole shop is in one browser. Keep a copy of `data-export/anitha-store-data.json` (refresh it after changes) and never clear the browser's site data on the owner's computer without exporting first.
14. **Phone check:** open the live site on 2 real phones (Android + iPhone), place a test order, use the cart, wishlist and account; run `tests/mobile-audit.cjs` after any layout change.
15. **Owner app and website (see 17):** host `wa-assistant` on https (Render, Railway, Fly.io or a small VPS with Caddy); set `ADMIN_SETUP_TOKEN`, `PUBLIC_URL`, `ALLOWED_ORIGINS`; open `/admin`, create the account, turn on 2-step sign-in; build the website with `python3 tools/build-split.py --shop-api https://your-server --index`; upload only `build/site/index.html` to the static host. **Never host `anitha-store.html`** (it has the demo PIN).
16. **Instagram:** follow section 4 of page 17 (Business account + Facebook Page + Meta app + long-lived token, `IG_USER_ID`, `IG_ACCESS_TOKEN`).
