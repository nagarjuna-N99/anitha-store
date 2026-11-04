// Serves the public website (the built files) from the same server, so one machine can run the whole shop.
// Only GET and HEAD. Never serves anything outside the site folder, never hidden files. Unknown addresses get 404.html
// (the page the build makes so product pages open), with a real 404 status. The API and owner app are handled before this.
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf' };
// addresses that belong to the shop server itself: a missing one stays a plain JSON 404, never a web page
export const SERVER_PREFIXES = ['/api/', '/admin/', '/admin2/', '/public/', '/ops/', '/payments/', '/webhook', '/health', '/pay/', '/track/', '/media/', '/inbox'];

export function createSiteHost(dir) {
  const root = path.resolve(dir), isFile = f => { try { return fs.statSync(f).isFile(); } catch { return false; } };
  const HEAD = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };
  const send = (req, res, status, file, extra = {}) => {
    const ext = path.extname(file).toLowerCase(), html = ext === '.html', buf = fs.readFileSync(file);
    res.writeHead(status, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': html ? 'no-cache' : 'public, max-age=3600', ...HEAD, ...extra });
    res.end(req.method === 'HEAD' ? undefined : buf);
  };
  return {
    root,
    available: () => isFile(path.join(root, 'index.html')),
    // true when it answered
    serve(req, res, url) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return false;
      let p; try { p = decodeURIComponent(url.pathname); } catch { return false; }
      if (p.includes('\0') || p.includes('\\') || p.split('/').some(s => s === '..' || (s.startsWith('.') && s.length > 0))) return false;
      if (SERVER_PREFIXES.some(x => { const b = x.replace(/\/$/, ''); return p === b || p.startsWith(b + '/'); })) return false;
      const rel = p.replace(/^\/+/, ''), full = path.resolve(root, rel);
      if (full !== root && !full.startsWith(root + path.sep)) return false;
      let f = null;
      if (p.endsWith('/')) f = path.join(full, 'index.html');
      else if (isFile(full)) f = full;
      else if (isFile(path.join(full, 'index.html'))) { res.writeHead(301, { Location: p + '/' + (url.search || ''), ...HEAD }); res.end(); return true; }
      if (f && isFile(f)) { send(req, res, 200, f); return true; }
      const nf = path.join(root, '404.html');
      if (isFile(nf)) { send(req, res, 404, nf); return true; }
      return false;
    },
  };
}
