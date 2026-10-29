// GENERATED from shared/pincode-core.js by tools/sync-shared.py. Do not edit here.
// Shared by the store (embedded in anitha-store.html) and the assistant server (src/pincode.mjs).
// EDIT ONLY THIS FILE, then run `python3 tools/sync-shared.py`. record-check fails if the copies differ.

// First two digits of an Indian PIN code → the state(s) the post office circle covers (some circles are shared).
const PIN_STATES = {
  '11': ['Delhi'], '12': ['Haryana'], '13': ['Haryana'], '14': ['Punjab'], '15': ['Punjab'], '16': ['Chandigarh', 'Punjab', 'Haryana'], '17': ['Himachal Pradesh'],
  '18': ['Jammu and Kashmir'], '19': ['Jammu and Kashmir', 'Ladakh'],
  '20': ['Uttar Pradesh'], '21': ['Uttar Pradesh'], '22': ['Uttar Pradesh'], '23': ['Uttar Pradesh'], '24': ['Uttar Pradesh', 'Uttarakhand'], '25': ['Uttar Pradesh'], '26': ['Uttar Pradesh', 'Uttarakhand'], '27': ['Uttar Pradesh'], '28': ['Uttar Pradesh'],
  '30': ['Rajasthan'], '31': ['Rajasthan'], '32': ['Rajasthan'], '33': ['Rajasthan'], '34': ['Rajasthan'],
  '36': ['Gujarat'], '37': ['Gujarat'], '38': ['Gujarat'], '39': ['Gujarat', 'Dadra and Nagar Haveli and Daman and Diu'],
  '40': ['Maharashtra', 'Goa'], '41': ['Maharashtra'], '42': ['Maharashtra'], '43': ['Maharashtra'], '44': ['Maharashtra'],
  '45': ['Madhya Pradesh'], '46': ['Madhya Pradesh'], '47': ['Madhya Pradesh'], '48': ['Madhya Pradesh'], '49': ['Chhattisgarh'],
  '50': ['Telangana'], '51': ['Andhra Pradesh'], '52': ['Andhra Pradesh'], '53': ['Andhra Pradesh'],
  '56': ['Karnataka'], '57': ['Karnataka'], '58': ['Karnataka'], '59': ['Karnataka'],
  '60': ['Tamil Nadu', 'Puducherry'], '61': ['Tamil Nadu'], '62': ['Tamil Nadu'], '63': ['Tamil Nadu'], '64': ['Tamil Nadu'],
  '67': ['Kerala'], '68': ['Kerala', 'Lakshadweep'], '69': ['Kerala'],
  '70': ['West Bengal'], '71': ['West Bengal'], '72': ['West Bengal'], '73': ['West Bengal', 'Sikkim'], '74': ['West Bengal', 'Andaman and Nicobar Islands'],
  '75': ['Odisha'], '76': ['Odisha'], '77': ['Odisha'], '78': ['Assam'], '79': ['Arunachal Pradesh', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura'],
  '80': ['Bihar'], '81': ['Bihar', 'Jharkhand'], '82': ['Bihar', 'Jharkhand'], '83': ['Jharkhand'], '84': ['Bihar'], '85': ['Bihar'],
};
const STATE_ALIASES = { telengana: 'Telangana', ts: 'Telangana', tg: 'Telangana', ap: 'Andhra Pradesh', andhra: 'Andhra Pradesh', tn: 'Tamil Nadu', tamilnadu: 'Tamil Nadu', ka: 'Karnataka', kl: 'Kerala', mh: 'Maharashtra', orissa: 'Odisha', pondicherry: 'Puducherry', 'new delhi': 'Delhi', 'nct of delhi': 'Delhi', uttaranchal: 'Uttarakhand', wb: 'West Bengal', up: 'Uttar Pradesh', mp: 'Madhya Pradesh', hp: 'Himachal Pradesh', gj: 'Gujarat', rj: 'Rajasthan', br: 'Bihar', jh: 'Jharkhand', dl: 'Delhi', hr: 'Haryana', pb: 'Punjab', od: 'Odisha', or: 'Odisha', as: 'Assam', jk: 'Jammu and Kashmir', 'jammu kashmir': 'Jammu and Kashmir', 'andaman nicobar islands': 'Andaman and Nicobar Islands' };
const KNOWN_STATES = [...new Set(Object.values(PIN_STATES).flat()), 'Uttarakhand', 'Goa', 'Chandigarh'];
const CITY_STATE = {
  Telangana: 'hyderabad secunderabad warangal karimnagar nizamabad khammam nalgonda mahabubnagar adilabad siddipet', 'Andhra Pradesh': 'vijayawada visakhapatnam vizag guntur tirupati nellore kurnool rajahmundry kakinada anantapur kadapa eluru ongole machilipatnam srikakulam vizianagaram amaravati',
  Karnataka: 'bengaluru bangalore mysuru mysore mangaluru mangalore hubli dharwad belagavi belgaum kalaburagi', 'Tamil Nadu': 'chennai coimbatore madurai trichy tiruchirappalli salem tirunelveli erode vellore tiruppur thanjavur', Kerala: 'kochi cochin thiruvananthapuram trivandrum kozhikode calicut thrissur kollam kannur',
  Maharashtra: 'mumbai pune nagpur nashik thane aurangabad nagpur kolhapur solapur navi', Delhi: 'delhi', 'West Bengal': 'kolkata calcutta howrah siliguri durgapur', Gujarat: 'ahmedabad surat vadodara baroda rajkot gandhinagar', Rajasthan: 'jaipur jodhpur udaipur kota ajmer bikaner',
  'Uttar Pradesh': 'lucknow kanpur varanasi agra noida ghaziabad prayagraj allahabad meerut', Bihar: 'patna gaya muzaffarpur', Odisha: 'bhubaneswar cuttack puri rourkela', 'Madhya Pradesh': 'bhopal indore gwalior jabalpur', Haryana: 'gurgaon gurugram faridabad panipat ambala',
  Jharkhand: 'ranchi jamshedpur dhanbad', Assam: 'guwahati dibrugarh silchar', Goa: 'panaji margao', Chandigarh: 'chandigarh', Puducherry: 'puducherry', Punjab: 'ludhiana amritsar jalandhar patiala', Chhattisgarh: 'raipur bilaspur bhilai', Uttarakhand: 'dehradun haridwar',
};
const _norm = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function normState(s) {
  const n = _norm(String(s || '').replace(/\./g, '')); if (!n) return '';
  if (STATE_ALIASES[n]) return STATE_ALIASES[n];
  return KNOWN_STATES.find(k => _norm(k) === n) || '';
}
function statesOfPin(pin) { return /^[1-9][0-9]{5}$/.test(String(pin || '').trim()) ? (PIN_STATES[String(pin).trim().slice(0, 2)] || null) : null; }
function stateOfCity(city) {
  const words = _norm(city).split(' '); if (!words[0]) return '';
  for (const [st, list] of Object.entries(CITY_STATE)) for (const c of list.split(' ')) if (words.includes(c)) return st;
  return '';
}
// Checks that PIN, city and state agree. `places` (optional) comes from a live PIN lookup: [{name, district, state}].
// status: ok | confirm (ask the customer to confirm) | mismatch (must be corrected) | invalid (not a real PIN)
function addressCheck({ pincode, city = '', state = '', places = null }) {
  const pin = String(pincode || '').replace(/\s/g, '');
  if (!/^[1-9][0-9]{5}$/.test(pin)) return { status: 'invalid', message: 'The PIN code must be 6 digits.' };
  const pinStates = statesOfPin(pin);
  if (!pinStates) return { status: 'invalid', message: `PIN code ${pin} does not look like a real Indian PIN code.` };
  const where = pinStates.join(' / ');
  const st = normState(state);
  if (state && !st) return { status: 'confirm', pinStates, message: `PIN ${pin} is in ${where}. I could not recognise the state "${state}". Is the address correct?` };
  if (st && !pinStates.includes(st)) return { status: 'mismatch', pinStates, message: `PIN ${pin} belongs to ${where}, but the state says ${st}. Please check the PIN code and state.` };
  const cs = stateOfCity(city);
  if (cs && !pinStates.includes(cs)) return { status: 'mismatch', pinStates, message: `${city.trim()} is in ${cs}, but PIN ${pin} belongs to ${where}. Please check the PIN code and city.` };
  if (places && places.length) {
    const c = _norm(city), hit = c && places.some(p => [p.name, p.district, p.block, p.division, p.region].some(x => x && (_norm(x).includes(c) || c.includes(_norm(x)))));
    if (c && !hit) return { status: 'confirm', pinStates, places, message: `PIN ${pin} is ${places[0].name}${places[0].district ? ', ' + places[0].district : ''} (${places[0].state || where}). You wrote "${city.trim()}". Is the address correct?` };
  }
  return { status: 'ok', pinStates };
}

// ---- delivery estimate ----
const DEFAULT_DELIVERY = {
  processingDays: 2, blockedPincodes: '',
  zones: [
    { name: 'Telangana & Andhra Pradesh', states: ['Telangana', 'Andhra Pradesh'], minDays: 2, maxDays: 4, serviceable: true },
    { name: 'South India', states: ['Karnataka', 'Tamil Nadu', 'Kerala', 'Puducherry'], minDays: 3, maxDays: 5, serviceable: true },
    { name: 'Remote areas', states: ['Jammu and Kashmir', 'Ladakh', 'Arunachal Pradesh', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim', 'Assam', 'Andaman and Nicobar Islands', 'Lakshadweep'], minDays: 8, maxDays: 12, serviceable: true },
  ],
  fallback: { name: 'Rest of India', minDays: 5, maxDays: 8, serviceable: true },
};
const _MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Working days (Sundays skipped) counted from today in India time. Returns a UTC-midnight timestamp of the IST calendar date.
function addWorkingDays(nowMs, n) {
  let d = Math.floor((nowMs + 330 * 60000) / 864e5) * 864e5;
  while (n > 0) { d += 864e5; if (new Date(d).getUTCDay() !== 0) n--; }
  return d;
}
const fmtShortDate = d => { const x = new Date(d); return `${x.getUTCDate()} ${_MON[x.getUTCMonth()]}`; };
function deliveryEstimate(cfg, pincode, nowMs = Date.now()) {
  const c = { ...DEFAULT_DELIVERY, ...(cfg || {}) }, pin = String(pincode || '').replace(/\s/g, '');
  if (!/^[1-9][0-9]{5}$/.test(pin) || !statesOfPin(pin)) return { ok: false, serviceable: false, reason: 'Please enter a valid 6-digit PIN code.' };
  const blocked = String(c.blockedPincodes || '').split(/[\s,;]+/).filter(Boolean);
  if (blocked.includes(pin)) return { ok: true, serviceable: false, reason: 'We do not usually deliver to this PIN code, but you can still place your order and we will contact you to confirm the delivery.' };
  const states = statesOfPin(pin), zone = (c.zones || []).find(z => (z.states || []).some(s => states.includes(s))) || c.fallback;
  if (zone.serviceable === false) return { ok: true, serviceable: false, zone: zone.name, reason: 'We do not usually deliver to this area, but you can still place your order and we will contact you to confirm the delivery.' };
  const from = addWorkingDays(nowMs, c.processingDays + zone.minDays), to = addWorkingDays(nowMs, c.processingDays + zone.maxDays);
  return { ok: true, serviceable: true, zone: zone.name, state: states[0], minDate: from, maxDate: to, label: `Delivery by ${fmtShortDate(from)} – ${fmtShortDate(to)}` };
}

export { PIN_STATES, STATE_ALIASES, normState, statesOfPin, stateOfCity, addressCheck, DEFAULT_DELIVERY, addWorkingDays, fmtShortDate, deliveryEstimate };
