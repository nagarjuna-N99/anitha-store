# 20 · Privacy and the DPDP Act (10 Nov 2026)

India's **Digital Personal Data Protection Act, 2023** and the **DPDP Rules, 2025** (notified 13–14 Nov 2025) apply to any shop that keeps customers' names, phone numbers and addresses. The main duties (notice, consent, safeguards, breach reporting, rights) start about **13–14 May 2027**; the consent-manager rules start 13 Nov 2026. This file says what the app does about it. It is **not legal advice**: please have a lawyer or your CA read the Act and Rules, because the official text could not be opened when this was written (the list was built from published summaries and general knowledge). Penalties can be large (up to ₹250 crore for weak security safeguards, as recalled from the Act's schedule: verify).

## What the app does now
| Duty | What was built | Where |
|---|---|---|
| **Notice**, itemised, in plain words, in English, Telugu and Hindi | Six items (what we collect, why, who gets it, how long we keep it, your rights, complaints) + the grievance contact + the Data Protection Board + "18 or older". Shown at sign-in (link), at checkout (link beside the consent), from the footer, in My Account and as an "updated notice" screen. The full Privacy Policy page is updated (version **2.0**, `LEGAL_VERSION`; notice version `NOTICE_VERSION` = 2.0). | `NOTICE`, `openNotice()` |
| **Consent**: clear, separate, withdrawable as easily as given, recorded | Order updates, offers and cart reminders are separate opt-ins (never pre-ticked); the terms box is separate; withdrawal in My Account or by replying STOP; every grant/withdrawal is a dated row with the policy version. New rows: `age18` and `notice`. | `recordConsent()`, `consentLog` |
| **Existing customers** (consent given before) | On their next sign-in or when they open My Account they see the updated notice once, with their current message choices and the 18+ box; accepting records the notice version. | `maybeUpdatedNotice()` |
| **Children** | "I am 18 or older" is required at sign-in and at checkout and recorded; the notice and policy say the shop is for adults; an account found to belong to a minor is erased. | `auth-age`, `chk-age` |
| **Rights**: see, correct, erase, withdraw, nominate, complain | **My Account → Your privacy rights**: download my data (JSON), see what you hold, nominate someone, complain/ask, erase my account; and a **"Your privacy rights" form** in the footer for people who cannot sign in. Each request gets a number (`PR-0001`) and a **30-day** reply date and reaches the owner (and an email alert if email is set up). | `openRights()`, `POST /public/rights` |
| **Owner tools** | **🛡️ Privacy tab**: the checklist, the requests (answer with a note, or refuse with a reason), **find a customer** by phone (download their data including what the server holds, or **erase**), the breach register, who handles the data, the clean-up. | `renderPrivacyAdmin()` |
| **Erase** | Removes the profile, reviews, alerts and the WhatsApp chat/cart on the server; orders without an invoice are fully anonymised; orders **with an invoice** inside 6 years keep only name and address (phone/email removed) with a "keep until" date, then are anonymised automatically when you press the button / run the clean-up; the consent proof stays without the phone number; the do-not-message entry stays so a STOP is never undone. | `eraseCustomerData()`, `Privacy.eraseFromStore()` |
| **Keep only as long as needed** | Daily clean-up on the server: WhatsApp chats older than `CHAT_RETENTION_DAYS` (90), carts older than `CART_RETENTION_DAYS` (30), order contact details older than `ORDER_RETENTION_YEARS` (6). Test chats are left alone. | `Privacy.sweepStore()`, runs once a day |
| **Breach** | Breach register with the **72-hour** Board deadline, a plain-words notice for customers, a ready report for the Board, and timestamps for "customers told", "Board told", steps taken. | Privacy tab, `breaches.json` |
| **Safeguards** | Customer one-time-code login; owner password (scrypt), 2-step sign-in (a red banner stays until it is on), lockout, CSRF checks; secrets stored encrypted; **encrypted backups** (AES-256-GCM, password you choose; an unlocked backup needs an explicit warning); opening the Customers list, downloading a backup, exporting or erasing a customer are written to the sign-in activity log (kept without limit). | Settings → Security & backup |
| **Who handles the data** | A list (WhatsApp/Meta, Instagram, Razorpay, Anthropic AI helpers, hosting, couriers/India Post, your email provider). Tick each once you have accepted its data terms; they are named in the notice. AI helpers get message/review text only, never phone numbers. | Privacy tab |
| **Contact** | The grievance officer (name, email, phone) is in the policy, the notice and the footer; set the name in Settings. | Settings |

## Your routine as the owner
1. **A request arrives** (email alert + the Privacy tab). Reply within **30 days** (the law allows longer; do not use it).
   - *See my data*: Find the customer → "Their data" → send the file privately (WhatsApp/email to the number they gave). If they have chatted with the assistant, the file includes the server's copy.
   - *Correct*: edit the customer in Customers, tell them.
   - *Erase*: Find the customer → Erase. Tell them what was kept for tax law and when it will go.
   - *Withdraw consent*: switch the message type off in their profile (or they do it themselves); a STOP reply is already honoured.
   - *Nominate*: the nominee is saved on the profile and in the request; keep the details with the request.
   - *Complaint*: answer in writing; if you cannot resolve it they may go to the Data Protection Board of India.
   Then press **Done (add a note)** (or **Cannot do (say why)**).
2. **A breach** (lost phone, a file sent to the wrong person, a hacked account): open the Privacy tab → **Record a breach** at once. Tell the people affected without delay (copy the customer notice) and send the Board report within 72 hours (copy the Board notice). Add the steps you took, then close it.
3. **Monthly**: download an encrypted backup; read the checklist; renew the Instagram token before it expires.
4. **Yearly**: read the breach steps again (tick the box), review the list of companies, ask your lawyer whether anything in the law or the Rules changed.

## Limits you should know
- **Customer accounts on the public website are kept in each visitor's own browser** until stage 2 (website checkout connected to the server) is built. So "download my data" and "erase my account" on the site work on that device's copy and send a numbered request to you; the real erasing of what the owner app holds is done by you in the Privacy tab. The server-side chats, carts and orders are handled by the server routes.
- **Disk encryption** of the hosting machine is a host setting, not something this app can do: when you move away from Render, choose a host with an encrypted disk (or encrypted volume) and note it in the checklist.
- **GST/tax record periods**: the app uses 6 years; confirm with your CA.
- Telugu and Hindi texts should be checked by a native speaker.
- Not tested: a real WhatsApp erase on a live account, a real mailbox, a real breach report.

Code: `wa-assistant/src/privacy.mjs` (requests, breach register, server-side erase/export/clean-up), `server.mjs` (daily clean-up), `adminroutes.mjs` (routes), `anitha-store.html` (notice, rights form, Privacy tab, backup encryption). Tests: `tests/dpdp-test.cjs`, the Privacy tab checks in `tests/admin-app-test.cjs`, and the privacy block in `wa-assistant/tests/run.mjs`.
