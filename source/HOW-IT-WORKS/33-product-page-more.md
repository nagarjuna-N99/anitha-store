# 33 · More on the saree page (5 Nov 2026)

Added after studying a reference shop's saree page. Everything shows only facts the shop really has.

- **Delivery date line** under the price: "Delivery by 9 Nov – 11 Nov · Telangana · Free shipping". It uses the PIN code the customer last checked on this phone; until then it says "Enter your PIN code below to see it". It updates when they check a PIN code. The dates come from the delivery settings (Delivery & Gifting tab).
- **Details table** (replaces the short list): Weave, Colours, Category, Origin, Length, Care, SKU, Availability, Rating. Origin and Care come from the built-in notes for each category (Tussar, Maheshwari and so on); a row is left out when there is nothing to show. **Length**: each saree can have its own (a new **Length** box in the product form); otherwise the shop's usual length from **Settings → Usual saree length** is shown (it starts as "5.5 metres, with a blouse piece"; please check it is right for your sarees, and clear the box in Settings to hide the row).
- **Why shop with us:** Pure handloom from Hyderabad · Free shipping above ₹10,000 · Dispatch in (your dispatch time) · (your return window)-day returns · Ask us on WhatsApp. The dispatch time and return days come from Settings; the return line is left out when the return window is 0. The first line uses the owner's own words.
- **A few questions people ask:** five fold-open answers taken from the FAQ page (delivery, colour, payment, care, one-piece).
- **You may also like:** up to four other sarees (accessories get accessories), chosen by same category, fabric, colours, tags and price; with "See all (category)".
- **Sticky bar** at the bottom of the saree page with the price and **Add to cart** (or the back-in-stock alert when sold out).

Code: `src/js/345-product-page-more.js`. Test: `tests/product-page-test.cjs` (14 checks). Not tested on a real phone or with your real photos.
