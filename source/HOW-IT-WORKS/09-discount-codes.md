# 09 · Discount codes

**Create:** admin → Coupons. Code, value (percent or flat ₹), and optional rules: minimum order, expiry date (end of that day IST), max total uses, first order only, once per customer, where it works (website + WhatsApp / WhatsApp only / website only), "assistant may mention it".

**Same rules in two places:** the store checkout (`couponProblem`) and the assistant server (`validateCoupon`). The shipping rule uses the order value *before* the discount; total = items + shipping − discount, never below zero.

**In the chat:** the customer gives a code → Claude calls `check_discount_code` (exact price from the server) → `create_order_request` with `discount_code`. If invalid the order is **not** created and the customer is told why. Claude can only mention codes returned by `list_offers` (the ones marked "assistant may mention"). Wrong guesses are limited to 6 per customer per hour, then the owner is pointed to.

**Limits hold across channels:** the store sends the assistant each code's website usage and the phones of past buyers (last 10 digits only); WhatsApp orders count on the server. Cancelled or expired orders give a use back. Paid WhatsApp orders imported into the store keep their code, so the next publish keeps counts right.
