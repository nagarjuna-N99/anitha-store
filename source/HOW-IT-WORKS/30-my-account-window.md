# 30 · The customer's My Account window (4 Nov 2026)

After sign-in the My Account window is a tidy list:
- **Header:** initials circle, name, "Signed in with WhatsApp", and the phone number with the middle hidden.
- **Personal details** (open): name, email, address, city, state, pincode, Save profile.
- **WhatsApp messages** (open): tick boxes for Order updates and Offers & new arrivals (and Cart reminders when the assistant is connected). A tick applies at once.
- **My orders:** count and last order date; open it for the list and Track links.
- **Saved addresses:** the address book, with Add an address.
- **Alerts and reviews:** only appears when the customer has back-in-stock alerts or reviews.
- **Privacy and data:** the rights requests.
- Footer: Terms, Privacy policy, Privacy notice, Erase my account, Sign out.
A section the customer opens stays open while they work. Nothing was removed; the sections are only folded.

Developer note: the classes are `ac4-*`. Do not reuse `acc-*`: the admin accordion uses `.acc-body{display:none}`.
Test: `tests/shop-test.cjs`. Not tested on a real phone.
