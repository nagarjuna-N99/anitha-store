# 12 · Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Admin says "Could not reach the assistant" | server not running, or its `ALLOWED_ORIGINS` lacks the store's address |
| "The admin token was not accepted" | token typed wrongly; it is kept only until the tab closes |
| Assistant says it will "check with Anitha" about shipping/returns | the policy boxes in the admin tab are empty (or not published) |
| Assistant describes a saree but sends no photo | photos are stored in the browser, not web addresses; host the store/images |
| Product missing/outdated in the assistant | press **Send sarees & policies** (or enable automatic updates) |
| Cart reminders not going out | no consent; outside 9 am–9 pm IST; customer chatted <2 h ago; templates not approved; `CUSTOMER_TOKEN_CHECK_URL` not set (live mode refuses carts) |
| Payment link not created | saree no longer available; payment provider keys wrong (see server log) |
| Customer paid but order not "paid" | gateway notification not reaching `/payments/webhook` or wrong webhook secret; check the gateway's webhook log; owner can *Mark paid manually* after checking |
| Imported order missing from store | open admin → WhatsApp Assistant → *Add paid orders to the store* |
| Storage full message | delete drafts/large images; hosting backend removes this limit |
| Coupon refused | read the reason shown (expired, min order, used up, first-order only…) |
| Customer sees "we do not usually deliver here" for a place you do serve | the PIN is in the *needs a check* list or its zone has *We usually deliver* switched off (admin → Delivery & Gifting). They can still order; it only hides the delivery date |
| Customer says the PIN/state warning is wrong | the state tables are by PIN prefix and can be off at borders. It is only a note: they can order anyway; the order shows ⚠ *check address* so you can confirm by phone |
| Invoice PDF has wrong GST | set GSTIN and GST rate in Settings, publish to the assistant; check the figures with your accountant |
| Customer asks to cancel | not offered by design; the assistant explains the policy and hands over only for a damaged/wrong item or an emergency |
| Tracking page says not found | the link is private and exact; re-send it from the order (Track order button) |
| AI Helper says Claude is not connected | enter the assistant address and admin token in Admin → WhatsApp Assistant (the token is forgotten when the tab closes); the server needs `ANTHROPIC_API_KEY` |
| An AI button is greyed | that helper (or the master switch) is off in Admin → AI Helper → Switches |
| "Too many AI requests" | the server allows 40 a minute; wait a minute |
| A draft says *Needs details* | open it → **Add details** (name, category, price, description are required); ✨ fills the rest |
| *Post now* says the SKU is used | another product has the same SKU; open **Full form** and change it |
| City/state did not fill from the PIN | the PIN area is not in the small built-in table; type them (a state is still suggested) |
| Chat orders do not work | Admin → WhatsApp Assistant → *Take orders in WhatsApp chat* may be OFF; publish after changing |
| Shop shows only 24 sarees | press **Show more** at the bottom of the list |
| Owner cannot find *Switch to Admin* on a phone | use menu → **Owner login** |
| Data disappeared | the browser's site data was cleared; load your last `data-export/anitha-store-data.json` (see `16-data-reference.md`) |
| Cannot create the owner account | `ADMIN_SETUP_TOKEN` is missing or under 16 characters on the server, or the typed token is wrong (5 wrong tries lock it for 15 minutes) |
| "Too many wrong attempts" at sign-in | wait 15 minutes; check `admin-audit.log` for who tried |
| Locked out (lost password or 2-step phone) | stop the server, delete `data/admin.json`, set a new `ADMIN_SETUP_TOKEN`, start again and create the account again (your shop data is not touched) |
| "Not saved: offline" badge in the owner app | the server cannot be reached; it retries every 5 seconds and keeps your changes in the page; do not close the page until it says Saved |
| "Reload the page: the shop changed elsewhere" | the page was open for a very long time; reload and redo the last change |
| Website shows old products | the website caches the server's answer for about 15 seconds; reload; check the website was built with `--shop-api` |
| Instagram says "PUBLIC_URL must be https" | set `PUBLIC_URL` on the server to its https address |
| Instagram post failed with a token message | the access token expired or lost a permission; make a new long-lived token (page 17 §4) |
| Instagram post marked "Please check Instagram" | the server restarted mid-post; look at Instagram: if the post is there dismiss it, if not press *post again* |
