# 43 · Website background: kalamkari, peacocks, lotus and festival lamps (12 Nov 2026)

Where: **Admin login → Home Page → Website background**. Code: `src/js/349-website-background.js` (the art, the builder, the website layer), the `background` task in `aihelper.mjs`, the layer `#siteBg` in the CSS. Data: `home.background` (the look on the website now), `home.backgroundLooks` (saved looks, up to 12). Only a few numbers are stored, never a picture.

## What it does
A soft, hand-drawn pattern behind the **whole website**. The art is drawn in code from original shapes (kalamkari paisleys and flowers, vines, peacocks and feathers, lotus, festival lamps and stars): nothing is downloaded, copied or taken from another site, and no court or company imagery is used.
- **Style:** Plain, Kalamkari, Peacocks, Festival lamps, Lotus and leaves (or Claude's idea).
- **Colours:** Heritage (indigo, madder, sand), Peacock (teal, blue, gold), Festive (maroon, saffron, gold), Monsoon (green, rose, mist); an idea from Claude brings its own four colours.
- **How full:** Light, Medium, Rich. **How strong:** 8 to 40 % (keep it low so the words stay easy to read).
- **Positions are random but repeatable:** a *shuffle number* decides where each motif goes. The same number always draws the same picture; **Shuffle positions** tries a new one. About three quarters of the art sits near the left and right edges, so the middle stays calm.

## Preview first, then deploy
A large preview box (about 380 px tall) shows the pattern behind a small copy of the real page (menu, a moment panel, the quote). **Nothing changes on the website until “Put this on the website”.** While the preview differs from the website, the card says “Preview only”. “Back to what the website has now” throws the draft away; “Remove the background” puts the website back to plain.

## ✨ Ask Claude for a background idea
Type a festival or a feeling (Diwali, wedding season, calm monsoon). Claude proposes **3 ideas** from the fixed list of motifs (it cannot invent pictures): a name, 2 to 4 motifs, four colours, how full and how faint. Every answer is **checked**: unknown motifs, bad colours and silly strengths are dropped or calmed. “Preview this” loads an idea into the big box; it never goes on the website by itself. Without Claude, built-in ideas that match the words typed (Diwali, Pongal, Navaratri, wedding, monsoon…) are offered. Switch: AI Helper → “Website background ideas”.

## Festivals and seasons
**Save this look** (name it, for example “Diwali 2026”) keeps up to 12 looks. Each can be previewed or put on the website with one press, so the background can follow the festivals. (It is changed by hand: there is no automatic date switch.)

## Notes
- The layer is fixed behind the page, takes no clicks, and lives inside the website view, so the owner and admin apps never show it.
- Colours of text and cards are not changed; keep the strength low so they stay readable.
- Not tested: a real phone, very old browsers, Claude's real ideas.
