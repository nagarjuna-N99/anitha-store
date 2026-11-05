# 36 · Story chapters on the home page, and tidier New Arrivals cards (5 Nov 2026)

Added after the owner compared the reference shop's phone pages with ours.

**Story chapters** (`src/js/348-story-chapters.js`, `<section id="homeChapters">` on the home page, after New Arrivals).
- Short chapters by occasion. Each has: a big photo panel (a calm dark panel when no photo is set), "Chapter I, II, III" numbering (counts only the chapters that are shown), a title, a line of weaves, a quote with a signature, three category tiles and a link ("Enter this chapter →"). Tiles and the link open the Collection filtered to that category. Tiles use the category's own product photo unless the owner uploads one.
- Three sample chapters are included, written in the shop's own words (A Tuesday morning, A cousin's wedding, A festival at home). None of the reference shop's wording is used.
- Owner app → Home Page → **Story chapters**: switch for all chapters; each chapter has a switch, title (put *stars* around a word to set it in italics), weaves line, quote, signature, link text, big photo (link or upload), three tile pickers (a category and an optional own photo), Up, Down, Delete; "Add a chapter" (up to 8) and "Use the 3 sample chapters". Everything shows on the website at once. HTML typed into a field is shown as plain text; unsafe photo links are ignored; a tile whose category no longer exists is skipped. Stored in `db.home.chapters`.

**Tile sizes (computers).** The chapters sit in an 880px column: photo panel 260px high and square tiles of about 280px. The Signature Collection tiles are 260px high in a 920px column. On phones the chapter photo is 4:3 and Signature tiles are 240px high.

**✨ AI help for the chapters (added 5 Nov 2026).** In the Story chapters card: "Suggest 3 chapters" (a few words about the moment, optional) shows three drafts (title, line of weaves, quote, tiles) and **Use this** adds one as a new chapter; each chapter also has "Rewrite this chapter with Claude", which replaces its words but keeps the tile photos the owner uploaded. Tiles are only ever categories the shop really has. Without a Claude key (or with the switch off in AI Helper) it shows built-in ideas instead. Nothing changes until **Use this**. Task `chapters` in `wa-assistant/src/aihelper.mjs`.

**New Arrivals cards (all screens).** The heart and share buttons sit on the photo; View and Add share one row. On a phone the row now shows about two cards at a time (44% of the screen width, up to 190px), 40px buttons and a 40px heart, instead of one big card with four stacked buttons.

Tests: `tests/chapters-test.cjs` (19 checks, a real browser at a computer width and at 390px); `mobile-audit`, `mobile-test`, `shop-test` and `arrivals-pick-test` still pass. Not tested: the owner's real photos, a real phone, Safari.
