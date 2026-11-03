# 21 · Privacy round 2: what changed (3 Nov 2026), in plain words

This is the second part of the privacy work. It is not legal advice. Please ask a lawyer or CA to check it. The main duties of the law start around May 2027.

## 1. Orders from the website now reach you
- Before: when a customer ordered on the public website, the order stayed only inside that customer's own phone. You never saw it.
- Now: the website sends each order to your server. In the owner app, **Orders → "New from the website"** shows it with the items, the address, the gift or note, and the proof of what the customer agreed to.
- Nobody is charged on the website. You press **Accept**, the order joins your normal Orders list (payment "pending"), and you message the customer on WhatsApp to confirm and agree the payment. Press **Not possible** (and give a reason) if you cannot do it.
- The server warns you if a price changed, an item is out of stock or no longer exists.
- If the shop cannot be reached at that moment, the website keeps the order and tries again by itself.

## 2. Check who is asking before showing or erasing data
- In **Privacy → Find a customer**, "Their data" and "Erase" are switched off until you press **Check who is asking first** and say how you checked: they signed in, you called them back, details matched, they came to the shop, or you sent a code on WhatsApp and they read it back.
- The server refuses to give out or erase data without this check, so it cannot be skipped. The check lasts a short time and is written in the log.

## 3. Requests that did not come from the website
- **Privacy → Log a request that came another way**: use it for a phone call, WhatsApp, Instagram, an email or someone at the shop. It gets a number and the 30-day reply date, like any other request.
- The WhatsApp assistant also notices when a customer writes something like "delete my data" and logs a request for you. You still decide what to do.

## 4. Asking the other companies
On an "Erase my data" request there is now a tick-list: WhatsApp (Meta), Razorpay, couriers, Instagram, your email provider, and the AI service. Each has a one-line hint about what to ask. Tick each one when you have done it.

## 5. Erased people stay erased
- When you erase someone, the server remembers them only as a scrambled code (not their number).
- If you ever restore an **old backup**, the app removes those people again, and tells you how many.
- The Privacy page shows how many people are on this list.
- Encrypted backups now carry the date they were made, and the checklist reminds you when your last backup is old.

## 6. Old privacy notices are kept
**Privacy → Privacy notices customers have seen** keeps every version, in English, Telugu and Hindi, with how many customers accepted each. When the notice changes, a new version is added; old ones are never edited. This lets you show what a customer was told on the day they agreed.

## 7. Email and late-request reminders
- If email is not set up, the Dashboard shows a red box, because without it you are not told when a customer sends a request.
- The Dashboard also warns about requests that are late or due within 5 days. The daily email digest carries the same warning.

## 8. Helpers (team logins)
- **Settings → Team logins**: add a helper with a name and a password (12+ characters). They sign in on the same page, typing their name.
- Helpers can work on products and orders. They cannot open Privacy, backups, email, the AI key or the team list. The server enforces this, not just the screen.
- Honest limit: a helper's app still loads the shop's data (customers and orders), because the app works on one shared copy. So only give logins to people you trust.
- Remove a helper or change their password any time; they are signed out at once.

## 9. More is erased now
Erasing a customer also removes their review photos, saved address history, gift details and their phone number from the server's log lines.

## What I did NOT test
- A real WhatsApp (the code message and the "delete my data" detection are tested only with a pretend WhatsApp).
- A real mailbox, Render, or a real breach report.
- The website's customer sign-in still lives in each visitor's browser. Orders reach you; their account page does not.
- Backups already downloaded earlier are not changed; the erased list is applied only when you restore one.

## Tests
Server: 499 checks. Browser: new `tests/dpdp2-test.cjs` (22 checks): website order to the owner, accept and decline, retry queue, check-who-is-asking, logged phone request, provider ticks, erased count, notice archive, Dashboard reminder, helper login.

Code: `shared/erase-core.js` (-> `wa-assistant/src/erase.mjs`), `wa-assistant/src/weborders.mjs`, `privacy.mjs`, `adminauth.mjs`, `adminroutes.mjs`, `server.mjs`, and `anitha-store.html`.
