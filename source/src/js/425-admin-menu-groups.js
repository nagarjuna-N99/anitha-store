// ================= Owner app / Admin app: menu sorted by type, and a plain "what this page does" line for every page and setting =================
// One list below drives both the left menu (computer) and the slide-out menu (phone). Who may open a page is still decided by the server (roles.mjs);
// a page the signed-in person may not open is simply left out, and a heading with nothing left under it disappears.
const ADM_NAV = [
  { id: 'overview', label: 'Overview', hint: 'The state of the shop at a glance.', tabs: ['dashboard'] },
  { id: 'catalogue', label: 'Sarees & prices', hint: 'What you sell and for how much.', tabs: ['products', 'categories', 'bundles', 'coupons', 'studio', 'drafts'] },
  { id: 'orders', label: 'Orders & customers', hint: 'Everything that happens after someone buys.', tabs: ['orders', 'invoices', 'delivery', 'customers', 'reviews', 'alerts'] },
  { id: 'money', label: 'Money & reports', hint: 'How the shop is doing.', tabs: ['statements', 'growth'] },
  { id: 'marketing', label: 'Marketing & messages', hint: 'Talking to customers and getting new ones.', tabs: ['whatsapp', 'promo', 'social'] },
  { id: 'look', label: 'Website look', hint: 'How the website looks and what its pages say.', tabs: ['home', 'pages'] },
  { id: 'privacy', label: 'Privacy & legal', hint: 'Customers’ rights and your legal duties.', tabs: ['privacy'] },
  { id: 'tech', label: 'AI, health & settings', hint: 'The helpers, the health of the server, and the settings.', tabs: ['ai', 'ops', 'logs', 'settings'] },
];
// what each page does, in plain words. `owner` / `admin` give a different line to that login when the page is shared.
const ADM_DESC = {
  dashboard: { d: 'Today’s numbers: sales, orders waiting, stock running low and recent activity. Nothing to set here.' },
  products: { d: 'Add, edit, hide or delete sarees and accessories: photos, price, stock, fabric, colours and description. A change shows on the website at once.' },
  categories: { d: 'The groups sarees and accessories are sorted into on the website. Add or delete a category, and switch Accessories on or off on the website.' },
  bundles: { d: 'Sets of products sold together at one price (for example a saree with a blouse). Customers see them on the website.' },
  coupons: { d: 'Discount codes customers type at checkout. You choose the amount, the dates and how many times a code can be used.' },
  studio: { owner: 'Make a clean product photo: remove the background, add the shop mark, crop for Instagram. The result is saved to a product or to Saved Drafts.', admin: 'Photo tools: background, shop mark and crops. Used for the website look and for posts.', d: 'Make clean product photos: background, shop mark and crops.' },
  drafts: { d: 'Products you started but have not published. Finish them when the photos and details are ready, then publish.' },
  orders: { d: 'Every order: confirm, pack, ship and add the tracking number. Customers get their updates by WhatsApp. Customers cannot cancel an order.' },
  invoices: { d: 'Tax invoices and packing slips for orders. Print them or send them. The numbering and GST rate come from Settings.' },
  delivery: { d: 'Delivery areas and charges, free-delivery rules, gift wrapping and the tracking messages customers receive.' },
  customers: { d: 'The people who have bought or signed up, and what they agreed to. Opening this list is written to the activity log.' },
  reviews: { d: 'Reviews customers wrote. Approve or hide them and reply. Only approved reviews show on the website.' },
  alerts: { d: 'People who asked to be told when a sold-out or similar saree is back. They are told once it is back in stock.' },
  statements: { d: 'Sales, GST and profit summaries for a period, ready to give your accountant.' },
  growth: { d: 'Website visits, Instagram numbers and simple suggestions for the week. Also the weekly report email.' },
  whatsapp: { owner: 'Your WhatsApp assistant’s conversations: read them, take over a chat and answer yourself.', admin: 'Connect and test the WhatsApp assistant: the number, the greeting, the chat button and the test chat.', d: 'The WhatsApp assistant.' },
  promo: { d: 'WhatsApp promotions: counts of regular and promotion messages, what they cost, other running costs and total expenses, the message templates (with AI wording help) and the promotions sent to customers who said yes to offers.' },
  social: { d: 'Plan and post pictures and short videos to Instagram. You see a preview and approve each post. Nothing is posted without you.' },
  home: { d: 'The look of the home page: the big banner, category tiles, the story chapters and their photos, quote, notes and the website colours.' },
  pages: { d: 'The words on the other pages: Saree Care, the Journal, FAQs and extra pages you add.' },
  privacy: { d: 'Customers’ privacy requests (see my data, correct it, erase it), the clean-up of old data and what you must tell customers. The law gives deadlines, so this page counts them.' },
  ai: { d: 'Switch each AI helper on or off. Helpers only write drafts; nothing reaches a customer until you approve it.' },
  ops: { d: 'Is the server healthy? Red and yellow lines say what needs attention, the repair assistant explains them in plain words, and safe repairs run by themselves.' },
  logs: { d: 'A record of who changed what and when. Use it to check that nothing happened that should not have.' },
  settings: { owner: 'Your business details: name, GST, bank, invoice numbering and the policies shown to customers. Plus your own password and the backup.', admin: 'The technical settings: website address, search description, customer sign-in service and AI service. Plus passwords, 2-step sign-in, the Claude key and the owner login.', d: 'Settings.' },
};
const admDescOf = t => { const x = ADM_DESC[t]; if (!x) return ''; const role = (typeof ADM !== 'undefined' && ADM.role) || (typeof ADM_AS !== 'undefined' ? ADM_AS : ''); return x[role] || x.d || ''; };
function admShowDesc(tab) { const e = document.getElementById('adminPageDesc'); if (!e) return; const t = admDescOf(tab); e.textContent = t; e.style.display = t ? '' : 'none'; }
// puts the existing menu entries into the groups (keeps every click handler, count badge and icon) and adds a heading above each group
function admGroupNav() {
  const build = (list, mobile) => {
    if (!list) return; const items = {}; [...list.children].forEach(li => { if (li.dataset && li.dataset.tab) items[li.dataset.tab] = li; });
    list.querySelectorAll('.nav-group').forEach(n => n.remove()); const shown = li => li.style.display !== 'none';
    ADM_NAV.forEach(g => {
      const lis = g.tabs.map(t => items[t]).filter(Boolean), vis = lis.filter(shown);
      if (vis.length) { const h = document.createElement('li'); h.className = 'nav-group'; h.setAttribute('role', 'presentation'); h.title = g.hint; h.textContent = g.label; list.appendChild(h); }
      lis.forEach(li => list.appendChild(li));
    });
    Object.keys(items).forEach(k => { if (!ADM_NAV.some(g => g.tabs.includes(k))) list.appendChild(items[k]); });   // a page that is in no group stays reachable, at the end
  };
  build(document.querySelector('#adminSidebarDesktop .admin-nav')); build(document.querySelector('.admin-mobile-nav ul'), true);
}
// ---- Settings page: one short sentence under every field ----
const ADM_FIELD_HELP = {
  's-name': 'The shop name on invoices, emails and the website.', 's-gst': 'Printed on every invoice. Leave empty if you are not GST registered.', 's-addr': 'Printed on invoices and packing slips as the “from” address.', 's-phone': 'Shown to customers on the website and invoices.', 's-email': 'Shown to customers and used for the “contact us” link.',
  's-bank': 'Printed on invoices so a customer can pay you by bank transfer.', 's-acc': 'Printed on invoices. Only the owner login can see and change it.', 's-ifsc': 'Printed on invoices beside the account number.',
  's-prefix': 'The letters at the start of every invoice number (for example AP-). Changing it affects new invoices only.', 's-gstrate': 'The GST percentage already included in your prices. Invoices show how much of the price is GST.', 's-template': 'The look of printed invoices.',
  's-dispatch': 'Shown in the Terms and on product pages (for example “3–7 business days”). A promise to customers, so keep it true.', 's-length': 'The usual saree length shown on every saree page. A saree can have its own length.', 's-returndays': 'How many days a customer has to return a saree. Shown in the Terms. 0 means no returns.', 's-grievance': 'The name and role of your grievance officer, shown in the Privacy Policy. The law asks for one.',
  's-site': 'Your website address (starting with https://). Used for the search-engine sitemap and for links in emails.', 's-metadesc': 'The one-sentence description search engines show under your home page.', 's-otp': 'The address of the server that sends customers their WhatsApp sign-in code. Empty = demo mode (the code is shown on screen; not safe for real customers).', 's-ai': 'Optional: your own AI writing service. Empty = the built-in writer or Claude is used.', 's-pin': 'Local test copy only. Not real security.',
};
function admSettingsHelp(root) {
  if (!root) return; Object.keys(ADM_FIELD_HELP).forEach(id => { const el = document.getElementById(id); if (el && !el.dataset.helped) { el.dataset.helped = '1'; el.insertAdjacentHTML('afterend', `<small class="fld-help">${esc(ADM_FIELD_HELP[id])}</small>`); } });
  // each card: a heading line that says who may change it, then hide the cards that belong to the other login
  const role = BUILD === 'admin' ? (ADM.role || ADM_AS) : '';
  root.querySelectorAll('[data-for]').forEach(c => { const f = c.dataset.for; if (role && f !== 'both' && f !== role) c.style.display = 'none'; });
}
