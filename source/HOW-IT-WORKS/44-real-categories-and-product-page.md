# 44 · The real saree categories, their Moments, and the product page pattern (6 Nov 2026)

## The eleven categories
Anitha Pemmasani sells: **Mangalgiri, Maheswari, Ponduru Khadi, Fancy/Cocktail, Georgettes, Benaras, Kanjeevaram, Gadwals, Mysore Silk, Patola, Narayanpet.** They replace the sample categories (Tussar, Banarasi, Paithani...) the shop started with.
- **Automatic, once:** on the first start with this version, a shop that is still on exactly the sample categories is switched to the eleven (`wa-assistant/src/realcats.mjs`, `maybeApplyOnStart`). Sample sarees move to the nearest real category (Banarasi to Benaras, Tussar to Gadwals, Paithani to Patola); a saree in any other category keeps it (the category is added at the end): nothing is deleted or lost. The change is flagged (`realCategoriesApplied`) so it never repeats.
- **One press, any time (Owner → Categories → "Set up my categories"):** for a shop whose categories were already edited, so it was not touched by itself. Same rules. The box turns into a green confirmation once the eleven are set.
- Each category has its own facts (weave, origin, note, occasions, care) in `CAT_KB`, a mood line (`CAT_MOOD`), a fabric suggestion and an SKU code, so every product page and AI helper speaks about the right weave. Please read these facts and tell the developer if any is wrong for your sarees.

## Each category under one Moment
The home page Moments (Admin → Home Page → Moments) are rebuilt with every category under exactly one:
| Moment | Categories |
|---|---|
| A Tuesday morning (everyday) | Mangalgiri, Ponduru Khadi, Narayanpet |
| A cousin's wedding | Benaras, Kanjeevaram, Patola |
| A festival, at home | Gadwals, Maheswari, Mysore Silk |
| A quiet evening | Fancy/Cocktail, Georgettes |
The owner's own photos, order, size and hidden/shown choices on a moment are kept. She can still tick other collections or rewrite the words in Home Page → Moments.

## The product page pattern (every saree)
1. **Photos** with a counter (01 / 03) and a **Share** button on the picture.
2. **Chips** (Sold out, One of a kind or Only N left, Free shipping), then the name, **SKU** and price, the delivery date, and the buttons (Notify me when it is back, Tell me about similar sarees, Chat on WhatsApp).
3. **Breadcrumb** (Home / The Collection / category), then **one story card**: The Weave, The Mood, Best For, Caring for the category, About this piece (the owner's own description) and a facts table (Weave, Origin, Length, Care, SKU...). Accessories get a plain About card.
4. **Similar sarees on the right** on a computer (a sticky two-column list beside the photos and details, always in view while scrolling), and a **sideways row under the photos** on a phone. For a sold-out saree it reads **"Close matches, still available."** and suggests only sarees that can be ordered. Tapping any one opens it.
5. Then why shop with us, questions, reviews.
Everything on the page comes from the shop's own settings, category facts and descriptions: nothing is claimed that the shop did not write.

Tests: `tests/product-layout-test.cjs`, `tests/mobile-live-test.cjs` (the press, the website and a saree page on a phone), `wa-assistant/tests/run.mjs` (`categories:` and `moments:` checks).
