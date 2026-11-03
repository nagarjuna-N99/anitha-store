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
