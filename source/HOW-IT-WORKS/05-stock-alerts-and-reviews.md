# 05 · Stock alerts and reviews

**Back-in-stock alerts:** on a sold-out saree the button says "🔔 Notify me". It needs a signed-in customer and a ticked, separate consent. When stock goes above 0 (product edit, or a cancelled order returning stock) each waiting customer gets **one** queued message; customers who withdrew consent or deleted their account are skipped; duplicates are impossible. Until the assistant/WhatsApp service is connected the messages stay in the **Stock Alerts → queue**; with a service address set they are sent via `{url}/messages/send`.

**Reviews:** only customers with a **delivered** order containing the saree can review (shown as "Verified purchase"). Rating, text (≥10 characters), up to 3 photos, display name, and a consent box for public display. New reviews wait for approval (switch "publish automatically" in Reviews). Ratings shown in the shop come only from published reviews; one review per customer per saree. Published reviews appear on the product page (sort, photos-only, lightbox), in the product's structured data, and in the SEO pages; the owner can reply.

**Similar-saree alerts** (for one-of-a-kind sarees that sold out) work alongside these: see `14-storefront-extras.md`.
