// ================= PAGE ADDRESSES (each page has its own web address, 5 Nov 2026) =================
// On the public website every page has a real address: /collection/, /saree-care/, /journal/, /faq/, /terms/,
// /privacy/, /my-wishlist/, /page/<name>/ for pages the owner adds, and /product/<name>/ for each saree.
// The build writes a real page file for every fixed address and a 404.html that opens the right page for the rest.
// Old links such as #/product/<name>, #/faq, #/terms, #/cart and #/wishlist/... still work. Everything here is off in the owner
// app and when the page is opened from a file, so those behave exactly as before.
const ROUTE_PAGES = { shop: 'collection', care: 'saree-care', journal: 'journal', faq: 'faq', terms: 'terms', privacy: 'privacy', favourites: 'my-wishlist' };
const ROUTE_RE = /\/(collection|saree-care|journal|faq|terms|privacy|my-wishlist|(?:page|product)\/[^/]+)\/?$/;
const PATH_MODE = BUILD === 'site' && /^https?:$/.test(location.protocol);
const ROUTE_BASE = PATH_MODE ? (window.__BASE || location.pathname.replace(ROUTE_RE, '').replace(/\/(index|404)\.html$/, '').replace(/\/?$/, '/')) : '/';
let ROUTE_SKIP = false;                                          // true while the browser Back/Forward buttons drive the page
const routeSlug = t => String(t || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
function routePath(page) {
  if (page === 'home') return '';
  if (ROUTE_PAGES[page]) return ROUTE_PAGES[page] + '/';
  const c = typeof pgList === 'function' ? pgList().find(p => p.custom && p.key === page) : null;
  return c ? 'page/' + routeSlug(c.label) + '/' : '';
}
const routeUrl = page => ROUTE_BASE + routePath(page);
function routePush(page) {
  if (!PATH_MODE || ROUTE_SKIP) return; const u = routeUrl(page);
  try { if (location.pathname !== u || location.hash) history.pushState({ page }, '', u + location.search); } catch (e) { }
}
function routeReplaceProduct(slug) { if (!PATH_MODE) return false; try { history.replaceState({ product: slug }, '', ROUTE_BASE + 'product/' + encodeURIComponent(slug) + '/' + location.search); } catch (e) { } return true; }
function routeCurrentPage() { const a = document.querySelector('.page.active'); return a ? a.id.replace(/^page-/, '') : 'home'; }
function routeReplaceCurrent() { if (!PATH_MODE) return false; try { history.replaceState({ page: routeCurrentPage() }, '', routeUrl(routeCurrentPage()) + location.search); } catch (e) { } return true; }
// which page does the address in the browser bar mean? Returns true when it was handled.
function routeFromLocation() {
  if (!PATH_MODE) return false;
  let rel = location.pathname.startsWith(ROUTE_BASE) ? location.pathname.slice(ROUTE_BASE.length) : location.pathname.replace(/^\//, '');
  rel = rel.replace(/(^|\/)(index|404)\.html$/, '').replace(/\/+$/, '');
  const modal = document.getElementById('productModal'), show = fn => { ROUTE_SKIP = true; try { fn(); } finally { ROUTE_SKIP = false; } };
  const closeP = () => { if (modal && modal.classList.contains('active')) { closeModal('productModal'); } };
  if (rel === '') { closeP(); show(() => navigateTo('home')); return true; }
  const fixed = Object.keys(ROUTE_PAGES).find(k => ROUTE_PAGES[k] === rel);
  if (fixed) { closeP(); show(() => navigateTo(fixed)); return true; }
  let m = /^product\/(.+)$/.exec(rel);
  if (m) { const slug = safeDecode(m[1]), p = db.products.find(x => x.slug === slug); if (p) { show(() => navigateTo('shop')); openProductDetail(p.id); return true; } if (SHOP_SYNCED) { try { history.replaceState(null, '', ROUTE_BASE); } catch (e) { } show(() => navigateTo('home')); } return false; }
  m = /^page\/(.+)$/.exec(rel);
  if (m) { const slug = safeDecode(m[1]), c = typeof pgList === 'function' ? pgList().find(p => p.custom && p.show && routeSlug(p.label) === slug) : null; if (c) { closeP(); show(() => navigateTo(c.key)); return true; } if (SHOP_SYNCED) { try { history.replaceState(null, '', ROUTE_BASE); } catch (e) { } show(() => navigateTo('home')); } return false; }
  try { history.replaceState(null, '', ROUTE_BASE + location.search); } catch (e) { } show(() => navigateTo('home')); return true;   // an unknown address opens the home page
}
let SHOP_SYNCED = false;
window.addEventListener('popstate', () => { if (PATH_MODE) routeFromLocation(); });
// real links (so "open in a new tab", copy link and search engines work); a normal click still moves inside the page
function enhanceLinks() {
  if (!PATH_MODE) return;
  document.querySelectorAll('a[onclick*="navigateTo("]').forEach(a => { const m = /navigateTo\('([^']+)'\)/.exec(a.getAttribute('onclick') || ''); if (m && (m[1] === 'home' || ROUTE_PAGES[m[1]] || /^c-/.test(m[1]))) a.setAttribute('href', routeUrl(m[1])); });
}
if (PATH_MODE) document.addEventListener('click', e => {
  const a = e.target && e.target.closest && e.target.closest('a[href][onclick*="navigateTo("]');
  if (a && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) e.preventDefault();
}, false);
// a title, description and address for each page (search results and shared links)
const PAGE_SEO = { shop: ['Handloom Sarees Collection', 'Browse pure handloom sarees from Hyderabad: Tussar, Maheshwari, Banarasi, Kanjeevaram, Paithani, Mysore silk and Ponduru Khadi.'], care: ['Saree Care Guide', 'How to wash, dry, iron and store handloom silk, tussar and cotton sarees so they last for years.'], journal: ['Journal', 'Stories from the loom: weaves, weavers and the care behind each handloom saree.'], faq: ['Questions and Answers', 'Delivery, payment, care and returns: answers to common questions.'], favourites: ['My Wishlist', 'The sarees you saved.'] };
function pageSeo(page) {
  if (!PATH_MODE || page === 'home' || LEGAL_PAGES[page]) { if (PATH_MODE) setCanonical(routeUrl(page === 'home' ? 'home' : page)); return; }
  const c = typeof pgList === 'function' ? pgList().find(p => p.key === page) : null, base = PAGE_SEO[page] || [c ? (c.data && c.data.title) || c.label : '', ''];
  const t = (c && c.data && c.data.title) || base[0]; if (!t) return;
  document.title = `${t} | ${BRAND()}`; const d = base[1] || (c && c.data && (c.data.subtitle || c.data.label)) || SEO_DEFAULT.desc;
  setMeta('name', 'description', d); setMeta('property', 'og:title', document.title); setMeta('property', 'og:description', d); setCanonical(routeUrl(page));
}
function setCanonical(path) {
  const u = location.origin + path; let canon = document.querySelector('link[rel="canonical"]'); if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
  canon.href = u; setMeta('property', 'og:url', u);
}
