# 13 · Delivery check, gifts, address book, tracking, invoices

## Delivery check (PIN code)
- **Product page and cart:** the customer types a PIN code and sees *"Delivery by 23 Oct – 26 Oct"*, the state, and the shipping rule (₹199, free above ₹10,000). The PIN is remembered on the phone.
- **Rules you control** (admin → *Delivery & Gifting*): packing time before dispatch (working days), zones (states, min/max days, deliver yes/no), "rest of India", and a list of PIN codes you do not serve. Days are **working days from the day payment is received; Sundays are skipped**.
- **The same code runs in the store and in the WhatsApp assistant** (`shared/pincode-core.js`, copied into both by `tools/sync-shared.py`). After changing rules, press *Send sarees & policies* so the assistant has them too.

## Address double-check (never blocks an order)
- **We ship wherever the customer asks.** A PIN code, city or area can never stop an order, on the website or in WhatsApp.
- The first two digits of a PIN identify its state; about 150 well-known cities are mapped to their state. If the PIN, city and state disagree (for example PIN 500072 with "Bangalore"), if the PIN does not exist, or if the area is one you marked *not usually delivered*, the customer sees a friendly note, for example *"PIN 500072 belongs to Telangana, but the state says Karnataka. Please double-check. You can still place your order."*
- **Website checkout:** note only; no tick box, no blocking. No delivery date is shown for doubtful or unusual areas ("we will contact you to confirm the delivery").
- **WhatsApp chat:** the assistant mentions it **once** ("could you double-check?"); if the customer confirms or insists, the order is taken straight away.
- The order is **flagged** (⚠ *check address / delivery* in admin Orders, and in the assistant inbox) so you can phone the customer before dispatch if you want. Nothing else changes.
- An optional live lookup (`PINCODE_LOOKUP=on`, India Post style API) also checks the locality; it only adds a gentle note.
- The checks expect 6-digit Indian PIN codes, but anything typed is accepted.

## Gifts
At checkout (or in the chat) the customer ticks **This is a gift**: gift wrapping (fee set by you, 0 = free), a free **note card** (max 250 characters), **ship to a different address** (recipient name, phone, address, PIN, checked like any address) and **hide my name, prices and invoice from the parcel**. The recipient is never messaged. In admin → Orders → **Slip** prints the packing slip: recipient address, note card, "SENDER HIDDEN" and **no prices**. On product pages **🎁 Send this as a gift** opens checkout with the gift box ready.

## Saved addresses
Addresses (home, mother, gift recipients) are saved when the customer orders ("Save this address" is ticked by default) and can be added or removed in My Account. At checkout they appear as one-tap chips. In the chat the assistant can offer "same address as last time?". (Re-ordering is not offered: most sarees are single pieces.)

## No cancellation
There is **no cancel option** for customers on the website, in My Account, or in WhatsApp; the assistant explains the policy and hands over only for damaged/wrong items or real emergencies. What customers *can* do until the parcel is shipped is **change the delivery address** (My Account → Track, or *Help & support* in WhatsApp). You are told when they do (and warned if the parcel was already packed). Only you can cancel or release an order from admin.

## Tracking
- **Statuses:** placed → confirmed/paid → **packed** → **shipped** (courier name/number + optional https tracking link) → **out for delivery** → **delivered**. Update them in admin → Orders (website) or the assistant inbox (WhatsApp orders). Each change messages the customer on WhatsApp.
- **Website customers:** My Account → *Track* shows the steps with times, the expected delivery, courier link, and *Change delivery address*.
- **WhatsApp customers:** two buttons under the order messages: **Track order** and **Help & support** (no cancel button). *Track order* replies with the status and a private link `…/track/<random>` (a page with the steps; no phone number or street address is shown). *Help & support* asks "what do you need?" (change the delivery address, a question, anything); the customer's next message goes to the assistant, which can change the address before dispatch, answer, or hand over to you.

## Invoice on WhatsApp
When a WhatsApp order is paid the customer receives a **GST invoice as a PDF** (`…/invoice/<random>.pdf`) with an invoice number (`AP-INV-W0001` …). Prices include GST; the invoice shows the GST part of the total (CGST+SGST when the delivery state equals the state in your GSTIN, otherwise IGST). **Have your accountant check the layout and rates.** Outside WhatsApp's 24-hour window a template with the link is sent instead. Importing the order into the store creates the same invoice number in Invoices.

## Review request
48 hours after *delivered* (set `REVIEW_REQUEST_AFTER_HOURS`) the customer gets **one** friendly message with a link to that saree's page and "reply STOP to stop". Never twice, never to anyone who sent STOP. Reviewing needs a delivered order, which the import sets automatically.

## From WhatsApp to the store
*WhatsApp Assistant → Add / update WhatsApp orders in the store* brings paid orders in (customer, address, gift options, invoice, stock) and **keeps them updated** as you mark packed / shipped / delivered on the assistant side.

**Primary address and suggestions (29 Oct 2026).** The address in *My Account → Profile* is automatically kept in the address book as the **primary (★)** address; *Make primary* on another saved address switches it. Checkout lists the primary one first. While typing, a 6-digit PIN suggests the city and state, a known city suggests its state, and the city/state boxes offer a pick list. Suggestions are marked internally and never replace something the customer typed, except when the new PIN belongs to another state.

## India Post & shipping tools (3 Nov 2026)
Orders tab:
- **Shipped** now opens a dialog: pick the courier (India Post Speed Post is first), type the tracking number, and the tracking link and the customer message are prepared. **Save & send to customer on WhatsApp**: in the owner app the server sends the message by itself (no button to press). It skips customers who asked to stop, and never sends the same tracking number twice; a corrected number is sent again. Needs WhatsApp connected on the server (until then it is a dry-run, and the `order_shipped` template must be approved in Meta for customers who have not chatted in 24 hours). In the all-in-one demo it opens WhatsApp with the message ready instead. The number is checked against the India Post pattern (2 letters + 9 digits + 2 letters) and only warns.
- **Label**: A5 print with the customer's address, PIN in large boxed digits, phone, and your shop address and logo as sender.
- **📲 Tracking** (on shipped orders): sends the tracking message again. **+ Tracking** appears if you skipped it.
- **🚚 Dispatch list**: all *Packed* orders on one page (order, address, PIN, phone) with blanks for tracking number and postage, for your visit to the post office.
The app does not check delivery status itself; mark orders *Delivered* by hand.
