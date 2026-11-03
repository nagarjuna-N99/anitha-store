# 27 · Hero photo zoom, colour matching and "View home page" (4 Nov 2026)

## "View home page" was blank, now fixed
In the owner app the button switched to the shop screen, which the owner app keeps hidden, so you saw an empty dark page. It now **opens your public website in a new tab**. It uses the **Website address** from Settings (or `SITE_URL` on the server). If neither is set it tells you so. The same fix applies to "View store" in the phone menu.

## Zoom (Home Page → each hero slide)
- **Zoom** slider, 100% to 250%.
- **Move photo left / right** slider, plus the existing Top / Middle / Bottom focus.
- **Reset zoom** puts it back.
All three show on the website at once, and in the preview under the slide.

## Match colours to the photo
Press **🎨 Match text and top-bar colours to this photo** on a slide. It reads the photo's real colours (it works from the picture itself, so it needs no Claude key and costs nothing) and then:
- picks a **title and description colour** that is a tint of the photo's main colour and reads clearly on the photo (at least 4.5:1 against the part of the photo behind the words, after the dark overlay);
- picks an **accent** (the small heading) and a **button colour** from the photo's strongest colour, with white or dark button text, whichever reads better;
- picks a **top-bar colour**: a **dark** bar in the photo's deep shade for a dark photo, or a very pale tint of the photo's colour for a bright one, with text that reads clearly (at least 7:1);
- **darkens the photo a little only if** the words would still be hard to read, and tells you.
The slide shows three small swatches (text, accent, top bar). **Clear matched colours** removes them.

## Top bar follows the hero
**Top bar follows the hero photo's colours** (switch at the top of the slides). When on, the white strip with "Anitha Pemmasani" changes to the colours of the slide being shown, smoothly as slides change. On every other page it stays the normal ivory. Slides you have not matched keep the normal bar.

## Limits
- It needs to read the photo. A photo from another website that does not allow it will say so: use **⬆ Upload photo** instead.
- The search, heart, account and cart icons are the usual symbols: they stay the same colour.
- Only the photo's colours are matched; fonts stay the same.

## Tests
`tests/hero-theme-test.cjs` (16 checks): zoom and position on the website, the editor sliders, matching a dark photo and a pale photo (text and button contrast, top bar contrast), the top bar following on the home page only, switch off, clear, an unreadable photo. `home-test.cjs` updated for the new photo layer. `ui2-test.cjs` +2: View home page opens the website, and the sliders and button are in the new look.
Not tested: the colours on real photos of your sarees (only synthetic photos), and other browsers.

## Update (4 Nov 2026)
Matching a photo no longer turns the top bar colour on by itself: switch **Top bar follows the hero photo's colours** on only if you want it. The top bar is slimmer and shows the full logo; on a dark bar the logo sits on a white tile.

## Update (4 Nov 2026)
Matching a photo no longer turns the top bar colour on by itself: switch **Top bar follows the hero photo's colours** on only if you want it. The top bar is slimmer and shows the full logo (on a dark bar it sits on a white tile). The shop name is set in Bodoni Moda Bold Italic.

## Update 2 (4 Nov 2026): automatic colours
- You no longer need the match button: when you add or change a hero photo, or move/zoom it, the text, button and top-bar colours are picked and saved by themselves. The button is still there to redo it.
- The top bar is always light: a pale tint of the photo's main colour, with the shop name and menu in a deep shade of the same colour. It follows the photo by default; switch it off in Home Page → Hero slides.
- The header shows the round A/P monogram. The "Complimentary shipping" line now sits just above the footer; edit it under Home Page → Announcements.

## Update 3 (4 Nov 2026): the preview is the real website
The picture under each slide is now the website itself (header with the shop name and menu, then the hero), drawn at your screen's width and scaled down to fit. Fonts, colours and line spacing are the same as visitors see on that kind of screen, only smaller.

## Update 4 (4 Nov 2026): header on the photo
On the home page the header has no bar: the name, menu and icons sit on the hero photo. Scroll down and it turns into the light bar (tint of the photo). Other pages keep the normal bar. On a phone the bottom bar is unchanged. The shipping line now also shows on every product page, and the footer no longer says payment is agreed on WhatsApp.

## Update 5 (4 Nov 2026): text style, and the preview matches 100%
- **Preview fixed.** The small picture under each slide now breaks the lines exactly like the website (a leftover rule had kept the title on one line). The title, small heading, description and button have the same size and place as on the live page.
- **Text style** (under each slide): big-heading font (11 choices), weight, italic or upright, CAPITALS, shadow, description font, big-heading size, space between letters, space between lines, description size, button filled or outline, and colour pickers for the big heading, description, small heading, button and button text. "Auto" next to a colour goes back to the automatic colour. "Reset text style" puts everything back.
- **✨ Auto-style the text for this photo:** picks the font, weight, size and shadow from the photo (dark or light, colourful or calm, plain or detailed) and tells you why. It also runs when you add a photo, unless you untick "Style it automatically…" or change a style yourself.
- **✨ Suggest the words:** three drafts for the small heading, title, description and button. With Claude connected they are written by Claude (about the photo's colour and your categories); otherwise built-in drafts appear. Nothing is saved until you press "Use these words". It never mentions prices, offers or promises.

## Update 6 (4 Nov 2026): simpler slide editor
Each slide now shows only the photo, the words and one row of looks (Auto, Elegant, Bold, Modern, Soft, Classic). Tap a look and the font, weight, size and spacing change together. Auto matches the photo. Everything else (zoom, photo position, darkness, button link, every text option and colour) is inside **More options**, closed until you open it.

## Update 7 (4 Nov 2026): one look for all slides
All slides now share one text look, so the banner reads as one design. Pick a look on any slide (Auto, Elegant, Bold, Modern, Soft, Classic, or change any text option) and every slide follows. The words and the colours (each photo needs its own for readability) stay separate. A slide you add later takes the same look. To let one slide differ, untick **Same look on all slides** under the looks.

## Update 8 (5 Nov 2026): the Collection page banner, and one search
- The Collection page opens with a banner photo and words. Edit it under Home Page → **Collection page banner**. It uses **exactly the same editor as a home slide**: photo (upload or link; until you pick one it uses the first home page photo), small heading, title, description, button text and link, ✨ Suggest the words, the row of looks (Auto, Elegant, Bold, Modern, Soft, Classic), and under **More options** the photo position, zoom, move, darkness, every text option, colours and colour matching. The look is shared with the home slides, so a look chosen on either one changes both. Switch it off with its Show switch.
- The website now has one search, in the top bar on every page. Tap the 🔍: a search bar opens under the header. Typing from any page shows the results on the Collection page. The extra search box that sat in the middle of the Collection page is gone (Sort and Filters stay).

## Update 9 (5 Nov 2026): the Collection page layout
The Collection page now has a title block (Home / The Collection, the title and how many sarees), one **Filter & sort** button (sort and filters are in the panel it opens), a line saying prices include taxes, and calmer saree cards on phones.
