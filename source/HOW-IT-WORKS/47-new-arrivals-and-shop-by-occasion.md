# 47 · New Arrivals picks itself; "Find it faster / Shop by occasion" with AI ideas (6 Nov 2026)

Where: **Admin → Home Page**. Code: `arrivalsPick`, `stockDatesSync` in `src/js/180-home-page-hero-slides-category-strip.js`; `occCfg`, `occHas`, `renderOccasions` in `src/js/340-storefront-extras.js`; the admin card in `src/js/427-occasions-admin.js`; the `occasions` AI task in `wa-assistant/src/aihelper.mjs`.

## New Arrivals slider
- **Automatic (the default):** the slider shows the newest sarees that are **in stock**. "New" means **added or restocked** in the last 7, 14, 30 (default), 60 or 90 days; at most 6, 8 or 12 are shown (default 12). If fewer than 4 are that new, the next newest fill the slider, so it is never empty. Sold-out sarees and accessories never show. The owner has nothing to do when she adds or restocks a saree.
- **I choose:** only the sarees ticked in the list (grouped by category). With nothing ticked it falls back to the automatic list. A shop that already had its own choice keeps it as "I choose".
- A live line in the card says exactly what the slider shows right now.
- **How dates are kept:** every time the shop data is saved in the owner app, each saree is compared with its last known stock: a saree seen for the first time gets `addedAt` and `stockedAt`; more stock than before sets `stockedAt` (restocked); less stock (a sale) changes nothing. The very first time, existing sarees are only remembered (none is called new). Works for every way a saree can be added (the form, a draft, an import, a stock edit).

## Find it faster / Shop by occasion
- Heading and title are editable; the whole section can be switched off.
- A **tile** has an icon (an emoji), a name, the **words** it looks for in each saree's occasions, tags and name (for example `diwali, festive`), and optionally **whole categories** (every saree in them counts). The four standard tiles (Wedding, Festive, Office, Party) keep their old rules and can be edited like any other.
- A tile is shown on the website only while at least one saree **in stock** matches it (the admin list shows "N match"). Tapping a tile opens the shop filtered to those sarees; the filter chip carries the tile's name.
- Up / Down order, hide, delete, add (up to 10), "Back to the four standard tiles". The "Gifts under..." tile has its own price limit and switch; the Accessories tile follows the Accessories switch in Categories.
- **✨ Ask AI for occasion tiles:** type a festival, a season or a type of customer. Claude is sent the shop's real categories, the words already used on its sarees and the tiles it has, and returns six tiles. Every answer is checked: unknown categories are dropped, a non-emoji icon becomes a sparkle, HTML and odd words are removed, tiles with no words and no real category are dropped, names already in use are not offered twice. Drafts show how many sarees in stock would match; **Use this** or **Use all** adds them. Without Claude, built-in ideas for the words typed (Diwali, Pongal and Ugadi, Navaratri, wedding, summer and office, monsoon) use only categories the shop really has. Switch: AI Helper → "Shop by occasion ideas".
