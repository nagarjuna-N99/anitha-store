# APSilks (Anitha Pemmasani) — Project Record

> **STANDING RULE (owner's instruction, 23 Oct 2026):** this record and the `HOW-IT-WORKS/` folder are updated **after every change or update**, in the same step as the change, never later. A change is not finished until (1) the code is tested, (2) a dated entry is added to the Change Log below, (3) any affected `HOW-IT-WORKS/` page is corrected, (4) `./check-record.sh` has been run (it fails if the record or how-it-works is behind the code).
> Also standing: the owner wants chats remembered for later use; this record is that memory for the project.

**Last updated:** 11 Nov 2026 · **Store file:** `anitha-store.html` (≈4,600 lines, single file) · **Terms/Privacy version in the shop:** 2.0 (10 Nov 2026) · **Assistant server:** `wa-assistant/` (Node 20+, 531 automated checks) · **Browser test suites:** 31 (see §6)

---

## 1. What the project is
A saree shop for **Anitha Pemmasani, Hyderabad** (pure handloom: Tussar, Maheswari, Banarasi, Kanjeevaram, Paithani, Mysore silk, Ponduru Khadi). Customers are mostly **women shopping on phones**.
It has two parts:
1. **The store** — one HTML file: storefront + admin portal. Data lives in the browser (`localStorage` key `ap_db_v70`) in this demo phase. Admin PIN default `1234`.
2. **The WhatsApp assistant** — a separate small Node server (folder `wa-assistant`) that answers customers on the shop's WhatsApp number with the Claude API, sends cart reminders, takes orders and sends payment links. Optional until the shop is hosted.

Owner's guidance: *"we will setup everything after we host it"* — real hosting, payments and WhatsApp accounts come later; everything is being prepared and tested in advance with fake/mock services.

## 2. Current state at a glance
| Area | Status |
|---|---|
| Storefront (shop, product page, favourites, cart, checkout, account) | Built, tested |
| Search, filters, sort | Built, tested |
| Scheduled banners + announcement bar | Built, tested |
| Phone-first layout + bottom tab bar | Built, tested (360/390/430 px) |
| Back-in-stock alerts, reviews with photos | Built, tested (messages queue only until WhatsApp is connected) |
| Product SEO, share links, sitemap/robots pack | Built |
| WhatsApp OTP login, consents, Terms & Privacy (v1.4) | Built (demo OTP is NOT secure; real mode needs the login service) |
| Image Studio, multi-photo drafts, AI-style tags/description (rule-based) | Built, tested |
| Home page editor (hero images, categories) | Built, tested |
| WhatsApp chat button | Built, tested |
| WhatsApp assistant (Claude) | Built, tested against mocks only |
| Abandoned-cart reminders (consent-based) | Built, tested against mocks only |
| WhatsApp orders + payment links (mock gateway + Razorpay adapter) | Built, tested against mocks only |
| Discount codes (website + chat, shared rules) | Built, tested |
| Delivery check by PIN, delivery dates, address (PIN/city/state) double-check, **never blocks an order** | Built, tested (offline tables; optional live lookup) |
| Gifts: wrap, note card, ship-to-other, hide sender, packing slip | Built, tested |
| Saved addresses (address book) | Built, tested (no re-order feature: sarees are single pieces) |
| Occasion tiles, recently viewed, wishlist sharing, "one of a kind" wording, colour note + video/daylight jumps, FAQ page | Built, tested |
| Similar-saree alerts (consent-based WhatsApp message when a matching new saree is published) | Built, tested (message queues only until WhatsApp is connected; needs template `similar_arrival`) |
| Bundles ("buy together & save") | Built, tested (website orders only, not chat orders) |
| Bulk product upload from CSV, status-image maker | Built, tested |
| **ON/OFF switch for orders in WhatsApp chat** | Built, tested (default ON; apply by publishing to the assistant) |
| Recently sold showcase + Request a similar piece (opens WhatsApp with fabric/colour/budget) | Built, tested |
| **Accessories for sale** (jewellery, blouses, bags; own categories, Sarees / Accessories shop tabs, "Complete the look" on product page and cart, assistant can search them) | Built, tested |
| Order help buttons (**Track order**, **Help & support**), **no cancel** | Built, tested |
| Order tracking: statuses, tracking page, courier link, WhatsApp updates | Built, tested |
| GST invoice PDF on WhatsApp, review request after delivery | Built, tested (accountant should check the invoice) |
| Hosting, real WhatsApp keys, real Claude key, real payment gateway | **Not done — waiting for hosting** |

## 3. Files in this folder (this folder is the whole project — nothing else lives elsewhere)
| Path | What |
|---|---|
| `PROJECT_RECORD.md` | this file |
| `HOW-IT-WORKS/` | plain-language pages explaining each part (index: `00-README.md`) |
| `anitha-store.html` | **the store** (the working file) |
| `wa-assistant/` | **the WhatsApp assistant server** (Node; has its own `README.md`, `.env.example`, `tests/`) |
| `tests/` | the browser test suites (`*.cjs`) |
| `run-tests.sh` | runs every test (server + all browser suites) |
| `check-record.sh`, `record-check.cjs` | fail if this record or HOW-IT-WORKS is out of date (`--run` also re-counts the server tests) |
| `backups/` | earlier versions of the store file. From 27 Oct 2026 there is only **one rolling backup**, `anitha-store.prev.html` (the numbered `bakN` files are old history; no new ones are made) |
| `data-export/` | **raw data**: `anitha-store-data.json` (whole store) and `assistant-catalogue.json`. Updated in place, never duplicated |
| `tools/refresh-exports.sh` | refreshes the HTML, both data files, the zip and the rolling backup **in place** (same names every time) |
| `archive/` | build history: `modules/` (feature code before it was merged into the page), `patches/` (the scripts that merged it), `screenshots/`, `scripts/` (debug/screenshot helpers), `old-tests/` |

## 4. Key decisions and why
| Decision | Reason |
|---|---|
| Single HTML file, data in browser | Fast to build and demo; no server needed yet. Moves to a backend at hosting time. |
| Reviews only from customers with a **delivered** order; moderated by default | Trust; no fake reviews. Ratings come only from published reviews. |
| Separate, un-ticked consents (order updates, offers, stock alert, cart reminder, public review) | Legal/WhatsApp policy; consent log is append-only with version and source. |
| AI never sets prices, discounts, stock or payment status | Server computes everything from the catalogue; only the gateway's **signed** message marks paid. |
| Assistant hands over to the owner for complaints, refunds, custom work, existing orders | Money and trust matter more than automation. |
| Cart reminders: consent, max 2, never 9 pm–9 am IST, stop on order/STOP | Avoid spam and policy trouble; each reminder claimed in DB before sending (no duplicates). |
| Payment provider is an adapter (mock + Razorpay) | Owner will decide the gateway later. |
| Free text only inside WhatsApp's 24 h window, templates outside | WhatsApp rule; implemented for link / paid / shipped messages. |
| Discount rules identical in store and server (`couponProblem` / `validateCoupon`) | A code must behave the same in both channels. |
| **No cancellation by customers** (owner's rule, 24 Oct 2026): no cancel button/tool anywhere; address correction allowed until shipped; only the owner can release/cancel | Policy + keeps the shop's single-piece stock simple; the assistant explains it kindly and hands over only for damage/emergency. |
| **Orders are never refused because of a PIN code** (owner's rule, 26 Oct 2026: "we will ship whatsoever"): the PIN/city/state check is only a friendly note on the website; in WhatsApp the assistant asks once, then accepts; doubtful orders are flagged for the owner | Smooth buying; the owner phones the customer if a flagged address looks wrong |
| Help buttons: **Track order** + **Help & support** (owner's choice, 26 Oct 2026) replace Change address / Talk to Anitha | One simple entry to support; the assistant then changes the address, answers, or hands over |
| One shared source for PIN/delivery/packing-slip code (`shared/`, synced into store and server by `tools/sync-shared.py`, drift fails `check-record.sh`) | The store and the assistant must give identical answers |
| Data minimisation: no cart stored without cart-reminder consent; withdrawal/STOP deletes it | Privacy. |

## 5. Not built / known limits (honest list)
- Hosting, domain, HTTPS, real login service (`/otp/send`, `/otp/verify`, token check) — **needed before launch**.
- Real Claude, WhatsApp (Meta) and payment-gateway behaviour is **untested against the real services**; everything was tested against mocks. The Razorpay adapter is written from public docs.
- Demo OTP shows the code on screen — insecure by design until the real login service exists.
- Review photos and all data are in browser storage (~5 MB) until a backend exists.
- AI product copy is rule-based unless the owner's own endpoint is set.
- Legal text (Terms/Privacy) is a template; a lawyer should review it.
- Offer/festival broadcast messages, refunds automation, COD, partial payments: not built.
- Voice notes / customer photos are handed to the owner, not interpreted.
- No live courier integration: the owner types the courier name/number and link; no automatic tracking pull.
- PIN/city check is offline (state level + about 150 cities); locality-level check needs `PINCODE_LOOKUP=on` (a public India Post style API, not verified by us). India-only PIN codes.
- GST invoice is a simple layout (prices GST-inclusive, CGST+SGST/IGST by state); not reviewed by an accountant. The website's own invoices still use the store's invoice template.
- Delivery dates are estimates from the owner's zone table, not courier promises.
- Bundles apply to website orders only; WhatsApp chat orders use discount codes. Bulk upload takes photos as web links only (no image files in the CSV). Status images from photos hosted on another site may be blocked by the browser.
- Stock sync between website and WhatsApp orders is pull-based ("Add paid orders to the store" button) until a shared backend exists.

## 6. Test suites (all passing on 27 Oct 2026)
| Suite | Checks | Covers |
|---|---|---|
| `wa-assistant` (`npm test`) | 354 | webhook security, assistant tools, opt-out, hand-off, orders, cart reminders, payments, Razorpay adapter, discount codes, PIN check, buttons, address change, gifts, tracking, invoice PDF, review request |
| `smoke2.cjs` | 10 | orders, invoices, reports |
| `studio-test2.cjs` / `studio-test3.cjs` | 50 / 61 | Image Studio, drafts, product form, AI copy |
| `shop-test.cjs` | 56 | favourites, share links, OTP login, consents, Terms/Privacy |
| `home-test.cjs` | 56 | hero editor, home categories |
| `features-test.cjs` | 54 | search/filters, schedule, stock alerts, reviews |
| `mobile-test.cjs` | 81 | phone layout at 3 widths, tab bar, swipe gallery |
| `wa-test.cjs` | 24 | chat button, admin tab, publish to assistant |
| `cart-test.cjs` | 22 | cart reminders consent/sync/resume card |
| `order-test.cjs` | 11 | paid WhatsApp orders imported into the store |
| `coupon-test.cjs` | 18 | coupon rules in store and assistant |
| `accessories-test.cjs` | 22 | accessory tabs/categories, filters and search per kind, Complete-the-look rows, Category Manager, product form groups, assistant export type |
| `hero-theme-test.cjs` | 16 | hero zoom, colour matching of text, button and top bar, top bar following the hero, View home page |
| `arrivals-pick-test.cjs` | 9 | choosing New Arrivals sarees |
| `care-test.cjs` | 9 | Saree Care tabs, wash-care guide, photo link repair |
| `agents-test.cjs` | 27 | the five AI helpers with and without Claude: order messages, privacy replies, weekly content, catalogue batch, Ops watcher note |
| `pages-ai-invoices-test.cjs` | 55 | invoice search/sort/group, category auto-fill and one-click product AI, editable Care/Journal/Atelier pages |
| `ui2-test.cjs` | 53 | the new owner look: same page as classic, all 23 screens identical, Overview numbers and website-order buttons, light/dark readable |
| `dpdp2-test.cjs` | 29 | website orders to the owner (accept, decline, retry queue), checking who is asking, logging a phone request, provider ticks, erased count, notice archive, Dashboard reminder, helper logins |
| `admin-app-test.cjs` | 35 | the real owner app against the real server: account setup, sign-in, wrong-password and lockout screens, 2-step sign-in, saving and merging, the public website, session end, backup, Instagram dialog / schedule / post now |
| `drafts-ready-test.cjs` | 22 | Ready-to-post drafts: details dialog, built-in and Claude AI fill, readiness, filters, Post now / Post all ready, SKU clash, Fill all |
| `ai-test.cjs` | 35 | the ten AI helpers: built-in and Claude modes, privacy of what is sent, validation of AI fixes, switches, product form, reviews |
| `dashboard-test.cjs` | 31 | interactive dashboard figures, periods, chart, drill-down, attention list, empty store; drafts by category; add-to-cart animation |
| `address-test.cjs` | 19 | primary address from the profile, Make primary, PIN/city/state prediction in profile, checkout |
| `mobile-audit.cjs` | 1 | every page, modal, drawer and admin tab at 320/390 px and landscape: no sideways overflow, nothing covered or overlapping, no tiny tap targets, no <16px inputs (iOS zoom), sheets scroll, cart never covers the tab bar (`FULL=1` adds more sizes) |
| `mobile-perf.cjs` | 21 | 4x slower CPU, 122 products: load time, search/filter/open speeds, scroll smoothness, layout shift, long tasks, no endless animations |
| `crawl-test.cjs` | 2 | clicks every button/link on every page and admin tab (about 700 clicks) and checks for duplicate ids; any JS error fails |
| `sold-test.cjs` | 36 | chat-orders switch (on/off/published), Recently sold (order, hiding, switch), Request a similar piece (message text, edge cases), 390px |
| `upgrade-test.cjs` | 10 | older saved store, empty browser and corrupted data all load; demo items added once |
| `extras-test.cjs` | 66 | occasions, recently viewed, wishlist sharing, video/daylight/one-of-a-kind, bundles, similar-saree alerts, bulk CSV upload, status image, FAQ, 390px layout |
| `delivery-test.cjs` | 49 | delivery check, PIN warnings, gifts, packing slip, tracking, address change, address book, delivery admin tab, import of status/invoice from WhatsApp |

Run everything with `./run-tests.sh`, or one browser suite with `PW=$(npm root -g)/playwright node tests/<suite>.cjs` (run from this folder).

## 7. Go-live checklist (when hosting is ready)
See `HOW-IT-WORKS/11-go-live-checklist.md`.

## 8. Change log (newest first)

**4 Nov 2026 (One look for all hero slides)**
- Owner: all hero slides should follow the same style, only the words may differ. The text look (font, weight, size, capitals, spacing, line spacing, shadow, description size and font, button look) is now shared by every slide (`heroEffType`, `LOOK_KEYS`, `db.home.hero.sameLook`, default on). Choosing a look, changing any text option, or Auto-style applies to all slides; a new photo takes the existing look instead of inventing another; slides saved earlier with different looks follow the first slide's look automatically. Colours stay per photo (readability) and the words stay separate. A checkbox "Same look on all slides" under the looks can switch this off. Tests: hero-theme-test +5.

**4 Nov 2026 (Hero slide editor simplified)**
- Owner said the slide editor had become too complicated. Each slide now shows only: photo, small heading, title, description, button text, "Suggest the words", and one row of looks (Auto, Elegant, Bold, Modern, Soft, Classic; one tap sets font, weight, size, case and spacing). Everything else (photo position, zoom, darkness, button link, every text option, colour pickers, colour matching) is inside one folded "More options"; its open state is kept while editing. Tests updated (+2 checks).

**4 Nov 2026 (Preview now matches the live page 100%; text style options; AI text style and words)**
- **Cause of the mismatch:** a leftover rule (`max-width:100%` on the hero text column) in the admin preview let the title run on one line, while the website keeps it in its 600px column and breaks it in two. Removed. A test now measures the title, small heading, description and button boxes in the preview and on the website (position and size, same line breaks) and they must agree.
- **Text style panel on every slide** (Home Page → slide → "Text style"): big-heading font (11 choices, loaded on demand), weight, italic/upright, capitals, shadow, description font, big-heading size, letter spacing, line spacing, description size, button look (filled/outline), and colour pickers for big heading, description, small heading, button and button text. Stored in `slide.type`, drawn through CSS variables so the website and the preview use the same rules.
- **Auto with AI:** "Auto-style the text for this photo" reads how dark, colourful and detailed the photo is and picks the font, weight, size and shadow (no key needed, says why). It also runs by itself when a photo is added (unless switched off per slide or the owner changes a style). "Suggest the words" gives 3 drafts for small heading, title, description and button (new AI task `hero`, switchable in the AI Helper tab; built-in drafts when Claude is not connected). Drafts only; the owner chooses.
- Tests: hero-theme-test +16; server AI test +1.

**4 Nov 2026 (Header on the hero photo, option 1)**
- On the home page there is no header bar: the name, menu and icons are drawn straight on the hero photo with a soft shade behind them (`body.nav-over`, `navOverSync`). When the visitor scrolls, the header becomes the light bar tinted from the photo. Other pages keep the normal sticky bar. On phones the name is on the left, search and the menu button on the right, and the existing bottom tab bar (Home, Shop, Wishlist, Cart, Account) is unchanged; cart moved out of the top (it was already hidden there). The Home Page slide preview shows the same header on the photo, and a test now compares the preview with the published page (title, small heading, description, button, shop name and menu: font, size, spacing, colour). Tests: hero-theme-test +10.

**4 Nov 2026 (Shipping line on the product page; footer WhatsApp-payment line removed)**
- Every product page now shows the shop's current announcement (the free-shipping line) under the delivery box (`shipNoteHTML`; follows the Announcements editor and its schedule; nothing shows when none is on). The footer text "Payment is agreed with you on WhatsApp" is removed. Header drafts with everything on the hero photo were shown for the owner to choose. Tests: care-test +3.

**4 Nov 2026 (Slide preview now matches the website exactly)**
- Owner reported the Home Page slide preview did not match the website (font size, colours, line spacing). The preview used shrunken look-alike styles. It is now the real website drawn at the device's own width (header with shop name and menu, then the real hero) and scaled down to fit (`heroPrevHTML`, `heroFit`), so the title font, size, line spacing, colours and header are identical. Phone and computer both follow the device's own size. Test: hero-theme-test +3.

**4 Nov 2026 (Shipping line moved to the bottom; A/P monogram back; automatic header and text colours from the hero photo)**
- The "Complimentary shipping..." line no longer sits above the header. It now shows as a quiet strip just above the footer (same Announcements editor, schedule and rotation). Suggested other places: on the product page under Add to cart, in the cart/checkout.
- The header shows the round A/P monogram again, next to the shop name in Bodoni Moda Bold Italic.
- **Automatic colours:** adding or moving a hero photo (upload, link, zoom, focus, text side) picks and saves the colours by itself (`heroAuto`, theme `v:2`); opening Home Page does the same for slides without them. The top bar is always a pale tint of the photo's main colour with a deep shade of the same colour for the name and menu (never a heavy dark bar), and follows the hero unless switched off (`headerMatch` now defaults to on). Old saved dark themes are converted on the fly (`navFromTheme`). On the website a slide with no saved colours is read in the visitor's browser when the photo allows it. Tests: hero-theme-test updated/+1.

**4 Nov 2026 (Slimmer top bar with the full logo; shop name in Bodoni Moda Bold Italic; Shop by occasion centred)**
- Top bar is about half the height (65px, was about 126px) and shows the **full logo** uncropped; on a dark bar it sits on a white tile. Matching a hero photo no longer switches "Top bar follows the hero photo" on by itself. "Shop by occasion" tiles are centred. The "Anitha Pemmasani" name uses Bodoni Moda Bold Italic (owner picked D from a font comparison; added to the Google Fonts link, falls back to Playfair Display, then Georgia). Tests: hero-theme-test updated (+2).

**4 Nov 2026 (Slimmer top bar with the full logo; Shop by occasion centred)**
- Top bar is about half the height (65px, was about 126px) and shows the **full logo** (flowers, A/P, name, Clothing Studio) uncropped instead of the round monogram. On a dark bar it sits on a white tile. Matching a hero photo no longer switches "Top bar follows the hero photo" on by itself; the switch stays the owner's choice. "Shop by occasion" tiles are centred. Five header drafts were shown for the owner to choose from. Tests: hero-theme-test updated (+1).

**4 Nov 2026 (Saree Care: full wash-care guide, photo links repaired)**
- `careGuideLoad()` adds Washing, Drying & Ironing, Stains, Zari & Embroidery tabs (photos from the owner's own products); button in Pages → Saree Care. Doubled `?q=80&w=800` photo links repaired (seed and saved data); failing photos show a cream box. "Storage Tips not visible" could not be reproduced locally (all ticked tabs render). Guide: HOW-IT-WORKS/29-saree-care-guide.md. Test: `care-test.cjs` 9 checks.

**4 Nov 2026 (My Account: tick boxes, less clutter)**
- "Order updates", "Offers & new arrivals" (and "Cart reminders") are now tick boxes, not switches; ticking applies and logs the choice at once (`acctConsent` reads the box). The long note is shortened, and the empty "Back-in-stock alerts" and "My reviews" sections are hidden until there is something to show. Tests: shop-test and cart-test updated (+1 check).

**4 Nov 2026 (Fix: logo turned into a white disc on a dark top bar)**
- Seen on the live site: my rule that turned the logo mark white flattened the round logo photo. Removed it; the logo keeps its own colours, and on a dark top bar it sits on a light disc with a ring so it is always clear.

**4 Nov 2026 (New Arrivals: choose sarees from the website)**
- Home Page → New Arrivals now has a tick-list of all published sarees by category (`db.home.arrivals.ids`; empty = all marked new). `arrPick/arrClear/arrPickerHTML`; `buildScrollTrack` honours it. Guide: HOW-IT-WORKS/28-new-arrivals-pick.md. Test: `arrivals-pick-test.cjs` 9 checks.

**4 Nov 2026 (Hero zoom, colour match to the photo, top bar follows the hero; "View home page" fixed)**
- **Bug:** in the owner app "View home page" switched to the hidden shop screen (blank). It now opens the public website in a new tab (`/admin/api/state` carries `siteUrl`). Guide: HOW-IT-WORKS/27-hero-zoom-and-colour-match.md.
- **Zoom:** each hero slide has Zoom (100-250%) and Move left/right; the photo is now its own layer (`.hero-img`) under a shade layer (`.hero-shade`).
- **Colour match:** `heroAnalyze` / `heroMatch` read the photo pixels (no Claude needed), pick title, accent, button and top-bar colours as tints of the photo with contrast checks (text 4.5:1, bar 7:1), and darken the overlay only if needed. **Top bar follows the hero** switch (`db.home.headerMatch`); `applyHeaderTheme` sets `--nav-bg` / `--nav-ink` only on the home page.
- Tests: `tests/hero-theme-test.cjs` 16 checks; home-test updated; ui2-test +2. Not tested: real saree photos, other browsers.

**4 Nov 2026 (Design check with Hallmark, and fixes)**
- Hallmark (open-source design checker) installed in the build machine's `~/.claude/skills`; code scan plus a 43-screen browser check at 7 widths. Guide: HOW-IT-WORKS/26-design-check-fixes.md.
- Fixed: faint grey/gold/sage/heart colours, focus rings on every control (adapts to light/dark surface), visible field edges, wrapping filter buttons, 44 px tap targets, slide-in menus on `transform` and hidden when closed, hero visible without scripts and `svh`, `overflow-x: clip`, line length, tiny text, small labels in sentence case, one serif font, fewer weights, no emoji in menus (owner menus use one drawn icon set), footer no longer lists card brands (payment is agreed on WhatsApp), heading order, placeholders for logo images; phone overflow found and fixed on Journal, Atelier and the Home Page editor at 320 px; new-look menus and field edges.
- Result: public site findings 291 to 135, owner app 452 to 253. Left: stock-photo hotlinks, marketing-page heuristics, off-screen drawers (false alarms) and a short list of small items (see the guide). Not done: emoji inside owner buttons, upper-case buttons, spacing scale.
- Tests: all green (531 server checks and every browser suite, including the mobile audit at 3 phone sizes and the contrast scans in light and dark). `dpdp2-test.cjs` timed out once under heavy load and passed alone.

**4 Nov 2026 (Add your own pages; Show on the website on every page)**
- Pages tab: **➕ Add a new page** with four kinds (Story like The Atelier, Stories like The Journal, Tips like the Care guide, Simple text); new pages start hidden; **every page (3 built-in and all new ones) has a Show on the website switch**, plus a "Show a link in the menu" option and Delete for new pages. Menu links (header and phone menu) are generated from the pages; hidden pages cannot be opened (sent Home) and are dropped from the home-banner link list. Care tabs, story reader and the page renderers are now shared by all pages.
- **Privacy of drafts:** `publicPages()` in `shopdata.mjs`: hidden pages, stories and tabs are never sent to the public website data (this also covers the hidden Journal story drafted by the weekly content writer).
- Tests: server 531 (+1); `pages-ai-invoices-test.cjs` now 55 checks (+12 for new pages and Show switches); `ui2-test.cjs` +3 (new pages in `/admin2` against the real server, including that a hidden page stays out of the public data until shown). Not tested: a real phone, many custom pages, search-engine pages for new page addresses (they have no separate address yet).

**4 Nov 2026 (Five AI helpers: Ops watcher, catalogue batch, order messages, privacy replies, weekly content)**
- **All draft-only**; each works without a Claude key (built-in writer, said plainly); no phone, email, street or full name goes to Claude. Guide: HOW-IT-WORKS/25-ai-agents.md.
- **Ops watcher:** daily ~8:15 IST note from the Ops checks (Claude or built-in), shown on the Ops tab and `/ops`; emailed only when something needs fixing (or Mondays for warnings); "Write it now"; owner-only routes `GET/POST /admin/api/agents/ops-watch`; state in `ops-watch.json`.
- **Catalogue batch:** Saved Drafts → many photos (max 40) → drafts with category, SKU, name, description, tags and SEO; price left for the owner; nothing published.
- **Order desk:** ✉ Message on orders and website orders (Orders tab, Overview); stages received/confirmed/packed/shipped/delivered; Copy or Open in WhatsApp.
- **Privacy helper:** ✨ Draft a reply on each request (type, 30-day promise, 6-year invoice rule, days left); counts and first name only; Save as a note.
- **Weekly content:** captions + a hidden Journal story; "Draft replies for all waiting reviews"; weekly nudge on the Overview.
- Tests: server 530 (+10); `tests/agents-test.cjs` 27 checks; +5 checks for `/admin2` in `ui2-test.cjs`. Not tested: real Claude output, the real 8:15 email, a 40-photo batch from a phone.

**3 Nov 2026 (Invoice search and sort, one-click product AI, editable Care / Journal / Atelier pages)**
- **Invoices:** search (name, phone, invoice/order number), customer, year, month, date range, sort (date, amount, customer, number) and group by customer/month/year with subtotals; count, total and average line.
- **Product form:** one **✨ Auto-fill everything** button (photo, colours, fabric, SKU, name, description, tags, SEO, language) that falls back to the built-in writer when Claude is not connected; choosing a category now sets the SKU (e.g. AP-PHT-001), description, tags, SEO and fabric by itself and never overwrites what the owner typed; the owner-app error for a missing Claude key now points to Settings → Claude AI key (it used to point to the WhatsApp tab). Single-part buttons folded under "Fine-tune one part only".
- **Pages (24th owner tab, 📰):** Care guide, Journal and Atelier moved from fixed HTML to data (`db.pages`, sent to the website by `publicView`), with an editor to add / edit / reorder / hide / remove, photo upload or link, working Read Story, and "put the original back". Starting photos are stock samples; the Atelier numbers are sample text for the owner to correct. Guide: HOW-IT-WORKS/24-invoices-product-ai-pages.md.
- **Left menu can be closed** (‹ / ☰ button, remembered in the browser; classic and new look). Journal's "Read Story" link made a proper 44 px tap target (the mobile audit caught it).
- Tests: server 520 (+1); `tests/pages-ai-invoices-test.cjs` 38 checks; `tests/ui2-test.cjs` now 43 checks, repeating the invoice, product-form, Pages and menu-button checks in `/admin2` against the real server. Not tested: real Claude output, a phone photo upload, the live site.

**3 Nov 2026 (New owner look at /admin2, built parallel to the classic app)**
- `/admin2` serves the very same owner app (same page, sign-in, session, data, code) with `<html class="ui2">`: a glass look in light and dark, and a new **Shop Overview** above the full classic dashboard (sales this month vs last, open orders, delivered share, 6M/12M sales chart, website orders with working Accept / Not possible, monthly goal kept in the browser, orders by stage, best sellers, Today list from real work, Instagram and WhatsApp previews). `/admin` is unchanged. Guide: HOW-IT-WORKS/23-new-owner-look.md.
- Because it is the same code, every screen and button is identical by construction; a browser test proves it for all 23 screens (same content) and checks readable text (contrast 3:1) in both themes; `ui2Guard` recolours any unreadable legacy text. New owner route `GET /admin/api/previews`. Deep links `/admin#orders` open that screen.
- Tests: server 519 (+5); `tests/ui2-test.cjs` 24 checks. Not tested: real phones and other browsers, live Instagram/WhatsApp cards. Long screens (Image Studio, Home Page) keep their classic layout in the new colours.

**3 Nov 2026 (Ops page made stand-alone, with Instagram and WhatsApp previews)**
- `GET /ops` (+ `/ops/api/report`): a self-contained developer page with its **own key `OPS_TOKEN`** (24+ chars, else 404), independent of the owner login; bearer header, constant-time compare, 8 wrong tries lock 15 min, wrong tries logged, no cookies, strict CSP. Code `wa-assistant/src/opspage.mjs`. Guide 22 updated.
- Previews on both Ops pages: Instagram (status, limits, counts, latest 6 posts with photo/caption/link/error) and WhatsApp (mode, chats, 24 h activity, recent chats with the 24-hour window, dry-run "would send"). No customer message text; numbers masked.
- Tests: server 514 (+9); `dpdp2-test.cjs` 29 (+4). Not tested: post photos with real Instagram jobs, a live WhatsApp, the page on the real Render server. Needs `OPS_TOKEN` set in Render to exist.

**3 Nov 2026 (Ops page for the developer)**
- New owner-only tab **🩺 Ops** (23rd tab): a read-only health report over server, shop data, security, public website, orders and payments, WhatsApp, AI, Instagram, email, privacy and recent server errors, each with a fix hint; copy-as-text and optional 1-minute re-check. Guide: HOW-IT-WORKS/22-ops-page.md. Code: `wa-assistant/src/ops.mjs`, `GET /admin/api/ops` (helpers get 403), `renderOpsAdmin`.
- Tests: server 505 (+6 ops checks); `dpdp2-test.cjs` 25 (+3). Not tested: against the real Render server (disk, website probe and memory numbers are only seen there). It does not call Meta, Instagram, Razorpay or the mail server.

**3 Nov 2026 (DPDP round 2: website orders, identity check, erased list, helpers)**
- Plain-words notes: HOW-IT-WORKS/21-privacy-round-2-what-changed.md. Website orders now reach the server (`wa-assistant/src/weborders.mjs`, `POST /public/order`) and show in Orders → "New from the website" (accept / decline); payment stays manual and pending. Site keeps a retry queue (`ap_pending_orders`).
- Privacy: identity check before data/erase (server-enforced, 403 otherwise); log a request from phone/WhatsApp/Instagram/in person/email; WhatsApp assistant logs "delete my data" messages; provider erase tick-list; erased customers kept only as salted hashes and removed again on restore (`erase.mjs`, generated from `shared/erase-core.js`); notice archive; email-required checklist and Dashboard banner; overdue-request warnings; erase now also removes review photos, address history, gift data and log lines.
- Team logins (owner / helper) with route-level limits.
- Tests: server 499; new `tests/dpdp2-test.cjs` (22 checks). Not tested: real WhatsApp, a real mailbox, Render, a real breach. Limits: helpers' app still loads shop data; the site's customer sign-in stays in the visitor's browser.

**11 Nov 2026 (DPDP Act: privacy notice, rights, erase, breach register, retention)**
- Built from the owner's list (see HOW-IT-WORKS/20-privacy-dpdp.md). **Policy version 2.0**, notice version 2.0. The official Act text could not be opened in the session (sites blocked), so the list came from published summaries and general knowledge: have a lawyer/CA confirm.
- **Customers**: an itemised **privacy notice in English, తెలుగు and हिन्दी** (sign-in, checkout, footer, My Account, and a one-time "updated notice" screen for existing customers with their message choices); **"I am 18 or older"** required at sign-in and checkout and recorded; consent log gets `age18` and `notice` rows; **My Account → Your privacy rights** (download my data, see what you hold, nominate someone, complain, erase my account) and a public **"Your privacy rights" form**; every request gets a number and a **30-day** reply date and reaches the owner (`POST /public/rights`, email alert when email is set up). Privacy policy rewritten (processors, AI service outside India, retention, rights, breach promise, age, the Board).
- **Owner (🛡️ Privacy tab, 22nd tab)**: DPDP checklist; requests list with answer/refuse notes and "find this customer"; find a customer by phone → download all their data (including what the server holds) or **erase** (profile, reviews, alerts, chat/cart; invoices keep only name and address for 6 years then anonymised; consent proof kept without phone; do-not-message kept); **breach register** with the 72-hour Board deadline and ready notices; list of companies that handle the data with accepted-terms dates; "run the clean-up now". Red **turn on 2-step** banner on Dashboard and Privacy tab.
- **Server**: `wa-assistant/src/privacy.mjs`; daily clean-up (chats 90 days, carts 30 days, order contact details 6 years; settings `CHAT_RETENTION_DAYS`, `CART_RETENTION_DAYS`, `ORDER_RETENTION_YEARS`); routes `GET /admin/api/privacy`, `POST /admin/api/privacy/(ticket|breach|access|erase|sweep|log)`, public `POST /public/rights`.
- **Safeguards**: backups are now **encrypted with a password** (AES-256-GCM; unlocked only after a warning; restore asks for the password); opening Customers, downloading a backup, exporting or erasing a customer are written to the activity log.
- Tests: server 462 checks; new `tests/dpdp-test.cjs` (29 checks) and 11 Privacy-tab and 5 backup checks in `admin-app-test.cjs`; existing tests updated for the age box and version 2.0. Not tested: a real WhatsApp/erase on a live account, a real mailbox, a real breach report. Limits: customer accounts on the public site live in each visitor's browser until stage 2, so real erasing in the owner app is done by the owner from the request; disk encryption depends on the host.

**10 Nov 2026 (monthly review, daily brief, switches, 30-day plan)**
- **Three automatic email reports**, each with its own switch (Growth → Weekly report by email): **Weekly growth report** (Mondays from 8:00 IST, the 7 complete days before, on by default), **Monthly business review** (the 1st from 8:30 IST, the month that just ended compared with the month before, on by default), **Daily brief** (every evening from 9:00 IST, yesterday in numbers and what to do today, off by default). Each is claimed before sending (never twice), a failure is retried hourly up to 3 times; state is kept per report in `reports.json` (`weekly`, `monthly`, `daily`, `prefs`).
- **Monthly review contents**: scorecard against the month before; sales in detail (categories with share, best sellers, week by week orders/revenue/website visitors, best day, sarees per order, coupon orders, dependence on one buyer); stock and customers (listed, sold out, almost sold out, never viewed, past buyers silent for 60+ days); Instagram and website sections as in the weekly; the steps that matter most; and a **30-day plan in four weeks** (week 1 fix the biggest leaks, week 2 build the weekly habit, week 3 turn interest into orders, week 4 measure and repeat) built from the live numbers plus a routine sized to how much you post now (target = current posts per week + 1, between 3 and 5).
- **Growth tab** period list now has **This month so far** and **Last month (full review)** (with the sales detail and the 30-day plan on screen); every report has a **Preview** and **Send it now**; Instagram windows longer than 30 days use the last 30 days of the period (Instagram's limit). The AI opening line (`weeklyplan`) now covers daily, weekly and monthly.
- Routes added: `POST /admin/api/report/prefs`; `report/send` and `report/preview` take `kind`; `GET /admin/api/growth?period=thismonth|lastmonth`. Server checks 444.
- Weekly email now covers the 7 complete days before the Monday (it used to include the day it was sent). Not tested: a real mailbox or Instagram account; a flaky timeout seen once in 6 runs of `admin-app-test.cjs` (cause not found, passes on re-run).

**9 Nov 2026 (handover documentation and full source in git)**
- New guide **HOW-IT-WORKS/19-developer-handover.md** (layout, commands, how a change is made, how the pieces talk, settings names, routes, the shop data object, lessons learned, what is not built) and **AGENTS.md / CLAUDE.md** (the rules for any AI or person, read order). **CHANGELOG.md** is now generated from this section by `tools/make-changelog.py` (also run by `tools/refresh-exports.sh`).
- **`tools/publish-repo.sh <git checkout>`** copies everything into git in one go: the public site, the deployable `server/`, and `source/` (the whole project with tests, docs, tools and `data-export/`, without node_modules, server data, `.env`, backups). So the repository alone is enough to rebuild, test and change the project. `server/` and `index.html` are generated: edit `source/`, then publish.
- Not tested: a second person or AI following these docs from a clean checkout end to end (the commands themselves were run).

**8 Nov 2026 (growth analytics + weekly email)**
- **📈 Growth tab** (owner app, new 21st tab): Instagram insights (followers and change, views, reach, likes, comments, saves, shares, profile visits, engagement rate, best posts, best format), website counting (visitors, saree views, WhatsApp taps, carts, checkouts, top sarees, sources, devices), sales (orders, revenue, average order, new/returning, best categories), a funnel, and each compared with the previous period (7/30/90 days).
- **Website counting**: the public site sends anonymous counts to `POST /public/hit` (no cookies, no IP/name/phone stored, one-way daily hash, nothing under Do Not Track, bots ignored, rate limited, allowed origins only). Privacy page updated with a "Visit counts" line (version number not changed).
- **"What to do this week"**: suggestions are built from the live figures each time, each with the figure that triggered it (**Because**), numbered steps and a goal; nothing generic is shown. **✓ I did this** records the number so the next report says whether it moved. No promise of views or sales is made anywhere.
- **Weekly email** (new `mailer.mjs`, SMTP, Gmail/Zoho/Outlook presets, app password stored encrypted, login checked before saving): sent automatically every Monday from 8:00 IST, once a week (claimed first), retried hourly up to 3 times on failure; test, preview and send-now buttons. Opening line written by Claude when the key is present, otherwise plain facts.
- **Reminder to connect Instagram**: banner on the Dashboard and Growth tab with "Remind me in 3 days / next week"; also the first step in the email while not connected.
- Routes: `GET /admin/api/growth`, `POST /admin/api/growth/plan`, `POST /admin/api/growth/done`, `GET/POST /admin/api/email`, `/email/remove`, `/email/test`, `POST /admin/api/report/send`, `GET /admin/api/report/preview`, public `POST /public/hit`. Instagram token now also needs `instagram_manage_insights`. Server checks 432; new browser suite `tracking-test.cjs` and Growth checks in `admin-app-test.cjs`.
- Not done / limits: website checkout orders are still not connected to the owner app (stage 2), so Orders/Revenue count shop-data orders only; Instagram does not give apps live trending audio or hashtags, so none are suggested; follower growth starts from the day of connection; not tested against a real Instagram account or a real mailbox (tested against stand-ins).

**7 Nov 2026 (video editor removed, video analyzer added)**
- **The in-app video editor is gone** (trim, zoom, text, logo, render, status copy). Edit in CapCut, InShot or the phone's editor.
- **🎬 Video analyzer** (Instagram tab): upload the edited video (up to 150 MB). The server (`wa-assistant/src/video.mjs`, ffmpeg) only *measures* it: size, shape, length, frame rate, codec, bitrate, black bars; the first 2 seconds (black start, movement, silence); cuts and pace; frozen stretches; sharpness and lighting; loudness, clipping and silences; black ending. It gives a **score out of 100**, a verdict (Ready / Almost / Fix first), **"Do these first"** (top 3) and every check with *what was found, why it matters and exactly what to do* (with CapCut / InShot steps), four frames (tap one as the cover; the sharpest is marked), whether it can go as an **Instagram Reel** and as a **WhatsApp status** (30 s, 16 MB, 9:16), step-by-step WhatsApp status directions, and what to do after posting. **✨ Ask Claude to review the frames** (needs the Claude key) rates the hook, the saree, text, light and background and lists instructions; it sees four stills only, not sound or movement. **Copy the to-do list**, and **Upload a new version** compares scores.
- The score is about things the owner controls; it does not predict views (nobody can) and says so. Shape, opening, sharpness, length, black bars and codec failures can never be "Ready". The curve is steep so many small faults cannot hide.
- **Post as a Reel** from the same screen: the video is posted exactly as uploaded (no re-encoding), with the chosen cover, caption pack, posting rules and times. Routes: `POST /admin/api/video/upload` (starts the analysis), `GET /admin/api/video/job`, `POST /admin/api/video/review`; `social/post` takes `analysedId` + `coverIndex`.
- Tests: server 385 checks (real ffmpeg on generated good/bad/short videos, the judge on its own, the Claude review with the four frames, the Reel posting, byte ranges); browser checks for the full analyzer flow. Not tested: a real Instagram account or a real phone video (iPhone HEVC, very long clips), Render's 512 MB memory.

**6 Nov 2026 (Instagram & WhatsApp status: previews, rules, video studio)**
- **Previews**: the preview window (opened from Image Studio and drafts) now has **📸 Instagram** (feed post with the caption cut at ~125 characters, profile grid in 3:4 crops, Reel/Story with the areas Instagram covers shaded) and **💬 WhatsApp status** (9:16, caption near the bottom). The same preview is inside the Share on Instagram dialog.
- **Posting rules** (`socialRules()`): **red** items stop the post (Instagram's own limits: photo size and shape, caption 2,200, 30 hashtags, Reel 3 to 90 s; no engagement bait such as "like for like"; Reels need "my own original video" ticked). **Amber** advice needs "post anyway": 1080 px wide, 4:5 first photo, sharp/lit, not a duplicate, a real first line (what shows before "more"), a call to action, 3 to 8 hashtags, alt text, product keywords, busy hours, spacing from other posts, Reel length 7 to 30 s, a hook line, sound or text. The app cannot promise views or likes and cannot see the account's own statistics; the wording says so.
- (Removed on 7 Nov, see above.) **Video studio** (Instagram tab → Open the video studio, owner app only): upload a clip (up to 150 MB), trim, speed, zoom, move, brightness/contrast/colour, hook line (first 2 to 5 s), logo, fade, remove sound. The server (`wa-assistant/src/video.mjs`, ffmpeg) makes a **Reel file** (1080×1920 H.264/AAC), a **WhatsApp status file** (720×1280, at most 30 s and 16 MB) and a **cover**. Then: caption pack, rules, **post or schedule as a Reel** (Instagram `REELS` container, share to feed, cover), **download**, and **Share to WhatsApp** on phones. WhatsApp has no posting API, so status videos are downloaded or shared by the owner. Instagram's API cannot add trending/licensed music; add it in the Instagram app if wanted.
- Server: `POST /admin/api/video/upload` (raw video, still needs session + CSRF token + same site), `POST /admin/api/video/render`, `GET /admin/api/video/job`, public `GET /media/<id>.mp4` (byte ranges); `social/post` accepts `kind: 'reel'`. One render at a time, numbers clamped, arguments never go through a shell, text pictures must be real PNGs. ffmpeg comes from the `ffmpeg-static` package (optional dependency) or the machine's `ffmpeg` (`FFMPEG_PATH` overrides). Fixed an old bug: the 14-day cleanup could delete a photo that a post scheduled further ahead still needed.
- Tests: server 380 checks (15 new for video), new browser checks for rules, previews and the whole studio flow against a real server and real ffmpeg. Not tested: a real Instagram account, a real phone, Render's memory (a 512 MB server rendering a long 1080p clip; keep clips short).

**5 Nov 2026**
- **Anthropic (Claude) key can be added in the owner app**: Settings → Security & backup → **Claude AI key**. The server checks the key with Anthropic before saving, stores it encrypted (`wa-assistant/src/secrets.mjs` writes `secrets.json`, AES-256-GCM, key derived from `ADMIN_SETUP_TOKEN`), uses it immediately (no restart), and only ever shows the last 4 characters. A saved key wins over the server's `ANTHROPIC_API_KEY`; **Remove key** goes back to the server setting. Set and remove are in the sign-in activity log; 5 tries a minute. New routes `GET /admin/api/ai-key`, `POST /admin/api/ai-key`, `POST /admin/api/ai-key/remove`. The AI Helper tab now says to add the key there. Server checks now 365; one new browser check. Note: if `ADMIN_SETUP_TOKEN` is changed in Render, a saved key can no longer be read and must be pasted again.

**4 Nov 2026 (AI & photo tools)**
- **✨ Fill everything from the photos** (product form): reads the first photo (colours, fabric, category, border), makes a name if empty, then writes description, tags and SEO. Draft only; you review. Needs Claude connected.
- **Photo check** (no AI, no cost, runs in the browser): after photos are added, each one is checked for blur, darkness/over-bright, small size, and "looks the same as a photo already used" (same product or any other product).
- **Post images**: the status-image maker now also makes an **Instagram post 4:5 (1080×1350)**, puts the logo on every format, and has a gentle **Brighten & lift colours** option. (No background removal: that needs a separate service.)
- **Weekly note** on the dashboard: written once per week when the dashboard is opened (by Claude if connected, otherwise a built-in summary from your numbers), with **Write it again** and **Copy**.
- **Inbox reply helper** (assistant server): choose what the reply should do (confirm available, say sold, ask for address, explain payment, thank) and the language (same as the customer, English, Telugu, Hindi).
- **Follow-ups** (AI Helper tab): returning customers to message: recent deliveries with no review yet (needs order-update consent) and past buyers silent for 60+ days (needs offers consent). Drafts a short message with the STOP line; **Open WhatsApp to send** opens the chat for you to press send, and hides that customer for 30 days. Customers who did not agree are never listed.
- **Caption pack** (Instagram dialog): English + Telugu captions with hashtags and a WhatsApp status line; **Use this caption** fills the box.
- New AI tasks on the server: `captionpack`, `followup`. New switches in AI Helper → Switches. Tests: `ai-tools-test.cjs` (16 checks); server checks now 356.

**4 Nov 2026**
- **Special instructions or requests at checkout.** New optional box (300 characters) on Secure Checkout, e.g. blouse stitching, fall and pico, deliver after 6 pm. Saved on the order (`instructions`). The owner sees it as an orange note in the Orders list, at the top of the order details, on the packing slip ("CUSTOMER REQUEST"), on the dispatch list, and in the dashboard "needs attention" list ("orders with a special request to read") while the order is new or confirmed. The customer sees it on their track-order page. Shown as plain text only. Tests: `instructions-test.cjs` (6 checks) and one check in `delivery-test.cjs`. Not covered: orders started inside the WhatsApp chat assistant.

**3 Nov 2026 (later)**
- **Tracking number is sent to the customer automatically.** In the owner app, saving the Shipped dialog calls the server (`POST /admin/api/notify-tracking`), which sends the WhatsApp message itself: skips customers who opted out, never sends the same order + tracking number twice (claimed before sending), and only a corrected number or the 📲 Tracking button sends again. Uses the existing `order_shipped` template when the 24-hour chat window is closed. While WhatsApp is not live on the server it is a dry-run (logged, not sent). If the server cannot send, the app falls back to opening WhatsApp with the message ready. Tests: 4 new checks in `admin-app-test.cjs`.

**3 Nov 2026**
- **India Post shipping tools** (Orders tab). Marking an order *Shipped* now opens a dialog: courier (India Post Speed Post by default, Delhivery, Other), tracking number (warns if it does not look like an India Post number such as `EE123456789IN`, never blocks), tracking link filled automatically, and a ready WhatsApp message. **Save & send on WhatsApp** opens WhatsApp with the message for the owner to press send (nothing is sent by itself). New buttons: **Label** (A5 address label with big PIN, shop address and logo), **📲 Tracking** (resend the message), **🚚 Dispatch list** (all packed orders on one printable page with boxes for tracking number, postage and a tick). New test `tests/shipping-test.cjs` (10 checks).
- Not built: automatic delivery status (India Post has no free public connection), postage estimate, delivery follow-up reminders.

**2 Nov 2026**
- **Brand logo added everywhere** (from the owner's logo image). Header: AP monogram + name. Footer: full logo on a white card. Owner sign-in screen, invoice (when "Show business name" is on) and packing slip: full logo. Browser-tab / phone home-screen icon and the link-preview image on the site. Files in `shared/brand/` (`logo.png`, `icon-192.png`, `icon-512.png`); the page itself embeds small copies (`LOGO_URI`, `ICON_URI`) so nothing extra is fetched. All 354 server checks and 24 browser suites still pass.

**30 Oct 2026**
- **Separate, secure owner app + Instagram posting and scheduling** (owner request: "admin page independent from the website, no one should have a chance to hack it" and "post directly or scheduled at times recommended by Claude on Instagram"). `tools/build-split.py` now builds (1) `build/site/index.html`, the public website with **no admin screens, no PIN, no demo bank/customers** that reads `GET /public/shop`, and (2) `wa-assistant/public/admin.html`, the owner app served only at `/admin`. Server: `src/adminauth.mjs` (no default password, setup token, scrypt, lockout 5/15 min, TOTP 2-step, hashed 256-bit sessions, `__Host-` HttpOnly SameSite=Strict cookies, CSRF + same-origin checks, idle 30 min / absolute 8 h, audit log), `src/shopdata.mjs` (the shop's data now lives on the server; saves are merged field by field so new orders are never wiped; `publicView()` is a whitelist), `src/media.mjs`, `src/instagram.mjs` (Graph API publishing, schedule queue, claim-before-send, never double-post, retries, daily cap), `src/adminroutes.mjs`, AI task `postplan` (caption, hashtags and 3 recommended times validated server-side; honest that it has no account analytics), optional `ADMIN_ALLOWED_IPS`, inbox/test pages accept the owner session. Owner app: sign-in/setup screen, server-synced saving with a Saved badge, Security & backup (password, 2-step, backup, import, sign-in activity), Instagram tab, *Share on Instagram* window after publishing a product and a 📸 button on each product. Found and fixed while testing: the password-strength rule accepted weak passwords (operator precedence), a forged request could sign the owner out (logout now needs the security token), and a failed 2-step code wiped its own form. Admin tabs now 20. New HOW-IT-WORKS/17. Tests: server 354 (+78), new `admin-app-test` 35.
- **How-it-works pages brought fully up to date** (owner request). New `HOW-IT-WORKS/16-data-reference.md`: every storage key, every `db` collection with its fields, the assistant server's data, what is sent to AI, privacy and deletion. Overview (01), storefront (02), go-live (11), troubleshooting (12) and testing (10) updated for everything built since 26 Oct (accessories, bundles, AI helpers, dashboard, ready-to-post drafts, phone fixes, primary address).
- **Ready-to-post drafts** (owner request). *Save product draft* in Image Studio now opens a **Draft details** dialog (name, category, price, stock, fabric, colours, description, tags) with AI help: **✨ Fill with AI (built-in)** (description, tags, fabric, colours from the photo; runs automatically for a named draft), **✨ Write with Claude** and **📷 Read photo** when connected, language picker. Price is never guessed by AI. A draft is **Ready to post** when it has a photo, a real name, a category, a price and a description of 30+ characters; cards show ✅ Ready / ⚠ Needs details with what is missing; SEO text and slug are filled in on save. Drafts tab and the Products tab group by category with Ready / Needs-details filters, **🚀 Post now** (publishes with every detail and removes the draft; SKU clashes refused), **🚀 Post all ready**, **✨ Fill all with AI**, and *Full form* for the old route. Older drafts show Needs details. Test: new `drafts-ready-test`; studio and dashboard tests updated.
- **Ten AI helpers for the owner** (owner request). New admin tab *AI Helper* (switches + privacy note, tools 4, 6-10), plus buttons in the Product form (✨ Write with Claude, 📷 Read photo, 🌐 Translate, language picker), Reviews (✨ Draft) and the assistant Inbox (✨ Suggest a reply). Server: `src/aihelper.mjs`, `POST /api/ai` and `/api/ai/reply` (admin token, 40/min, JSON tasks, injection-safe prompts, photo as an image block). Every helper only drafts. Built-in fallbacks for writer, ask, summary, pricing, data clean-up and review replies work without Claude; photo reading, reply suggestions, Telugu/Hindi and translation need it. Ask / Summary / Pricing send no customer names, phones or addresses; clean-up asks before sending addresses and its fixes are validated. Admin tabs now 19. New HOW-IT-WORKS/15. Tests: server 274 (+18), new `ai-test` 35.

**29 Oct 2026**
- **Interactive owner dashboard, drafts by category, add-to-cart animation** (owner request). *Dashboard* rebuilt: period picker (Today / 7 / 30 / 90 days / 12 months / All), six clickable KPI cards (revenue, orders, average order, pieces, customers new/returning, discounts) with change versus the previous period and sparklines, revenue / orders / pieces chart (daily, weekly or monthly bars; tap a bar to list that day's orders), a *Needs your attention* list (orders to confirm / pack / ship, address checks, reviews, waiting customers, failed messages, drafts, low stock, missing photos; each opens its tab), orders-by-status donut, best sellers, sales by category and by source (website vs WhatsApp), stock snapshot, top customers, latest orders, recent activity, and a "how are these numbers worked out" note. **Products tab** now shows *Saved drafts by category* (collapsible groups, jump chips, Publish/Preview/Edit/Delete on each); the Saved Drafts tab is grouped too. **Add to cart** plays a green check animation with "N in your cart" (button turns green too; respects reduced-motion; never blocks taps). Built from the screenshot supplied; the Instagram reels themselves could not be opened from this environment. Test: new `dashboard-test`.
- **Primary address + place prediction** (owner request). Saving the profile now adds its address to the address book as the **primary** (★) address and keeps it in step when the profile is edited (older accounts get it on first use); *Make primary* on any saved address updates the profile; the primary address is listed first (★) at checkout. **City/state prediction** in profile, checkout, address book and gift fields: a 6-digit PIN suggests city and state (offline table of about 60 PIN areas plus the state map), a known city suggests its state, city/state boxes show a suggestion list, PIN boxes use the number keypad. Suggestions never overwrite what the customer typed, unless the new PIN belongs to a different state than the one shown. Admin PIN reminder: default 1234, change in Settings. Test: new `address-test`.
- **Phone audit and fixes** (owner request: every page mobile-friendly, no bugs, lag or overlaps). New `mobile-audit` and `mobile-perf` tests. **Fixed:** product page was 400 px wide on 360 px phones (right edge cut off); Sarees/Accessories tabs now their own row; the floating *Switch to Admin* button covered products on phones (now *Owner login* in the menu and footer, *View store* in the admin menu); cart drawer footer took two thirds of a small screen (delivery/reminder rows moved into the scrolling list) and Checkout was unreachable on a phone on its side; modal close button scrolled away on long sheets (now sticky); checkout/account/login sheets wasted 25% width on side padding; inputs under 16 px made iPhones zoom; footer, FAQ, filter and photo-tool controls were too small to tap; admin tables are now cards on phones (no sideways swiping); admin product form overflowed at 320 px; small print raised from 9-10 px to 11 px; long catalogues draw 24 cards at a time with *Show more* plus `content-visibility` (search typing 400 ms to 190 ms at 4x slower CPU, scroll jank 10% to 1%); layout shift on load removed; no 300 ms tap delay; `dvh` heights for mobile browser bars.

**28 Oct 2026**
- **Bug sweep (owner request "check if there are any bugs").** Method: click-everything crawl (1,440 clicks), duplicate-id check, XSS probes through every new screen (bulk upload, bundles, recently sold, wishlist, requests), full checkout with a bundle, deleted-product-in-bundle/cart/favourites, 320/360/390 px layouts. **Found and fixed:** (1) a malformed link such as `#/wishlist/%E0%A4%A` or `#/product/%E0%A4%A` threw an uncaught error (`safeDecode`); (2) after a sale or any product edit the home page kept stale **Recently sold**, occasion tiles and recently-viewed until reload (now refreshed by every product re-render); (3) at 320 px the shop search box overflowed by 6 px (an old bug); (4) an order's discount line did not say whether it came from a coupon or a bundle (now "Discount (FLAT500, bundle: …)"); (5) assistant `search_products` with an unknown `type` returned nothing (now searches both). **Checked and fine:** no XSS, no duplicate ids, no errors from 1,440 clicks, bundle discount and stock are right after a real checkout, older/empty/corrupted saved data load. Tests: server 256, `sold-test` 36, new `crawl-test`.

**27 Oct 2026**
- **Deliverables are updated in place** (owner request: "keep updating all this data without creating a new file every time"). New standing rule: after every change run the tests and `./check-record.sh`, then `tools/refresh-exports.sh`. It overwrites `anitha-store.html`, `data-export/anitha-store-data.json`, `data-export/assistant-catalogue.json` and `../APSilks.zip`; one rolling backup replaces the numbered `bakN` files; no `-v2`/dated copies are made.
- **Chat-orders switch, Recently sold, Request a similar piece** (owner request). Admin → WhatsApp Assistant has *Take orders in WhatsApp chat* ON/OFF (`settings.waOrdersOn`, published as `shop.ordersOn`; server tool `create_order_request` returns "ordering paused" and the prompt says so when OFF; questions, search and photos keep working). Home page has a *Recently sold* row (sold-out sarees, newest sale first, no buyer or price; owner switch in Home Page tab) with *Request a similar piece* (form → WhatsApp message to the shop with fabric, colour, budget, note) and *Tell me when one arrives*. Tests: server 255 (+8), new `sold-test` 30 and `upgrade-test` 10 (old store, empty browser, corrupted data); all other suites pass.

**26 Oct 2026**
- **Ten storefront additions** (owner request): Shop by occasion tiles (+ filter chip); Recently viewed (this phone only); Share my wishlist (`#/wishlist/…` link and shared page); product-page colour note, ▶ Watch it draped and ☀ daylight-photo jumps (new product-form checkbox); **One of a kind** wording for single-piece sarees; consent-based **Similar-saree alerts** (new `db.similarAlerts`, outbox type/template `similar_arrival`, summary on Stock Alerts tab, triggered on publish/restock/bulk add); **Bundles** (new admin tab, `db.bundles`, discount in `computeTotals`, shown as its own line and stored on the order as `pricing.bundle`); **Bulk CSV upload** + template; **📲 Status image maker** (canvas PNG, story or square); **FAQ** page with FAQ structured data. New `HOW-IT-WORKS/14`. Tests: new `extras-test` 66; all other suites still pass. Admin tabs now 18.
- **Accessories for sale** (owner request). An accessory is an ordinary product whose category is in the new list `db.accessoryCategories` (default: Jewellery, Blouses & Fabric, Bags & Potlis; four demo items are added once to existing stores). Shop has **Sarees | Accessories** tabs (sarees stay the default; search, filters, counts and category chips follow the tab). Product form groups categories into Sarees / Accessories; Category Manager has a separate accessory section (a name cannot be used in both lists). **Complete the look** row on saree pages and **Add an accessory** row in the cart (in-stock only). Cart, checkout, gifts, delivery, coupons, invoices and payments work unchanged. New Arrivals and the home category strip stay saree-only. Assistant: catalogue carries `type`, `search_products` has a `type` filter, persona has an Accessories section. Tests: server 247, new `accessories-test` 22; shop/features/SEO tests now count sarees only (sitemap 13+3).
- **Help buttons changed:** the buttons under order messages are now **Track order** and **Help & support** (replacing Change address and Talk to Anitha). *Help & support* asks what the customer needs; their next message goes to the assistant with the order as context (change address before dispatch, answer, or hand over). The old `addr:` / `human:` button ids still work if they appear in old chats.
- **PIN codes never block an order** (owner's instruction): removed the "tick if correct" box and every hard block, on the website and in WhatsApp. The store shows friendly notes (mismatch, non-existent PIN, area not usually served: no delivery date) and takes the order; the assistant asks once and then accepts; `create_order_request` / `update_delivery_address` always go through after one confirmation. Orders are flagged `addressCheck` (⚠ in admin Orders and the inbox, status `mismatch` / `invalid` / `confirm` / `unserved`) so the owner can confirm delivery. Delivery & Gifting tab wording changed ("needs a check", "We usually deliver"). Tests: server 242, `delivery-test` 49.
**24 Oct 2026**
- **Smooth-transaction features** (owner's list: help buttons, address correction, gifting, 5 delivery check, 6 clear total, 9 tracking, 10 invoice, 12 review request, 4 saved addresses; **no cancel option; no re-order**).
  - Shared code: `shared/pincode-core.js` (PIN→state, city→state, `addressCheck`, `deliveryEstimate`) and `shared/slip-core.js`, synced to the store and `wa-assistant/src` by `tools/sync-shared.py`; `check-record.sh` now fails if copies drift.
  - Store: delivery check on product page and cart; checkout PIN/city/state check with delivery date; gift box (wrap fee, note card, ship to recipient, hide sender); address-book chips; My Account → Track (steps, courier link) and Change address until shipped; no cancel anywhere; Orders: new statuses packed / out for delivery, courier prompt on shipped, **Slip** button, badges; new admin tab **Delivery & Gifting**; publish sends delivery rules, gift fee and GST details; import now creates invoices, gift/recipient data and keeps statuses in sync. Terms/Privacy v1.5. Tests: `delivery-test` 48, `mobile-test` 81.
  - Assistant: interactive buttons (Track order / Change address / Talk to Anitha); tools `check_delivery`, `check_address`, `update_delivery_address`, `get_saved_address`; `create_order_request` takes city/state/gift/recipient and refuses mismatched or unserved PINs; statuses packed → shipped → out for delivery → delivered with messages; private tracking page; GST invoice PDF (own tiny PDF writer) sent as a WhatsApp document; review request 48 h after delivery; export/ack now sync later status changes. Tests: 237 checks.
**23 Oct 2026**
- **Folder reorganised:** everything for this project now lives in the single `APSilks/` folder (store, assistant, tests, backups, archive, record, docs). Added `run-tests.sh` and `check-record.sh`; removed the duplicate-copy script.
- **Discount codes in the chat.** New `coupons.mjs`; assistant tools `check_discount_code`, `list_offers`; `discount_code` on order requests. Coupon fields added in the store admin (min order, expiry, max uses, first-order only, once per customer, channel, "assistant may mention"). Store checkout enforces the same rules; orders record the code; website usage and past buyers are sent to the assistant so limits hold across channels; guess protection (6 wrong codes/hour); payment link and message show the discount. Tests: server 165, `coupon-test` 18.
- **Project record + HOW-IT-WORKS folder created** (this folder), with a staleness check (first called update.sh, now `check-record.sh`).
- **WhatsApp orders + payment links.** `orders.mjs`, `payments.mjs` (mock + Razorpay). Owner approval or auto; stock hold; signed-webhook-only paid; expiry sweep; template fallback outside 24 h; shipped message; export/import of paid orders into the store; inbox actions. Terms v1.4. Tests: server 138→, `order-test` 11.
- **Abandoned-cart follow-up.** "Welcome back" resume card; `cartReminder` consent (cart, checkout, My Account); `/cart/sync`; scheduler with all stop rules; Carts tab in inbox; admin stats; `#/cart` link; Terms/Privacy v1.3. Tests: `cart-test` 22.

**22 Oct 2026**
- Delivered final `anitha-store.html` (all features up to the WhatsApp assistant).

**17 Oct 2026 (and earlier sessions in the same build)**
- **WhatsApp assistant server** (`wa-assistant`): webhook with signature check, Claude replies with catalogue tools, photos, order requests, hand-over, STOP, rate limits, daily cap, test chat page, inbox page. Store: chat button + "WhatsApp Assistant" admin tab (policies, connect, publish catalogue). Terms/Privacy v1.2.
- **Bottom tab bar** (Home · Shop · Wishlist · Cart · Account) previewed, approved, merged.
- **Phone-first layout:** two-column grid, one-row category chips, swipeable New Arrivals, full-screen product page with sticky Add to Cart and swipe gallery, 44 px touch targets, 16 px inputs, admin tables scroll inside cards.
- **Search & filters, scheduled banners, back-in-stock alerts, reviews with photos** (Terms/Privacy v1.1).
- Home-page editor, WhatsApp-OTP login + consents + Terms/Privacy v1.0, share links, favourites de-duplicated, "Enquire on WhatsApp" removed, multi-photo drafts, product SEO, video URL, Image Studio rebuilt, first bug-fix pass.
