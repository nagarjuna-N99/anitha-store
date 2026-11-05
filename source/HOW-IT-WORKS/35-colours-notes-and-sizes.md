# 35 · Calmer sizes, "Notes from the loom", website colours (5 Nov 2026)

**Sizes on computers (screens wider than 900px).** Modelled on the reference shop: four saree cards across in the Collection and four or more in New Arrivals, cards about 250px wide with the photo in a 3:4 shape, smaller names and prices, slim 34px buttons, tabs and filter chips, and smaller headings. The **Collection page** gets the same treatment: a short banner (about 150 to 215px, 34px title), a 28px page heading, and compact cards (15px name, 34px buttons, 34px heart and share). Phones keep their larger tap sizes. All in the last two blocks of `src/css/190-design-fixes.css`.

**Notes from the loom** (bottom of the home page, `src/js/347-site-colours-and-notes.js`, server `wa-assistant/src/notes.mjs`).
- Our own words (editable): small heading, title, text, button. "Suggest other words" cycles three wordings. A switch hides the block.
- The visitor types an email and must **tick a box** with the exact wording "I agree to receive occasional notes from Anitha Pemmasani by email. I can ask to stop at any time." The block also shows what the email is used for and links the Privacy Policy.
- `POST /public/notes` (only from the shop's own website addresses, 6 tries an hour per device) stores the address in lower case, the time and the exact wording agreed to in `notes-signups.json`. A bad address or a missing tick is refused. The same address twice is one entry, and the page never reveals who is already on the list.
- **Nothing is sent automatically.** The owner sees the list in Owner app → Home Page → Notes from the loom (count, the addresses, Remove, Download CSV) and writes to these people herself from her own email. A person who asks to stop is removed with the Remove button.
- To do for the owner: add one line about "email for the notes" to the Privacy Policy page text when she next edits it.

**Website colours** (Owner app → Home Page → Website colours).
- Five colours recolour the whole public website: main colour (small headings, links, Add buttons), text and dark buttons, page background, section background, second colour. They are stored in `db.home.theme` and applied as CSS variables (`--gold`, `--charcoal`, `--ivory`, `--cream`, `--sage`). The owner app itself keeps its own colours.
- Ways to choose: six ready sets (Heritage (original), Peacock, Rose, Indigo, Forest, Saffron), five colour pickers, **Match my banner photo** (reads the photo's colours, no key needed) and **Suggest 3 ideas** (Claude: a few words about the feeling, plus the photo colour and current colours; the ideas are drafts and nothing changes until the owner presses "Use these"). Undo and "Original colours" are always there.
- **Readability guard:** a main colour too pale to read is deepened, a dark page background is lightened, and text colour is kept dark. A short note says what was adjusted. A damaged colour value is never used.
- The AI task is `palette` in `wa-assistant/src/aihelper.mjs` (switch: AI Helper → "Website colour ideas").

Tests: `tests/colours-notes-test.cjs` (31 checks: sizes, sign-up form, owner card, colours, AI ideas), `tests/onebox-test.cjs` (a real sign-up saved on the real server), and 10 server checks in `wa-assistant/tests/run.mjs`. Not tested: Claude's real colour ideas, a real phone, real photos from the owner.
