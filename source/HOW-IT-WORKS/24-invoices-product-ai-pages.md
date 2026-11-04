# 24 · Invoices search, one-click product writing, and editable Care / Journal (3 Nov 2026; the Atelier page was removed on 5 Nov 2026)

## 1. Invoices: find them any way you like
Owner app → **Invoices**. New controls above the table:
- **Search:** name, phone, invoice number or order number.
- **Customer** (one person at a time), **Year**, **Month**, and **From date / To date**.
- **Sort by:** newest or oldest date, amount high to low or low to high, customer A to Z or Z to A, invoice number.
- **Group by:** customer, month or year. Each group shows how many invoices and how much money.
- A line shows **how many invoices match, their total and the average**. **Clear** puts everything back.
Choosing a year or month clears the dates, and choosing dates clears the year and month, so the two never fight.

## 2. Product form: AI is now one click
- **✨ Auto-fill everything** is the one button. In one click it: reads the photo (if Claude is connected), picks colours and fabric, sets the **SKU**, makes up a name if it is empty, and writes the **description, tags and SEO** in the language you choose.
- If Claude is **not connected** (no key in Settings → Claude AI key), it still works: it uses the built-in writer and tells you so, with a link to add the key. Before, the "Write with Claude" button just showed an error that pointed to the wrong place.
- **Choosing a category now fills things by itself:** SKU (for example `AP-PHT-001` for Paithani; it was `AP-ORG-001` before, because it never followed the category), description, tags, SEO and fabric.
- **Your own words are safe:** a description, tags, SEO text or SKU that you typed is never replaced by choosing a category. (Auto-fill everything is a request, so it rewrites.)
- A product you are **editing** keeps its SKU. Only new products get automatic SKUs.
- The single-part buttons (Write with Claude, Read photo, Translate, Regenerate…) are still there, folded under **Fine-tune one part only**.

## 3. Pages: Care guide and Journal are yours to edit (The Atelier page no longer exists)
Owner app → **📰 Pages** (also in the new look). Changes show on the website within seconds.
- **Saree care guide:** add, edit, reorder, hide or remove sections (tabs). Each has a photo and any number of tips (icon, title, advice).
- **The Journal:** add, edit, hide or remove stories: title, date, short summary, **full story** and photo. A card with a full story gets a working **Read Story →** that opens it in a window. Newest first.
- **The Atelier** was removed on 5 Nov 2026 (page, menu link and address `/the-atelier/`). Anyone opening the old address lands on the home page.
- **Photos:** paste a link or press **⬆ Upload photo** to use your own (made smaller automatically). Only web links and uploaded photos are accepted.
- **Put the original back** resets one page to the text we wrote.
- **Honest note:** the starting text is real, plain advice about silk, tussar, cotton and storage, and three short stories. The starting photos are **sample photos from a stock site**. I do not have photos of your sarees: please upload yours.

### Add your own pages, and hide any page (4 Nov 2026)
- **➕ Add a new page** at the top of **Pages**: give it a name and choose a kind: **Story page** (a banner, a photo, a heading, paragraphs and numbers), **Stories page** (like The Journal), **Tips page** (like the Care guide with tabs) or a **Simple text page**. It is created **hidden**; fill it in, then tick **Show on the website**.
- **Every page has a "Show on the website" switch**, in its title bar: Saree Care, Journal and each new page. Untick it and the page and its menu link disappear and nobody can open it (they are sent Home). Your text and photos are kept. Inside a page, each tab, story and section has its own Show switch too.
- A new page gets a link in the website menu (header and phone menu) named by its **Menu label**. Untick **Show a link in the menu** to keep the page but hide only the link (the page still opens if someone has its address).
- Visible new pages can also be chosen as the link of a home-page banner (Home Page tab).
- **Delete this page** removes it for good.
- **Hidden means private:** hidden pages, stories and tabs are **not sent to the public website at all** (not just hidden on screen), so nobody can read an unfinished page in the website data.

## 4. Hide the left menu
A round **‹** button sits at the top edge of the left menu (both the classic app and the new look). Press it to close the menu and use the whole screen; the button turns into **☰** at the top-left to open it again. Your choice is remembered in this browser. On a phone the menu already folds away, so the button is not shown.

## 5. All of this works in the new look (/admin2) too
`/admin2` is the same app, so invoices, the product form, the Pages tab and the menu button are all there, and a browser test checks each one in the new look against the same server (including that pages written in `/admin2` reach the website data and show in the classic app).

## What was tested
`tests/pages-ai-invoices-test.cjs` (38 checks), and the same features again in `/admin2` inside `tests/ui2-test.cjs`, covers every filter, sort and grouping of invoices; category → SKU/description/tags/SEO; owner text kept; one click with and without Claude (two calls, one click); and every editing action on Care and Journal showing on the website pages. Server: the public website data now carries the pages.

## Not tested
Real Claude writing (the key is not set in the test), uploading a real photo from a phone, and the pages on the live site with many stories.

## For the developer
`anitha-store.html`: `renderInvoices` and `invFiltered`; `pfAutoAll`, `pfCategoryChanged`, `pfSkuFor`; `defaultPages`, `ensurePages`, `renderPublicPages`, `openJournal`, `renderPagesAdmin` and `pg*` helpers. Data: `db.pages` (`care`, `journal`), sent to the website by `publicView` in `wa-assistant/src/shopdata.mjs`.
