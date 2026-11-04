// The visitor's address, for rate limits and the optional owner-app allow-list.
// By default only the direct connection is trusted. When the server runs behind our own HTTPS front door on the same machine
// (TRUST_PROXY=1, the AWS setup), every connection arrives from 127.0.0.1, so the address the front door recorded is used instead,
// and only when the connection really is from this machine. A visitor can never choose their own address this way.
export function clientIp(req, trustProxy) {
  const direct = String((req.socket && req.socket.remoteAddress) || '').replace(/^::ffff:/, '');
  if (!trustProxy || !(direct === '127.0.0.1' || direct === '::1')) return direct;
  const parts = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim().replace(/^::ffff:/, '')).filter(Boolean);
  const last = parts[parts.length - 1];
  return last && /^[0-9a-fA-F:.]{3,45}$/.test(last) ? last : direct;   // the front door adds the real address last
}
