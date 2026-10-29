# Anitha Pemmasani: handloom saree store (demo website)

**Live demo:** https://nagarjuna-n99.github.io/anitha-store/

This is the **customers' website only**. It has no admin screens and no PIN: the owner manages the shop in a separate, password-protected app on a server (`/admin`), so nobody can reach it from this page.

- This GitHub copy is a **demo**: it shows sample sarees and saves everything only in the visitor's own browser.
- Orders, WhatsApp, payments, Instagram posting and the AI helpers run on the server and are not connected here.
- Marked *noindex* so Google does not list this demo.

## Owner app (admin) on a server
GitHub Pages can only show this static website. The **owner app** needs a server (login, shop data, Instagram, AI). The folder `server/` and `render.yaml` let you deploy it from this repository:
1. Sign in at render.com with GitHub → **New → Blueprint** → choose this repository → **Apply**.
2. After the first deploy copy the service address (for example `https://anitha-store-server.onrender.com`) into the `PUBLIC_URL` setting, and copy the generated `ADMIN_SETUP_TOKEN` from **Environment**.
3. Open `https://<your-service>.onrender.com/admin`, create the owner password with that token, then turn on 2-step sign-in.
No password, token or key is stored in this repository.
