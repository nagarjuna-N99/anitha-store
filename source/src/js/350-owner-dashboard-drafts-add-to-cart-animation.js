// ================= OWNER DASHBOARD (interactive) + DRAFTS BY CATEGORY + ADD-TO-CART ANIMATION (29 Oct 2026) =================
const DASH = { range: '30', metric: 'revenue', sel: null };
const DASH_RANGES = [['1', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '12 months'], ['all', 'All time']];
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
function dashPeriod() {
  const today = ymd(new Date()), valid = db.orders.filter(o => o.status !== 'cancelled');
  if (DASH.range === 'all') { const first = valid.map(o => o.date).sort()[0] || today; const n = dayDiff(first, today) + 1; return { from: first, to: today, n, prevFrom: null, prevTo: null }; }
  const n = +DASH.range, from = addDays(today, -(n - 1));
  return { from, to: today, n, prevFrom: addDays(from, -n), prevTo: addDays(from, -1) };
}
const ordersIn = (from, to) => db.orders.filter(o => o.status !== 'cancelled' && o.date >= from && o.date <= to);
const unitsOf = os => os.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0), 0);
const revOf = os => os.reduce((s, o) => s + (o.total || 0), 0);
function dashStats(from, to) {
  const os = ordersIn(from, to), rev = revOf(os), cust = new Set(os.map(o => o.userId || o.phone));
  return { os, rev, orders: os.length, units: unitsOf(os), aov: os.length ? Math.round(rev / os.length) : 0, customers: cust.size, newCust: db.users.filter(u => u.joined >= from && u.joined <= to).length,
    discount: os.reduce((s, o) => s + ((o.pricing && o.pricing.discount) || 0), 0), gifts: os.filter(o => o.gift && (o.gift.wrap || o.gift.toOther)).length };
}
const deltaHTML = (cur, prev) => { if (prev == null) return '<span class="dl flat">all time</span>'; if (!prev && !cur) return '<span class="dl flat">–</span>'; if (!prev) return '<span class="dl up">▲ new</span>'; const p = Math.round((cur - prev) / prev * 100); return p === 0 ? '<span class="dl flat">● no change</span>' : `<span class="dl ${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)}%</span>`; };
const short = n => n >= 1e7 ? (n / 1e7).toFixed(1) + 'Cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + 'L' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(n);
function dashSeries(from, to, n, metric) {
  // buckets: daily up to 31 days, weekly up to 120, otherwise monthly
  const keys = [], labels = [];
  if (n <= 31) for (let i = 0; i < n; i++) { const d = addDays(from, i); keys.push(d); labels.push(new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })); }
  else if (n <= 120) for (let i = 0; i < n; i += 7) { const d = addDays(from, i); keys.push(d); labels.push(new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })); }
  else { let d = new Date(from + 'T12:00:00'); d.setDate(1); const end = new Date(to + 'T12:00:00'); while (d <= end) { keys.push(monthKey(d)); labels.push(d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); } }
  const vals = keys.map(() => 0), orders = keys.map(() => []);
  ordersIn(from, to).forEach(o => { let i;
    if (n <= 31) i = keys.indexOf(o.date); else if (n <= 120) i = Math.min(keys.length - 1, Math.floor(dayDiff(from, o.date) / 7)); else i = keys.indexOf(o.date.slice(0, 7));
    if (i < 0) return; orders[i].push(o); vals[i] += metric === 'revenue' ? o.total : metric === 'units' ? unitsOf([o]) : 1; });
  return { keys, labels, vals, orders };
}
function dashSet(k, v) { DASH[k] = v; DASH.sel = null; renderDashboardPro(el_('adminContent')); }
function dashPick(i) { DASH.sel = DASH.sel === i ? null : i; renderDashboardPro(el_('adminContent')); const t = document.getElementById('dash-detail'); if (t && DASH.sel !== null) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
function dashGo(tab) { switchAdminTab(tab); }
const spark = (vals, color) => { const w = 90, h = 28, m = Math.max(...vals, 1), pts = vals.map((v, i) => `${vals.length > 1 ? (i / (vals.length - 1)) * w : w / 2},${h - 3 - (v / m) * (h - 6)}`).join(' '); return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`; };
function renderDashboardPro(content) {
  if (typeof UI2 !== 'undefined' && UI2 && content === el_('adminContent')) { content.innerHTML = '<div id="ov2-top"></div><div id="dash-classic"></div>'; renderDashboardClassic(el_('dash-classic')); renderOverview2(el_('ov2-top')); return; }
  return renderDashboardClassic(content);
}
function renderDashboardClassic(content) {
  if (!content) return;
  const P = dashPeriod(), cur = dashStats(P.from, P.to), prev = P.prevFrom ? dashStats(P.prevFrom, P.prevTo) : null;
  const metricName = { revenue: 'Revenue', orders: 'Orders', units: 'Pieces sold' }[DASH.metric];
  const ser = dashSeries(P.from, P.to, P.n, DASH.metric), max = Math.max(...ser.vals, 1);
  const spk = m => dashSeries(P.from, P.to, Math.min(P.n, 31) === P.n ? P.n : 30, m).vals;
  const fmtM = v => DASH.metric === 'revenue' ? formatCurrency(v) : String(v);
  // chart
  const W = 640, H = 230, padL = 8, padB = 34, padT = 24, bw = (W - padL * 2) / ser.vals.length, ch = H - padB - padT;
  const labelEvery = Math.ceil(ser.vals.length / 8);
  const bars = ser.vals.map((v, i) => { const bh = Math.max(v ? 3 : 0, (v / max) * ch), x = padL + i * bw + bw * 0.15, y = padT + ch - bh;
    return `<g class="bar ${DASH.sel === i ? 'sel' : ''}" onclick="dashPick(${i})" tabindex="0" role="button" aria-label="${esc(ser.labels[i])}: ${esc(fmtM(v))}" onkeydown="if(event.key==='Enter')dashPick(${i})"><rect x="${padL + i * bw}" y="0" width="${bw}" height="${H - padB}" fill="transparent"/><rect class="bar-r" x="${x}" y="${y}" width="${bw * 0.7}" height="${bh}" rx="3"/>${DASH.sel === i || ser.vals.length <= 8 ? `<text x="${x + bw * 0.35}" y="${y - 6}" text-anchor="middle" class="bar-v">${DASH.metric === 'revenue' ? '₹' + short(v) : v}</text>` : ''}<title>${esc(ser.labels[i])}: ${esc(fmtM(v))}</title></g>`; }).join('');
  const xl = ser.labels.map((l, i) => i % labelEvery === 0 ? `<text x="${padL + i * bw + bw / 2}" y="${H - 12}" text-anchor="middle" class="ax">${esc(l)}</text>` : '').join('');
  // status donut
  const stat = {}; db.orders.forEach(o => { if (o.date >= P.from && o.date <= P.to) stat[o.status] = (stat[o.status] || 0) + 1; });
  const sCol = { placed: '#C96A11', confirmed: '#D4A373', packed: '#8C8C88', shipped: '#5B8DB8', out_for_delivery: '#3E6FA0', delivered: '#6B8E6B', cancelled: '#B04A4A', paid: '#9BB58A', payment_pending: '#E0C080' };
  const sTot = Object.values(stat).reduce((a, b) => a + b, 0); let acc = 0; const R = 42, C = 2 * Math.PI * R;
  const arcs = Object.entries(stat).map(([k, v]) => { const len = v / sTot * C, a = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${sCol[k] || '#ccc'}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"><title>${esc(prettyStatus(k))}: ${v}</title></circle>`; acc += len; return a; }).join('');
  // products / categories / sources
  const byProd = {}, byCat = {}, bySrc = { Website: 0, 'WhatsApp chat': 0 };
  cur.os.forEach(o => { bySrc[o.source === 'whatsapp' ? 'WhatsApp chat' : 'Website'] += o.total; (o.items || []).forEach(i => { const k = i.productId; (byProd[k] = byProd[k] || { id: k, name: i.name, rev: 0, units: 0 }); byProd[k].rev += i.price * i.quantity; byProd[k].units += i.quantity; const c = i.category || (db.products.find(p => p.id === k) || {}).category || 'Other'; byCat[c] = (byCat[c] || 0) + i.price * i.quantity; }); });
  const topP = Object.values(byProd).sort((a, b) => b.rev - a.rev).slice(0, 5), topC = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6), catMax = Math.max(...topC.map(x => x[1]), 1), pMax = Math.max(...topP.map(x => x.rev), 1);
  const srcTot = bySrc.Website + bySrc['WhatsApp chat'];
  // buyers
  const byBuyer = {}; cur.os.forEach(o => { const k = o.customer || o.phone; byBuyer[k] = byBuyer[k] || { n: k, rev: 0, c: 0 }; byBuyer[k].rev += o.total; byBuyer[k].c++; });
  const buyers = Object.values(byBuyer).sort((a, b) => b.rev - a.rev).slice(0, 4);
  const everBefore = new Set(db.orders.filter(o => o.status !== 'cancelled' && o.date < P.from).map(o => o.userId || o.phone)), repeat = [...new Set(cur.os.map(o => o.userId || o.phone))].filter(k => everBefore.has(k)).length;
  // attention list
  const open = s => db.orders.filter(o => o.status === s).length;
  const flagged = db.orders.filter(o => o.addressCheck && o.addressCheck.status !== 'ok' && !['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(o.status)).length;
  const low = db.products.filter(p => p.stock > 0 && p.stock <= (p.threshold || 2) && !isAccessory(p)), out = db.products.filter(p => p.stock <= 0);
  const att = [
    [open('placed'), '🆕', 'new orders to confirm', 'orders'], [open('confirmed'), '📦', 'confirmed orders to pack', 'orders'], [open('packed'), '🚚', 'packed orders to hand to the courier', 'orders'],
    [flagged, '⚠️', 'orders whose address needs a check', 'orders'], [db.orders.filter(o => o.instructions && ['placed', 'confirmed'].includes(o.status)).length, '📝', 'orders with a special request to read', 'orders'], [db.reviews.filter(r => r.status === 'pending').length, '⭐', 'reviews waiting for approval', 'reviews'],
    [db.stockAlerts.filter(a => a.status === 'waiting').length + db.similarAlerts.filter(a => a.status === 'waiting').length, '🔔', 'customers waiting for a saree', 'alerts'],
    [db.outbox.filter(m => m.status === 'failed').length, '✉️', 'WhatsApp messages that failed to send', 'alerts'], [db.drafts.length, '📝', 'saved drafts not yet published', 'products'],
    [low.length, '📉', 'sarees almost sold out', 'products'], [db.products.filter(p => !(p.images || []).length).length, '🖼️', 'products without a photo', 'products']].filter(x => x[0] > 0);
  const stockValue = db.products.reduce((s, p) => s + p.price * Math.max(0, p.stock), 0), pieces = db.products.reduce((s, p) => s + Math.max(0, p.stock), 0);
  const detail = DASH.sel !== null ? ser.orders[DASH.sel] : null;
  const kpi = (id, label, val, d, vals, color, tab, hint) => `<button type="button" class="kpi" onclick="dashGo('${tab}')" title="${esc(hint)}"><span class="kpi-l">${label} <i>ⓘ</i></span><span class="kpi-v">${val}</span><span class="kpi-d">${d}</span>${spark(vals, color)}</button>`;
  content.innerHTML = `
    <div class="dash-head"><div><h3 class="dash-hi">${(h => h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')(new Date().getHours())}, ${esc((db.settings.businessName || 'Anitha').split(' ')[0])} 👋</h3><p class="dash-sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · showing ${DASH.range === 'all' ? 'all time' : 'the last ' + (DASH.range === '1' ? 'day' : DASH.range + ' days')}${prev ? ' compared with the ' + P.n + ' day' + (P.n > 1 ? 's' : '') + ' before' : ''}</p></div>
      <div class="dash-ranges" role="tablist" aria-label="Period">${DASH_RANGES.map(([k, l]) => `<button type="button" role="tab" aria-selected="${DASH.range === k}" class="${DASH.range === k ? 'on' : ''}" onclick="dashSet('range','${k}')">${l}</button>`).join('')}<button type="button" class="dash-refresh" onclick="renderDashboardPro(el_('adminContent'))" title="Refresh">↻</button></div></div>
    <div class="kpis">
      ${kpi('rev', 'Revenue', formatCurrency(cur.rev), deltaHTML(cur.rev, prev && prev.rev), spk('revenue'), 'var(--gold)', 'orders', 'Total of all orders placed in this period (cancelled orders are not counted)')}
      ${kpi('ord', 'Orders', cur.orders, deltaHTML(cur.orders, prev && prev.orders), spk('orders'), 'var(--sage)', 'orders', 'Number of orders placed in this period')}
      ${kpi('aov', 'Average order', formatCurrency(cur.aov), deltaHTML(cur.aov, prev && prev.aov), spk('orders'), '#8C8C88', 'orders', 'Revenue divided by orders')}
      ${kpi('units', 'Pieces sold', cur.units, deltaHTML(cur.units, prev && prev.units), spk('units'), '#5B8DB8', 'products', 'Sarees and accessories sold')}
      ${kpi('cust', 'Customers', cur.customers, `<span class="dl flat">${cur.newCust} new · ${repeat} returning</span>`, spk('orders'), 'var(--gold)', 'customers', 'People who ordered in this period; new = joined in this period; returning = ordered before this period too')}
      ${kpi('disc', 'Discounts given', formatCurrency(cur.discount), `<span class="dl flat">${cur.gifts} gift order${cur.gifts === 1 ? '' : 's'}</span>`, spk('orders'), '#B04A4A', 'coupons', 'Coupons and bundle offers deducted from orders in this period')}
    </div>
    ${twoFaBannerHTML()}${igReminderHTML()}<div id="dash-priv"></div><section class="admin-card" id="dash-weekly" style="margin-bottom:16px;"></section>
    <div class="dash-grid">
      <section class="admin-card dash-chart"><div class="dash-chart-h"><h3>${metricName} over time</h3><div class="seg" role="tablist" aria-label="Metric">${[['revenue', 'Revenue'], ['orders', 'Orders'], ['units', 'Pieces']].map(([k, l]) => `<button type="button" class="${DASH.metric === k ? 'on' : ''}" onclick="dashSet('metric','${k}')">${l}</button>`).join('')}</div></div>
        ${ser.vals.some(v => v) ? `<svg class="dchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metricName} chart"><line x1="${padL}" x2="${W - padL}" y1="${padT + ch}" y2="${padT + ch}" class="axis"/>${bars}${xl}</svg><p class="hint">Tap or hover a bar for details${DASH.sel !== null ? '' : ''}.</p>` : `<div class="dash-empty">No orders in this period yet. Try a longer period.</div>`}
        ${detail ? `<div id="dash-detail" class="dash-detail"><strong>${esc(ser.labels[DASH.sel])}</strong> · ${detail.length} order${detail.length === 1 ? '' : 's'} · ${formatCurrency(revOf(detail))}${detail.map(o => `<div class="dd-row"><span>${esc(o.id)} · ${esc(o.customer || '')}</span><b>${formatCurrency(o.total)}</b><button type="button" class="linkbtn" onclick="viewOrderDetails('${esc(o.id)}')">View</button></div>`).join('') || '<div class="dd-row">No orders</div>'}</div>` : ''}
      </section>
      <section class="admin-card"><h3>Needs your attention</h3>${att.length ? att.map(([n, ic, t, tab]) => `<button type="button" class="att" onclick="dashGo('${tab}')"><span class="att-ic">${ic}</span><span class="att-t"><b>${n}</b> ${t}</span><span class="att-go">›</span></button>`).join('') : '<div class="dash-empty">🎉 All caught up. Nothing is waiting for you.</div>'}</section>
      <section class="admin-card"><h3>Orders by status</h3>${sTot ? `<div class="donut-row"><svg viewBox="0 0 120 120" class="donut" role="img" aria-label="Orders by status">${arcs}<text x="60" y="58" text-anchor="middle" class="d-n">${sTot}</text><text x="60" y="73" text-anchor="middle" class="d-l">orders</text></svg><ul class="legend">${Object.entries(stat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><button type="button" onclick="dashGo('orders')"><i style="background:${sCol[k] || '#ccc'}"></i>${esc(prettyStatus(k))}<b>${v}</b></button></li>`).join('')}</ul></div>` : '<div class="dash-empty">No orders in this period.</div>'}</section>
      <section class="admin-card"><h3>Best sellers</h3>${topP.length ? topP.map((p, i) => `<button type="button" class="rank" onclick="openProductForm('${esc(p.id)}')"><span class="rk">${i + 1}</span><span class="rk-n">${esc(p.name)}<small>${p.units} sold · ${formatCurrency(p.rev)}</small><span class="rk-bar"><span style="width:${Math.max(4, p.rev / pMax * 100)}%"></span></span></span></button>`).join('') : '<div class="dash-empty">No sales in this period.</div>'}</section>
      <section class="admin-card"><h3>Sales by category</h3>${topC.length ? topC.map(([c, v]) => `<div class="cat-row"><div class="cat-h"><span>${esc(c)}</span><b>${formatCurrency(v)} · ${Math.round(v / cur.rev * 100) || 0}%</b></div><div class="cat-track"><div style="width:${Math.max(3, v / catMax * 100)}%"></div></div></div>`).join('') : '<div class="dash-empty">No sales in this period.</div>'}
        ${srcTot ? `<h4 class="dash-h4">Where orders come from</h4><div class="src"><div style="width:${bySrc.Website / srcTot * 100}%" class="s1"></div><div style="width:${bySrc['WhatsApp chat'] / srcTot * 100}%" class="s2"></div></div><div class="src-l"><span><i class="s1"></i>Website ${formatCurrency(bySrc.Website)}</span><span><i class="s2"></i>WhatsApp chat ${formatCurrency(bySrc['WhatsApp chat'])}</span></div>` : ''}</section>
      <section class="admin-card"><h3>Stock snapshot</h3><div class="snap"><div><b>${db.products.length}</b><small>products</small></div><div><b>${pieces}</b><small>pieces in stock</small></div><div><b>${formatCurrency(stockValue)}</b><small>stock value</small></div><div class="${out.length ? 'bad' : ''}"><b>${out.length}</b><small>sold out</small></div></div>
        ${low.length ? `<h4 class="dash-h4">Almost sold out</h4>${low.slice(0, 4).map(p => `<button type="button" class="att" onclick="openProductForm('${esc(p.id)}')"><span class="att-ic"><img src="${esc(p.image)}" alt="" width="34" height="42"></span><span class="att-t">${esc(p.name)}<small>${p.stock} left</small></span><span class="att-go">Edit</span></button>`).join('')}` : ''}</section>
      <section class="admin-card"><h3>Top customers</h3>${buyers.length ? buyers.map(b => `<div class="dd-row"><span>${esc(b.n)}<small> · ${b.c} order${b.c > 1 ? 's' : ''}</small></span><b>${formatCurrency(b.rev)}</b></div>`).join('') : '<div class="dash-empty">No orders in this period.</div>'}</section>
      <section class="admin-card"><h3>Latest orders</h3>${db.orders.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(o => `<div class="dd-row"><span>${esc(o.id)}<small> · ${esc(o.customer || '')} · ${esc(o.date)}</small></span><b>${formatCurrency(o.total)}</b><span class="${getStatusClass(o.status)} status-pill">${esc(prettyStatus(o.status))}</span></div>`).join('') || '<div class="dash-empty">No orders yet.</div>'}<button type="button" class="linkbtn" onclick="dashGo('orders')">All orders ›</button></section>
      <section class="admin-card"><h3>Recent activity</h3>${db.logs.slice(0, 6).map(l => `<div class="dd-row"><span>${esc(l.reason || l.type)}<small> · ${esc(l.product && l.product !== '-' ? l.product : '')} ${esc(l.time || '')}</small></span></div>`).join('') || '<div class="dash-empty">Nothing yet.</div>'}<button type="button" class="linkbtn" onclick="dashGo('logs')">Full history ›</button></section>
    </div>
    <details class="admin-card dash-how"><summary>How are these numbers worked out?</summary><p>Orders count when they are placed and are not cancelled. Revenue is the order total (after discounts, including shipping and gift wrap). "Compared with" uses the same number of days just before this period. "New customers" are people who created an account in the period; "returning" had ordered before it. Stock value is price × pieces in stock. Everything is calculated live from your store data every time you open this page.</p></details>`;
  setTimeout(dashWeekly, 0); setTimeout(dashPrivacy, 0);
}

