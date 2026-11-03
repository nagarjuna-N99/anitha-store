// ================= VIEW TOGGLE =================
// NOTE: this PIN gate only keeps casual visitors out. It is client-side, so it is NOT real security.
// Real admin access control needs a backend with authentication.
function adminAuthed() {
  if (BUILD === 'site') return false;                 // the public website has no admin at all
  if (BUILD === 'admin') return ADM.signedIn;         // the owner app: only after the server has accepted the password
  try { if (sessionStorage.getItem('ap_admin') === '1') return true; } catch (e) {}
  const pin = prompt('Enter admin PIN');
  if (pin === null) return false;
  if (pin === String(db.settings.adminPin)) { try { sessionStorage.setItem('ap_admin', '1'); } catch (e) {} return true; }
  showToast('Incorrect PIN', 'error'); return false;
}
function toggleView() {
  homeFlush();
  if (BUILD === 'admin') { viewHome(); return; }
  if (!isAdminView && !adminAuthed()) return;
  isAdminView = !isAdminView;
  document.getElementById('storefrontView').classList.toggle('hidden', isAdminView);
  document.getElementById('adminView').classList.toggle('active', isAdminView);
  document.getElementById('view-toggle').textContent = isAdminView ? 'Switch to Store' : 'Switch to Admin';
  closeAllDrawers(); document.body.classList.remove('studio-focus');
  document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  if (isAdminView) switchAdminTab(currentAdminTab);
  window.scrollTo(0, 0);
}

