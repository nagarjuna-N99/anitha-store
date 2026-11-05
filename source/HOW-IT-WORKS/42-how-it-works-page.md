# 42 · The "How it works" page in both logins (12 Nov 2026)

Menu: **Help → How it works** (computer and phone), in the Owner app and in the Admin app. Code: `src/js/426-how-it-works-page.js` (the text is one list, `HOW_SECTIONS`; each section says which login sees it). Nothing is fetched from the server: it is static text, so it works even when the server is slow.

Each section has: **what it does**, **how it works**, a green **Do** list and a red **Do not** list. A search box narrows the page (and opens the matches); **Open all / Close all** buttons.

| Section | Owner | Admin |
|---|---|---|
| The two logins | ✔ | ✔ |
| Products and categories | ✔ | |
| Orders: from website to parcel (YES / NO / TRACK, auto-approval) | ✔ | |
| Delivery, invoices and packing | ✔ | |
| Customers, reviews and privacy | ✔ | |
| Coupons and bundles | ✔ | |
| Image Studio and Instagram | ✔ | |
| The WhatsApp assistant | ✔ | ✔ (adds setup do / do-not lines) |
| Website look: Home Page and Pages | | ✔ |
| WhatsApp promotions, templates and costs | | ✔ |
| AI helpers | ✔ | ✔ (adds the Claude key lines) |
| Ops, repair assistant and self-heal | | ✔ |
| Security, logins and backups | | ✔ |
| Settings | ✔ | ✔ |
| Rules that never change | ✔ | ✔ |

**Keeping it true:** when a system changes, change its section in the same step (it is part of the same record rule). The text must never hold a password, key or phone number, and never promise sales or views (a test checks this).
