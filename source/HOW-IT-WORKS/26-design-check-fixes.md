# 26 · Design check and fixes (4 Nov 2026), in plain words

## What was checked
I installed the open-source **Hallmark** design checker and ran it two ways:
1. **Code scan** of the public website and the owner app.
2. **Browser check** of 43 real screens (14 public, 29 owner) at 7 widths from a small phone (320 px) to a wide screen (1920 px): home, shop, product, cart, checkout, My Account, sign-in, Care, Journal, FAQ, Terms, Privacy, all 24 owner tabs, the product form, and the owner screens in dark mode.
The checker lives in `~/.claude/skills/hallmark` on the machine that ran it; it is not part of your shop and is not deployed.

## What was fixed
**Reading and seeing**
- Small grey text was too faint. All the grey text colours were darkened (about 190 places), the gold used for text and gold buttons was deepened, the red of the heart/badges and the green of "delivered" tags were deepened. Light text on dark parts such as the footer was kept light.
- Keyboard focus is now a clear ring on every link, button and field (dark ring on light surfaces, light ring on dark ones). Before, many fields only changed their border colour.
- Form fields now have a border you can see (3:1).
- Text lines are capped at about 64 characters on the legal pages and notes, so they are easier to read.
- Smallest text raised from 9 to 10 px up to 11 to 12 px. `small` text is 12 px.
**Phones**
- The shop filter buttons ("Ponduru Khadi") no longer wrap onto two lines.
- Close buttons, filter buttons, the favourite/share hearts and card buttons are at least 44 px to tap.
- The slide-in menus now slide with `transform` (smooth) instead of `left`, and are hidden from keyboard and screen-reader users while closed.
- The hero uses the small-screen height, so it no longer jumps when the address bar hides. The first hero slide shows even if scripts are slow or blocked.
- The page clips sideways overflow in the modern way (`clip`) so sticky headers work.
- Found by the phone audit while fixing: the Journal cards, the (since removed) Atelier page and the Home Page editor were 20 to 60 px too wide on a 320 px phone. All three now fit.
**Look**
- Small labels (form labels, table heads, tags, status, dates) are now plain sentence case, not tiny tracked capitals. Buttons and the menu keep capitals with light spacing.
- One serif font (Cormorant Garamond) instead of two. Bold is semibold, so the page uses fewer font weights.
- Care heading is no longer italic. Headings balance their lines; prices use even-width numbers.
- The owner menus and the customer's phone menu no longer use emoji as icons: the owner menus have one set of drawn icons, the customer menu is words only.
- Footer: the card-brand list ("Visa · Mastercard · UPI · Razorpay") is gone. It claimed payment options the site does not offer at checkout (payment is agreed with the customer on WhatsApp). It now says so.
- Smaller things: an image with no source got a blank placeholder, a heading level was fixed, a double border on the resume bar removed, side stripes on cards softened, a row of chips no longer leaves one alone.
**New look (/admin2):** the slide-in menu, field edges, links and the small accent label were fixed for light and dark.

## What was NOT changed (on purpose or not possible)
- **Photos.** The sample photos still come from a stock-photo site (Unsplash). Please upload your own: the checker flags them, and a stock site can stop serving them.
- **Emoji inside owner buttons and headings** (✨, 📝 and so on) stay: it is your private app and they help scanning. The menus were changed.
- **Marketing-page rules** such as "words per screen", "hero touches the edge at 1920 px" or "only one section" do not suit a shop and an admin app, so they were not followed.
- **Off-screen drawers** (cart, menus) are flagged as "past the screen" because they sit off-screen on purpose.
- Some long suggestion buttons in the AI Helper still wrap onto two lines; a few small owner buttons are 28 to 32 px (allowed for app screens).
- A few headings still sit slightly close to the content above them; the spacing between some sections differs.

## Result
Browser-check findings: **public site 291 to 135** (hard fails 192 to 68), **owner app 452 to 253** (hard fails 293 to 154). Fully cleared: visible focus on the public site, wrapping filter buttons, long text lines (public), tiny text (public), heading stubs and the script error. What is left is mostly the "not real" kind (stock photos that cannot load in the test, off-screen drawers, marketing-page rules) plus a short list: a few form-field edges, some small quantity buttons in the cart, a few dark-mode cart and menu details inside the owner app, and one long address link. The mobile audit and every test pass.

## Follow-up (small items)
Cart quantity buttons, card buttons and close buttons are now 44 px; the footer address stays on one line; AI Helper suggestion chips are wide enough for their text; the slide-in cart in the new look follows light and dark. Still left: uneven gaps between some sections, and one kind of field edge the checker flags (checkboxes).
