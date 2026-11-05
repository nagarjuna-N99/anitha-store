# 41 · Website orders: ask the owner, approve, pack and post, tracking by reply (12 Nov 2026)

Code: `wa-assistant/src/orderflow.mjs` (all the steps), `weborders.mjs` (`mark`), the owner-command hook at the top of `pipeline.mjs`, routes `POST /public/order` and `/admin/api/web-orders/accept` in `adminroutes.mjs`, the card on the Orders tab (`orderFlowCardHTML` in `100-admin-logic.js`). Nothing is charged on the website: payment is still agreed on WhatsApp, and customers still have no cancel option.

## The steps
1. **Someone orders on the website.** The server checks it against real prices and stock. The owner is sent **everything** on WhatsApp and by email: customer name, phone, email, the full delivery address, every item with its SKU, quantity, price and **product link**, totals, discount, gift wrap and note card, "keep the sender's name off the parcel", the customer's instructions, the delivery estimate, and any problem found ("only 1 in stock", "total does not match"). It ends with the question: **YES WO-0001** to approve, **NO WO-0001 reason** to decline.
2. **Automatic approval (owner login → Orders → "Website orders: approval and alerts").** Off by default. When on, an order is approved at once, with no question, **only if everything is in stock and the prices match**. Anything odd still waits for a YES. The owner still receives the pack-and-post details (step 3).
3. **Approved** (by the YES reply, by the Accept button in the owner app, or automatically): the server adds the order to Orders (status *placed*, source *website*, timeline line says how it was approved), records or reuses the customer with the consents they gave, takes the stock and writes the stock-out log. Then the owner gets the **pack-and-post details** on WhatsApp and by email. The email is a **printable page**: a big address label, a packing table with item links, gift and instruction lines, the reply instruction.
4. **After posting, reply on WhatsApp** to the shop number: `TRACK AP-20261105-AB12C EE123456789IN` (the web order number `WO-0001` also works; put `dtdc`, `delhivery` or `bluedart` before the number for those couriers; India Post is the default). The order is updated by itself: courier, tracking number and link, status **Shipped**, a timeline line. The **customer is told on WhatsApp** (only if they agreed to order updates and have not sent STOP; otherwise the owner is told nothing was sent). The same number is never sent twice.
5. **Declining:** `NO WO-0001 sold out`. A reason is needed and is kept on record. Tell the customer yourself.

## Rules
- Only the owner's own WhatsApp number can give these commands (the number set in the owner app, or `OWNER_PHONE` on the server). Anyone else's YES is an ordinary customer message. The webhook is signature-checked as before.
- Each step is **marked before it is done**, so a retried order or a repeated reply never asks, approves or sends twice.
- If no owner number is set anywhere, nothing goes to WhatsApp but the email still does.

## WhatsApp templates to create in Meta (utility)
WhatsApp only lets the shop start a chat with an approved template. While the owner has not written to the shop in the last 24 hours the two messages above go as templates carrying the details on **one line**; the owner's reply (YES, or just "hi") opens the 24-hour window and the full formatted text follows. The email always has everything.
| Template (env name) | Default name | Wording | Variables |
|---|---|---|---|
| `OWNER_ORDER_TEMPLATE` | `owner_new_order` | New website order {{1}}: {{2}} Reply YES {{1}} to approve or NO {{1}} and a reason to decline. | 1 order number, 2 customer, phone, items with links, total, address |
| `OWNER_READY_TEMPLATE` | `owner_order_approved` | Approved: order {{1}}. {{2}} Pack and post it, then reply TRACK {{1}} and the tracking number. | 1 order number, 2 the same one-line details |
Create them in Meta (category Utility), mark them Approved in the WhatsApp promotions → Templates list for your own record, and the names can be changed with the two environment settings.

## Also changed
- **Image Studio belongs to the Owner login only** (she makes the photos and posts). It was briefly moved to Admin by mistake and put back the same day.
- The old behaviour of the Accept button (done in the browser) is replaced by the same server step, so every route behaves the same.

## Not tested
Real Meta delivery and template approval, a real SMTP mailbox, printing from a phone. Tests: `orders:`, `tracking:`, `decline:`, `auto-approval` and `end to end:` checks in `wa-assistant/tests/run.mjs`; `tests/orderflow-test.cjs` for the Orders card; `tests/dpdp2-test.cjs` for the Accept button against a real server.
