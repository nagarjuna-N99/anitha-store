# 23 · The new owner look (`/admin2`), in plain words

## What it is
A second way to open your owner app, with a new look: soft glass cards, light or dark, and a new **Shop Overview** at the top of the Dashboard.
- **Classic:** `https://<your server>/admin` (nothing changed there).
- **New look:** `https://<your server>/admin2`.

Both are **the very same app**. Same password, same 2-step code, same helper logins, same data, same buttons. A change you make in one shows in the other. There is no second copy of anything, so nothing can be missing or behave differently. (The server sends the same page to both; `/admin2` only switches the new look on.)

## What is new on the Dashboard (new look only)
At the top, **Shop Overview**, drawn from your real orders:
- **Sales this month** (cancelled orders left out) and how it compares with last month; **open orders**; **how many finished orders were delivered** (last 90 days).
- **Sales chart**, 6 or 12 months. Touch or hover a month to see its figure.
- **New from the website:** each order with **Accept** and **Not possible**. They work exactly like the buttons in Orders (Accept adds a normal order, takes stock, keeps the customer's consent record; Not possible asks you for a reason). The page stays where it is. New orders appear by themselves within 15 seconds.
- **Monthly goal:** you type the goal; the ring and the dashed line follow it. The goal is kept in this browser only.
- **Orders by stage**, **Best sellers** (this month), **Today** (a list built from real work: website orders to confirm, orders to pack, privacy requests due, sarees running low; tick to fill the bar), and Instagram and WhatsApp previews (owner only; no message text, numbers masked).

Below it is the **full classic dashboard**, unchanged, so nothing you used before is gone.

## Light and dark
The button **◐ Light / dark** is at the bottom of the left menu. It remembers your choice in this browser. A safety net re-colours any text that would be hard to read on an older screen, so every screen is readable in both.

## What we checked
A browser test opens **all 23 screens** in both looks and checks that the content is exactly the same, that numbers on the Overview match the orders, that Accept / Not possible work from the Overview, and that no text is unreadable in light or dark (`tests/ui2-test.cjs`; server checks in `tests/run.mjs`).

## What we did not check
- Real phones and other browsers (tested in Chromium only).
- Very long screens such as Image Studio were checked for readable text, not for a pixel-perfect new design: they keep their classic layout inside the new colours.
- The Overview's Instagram and WhatsApp cards with live accounts.

## For the developer
- Server: `GET /admin2` in `wa-assistant/src/adminroutes.mjs` (same IP limit, headers and page as `/admin`, plus `class="ui2"`); `GET /admin/api/previews` (owner only; the same data as the Ops page previews, `previewsOf` in `src/ops.mjs`).
- Client, all in `anitha-store.html`: the `<style id="ui2css">` block (inert unless `<html class="ui2">`), `renderOverview2` / `ov2*` functions, `ui2Guard` (contrast safety net), and a one-line wrapper `renderDashboardPro` that puts the Overview above `renderDashboardClassic`. A link such as `/admin#orders` opens that screen directly.
- To retire the classic look later, make `/admin` serve the same page with the class and delete nothing else.
