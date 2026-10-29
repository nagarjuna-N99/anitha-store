// Minimal single-purpose PDF writer (A4, Helvetica, text only). No dependencies.
// Standard PDF fonts cannot show the ₹ sign, so amounts are written as "Rs.". Text is escaped; non-Latin characters become "?".
const esc = s => String(s).replace(/[^\x20-\x7E]/g, c => (c === '₹' ? 'Rs.' : c === '–' || c === '—' ? '-' : c === '×' ? 'x' : c === '•' ? '*' : '?')).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const W = 595, H = 842;

export class Pdf {
  constructor() { this.pages = []; this.cur = null; this.newPage(); }
  newPage() { this.cur = []; this.pages.push(this.cur); this.y = H - 50; }
  text(x, y, s, size = 10, bold = false) { this.cur.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`); }
  line(x1, y1, x2, y2, w = 0.5) { this.cur.push(`${w} w ${x1} ${y1} m ${x2} ${y2} l S`); }
  // advance a "cursor" line by line; starts a new page when the page is full
  row(x, s, size = 10, bold = false, gap = 14) { if (this.y < 60) this.newPage(); this.text(x, this.y, s, size, bold); this.y -= gap; }
  wrap(x, s, size = 10, width = 90, bold = false) { String(s).split('\n').forEach(par => { let line = ''; for (const w of par.split(' ')) { if ((line + ' ' + w).trim().length > width) { this.row(x, line, size, bold); line = w; } else line = (line + ' ' + w).trim(); } this.row(x, line, size, bold); }); }
  build() {
    const objs = []; const add = s => { objs.push(s); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>'); add(null);            // 1 catalog, 2 pages (filled below)
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = this.pages.map(p => {
      const body = p.join('\n'), content = add(`<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`);
      return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`);
    });
    objs[1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let out = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = Buffer.byteLength(out);
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
  }
}
