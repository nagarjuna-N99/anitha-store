// The shop's REAL saree categories (as sold by Anitha Pemmasani) and the Moments they are shown under on the home page.
// The shop was started with a sample set (Tussar, Banarasi, Paithani...). On the first start with this version, a shop that is still on exactly that sample set is switched to the real eleven
// (sample products move to the nearest real category, and the home-page Moments are rebuilt). A shop whose categories the owner already edited is never touched by itself:
// the owner can do it with one press in Categories ("Set up my categories").
export const REAL_CATEGORIES = ['Mangalgiri', 'Maheswari', 'Ponduru Khadi', 'Fancy/Cocktail', 'Georgettes', 'Benaras', 'Kanjeevaram', 'Gadwals', 'Mysore Silk', 'Patola', 'Narayanpet'];
const DEMO = ['Tussar', 'Maheswari', 'Banarasi', 'Kanjeevaram', 'Ponduru Khadi', 'Paithani', 'Mysore Silk'];
// sample categories and older spellings, and where their products go
export const REMAP = { Tussar: 'Gadwals', Paithani: 'Patola', Banarasi: 'Benaras', Benares: 'Benaras', Benaras: 'Benaras', Mangalagiri: 'Mangalgiri', Georgette: 'Georgettes', Fancy: 'Fancy/Cocktail', Cocktail: 'Fancy/Cocktail', Gadwal: 'Gadwals', Maheshwari: 'Maheswari', 'Mysore Silks': 'Mysore Silk', Kanjivaram: 'Kanjeevaram', Kanchipuram: 'Kanjeevaram' };
// every category sits under exactly one Moment
export const MOMENTS = [
  { id: 'ch1', title: 'A Tuesday *morning.*', words: 'Everyday · Mangalgiri · Ponduru Khadi · Narayanpet', quote: 'Light enough to forget you are wearing it, and kind enough to last the whole working day.', cats: ['Mangalgiri', 'Ponduru Khadi', 'Narayanpet'] },
  { id: 'ch2', title: 'A cousin’s *wedding.*', words: 'Occasion · Benaras · Kanjeevaram · Patola', quote: 'Not the bride, and not in the front row, but the one whose saree people still ask about the next morning.', cats: ['Benaras', 'Kanjeevaram', 'Patola'] },
  { id: 'ch3', title: 'A festival, *at home.*', words: 'Festive · Gadwals · Maheswari · Mysore Silk', quote: 'Lamps on the window sill, flowers at the door, and a silk that has waited all year for this morning.', cats: ['Gadwals', 'Maheswari', 'Mysore Silk'] },
  { id: 'ch4', title: 'A quiet *evening.*', words: 'Evening · Fancy/Cocktail · Georgettes', quote: 'No grand hall, just a few people who matter, and a drape that suits the evening.', cats: ['Fancy/Cocktail', 'Georgettes'] },
];
export const sameSet = (a, b) => { const x = [...(a || [])].map(String).sort().join('|'), y = [...(b || [])].map(String).sort().join('|'); return x === y; };
export const isDemoCategories = cats => sameSet(cats, DEMO);
export const isRealCategories = cats => sameSet(cats, REAL_CATEGORIES);
// changes db in place; returns what it did
export function applyRealCategories(db, at = new Date().toISOString()) {
  const acc = new Set(db.accessoryCategories || []), moved = [], leftover = new Set();
  for (const p of db.products || []) {
    if (!p || acc.has(p.category) || REAL_CATEGORIES.includes(p.category)) continue;
    const to = REMAP[p.category]; if (to) { moved.push({ id: p.id, name: p.name, from: p.category, to }); p.category = to; } else if (p.category) leftover.add(p.category);
  }
  db.categories = [...REAL_CATEGORIES, ...[...leftover]];   // a product in a category we do not know keeps its category (it is added at the end), nothing disappears
  const old = (db.home && db.home.chapters && Array.isArray(db.home.chapters.items)) ? db.home.chapters : { items: [] }, byId = Object.fromEntries(old.items.map(c => [c.id, c]));
  db.home = db.home && typeof db.home === 'object' ? db.home : {};
  db.home.chapters = { show: old.show !== false, size: old.size || 'standard', items: MOMENTS.map(m => { const o = byId[m.id] || {}; return { id: m.id, show: o.show !== false, title: m.title, words: m.words, quote: m.quote, by: o.by || 'Anitha Pemmasani', image: o.image || '', tiles: m.cats.map(c => { const t = (o.tiles || []).find(x => x && x.category === c); return { category: c, image: t ? t.image || '' : '' }; }), link: 'See these sarees' }; }) };
  if (db.home.categories && Array.isArray(db.home.categories.items)) db.home.categories.items = db.home.categories.items.filter(i => REAL_CATEGORIES.includes(i.category));   // the website adds the missing ones itself
  db.realCategoriesApplied = at;
  return { moved, extra: [...leftover] };
}
export function maybeApplyOnStart(shop, log = () => {}) {
  const g = shop.get(), db = g && g.db; if (!db || db.realCategoriesApplied || !isDemoCategories(db.categories)) return null;
  let r = null; shop.mutate(d => { r = applyRealCategories(d); }); log(`[realcats] switched the sample categories to the 11 real ones (${r.moved.length} sample products moved)`); return r;
}
