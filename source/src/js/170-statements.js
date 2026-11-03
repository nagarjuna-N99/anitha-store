// ================= STATEMENTS =================
function getReportRows(period, category) {
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sixAgo = ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1)); // current + previous 5 calendar months
  let orders = db.orders.filter(o => o.payment && o.payment.status === 'paid' && o.status !== 'cancelled');
  if (period === 'month') orders = orders.filter(o => o.date.slice(0, 7) === monthKey(now));
  else if (period === '6months') orders = orders.filter(o => o.date >= sixAgo);
  else if (period === 'fy') orders = orders.filter(o => o.date >= `${fyStart}-04-01` && o.date <= `${fyStart + 1}-03-31`);
  return orders.map(o => {
    const items = category === 'all' ? o.items : o.items.filter(i => i.category === category);
    const amount = category === 'all' ? o.total : items.reduce((s, i) => s + i.price * i.quantity, 0);
    return { o, items, amount };
  }).filter(r => r.items.length);
}

function generateReport() {
  const resultsDiv = document.getElementById('reportResults'); if (!resultsDiv) return;
  const period = document.getElementById('reportPeriod').value;
  const category = document.getElementById('reportCategory').value;
  const rows = getReportRows(period, category);
  const totalRevenue = rows.reduce((s, r) => s + r.amount, 0);
  const totalOrders = rows.length;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  const catBreakdown = {};
  rows.forEach(r => r.items.forEach(item => {
    const cat = item.category || 'Unknown';
    (catBreakdown[cat] = catBreakdown[cat] || { revenue: 0, count: 0 });
    catBreakdown[cat].revenue += item.price * item.quantity; catBreakdown[cat].count += item.quantity;
  }));
  const maxCatRevenue = Math.max(...Object.values(catBreakdown).map(c => c.revenue), 1);

  const monthlyData = {};
  rows.forEach(r => { const m = r.o.date.slice(0, 7); monthlyData[m] = (monthlyData[m] || 0) + r.amount; });
  const monthKeys = Object.keys(monthlyData).sort();
  const maxMonthRevenue = Math.max(...Object.values(monthlyData), 1);
  const periodLabels = { month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }), '6months': 'Last 6 Months', fy: 'This Financial Year', all: 'All Time' };

  resultsDiv.innerHTML = `
    <div class="report-summary">
      <div class="report-card"><h4>Total Revenue</h4><div class="val">${formatCurrency(totalRevenue)}</div><div class="sub">${esc(periodLabels[period])}</div></div>
      <div class="report-card"><h4>Total Orders</h4><div class="val">${totalOrders}</div><div class="sub">${category !== 'all' ? esc(category) : 'All Categories'}</div></div>
      <div class="report-card"><h4>Avg Order Value</h4><div class="val">${formatCurrency(avgOrderValue)}</div><div class="sub">Per transaction</div></div>
      <div class="report-card"><h4>Top Category</h4><div class="val" style="font-size:24px;">${esc(Object.keys(catBreakdown).sort((a, b) => catBreakdown[b].revenue - catBreakdown[a].revenue)[0] || 'N/A')}</div><div class="sub">By revenue</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-bottom:20px;">
      <div class="admin-card" style="min-width:0;">
        <h3>Revenue Trend</h3>
        ${monthKeys.length ? `
          <div class="chart-container">
            ${monthKeys.map(m => `<div class="chart-bar-group"><div class="chart-bar" style="height:${(monthlyData[m] / maxMonthRevenue) * 100}%;"><span>₹${money(Math.round(monthlyData[m]))}</span></div><div class="chart-label">${m}</div></div>`).join('')}
          </div>` : '<p style="text-align:center;color:#6b6862;padding:40px;">No data for selected period.</p>'}
      </div>
      <div class="admin-card">
        <h3>Category Breakdown</h3>
        ${Object.keys(catBreakdown).length ? Object.entries(catBreakdown).sort((a, b) => b[1].revenue - a[1].revenue).map(([cat, data]) => `
          <div class="cat-bar-wrap">
            <div class="cat-bar-header"><span>${esc(cat)}</span><span style="font-weight:600;">${formatCurrency(data.revenue)}</span></div>
            <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(data.revenue / maxCatRevenue) * 100}%;"></div></div>
            <div style="font-size:11px;color:#6b6862;margin-top:3px;">${data.count} items sold</div>
          </div>`).join('') : '<p style="text-align:center;color:#6b6862;padding:20px;">No category data.</p>'}
      </div>
    </div>
    <div class="admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
        <h3 style="margin:0;border:none;padding:0;">Transaction Details</h3>
        <button class="btn-sm btn-primary-sm" onclick="exportReportCSV()">📥 Export CSV</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="admin-table" style="min-width:700px;">
          <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td style="font-family:monospace;font-weight:600;">${esc(r.o.id)}</td>
                <td style="font-size:12px;color:#6b6862;">${esc(r.o.date)}</td>
                <td>${esc(r.o.customer)}</td>
                <td>${esc([...new Set(r.items.map(i => i.category))].join(', '))}</td>
                <td style="font-weight:600;">${formatCurrency(r.amount)}</td>
                <td><span class="status-pill ${getStatusClass(r.o.status)}">${esc(r.o.status)}</span></td>
              </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:30px;color:#6b6862;">No transactions found for this filter.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function exportReportCSV() {
  const period = document.getElementById('reportPeriod').value;
  const category = document.getElementById('reportCategory').value;
  const rows = getReportRows(period, category); // same rows as the on-screen report
  let csv = 'Order ID,Date,Customer,Phone,Category,Items,Subtotal,Shipping,Discount,Amount,Status\n';
  rows.forEach(({ o, items, amount }) => {
    csv += [o.id, o.date, o.customer, o.phone, [...new Set(items.map(i => i.category))].join('; '), items.map(i => `${i.name}(${i.quantity})`).join('; '), o.pricing.subtotal, o.pricing.shipping, o.pricing.discount, amount, o.status].map(csvCell).join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `AP_Statement_${period}_${category.replace(/\W+/g, '_')}_${Date.now()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('CSV exported successfully!', 'success');
}

