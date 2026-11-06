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

## Phones (fixed 6 Nov 2026)
The picture is drawn in the **shape of the screen**: a tall 800 x 1400 picture on phones, a wide 1600 x 1000 one on computers and tablets in landscape. Before this, a phone showed only the middle slice of the wide picture, where the art is sparse (most motifs sit near the edges), so the background looked empty or "not updated". Turning the phone sideways redraws it in the wide shape. The preview boxes in the admin app always use the wide shape. On the home page the big banner photo is a solid panel and covers the background; the pattern shows behind everything below it.

## More designs, a new one every time (6 Nov 2026)
The owner saw the same three ideas "refreshing" instead of new backgrounds. Now:
- **Five layouts** (the Layout choice): Scattered, Frame around the edges, Big corners, Flowing vine, Repeating pattern. The same motifs look completely different in each.
- **Thirteen motifs:** paisley, flower, vine, peacock, feather, lotus, lamp, star, **sun, kolam (rangoli), mandala, jasmine, mango**.
- **Surprise me with a new design** invents a design on the spot (random layout, motifs, a harmonious four-colour palette, fullness and shuffle number): a new look every press, no Claude needed. It goes to the big preview only.
- **Give me 3 NEW ideas:** each press asks Claude again and tells it the names already shown and the round number, and Claude is told the three ideas must differ from each other (a different layout in each) and from everything shown before. Its answer is checked as before (unknown motifs or layouts are dropped or set to "scattered"; a pattern fainter than 20 % is raised to 20 % so it is visible). Without Claude the built-in ideas are new each time too: ones that match the festival words typed come first, then freshly invented designs, never repeating a name already shown.
- Previews of ideas show the layout name, so the three are easy to tell apart.

## Match my page colours (6 Nov 2026)
Under "Ask Claude for a background idea" the card shows the **five colours your page uses** (accent, ink, background, cream, sage: from Home Page → Website colours) and a button **"✨ Suggest backgrounds that match my page colours"**. Claude is sent those real colours (checked: only real hex colours are passed on) with the instruction to keep the same hues so the pattern sits naturally with the page, and to give three different layouts. The ideas appear for **preview only**. Without Claude, three designs are built directly from the page colours (the ink or accent as the line colour, the cream as the soft fill, with a frame, corners and a vine layout).
