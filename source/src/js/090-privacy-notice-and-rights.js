// ================= Privacy notice and rights (DPDP Act 2023) =================
const NOTICE_VERSION = '2.0';
const NOTICE = {
  en: { tab: 'English', title: 'Privacy notice', intro: 'This tells you, in plain words, what we do with your personal data. Please read it before you continue.', age: 'This shop is for people who are 18 years or older.',
    items: [['What we collect', 'Your name, WhatsApp/mobile number, delivery address, PIN code and (optional) email; what you order and pay; the messages you send to our WhatsApp assistant; reviews and photos you post; your choices about messages. We count visits to the website anonymously, with no cookies and no personal details.'],
      ['Why we use it', 'To create your profile and sign you in with a WhatsApp code; to take, pack, deliver and invoice your orders; to answer your questions; to send order updates, offers and cart reminders only if you agreed; to follow tax and accounting law; to keep the shop safe.'],
      ['Who it goes to', 'WhatsApp (Meta) to send messages; our payment partner (Razorpay) for payments; couriers and India Post to deliver; our website hosting company; an AI service (Anthropic, outside India) that helps us draft replies (your phone number is not sent). We never sell your data.'],
      ['How long we keep it', 'Your profile until you ask us to erase it; WhatsApp chats about 90 days after the last message; carts 30 days; order and invoice records as long as tax law requires (about 6 years), then they are erased. If you ask us to stop messaging you, we keep only your number on a do-not-message list.'],
      ['Your rights', 'You can see a summary of your data, correct it, ask us to erase it, withdraw your consent, nominate someone to act for you, and complain. Use My Account → Your privacy rights, or the "Your privacy rights" form on this site. We reply within 30 days.'],
      ['Complaints', 'Write to our grievance contact shown below. If we do not solve it, you can complain to the Data Protection Board of India.']] },
  te: { tab: 'తెలుగు', title: 'గోప్యతా నోటీసు', intro: 'మీ వ్యక్తిగత సమాచారంతో మేము ఏమి చేస్తామో ఇక్కడ సులభంగా చెప్పాము. కొనసాగే ముందు దయచేసి చదవండి.', age: 'ఈ దుకాణం 18 ఏళ్లు నిండిన వారి కోసం.',
    items: [['మేము ఏ సమాచారం తీసుకుంటాము', 'మీ పేరు, వాట్సాప్/మొబైల్ నంబర్, డెలివరీ చిరునామా, పిన్ కోడ్, (ఐచ్ఛికంగా) ఈమెయిల్; మీరు ఆర్డర్ చేసినవి, చెల్లింపు వివరాలు; మా వాట్సాప్ అసిస్టెంట్‌కు మీరు పంపిన సందేశాలు; మీరు రాసిన రివ్యూలు, ఫోటోలు; సందేశాల గురించి మీ ఎంపికలు. వెబ్‌సైట్ సందర్శనలను కుకీలు లేకుండా, పేరు లేకుండా లెక్కిస్తాము.'],
      ['ఎందుకు వాడతాము', 'మీ ప్రొఫైల్ సృష్టించడానికి, వాట్సాప్ కోడ్‌తో సైన్ ఇన్ చేయడానికి; మీ ఆర్డర్లను స్వీకరించి, ప్యాక్ చేసి, పంపి, ఇన్‌వాయిస్ ఇవ్వడానికి; మీ ప్రశ్నలకు సమాధానం ఇవ్వడానికి; మీరు అంగీకరిస్తే మాత్రమే ఆర్డర్ అప్‌డేట్లు, ఆఫర్లు, కార్ట్ రిమైండర్లు పంపడానికి; పన్ను, అకౌంటింగ్ చట్టాలను పాటించడానికి.'],
      ['ఎవరికి వెళ్తుంది', 'సందేశాల కోసం వాట్సాప్ (మెటా); చెల్లింపుల కోసం పేమెంట్ భాగస్వామి (Razorpay); డెలివరీ కోసం కొరియర్లు, ఇండియా పోస్ట్; మా హోస్టింగ్ సంస్థ; సమాధానాల డ్రాఫ్ట్ రాయడంలో సహాయపడే AI సేవ (Anthropic, భారతదేశం వెలుపల; మీ ఫోన్ నంబర్ పంపము). మీ సమాచారాన్ని మేము ఎప్పుడూ అమ్మము.'],
      ['ఎంతకాలం ఉంచుతాము', 'మీరు తొలగించమని అడిగే వరకు మీ ప్రొఫైల్; వాట్సాప్ చాట్లు చివరి సందేశం తర్వాత సుమారు 90 రోజులు; కార్ట్ 30 రోజులు; ఆర్డర్, ఇన్‌వాయిస్ రికార్డులు పన్ను చట్టం కోరినంత కాలం (సుమారు 6 సంవత్సరాలు), తర్వాత తొలగిస్తాము. సందేశాలు ఆపమని మీరు అడిగితే, మీ నంబర్‌ను మాత్రమే "సందేశాలు పంపకూడదు" జాబితాలో ఉంచుతాము.'],
      ['మీ హక్కులు', 'మీ సమాచార సారాంశం చూడవచ్చు, సరిదిద్దవచ్చు, తొలగించమని అడగవచ్చు, సమ్మతిని ఉపసంహరించవచ్చు, మీ తరఫున మరొకరిని నియమించవచ్చు, ఫిర్యాదు చేయవచ్చు. My Account → "మీ గోప్యతా హక్కులు" లేదా ఈ సైట్‌లోని "మీ గోప్యతా హక్కులు" ఫారం వాడండి. 30 రోజుల్లో సమాధానం ఇస్తాము.'],
      ['ఫిర్యాదులు', 'దిగువ ఉన్న మా ఫిర్యాదుల సంప్రదింపు వ్యక్తికి రాయండి. మేము పరిష్కరించకపోతే, భారత డేటా ప్రొటెక్షన్ బోర్డుకు ఫిర్యాదు చేయవచ్చు.']] },
  hi: { tab: 'हिन्दी', title: 'गोपनीयता सूचना', intro: 'हम आपकी निजी जानकारी के साथ क्या करते हैं, यह यहाँ सरल शब्दों में बताया गया है। आगे बढ़ने से पहले कृपया पढ़ें।', age: 'यह दुकान 18 वर्ष या उससे अधिक आयु के लोगों के लिए है।',
    items: [['हम क्या जानकारी लेते हैं', 'आपका नाम, WhatsApp/मोबाइल नंबर, डिलीवरी का पता, पिन कोड, (वैकल्पिक) ईमेल; आपके ऑर्डर और भुगतान का विवरण; हमारे WhatsApp असिस्टेंट को भेजे आपके संदेश; आपकी रिव्यू और फ़ोटो; संदेशों के बारे में आपकी पसंद। वेबसाइट की विज़िट हम बिना कुकी और बिना नाम के गिनते हैं।'],
      ['हम इसका उपयोग क्यों करते हैं', 'आपकी प्रोफ़ाइल बनाने और WhatsApp कोड से साइन इन कराने के लिए; आपके ऑर्डर लेने, पैक करने, भेजने और इनवॉइस देने के लिए; आपके सवालों के जवाब के लिए; ऑर्डर अपडेट, ऑफ़र और कार्ट रिमाइंडर केवल तभी जब आप सहमत हों; कर और लेखा कानूनों के पालन के लिए।'],
      ['यह किसे जाती है', 'संदेश भेजने के लिए WhatsApp (Meta); भुगतान के लिए पेमेंट पार्टनर (Razorpay); डिलीवरी के लिए कूरियर और इंडिया पोस्ट; हमारी होस्टिंग कंपनी; जवाब का ड्राफ़्ट लिखने में मदद करने वाली AI सेवा (Anthropic, भारत के बाहर; आपका फ़ोन नंबर नहीं भेजा जाता)। हम आपका डेटा कभी नहीं बेचते।'],
      ['कितने समय रखते हैं', 'प्रोफ़ाइल तब तक जब तक आप मिटाने को न कहें; WhatsApp चैट आख़िरी संदेश के लगभग 90 दिन बाद तक; कार्ट 30 दिन; ऑर्डर और इनवॉइस रिकॉर्ड जितने समय कर कानून माँगता है (लगभग 6 साल), फिर मिटा दिए जाते हैं। यदि आप संदेश बंद करने को कहते हैं, तो हम केवल आपका नंबर "संदेश न भेजें" सूची में रखते हैं।'],
      ['आपके अधिकार', 'आप अपने डेटा का सार देख सकते हैं, सुधार सकते हैं, मिटाने को कह सकते हैं, सहमति वापस ले सकते हैं, अपनी ओर से किसी को नामित कर सकते हैं और शिकायत कर सकते हैं। My Account → "आपके गोपनीयता अधिकार" या इस साइट के "आपके गोपनीयता अधिकार" फ़ॉर्म का उपयोग करें। हम 30 दिनों में जवाब देंगे।'],
      ['शिकायतें', 'नीचे दिए हमारे शिकायत संपर्क को लिखें। समाधान न होने पर आप भारत के डेटा प्रोटेक्शन बोर्ड में शिकायत कर सकते हैं।']] }
};
const RIGHTS_LABEL = { access: 'See a summary of my data', correct: 'Correct my data', erase: 'Erase my data', withdraw: 'Withdraw my consent', nominate: 'Nominate someone to act for me', grievance: 'Make a complaint or ask a question' };
let NOTICE_UI = { lang: 'en', update: false };
function noticeHTML(lang) {
  const NT = NOTICE_UI.version && typeof NOTICE_ARCHIVE !== 'undefined' && NOTICE_ARCHIVE[NOTICE_UI.version] ? NOTICE_ARCHIVE[NOTICE_UI.version].texts : NOTICE, NV = NOTICE_UI.version || NOTICE_VERSION;
  const n = NT[lang] || NT.en, c = legalCtx();
  return `<div class="nt-tabs" role="tablist">${Object.entries(NT).map(([k, v]) => `<button type="button" class="${k === lang ? 'active' : ''}" onclick="noticeLang('${k}')">${v.tab}</button>`).join('')}</div>
    <p class="note" style="margin:6px 0 10px;">${esc(n.intro)}</p>${n.items.map(([h, b]) => `<div class="nt-item"><b>${esc(h)}</b><p>${esc(b)}</p></div>`).join('')}
    <div class="nt-item"><b>${esc(NT.en.items[5][0])} · ${esc(n.items[5][0])}</b><p>${esc(c.officer)} · ${esc(c.email)} · ${esc(c.phone)}</p></div>
    <p class="note"><b>${esc(n.age)}</b></p><p class="note">Version ${NV}. <a onclick="closeModal('noticeModal');openLegalModal('privacy')">Read the full Privacy Policy</a> · <a onclick="closeModal('noticeModal');openRights()">Your privacy rights</a></p>`;
}
function openNotice(lang, update, version) {
  NOTICE_UI = { lang: lang || NOTICE_UI.lang || 'en', update: !!update, version: version || '' }; renderNotice(); el_('noticeModal').classList.add('active');
}
function noticeLang(l) { NOTICE_UI.lang = l; renderNotice(); }
function renderNotice() {
  el_('noticeBody').lang = NOTICE_UI.lang;
  const u = currentUser(), c = (u && u.consents) || {}, upd = NOTICE_UI.update && u;
  el_('noticeBody').innerHTML = `<h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;margin:0 0 4px;">${upd ? 'We have updated our privacy notice' : esc((NOTICE[NOTICE_UI.lang] || NOTICE.en).title)}</h2>${noticeHTML(NOTICE_UI.lang)}
    ${upd ? `<div class="consent-box" id="nt-box">${!u.ageConfirmedAt ? '<label class="chk"><input type="checkbox" id="nt-age"><span>I am <strong>18 years or older</strong>. <em>(required)</em></span></label>' : ''}<div class="consent-sub">WhatsApp messages: your choice, change any time</div>
      <label class="chk"><input type="checkbox" id="nt-orders" ${c.orderUpdates ? 'checked' : ''}><span>Send me <strong>order updates</strong> on WhatsApp.</span></label>
      <label class="chk"><input type="checkbox" id="nt-promos" ${c.marketing ? 'checked' : ''}><span>Send me <strong>offers &amp; new arrivals</strong> on WhatsApp.</span></label></div>
      <button class="btn-full" onclick="noticeAck()">I have read this notice</button>` : ''}`;
}
function noticeAck() {
  const u = currentUser(); if (!u) return; const ageBox = el_('nt-age');
  if (ageBox && !ageBox.checked) { el_('nt-box').classList.add('invalid'); showToast('Please confirm you are 18 or older', 'error'); return; }
  if (ageBox) recordConsent(u, 'age18', true, 'notice');
  [['orderUpdates', 'nt-orders'], ['marketing', 'nt-promos']].forEach(([t, id]) => { const want = el_(id).checked; if (!!u.consents[t] !== want) recordConsent(u, t, want, 'notice'); });
  recordConsent(u, 'notice', true, 'notice'); if (saveDB()) { closeModal('noticeModal'); showToast('Thank you. Your choices are saved.', 'success'); }
}
function maybeUpdatedNotice() { const u = currentUser(); if (u && u.noticeVersion !== NOTICE_VERSION) setTimeout(() => openNotice('en', true), 400); }
// ---- rights requests: a numbered request that reaches the shop, with a 30-day promise ----
function openRights(type) {
  const u = currentUser(); el_('rightsBody').innerHTML = `<h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;margin:0 0 4px;">Your privacy rights</h2>
    <p class="note">Ask to see, correct or erase your data, withdraw your consent, nominate someone to act for you, or make a complaint. We reply within <strong>30 days</strong>. <a onclick="closeModal('rightsModal');openNotice()">Read the privacy notice</a></p>
    <div class="form-group"><label>What would you like to do?</label><select id="rt-type" onchange="rightsHint()">${Object.entries(RIGHTS_LABEL).map(([k, l]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="form-group"><label>Your name *</label><input id="rt-name" value="${esc(u ? u.name || '' : '')}" autocomplete="name"></div>
    <div class="form-group"><label>Phone or email where we can reach you *</label><input id="rt-contact" value="${esc(u ? u.phone || '' : '')}" autocomplete="tel"></div>
    <div class="form-group"><label id="rt-msg-l">Details (optional)</label><textarea id="rt-msg" rows="4" maxlength="1500"></textarea></div>
    <p class="note" id="rt-hint"></p><div id="rt-out"></div><button class="btn-full" id="rt-go" onclick="rightsSubmit()">Send my request</button>`;
  rightsHint(); el_('rightsModal').classList.add('active');
}
function rightsHint() {
  const t = el_('rt-type').value, h = { access: 'We will send you a summary of the data we hold about you and who it was shared with.', correct: 'Tell us what is wrong and what it should say. You can also edit your details in My Account.', erase: 'We will erase your profile and personal details. We must keep invoices for the period tax law requires; those keep only what the law needs and are erased afterwards.', withdraw: 'Tell us which messages to stop. You can also switch them off in My Account or reply STOP.', nominate: 'Write the name and phone number of the person who may use your rights if you cannot.', grievance: 'Tell us what went wrong.' }[t];
  el_('rt-hint').textContent = h; el_('rt-msg-l').textContent = t === 'nominate' ? 'Name and phone number of the person *' : 'Details (optional)';
}
async function rightsSubmit() {
  const b = el_('rt-go'), out = el_('rt-out'), body = { type: el_('rt-type').value, name: el_('rt-name').value.trim(), contact: el_('rt-contact').value.trim(), message: el_('rt-msg').value.trim() };
  if (!body.name) { out.innerHTML = '<div class="auth-err">Please tell us your name.</div>'; return; } if (!/@/.test(body.contact) && body.contact.replace(/\D/g, '').length < 7) { out.innerHTML = '<div class="auth-err">Please give a phone number or email.</div>'; return; } if (body.type === 'nominate' && !body.message) { out.innerHTML = '<div class="auth-err">Please write the name and phone number of the person.</div>'; return; }
  b.disabled = true; out.innerHTML = '<div class="note">Sending…</div>';
  try {
    let j; const api = window.__SHOP_API ? String(window.__SHOP_API).replace(/\/+$/, '') : '';
    if (api) { const r = await fetch(api + '/public/rights', { method: 'POST', body: JSON.stringify(body), credentials: 'omit', headers: { 'content-type': 'text/plain' } }); j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Could not send. Please contact us directly.'); }
    else { db.rightsDemo = db.rightsDemo || []; j = { id: 'DEMO-' + String(db.rightsDemo.length + 1).padStart(4, '0'), due: new Date(Date.now() + 30 * 86400_000).toISOString() }; db.rightsDemo.push({ ...body, ...j, at: new Date().toISOString() }); saveDB(); }
    const u = currentUser(); if (u) { u.rightsRequests = [...(u.rightsRequests || []), { id: j.id, type: body.type, at: new Date().toISOString() }].slice(-20); if (body.type === 'nominate') u.nominee = { text: body.message.slice(0, 200), at: new Date().toISOString() }; if (body.type === 'erase') u.deletionRequestedAt = new Date().toISOString(); saveDB(); }
    out.innerHTML = `<div class="demo-box"><strong>Thank you. Your request number is ${esc(j.id)}.</strong><br>We will reply by ${esc(new Date(j.due).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}. Please keep this number.${api ? '' : '<br><em>Demo: on the live site this reaches the shop owner.</em>'}</div>`; b.style.display = 'none';
    if (body.type === 'erase' && u) { setTimeout(() => { closeModal('rightsModal'); closeModal('accountModal'); logout(); }, 2500); }
  } catch (e) { out.innerHTML = `<div class="auth-err">${esc(e.message)}</div>`; b.disabled = false; }
}
function acctDownload() {
  const u = currentUser(); if (!u) return; const mine = x => x.userId === u.id;
  const data = { about: 'A copy of the data this shop holds about you on this device/site. Chat history on our WhatsApp assistant is held by the shop: ask for it with "See a summary of my data".', exportedAt: new Date().toISOString(), profile: u, orders: db.orders.filter(mine), reviews: db.reviews.filter(mine), stockAlerts: db.stockAlerts.filter(mine), similarAlerts: db.similarAlerts.filter(mine), consentHistory: db.consentLog.filter(mine), noticeVersion: u.noticeVersion || null };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'my-data.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); showToast('Your data was downloaded', 'success');
}
function acctRightsHTML(u) {
  const reqs = (u.rightsRequests || []).slice(-3).reverse();
  return `<h4 class="acct-h" style="margin-top:22px;">Your privacy rights</h4><div class="note">See, correct or erase your data, withdraw consent, nominate someone, or complain. We reply within 30 days.</div>
    <div class="pf-actions" style="margin-top:8px;"><button type="button" class="btn-sm btn-info-sm" onclick="acctDownload()">⬇ Download my data</button><button type="button" class="btn-sm btn-info-sm" onclick="openRights('access')">See what you hold</button><button type="button" class="btn-sm btn-info-sm" onclick="openRights('nominate')">Nominate someone</button><button type="button" class="btn-sm btn-info-sm" onclick="openRights('grievance')">Complain / ask</button><button type="button" class="btn-sm btn-info-sm" onclick="openNotice()">Privacy notice (EN / తెలుగు / हिन्दी)</button></div>
    ${u.nominee ? `<div class="note" style="margin-top:6px;">Nominee: ${esc(u.nominee.text)}</div>` : ''}${reqs.length ? `<div class="note" style="margin-top:6px;">Your requests: ${reqs.map(r => `${esc(r.id)} (${esc(r.type)})`).join(', ')}</div>` : ''}`;
}
function acctDelete() { openRights('erase'); }

// ---- Terms & Conditions / Privacy Policy ----
const legalSec = (id, title, body) => `<section id="${id}"><h3>${title}</h3>${body}</section>`;
function legalCtx() {
  const s = db.settings;
  return { brand: BRAND(), addr: s.address, email: s.email, phone: s.phone, dispatch: s.dispatchTime || '3–7 business days', days: s.returnDays || 7, officer: s.grievanceOfficer || `The Proprietor, ${BRAND()}` };
}
function legalTerms() {
  const c = legalCtx();
  return `<p class="legal-meta">Version ${LEGAL_VERSION}</p>
  <p>These Terms &amp; Conditions govern your use of the ${esc(c.brand)} website and any purchase you make from us. By creating a profile, signing in or placing an order you confirm that you have read and accepted them together with our <a onclick="legalOther('privacy')">Privacy Policy</a>.</p>
  ${legalSec('t-about', '1. Who we are', `<p>${esc(c.brand)} sells handloom sarees from ${esc(c.addr)}. You can reach us at ${esc(c.email)} or ${esc(c.phone)}.</p>`)}
  ${legalSec('t-use', '2. Using the store and your profile', `<p>You must be 18 or older, or use the store with a parent or guardian. Please give accurate details. You sign in with a one-time code sent to your WhatsApp number, so keep your phone secure and tell us at once if you lose access to your number. You are responsible for activity under your profile.</p>`)}
  ${legalSec('t-products', '3. Handloom products', `<p>Handloom sarees are woven by hand. Small differences in weave, slubs, motif placement and shade are natural and are not defects. Photographs and videos are illustrative; colours may look slightly different on your screen. Product availability is limited and shown as accurately as we can.</p>`)}
  ${legalSec('t-price', '4. Prices and payment', `<p>All prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise. Shipping is free on orders above ₹10,000; below that a flat shipping fee is shown at checkout. Coupons are subject to their stated terms and cannot be combined unless we say so. Payments are processed by our payment partner; we do not store your card or UPI details. We may correct a clearly wrong price and, if so, will offer you the choice to confirm the order at the correct price or cancel it for a full refund.</p>`)}
  ${legalSec('t-orders', '5. Orders and cancellation', `<p>Your order is confirmed when we send you an order confirmation. We may decline or cancel an order (for example if an item is no longer available) and will refund anything you have paid. You may cancel an order before it is dispatched by contacting us; refunds go to the original payment method.</p>`)}
  ${legalSec('shipping', '6. Shipping and delivery', `<p>We usually dispatch within ${esc(c.dispatch)} of confirming your order and ship across India and to many countries worldwide. Delivery times depend on the courier and destination. You are responsible for giving a complete and correct address. For international orders, customs duties and import taxes, if any, are payable by you.</p>`)}
  ${legalSec('returns', '7. Returns, exchanges and refunds', `<p>If your saree arrives damaged, defective or different from what you ordered, tell us within <strong>${esc(c.days)} days</strong> of delivery with photos (an unboxing video helps) and we will arrange a replacement, exchange or refund. Items must be unused, unwashed and with original tags. Natural handloom variations and small colour differences due to screen settings are not grounds for return. Sarees that have been altered or stitched at your request cannot be returned. Approved refunds are made to the original payment method within 7–10 working days after we receive and check the item.</p>`)}
  ${legalSec('t-whatsapp', '8. WhatsApp and electronic messages', `<p>We send login codes on WhatsApp so you can sign in. We send order updates and promotional messages only if you have separately agreed to them. You can withdraw that agreement at any time in My Account or by replying STOP, and we will stop. If you ask to be told when a sold-out item is back in stock, we send one message about that item. If you agree to cart reminders, we may send at most two reminders about sarees you left in your cart, never at night, and we stop as soon as you order or reply STOP. If you place an order in a WhatsApp chat with us, we send you a payment link and messages about that order (payment received, shipping) in the same chat; paying through the link means you accept these Terms. Orders cannot be cancelled once placed. Until the parcel is shipped you may correct the delivery address (in My Account or in the chat). If you send a gift, you tell us the recipient's name, phone and address, and we use them only to deliver it; if you ask us to hide your name, we keep your name, the prices and the invoice out of the parcel. WhatsApp is a service of a third party and its own terms apply to your use of it.</p>`)}
  ${legalSec('t-ip', '9. Our content and your reviews', `<p>The photographs, text, videos, designs and logo on this website belong to ${esc(c.brand)} or its licensors. You may share product links, but may not copy or reuse our content commercially without our written permission.</p><p>If you write a review you confirm that it is your honest experience and that you own the photos. You allow us to show your review, photos and the name you choose on this store, and to remove content that is unlawful, abusive or off-topic. Only customers who have received a product can review it.</p>`)}
  ${legalSec('t-liab', '10. Limits of liability', `<p>We take care to describe our products accurately and to keep the website available, but we do not promise that it will be uninterrupted or error-free. To the extent the law allows, our liability for any claim relating to an order is limited to the amount you paid for that order. Nothing in these terms limits your rights under applicable consumer-protection law.</p>`)}
  ${legalSec('t-law', '11. Governing law', `<p>These terms are governed by the laws of India. Courts at Hyderabad, Telangana have jurisdiction, subject to any rights you have as a consumer to approach the forum available to you under law.</p>`)}
  ${legalSec('t-change', '12. Changes and contact', `<p>We may update these terms; the version number above will change and we will ask you to accept the new version at your next order. Questions or complaints: ${esc(c.email)} · ${esc(c.phone)}.</p>`)}`;
}
function legalPrivacy() {
  const c = legalCtx();
  return `<p class="legal-meta">Version ${LEGAL_VERSION}</p>
  <p>${esc(c.brand)} ("we") respects your privacy. This policy explains what personal data we collect when you use our store, why, and the choices and rights you have, in line with the Digital Personal Data Protection Act, 2023 and other applicable Indian law.</p>
  ${legalSec('p-collect', '1. What we collect', `<ul><li><strong>Identity &amp; contact:</strong> your name, WhatsApp/mobile number, and email (optional).</li><li><strong>Delivery details:</strong> address, city, state and pincode.</li><li><strong>Orders:</strong> what you bought, amounts, order status and invoices. Payments are handled by our payment partner; we do not store card or UPI details.</li><li><strong>Your choices:</strong> whether you agreed to the Terms and to each kind of WhatsApp message, with the date and the version you agreed to.</li><li><strong>Gifts and addresses:</strong> your saved addresses, and for gifts the recipient's name, phone and address, which we use only to deliver the parcel and keep for your future orders if you choose "save this address".</li><li><strong>Cart:</strong> if you agree to cart reminders, we keep the sarees in your cart together with your number and name so our system can send you up to two reminders. Withdraw this in My Account or by replying STOP and we delete the saved cart from our reminder system.</li><li><strong>WhatsApp chats:</strong> if you message our WhatsApp number, we keep the conversation (your number, name shown on WhatsApp, and what you write or send) to help you and handle your order. Replies may be written by an automated AI assistant; a person takes over for complaints, refunds and orders. To write replies, your messages and our product details are processed by our AI provider (Anthropic) and WhatsApp (Meta). Send STOP at any time and we will not message you again.</li><li><strong>Reviews and alerts:</strong> reviews you write (rating, text, photos and the name you choose to show) and any back-in-stock alerts you ask for.</li><li><strong>On your device:</strong> your cart, favourites and login session are kept in your browser's local storage so the store works. We do not use advertising or tracking cookies.</li><li><strong>Visit counts:</strong> we count visits to this website anonymously (which page, phone or computer, and where the visitor came from, for example Instagram). This uses no cookies and does not store your IP address, name or any personal detail, and it is switched off if your browser sends “Do Not Track”.</li></ul>`)}
  ${legalSec('p-why', '2. Why we use it', `<ul><li>To create and secure your profile and sign you in with a one-time code on WhatsApp.</li><li>To process, ship, invoice and support your orders, and to meet tax and accounting laws.</li><li>To send order updates on WhatsApp <em>only if you agreed</em>.</li><li>To send offers and new-arrival messages on WhatsApp <em>only if you separately agreed</em>.</li><li>To prevent fraud and keep the store secure.</li></ul><p>We rely on your consent and on what is needed to fulfil your order.</p>`)}
  ${legalSec('p-wa', '3. WhatsApp messages and your permission', `<p>We ask for two separate permissions, and neither is ticked by default: (a) order updates, and (b) offers and new arrivals. Saying no does not stop you buying. Login codes are sent when you ask to sign in. You can change either permission at any time in <strong>My Account</strong>, or reply STOP to any message; the change takes effect immediately and is recorded with its date. If you ask to be told when a sold-out saree is back, you give a separate permission for that single message, and cancelling the alert withdraws it.</p>`)}
  ${legalSec('p-share', '4. Who we share it with', `<p>We do not sell your data. We share only what is needed with the people who help us run the shop, and only for that purpose: <strong>WhatsApp (Meta)</strong> to send the messages you asked for; our payment partner (<strong>Razorpay</strong>) to take payment; <strong>couriers and India Post</strong> to deliver; our website <strong>hosting</strong> provider; and an <strong>AI service (Anthropic, outside India)</strong> that helps us write replies and reports: we do not send your phone number or address to it, only the text of a message or review we are replying to. If you post a review, your review, photos and the name you choose are shown publicly on our store. We may disclose data if the law requires.</p>`)}
  ${legalSec('p-keep', '5. How long we keep it', `<ul><li><strong>Your profile:</strong> until you ask us to erase it.</li><li><strong>WhatsApp chats with our assistant:</strong> about 90 days after the last message, then erased.</li><li><strong>Carts you left:</strong> 30 days.</li><li><strong>Orders and invoices:</strong> as long as tax and accounting laws require (about 6 years). After erasure of your profile they keep only what the law needs, and are then anonymised.</li><li><strong>Consent records:</strong> kept (without your phone number once you erase your profile) so we can show what you agreed to.</li><li><strong>Do-not-message list:</strong> if you ask us to stop messaging you, we keep only your number so that we never message you again.</li></ul>`)}
  ${legalSec('p-rights', '6. Your rights and how to use them', `<p>You may <strong>see a summary of your data</strong> and who it was shared with, <strong>correct</strong> it, <strong>erase</strong> it, <strong>withdraw consent</strong> at any time (as easily as you gave it), <strong>nominate someone</strong> to exercise these rights for you if you die or cannot, and <strong>complain</strong>. Use <strong>My Account → Your privacy rights</strong> (you can also download your data there), or the <a onclick="openRights()">“Your privacy rights” form</a> on this site if you cannot sign in. Every request gets a number, and we answer within <strong>30 days</strong>. We may keep records the law requires, and will tell you if so.</p>`)}
  ${legalSec('p-sec', '7. Security', `<p>We use reasonable safeguards: one-time-code login for customers, password and 2-step sign-in for our team, encrypted connections, encrypted storage of passwords and keys, encrypted backups, activity logs, and limited access. No online service can be completely risk-free. <strong>If a breach affecting you occurs</strong>, we will tell you without delay, say what happened and what you can do, and report it to the Data Protection Board of India as the law requires.</p>`)}
  ${legalSec('p-kids', '8. Age', `<p>Our store is for people who are <strong>18 years or older</strong>, and we ask you to confirm this. We do not knowingly collect data from children. If we learn that someone under 18 has an account, we will erase it. We do not track children or target them with marketing.</p>`)}
  ${legalSec('p-grievance', '9. Grievances and contact', `<p>For questions, complaints or to exercise your rights, contact our grievance officer: <strong>${esc(c.officer)}</strong>, ${esc(c.email)}, ${esc(c.phone)}, ${esc(c.addr)}. We reply within 30 days. If we do not solve your complaint you may complain to the <strong>Data Protection Board of India</strong>.</p>`)}
  ${legalSec('p-change', '10. Changes', `<p>If we change this policy we will update the version above and, where the change is important, ask for your consent again.</p>`)}`;
}
const LEGAL_PAGES = { terms: { title: 'Terms & Conditions', html: legalTerms }, privacy: { title: 'Privacy Policy', html: legalPrivacy } };
function renderLegal(page) { el_('legalModalBody').innerHTML = ''; renderLegalInto('legal-' + page, page); }
function renderLegalInto(boxId, page) {
  const box = el_(boxId); if (!box) return;
  const L = LEGAL_PAGES[page];
  box.innerHTML = `<div class="legal"><h1>${L.title}</h1><div class="legal-toc">${(L.html().match(/<section id="[^"]+"><h3>[^<]+/g) || []).map(m => { const [, id, t] = /id="([^"]+)"><h3>(.+)/.exec(m); return `<a onclick="legalGo('${id}')">${t}</a>`; }).join('')}</div>${L.html()}<p class="legal-meta" style="margin-top:30px;">Also read: <a onclick="legalOther('${page === 'terms' ? 'privacy' : 'terms'}')">${page === 'terms' ? 'Privacy Policy' : 'Terms &amp; Conditions'}</a></p></div>`;
}
function legalGo(id) { const e = el_(id); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function openLegal(page, anchor) {
  ['authModal', 'accountModal', 'checkoutModal', 'productModal', 'shareModal', 'legalModal'].forEach(m => el_(m).classList.remove('active')); clearInterval(AUTH.timer); closeAllDrawers(); closeStoreNav();
  navigateTo(page); if (anchor) setTimeout(() => legalGo(anchor), 60);
}
// Read the policy without leaving checkout / sign-in: shown on top in a window.
function openLegalModal(page, anchor) {
  el_('legal-terms').innerHTML = ''; el_('legal-privacy').innerHTML = '';
  renderLegalInto('legalModalBody', page); el_('legalModal').classList.add('active'); el_('legalModal').querySelector('.modal-content').scrollTop = 0;
  if (anchor) setTimeout(() => legalGo(anchor), 60);
}
function legalOther(page) { if (el_('legalModal').classList.contains('active')) openLegalModal(page); else openLegal(page); }
function legalStaticPage(kind, base) {
  const L = LEGAL_PAGES[kind], url = `${base}/${kind}.html`;
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(L.title)} | ${esc(BRAND())}</title><meta name="description" content="${esc(L.title)} for ${esc(BRAND())}."><link rel="canonical" href="${esc(url)}"><meta name="robots" content="index,follow"><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;line-height:1.7;color:#2c2c2c}h3{margin-top:28px}</style></head><body><header><a href="${esc(base)}/">${esc(BRAND())}</a></header><main><h1>${esc(L.title)}</h1>${L.html().replace(/ onclick="[^"]*"/g, '')}</main></body></html>\n`;
}
function setPageSeo(page) {
  const L = LEGAL_PAGES[page];
  if (L) { document.title = `${L.title} | ${BRAND()}`; if (!PATH_MODE) { try { history.replaceState(null, '', '#/' + page); } catch (e) {} } }
  else if (!PATH_MODE && /^#\/(terms|privacy)$/.test(location.hash)) { document.title = SEO_DEFAULT.title; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
}


function switchCareTab(tabName, btn) {
  const root = btn.closest('.care-content') || document; root.querySelectorAll('.care-section').forEach(x => x.classList.remove('active')); root.querySelectorAll('.care-tab').forEach(t => t.classList.remove('active'));
  const sec = [...root.querySelectorAll('.care-section')].find(x => x.dataset.sec === tabName); if (sec) sec.classList.add('active'); btn.classList.add('active');
  const page = btn.closest('.page'); if (page) { const key = page.id.replace(/^page-/, ''); if (typeof CARE_ACTIVE !== 'undefined') CARE_ACTIVE[key] = tabName; }
}

