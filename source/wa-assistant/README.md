# WhatsApp sales assistant (Claude + WhatsApp Business)

Answers customers on your shop's WhatsApp number, 24 hours a day, using your product catalogue.
It **hands over to you** for complaints, refunds, custom work, bulk orders and anything it is unsure of.
It never confirms payment, never gives discounts, and every order request waits for **your** confirmation.

```
Customer (WhatsApp) ──► Meta WhatsApp Cloud API ──► POST /webhook (this server)
                                                      │ checks Meta's signature
                                                      │ opt-out / flood / spend-cap checks
                                                      ▼
                                              Claude (tools: search_products, get_product,
                                              send_product_photos, create_order_request,
                                              handoff_to_owner)  ◄── catalogue + policies
                                                      │               uploaded from the store admin
                                                      ▼
                                      reply via Cloud API  +  Inbox page for you
```

## What you need
| Thing | Where | Notes |
|---|---|---|
| A small server with **Node 20+** and HTTPS | any VPS / Render / Railway / Fly | Meta only calls HTTPS webhooks |
| **Claude API key** | console.anthropic.com | set a monthly spend limit there too |
| **WhatsApp Business Platform** app | developers.facebook.com | add a business number that is *not* already used in the normal WhatsApp app |
| Your hosted store address | — | for product links and so the store admin may upload the catalogue |

Costs: WhatsApp charges per conversation (check Meta's current price list for India), and the Claude API charges per message; with `claude-haiku-5-5` a chat reply is a small fraction of a rupee. `MAX_CLAUDE_CALLS_PER_DAY` caps the worst case.

## Setup
```bash
cd wa-assistant
npm install
cp .env.example .env      # then fill it in (see below)
npm test                  # 354 checks against mock Claude/WhatsApp servers; no keys needed
npm start
```
1. **`.env`**: set `ANTHROPIC_API_KEY`, `ADMIN_TOKEN` (long random), `SITE_URL`, `ALLOWED_ORIGINS` (your store address, e.g. `https://www.anithapemmasani.com`). Leave the `WA_*` lines empty at first: the server runs in **DRY-RUN** mode and sends nothing to WhatsApp.
2. Open `https://your-server/test`, enter the admin token and chat as a customer. Open the store admin → **💬 WhatsApp Assistant**, enter the server address and token, press **Send sarees & policies**, then try the test chat again.
3. **Go live:** in Meta's developer dashboard add WhatsApp to your app, then fill `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN` (use a permanent System User token), `WA_APP_SECRET`, `WA_VERIFY_TOKEN`. Set the webhook callback URL to `https://your-server/webhook`, verify token = `WA_VERIFY_TOKEN`, subscribe to **messages**. Restart. `/health` now says `"whatsapp":"live"`.
4. Message your business number from another phone and check the reply, a hand-over, and an order request in `/inbox`.
5. (Optional) Create a utility template in Meta called e.g. `owner_alert` with body `New customer request from {{1}}: {{2}}` and put its name in `OWNER_ALERT_TEMPLATE` plus your number in `OWNER_PHONE`; you will get a WhatsApp ping for every hand-over and order. Without it, check `/inbox` regularly.

## Safety rules built in (and tested)
- **Webhook signature** (`X-Hub-Signature-256`) is verified in live mode; unsigned or wrongly signed calls get 401.
- **Prices, stock and product facts** only come from tools reading your catalogue; order totals are recomputed on the server (the model cannot set a price). Sold-out items cannot be ordered.
- **Policies** come only from the text you wrote in the store admin; otherwise it hands over instead of guessing.
- **STOP / START**: a customer who sends STOP is never messaged again by the bot *or* by the inbox until they send START.
- **24-hour rule**: free-text replies from the inbox are blocked after 24 hours of customer silence (WhatsApp only allows templates then).
- **Duplicates**: Meta retries webhooks; every message id is answered once. Messages per customer are handled one at a time.
- **Flood & cost protection**: 20 messages / 10 min per customer, then silence; `MAX_CLAUDE_CALLS_PER_DAY` hands chats to you when reached.
- **Never silent**: if Claude is down or errors, the customer gets a polite note and the chat appears under *Needs you*.
- **Prompt injection**: customer text is only ever a user message; tools return data only; the persona tells the model to ignore instructions inside chats.
- **Privacy**: only what an order needs is collected. Photos from customers go straight to you (not to the AI). Admin pages and API need `ADMIN_TOKEN`; CORS only allows `ALLOWED_ORIGINS`.

## Abandoned-cart reminders
Shoppers who are signed in **and tick the separate "remind me" box** get at most two WhatsApp reminders about sarees left in their cart.
- The store sends the cart to `POST /cart/sync` (only for consenting, signed-in shoppers). The server re-checks the shopper's token with **your login service** (`CUSTOMER_TOKEN_CHECK_URL`: it must answer `POST {phone, token}` with `{"ok":true}` for a genuine session) and re-reads items from the catalogue. In live mode carts are refused until that URL is set.
- A job runs every minute. First reminder after 60 min of inactivity, second ~25 h after the first; never at night (9 pm–9 am IST), never while the customer is chatting or you have taken over, never for sold-out sarees, never after they order or send STOP, and no reminders after 72 h or beyond 2 per week. Everything is in `.env` (`CART_*`).
- Each reminder is **claimed in the database before sending**, so restarts and overlapping runs can never send twice. A failed send is retried once after an hour, then dropped.
- Reminders must be Meta-approved **templates** (the store admin tab shows the exact wording to submit; names must match `CART_TEMPLATE_1/2`). Meta usually files these under *Marketing*, which is charged at a higher rate.
- If the customer replies, the assistant calls `get_customer_cart` and helps them finish.
- Withdrawing consent in the store, or sending STOP, deletes the saved cart on the server. Shoppers without consent are never stored.
- `/inbox` → **Carts** shows waiting carts, reminders sent, failures and **orders recovered**, with a pause button.

## Orders and payment links on WhatsApp
```
customer says yes ─► order request (server prices it from the catalogue, shipping rule from the store)
   ─► you press "Send payment link" in /inbox (or ORDER_APPROVAL=auto)
   ─► server re-checks stock, creates ONE link at the gateway, sends it in the chat, holds the saree for 24 h
   ─► customer pays on the gateway's page ─► gateway sends a SIGNED notification to /payments/webhook
   ─► order becomes "paid", customer gets a confirmation; you pack it and press "Mark shipped" (tracking is sent to them)
   ─► store admin → WhatsApp Assistant → "Add paid orders to the store" brings it into your orders, stock and invoices
```
- **Only the gateway's signed notification marks an order paid** (or you, by hand). A customer saying "I paid" or the AI saying so changes nothing; the AI is told to check `get_order_status` and never to type a link itself (the server sends the link).
- The amount is fixed on the server. A payment of a different amount is **not** accepted; it raises a hand-over for you. A payment that arrives after the link expired is accepted (it is real money) but flagged for you to check stock or refund.
- Stock held while a link is open or while a paid order is not yet imported; expired/cancelled links release it. Double clicks and parallel approvals create only one link; repeated gateway notifications are ignored.
- **24-hour rule:** if the customer last wrote more than 24 h ago (for example you approve the next day), the link, the "payment received" and the "shipped" messages go as **templates**. Create three utility templates in Meta (see below) and put their names in `.env`.
- **Providers:** `mock` (test pay page at `/pay/mock/...`, no account) and `razorpay`. Adding Cashfree, PayU, Stripe etc. = one small class in `src/payments.mjs` with `createLink / verifyWebhook / parseEvent / cancelLink`. **The Razorpay adapter was written from Razorpay's public API description and tested only against a mock: run it with Razorpay test keys and one test order before going live.**
- Suggested template wording (Utility category; variables in order): `payment_link`: "Hi {{1}}, your order {{2}} total {{3}}. Pay securely here: {{4}}" · `payment_received`: "Hi {{1}}, we received your payment {{3}} for order {{2}}. Thank you!" · `order_shipped`: "Hi {{1}}, your order {{2}} has shipped. Tracking: {{3}}".
- Refunds are done in the gateway's dashboard, not here. A paid order cannot be cancelled from the inbox.

## Discount codes in the chat
Codes are created in the store admin (**Coupons**) with optional rules: minimum order, expiry date, max uses, first order only, once per customer, website / WhatsApp / both, and "assistant may mention it". They travel to this server with **Send sarees & policies**.
- The customer gives a code → the assistant calls `check_discount_code` (exact price from the server) and `create_order_request` with `discount_code`. **Invalid code = no order**, the customer is told why. The AI cannot set or change an amount; extra numbers it sends are ignored.
- The assistant may only mention codes returned by `list_offers` (those marked "assistant may mention"). 6 wrong codes per customer per hour, then it hands over to you.
- The payment link and its message use the discounted total and show the discount line. The discount promised in the chat is honoured even if the code expires before you press Send.
- Limits hold across channels: the store sends each code's website usage and past buyers' phone endings; WhatsApp orders are counted here; cancelled/expired orders give the use back. Same rules as the website checkout.

## Help buttons, address changes, gifts, tracking, invoice, review request
- **Buttons** under the payment link, payment-received and status messages: *Track order* and *Help & support*. **There is deliberately no cancel button or cancel tool**: orders cannot be cancelled; the persona explains this and only hands over for damaged/wrong items or emergencies.
- **Change address** works until the parcel is *shipped*. The customer sends the new address; Claude calls `update_delivery_address`; the server checks PIN/city/state, keeps the history, and alerts you ("ALREADY PACKED" if it was packed). Only the customer's own orders can be changed.
- **PIN check** (offline tables in `src/pincode.mjs`; optional live lookup with `PINCODE_LOOKUP=on`) is **advisory only**: if PIN/city/state disagree, the PIN does not exist, or the area is one you marked "needs a check", the assistant asks the customer once to double-check and then **takes the order anyway**. The order is flagged (`addressCheck`) in the inbox so you can confirm delivery by phone. **An order is never refused because of a PIN code.**
- **Gifts:** `gift` on `create_order_request`: wrap (fee from the store), note card (≤250 chars), recipient address, hide sender. The packing slip (`/api/orders/slip?id=`, button in the inbox) has no prices and no buyer name when the sender is hidden. The recipient is never messaged.
- **Statuses:** paid → packed → shipped → out for delivery → delivered, set from `/inbox` (shipped asks for courier + https link). Each change messages the customer. `/track/<random>` is a private tracking page (no phone number or street address). 
- **Invoice:** on payment a GST invoice PDF (`/invoice/<random>.pdf`, number `AP-INV-W0001`…) is sent as a WhatsApp document (a template with the link outside the 24 h window). Prices are GST-inclusive; CGST+SGST vs IGST follows your GSTIN state and the delivery state. **Have your accountant check it.**
- **Review request:** once per delivered order, `REVIEW_REQUEST_AFTER_HOURS` (48) after delivery, with a link to the saree page; never to anyone who sent STOP.
- **Store sync:** `GET /api/orders/export` returns paid orders that are new *or whose status changed since import*; the store's *Add / update WhatsApp orders* button imports them and acknowledges with `{items:[{id,status}]}`.
- More Meta templates (outside the 24 h window): `order_packed`, `order_out_for_delivery`, `order_delivered`, `invoice_ready`, `review_request` (names in `.env.example`).

## Day to day
- **Inbox** (`/inbox`): *Needs you* (hand-overs), *Orders* (confirm / paid / shipped / cancel, “Message customer”), *All chats* (read, reply, give a chat back to the assistant). When you reply, the assistant stops answering that chat until you press **Give back to assistant**.
- Change a price, stock or policy in the store admin → **Send sarees & policies** (or tick *automatic*). Stock the assistant sees is only as fresh as the last send.
- **Photos**: WhatsApp can only send photos that have a public web address. Products whose photos are stored only in the admin browser are described in words until the store is hosted.
- Change tone or rules in `knowledge/persona.md` (restart to apply). Test after every edit.

## Files
`server.mjs` (HTTP, webhook, admin API) · `src/assistant.mjs` (Claude + tools) · `src/pipeline.mjs` (opt-out, limits, hand-over) · `src/whatsapp.mjs` (Meta API) · `src/store.mjs` (JSON file state in `data/`) · `public/test.html`, `public/inbox.html` · `knowledge/persona.md` · `tests/run.mjs`.

## Not covered yet
- Offer / festival broadcast messages: need Meta-approved templates and customer opt-in; not built (cart and order messages are built).
- Refund automation, partial payments, COD: not built.
- Voice notes and customer photos are handed to you, not interpreted.
- Real model output was verified only against a mock API in these tests: run the test chat with your real key before going live.
- Data is a JSON file (fine for one shop). Back up `data/`; move to a database if volume grows.

## Owner app, shop data and Instagram (added 30 Oct 2026)
`/admin` serves the owner app (`public/admin.html`, built by `tools/build-split.py`) behind a real login; `/public/shop` is the read-only data for the public website; `/admin/api/*` is the owner's API (session cookie + CSRF header); `/media/<id>.jpg` serves Instagram photos. Setup, security and Instagram connection: `../HOW-IT-WORKS/17-owner-app-security-and-instagram.md`.
