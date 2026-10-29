// Public order-tracking page, reached through an unguessable link in the customer's WhatsApp chat. Shows no phone number or full address.
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = t => t ? new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '';

export function trackPageHtml(o, steps, shop) {
  const gift = o.gift && o.shipTo && o.shipTo.name !== o.customerName ? `Gift for ${esc(o.shipTo.name.split(' ')[0])}` : '';
  const closed = ['expired', 'cancelled'].includes(o.status);
  const cur = steps.findLast ? steps.findLast(s => s.at) : [...steps].reverse().find(s => s.at);
  return `<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content="noindex,nofollow"><title>Order ${esc(o.id)}</title>
<style>:root{--g:#a67c52}*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#faf8f4;color:#2c2c2c}main{max-width:520px;margin:0 auto;padding:18px 16px 40px}h1{font:600 22px Georgia,serif;margin:6px 0 2px}.sub{color:#777;font-size:13px}.card{background:#fff;border:1px solid #e8e2d9;border-radius:12px;padding:16px;margin:14px 0}
ol{list-style:none;margin:0;padding:0}li{display:flex;gap:12px;padding:10px 0;position:relative}li:not(:last-child)::after{content:"";position:absolute;left:11px;top:34px;bottom:-6px;width:2px;background:#e2dccf}li .dot{width:24px;height:24px;border-radius:50%;background:#e2dccf;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px}li.done .dot{background:#2e7d46}li.cur .dot{background:var(--g);box-shadow:0 0 0 4px #a67c5233}li small{color:#888;display:block}li.todo{color:#aaa}a.btn{display:block;text-align:center;background:#2c2c2c;color:#fff;border-radius:10px;padding:13px;text-decoration:none;margin-top:10px}.warn{background:#fdecea;color:#a00;border-radius:10px;padding:12px;font-size:14px}.note{font-size:12px;color:#888;margin-top:20px;text-align:center}</style>
<main><div class=sub>${esc(shop.name || 'Anitha Pemmasani')}</div><h1>Order ${esc(o.id)}</h1><div class=sub>${gift ? gift + ' · ' : ''}${esc(o.items.map(i => i.name + ' × ' + i.quantity).join(', '))}</div>
${closed ? `<div class=warn>This order is ${o.status === 'expired' ? 'no longer active: the payment link expired' : 'closed'}. Message us on WhatsApp if you still want the saree.</div>` : ''}
<div class=card><ol>${steps.map(s => `<li class="${s.at ? (s === cur ? 'cur' : 'done') : 'todo'}"><span class=dot>${s.at ? '✓' : ''}</span><div>${esc(s.label)}${s.at ? `<small>${esc(when(s.at))}</small>` : ''}</div></li>`).join('')}</ol></div>
${o.delivery?.serviceable && !['delivered', ...(closed ? ['x'] : [])].includes(o.status) && !closed ? `<div class=card><b>${esc(o.delivery.label)}</b><div class=sub>Counted from the day of payment. Sundays are not counted.</div></div>` : ''}
${o.tracking || o.trackingUrl ? `<div class=card><b>Courier</b><div>${esc(o.tracking || '')}</div>${/^https?:\/\//i.test(o.trackingUrl || '') ? `<a class=btn href="${esc(o.trackingUrl)}" rel="noopener">Track with the courier</a>` : ''}</div>` : ''}
${o.shipTo ? `<div class=card><b>Delivering to</b><div class=sub>${esc(o.shipTo.city || '')} ${esc(o.shipTo.pincode || '')}</div></div>` : ''}
<div class=note>Questions? Reply to our WhatsApp message and we will help.<br>${esc(shop.name || '')} is a small business. This page is private to you.</div></main></html>`;
}
