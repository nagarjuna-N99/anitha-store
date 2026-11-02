# 14 · Storefront extras (occasions, bundles, similar-saree alerts, bulk upload, status images, FAQ)

Added 26 Oct 2026. All of this lives in the store file; nothing needs the assistant server except the WhatsApp message in "similar-saree alerts".

## For customers
- **Shop by occasion** (home page): tiles for Wedding, Festive, Office, Party, *Gifts under ₹10,000* (hidden while no saree is in that budget) and Accessories. A tile opens the shop already filtered; the filter shows as a chip you can remove. A saree's occasions come from its category, plus any tag named like an occasion (e.g. `wedding`).
- **Recently viewed** (home page): the last 8 sarees this phone looked at. Stored only in the customer's own browser.
- **Share my wishlist** (Favourites page): makes a link like `…/#/wishlist/slug1,slug2` and shares it on WhatsApp, Telegram or email. The friend sees only those sarees (not the account) and can browse or buy. Sold-out or removed ones are shown as sold or skipped.
- **Product page:** a colour note ("colours can look slightly different…"); **▶ Watch it draped** (jumps to the product video); **☀ See the daylight photo** (jumps to the photo marked as daylight); a gold note on single-piece sarees ("One of a kind, a single designer piece"); a **Buy together & save** box when the saree is in a bundle.
- **One of a kind** replaces "Only 1 left" on cards and pages for sarees with stock 1 (accessories still say "Only n left").
- **Tell me about similar sarees:** on a sold-out saree, a logged-in customer ticks the WhatsApp consent box. When a new saree is published (or restocked) in the same category *or* the same fabric, priced within ±30% of the missed one, that customer gets **one** WhatsApp message. They can stop it any time by opening the same button again. Withdrawn consent is respected.
- **FAQ** page (footer → FAQ, or `#/faq`): ten answers taken from the store's real rules (delivery fee and free-delivery level, no cancellation, gifts, care guide, accessories). It also publishes FAQ data for Google.

## Recently sold and "Request a similar piece" (added 26 Oct 2026)
- **Recently sold** (home page): up to 8 sold-out sarees, newest sale first (dated from the latest non-cancelled order; sold-out sarees with no order come last). It shows the photo, name and a "Sold · date" tag, **never the buyer or the price**. Each card has **Request a similar piece** and **Tell me when one arrives** (the similar-saree alert above). It hides itself when nothing is sold out. Owner switch: **Home Page** tab → "Show Recently sold".
- **Request a similar piece** (also on every sold-out saree page): the customer picks fabric, colour, budget (prefilled ±30% of the sold saree) and an optional note; the button opens WhatsApp to the shop number with the message ready to send ("Fabric: …, Colour: …, Budget: ₹a – ₹b, Note: …, Name: …"). Nothing is sent until the customer presses send in WhatsApp. If no WhatsApp number is set, the text is shown to copy.

## For the owner (admin)
- **Product form:** a checkbox "The last photo was taken in natural daylight". Use it by adding your daylight photo last.
- **Products → ⬆ Bulk upload / ⬇ CSV template:** download the template, fill it in Excel or Google Sheets, save as CSV, choose the file (or paste rows). The preview shows each row as ok or the exact problem (missing name, bad price, unknown category, duplicate SKU). Only good rows are added after you press *Add products*. Missing SKU is generated; missing photos get a "Photo coming soon" picture (add real photos with Edit); photo links must start with `http`. Added products also trigger the similar-saree alerts.
- **Products → 📲 Status:** makes a 1080×1920 (story) or 1080×1080 picture with the photo, name, price, "One of a kind" and your shop name and phone; **Download** and post it on your WhatsApp status or Instagram. If a photo is hosted on another website the browser may refuse to export it; upload the photo into the product and try again.
- **Bundles** tab: name + the items (sarees and/or accessories) + percent or flat discount. The discount applies automatically on the website when **all** items are in the cart (one bundle offer per order, in addition to any coupon, never more than the subtotal). Pause or delete any time. **WhatsApp chat orders do not apply bundles** (use a discount code there).
- **Stock Alerts** tab shows how many similar-saree requests are waiting, queued and sent.

## Go-live note
The similar-saree message uses a WhatsApp template named `similar_arrival` (same variables as `back_in_stock`: product, link, brand). Create and get it approved in Meta, like the other templates.

## Brand logo (2 Nov 2026)
The Anitha Pemmasani logo shows in: site header (monogram + name), footer, owner sign-in, invoices, packing slips, the browser-tab icon and the link-preview image. Source files: `shared/brand/`. To change it, replace those files, update `LOGO_URI` / `ICON_URI` in `anitha-store.html`, and rebuild.
