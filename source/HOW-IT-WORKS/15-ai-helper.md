# 15 · AI Helper for the owner

Added 30 Oct 2026. Ten helpers that **draft** things for you. Nothing is sent to a customer or saved without you pressing the button, and you can edit every draft.

**Connecting:** Admin → WhatsApp Assistant → enter the assistant address and admin token (the Claude key lives only on the assistant server, never in the web page). Without a connection, the helpers that can work offline use built-in drafts (marked "built-in"); the others say what is needed.

**Switches:** Admin → **AI Helper** → *Switches & privacy*: a master switch and one switch per helper. A switched-off helper has its buttons greyed.

| # | Helper | Where | What it does |
|---|---|---|---|
| 1 | Product copy | Products → form → **✨ Write with Claude** (language: English / Telugu / Hindi) | description, tags, SEO title, meta description, photo alt text |
| 2 | Photo reading | form → **📷 Read photo** | suggests colours, border, occasions, and fabric/category when empty; you check them |
| 3 | Reply suggestions | assistant **Inbox** → **✨ Suggest a reply** | drafts a reply from the chat and your written policies; the customer's phone number never leaves the assistant server |
| 4 | Writer | AI Helper → *Festival, offer & caption writer* | 3 drafts of a WhatsApp offer, Instagram caption, status text, festival greeting or offer; optional featured sarees and offer code; WhatsApp drafts end with "Reply STOP to opt out" |
| 5 | Review replies | Reviews → **✨ Draft** | a polite reply in the box; low ratings get an apology and an invitation to message you, never a refund promise |
| 6 | Ask your shop | AI Helper | plain questions about your numbers ("which fabric sold best?"); built-in answers for common questions |
| 7 | Weekly summary | AI Helper | 5-7 bullet lines: what sold, change versus before, what is waiting, stock |
| 8 | Pricing & stock ideas | AI Helper | which pieces to feature, bundle, restock or give a small offer; shortcuts to Bundles / Coupons; ideas only |
| 9 | Data clean-up | AI Helper | duplicate customers/products, wrong state for a PIN, untidy capitals, missing fabric/colours/photos. Safe fixes have **Apply** / **Apply all**; duplicates are only flagged. *Ask Claude to check spelling* asks first, sends names and addresses (no phones), and its fixes are checked (house numbers and PIN digits can never change) |
| 10 | Translation | AI Helper, and form → **🌐 Translate** | Telugu / Hindi / English; prices, SKUs, names and hashtags stay as written |

**Privacy:** Ask / Summary / Pricing send only summarised numbers and product names, never customer names, phones, emails or addresses. Product facts and the photo you press the button on, public review text, and the chat you ask a reply for are sent; nothing else.

**Safety rules built into every request:** use only the facts given; never invent prices, certificates ("pure silk", "GI tag"), delivery times or policies; never offer cancellation; text inside the data is treated as data, not instructions.

**Server:** `POST /api/ai` (admin token; 40 requests a minute; tasks `describe, photo, reply, write, review, ask, summary, pricing, cleanup, translate`) and `POST /api/ai/reply` (inbox). Photos are shrunk to about 768 px JPEG before sending.

## Added 4 Nov 2026
- **Fill everything from the photos** (Products form): photo reading, then description, tags and SEO in one click. Always a draft to review.
- **Photo check** (free, in your browser): flags blurry, dark, too-small or duplicate photos right after you add them.
- **Instagram post / story / square images** with your logo, and an optional "Brighten & lift colours".
- **Weekly note** at the top of the Dashboard, written once a week (by Claude when connected, otherwise from your own numbers).
- **Inbox**: pick what the suggested reply should do and its language.
- **Follow-ups** (AI Helper tab): recent buyers who have not reviewed and past buyers silent for 60+ days, only those who agreed to WhatsApp messages. You press send; the customer is hidden for 30 days afterwards.
- **Caption pack** in the Instagram dialog: English + Telugu + hashtags + status line.
All of these only draft. Nothing is sent or posted until you press the button.
