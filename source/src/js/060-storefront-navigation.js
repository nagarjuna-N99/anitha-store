// ================= STOREFRONT NAVIGATION =================
// ---- anonymous visit counting for the public website (no cookies, nothing personal; off with Do Not Track) ----
const TRK = { last: '', at: 0 };
function trackHit(t, o) {
  if (BUILD !== 'site') return; o = o || {};
  try {
    if (navigator.doNotTrack === '1' || navigator.webdriver || !window.__SHOP_API) return; const key = t + '|' + (o.p || '') + '|' + (o.id || ''), now = Date.now(); if (key === TRK.last && now - TRK.at < 1500) return; TRK.last = key; TRK.at = now;
    const u = new URLSearchParams(location.search).get('utm_source') || '';
    fetch(String(window.__SHOP_API).replace(/\/+$/, '') + '/public/hit', { method: 'POST', body: JSON.stringify({ t, p: o.p || '', id: o.id || '', r: document.referrer || '', u, m: window.matchMedia('(max-width:820px)').matches ? 1 : 0 }), keepalive: true, credentials: 'omit', mode: 'cors', headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch (e) { /* counting must never break the shop */ }
}
if (BUILD === 'site') document.addEventListener('click', e => { const a = e.target && e.target.closest && e.target.closest('a[href^="https://wa.me/"]'); if (a) trackHit('wa', {}); }, true);
function navigateTo(pageName) {
  if (typeof pageHidden === 'function' && pageHidden(pageName)) pageName = 'home';
  if (!document.getElementById('page-' + pageName)) pageName = 'home';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageName).classList.add('active');
  window.scrollTo(0, 0);
  if (pageName === 'favourites') renderFavourites();
  if (pageName === 'faq') renderFaq();
  if (LEGAL_PAGES[pageName]) renderLegal(pageName);
  if (typeof applyHeaderTheme === 'function') applyHeaderTheme();
  setPageSeo(pageName); if (typeof routePush === 'function') { routePush(pageName); pageSeo(pageName); }
  trackHit('view', { p: ['home', 'shop', 'journal', 'care', 'faq', 'favourites'].includes(pageName) ? pageName : 'other' });
}
function filterAndShowShop(category) { navigateTo('shop'); shopResetFilters(); filterProducts(category); }

