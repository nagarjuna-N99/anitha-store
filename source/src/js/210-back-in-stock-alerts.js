// ================= BACK-IN-STOCK ALERTS =================
const nowISO = () => new Date().toISOString();
const fmtDate = iso => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = iso => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
function myAlert(pid) { const u = currentUser(); return u ? (db.stockAlerts.find(a => a.userId === u.id && a.productId === pid && a.status === 'waiting') || null) : null; }
const notifyLabel = pid => myAlert(pid) ? '🔔 Alert set ✓' : '🔔 Notify me';
function waitingCount(pid) { return db.stockAlerts.filter(a => a.productId === pid && a.status === 'waiting').length; }
let CUR_PID = null;
function refreshStockUI() { renderRecentlySold(); renderProducts(); buildScrollTrack(); renderFavourites(); const m = document.getElementById('productModal'); if (m.classList.contains('active') && CUR_PID) { const p = db.products.find(x => x.id === CUR_PID); if (p) renderProductModal(p); } }
function openStockAlert(pid) {
  const p = db.products.find(x => x.id === pid); if (!p) return;
  if (p.stock > 0) { showToast('Good news — it is back in stock!', 'success'); refreshStockUI(); return; }
  const u = currentUser(); if (!u) { openAuth(() => openStockAlert(pid)); return; }
  const mine = myAlert(pid), body = document.getElementById('alertBody');
  body.innerHTML = `<h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:12px;">${mine ? 'You are on the list' : 'Notify me when it is back'}</h3>
    <div class="share-item"><img src="${esc(p.image)}" alt=""><div><div style="font-weight:600;">${esc(p.name)}</div><div style="font-size:12px;color:#6b6862;">₹ ${money(p.price)} · currently sold out</div></div></div>
    ${mine ? `<p style="font-size:13px;color:#555;margin:12px 0;">We will send <strong>one</strong> WhatsApp message to ${esc(maskPhone(u.phone))} as soon as this saree is available again (requested ${esc(fmtDate(mine.createdAt))}).</p><button class="btn-outline" style="color:var(--red);border-color:var(--red);" onclick="alertCancel('${mine.id}','product')">Cancel this alert</button>`
      : `<div class="consent-box" id="al-consent-row" style="margin:14px 0;"><label class="chk"><input type="checkbox" id="al-consent"><span>Send me a <strong>one-time WhatsApp message</strong> at ${esc(maskPhone(u.phone))} when this saree is back in stock. I have read the <a onclick="event.preventDefault();event.stopPropagation();openLegalModal('privacy')">Privacy Policy</a>. <em>(required)</em></span></label></div><button class="btn-full" onclick="alertSubscribe('${p.id}')">🔔 Notify me</button><p class="auth-fine">This is separate from offers. You can cancel any time in My Account.</p>`}`;
  document.getElementById('alertModal').classList.add('active');
}
function alertSubscribe(pid) {
  const u = currentUser(), p = db.products.find(x => x.id === pid); if (!u || !p) return;
  if (!document.getElementById('al-consent').checked) { document.getElementById('al-consent-row').classList.add('invalid'); showToast('Please tick the box to allow the WhatsApp message', 'error'); return; }
  if (myAlert(pid)) { closeModal('alertModal'); return; }
  const backup = db.consentLog.length, a = { id: 'al' + generateId(), productId: pid, userId: u.id, phone: u.phone, status: 'waiting', createdAt: nowISO(), notifiedAt: null };
  recordConsent(u, 'stockAlert', true, 'product', pid); db.stockAlerts.push(a);
  if (!saveDB()) { db.stockAlerts.pop(); db.consentLog.length = backup; return; }
  closeModal('alertModal'); refreshStockUI(); updateNavCounts(); showToast(`🔔 Done — we'll WhatsApp you when ${p.name} is back`, 'success');
}
function alertCancel(id, source) {
  const a = db.stockAlerts.find(x => x.id === id), u = currentUser(); if (!a || !u || a.userId !== u.id || a.status !== 'waiting') return;
  a.status = 'cancelled'; a.cancelledAt = nowISO(); recordConsent(u, 'stockAlert', false, source || 'account', a.productId); saveDB();
  closeModal('alertModal'); refreshStockUI(); updateNavCounts(); if (document.getElementById('accountModal').classList.contains('active')) renderAccount(); showToast('Alert cancelled');
}
// When a sold-out saree is available again: each waiting customer gets exactly ONE queued message (never a duplicate).
function notifyBackInStock(p) {
  if (!p || p.stock <= 0) return 0; let n = 0;
  db.stockAlerts.filter(a => a.productId === p.id && a.status === 'waiting').forEach(a => {
    const u = db.users.find(x => x.id === a.userId), granted = db.consentLog.filter(c => c.userId === a.userId && c.type === 'stockAlert' && c.ref === p.id).slice(-1)[0];
    if (!u || u.deletionRequestedAt || !granted || !granted.granted) { a.status = 'skipped'; return; }
    a.status = 'notified'; a.notifiedAt = nowISO();
    if (!db.outbox.some(m => m.alertId === a.id)) { db.outbox.push({ id: 'ob' + generateId(), type: 'back_in_stock', alertId: a.id, userId: u.id, to: u.phone, productId: p.id, productName: p.name, link: richLink(p) || storeLink(p), status: 'queued', createdAt: nowISO(), error: '' }); n++; }
  });
  saveDB(); updateNavCounts(); dispatchOutbox(); return n;
}
let OUTBOX_BUSY = false;
async function dispatchOutbox() {
  if (OUTBOX_BUSY || !otpEndpoint()) return; OUTBOX_BUSY = true;
  try {
    for (const m of db.outbox.filter(x => x.status === 'queued')) {
      try { await otpPost('/messages/send', { to: m.to, template: m.type === 'similar_arrival' ? 'similar_arrival' : 'back_in_stock', variables: { product: m.productName, link: m.link, brand: BRAND() } }); m.status = 'sent'; m.sentAt = nowISO(); m.error = ''; }
      catch (e) { m.status = 'failed'; m.error = e.message; }
    }
    saveDB();
  } finally { OUTBOX_BUSY = false; if (isAdminView && currentAdminTab === 'alerts') renderAlertsAdmin(document.getElementById('adminContent')); }
}
function outboxRetry(id) { const m = db.outbox.find(x => x.id === id); if (m && m.status === 'failed') { m.status = 'queued'; saveDB(); dispatchOutbox(); renderAlertsAdmin(document.getElementById('adminContent')); } }
function alertsNotifyNow(pid) { const p = db.products.find(x => x.id === pid), n = notifyBackInStock(p); showToast(n ? `🔔 ${n} customer(s) queued for a WhatsApp message` : 'Nobody to notify', n ? 'success' : ''); renderAlertsAdmin(document.getElementById('adminContent')); }
function afterRestock(p) { const n = notifyBackInStock(p); if (n) showToast(`🔔 ${n} customer${n > 1 ? 's' : ''} waiting for ${p.name} ${n > 1 ? 'were' : 'was'} queued for a WhatsApp message`, 'success'); }
function renderAlertsAdmin(container) {
  const y = window.scrollY, al = db.stockAlerts, waiting = al.filter(a => a.status === 'waiting'), q = db.outbox.filter(m => m.type === 'back_in_stock');
  const byProd = {}; waiting.forEach(a => { (byProd[a.productId] = byProd[a.productId] || []).push(a); });
  const rows = Object.entries(byProd).map(([pid, arr]) => ({ p: db.products.find(x => x.id === pid), arr })).filter(r => r.p).sort((a, b) => b.arr.length - a.arr.length);
  const connected = !!otpEndpoint(), user = id => db.users.find(u => u.id === id) || {};
  container.innerHTML = similarSummaryHTML() + `<div class="stats-grid"><div class="stat-card"><h3>Customers waiting</h3><div class="value">${waiting.length}</div></div><div class="stat-card"><h3>Sold-out sarees wanted</h3><div class="value">${rows.length}</div></div><div class="stat-card"><h3>Messages queued</h3><div class="value">${q.filter(m => m.status === 'queued').length}</div></div><div class="stat-card"><h3>Messages sent</h3><div class="value">${q.filter(m => m.status === 'sent').length}</div></div></div>
    ${connected ? '' : '<div class="home-warn">⚠ WhatsApp is not connected yet (Settings → Customer login). Messages stay in the queue below and are sent automatically once a service is connected and you press Retry/restock again.</div>'}
    <div class="admin-card" style="overflow-x:auto;"><h3>🔔 Demand for sold-out sarees</h3><p class="note" style="margin-bottom:10px;">Customers who asked to be told when a saree is back. Restock it (Products → Edit → Stock) and they are queued automatically — each customer gets one message only.</p>
      <table class="admin-table" style="min-width:640px;"><thead><tr><th>Saree</th><th>Stock now</th><th>Waiting</th><th>Oldest request</th><th>Action</th></tr></thead><tbody>${rows.map(({ p, arr }) => `<tr><td><div style="display:flex;gap:10px;align-items:center;"><img src="${esc(p.image)}" alt="" style="width:36px;height:46px;object-fit:cover;border-radius:4px;"><div><div style="font-weight:500;">${esc(p.name)}</div><div style="font-size:11px;color:#6b6862;font-family:monospace;">${esc(p.sku)}</div></div></div></td><td><span class="status-pill ${p.stock ? 'status-active' : 'status-inactive'}">${p.stock} units</span></td><td style="font-weight:600;">${arr.length}</td><td style="font-size:12px;color:#6b6862;">${esc(fmtDate(arr.map(a => a.createdAt).sort()[0]))}</td><td><div class="action-buttons"><button class="btn-sm btn-primary-sm" onclick="alertsNotifyNow('${p.id}')" ${p.stock > 0 ? '' : 'disabled title="Restock first"'}>Notify now</button><button class="btn-sm btn-info-sm" onclick="openProductForm('${p.id}')">Restock</button></div></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:#6b6862;">Nobody is waiting for a saree right now.</td></tr>'}</tbody></table></div>
    <div class="admin-card" style="overflow-x:auto;"><h3>📨 Message queue</h3><table class="admin-table" style="min-width:680px;"><thead><tr><th>Queued</th><th>To</th><th>Saree</th><th>Status</th><th></th></tr></thead><tbody>${q.slice().reverse().map(m => `<tr><td style="font-size:12px;color:#6b6862;">${esc(fmtDateTime(m.createdAt))}</td><td style="font-family:monospace;font-size:12px;">${esc(m.to)}<div style="font-family:Inter;color:#6b6862;">${esc(user(m.userId).name || '')}</div></td><td>${esc(m.productName)}</td><td><span class="status-pill ${m.status === 'sent' ? 'status-paid' : m.status === 'failed' ? 'status-cancelled' : 'status-placed'}">${m.status === 'queued' && !connected ? 'queued (demo)' : m.status}</span>${m.error ? `<div class="note" style="color:var(--red);margin:3px 0 0;">${esc(m.error)}</div>` : ''}</td><td>${m.status === 'failed' ? `<button class="btn-sm btn-info-sm" onclick="outboxRetry('${m.id}')">Retry</button>` : m.status === 'queued' && connected ? `<button class="btn-sm btn-info-sm" onclick="dispatchOutbox()">Send now</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:#6b6862;">No messages yet.</td></tr>'}</tbody></table></div>`;
  window.scrollTo(0, y);
}

