# 29 · Saree Care page and the full wash-care guide (4 Nov 2026)

## What changed
- Pages → Saree Care → **📚 Add the full wash-care guide**. It adds four tabs, each with several plain tips: **Washing**, **Drying & Ironing**, **Stains**, **Zari & Embroidery**. Your existing tabs (Pure Silk, Tussar, Cotton & Khadi, Storage Tips) stay as they are. Pressing it twice adds nothing twice.
- **Photos:** the new tabs take their photo from **your own products** (the pictures you uploaded), so they are real photos of your sarees. I cannot find or add outside photographs; to use a different photo, press Upload photo on that tab.
- **Broken photos fixed:** the built-in photo links for the four old tabs had a doubled "?q=80&w=800" and did not load (you saw an empty box). They are repaired automatically, including on a page you already saved. A photo that still cannot load now shows a plain cream box, not a broken-picture icon.
- Every tab with **Show on the website** ticked appears on the website, in the order shown in the admin. A tab with it unticked is hidden.

## Content
The tips are common, widely used textile-care practice (cold-water hand wash, no wringing, dry in shade, iron on the wrong side, talc for oil, wrap zari in tissue). Please read them and change anything that does not match how you advise customers.

## Tests
`tests/care-test.cjs` (9 checks): all ticked tabs show including Storage Tips, link repair, the guide button, own-product photos, no duplicates, hidden tab hidden.
Not tested: the live site (Storage Tips not showing could not be reproduced here).
