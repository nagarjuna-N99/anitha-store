// ================= ADMIN LOGIC =================
const ADMIN_TITLES = { privacy: 'Privacy & DPDP', growth: 'Growth & Insights', promo: 'WhatsApp promotions', dashboard: 'Dashboard', home: 'Home Page', reviews: 'Customer Reviews', whatsapp: 'WhatsApp Assistant', delivery: 'Delivery & Gifting', alerts: 'Back-in-stock Alerts', products: 'Products Catalog', categories: 'Category Manager', studio: 'Image Studio', drafts: 'Saved Drafts', orders: 'Orders Management', invoices: 'Invoice Management', customers: 'Customer Database', statements: 'Financial Statements', coupons: 'Coupon Manager', bundles: 'Bundles', ai: 'AI Helper', social: 'Instagram', logs: 'Audit Logs', settings: 'Business Settings' };
function accShowToggle() {
  const on = db.settings.showAccessories === false;   // currently hidden -> show
  db.settings.showAccessories = on; if (!saveDB()) { db.settings.showAccessories = !on; return; }
  const t = document.getElementById('acc-show-toggle'); if (t) { t.classList.toggle('active', on); t.setAttribute('aria-checked', String(on)); }
  try { renderKindTabsAndOccasions(); } catch (e) { /* the website part may not be drawn in the owner app */ }
  showToast(on ? 'Accessories are shown on the website.' : 'Accessories are hidden on the website. Your products and categories are kept.', 'success');
}
function renderKindTabsAndOccasions() { if (typeof renderOccasions === 'function') renderOccasions(); if (typeof renderFilterButtons === 'function') renderFilterButtons(); }
function switchAdminTab(tab) {
  homeFlush();
  currentAdminTab = tab;
  if (tab !== 'studio') document.body.classList.remove('studio-focus');
  document.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  document.getElementById('adminPageTitle').textContent = ADMIN_TITLES[tab] || tab;
  if (typeof admShowDesc === 'function') admShowDesc(tab);
  renderAdminContent(tab);
  updateNavCounts();
  if (typeof admRoutePush === 'function') admRoutePush(tab);
}
function refreshAdmin() { if (isAdminView) renderAdminContent(currentAdminTab); }

function userStats(u) {
  const os = db.orders.filter(o => o.userId === u.id && o.status !== 'cancelled');
  return { orders: os.length, spent: os.reduce((s, o) => s + o.total, 0) };
}
function monthKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }

function renderAdminContent(tab) {
  const content = document.getElementById('adminContent');

  if (tab === 'dashboard') { renderDashboardPro(content); return; }

  if (tab === 'home') { renderHomeAdmin(content); return; }
  if (tab === 'reviews') { renderReviewsAdmin(content); return; }
  if (tab === 'alerts') { renderAlertsAdmin(content); return; }
  if (tab === 'whatsapp') { renderWaAdmin(content); return; }
  if (tab === 'delivery') { renderDeliveryAdmin(content); return; }

  if (tab === 'products') {
    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0;">Product Catalog</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn-sm btn-info-sm" onclick="bulkCsvTemplate()">⬇ CSV template</button><button class="btn-sm btn-info-sm" id="bulk-open" onclick="openBulk()">⬆ Bulk upload</button><button class="btn-sm btn-primary-sm" onclick="openProductForm()">+ Add New Product</button></div>
      </div>
      <div class="admin-card" style="overflow-x:auto;">
        <table class="admin-table" style="min-width:860px;">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>SEO</th><th>Actions</th></tr></thead>
          <tbody>${db.products.map(p => `<tr><td><div style="display:flex;align-items:center;gap:12px;"><div class="thumb-wrap"><img src="${esc(p.image)}" alt="" style="width:40px;height:50px;object-fit:cover;border-radius:4px;">${(p.images || []).length > 1 ? `<span class="thumb-n">${p.images.length}</span>` : ''}</div><div><div style="font-weight:500;">${esc(p.name)}</div><div style="font-size:11px;color:#6b6862;font-family:monospace;">${esc(p.sku)}${(videoInfo(p.video) || {}).type ? ' · ▶ video' : ''}</div></div></div></td><td>${esc(p.category)}</td><td style="font-weight:600;">${formatCurrency(p.price)}</td><td><span class="status-pill ${p.stock === 0 ? 'status-inactive' : p.stock <= p.threshold ? 'status-placed' : 'status-active'}">${p.stock} units</span>${waitingCount(p.id) ? `<div class="cchip ok" style="margin-top:4px;display:inline-block;">🔔 ${waitingCount(p.id)} waiting</div>` : ''}</td><td>${seoBadge(p)}</td><td><div class="action-buttons"><button class="btn-sm btn-info-sm" onclick="openProductForm('${p.id}')">Edit</button><button class="btn-sm btn-info-sm" onclick="openPreview(db.products.find(x=>x.id==='${p.id}'))">Preview</button><button class="btn-sm btn-info-sm ig-btn" title="Post this on Instagram" onclick="igOffer(db.products.find(x=>x.id==='${p.id}'),{force:true})">📸</button><button class="btn-sm btn-info-sm status-img-btn" title="Make a WhatsApp status / Instagram image" onclick="openStatusImage('${p.id}')">📲 Status</button><button class="btn-sm btn-danger-sm" onclick="deleteProduct('${p.id}')">Delete</button></div></td></tr>`).join('')}</tbody>
        </table>
      </div>
      ${db.drafts.length ? draftsByCategoryHTML(true) : ''}
    `;
    return;
  }

  if (tab === 'categories') {
    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0;">Category Manager</h3>
        <button class="btn-sm btn-primary-sm" onclick="openCategoryForm()">+ Create New Category</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;">
        ${db.categories.map((cat, idx) => {
          const count = db.products.filter(p => p.category === cat).length;
          return `<div style="background:white;padding:24px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.04);text-align:center;">
            <div style="width:60px;height:60px;background:var(--gold-light);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--gold);font-weight:600;">${esc(cat.charAt(0))}</div>
            <h4 style="font-family:'Cormorant Garamond',serif;font-size:20px;margin-bottom:8px;">${esc(cat)}</h4>
            <p style="font-size:12px;color:#6b6862;margin-bottom:12px;">${count} Products</p>
            <button class="btn-sm btn-danger-sm" onclick="deleteCategory(${idx})">Delete</button>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:34px 0 14px;flex-wrap:wrap;gap:10px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0;">Accessory categories</h3>
        <label class="acc-switch" style="display:flex;align-items:center;gap:8px;font-size:13px;"><span>Show Accessories on the website</span><span class="toggle ${db.settings.showAccessories === false ? '' : 'active'}" id="acc-show-toggle" role="switch" tabindex="0" aria-checked="${db.settings.showAccessories !== false}" onclick="accShowToggle()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"></span></label>
        <button class="btn-sm btn-primary-sm" onclick="openCategoryForm('accessory')">+ Create accessory category</button>
      </div>
      <div id="acc-cat-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;">
        ${db.accessoryCategories.map((cat, idx) => `<div class="acc-cat-card" style="background:white;padding:24px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.04);text-align:center;"><h4 style="font-family:'Cormorant Garamond',serif;font-size:20px;margin-bottom:8px;">${esc(cat)}</h4><p style="font-size:12px;color:#6b6862;margin-bottom:12px;">${db.products.filter(p => p.category === cat).length} Products</p><button class="btn-sm btn-danger-sm" onclick="deleteAccCategory(${idx})">Delete</button></div>`).join('') || '<p class="note">No accessory categories yet.</p>'}
      </div>
    `;
    return;
  }

  if (tab === 'studio') { renderImageStudio(content); return; }

  if (tab === 'drafts') {
    content.innerHTML = `<div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;"><div><h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:5px;">📝 Saved Drafts</h3><p style="color:#666;font-size:14px;">Each draft is one product with all its photos, ready to preview and publish. Grouped by category.</p></div>${db.drafts.length > 0 ? `<button class="btn-sm btn-danger-sm" onclick="clearAllDrafts()">🗑️ Clear All Drafts</button>` : ''}<button class="btn-sm btn-primary-sm" onclick="cbOpen()">✨ Make drafts from many photos</button></div>${draftsByCategoryHTML(false)}`;
    return;
  }

  if (tab === 'orders') {
    setTimeout(loadWebOrders, 0);
    content.innerHTML = `<div id="web-orders"></div>
      <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><button class="btn-sm btn-primary-sm" onclick="printDispatchList()">🚚 Dispatch list (packed orders)</button><span style="font-size:12px;color:#6b6862;">One page to carry to the post office: addresses, PINs and a box for each tracking number.</span></div>
      <div class="admin-card" style="overflow-x:auto;">
        <table class="admin-table" style="min-width:1000px;">
          <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Invoice</th><th>Actions</th></tr></thead>
          <tbody>${db.orders.length ? db.orders.map(o => `<tr><td style="font-family:monospace;font-weight:600;">${esc(o.id)}</td><td><div style="font-weight:500;">${esc(o.customer)}</div><div style="font-size:11px;color:#6b6862;">${esc(o.phone)}</div>${o.addressChanged ? `<div style="font-size:11px;color:var(--red);">📍 address changed${o.addressChangedAfterPacked ? ' AFTER packing' : ''}</div>` : ''}${o.gift ? '<div style="font-size:11px;">🎁 gift</div>' : ''}${o.instructions ? `<div style="font-size:11px;color:#8a4b00;background:#fff4e0;border-radius:3px;padding:2px 6px;margin-top:3px;max-width:240px;">📝 ${esc(o.instructions)}</div>` : ''}${o.addressCheck && o.addressCheck.status && o.addressCheck.status !== 'ok' ? '<div style="font-size:11px;color:#8a6d00;">⚠ check address / delivery</div>' : ''}</td><td style="font-size:12px;color:#6b6862;">${esc(o.date)}</td><td style="font-weight:600;">${formatCurrency(o.total)}</td><td><span class="status-pill ${getStatusClass(o.status)}">${esc(prettyStatus(o.status))}</span></td><td>${o.invoiceGenerated ? '<span style="color:var(--sage);font-size:12px;">✓ Generated</span>' : '<span style="color:#6b6862;font-size:12px;">Pending</span>'}</td><td><div class="action-buttons"><button class="btn-sm btn-info-sm" onclick="viewOrderDetails('${esc(o.id)}')">View</button><button class="btn-sm btn-info-sm" onclick="printSlip('${esc(o.id)}')">Slip</button><button class="btn-sm btn-info-sm" onclick="printLabel('${esc(o.id)}')">Label</button><button class="btn-sm btn-info-sm" onclick="orderDraftOpen('order','${esc(o.id)}')" title="A WhatsApp message for this order">✉ Message</button>${o.status === 'shipped' || o.status === 'out_for_delivery' ? `<button class="btn-sm btn-info-sm" onclick="${o.tracking ? `sendTrackingWA('${esc(o.id)}',true)` : `openShipDialog('${esc(o.id)}')`}">${o.tracking ? '📲 Tracking' : '+ Tracking'}</button>` : ''}${o.status === 'placed' && !o.invoiceGenerated ? `<button class="btn-sm btn-primary-sm" onclick="confirmOrderAndSendInvoice('${esc(o.id)}')">Confirm &amp; Invoice</button>` : ''}<select aria-label="Order status" onchange="updateOrderStatus('${esc(o.id)}', this.value)" style="padding:6px;border:1px solid var(--border);border-radius:4px;font-size:11px;">${['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${prettyStatus(s)[0].toUpperCase() + prettyStatus(s).slice(1)}</option>`).join('')}</select></div></td></tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b6862;">No orders yet.</td></tr>'}</tbody>
        </table>
      </div>
    `;
    return;
  }

  if (tab === 'invoices') { renderInvoices(content); return; }

  if (tab === 'customers') { if (BUILD === 'admin') admApi('POST', '/admin/api/privacy/log', { event: 'customers-viewed' }).catch(() => {});
    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin:0;">Customer Database</h3>
        <button class="btn-sm btn-primary-sm" onclick="openCustomerForm()">+ Add New Customer</button>
      </div>
      <div class="admin-card" style="overflow-x:auto;">
        <table class="admin-table" style="min-width:900px;">
          <thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total Spent</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${db.users.map(u => { const st = userStats(u); return `<tr><td><div style="display:flex;align-items:center;gap:12px;"><div style="width:36px;height:36px;border-radius:50%;background:var(--gold-light);display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:600;font-size:13px;">${esc(initials(u.name))}</div><div><div style="font-weight:500;">${esc(u.name)}</div><div style="font-size:11px;color:#6b6862;">Joined ${esc(u.joined)}</div></div></div></td><td><div style="font-size:13px;">${esc(u.phone)}</div><div style="font-size:11px;color:#6b6862;">${esc(u.email) || '—'}</div>${consentChips(u)}${u.deletionRequestedAt ? '<div class="cchip bad">Deletion requested</div>' : ''}</td><td style="text-align:center;font-weight:500;">${st.orders}</td><td style="text-align:right;font-weight:600;">${formatCurrency(st.spent)}</td><td style="text-align:center;">${u.status === 'VIP' ? '<span class="status-pill status-vip">VIP</span>' : '<span class="status-pill status-inactive">Regular</span>'}</td><td><button class="btn-sm btn-info-sm" onclick="viewCustomerDetails('${u.id}')">View Details</button></td></tr>`; }).join('')}</tbody>
        </table>
      </div>
    `;
    return;
  }

  if (tab === 'statements') {
    const now = new Date();
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    content.innerHTML = `
      <div style="margin-bottom:20px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:10px;">📈 Financial Statements</h3>
        <p style="color:#666;font-size:14px;">Generate revenue reports by time period and category. Cancelled and unpaid orders are excluded.</p>
      </div>
      <div class="report-filters">
        <div style="flex:1;min-width:200px;">
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;font-weight:600;display:block;margin-bottom:5px;">Time Period</label>
          <select id="reportPeriod" onchange="generateReport()" style="width:100%;">
            <option value="month">This Month (${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })})</option>
            <option value="6months">Last 6 Months</option>
            <option value="fy">This Financial Year (Apr ${fyStart} - Mar ${fyStart + 1})</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div style="flex:1;min-width:200px;">
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;font-weight:600;display:block;margin-bottom:5px;">Category Filter</label>
          <select id="reportCategory" onchange="generateReport()" style="width:100%;">
            <option value="all">All Categories</option>
            ${db.categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button onclick="generateReport()">🔄 Update Report</button>
        </div>
      </div>
      <div id="reportResults"></div>
    `;
    generateReport();
    return;
  }

  if (tab === 'bundles') { renderBundlesAdmin(content); return; }
  if (tab === 'ai') { renderAiHelper(content); return; }
  if (tab === 'social') { if (BUILD === 'admin') renderSocialAdmin(content); else content.innerHTML = '<div class="admin-card"><h3>📸 Instagram</h3><p class="note">Instagram posting and scheduling work in the <b>owner app</b> (admin.html on your server), where the server can post for you. See HOW-IT-WORKS/17.</p></div>'; return; }
  if (tab === 'growth') { renderGrowth(content); return; }
  if (tab === 'promo') { renderPromo(content); return; }
  if (tab === 'privacy') { renderPrivacyAdmin(content); return; }
  if (tab === 'ops') { renderOpsAdmin(content); return; }
  if (tab === 'pages') { renderPagesAdmin(content); return; }

  if (tab === 'coupons') {
    content.innerHTML = `
      <div class="admin-card">
        <h3>Coupon Manager</h3>
        <div class="coupon-form">
          <input type="text" id="newCouponCode" placeholder="Coupon Code (e.g. DIWALI20)" style="flex:2;">
          <input type="number" id="newCouponDisc" placeholder="Discount value" min="1" style="flex:1;">
          <select id="newCouponType" style="flex:1;"><option value="percent">Percent</option><option value="flat">Flat</option></select>
          <button class="btn-sm btn-primary-sm" onclick="addCoupon()">Add Coupon</button>
          <div style="flex-basis:100%;display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:13px;">
            <input type="number" id="newCouponMin" placeholder="Min order ₹ (optional)" min="0" style="width:170px;">
            <input type="number" id="newCouponMax" placeholder="Max total uses" min="0" style="width:140px;">
            <label>Expires <input type="date" id="newCouponExp"></label>
            <select id="newCouponChan"><option value="all">Website + WhatsApp</option><option value="whatsapp">WhatsApp chat only</option><option value="store">Website only</option></select>
            <label class="chk-line" style="margin:0;"><input type="checkbox" id="newCouponFirst"> First order only</label>
            <label class="chk-line" style="margin:0;"><input type="checkbox" id="newCouponOnce" checked> Once per customer</label>
            <label class="chk-line" style="margin:0;"><input type="checkbox" id="newCouponAnn"> Assistant may mention it</label>
          </div>
        </div>
        <table class="admin-table">
          <thead><tr><th>Code</th><th>Discount</th><th>Rules</th><th>Used</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${db.coupons.map((c, i) => `<tr><td style="font-family:monospace;font-weight:600;font-size:14px;">${esc(c.code)}</td><td>${c.type === 'flat' ? '₹' + money(c.discount) : c.discount + '%'}</td><td style="font-size:11px;color:#666;">${couponRules(c)}</td><td>${couponUses(c.code).length}${c.maxUses ? ' / ' + c.maxUses : ''}</td><td><span class="status-pill ${c.active ? 'status-active' : 'status-inactive'}">${c.active ? 'Active' : 'Inactive'}</span></td><td><div class="action-buttons"><button class="btn-sm btn-primary-sm" onclick="toggleCoupon(${i})">${c.active ? 'Disable' : 'Enable'}</button><button class="btn-sm btn-danger-sm" onclick="deleteCoupon(${i})">Delete</button></div></td></tr>`).join('')}</tbody>
        </table>
      </div>
    `;
    return;
  }

  if (tab === 'logs') {
    content.innerHTML = `
      <div class="admin-card" style="overflow-x:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:20px;margin:0;padding:0;border:none;">System Audit Trail</h3>
          <button class="btn-sm btn-danger-sm" onclick="clearLogs()">Clear Logs</button>
        </div>
        <table class="admin-table" style="min-width:800px;">
          <thead><tr><th>Time (IST)</th><th>Type</th><th>Reference</th><th>Change</th><th>Reason</th></tr></thead>
          <tbody>${db.logs.map(log => `<tr><td style="font-family:monospace;font-size:11px;color:#6b6862;">${esc(log.time)}</td><td><span class="status-pill ${log.type === 'stock_in' ? 'status-active' : log.type === 'stock_out' ? 'status-placed' : 'status-inactive'}">${esc(log.type.replace(/_/g, ' '))}</span></td><td><div style="font-weight:500;">${esc(log.product)}</div><div style="font-size:11px;color:#6b6862;font-family:monospace;">${esc(log.sku)}</div></td><td style="text-align:center;font-weight:600;color:${log.change > 0 ? 'var(--sage)' : log.change < 0 ? 'var(--red)' : '#888'};">${log.change > 0 ? '+' : ''}${log.change}</td><td style="font-size:12px;color:#666;">${esc(log.reason)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    `;
    return;
  }

  if (tab === 'settings') {
    const s = db.settings;
    content.innerHTML = `
      <div style="max-width:800px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:20px;">Business Settings</h3>
        <div class="admin-card" data-for="owner">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">Business Information</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;">
            <div class="form-group"><label>Business Name</label><input type="text" id="s-name" value="${esc(s.businessName)}"></div>
            <div class="form-group"><label>GST Number</label><input type="text" id="s-gst" value="${esc(s.gstNumber)}"></div>
            <div class="form-group" style="grid-column:1/-1;"><label>Address</label><input type="text" id="s-addr" value="${esc(s.address)}"></div>
            <div class="form-group"><label>Phone</label><input type="text" id="s-phone" value="${esc(s.phone)}"></div>
            <div class="form-group"><label>Email</label><input type="email" id="s-email" value="${esc(s.email)}"></div>
          </div>
        </div>
        <div class="admin-card" data-for="owner">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">Bank Details</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;">
            <div class="form-group"><label>Bank Name</label><input type="text" id="s-bank" value="${esc(s.bankName)}"></div>
            <div class="form-group"><label>Account Number</label><input type="text" id="s-acc" value="${esc(s.accountNumber)}"></div>
            <div class="form-group"><label>IFSC Code</label><input type="text" id="s-ifsc" value="${esc(s.ifscCode)}"></div>
          </div>
        </div>
        <div class="admin-card" data-for="owner">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">Invoice Settings</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;">
            <div class="form-group"><label>Invoice Prefix</label><input type="text" id="s-prefix" value="${esc(s.invoicePrefix)}"></div>
            <div class="form-group"><label>GST Rate (%) - included in prices</label><input type="number" id="s-gstrate" value="${s.gstRate}" step="0.01" min="0"></div>
            <div class="form-group"><label>Template</label><select id="s-template"><option value="template-1" ${s.selectedTemplate === 'template-1' ? 'selected' : ''}>Classic</option><option value="template-2" ${s.selectedTemplate === 'template-2' ? 'selected' : ''}>Elegant</option><option value="template-3" ${s.selectedTemplate === 'template-3' ? 'selected' : ''}>Modern</option></select></div>
          </div>
        </div>
        ${BUILD !== 'dev' ? '<div class="admin-card"><h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">Admin access</h4><p class="note">Sign-in is managed by the server (password, optional 2-step code). Change it in <strong>Security &amp; backup</strong> below. There is no PIN.</p></div>' : `<div class="admin-card">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">Admin Access</h4>
          <div class="form-group"><label>Admin PIN (client-side only - not real security)</label><input type="text" id="s-pin" value="${esc(s.adminPin)}" autocomplete="off"></div>
        </div>`}
        <div class="admin-card" data-for="admin">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">Customer sign-in</h4>
          <div class="form-group"><label>WhatsApp login service URL</label><input type="text" id="s-otp" value="${esc(s.otpEndpoint)}" placeholder="https://your-server.com/api"></div>
          <div class="note" style="margin-bottom:14px;">Leave empty for <strong>demo mode</strong>: the login code is shown on screen and no WhatsApp message is sent (for trying the flow only — not secure, do not launch like this). When set, the page calls <code>POST {url}/otp/send</code> {phone} and <code>POST {url}/otp/verify</code> {phone, code} on your server, which sends the code through the WhatsApp Business API.</div>
                  </div>
        <div class="admin-card" data-for="owner">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">Policies shown to customers</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
            <div class="form-group"><label>Dispatch time (shown in Terms)</label><input type="text" id="s-dispatch" value="${esc(s.dispatchTime)}"></div>
            <div class="form-group"><label>Usual saree length (shown on every saree page; a saree can have its own)</label><input type="text" id="s-length" value="${esc(s.sareeLength === undefined ? DEFAULT_SAREE_LENGTH : s.sareeLength)}" placeholder="e.g. 5.5 metres with a blouse piece"></div>
            <div class="form-group"><label>Return window (days)</label><input type="number" id="s-returndays" min="0" value="${s.returnDays}"></div>
            <div class="form-group"><label>Grievance officer (Privacy Policy)</label><input type="text" id="s-grievance" value="${esc(s.grievanceOfficer)}" placeholder="Name, designation"></div>
          </div>
        </div>
        <div class="admin-card" data-for="admin">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">SEO &amp; Search</h4>
          <div class="form-group"><label>Website address (for canonical links &amp; sitemap)</label><input type="text" id="s-site" value="${esc(s.siteUrl)}" placeholder="https://www.yourstore.com"></div>
          <div class="form-group"><label>Default page description (home page)</label><textarea id="s-metadesc" rows="2">${esc(s.metaDescription)}</textarea></div>
          <div class="action-buttons" style="margin-bottom:6px;"><button class="btn-sm btn-primary-sm" onclick="downloadSeoPack()">📦 Download SEO pack (ZIP)</button><button class="btn-sm btn-info-sm" onclick="downloadSitemap()">sitemap.xml</button><button class="btn-sm btn-info-sm" onclick="downloadRobots()">robots.txt</button></div>
          <div class="note">The ZIP holds one crawlable HTML page per product (title, meta description, canonical, Open Graph, structured data), plus sitemap.xml, robots.txt and the product images. Upload it to your website and submit sitemap.xml in Google Search Console. Save settings first so it uses your address.</div>
        </div>
        <div class="admin-card" data-for="admin">
          <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b6862;margin-bottom:15px;">AI descriptions (optional)</h4>
          <div class="form-group"><label>Your AI service URL</label><input type="text" id="s-ai" value="${esc(s.aiEndpoint)}" placeholder="https://your-server.com/describe-product"></div>
          <div class="note">Leave empty to use the built-in writer (category knowledge + colours detected in your photos). If set, the form POSTs {name, category, sku, price, colours, brand} and expects {description, tags[], seoTitle, metaDescription, altText}; if it fails, the built-in writer is used. Never put an API key in this page.</div>
        </div>
        <button class="btn-full" onclick="saveSettings()">Save Settings</button>
        ${admSecurityHTML()}
      </div>${(setTimeout(admLoadTeam, 0), '')}
    `;
    admSettingsHelp(content);
    if (BUILD === 'admin') { admLoadAudit(); admLoadAiKey(); }
    return;
  }
}

function initials(name) { return String(name || '?').split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'; }

