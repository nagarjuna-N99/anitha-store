# 08 · Orders and payment links on WhatsApp

```
customer says yes → order request (server prices it) → owner presses "Send payment link" (or auto)
→ server re-checks stock, makes ONE link, holds the saree 24 h, sends the link in the chat
→ customer pays on the gateway page → gateway sends a SIGNED notice to /payments/webhook
→ order "paid" + confirmation message → owner packs → "Mark shipped" (tracking sent)
→ store admin → WhatsApp Assistant → "Add paid orders to the store" (stock, customer, invoice)
```
**Statuses:** new → payment_pending → paid → packed → shipped → out_for_delivery → delivered; or cancelled (owner only) / expired; `payment_issue` when the amount is wrong. See `13-delivery-gifts-tracking.md` for gifts, address changes, tracking page, invoice PDF and review request.
**Key safeguards:** only the gateway's signed message (or the owner) can mark paid; the amount is fixed by the server (items + shipping ₹199 under ₹10,000 − discount); a different amount is never accepted; late payment after expiry is accepted but flagged; double approvals create one link; repeated gateway notices are ignored; sarees are held while a link is open or a paid order is not yet imported; messages outside the 24 h window go as templates (`payment_link`, `payment_received`, `order_packed`, `order_shipped`, `order_out_for_delivery`, `order_delivered`, `invoice_ready`, `review_request`).
**Gateway:** `PAYMENT_PROVIDER=mock` (fake test page, no account) or `razorpay`; add other gateways in `src/payments.mjs`. Refunds are done in the gateway dashboard.
**Approval:** `ORDER_APPROVAL=owner` (default) or `auto`.

## Special instructions at checkout (4 Nov 2026)
Customers can type an optional request (up to 300 characters) before paying: blouse stitching, fall and pico, delivery time, "call before delivery". The owner sees it in orange in the Orders list and at the top of the order details, on the packing slip and the dispatch list, and the dashboard lists new orders with a request so none is missed. Read it before packing; if the request changes price or time, message the customer first. The customer can see their own request on the track-order page.
