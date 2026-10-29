import { Pdf } from './pdf.mjs';
import { statesOfPin } from './pincode.mjs';

// GST state codes (first two digits of a GSTIN) for deciding CGST+SGST (same state) or IGST (other state).
const GST_CODE = { '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '36': 'Telangana', '37': 'Andhra Pradesh' };
const rs = n => 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const day = t => new Date(t + 330 * 60000).toISOString().slice(0, 10).split('-').reverse().join('-');

// Prices in this shop include GST, so tax is shown as the part of the total that is GST. Check the figures with your accountant.
export function buildInvoicePdf(o, shop, now = Date.now()) {
  const pr = o.pricing || { subtotal: o.total, discount: 0, shipping: 0, total: o.total }, rate = Number(shop.gstRate) || 0;
  const bill = o.billTo || { name: o.customerName, address: o.address, pincode: o.pincode, city: '', state: '' };
  const sellerState = GST_CODE[String(shop.gstNumber || '').slice(0, 2)] || '', buyerStates = statesOfPin(bill.pincode) || [];
  const intra = sellerState && buyerStates.includes(sellerState);
  const tax = rate ? Math.round(pr.total * rate / (100 + rate) * 100) / 100 : 0, taxable = Math.round((pr.total - tax) * 100) / 100;
  const d = new Pdf();
  d.row(40, shop.name || 'Anitha Pemmasani', 18, true, 22);
  if (shop.address) d.row(40, shop.address, 9, false, 12); if (shop.phone) d.row(40, 'Phone: ' + shop.phone, 9, false, 12); if (shop.gstNumber) d.row(40, 'GSTIN: ' + shop.gstNumber, 9, true, 18);
  d.text(400, 790, 'TAX INVOICE', 14, true);
  d.text(400, 772, 'Invoice no: ' + (o.invoice?.number || '-'), 10); d.text(400, 758, 'Date: ' + day(o.invoice?.issuedAt || o.paidAt || now), 10); d.text(400, 744, 'Order: ' + o.id, 10);
  d.line(40, d.y + 6, 555, d.y + 6, 1); d.y -= 8;
  d.row(40, 'Billed to', 9, true, 13); d.row(40, bill.name || o.customerName, 10, false, 13);
  d.wrap(40, [bill.address, [bill.city, bill.state].filter(Boolean).join(', '), bill.pincode && 'PIN ' + bill.pincode].filter(Boolean).join(', '), 9, 80);
  if (o.phone) d.row(40, 'Phone: +' + String(o.phone).replace(/\D/g, ''), 9, false, 18);
  d.text(40, d.y, 'Item', 9, true); d.text(330, d.y, 'Qty', 9, true); d.text(380, d.y, 'Rate', 9, true); d.text(480, d.y, 'Amount', 9, true); d.y -= 6; d.line(40, d.y + 2, 555, d.y + 2); d.y -= 12;
  for (const i of o.items) { d.text(40, d.y, (i.name + (i.sku ? ' (' + i.sku + ')' : '')).slice(0, 55), 9); d.text(335, d.y, String(i.quantity), 9); d.text(380, d.y, rs(i.price), 9); d.text(480, d.y, rs(i.price * i.quantity), 9); d.y -= 14; if (d.y < 140) d.newPage(); }
  d.line(40, d.y + 6, 555, d.y + 6); d.y -= 8;
  const sum = (label, v, bold = false) => { d.text(330, d.y, label, 9, bold); d.text(480, d.y, v, 9, bold); d.y -= 14; };
  sum('Items total', rs(pr.subtotal)); if (pr.discount) sum('Discount' + (o.coupon ? ' (' + o.coupon.code + ')' : ''), '- ' + rs(pr.discount)); if (pr.giftWrap) sum('Gift wrapping', rs(pr.giftWrap)); sum('Shipping', pr.shipping ? rs(pr.shipping) : 'Free');
  d.line(330, d.y + 8, 555, d.y + 8); d.y -= 2; sum('Total paid', rs(pr.total), true); d.y -= 6;
  if (rate) { d.row(40, `Total includes GST at ${rate}%:`, 9, true, 13); d.row(40, `Taxable value ${rs(taxable)}  |  ` + (intra || !sellerState ? `CGST ${rate / 2}% ${rs(tax / 2)}  +  SGST ${rate / 2}% ${rs(tax / 2)}` : `IGST ${rate}% ${rs(tax)}`), 9, false, 18); }
  d.row(40, `Payment: ${o.payment?.provider || 'online'}${o.payment?.paymentId ? ' / ' + o.payment.paymentId : ''} - paid`, 9, false, 13);
  d.row(40, 'This is a computer generated invoice and needs no signature. Thank you for shopping with us!', 8, false, 12);
  return d.build();
}

export { packingSlipHtml } from './slip.mjs';
