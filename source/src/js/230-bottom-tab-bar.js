// ===== bottom tab bar =====
function tabGo(t) {
  document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); closeAllDrawers(); closeStoreNav && closeStoreNav();
  if (t === 'cart') openCart(); else if (t === 'account') openAccount(); else navigateTo(t);
  tabSync();
}
function tabSync() {
  const pg = (document.querySelector('.page.active') || {}).id || '', cur = pg.replace('page-', '');
  const open = id => { const e = document.getElementById(id); return !!(e && e.classList.contains('active')); };
  const on = open('cartDrawer') ? 'cart' : open('accountModal') ? 'account' : ['home', 'shop', 'favourites'].includes(cur) ? cur : '';
  document.querySelectorAll('#tabBar button').forEach(b => b.classList.toggle('on', b.dataset.tab === on));
  [['tabFav', 'favCount'], ['tabCart', 'cartCount']].forEach(([t, s]) => { const n = parseInt(document.getElementById(s).textContent, 10) || 0, e = document.getElementById(t); e.textContent = n > 99 ? '99+' : n; e.style.display = n ? 'block' : 'none'; });
  document.body.classList.toggle('admin-on', !!isAdminView);
}
(function () {
  document.body.classList.add('has-tabbar');
  const mo = new MutationObserver(tabSync);
  ['favCount', 'cartCount'].forEach(id => mo.observe(document.getElementById(id), { childList: true, characterData: true, subtree: true }));
  ['cartDrawer', 'accountModal'].forEach(id => mo.observe(document.getElementById(id), { attributes: true, attributeFilter: ['class'] }));
  document.querySelectorAll('.page').forEach(pg => mo.observe(pg, { attributes: true, attributeFilter: ['class'] }));
  mo.observe(document.getElementById('storefrontView'), { attributes: true, attributeFilter: ['class'] });
  tabSync();
})();

