// ================= DATABASE =================
const defaultDB = {
  settings: { businessName: 'Anitha Pemmasani', gstNumber: '36AABCU9603R1ZM', address: 'Hyderabad, Telangana, India', phone: '+91 98496 46440', email: 'admin@anitapemmasani.com', bankName: 'HDFC Bank', accountNumber: '50100123456789', ifscCode: 'HDFC0001234', invoicePrefix: 'AP-INV', gstRate: 5, adminPin: '1234', siteUrl: '', metaDescription: 'Anitha Pemmasani – pure handloom sarees from Hyderabad: Tussar, Maheshwari, Banarasi, Kanjeevaram, Paithani, Mysore silk and Ponduru Khadi. Free shipping above ₹10,000.', aiEndpoint: '', otpEndpoint: '', autoApproveReviews: false, waNumber: '', waChatOn: true, waGreeting: '', assistantUrl: '', waAutoPublish: false, delivery: null, giftWrapFee: 0, waPolicies: { shipping: 'Free shipping on orders above ₹10,000.', returns: '', payment: '', care: '', timings: '', custom: '' }, dispatchTime: '3–7 business days', returnDays: 7, grievanceOfficer: '', selectedTemplate: 'template-1', templateCustom: { headerText: 'Thank you for your purchase!', footerText: 'Computer-generated invoice.', termsText: 'Goods once sold will not be taken back.', primaryColor: '#A67C52', secondaryColor: '#2C2C2C', showLogo: true, showBankDetails: true, showGstBreakdown: true, signatureLine: true, signatureName: 'Anitha Pemmasani', signatureTitle: 'Proprietor' } },
  categories: ['Tussar', 'Maheswari', 'Banarasi', 'Kanjeevaram', 'Ponduru Khadi', 'Paithani', 'Mysore Silk'],
  // Accessories are ordinary products whose category is listed here (see isAccessory)
  accessoryCategories: ['Jewellery', 'Blouses & Fabric', 'Bags & Potlis'],
  products: [
    { id: 'p1', sku: 'AP-TUS-001', name: 'Maroon Kalamkari Tussar', category: 'Tussar', price: 45999, stock: 5, threshold: 2, images: ['https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600'], image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=600', description: 'Pure handloom Tussar silk with intricate Kalamkari border.', video: null, rating: 4.8, reviews: 24, isNew: true },
    { id: 'p2', sku: 'AP-TUS-002', name: 'Mustard Peacock Tussar', category: 'Tussar', price: 42500, stock: 3, threshold: 2, images: ['https://images.unsplash.com/photo-1596205849889-98e400c784c1?q=80&w=600'], image: 'https://images.unsplash.com/photo-1596205849889-98e400c784c1?q=80&w=600', description: 'Vibrant mustard Tussar with peacock motif.', video: null, rating: 4.5, reviews: 18, isNew: true },
    { id: 'p3', sku: 'AP-MHS-001', name: 'Pure Maheswari Silk', category: 'Maheswari', price: 18500, stock: 8, threshold: 2, images: ['https://images.unsplash.com/photo-1583391733958-e04f9715d184?q=80&w=600'], image: 'https://images.unsplash.com/photo-1583391733958-e04f9715d184?q=80&w=600', description: 'Classic Maheswari silk with custom blouse piece.', video: null, rating: 4.9, reviews: 42, isNew: true },
    { id: 'p4', sku: 'AP-BNR-001', name: 'Reddish Orange Banarasi', category: 'Banarasi', price: 37999, stock: 1, threshold: 2, images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600'], image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600', description: 'Rich Banarasi silk with cutwork Jamdani.', video: null, rating: 4.7, reviews: 31, isNew: true },
    { id: 'p5', sku: 'AP-KNC-001', name: 'Royal Red Kanjeevaram', category: 'Kanjeevaram', price: 85000, stock: 0, threshold: 2, images: ['https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?q=80&w=600'], image: 'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?q=80&w=600', description: 'Bridal Kanjeevaram with heavy gold zari.', video: null, rating: 5.0, reviews: 56, isNew: true },
    { id: 'p6', sku: 'AP-PHT-001', name: 'Ivory Gold Paithani', category: 'Paithani', price: 62000, stock: 2, threshold: 2, images: ['https://images.unsplash.com/photo-1610189012906-4b2a8f8e0c9b?q=80&w=600'], image: 'https://images.unsplash.com/photo-1610189012906-4b2a8f8e0c9b?q=80&w=600', description: 'Traditional Paithani silk with peacock motif.', video: null, rating: 4.6, reviews: 15, isNew: true },
    { id: 'p7', sku: 'AP-MYS-001', name: 'Forest Green Mysore Silk', category: 'Mysore Silk', price: 28500, stock: 5, threshold: 2, images: ['https://images.unsplash.com/photo-1602161490280-093915e84362?q=80&w=600'], image: 'https://images.unsplash.com/photo-1602161490280-093915e84362?q=80&w=600', description: 'Classic Mysore silk in deep forest green.', video: null, rating: 4.4, reviews: 22, isNew: true },
    { id: 'p8', sku: 'AP-KHD-001', name: 'Coral Ponduru Khadi', category: 'Ponduru Khadi', price: 15800, stock: 7, threshold: 2, images: ['https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=600'], image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=600', description: 'Hand-spun Ponduru Khadi cotton in coral pink.', video: null, rating: 4.8, reviews: 38, isNew: true },
    { id: 'p9', sku: 'AP-ACC-001', name: 'Temple Jhumka Earrings', category: 'Jewellery', price: 1499, stock: 12, threshold: 2, images: ['data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2YzZTNjMycvPjxjaXJjbGUgY3g9JzIwMCcgY3k9JzIzMCcgcj0nOTAnIGZpbGw9J25vbmUnIHN0cm9rZT0nI2E4NzQxYScgc3Ryb2tlLXdpZHRoPScxNCcvPjxjaXJjbGUgY3g9JzIwMCcgY3k9JzE0MCcgcj0nMTgnIGZpbGw9JyNhODc0MWEnLz48L3N2Zz4='], image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2YzZTNjMycvPjxjaXJjbGUgY3g9JzIwMCcgY3k9JzIzMCcgcj0nOTAnIGZpbGw9J25vbmUnIHN0cm9rZT0nI2E4NzQxYScgc3Ryb2tlLXdpZHRoPScxNCcvPjxjaXJjbGUgY3g9JzIwMCcgY3k9JzE0MCcgcj0nMTgnIGZpbGw9JyNhODc0MWEnLz48L3N2Zz4=', description: 'Temple Jhumka Earrings - a handpicked accessory to complete your saree look.', tags: ['accessory'] },
    { id: 'p10', sku: 'AP-ACC-002', name: 'Antique Gold Bangles (Set of 4)', category: 'Jewellery', price: 2299, stock: 6, threshold: 2, images: ['data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2VmZTBkMCcvPjxlbGxpcHNlIGN4PScyMDAnIGN5PScyNTAnIHJ4PScxMTAnIHJ5PSc2MCcgZmlsbD0nbm9uZScgc3Ryb2tlPScjYjQ2OTFiJyBzdHJva2Utd2lkdGg9JzE4Jy8+PGVsbGlwc2UgY3g9JzIwMCcgY3k9JzI1MCcgcng9JzgwJyByeT0nNDAnIGZpbGw9J25vbmUnIHN0cm9rZT0nI2I0NjkxYicgc3Ryb2tlLXdpZHRoPSc4Jy8+PC9zdmc+'], image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2VmZTBkMCcvPjxlbGxpcHNlIGN4PScyMDAnIGN5PScyNTAnIHJ4PScxMTAnIHJ5PSc2MCcgZmlsbD0nbm9uZScgc3Ryb2tlPScjYjQ2OTFiJyBzdHJva2Utd2lkdGg9JzE4Jy8+PGVsbGlwc2UgY3g9JzIwMCcgY3k9JzI1MCcgcng9JzgwJyByeT0nNDAnIGZpbGw9J25vbmUnIHN0cm9rZT0nI2I0NjkxYicgc3Ryb2tlLXdpZHRoPSc4Jy8+PC9zdmc+', description: 'Antique Gold Bangles (Set of 4) - a handpicked accessory to complete your saree look.', tags: ['accessory'] },
    { id: 'p11', sku: 'AP-ACC-003', name: 'Readymade Silk Blouse - Maroon', category: 'Blouses & Fabric', price: 1899, stock: 9, threshold: 2, images: ['data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2YxZDlkOScvPjxwYXRoIGQ9J00xMTAgMTUwIEwxNzAgMTIwIEwyMzAgMTIwIEwyOTAgMTUwIEwyNjAgMzMwIEwxNDAgMzMwIFonIGZpbGw9JyM3YTFmMmInLz48L3N2Zz4='], image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2YxZDlkOScvPjxwYXRoIGQ9J00xMTAgMTUwIEwxNzAgMTIwIEwyMzAgMTIwIEwyOTAgMTUwIEwyNjAgMzMwIEwxNDAgMzMwIFonIGZpbGw9JyM3YTFmMmInLz48L3N2Zz4=', description: 'Readymade Silk Blouse - Maroon - a handpicked accessory to complete your saree look.', tags: ['accessory'] },
    { id: 'p12', sku: 'AP-ACC-004', name: 'Zari Potli Bag', category: 'Bags & Potlis', price: 999, stock: 15, threshold: 2, images: ['data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2U0ZWFkZicvPjxyZWN0IHg9JzExMCcgeT0nMjEwJyB3aWR0aD0nMTgwJyBoZWlnaHQ9JzE1MCcgcng9JzE0JyBmaWxsPScjM2Y1ZDNhJy8+PHBhdGggZD0nTTE1MCAyMTAgQzE1MCAxMzAgMjUwIDEzMCAyNTAgMjEwJyBmaWxsPSdub25lJyBzdHJva2U9JyMzZjVkM2EnIHN0cm9rZS13aWR0aD0nMTInLz48L3N2Zz4='], image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0MDAgNTAwJz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzUwMCcgZmlsbD0nI2U0ZWFkZicvPjxyZWN0IHg9JzExMCcgeT0nMjEwJyB3aWR0aD0nMTgwJyBoZWlnaHQ9JzE1MCcgcng9JzE0JyBmaWxsPScjM2Y1ZDNhJy8+PHBhdGggZD0nTTE1MCAyMTAgQzE1MCAxMzAgMjUwIDEzMCAyNTAgMjEwJyBmaWxsPSdub25lJyBzdHJva2U9JyMzZjVkM2EnIHN0cm9rZS13aWR0aD0nMTInLz48L3N2Zz4=', description: 'Zari Potli Bag - a handpicked accessory to complete your saree look.', tags: ['accessory'] },
  ],
  users: [
    { id: 'u1', name: 'Priya Ramakrishnan', phone: '+919876543210', email: 'priya.r@example.com', joined: '2025-08-12', status: 'VIP', address: '12 Banjara Hills, Hyderabad' },
    { id: 'u2', name: 'Meera Krishnamurthy', phone: '+919876543211', email: 'meera.k@example.com', joined: '2025-09-05', status: 'VIP', address: '45 Indiranagar, Bangalore' },
    { id: 'u3', name: 'Sneha Menon', phone: '+919876543212', email: 'sneha.m@example.com', joined: '2026-01-15', status: 'Regular', address: '78 Edgewater, New Jersey, USA' }
  ],
  orders: [
    { id: 'AP-20261009-X7K2M', userId: 'u1', customer: 'Priya Ramakrishnan', phone: '+919876543210', email: 'priya.r@example.com', total: 46198, status: 'placed', date: '2026-10-09', items: [{ productId: 'p1', name: 'Maroon Kalamkari Tussar', sku: 'AP-TUS-001', quantity: 1, price: 45999, image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=100', category: 'Tussar' }], shippingAddress: { name: 'Priya Ramakrishnan', phone: '+919876543210', street: '12 Banjara Hills Road No. 12', city: 'Hyderabad', state: 'Telangana', pincode: '500034', country: 'India' }, payment: { method: 'UPI', provider: 'Razorpay', paymentId: 'pay_NxK8mP2qR7vL3w', status: 'paid', paidAt: '2026-10-09' }, pricing: { subtotal: 45999, shipping: 199, discount: 0, total: 46198 }, timeline: [{ status: 'placed', time: '2026-10-09 10:23', note: 'Order placed successfully' }], invoiceGenerated: false },
    { id: 'AP-20261008-A9B3C', userId: 'u2', customer: 'Meera Krishnamurthy', phone: '+919876543211', email: 'meera.k@example.com', total: 85199, status: 'confirmed', date: '2026-10-08', items: [{ productId: 'p5', name: 'Royal Red Kanjeevaram', sku: 'AP-KNC-001', quantity: 1, price: 85000, image: 'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=100', category: 'Kanjeevaram' }], shippingAddress: { name: 'Meera Krishnamurthy', phone: '+919876543211', street: '45 Indiranagar 100ft Road', city: 'Bangalore', state: 'Karnataka', pincode: '560038', country: 'India' }, payment: { method: 'Credit Card', provider: 'Razorpay', paymentId: 'pay_MxJ7nQ1pS6uK2v', status: 'paid', paidAt: '2026-10-08' }, pricing: { subtotal: 85000, shipping: 199, discount: 0, total: 85199 }, timeline: [{ status: 'placed', time: '2026-10-08 14:15', note: 'Order placed' }, { status: 'confirmed', time: '2026-10-08 15:30', note: 'Order confirmed by admin' }], invoiceGenerated: true, invoiceId: 'AP-INV-001' },
    { id: 'AP-20260915-M3N4P', userId: 'u1', customer: 'Priya Ramakrishnan', phone: '+919876543210', email: 'priya.r@example.com', total: 56499, status: 'delivered', date: '2026-09-15', items: [{ productId: 'p4', name: 'Reddish Orange Banarasi', sku: 'AP-BNR-001', quantity: 1, price: 37999, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100', category: 'Banarasi' }, { productId: 'p3', name: 'Pure Maheswari Silk', sku: 'AP-MHS-001', quantity: 1, price: 18500, image: 'https://images.unsplash.com/photo-1583391733958-e04f9715d184?w=100', category: 'Maheswari' }], shippingAddress: { name: 'Priya Ramakrishnan', phone: '+919876543210', street: '12 Banjara Hills Road No. 12', city: 'Hyderabad', state: 'Telangana', pincode: '500034', country: 'India' }, payment: { method: 'Credit Card', provider: 'Razorpay', paymentId: 'pay_KxH5lM1nO4pQ2r', status: 'paid', paidAt: '2026-09-15' }, pricing: { subtotal: 56499, shipping: 0, discount: 0, total: 56499 }, timeline: [{ status: 'delivered', time: '2026-09-18', note: 'Delivered' }], invoiceGenerated: true, invoiceId: 'AP-INV-002' },
    { id: 'AP-20260820-A1B2C', userId: 'u3', customer: 'Sneha Menon', phone: '+919876543212', email: 'sneha.m@example.com', total: 42699, status: 'delivered', date: '2026-08-20', items: [{ productId: 'p2', name: 'Mustard Peacock Tussar', sku: 'AP-TUS-002', quantity: 1, price: 42500, image: 'https://images.unsplash.com/photo-1596205849889-98e400c784c1?w=100', category: 'Tussar' }], shippingAddress: { name: 'Sneha Menon', phone: '+919876543212', street: '78 Edgewater', city: 'New Jersey', state: 'NJ', pincode: '07020', country: 'USA' }, payment: { method: 'UPI', provider: 'Razorpay', paymentId: 'pay_JwG4kL0mN3oP1q', status: 'paid', paidAt: '2026-08-20' }, pricing: { subtotal: 42500, shipping: 199, discount: 0, total: 42699 }, timeline: [{ status: 'delivered', time: '2026-08-23', note: 'Delivered' }], invoiceGenerated: true, invoiceId: 'AP-INV-003' },
    { id: 'AP-20260510-D5E6F', userId: 'u2', customer: 'Meera Krishnamurthy', phone: '+919876543211', email: 'meera.k@example.com', total: 62199, status: 'delivered', date: '2026-05-10', items: [{ productId: 'p6', name: 'Ivory Gold Paithani', sku: 'AP-PHT-001', quantity: 1, price: 62000, image: 'https://images.unsplash.com/photo-1610189012906-4b2a8f8e0c9b?w=100', category: 'Paithani' }], shippingAddress: { name: 'Meera Krishnamurthy', phone: '+919876543211', street: '45 Indiranagar', city: 'Bangalore', state: 'Karnataka', pincode: '560038', country: 'India' }, payment: { method: 'UPI', provider: 'Razorpay', paymentId: 'pay_LwI6mO0oR5tJ1u', status: 'paid', paidAt: '2026-05-10' }, pricing: { subtotal: 62000, shipping: 199, discount: 0, total: 62199 }, timeline: [{ status: 'delivered', time: '2026-05-13', note: 'Delivered' }], invoiceGenerated: true, invoiceId: 'AP-INV-004' }
  ],
  invoices: [],
  logs: [
    { id: 1, type: 'stock_out', product: 'Royal Red Kanjeevaram', sku: 'AP-KNC-001', change: -1, prev: 1, curr: 0, reason: 'Order AP-20261008-A9B3C', time: '2026-10-08 15:30' },
    { id: 2, type: 'invoice_sent', product: 'AP-INV-001', sku: '-', change: 0, prev: 0, curr: 0, reason: 'Invoice sent to Meera Krishnamurthy', time: '2026-10-08 15:30' }
  ],
  coupons: [
    { code: 'WELCOME10', discount: 10, type: 'percent', active: true, description: '10% off your first order', firstOrderOnly: true, oncePerCustomer: true },
    { code: 'FESTIVE20', discount: 20, type: 'percent', active: true, description: '20% festive discount', announce: true },
    { code: 'FLAT500', discount: 500, type: 'flat', active: true, description: '₹500 flat discount', minOrder: 3000 }
  ],
  drafts: [],
  consentLog: [],
  home: defaultHome(),
  reviews: [],
  stockAlerts: [],
  outbox: [],
  similarAlerts: [],
  bundles: [
    { id: 'b1', name: 'Tussar + Temple Jhumka', productIds: ['p1', 'p9'], type: 'percent', value: 10, active: true }
  ],
  accessorySeeded: true
};

// Make sure every order that claims an invoice actually has one, and that all collections exist.
function normalizeDB(d) {
  const base = JSON.parse(JSON.stringify(defaultDB)); if (!d.pages) d.pages = defaultPages();
  ['settings', 'categories', 'accessoryCategories', 'products', 'users', 'orders', 'invoices', 'logs', 'coupons', 'drafts', 'consentLog', 'home', 'reviews', 'stockAlerts', 'outbox', 'similarAlerts', 'bundles'].forEach(k => { if (d[k] === undefined || d[k] === null) d[k] = base[k]; });
  // one-time: add the demo accessories to a store saved before accessories existed
  if (!d.accessorySeeded) { d.accessorySeeded = true; if (!d.products.some(p => d.accessoryCategories.includes(p.category))) base.products.filter(p => d.accessoryCategories.includes(p.category) && !d.products.some(x => x.id === p.id || x.sku === p.sku)).forEach(p => d.products.push(p)); }
  d.settings = { ...base.settings, ...d.settings, templateCustom: { ...base.settings.templateCustom, ...(d.settings.templateCustom || {}) } };
  d.orders.forEach(o => {
    if (o.invoiceGenerated && o.invoiceId && !d.invoices.some(i => i.id === o.invoiceId)) {
      d.invoices.push({ id: o.invoiceId, orderId: o.id, customer: o.customer, email: o.email || '', phone: o.phone, amount: o.total, date: o.date, status: 'sent', template: d.settings.selectedTemplate, items: o.items, shippingAddress: o.shippingAddress, pricing: o.pricing });
    }
  });
  return d;
}

let db = normalizeDB((BUILD === 'admin' ? null : safeParse('ap_db_v70', null)) || JSON.parse(JSON.stringify(defaultDB)));
// The hosted builds never carry the demo PIN or bank details; the public site never carries demo customers or orders either.
if (BUILD !== 'dev') { ['adminPin', 'bankName', 'accountNumber', 'ifscCode', 'otpEndpoint', 'aiEndpoint', 'assistantUrl'].forEach(k => { delete db.settings[k]; }); delete db.settings.ai; }
if (BUILD === 'site' && window.__SHOP_API) document.documentElement.classList.add('shop-wait');   // the page waits for the server's answer instead of showing an old or sample copy first
if (BUILD === 'site') { const fresh = !safeParse('ap_db_v70', null); if (fresh) { db.users = []; db.orders = []; db.invoices = []; db.logs = []; } }
let cart = safeParse('ap_cart', []);
let favourites = safeParse('ap_favourites', []);
if (!Array.isArray(cart)) cart = [];
if (!Array.isArray(favourites)) favourites = [];
let appliedCoupon = null;
let isAdminView = false;
let currentAdminTab = 'dashboard';
let currentCategory = 'all';
let pendingDraftId = null;


function saveDB() {
  if (BUILD === 'admin') { admQueueSave(); if (typeof waAutoSoon === 'function') waAutoSoon(); return true; }   // the owner app saves to the server, never to this browser
  try { localStorage.setItem('ap_db_v70', JSON.stringify(db)); if (typeof waAutoSoon === 'function') waAutoSoon(); return true; }
  catch (e) { showToast('Storage is full - changes could not be saved. Delete drafts or large images.', 'error'); return false; }
}
function saveCart() { try { localStorage.setItem('ap_cart', JSON.stringify(cart)); } catch (e) {} if (typeof cartTouch === 'function') { cartTouch(); cartSyncSoon(); cartRemRow(); } }
function saveFavs() { try { localStorage.setItem('ap_favourites', JSON.stringify(favourites)); } catch (e) {} }
function resetData() { if (BUILD === 'admin') { alert('Resetting is switched off in the owner app: it would erase the real shop. Use Security & backup → Download backup / Import instead.'); return; } if (confirm('Reset all demo data?')) { db = normalizeDB(JSON.parse(JSON.stringify(defaultDB))); cart = []; favourites = []; saveDB(); saveCart(); saveFavs(); location.reload(); } }

let toastTimer = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.className = 'toast show ' + type;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
function addLog(type, product, sku, change, prev, curr, reason) { db.logs.unshift({ id: Date.now() + Math.random(), type, product, sku, change, prev, curr, reason, time: getTimestamp() }); saveDB(); }

function openModal(htmlContent, wide) { document.getElementById('adminModalBody').innerHTML = htmlContent; document.querySelector('#adminModal .modal-content').style.maxWidth = wide ? '1000px' : '600px'; document.getElementById('adminModal').classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); if (id === 'productModal') afterModalClose(); }

