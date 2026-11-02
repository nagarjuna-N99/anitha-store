# 06 · The WhatsApp assistant

**What it is:** a small Node server (`wa-assistant/`) connected to the shop's WhatsApp Business number and the Claude API (`claude-haiku-5-5` by default, change in `.env`).

**Flow:** customer → Meta WhatsApp Cloud API → `POST /webhook` (signature checked) → checks (STOP, flood, daily cap, human takeover) → Claude with tools → reply (+ photos) via Cloud API. Every message id is answered once; one customer's messages are processed one at a time.

**Orders ON/OFF:** the switch *Take orders in WhatsApp chat* (Admin → WhatsApp Assistant, top card) is published with the catalogue as `shop.ordersOn`. When OFF the assistant still chats, searches and sends photos, but `create_order_request` returns "ordering paused" (no order, no address or payment collected) and the system prompt tells it to send customers to the website. Remember to press *Send sarees & policies* after changing it (or tick auto-send). Default is ON.

**Quick-reply buttons** under order messages: *Track order* and *Help & support* (never a cancel button). *Track order* is answered by the server without calling Claude. *Help & support* asks what the customer needs; their next message goes to Claude (with the order as context), which can call `update_delivery_address`, answer, or `handoff_to_owner`.

**Tools Claude can call:** `search_products`, `get_product`, `send_product_photos`, `check_discount_code`, `list_offers`, `create_order_request`, `get_order_status`, `get_customer_cart`, `check_delivery`, `check_address`, `update_delivery_address`, `get_saved_address`, `handoff_to_owner`. `search_products` can be limited with `type` (saree or accessory); the published catalogue tags every product with its type. Tools only read the catalogue the store uploaded; prices, stock and discounts are decided by the server.

**Rules baked in:** policies come only from the text written in the store admin; never gives unlisted discounts, delivery promises or payment confirmation; hands over for complaints, refunds, custom work, existing orders, anger, photos, voice notes; customer text is treated as data, never as instructions; says it is an automated assistant if sincerely asked.

**Owner tools:** `/test` (chat as a customer; nothing is sent), `/inbox` (Needs you · Orders · Carts · All chats; reply, give a chat back to the assistant). Alerts to the owner by WhatsApp template (`OWNER_ALERT_TEMPLATE`) or by watching the inbox.

**Setup:** see the assistant's `README.md`; connect from the store admin (WhatsApp Assistant tab: address + admin token → *Send sarees & policies*).

**Modes:** with no WhatsApp keys it runs in **dry-run** (nothing leaves the server). Costs: WhatsApp per conversation + Claude per message; `MAX_CLAUDE_CALLS_PER_DAY` caps spending.

## Code map (`wa-assistant/`)
| File | Job |
|---|---|
| `server.mjs` | web server: webhook, payment webhook, test pay page, cart sync, admin API, inbox/test pages, 1-minute scheduler |
| `src/config.mjs` | reads `.env`; all settings and defaults |
| `src/store.mjs` | JSON-file state (conversations, orders, hand-overs, opt-outs, carts, usage), atomic writes |
| `src/whatsapp.mjs` | verifies Meta's signature, parses messages, sends text/image/template |
| `src/pipeline.mjs` | the rules before Claude: STOP, flood limit, human takeover, daily cap, 24 h window sender |
| `src/assistant.mjs` | the Claude call, tool definitions and tool execution |
| `src/catalogue.mjs` | read-only product search over the uploaded catalogue (with held stock) |
| `src/carts.mjs` | cart sync and the reminder scheduler |
| `src/orders.mjs` | order lifecycle, payment links, paid/expired handling, export/ack |
| `src/payments.mjs` | payment adapters: mock, Razorpay |
| `src/pincode.mjs` | PIN/city/state check and delivery estimate (generated from `shared/pincode-core.js`) |
| `src/pinlookup.mjs` | optional live PIN lookup (off by default; failures are silent) |
| `src/pdf.mjs`, `src/invoice.mjs` | the tiny PDF writer and the GST invoice |
| `src/slip.mjs` | packing slip (generated from `shared/slip-core.js`) |
| `src/trackpage.mjs` | the private order-tracking web page |
| `src/coupons.mjs` | discount-code rules and guess protection |
| `knowledge/persona.md` | the assistant's instructions (edit, restart, re-test) |
