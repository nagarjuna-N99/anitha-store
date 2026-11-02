# 10 · Testing

Everything was tested against **mock** Claude, WhatsApp and payment services; nothing here has touched the real ones.

- **Server:** `cd wa-assistant && npm install && npm test` → 365 checks. It starts a fake Claude API, a fake WhatsApp Graph API and a fake Razorpay, then drives the real server over HTTP.
- **Browser suites** (Playwright, headless Chromium): `PW=$(npm root -g)/playwright node tests/<name>.cjs`, run from the `APSilks` folder. **`./run-tests.sh` runs everything.** Names and what they cover are in the table in `PROJECT_RECORD.md` §6.
- **After every change:** run the affected suites and all of them before calling it done; add a test for the new behaviour; then update the record and run `./check-record.sh` (it fails if the record is behind).
- **Before real money:** run the assistant with the real Claude key in `/test`, Razorpay in *test mode*, and a WhatsApp test number, and place one complete test order.

**All the browser suites (`tests/*.cjs`)** — run all with `./run-tests.sh`: `smoke2` (orders, invoices), `studio-test2/3` (Image Studio, drafts), `shop-test`, `home-test`, `features-test` (search, alerts, reviews), `mobile-test`, `wa-test`, `cart-test`, `order-test`, `coupon-test`, `delivery-test`, `accessories-test`, `extras-test`, `sold-test`, `crawl-test` (clicks everything), `upgrade-test` (old/empty/corrupt saved data), `dashboard-test`, `ai-test`, `address-test`, `drafts-ready-test`, `admin-app-test` (the real owner app against the real server), and the phone checks `mobile-audit` (every page, popup and admin tab at phone sizes) and `mobile-perf` (slow-phone speed). After every change: tests → `./check-record.sh` → `tools/refresh-exports.sh`.
