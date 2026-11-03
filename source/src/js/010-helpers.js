// ================= HELPERS =================
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n || 0).toLocaleString('en-IN');
function formatCurrency(n) { return '₹ ' + money(n); }
function getStatusClass(status) { return `status-${esc(status)}`; }
function generateId() { return Math.random().toString(36).slice(2, 11); }
function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
// IST timestamp "YYYY-MM-DD HH:MM" regardless of the viewer's timezone
function getTimestamp() { return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16); }
function csvCell(v) { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }
function safeParse(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; } }

