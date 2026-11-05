# 37 · Two sign-ins: the Owner and the Admin (5 Nov 2026)

The owner app now has **two separate logins with two jobs**. Everything below is enforced **on the server**; hiding a menu item is only a courtesy. The rules live in one file: `wa-assistant/src/roles.mjs`.

| | **OWNER** (the business) | **ADMIN** (the look and the technical side) |
|---|---|---|
| Address | `https://anithapemmasani.com/owner` | `https://anithapemmasani.com/admin` |
| Signs in with | her **name + password** (+ 6-digit code if she switched on 2-step) | the **password** only (+ code if on) |
| Screens | Dashboard, Products, Categories, Image Studio, Saved Drafts, Bundles, Orders, Invoices, Reviews, Stock Alerts, Customers, Coupons, Delivery & Gifting, Statements, Growth, Privacy, Instagram, WhatsApp, AI Helper, Settings (My sign-in & backup) | Home Page, Pages, Image Studio, Instagram, WhatsApp, AI Helper, Ops, Audit Logs, Settings (Security & logins) |
| Can change | sarees, categories, items, prices, stock, shipping charge, free-shipping amount, GST, coupons and discounts, delivery rules, orders, invoices, customers (view, export, erase), privacy requests, reports, weekly-report email setup, her own password and 2-step, encrypted backups and restore | the home page (banner, quote, story chapters, Notes from the loom wording, colours, picks), Pages (Care guide, Journal, extra pages), the website description and address, Claude key, creating / resetting / removing the owner login, Ops, audit log, the Notes sign-up list |
| Cannot | change the home page look or Pages; open Ops, audit log, the Claude key, the logins list or the Notes list | see customers, orders, invoices, coupons, reviews, bank or tax details; change prices, stock, GST or discounts; open Privacy, Growth, web orders; restore a backup |

**Rules the server applies**
- Each save of the shop data keeps only that login's own parts (`dbForWrite`). A save by the admin cannot change a price, a customer or GST, and a save by the owner cannot change the home page, the Pages or the look and technical settings. Anything outside a login's part is quietly ignored.
- What each login is shown when it loads the shop data (`dbForRead`): the admin gets empty lists for customers, orders, invoices, coupons, reviews, drafts and alerts and none of the bank or tax settings.
- Wrong-address sign-ins (an owner's name at `/admin`, the admin password at `/owner`) get the same plain "Wrong password or code." and count towards the same lock-out. Five wrong tries from one address lock sign-in for 15 minutes.
- The routes the owner app calls (`/admin/api/...`) and the routes under `/api` (orders, chats, carts, the reply writer, test chat) are checked per login. The old master `ADMIN_TOKEN` keeps working for the server's own tools.
- **2-step sign-in is per person.** Changing the admin's password does not sign the owner out (and the other way round).
- The activity log shows who did what, for example `[owner:anitha] save` or `[admin] save`, and records every refused try as `forbidden`.

**Setting it up (once).**
1. The account you created at first-time setup is the **Admin**. Sign in at `/admin`.
2. Settings → **Owner login** → type her name and a strong password (12+ characters) → **Create the owner login**. Up to 5 owner logins can exist.
3. Give her the address `/owner`, her name and her password. She can switch on 2-step in Settings.
4. To reset her password or remove her login: the same Settings card.

**Moving from the old single login.** Nothing is lost: the existing main account becomes the Admin, and old helper logins become owner logins with the same names and passwords. Existing browser sessions end when the server restarts.

**One deliberate exception.** The weekly-report email setup (and the Instagram/WhatsApp previews on the Dashboard) stay open to the owner, because they are her own business report and status.

Tests: `wa-assistant/tests/run.mjs` (the "logins", "roles · data" and "roles · 2-step" checks: wrong address, per-login screens and routes, what the admin is shown, what each save may change, the `/api` split, per-person 2-step, audit labels), `tests/admin-app-test.cjs` (admin lands on Home Page, creates the owner login, owner signs in at `/owner`), `tests/ui2-test.cjs` and `tests/dpdp2-test.cjs` (both logins in a real browser). Not tested: a real phone, the migration on the live server.
