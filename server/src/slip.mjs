// GENERATED from shared/slip-core.js by tools/sync-shared.py. Do not edit here.
// Packing slip, shared by the store (Orders → Slip) and the assistant server. Edit here, then `python3 tools/sync-shared.py`.
// Order shape: { id, customerName, items:[{name, sku, quantity}], shipTo:{name,address,city,state,pincode,phone}, gift:{wrap,note,hideSender} }
// No prices ever appear on the slip, and the buyer's name is left out when the sender is hidden.
function packingSlipHtml(o, shop) {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const to = o.shipTo || {}, g = o.gift || {};
  return `<!doctype html><meta charset=utf-8><title>Packing slip ${esc(o.id)}</title><style>body{font:15px/1.5 system-ui,sans-serif;max-width:640px;margin:20px auto;padding:0 16px}h2{margin:0}.box{border:2px solid #000;padding:14px;margin:12px 0}.small{color:#555;font-size:12px}.note{border:2px dashed #a67c52;padding:14px;font-size:18px;font-family:Georgia,serif;margin:14px 0}@media print{button{display:none}}</style>
<button onclick="print()">Print</button><h2>${esc((shop && shop.name) || 'Anitha Pemmasani')}</h2><div class=small>Order ${esc(o.id)}${g.wrap ? ' · 🎁 GIFT WRAP' : ''}</div>
<div class=box><b>DELIVER TO</b><br>${esc(to.name)}<br>${esc(to.address)}${to.city ? ', ' + esc(to.city) : ''}<br>${to.state ? esc(to.state) + ' ' : ''}PIN ${esc(to.pincode)}<br>${to.phone ? 'Phone: +' + esc(String(to.phone).replace(/\D/g, '')) : ''}</div>
<div class=small>${g.hideSender ? 'SENDER HIDDEN: do not include the invoice, prices or the buyer\'s name in the parcel.' : 'From: ' + esc(o.customerName)}</div>
<ul>${(o.items || []).map(i => `<li>${esc(i.name)} ${i.sku ? '(' + esc(i.sku) + ')' : ''} × ${i.quantity}</li>`).join('')}</ul>
${g.note ? `<div class=note>${esc(g.note).replace(/\n/g, '<br>')}</div>` : ''}${g.wrap ? '<div class=small>Gift wrap this parcel. Add the note card above.</div>' : ''}`;
}

export { packingSlipHtml };
