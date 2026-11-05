# 40 · The back end sorted by type, and what every page and setting does (12 Nov 2026)

The left menu of **both** the Owner app (`/owner`) and the Admin app (`/admin`) is sorted into headed groups, and every page starts with a one-line “what this page does” note. Source: `src/js/425-admin-menu-groups.js` (one list drives the computer menu and the phone menu). Who may open a page is still decided by the **server** (`roles.mjs`); a page a login may not open is left out and an empty group heading disappears. Pages that both logins share say different things to each (marked Owner / Admin).

## Overview
*The state of the shop at a glance.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `dashboard` | ✔ | – | Today’s numbers: sales, orders waiting, stock running low and recent activity. Nothing to set here. |

## Sarees & prices
*What you sell and for how much.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `products` | ✔ | – | Add, edit, hide or delete sarees and accessories: photos, price, stock, fabric, colours and description. A change shows on the website at once. |
| `categories` | ✔ | – | The groups sarees and accessories are sorted into on the website. Add or delete a category, and switch Accessories on or off on the website. |
| `bundles` | ✔ | – | Sets of products sold together at one price (for example a saree with a blouse). Customers see them on the website. |
| `coupons` | ✔ | – | Discount codes customers type at checkout. You choose the amount, the dates and how many times a code can be used. |
| `studio` | ✔ | – | Photo tools for the owner: remove a background, add the shop mark and crop pictures for the website and for Instagram posts. The result is saved to a product or to Saved Drafts. |
| `drafts` | ✔ | – | Products you started but have not published. Finish them when the photos and details are ready, then publish. |

## Orders & customers
*Everything that happens after someone buys.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `orders` | ✔ | – | Every order: confirm, pack, ship and add the tracking number. Customers get their updates by WhatsApp. Customers cannot cancel an order. |
| `invoices` | ✔ | – | Tax invoices and packing slips for orders. Print them or send them. The numbering and GST rate come from Settings. |
| `delivery` | ✔ | – | Delivery areas and charges, free-delivery rules, gift wrapping and the tracking messages customers receive. |
| `customers` | ✔ | – | The people who have bought or signed up, and what they agreed to. Opening this list is written to the activity log. |
| `reviews` | ✔ | – | Reviews customers wrote. Approve or hide them and reply. Only approved reviews show on the website. |
| `alerts` | ✔ | – | People who asked to be told when a sold-out or similar saree is back. They are told once it is back in stock. |

## Money & reports
*How the shop is doing.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `statements` | ✔ | – | Sales, GST and profit summaries for a period, ready to give your accountant. |
| `growth` | ✔ | – | Website visits, Instagram numbers and simple suggestions for the week. Also the weekly report email. |

## Marketing & messages
*Talking to customers and getting new ones.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `whatsapp` | ✔ | ✔ | **Owner:** Your WhatsApp assistant’s conversations: read them, take over a chat and answer yourself.<br>**Admin:** Connect and test the WhatsApp assistant: the number, the greeting, the chat button and the test chat. |
| `promo` | – | ✔ | WhatsApp promotions: counts of regular and promotion messages, what they cost, other running costs and total expenses, the message templates (with AI wording help) and the promotions sent to customers who said yes to offers. |
| `social` | ✔ | ✔ | Plan and post pictures and short videos to Instagram. You see a preview and approve each post. Nothing is posted without you. |

## Website look
*How the website looks and what its pages say.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `home` | – | ✔ | The look of the home page: the big banner, category tiles, the story chapters and their photos, quote, notes and the website colours. |
| `pages` | – | ✔ | The words on the other pages: Saree Care, the Journal, FAQs and extra pages you add. |

## Privacy & legal
*Customers’ rights and your legal duties.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `privacy` | ✔ | – | Customers’ privacy requests (see my data, correct it, erase it), the clean-up of old data and what you must tell customers. The law gives deadlines, so this page counts them. |

## AI, health & settings
*The helpers, the health of the server, and the settings.*

| Page | Owner | Admin | What it does |
|---|---|---|---|
| `ai` | ✔ | ✔ | Switch each AI helper on or off. Helpers only write drafts; nothing reaches a customer until you approve it. |
| `ops` | – | ✔ | Is the server healthy? Red and yellow lines say what needs attention, the repair assistant explains them in plain words, and safe repairs run by themselves. |
| `logs` | – | ✔ | A record of who changed what and when. Use it to check that nothing happened that should not have. |
| `settings` | ✔ | ✔ | **Owner:** Your business details: name, GST, bank, invoice numbering and the policies shown to customers. Plus your own password and the backup.<br>**Admin:** The technical settings: website address, search description, customer sign-in service and AI service. Plus passwords, 2-step sign-in, the Claude key and the owner login. |

## Settings, split by login
| Card | Who changes it | Field | What it does |
|---|---|---|---|
| Business Information | Owner | Business name, GST number, address, phone, email | Printed on invoices and packing slips; phone and email are shown to customers. |
| Bank Details | Owner | Bank, account number, IFSC | Printed on invoices so a customer can pay by transfer. |
| Invoice Settings | Owner | Prefix, GST rate, template | Invoice numbering (new invoices only), the GST percentage already inside prices, the look of printed invoices. |
| Policies shown to customers | Owner | Dispatch time, usual saree length, return window, grievance officer | Promises written in the Terms, product pages and Privacy Policy. Keep them true. |
| Customer sign-in | Admin | WhatsApp login service address | Where customers' WhatsApp sign-in codes come from. Empty = demo mode (code on screen, not safe for real customers). |
| SEO & Search | Admin | Website address, home-page description | Sitemap, links in emails and what search engines show. |
| AI descriptions | Admin | Own AI service address | Optional own writing service; empty = built-in writer or Claude. |
| My sign-in & backup | Owner | Password, encrypted backup | Change your own password; download an encrypted copy of the whole shop. |
| Security, Claude key, owner login, sign-in activity | Admin | Password, 2-step, Claude key, owner login | Keeps the server safe and switches the AI helpers on. |
Every field shows a one-line explanation under it. **Saving only changes the fields on your own page**: the owner's save never touches the admin's settings and the other way round (the server also refuses a setting that belongs to the other login).

## Settings that live inside other pages
- **Categories →** *Show Accessories on the website* (owner): hides the Accessories tab, tile, FAQ line and “Complete the look”; nothing is deleted.
- **Home Page →** website colours, story chapters and their photos (admin).
- **WhatsApp promotions →** prices per message type, running costs, daily limit (admin).
- **AI Helper →** one switch per helper (both).
- **Ops →** auto-repair switch (admin).
