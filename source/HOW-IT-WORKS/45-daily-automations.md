# 45 · Daily automations: morning summary, stock alerts, automatic backup (6 Nov 2026)

Code: `wa-assistant/src/automation.mjs`, run from the server's own timer (checked every 5 minutes), routes `/admin/api/automation*` and `/admin/api/summary-now`. State in `automation.json`; backups in `backups/` in the data folder. Nothing here ever messages a customer.

## 1. Morning summary (Owner switches it on or off: Orders → "Website orders: approval and alerts")
From **8:30 IST** each day, one short message to the owner's WhatsApp (and email): website orders waiting for her YES, orders to post (placed, confirmed or packed, no tracking yet), sarees running low, sarees sold out, chats waiting for her reply. **Nothing to report = no message.** The day is marked before sending, so it is never sent twice in a day. "Send me today's summary now" sends it at any hour. Outside the 24-hour WhatsApp window the approved template `owner_daily_summary` carries it on one line (create it in Meta as Utility; name changeable with `OWNER_SUMMARY_TEMPLATE`).

## 2. Stock alerts (same card)
Checked every few minutes. A saree that reaches **1 left** or **sells out** sends one message (several changes at the same time are grouped). The same change is never announced twice; after a restock it can alert again. The first check only remembers the current levels, so switching it on never floods the owner. Template `owner_stock_alert` (`OWNER_STOCK_TEMPLATE`). The website already shows sold-out sarees as sold out and keeps "tell me when it is back".

## 3. Automatic encrypted backup (Admin → Settings → Security → "Automatic backup")
- The admin sets a **backup password** (12+ characters). It is stored encrypted on the server and is never shown again; **it cannot be recovered**, so write it down.
- From **3:10 IST** each night the shop data (products, customers, orders, settings) is locked with that password (the same lock as the manual backup: the app's **Restore backup** opens it) and saved as `backup-YYYY-MM-DD.json`. The newest **14** are kept. "Back up now" and "Download" are on the same card; downloads stay locked.
- **Be honest about what it is:** these copies are on the **same server disk**. If the server is lost, so are they. Keep your own copy (download one now and then) and a Lightsail snapshot.
- Not included: chat logs, saved keys and website orders still waiting for approval.
- Ops shows "Encrypted backup" green only while the newest copy is at most 2 days old.

## Safety
The summary, stock and backup helpers use the same sender as everything else, write nothing about customers except what the owner already sees, and every change (password set, download, summary now) is in the activity log without any password.
