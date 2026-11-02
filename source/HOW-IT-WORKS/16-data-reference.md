# 16 · Data reference: what is stored, where, and who can see it

Last updated 30 Oct 2026. This page lists **every piece of data** the project keeps. If you change what is stored, change this page in the same step.

## 1. Where data lives

| Place | What | Lives in | Shared between phones? |
|---|---|---|---|
| **The store (browser)** | the whole shop: products, orders, customers, settings… as one object `db` | `localStorage` key `ap_db_v70` (about 5 MB limit) | **No.** Each browser has its own copy until you host a backend |
| Cart | `[{id, qty}]` only (prices are always read live) | `ap_cart` | No (per customer phone) |
| Wishlist | list of product ids | `ap_favourites` | No |
| Recently viewed | last 8 product ids | `ap_recent` | No |
| Saved delivery PIN | the PIN last checked | `ap_pin` | No |
| Login session | `{userId, phone, token, demo, exp}` (30 days) | `ap_session` | No |
| "Welcome back" card | shown once per visit | `ap_resume_seen` | No |
| Admin unlock | `1` for the tab session | `sessionStorage` `ap_admin` | No |
| Assistant admin token | typed in the admin; **never saved with shop data** | `sessionStorage` `wa_admin_tok` | No |
| **The server (owner app data)** | the whole shop `db` as saved by the owner app, the owner login (password hash, 2-step key), the audit log, the Instagram queue and photos | `wa-assistant/data/shop-db.json`, `admin.json`, `admin-audit.log`, `social.json`, `media/` | Yes. The owner app is the only editor; the website reads a safe copy |
| **The assistant server** | chats, order requests, carts, hand-overs, catalogue copy, usage counts | `wa-assistant/data/` (JSON files, `DATA_DIR`) | Yes (one server) |
| Knowledge for the assistant | tone and rules (`persona.md`), fallback policies (`policies.md`) | `wa-assistant/knowledge/` | Yes |
| **Project exports** | raw copies for you | `data-export/anitha-store-data.json` (the whole `db`), `data-export/assistant-catalogue.json` (what the assistant receives) | files |

Exports are refreshed in place by `tools/refresh-exports.sh`. The data export holds **demo** customers and bank details; real data appears only when real customers use the store. To load an export into a browser: `localStorage.setItem('ap_db_v70', <file contents>)` in the console.

## 2. The store's database (`db`)

Dates are `YYYY-MM-DD` (IST); times are ISO UTC and shown in IST. Money is whole rupees.

**`settings`** – business and switches: `businessName, gstNumber, gstRate, invoicePrefix, address, phone, email, bankName, accountNumber, ifscCode, adminPin (default 1234), siteUrl, metaDescription`; assistant: `assistantUrl, waAutoPublish, waNumber, waChatOn (website chat button), waOrdersOn (take orders in chat, default on), waGreeting, waPolicies{shipping, returns, payment, care, timings, custom…}`; shop: `delivery{zones, blockedPincodes, processingDays…}, giftWrapFee, dispatchTime, returnDays, grievanceOfficer, autoApproveReviews, showRecentlySold`; login/AI services: `otpEndpoint, aiEndpoint`, `ai{master, describe, photo, reply, write, review, ask, summary, pricing, cleanup, translate}`; invoices: `selectedTemplate, templateCustom`.

**`categories`** (saree categories) and **`accessoryCategories`** (jewellery, blouses, bags…) – plain name lists. A product is an accessory when its category is in `accessoryCategories`.

**`products`** – `id, sku, name, category, price, stock, threshold, images[] (photos), image (cover), video (YouTube/Vimeo/mp4 link), daylight (last photo is daylight), fabric, colours[], description, tags[], slug, seoTitle, metaDescription, altText, rating, reviews (count), isNew, occasions[] (optional)`. Stock is reduced when an order is placed.

**`users`** – customers: `id, name, phone, whatsapp, email, joined, status, phoneVerified, address (text), addr{street, city, state, pincode} (profile address), addresses[] (address book), consents{orderUpdates, marketing, cartReminder, updatedAt}, cartSynced, deletionRequestedAt, termsVersion, termsAcceptedAt`. Each address-book entry: `id, label, name, phone, street, city, state, pincode, primary`. The profile address is always kept as the **primary** entry.

**`orders`** – `id (AP-YYYYMMDD-XXXXX), userId, customer, phone, email, date, status (placed → confirmed → packed → shipped → out_for_delivery → delivered; cancelled only by the owner), total, items[{productId, name, sku, quantity, price, image, category}], pricing{subtotal, shipping, discount, giftWrap, total, bundle?, bundleDiscount?}, coupon, shippingAddress{name, phone, street, city, state, pincode, country}, billTo, gift{wrap, note, hideSender, fee, toOther}, delivery{label}, addressCheck{status ok|confirm|mismatch|invalid|unserved, confirmed}, payment{method, provider, paymentId, status, paidAt}, consent{terms, whatsappOrderUpdates, whatsappOffers}, timeline[{status, time, note}], invoiceGenerated, invoiceId, source ('whatsapp' for chat orders), tracking/courier fields`.

**`invoices`** – `id, orderId, customer, email, phone, amount, date, status, template, items, shippingAddress, pricing`.

**`coupons`** – `code, type (percent|flat), discount, active, description, minOrder, expiresAt, maxUses, oncePerCustomer, firstOrderOnly, announce, channel (all|website|whatsapp)`.

**`bundles`** – `id, name, productIds[], type (percent|flat), value, active`.

**`reviews`** – `id, productId, userId, orderId, name, rating, title, text, photos[], status (pending|approved|rejected), createdAt, reply, replyAt, moderatedAt`.

**`stockAlerts`** – "tell me when it is back": `id, productId, userId, phone, status (waiting|notified|cancelled|skipped), createdAt, notifiedAt`. **`similarAlerts`** – "tell me about similar sarees": `id, sourceId, userId, phone, category, fabric, min, max (price band ±30%), status, createdAt, notifiedAt`.

**`outbox`** – WhatsApp messages queued by the store (back-in-stock, similar-arrival): `id, type, alertId, userId, to, productId, productName, link, status (queued|sent|failed), createdAt, sentAt, error`.

**`consentLog`** – append-only record of every consent given or withdrawn: `userId, phone, type (terms, orderUpdates, marketing, cartReminder, stockAlert, similarAlert, reviewPublic…), granted, version, source, at, ref`. It is never edited.

**`drafts`** – products being prepared in Image Studio: `id, sku, name, category, images[], image, size, bg, date, price, stock, fabric, colours[], description, tags[], lang, seoTitle, metaDescription, altText, slug, video, detailsAt`. *Ready to post* = photo + real name + category + price + description (30+ characters).

**`logs`** – audit trail: `id, type (product_created, stock_in, stock_out, category_created, bundle_created, settings_changed, invoice_sent…), product, sku, change, prev, curr, reason, time`.

**`home`** – the home-page editor: `hero{autoplay, interval, slides[]}, categories{show, items[]}, announcements, arrivals, signature{tiles[]}` (slides and announcements can be scheduled in IST).

**`accessorySeeded`** – internal flag so the demo accessories are added only once.

## 3. The assistant server's data (`wa-assistant/data`)

| Data | Contents | Notes |
|---|---|---|
| conversations | per customer phone: name, status (bot/human), last message time, chat log, history for Claude, pending help/address request | old chats trimmed; STOP removes cart data |
| handoffs | questions the assistant passed to you | open / closed |
| orders | WhatsApp order requests: items, ship-to, bill-to, gift, coupon, pricing, status, payment link/ids, tracking token (128-bit), address check, invoice number | prices fixed by the server |
| carts | consented cart snapshots, reminder history (max 2) | used only for reminders |
| optOut | phones that sent STOP | never messaged again |
| catalogue | the copy of your products, policies, delivery rules and coupons you last published | has `shop.ordersOn`, product `type` |
| usage | Claude calls per day (spend cap). The AI-helper rate limit is counted in memory only | |
| seen | message ids already handled (no double replies) | |

The Claude key, WhatsApp token and payment keys live **only** in the server's `.env`.

## 4. What is sent to AI (Claude)

Product facts and the photo you press the button on; public review text; the chat you ask a reply for (without the phone number); summarised numbers for Ask / Summary / Pricing (no customer names, phones, emails or addresses); customer names and addresses only for the spelling check, after you confirm. Nothing is sent to customers automatically.

## 5. Privacy and deletion

- Customers can switch each WhatsApp message type on or off in **My Account**; every change is logged in `consentLog`.
- "Request account deletion" marks the account (`deletionRequestedAt`); the owner removes the data; STOP clears reminders at once.
- Customer data in the repository: **none**; the demo data is invented. The data export is yours to keep private.
- Browser data can be cleared by the customer; the owner should export regularly until a hosted backend exists.
