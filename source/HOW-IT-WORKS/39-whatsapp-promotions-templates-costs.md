# 39 · WhatsApp promotions, templates, message reports and costs (12 Nov 2026)

**Admin login only** (tab **WhatsApp promotions**; changed from owner to admin on the owner's request, 12 Nov 2026). The owner login does not see it and the server refuses it. The page never shows customer phone numbers, only counts. Code: `wa-assistant/src/walog.mjs` (ledger, costs, templates, promotions), the hook in `whatsapp.mjs`, routes `/admin/api/promo*` in `adminroutes.mjs`, the AI task `watemplate` in `aihelper.mjs`, the page `src/js/438-whatsapp-promotions.js`. Data file: `wamsg.json` in the data folder (private, owner-only permissions).

## 1. Counting every message
Every message that leaves through `WhatsApp._post` is written to the ledger: time, **kind**, **source**, template name, promotion, **status** and the price at that moment. Only the **last 4 digits** of the number are kept.
| Kind | What it is | Default price |
|---|---|---|
| service | normal replies inside the 24-hour window | ₹0 |
| utility | order updates, cart reminders, owner alerts (any template not listed as marketing) | ₹0.12 |
| marketing | promotions | ₹0.88 |
| authentication | sign-in / privacy codes | ₹0.12 |
The defaults are **rough**. Meta changes prices: the owner checks Meta's price list for India and edits them on the page (a note box keeps where the prices came from). Status **sent** costs the price; **failed** and **simulated (dry, WhatsApp not live)** cost nothing and are counted apart. Read receipts and typing dots are not messages. The ledger keeps the last 30,000 messages. Source is worked out from the template name (cart, order, otp) or given by the sender (promo, promo-test).

## 2. Reports and total expenses
Periods: today, 7 days, 30 days, this month, last month. Tiles and tables by kind, by source, by month and by promotion; **CSV download** (date, time, kind, source, template, promotion, status, last 4 digits, cost). **Other running costs** (server, domain, Claude…) are added by hand, once or every month; a monthly cost counts once for every calendar month inside the period. **Total expenses = message costs + other running costs.** These are the owner's own estimates from the prices entered, not an invoice from Meta.

## 3. Templates
A list of the shop's templates: name (small letters, digits, `_`), kind, language, wording with `{{1}}`, `{{2}}`, examples, status. Meta approves templates, not this app, so the admin presses **Copy for Meta**, pastes it into Meta's template manager, and marks it **Submitted / Approved / Rejected** by hand. Checks (shown as a warning; they block "Approved"): numbering without gaps, no variable at the very start or end, at most 1,024 characters, a promotion **must say how to stop** (for example "Reply STOP to stop offers."), no guarantees or cancellation offers.
**AI wording help** (switch "WhatsApp template wording" in the AI Helper tab): the owner writes the goal and the facts; Claude drafts 3 versions using **only those facts** (no invented discount, price or date; stop line included). Drafts only: "Use this" fills the form, the owner edits and saves. Without Claude, three plain built-in versions are offered instead and the page says so.

## 4. Promotions (campaigns)
A promotion = one **approved marketing** template, with a value for each variable (`@name` = the customer's first name), sent to customers who **said yes to offers** (`consents.marketing`), have **not sent STOP**, and have a phone number; duplicates of a number are merged. Rules:
- Nothing is sent until the owner presses **Start** and confirms the exact head-count and rough cost (a changed head-count is refused). A **test send** to the owner's own number comes first.
- **Never between 9 pm and 9 am IST**; a **daily limit** (default 200); a promotion that is held back continues by itself later (the server timer calls `runDue`).
- **One message per person per promotion, ever**: an atomic claim is saved just before each send, so two runs at once cannot double-send, and a failed person is **not** retried automatically.
- Stop and Delete are always available. Because WhatsApp is not live yet, promotions are only **simulated** (counted as "simulated", cost ₹0) until WhatsApp is connected.
Nothing here promises views or sales, and customers have no cancel option (unchanged).

## Not tested
Real sends through Meta, Meta's real prices and approval, Claude's real wording, a real phone. Tests: server `promo:` checks in `wa-assistant/tests/run.mjs`; browser `tests/promo-test.cjs` (with a stand-in server).
