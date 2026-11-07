# 48 · Action plan: the AI WhatsApp assistant that answers customers from the real stock (7 Nov 2026)

This is a **plan**, written in plain words. Nothing here changes the shop until the owner agrees to a step. The assistant itself already exists (`wa-assistant/src/assistant.mjs`, guide 15); this plan is about **how to put it on the number every customer already has**, safely.

## 0. The one decision to make first: the existing WhatsApp number
Your customers all know **one** number, and you do not want to lose it or its chats. WhatsApp has three ways to connect a number to an assistant:

| Way | What it means | Verdict |
|---|---|---|
| **A. Keep the WhatsApp Business app AND connect the assistant to the same number ("coexistence")** | You keep chatting on your phone as today. The assistant answers on the same number through Meta's Cloud API. Old chats stay on the phone. | **Recommended**, if Meta allows it for your number (see step 1). |
| **B. Move the number fully to the Cloud API** | The number stops working in the WhatsApp Business app; all chatting happens in the owner app / a web inbox. | Works, but you lose the phone app. Only if A is not available. |
| **C. A new second number for the AI** | Customers must learn a new number. | **Not recommended**: customers keep using the old number, so the AI never sees their questions. |

Things to know about A (from the providers' documents, to be confirmed on Meta's own page for your number): the number stays registered in the Business app (never delete or re-register it there); the app must be an up-to-date version; the app and the assistant each have their **own** 24-hour window and billing; the blue-tick verification does not carry over; availability depends on country and on how the number was created. **Step 1 below checks this before anything is changed.**

## 1. Check (no risk, 1 evening)
1. Open the WhatsApp Business app on the shop phone: Settings → **Business tools**. A number that shows the green "Business" badge can usually be connected; a normal personal WhatsApp must first be switched to the Business app (it keeps its chats).
2. In Meta's developer account (the one already used for the owner alerts, guide 39), run **"Connect an existing WhatsApp Business app number"** (Embedded Signup → coexistence). It shows at once whether your number is eligible.
3. Write down: eligible yes/no, business name shown to customers, and who owns the Meta Business account (it must be the shop, not a person who may leave).
**If it says no:** use B (move the number) only after the owner has exported or screenshotted the chats she needs, and only on a quiet day.

## 2. What the assistant must do (the rules)
1. **Answer from the real stock only.** The assistant reads the shop's catalogue (price, category, fabric, colours, **stock**). It never invents a saree. If a saree is sold out it says so, offers 2 or 3 similar ones that are in stock, and offers "tell me about similar sarees" / "make again on order".
2. **Most sarees are single pieces.** So it always says "only 1 piece" when that is true, and does not promise a second one. "Made again only on order" is the same sentence as the website (guide 44).
3. **Language.** It answers in the language the customer writes: **Telugu, Hindi or English**, and also when they type Telugu or Hindi in English letters ("saree entha price?", "yeh kitne ka hai?"). It keeps prices as ₹18,500. Language is chosen **per message**, so a customer can switch.
4. **The link only after the customer says yes.** The assistant first describes the saree and asks, in the customer's language: "Shall I send you the page with all photos and the price?" Only after a clear yes (yes / avunu / haan / ok / send) does it send **one** link, `https://anithapemmasani.com/product/<name>/`. A customer who says no, or never answers, gets no link. This keeps to the rule that nothing is pushed to customers without their consent.
5. **Photos in the chat** (the tool `send_product_photos` already exists) can be sent together with the question, because the customer asked about that saree.
6. **Never**: promise views or sales, give a delivery date that the PIN-code check has not confirmed, offer a cancel (customers have no cancel option), refuse a PIN code, or say a discount the system does not hold.
7. **Hand-over to the owner** (tool `handoff_to_owner` already exists) when: the customer asks for a person, sends a photo of a saree they want matched, is angry, asks about a custom order, returns, money or health topics, or when the assistant is not sure. After hand-over the assistant stays silent in that chat until the owner presses "give back to assistant".
8. **STOP always works** (already built): STOP / unsubscribe ends all automatic messages to that number; START turns them on again.
9. **Draft, never silent changes**: the assistant can take an **order request**, but the owner still approves it (YES/NO flow, guide 41) unless she switched on auto-approval.

## 3. The 24-hour rule and templates
- When a customer writes to the number, a **24-hour window** opens: inside it the assistant can answer freely (no template needed).
- After 24 hours of silence only an **approved template** can be sent, and only to someone who **opted in**. Templates are approved by Meta in about a day. The ones already prepared are in guide 39. For this plan add two small utility templates: *"Your saree is still available: {{1}}. Reply YES and I will send the page"* and *"Back in stock: {{1}}"* (only for people who tapped "tell me when similar arrives").
- Website visitors who tap "Chat with us" opt in by starting the chat.

## 4. How the assistant knows the stock (it already does; two small gaps)
- The catalogue is pushed from the owner app each time shop data is saved. Sold = stock 0 = "sold out" in WhatsApp at the same moment as on the website.
- **Gap 1:** while a customer is looking at a single piece, another customer may buy it. Before saying "yes it is available" the assistant must re-check the stock for that saree **at that moment** (the `get_product` tool does this) and say "available right now".
- **Gap 2 (new work):** a tool `send_product_link` that only works after a recorded "yes" from the customer in that chat, logs the consent, and sends the page link. Today the assistant can only send photos. This is the main build for this plan (about 1 day with tests).

## 5. Roll-out in 5 safe phases
| Phase | What happens | Who sees it | Done when |
|---|---|---|---|
| **1. Check** | Step 1 above. No change to the shop. | Nobody | Eligibility known |
| **2. Practice** | Assistant connected, but **answers only the owner's own number and 2 or 3 family numbers** (allow-list). Test 40 real questions: 15 Telugu, 10 Hindi, 15 English, including English-letter Telugu, sold-out sarees, wrong spellings. | Owner + family | 95 of 100 answers judged correct by the owner; no invented sarees |
| **3. Owner-in-the-loop** | Assistant writes the answer as a **draft**; the owner taps "send" in the owner app (WhatsApp → Waiting). Measure how often she changes the draft. | Customers (after owner approval) | Fewer than 1 in 10 drafts edited, for a full week |
| **4. After-hours only** | Assistant replies by itself only **when the owner is not answering** (night, lunch, or after 10 minutes of no reply). The owner can still reply any time and the assistant steps back. | Customers | A week with no complaint; hand-overs arrive correctly |
| **5. Full** | Assistant answers first, always, hand-over rules as in step 2. Owner reads the daily summary (already built, guide 45). | Everyone | Review monthly |

At every phase there is **one switch** in the Admin → WhatsApp page to pause the assistant instantly; the number then behaves as a normal Business-app number.

## 6. Tests to run before each phase (the shop's own rule: every change is tested)
- 100-question list in Telugu / Hindi / English with the **expected** saree each time; any answer that names a saree not in stock fails the phase.
- A link is **never** sent after "no", after silence, or before a clear yes (automatic test).
- STOP, START, quiet hours, hand-over and "give back" (automatic tests, mostly already there).
- Two customers asking about the same single piece at the same time: only one gets "available".
- A photo, a voice note and a sticker arrive: hand over politely, never a wrong guess.

## 7. Cost (rough, check Meta's current rate card before you rely on it)
- **The customer asking and the assistant answering inside 24 hours: free** on Meta's side (service conversations are free).
- **Templates** (outside 24 hours): paid per message; utility ones cost a few paise to about 15 paise, marketing ones roughly ₹0.8 to ₹1.1 in India. The Admin → WhatsApp report (guide 39) shows the real spend.
- **The AI itself** (Claude): about ₹1 to ₹3 for a normal chat of 6 to 10 messages. A daily cap per customer is already built; set an overall daily limit too.
- Typical month for a small shop (500 chats): a few hundred rupees for AI, about ₹0 to ₹300 for templates.

## 8. Risks and what we do about them
| Risk | What we do |
|---|---|
| The AI says a wrong price or a sold saree is available | Price and stock are read from the catalogue by a tool, never from memory; re-check right before "available"; the owner reviews drafts in phases 3 and 4. |
| A customer feels spammed | Link only after yes; STOP always; no promotion without opt-in; quiet hours. |
| Telugu or Hindi mistakes | Phase 2 and 3 test sets; the owner marks bad answers and they are added to the assistant's notes (`knowledge/`). |
| The number is blocked or rated low by WhatsApp | Never send to people who did not message first or opt in; low volume; Meta quality score shown in the Admin page. |
| The owner loses chats while connecting | Never delete or re-register the number in the Business app; take a chat backup first (WhatsApp → Settings → Chats → Chat backup). |
| The Meta account belongs to one person | Make the shop the owner of the Meta Business account and add a second admin. |
| Personal data | No customer names or phone numbers in git, logs are kept on the shop server only, the privacy notice names WhatsApp and the AI provider (already in the notice). |

## 9. What I need from the owner (4 answers)
1. Is the shop number on the **WhatsApp Business app** or a normal WhatsApp?
2. Is it OK that the assistant first runs only for the owner and family (phase 2)?
3. Which hours is the owner usually unavailable (for phase 4)?
4. Three sample questions customers really ask, in Telugu, so the test list is real.

## 10. Order of work for the developer side
1. Step 1 check (owner, 1 evening).  2. Build `send_product_link` with consent log and tests (1 day).  3. Allow-list mode and the pause switch (half a day).  4. Template drafts for Meta approval (same day as 2).  5. Run phase 2 and 3.  6. Only then phases 4 and 5.

Sources used for the facts above: coexistence notes from 360dialog, Telnyx and Kapso documentation; Meta's pricing page and India price notes from AiSensy and others. These secondary pages disagree on a few rupee figures and on which countries are supported, which is why step 1 and the rate-card check are in the plan.


## 11. Owner's answers (7 Nov 2026) and the Instagram side
Answers: the shop number is on the **WhatsApp Business app** (so way A, coexistence, is the target); starting with only the owner and family is **OK**; the "unavailable hours" question is still open (until told, the plan assumes 10 pm to 9 am and 1 to 2 pm). New: most WhatsApp chats **begin on Instagram** (a saree post, reel or story with the WhatsApp link), and the owner wants Instagram messages handled too and the whole shop to look professional. She will send sample conversations as screenshots or links.

### The idea: Instagram is the shop window, WhatsApp is the counter
Keep **one brain** (the same assistant, the same catalogue, the same rules as section 2) and give it two doors:
1. **Instagram messages (DMs)**: the assistant answers simple questions (price, available or sold, fabric, colour, delivery) in the customer's language, then invites the customer to continue on WhatsApp **only if they agree**, because orders, address and payment happen on WhatsApp where the shop already has the order flow.
2. **Instagram comments** ("price?", "available?"): one short public reply ("Sent you a message 💛") and the details go in a private DM. Never prices in public if the owner prefers not.
3. **The link in the bio / the posts** goes to the website (saree pages) and to a WhatsApp link with the saree **already named in the first message** ("Hi, I saw *Royal Red Kanjeevaram* on Instagram"). The website already builds this message (`waChatLink`); the same trick is used in the bio link. Then every chat starts with the saree known, and the owner can see which post brought the customer.
4. **Screenshots**: when a customer sends a screenshot of a saree (from Instagram or anywhere), the assistant must not guess. It tries to **match the picture to a saree in the catalogue and shows the owner its best 3 matches as a draft**; the owner taps the right one and the customer gets that saree's details. If nothing matches, the customer is told "this one is not in stock right now" and offered similar sarees. Never a guessed price.

### What Instagram allows (to be confirmed on Meta's pages, rules change)
- Automatic replies to DMs are possible only for an **Instagram Professional (Business or Creator) account connected to a Facebook Page**, through Meta's Instagram messaging permissions, which need Meta's app review (days to weeks). The shop already posts to Instagram through Meta (guide 17), so the connection exists; messaging is an extra permission on the same Meta app.
- The assistant can answer only people who **messaged first**, normally inside **24 hours** (a person, not the assistant, may reply later within a longer window). No cold messages, no mass DMs: this also protects the account from being limited.
- A comment can be answered once with a private message shortly after it was written.
- Everything else (STOP, hand-over, drafts, consent) follows section 2. A customer on Instagram who types STOP gets nothing automatic again.

### How to look professional (a checklist the owner can do this week, no code)
**WhatsApp Business profile:** shop name, logo (the Cases/brand mark, no temple or court-style imagery), address, hours, website link, short description, and the **catalogue** feature with the 8 to 12 best sarees. Turn on **Greeting message** (first time a customer writes), **Away message** (outside hours: "We reply from 9 am; here is the page with all sarees: link"), and **Quick replies** (type `/` to use: price list, delivery, return policy, payment details, address). Use **Labels**: New enquiry, Asked price, Order placed, Paid, Posted, Follow up.
**Instagram profile:** switch to a Professional account, one clear bio line ("Handloom sarees from Hyderabad · single designer pieces · order on WhatsApp"), the website link, **Saved replies** for the same questions as WhatsApp, Highlights called Kanjeevaram, Banarasi, New arrivals, Delivery, Reviews. Every post: saree name, fabric, price range or "DM for price", "only 1 piece", and the link.
**One voice:** the same greeting, the same signature and the same words for "sold out" and "made again only on order" on the website, WhatsApp and Instagram (the persona file `wa-assistant/knowledge/persona.md` holds it).
**One page per saree:** every post links to that saree's page on the website (`/product/<name>/`), not to the home page.
**Answer times:** reply to a new enquiry within 10 minutes in hours (assistant + owner), and say the next reply time out of hours.

### Build order for the Instagram side (after WhatsApp phase 2)
1. Owner sends 20 real conversations (screenshots) with names and numbers hidden. They become the test list (nothing personal goes into the code).
2. Ask Meta for the Instagram messaging permission on the existing app (owner action; I will list the exact steps and the screens to record for review).
3. Build an Instagram door into the same assistant (same catalogue tool, same rules) and an **inbox for both WhatsApp and Instagram** in the owner app, labelled by source.
4. Screenshot matching as drafts (owner approves).
5. Same phases as WhatsApp: family only, drafts, after-hours, full.
6. Add "which post brought this customer" to the weekly report (growth page, guide 18).

### Still needed from the owner
Hours when she cannot answer; her Instagram name (also for the Follow us button); whether the Instagram account is already Professional and linked to a Facebook Page; 20 sample conversations.


## 12. What the real chats show (owner's screenshots, 7 Nov 2026; no names or numbers are kept here)
What the screenshots show: **29 unread chats** at about 3 pm and **41 archived**; chats from numbers that are not saved (India and abroad); almost every first message is **one or two words** ("Price", "Pp", "Price pls", "How much these sarees are?", "Are these sarees available and what is the price"); the customer comes **from an Instagram reel** and shares it in one of three ways: (a) the **reel link** with a preview card ("Anitha Pemmasani on Instagram: To place an order WhatsApp ...") followed by "Hi" and the link, (b) the **reel video itself** forwarded into the chat, (c) a **screenshot or nothing at all** ("Pp"). In one chat the owner answered "Sold out" and the customer wrote back "But price": they still wanted the price.

What that means for the assistant (rules added to section 2):
1. **Most chats are the same 3 questions**: price, is it available, can you send details. That is exactly what the assistant answers fastest; it will clear most of the 29 unread in seconds.
2. **A reel link tells us the saree.** Every `instagram.com/reel/<code>` (or `/p/<code>`) in a chat is looked up in a small table "Instagram post → saree". The table fills itself for everything posted from the owner app (the app knows the post's address when it publishes, guide 17) and the owner can paste a post link into any saree once for older posts. Then "Hi + link" is answered with that saree's price, availability and the page link question, with no guessing.
3. **A forwarded video or screenshot has no link.** The assistant shows the owner its 3 best matches from the catalogue (picture matching) as a draft; if the owner is away it answers "Which saree is this? Please send the post link or tap Share → Copy link" in the customer's language. It never states a price for a saree it has not matched.
4. **"Price" with nothing else** gets one short question back ("Which saree? Please send the post link or a photo") unless the same customer shared a reel earlier in that chat.
5. **Sold out still answers the price question**: "This saree is sold out. It was ₹X. It can be made again only on order (about N days): shall I note your interest? Here are 3 similar sarees available now." (The owner decides whether to show the old price; the default is to show it, because the customer asked for it.)
6. **Abroad numbers (+971 and others)**: the assistant answers in English by default, mentions that shipping abroad is quoted separately and hands over to the owner for the quote.
7. **Backlog**: before switching on, a one-time helper lists the unread chats by what they ask (price / available / photo / other) so the owner can answer the backlog in one go or let the assistant send the first reply (phase 3, drafts).
8. **The owner's own habits**: save a "Sold out" quick reply that includes the made-on-order sentence; keep the reel caption's order number line (it works: customers do arrive on WhatsApp).

### Next build (in this order, each with tests)
1. Instagram post address table and the saree link field (website and owner app); the assistant recognises reel links (uses what already exists: catalogue tool, handoff).
2. The "sold out but price" and "Price only" answers in Telugu, Hindi, English, and the abroad rule.
3. Picture matching of forwarded videos and screenshots as drafts for the owner.
4. The backlog sorter.
All stay in family-only mode first (section 5, phase 2).
