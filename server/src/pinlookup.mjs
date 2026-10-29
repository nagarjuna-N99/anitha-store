// Optional live PIN lookup. Failure or timeout is never an error for the customer: we simply fall back to the offline check.
const cache = new Map();
export async function lookupPin(cfg, pin, fetchImpl = fetch) {
  if (!cfg.pinLookup.on || !/^[1-9][0-9]{5}$/.test(pin)) return null;
  const hit = cache.get(pin); if (hit && Date.now() - hit.at < 7 * 864e5) return hit.places;
  try {
    const res = await fetchImpl(cfg.pinLookup.url + pin, { signal: AbortSignal.timeout(3000) });
    const j = await res.json(); const po = j?.[0]?.Status === 'Success' ? j[0].PostOffice : null;
    const places = po ? po.slice(0, 20).map(x => ({ name: x.Name, district: x.District, block: x.Block, division: x.Division, region: x.Region, state: x.State })) : null;
    cache.set(pin, { at: Date.now(), places }); return places;
  } catch { return null; }
}
