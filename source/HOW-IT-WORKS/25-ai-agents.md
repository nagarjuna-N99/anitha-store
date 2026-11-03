# 25 · The five AI helpers ("agents"), in plain words (4 Nov 2026)

**The rule for all five:** they only **draft**. Nothing is sent to a customer, posted, published, accepted or changed until **you** press the button. Each one **still works without a Claude key** (it then uses a built-in writer and tells you so), and none of them sends a phone number, email or street address to Claude.

Needs: your Claude key in **Settings → Security & backup → Claude AI key** for the personal Claude writing. Each helper has a switch in **AI Helper → Switches & privacy**.

## 1. Ops watcher (a morning note)
- Every morning at about **8:15 IST** it reads the health checks (the Ops page) and writes a short note: what is wrong, what it means for the shop, the one next step.
- It is shown at the top of the **Ops** tab ("Today's note") and on the developer page `/ops`. **✨ Write it now** writes one on demand.
- **Email:** only when something needs **fixing** (every day), or on **Mondays** when there are warnings. If email is not set up, you still see the note on the Ops page.
- It **reads and reports only**. It never changes anything. Also on your Overview "Today" list when something urgent is open.

## 2. Catalogue batch (many photos, many drafts)
**Saved Drafts → ✨ Make drafts from many photos.** Pick up to **40 photos**, one product each. For every photo it reads the photo (category, colours, fabric), sets the **SKU** (for example `AP-PHT-004`), names the product, and writes the description, tags and SEO. They land in **Saved Drafts**; nothing is published. You add the **price**, check, and post. It works two at a time, you can Stop it, and if a photo cannot be read it is skipped and listed. Without Claude it uses colours found in the photo, the category you choose as a default, and the built-in writer.

## 3. Order desk (a WhatsApp message for an order)
**✉ Message** on every order row, on each "New from the website" order (Orders tab and Overview), writes a ready message: thanks and items and total for a new order, then confirmed, packed, shipped (with the tracking number) or delivered. If a website order has a stock or price warning, the message says you are **checking availability**. Choose English, తెలుగు or हिन्दी. **Copy** it, or **Open in WhatsApp** to send it yourself from your own WhatsApp. It never promises a date and never offers cancellation.

## 4. Privacy request helper
On a privacy request in the **Privacy** tab, **✨ Draft a reply** writes a polite answer for that kind of request (see my data, correct it, erase it, withdraw consent, nominate someone, complaint), with the **30-day promise** and, for erase, the **6-year invoice rule**. It shows how many days are left (or how late). Claude gets only the request type, the channel, **counts** of what you hold (orders, invoices, reviews) and the **first name**. You are responsible for the answer, so you read and edit it; **Save as a note on this request** keeps the draft with the request.

## 5. Weekly content writer
- **AI Helper → Weekly content:** three Instagram captions for products you have in stock and one **Journal story**. **Save as a hidden Journal story** puts the story in **Pages → The Journal** hidden: add a photo and tick "Show on the website" when you are happy.
- **Reviews → ✨ Draft replies for all waiting reviews** fills every empty reply box with a draft. You read each and press Save reply.
- Your Overview "Today" list reminds you once a week.

## Tested
Server: the new AI tasks send only the facts listed above (no phone, address or full name), the Ops watcher writes with and without Claude, is held back if pressed twice, is blocked for helper logins, and shows on both Ops pages. Browser (`tests/agents-test.cjs`, 27 checks, plus checks inside `tests/ui2-test.cjs` for `/admin2`): every helper with Claude connected (mocked) and not connected, the 40-photo limit, unique SKUs and names, hidden story, and nothing published.

## Not tested
Real Claude answers (the key is not in the tests), the real 8:15 email, a 40-photo batch from a phone, and how good the Telugu and Hindi drafts read. Please read every draft before you use it.

## For the developer
`wa-assistant/src/aihelper.mjs` (tasks `opswatch`, `orderdraft`, `privacydraft`, `contentweek`), `src/agents.mjs` (watcher), watcher timer in `server.mjs` (`watchTick`, `watchRun`), routes `GET /admin/api/agents/ops-watch` and `POST .../run` (owner only, 20-second hold). Client in `anitha-store.html`: `orderDraftOpen`, `privDraft`, `aiContent`, `revAiAll`, `cbOpen`/`cbStart`, `opsWatchHTML`. State: `ops-watch.json` in the data folder; `db.settings.contentWeek`.
