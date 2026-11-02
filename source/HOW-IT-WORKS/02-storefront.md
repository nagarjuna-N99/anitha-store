# 02 · What customers see

- **Home:** hero slider (images, text and buttons editable), category strip, New Arrivals (swipe row on phones), signature tiles, announcement bar. Slides and announcements can be **scheduled** (IST start/end).
- **More on the home page and product page** (occasions, recently viewed, wishlist sharing, bundles, colour note, "one of a kind", FAQ): see `14-storefront-extras.md`.
- **Sarees and Accessories:** the shop has two tabs. *Sarees* is the default; *Accessories* (jewellery, blouses & blouse fabric, bags & potlis) has its own category chips, search and filters. On a saree page a **Complete the look** row offers in-stock accessories, and the cart shows **Add an accessory**. Accessories are ordered, paid and delivered exactly like sarees.
- **Shop:** category chips (one swipeable row on phones), **search** (names, SKU, fabric, colour, tags; understands spellings like *kanchipuram → Kanjeevaram*, tolerates small typos), **filters** (fabric, colour swatches, price range with presets, in-stock only), sort, removable filter chips. Sold-out sarees go last in "Featured".
- **Product page:** photo gallery (swipe on phones), price, details, tags, share link, **Chat with us** (WhatsApp), reviews, stock-alert button when sold out. On phones the Add to Cart button stays pinned at the bottom.
- **Cart & checkout:** WhatsApp-OTP sign-in, address, coupon box, consent boxes (order updates, offers, cart reminders), Terms/Privacy tick (required).
- **My Account:** profile, WhatsApp message choices (each change is logged), orders, alerts, reviews.
- **Phone layout:** two products per row, 44 px touch targets, 16 px inputs (no zoom on iPhone), full-screen product page, sheets for account/checkout, **bottom tab bar** (Home · Shop · Wishlist · Cart · Account, with counts). On desktop the tab bar is hidden.
- **Resume card:** a shopper who returns after 20+ minutes with items in the cart sees "Welcome back" once per visit.
- **Addresses:** the profile address is saved as the **primary** address in the address book; a 6-digit PIN suggests the city and state, a city suggests its state (profile, checkout, gift address, address book). See `13-delivery-gifts-tracking.md`.
- **Add to cart:** a green check animation says "N in your cart" while the cart opens.
- **Long catalogues:** the shop draws 24 sarees at a time with a **Show more** button so phones stay fast.
- **Owner on a phone:** the floating *Switch to Admin* button is hidden on phones; use menu → **Owner login** (or the footer link). In admin, menu → **View store**.
- **Deep links:** `#/product/<slug>` opens a saree; `#/cart` opens the cart; `#/terms`, `#/privacy`.
