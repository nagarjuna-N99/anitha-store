// ================= HAMBURGER MENUS =================
function toggleStoreNav() {
  document.getElementById('storeMobileNav').classList.toggle('active');
  document.getElementById('storeNavOverlay').classList.toggle('active');
  document.getElementById('storeHamburger').classList.toggle('active');
}
function closeStoreNav() {
  document.getElementById('storeMobileNav').classList.remove('active');
  document.getElementById('storeNavOverlay').classList.remove('active');
  document.getElementById('storeHamburger').classList.remove('active');
}
function toggleAdminNav() {
  document.getElementById('adminMobileNav').classList.toggle('active');
  document.getElementById('adminNavOverlay').classList.toggle('active');
  document.getElementById('adminHamburger').classList.toggle('active');
}
// ---- hide or show the left menu (remembered in this browser) ----
function navApply(closed) { document.body.classList.toggle('nav-closed', closed); const b = document.getElementById('navToggle'); if (b) { b.textContent = closed ? '☰' : '‹'; b.setAttribute('aria-expanded', String(!closed)); b.setAttribute('aria-label', closed ? 'Show the menu' : 'Hide the menu'); b.title = closed ? 'Show the menu' : 'Hide the menu'; } setTimeout(() => window.dispatchEvent(new Event('resize')), 60); }
function toggleNav() { const closed = !document.body.classList.contains('nav-closed'); try { localStorage.setItem('ap_nav_closed', closed ? '1' : '0'); } catch (e) { /* not remembered */ } navApply(closed); }
function navRestore() { let c = false; try { c = localStorage.getItem('ap_nav_closed') === '1'; } catch (e) { /* default open */ } navApply(c); }
function closeAdminNav() {
  document.getElementById('adminMobileNav').classList.remove('active');
  document.getElementById('adminNavOverlay').classList.remove('active');
  document.getElementById('adminHamburger').classList.remove('active');
}

