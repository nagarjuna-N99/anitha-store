# 18 · Growth, insights and the weekly email (8 Nov 2026)

Owner app → **📈 Growth**. Everything on it is read live when you open it (or press **Refresh**), and every suggestion is made from those figures at that moment.

## What is measured
- **Instagram** (needs Instagram connected, with the token permission `instagram_manage_insights`): followers and the change, views, accounts reached, likes, comments, saves, shares, profile visits, engagement rate, your best posts, and which kind of post (Reel, carousel, photo) reaches most. Each number is compared with the same number of days before. Follower growth is counted from the day you connected (the app notes the count once a day).
- **Website** (counted by the public site itself, anonymously): visitors (once a day each), saree views, WhatsApp taps, add-to-cart, checkouts opened, most viewed sarees, where visitors came from (Instagram, WhatsApp, Google, direct), phone or computer. No cookies; no name, phone, address or IP is stored; nothing is sent if the visitor's browser says "Do Not Track"; the Privacy page says so. To see Instagram visits, set your bio link to `your-site/?utm_source=instagram` and use `?utm_source=whatsapp` in status links.
- **Sales**: orders, revenue, average order, new and returning buyers, best categories, from the orders in your shop data. Orders placed on the public website are not connected to the owner app yet (stage 2), so for now this counts orders you add or import (for example paid WhatsApp orders).

## "What to do this week"
Rules look at the real numbers and only speak when they call for it, for example: fewer than 3 posts a week; reach below 30% of followers; engagement under 3%; few saves; Reels reaching more than other posts; followers not growing; many profile visits but few website visits from Instagram; few website visitors; visitors who do not open a saree; sarees viewed but no WhatsApp taps; interest but no orders; checkouts that do not become orders; no orders; few returning buyers; sarees nobody viewed; your most viewed saree. Each suggestion shows **Because:** (the figure), numbered **steps**, and a **goal**. If there is not enough data it says so (for example website counting has run only 1 day).
Press **✓ I did this** on a step: the number at that moment is saved, and the next report says whether it moved ("Did the last changes work?"). No report can promise views or sales; this measures whether your own changes helped.

## The three reports (all automatic, each can be switched off)
| Report | When | Covers | On by default |
|---|---|---|---|
| Weekly growth report | Mondays from 8:00 IST | the 7 complete days before, against the 7 before | yes |
| Monthly business review | the 1st of the month from 8:30 IST | the month that just ended, against the month before | yes |
| Daily brief | every evening from 9:00 IST | yesterday, against the day before | no |
The **monthly review** adds: sales in detail (categories and their share, best sellers, week by week orders, revenue and website visitors, best day, sarees per order, coupon orders), stock and customers (sold out, almost sold out, never viewed, past buyers silent for 60+ days), and a **30-day plan in four weeks**: week 1 fix the biggest leaks, week 2 build the weekly habit (posting rhythm sized to how much you post now), week 3 turn interest into orders, week 4 measure and repeat. The plan is made from the live numbers, like every other suggestion. In the Growth tab choose **Last month (full review)** to read the same thing on screen, and use **Preview** / **Send it now** on any report.

## Weekly email
Growth → **Weekly report by email**. Fill in a mail server (Gmail, Zoho or Outlook buttons fill the host and port), your email, an **App Password** (Gmail: Google account → Security → 2-Step Verification → App passwords), and where to send it. **Save & check** tests the login with the mail server before saving; the password is stored encrypted and never shown. Then **Send a test email**, **Preview this week's report**, or **Send this week's report now**. The server sends the weekly report automatically every **Monday from 8:00 IST**, once a week (the week is claimed before sending, so it can never go twice; a failed send is tried again after an hour, up to 3 times). The email has: a short honest summary (written by Claude if the key is added, otherwise plain facts), the numbers compared with the week before, the steps with reasons, whether last week's steps worked, and your best posts.

## Reminder to connect Instagram
Until Instagram is connected, a banner on the **Dashboard** and the **Growth** tab says what is missing, with **How to connect**, **Remind me in 3 days** and **Next week**. The weekly email also lists "Connect Instagram" as the first step.

## Setting Instagram up for insights
Same steps as posting (HOW-IT-WORKS/17). The token must have `instagram_basic`, `instagram_content_publish` and **`instagram_manage_insights`**, and the account must be a Business or Creator account. If a number is missing the Growth tab says which one and why.

Code: `wa-assistant/src/analytics.mjs` (counting), `report.mjs` (numbers, suggestions, email), `mailer.mjs` (sending), insights in `instagram.mjs`, schedule in `server.mjs`.
