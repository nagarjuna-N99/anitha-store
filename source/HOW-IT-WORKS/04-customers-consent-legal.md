# 04 · Customers, consent and legal text

**Login:** the customer enters a WhatsApp number and gets a 6-digit code.
- *Demo mode* (no login service set): the code is shown on screen. **Not secure.**
- *Real mode:* `Settings → login service address (https)`; the store calls `POST {url}/otp/send {phone, channel}` and `POST {url}/otp/verify {phone, code}` → `{ok, token}`. The token is kept in the session and later used to prove who is syncing a cart.

**Consents** (all optional except Terms; never pre-ticked; every change is a new dated row in `consentLog` with the policy version and where it was given): `terms`, `orderUpdates`, `marketing` (offers), `stockAlert` (per saree), `cartReminder`, `reviewPublic` (per review). Withdraw any time in My Account or by replying STOP in WhatsApp.

**Terms & Privacy:** 12 Terms sections and 10 Privacy sections, versioned (`LEGAL_VERSION`, now **1.5**). History: 1.0 base · 1.1 stock alerts + public reviews · 1.2 WhatsApp chats / AI assistant · 1.3 cart reminders · 1.4 orders and payment links in WhatsApp · 1.5 no cancellation (address correction until shipped), gifts and recipient data, saved addresses. A customer who accepted an older version is asked again at checkout. The text is a template; have a lawyer review it before launch.
