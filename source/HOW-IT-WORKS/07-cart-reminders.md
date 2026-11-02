# 07 · Cart reminders

1. A signed-in shopper ticks **"Remind me on WhatsApp if I leave without ordering"** (cart drawer, checkout, or My Account). Without this tick nothing about their cart ever leaves the browser.
2. The store sends the cart (ids and quantities, never prices) to the assistant server (`POST /cart/sync`). The server checks the shopper's token with the login service (`CUSTOMER_TOKEN_CHECK_URL`); live mode refuses carts until that is set.
3. A job runs every minute. First reminder after 60 min of inactivity, second ≈25 h after the first (`CART_REMINDER_DELAYS_MIN`). Never more than 2 per cart / per week, never 9 pm–9 am IST, never while the customer is chatting or the owner has taken over, never for sold-out sarees, not after 72 h, not after an order or STOP.
4. Each reminder is **claimed in the database before sending**; a failed send is retried once after an hour.
5. Reminders are Meta-approved **templates** (`cart_reminder_1`, `cart_reminder_2`; wording is shown in the store admin tab). If the customer replies, the assistant uses `get_customer_cart` to help finish the order.
6. Withdrawing consent or sending STOP deletes the stored cart. Results (waiting, sent, recovered, failed) show in the admin tab and the inbox → Carts.
