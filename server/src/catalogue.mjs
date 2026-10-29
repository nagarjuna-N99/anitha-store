// Product catalogue as uploaded from the store admin. Read-only for the assistant.
const SYN = { kanchipuram: 'kanjeevaram', kanchi: 'kanjeevaram', kanjivaram: 'kanjeevaram', benarasi: 'banarasi', benaras: 'banarasi', banaras: 'banarasi', paithni: 'paithani', mysore: 'mysore', tussar: 'tussar', tusser: 'tussar', maheshwari: 'maheswari', maheshwari_: 'maheswari', cotton: 'cotton', khadi: 'khadi', pochampally: 'pochampally', ikat: 'ikat' };
const STOP = new Set(['a', 'an', 'the', 'saree', 'sarees', 'sari', 'saris', 'for', 'in', 'with', 'and', 'or', 'of', 'to', 'me', 'show', 'want', 'need', 'looking', 'please', 'have', 'you', 'any', 'do', 'is', 'there', 'some']);
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s-]/gu, ' ');
const tokens = q => norm(q).split(/\s+/).filter(t => t && !STOP.has(t)).map(t => SYN[t] || t);

export function stockLabel(p) {
  const n = Number(p.stock) || 0;
  return n <= 0 ? 'sold out' : n <= 2 ? `only ${n} left` : 'in stock';
}
export function brief(p) {
  return { id: p.id, type: p.type === 'accessory' ? 'accessory' : 'saree', name: p.name, category: p.category, fabric: p.fabric || '', colours: p.colours || [], price_inr: p.price, availability: stockLabel(p), link: p.link || '' };
}

export class Catalogue {
  // `held` = { productId: quantity } already spoken for by open payment links / unimported paid orders.
  constructor(data, held = {}) { this.data = data || { products: [], shop: {}, policies: {} }; this.products = (this.data.products || []).filter(p => p && p.id && p.name).map(p => held[p.id] ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) - held[p.id]) } : p); }
  get shop() { return this.data.shop || {}; }
  get policies() { return this.data.policies || {}; }
  get exportedAt() { return this.data.exportedAt || null; }

  find(ref) {
    const r = String(ref || '').trim().toLowerCase();
    return this.products.find(p => p.id.toLowerCase() === r || String(p.sku || '').toLowerCase() === r) || null;
  }

  search({ query = '', type, category, fabric, colour, min_price, max_price, in_stock_only = false, limit = 4 } = {}) {
    const toks = tokens(query);
    const kind = ['saree', 'accessory'].includes(String(type || '').toLowerCase()) ? String(type).toLowerCase() : '';   // anything else = search both
    const hay = p => norm([p.name, p.category, p.fabric, (p.colours || []).join(' '), (p.tags || []).join(' '), p.sku, p.description].join(' '));
    let list = this.products.filter(p => {
      if (kind && (p.type === 'accessory' ? 'accessory' : 'saree') !== kind) return false;
      if (category && norm(p.category).trim() !== norm(category).trim()) return false;
      if (fabric && !norm(p.fabric).includes(norm(fabric).trim())) return false;
      if (colour && !(p.colours || []).some(c => norm(c).includes(norm(colour).trim()))) return false;
      if (min_price != null && p.price < min_price) return false;
      if (max_price != null && p.price > max_price) return false;
      if (in_stock_only && !(p.stock > 0)) return false;
      if (toks.length) { const h = hay(p); return toks.every(t => h.includes(t)); }
      return true;
    });
    // in-stock first, then cheaper first for browsing queries
    list.sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.price - b.price);
    return list.slice(0, Math.min(Math.max(+limit || 4, 1), 6));
  }

  overview() {
    const cats = {};
    for (const p of this.products) { (cats[p.category] ||= { n: 0, min: Infinity, max: 0 }); const c = cats[p.category]; c.n++; c.min = Math.min(c.min, p.price); c.max = Math.max(c.max, p.price); }
    return { total_products: this.products.length, sarees: this.products.filter(p => p.type !== 'accessory').length, accessories: this.products.filter(p => p.type === 'accessory').length, categories: Object.entries(cats).map(([name, c]) => ({ name, count: c.n, price_from_inr: c.min, price_to_inr: c.max })) };
  }

  policiesText(fallback = '') {
    const P = this.policies, parts = [];
    const add = (k, label) => { if (P[k] && String(P[k]).trim()) parts.push(`${label}: ${String(P[k]).trim()}`); };
    add('shipping', 'Shipping'); add('returns', 'Returns and exchanges'); add('payment', 'Payment'); add('care', 'Fabric care'); add('timings', 'Shop timings'); add('custom', 'Other');
    const s = this.shop;
    if (s.address) parts.push(`Shop address: ${s.address}`);
    if (s.phone) parts.push(`Shop phone: ${s.phone}`);
    return parts.length ? parts.join('\n') : fallback;
  }
}
