// Video studio (server side): the owner uploads a clip, chooses trim / crop / zoom / look / text, and this server renders
//   - an Instagram Reel file (1080x1920, H.264 + AAC, MP4 with fast start)
//   - a WhatsApp status file (720x1280, at most 30 s and 16 MB)
//   - a cover picture
// with ffmpeg. Nothing the owner sends is ever put in a shell: arguments are an array, every number is clamped,
// the two text pictures are checked to be real PNG files. One render runs at a time (the server is small).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let ffStatic = ''; try { ffStatic = (await import('ffmpeg-static')).default || ''; } catch { /* not installed: use the ffmpeg on the machine */ }
export const FFMPEG = process.env.FFMPEG_PATH || ffStatic || 'ffmpeg';
export const LIMITS = { uploadBytes: 150 * 1024 * 1024, minSecs: 3, igMaxSecs: 90, waMaxSecs: 30, waMaxBytes: 16 * 1000 * 1000, overlayBytes: 2_500_000 };

const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const f = n => Number(n).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');

export function run(args, { onProgress, timeoutMs = 10 * 60_000 } = {}) {
  return new Promise(resolve => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let err = '', killed = false;
    const to = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, timeoutMs);
    p.stderr.on('data', d => { err = (err + d).slice(-20000); });
    p.stdout.on('data', d => { if (onProgress) { const m = /out_time_ms=(\d+)/.exec(String(d)); if (m) onProgress(Number(m[1]) / 1e6); } });
    p.on('error', e => { clearTimeout(to); resolve({ code: -1, err: String(e.message) }); });
    p.on('close', code => { clearTimeout(to); resolve({ code: killed ? -2 : code, err }); });
  });
}

// ffmpeg prints the facts about a file when it is opened with no output.
export async function probe(file) {
  const { err } = await run(['-hide_banner', '-i', file], { timeoutMs: 30_000 });
  const d = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(err), v = /Stream #[^\n]*Video:[^\n]*?(\d{2,5})x(\d{2,5})/.exec(err);
  if (!d || !v) return null;
  let w = +v[1], h = +v[2]; const rot = /rotation of (-?[\d.]+) degrees/.exec(err); if (rot && Math.round(Math.abs(+rot[1]) / 90) % 2 === 1) [w, h] = [h, w];
  return { duration: (+d[1]) * 3600 + (+d[2]) * 60 + parseFloat(d[3]), width: w, height: h, hasAudio: /Stream #[^\n]*Audio:/.test(err) };
}

// Turn what the owner chose into safe numbers, and the ffmpeg filter graph.
export function buildPlan(edl, info) {
  const e = edl && typeof edl === 'object' ? edl : {}, dur = info.duration;
  const start = num(e.start, 0, Math.max(0, dur - LIMITS.minSecs), 0), end = num(e.end, start, dur, dur);
  const speed = num(e.speed, 0.5, 2, 1), outLen = (end - start) / speed;
  if (outLen < LIMITS.minSecs - 0.05) throw Object.assign(new Error('The finished video must be at least 3 seconds.'), { code: 422 });
  if (outLen > LIMITS.igMaxSecs + 0.05) throw Object.assign(new Error('Instagram Reels from this tool are limited to 90 seconds. Trim the clip.'), { code: 422 });
  const p = { start, len: end - start, speed, outLen, zoom: num(e.zoom, 1, 3, 1), px: num(e.panX, 0, 1, 0.5), py: num(e.panY, 0, 1, 0.5), bright: num(e.brightness, -0.3, 0.3, 0), contrast: num(e.contrast, 0.8, 1.4, 1), sat: num(e.saturation, 0.7, 1.6, 1), mute: !!e.mute || !info.hasAudio, fade: e.fade !== false, hookSecs: num(e.hookSecs, 0, 5, 3) };
  const vf = `scale=w=${Math.ceil(1080 * p.zoom)}:h=${Math.ceil(1920 * p.zoom)}:force_original_aspect_ratio=increase,crop=1080:1920:x='(iw-1080)*${f(p.px)}':y='(ih-1920)*${f(p.py)}',eq=brightness=${f(p.bright)}:contrast=${f(p.contrast)}:saturation=${f(p.sat)},setpts=(PTS-STARTPTS)/${f(p.speed)},fps=30,format=yuv420p`;
  const af = [`atempo=${f(p.speed)}`, ...(p.fade ? ['afade=t=in:st=0:d=0.3', `afade=t=out:st=${f(Math.max(0, p.outLen - 0.5))}:d=0.5`] : [])].join(',');
  return { ...p, vf, af };
}

const png = d => { const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(d || '')); if (!m) return null; const b = Buffer.from(m[1], 'base64'); return b.length > 100 && b.length <= LIMITS.overlayBytes && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? b : null; };

export class VideoStudio {
  constructor({ dir, media, now = () => Date.now() }) {
    this.dir = path.join(dir, 'videos'); this.media = media; this.now = now; fs.mkdirSync(this.dir, { recursive: true });
    this.jobs = new Map(); this.queue = Promise.resolve(); this.sweepOld();
  }
  src(id) { return /^[0-9a-f]{32}$/.test(String(id)) ? path.join(this.dir, 'src-' + id) : null; }
  sweepOld(maxAge = 24 * 3600_000) { for (const f of fs.readdirSync(this.dir)) { const p = path.join(this.dir, f); try { if (this.now() - fs.statSync(p).mtimeMs > maxAge) fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ } } }
  // Stream the upload straight to disk, refuse anything over the limit, then check it really is a video.
  upload(req) {
    return new Promise((resolve, reject) => {
      const ct = String(req.headers['content-type'] || ''); if (!/^video\//.test(ct) && ct !== 'application/octet-stream') return reject(Object.assign(new Error('Send a video file.'), { code: 415 }));
      const len = Number(req.headers['content-length'] || 0); if (len > LIMITS.uploadBytes) return reject(Object.assign(new Error('The video is larger than 150 MB. Trim it on your phone first.'), { code: 413 }));
      const keep = fs.readdirSync(this.dir).filter(x => x.startsWith('src-')).map(x => ({ x, t: fs.statSync(path.join(this.dir, x)).mtimeMs })).sort((a, b) => a.t - b.t); while (keep.length >= 4) fs.rmSync(path.join(this.dir, keep.shift().x), { force: true });
      const id = crypto.randomBytes(16).toString('hex'), file = this.src(id), out = fs.createWriteStream(file, { mode: 0o600 }); let n = 0, dead = false;
      const fail = e => { if (dead) return; dead = true; out.destroy(); fs.rmSync(file, { force: true }); reject(e); };
      req.on('data', c => { n += c.length; if (n > LIMITS.uploadBytes) { fail(Object.assign(new Error('The video is larger than 150 MB. Trim it on your phone first.'), { code: 413 })); req.destroy(); } });
      req.on('error', fail); req.pipe(out);
      out.on('finish', async () => { if (dead) return; const info = await probe(file); if (!info) { fs.rmSync(file, { force: true }); return reject(Object.assign(new Error('That file is not a video we can read. Try an MP4 or MOV from your phone.'), { code: 415 })); } resolve({ id, ...info, bytes: n }); });
    });
  }
  start({ id, edl, hookPng, logoPng }) {
    const file = this.src(id); if (!file || !fs.existsSync(file)) throw Object.assign(new Error('Upload the video again.'), { code: 404 });
    if ([...this.jobs.values()].filter(j => j.state === 'queued' || j.state === 'running').length >= 3) throw Object.assign(new Error('Other videos are still being made. Wait a minute.'), { code: 429 });
    const hook = hookPng ? png(hookPng) : null, logo = logoPng ? png(logoPng) : null; if ((hookPng && !hook) || (logoPng && !logo)) throw Object.assign(new Error('The text picture is not valid.'), { code: 400 });
    const jobId = crypto.randomBytes(8).toString('hex'), job = { id: jobId, state: 'queued', progress: 0, error: '', result: null }; this.jobs.set(jobId, job);
    this.queue = this.queue.then(() => this.render(job, file, edl, hook, logo)).catch(() => {}); return job;
  }
  async render(job, file, edl, hook, logo) {
    job.state = 'running'; const tmp = path.join(this.dir, 'w-' + job.id); fs.mkdirSync(tmp, { recursive: true });
    try {
      const info = await probe(file); if (!info) throw new Error('The video could not be read any more. Upload it again.');
      const p = buildPlan(edl, info), ig = path.join(tmp, 'ig.mp4'), wa = path.join(tmp, 'wa.mp4'), cov = path.join(tmp, 'cover.jpg');
      const inputs = ['-ss', f(p.start), '-t', f(p.len), '-i', file]; let graph = `[0:v]${p.vf}[b]`, last = 'b', n = 1;
      if (hook) { fs.writeFileSync(path.join(tmp, 'hook.png'), hook); inputs.push('-loop', '1', '-t', f(p.outLen + 1), '-i', path.join(tmp, 'hook.png')); graph += `;[${last}][${n}:v]overlay=0:0:enable='between(t,0,${f(p.hookSecs)})'[o${n}]`; last = 'o' + n; n++; }
      if (logo) { fs.writeFileSync(path.join(tmp, 'logo.png'), logo); inputs.push('-loop', '1', '-t', f(p.outLen + 1), '-i', path.join(tmp, 'logo.png')); graph += `;[${last}][${n}:v]overlay=0:0[o${n}]`; last = 'o' + n; n++; }
      const audio = p.mute ? ['-an'] : ['-map', '0:a:0', '-af', p.af, '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2'];
      const r1 = await run(['-y', '-hide_banner', '-nostats', '-progress', 'pipe:1', ...inputs, '-filter_complex', graph, '-map', `[${last}]`, ...audio, '-t', f(p.outLen), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '6M', '-bufsize', '12M', '-threads', '2', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', ig], { onProgress: s => { job.progress = Math.min(0.85, s / p.outLen * 0.85); } });
      if (r1.code !== 0 || !fs.existsSync(ig)) throw new Error('The video could not be made (' + (r1.code === -2 ? 'it took too long' : 'ffmpeg stopped') + '). Try a shorter clip.');
      const waLen = Math.min(p.outLen, LIMITS.waMaxSecs), waArgs = br => ['-y', '-hide_banner', '-nostats', '-i', ig, '-t', f(waLen), '-vf', 'scale=720:1280', '-c:v', 'libx264', '-preset', 'veryfast', ...(br ? ['-b:v', br + 'k', '-maxrate', br + 'k', '-bufsize', 2 * br + 'k'] : ['-crf', '27', '-maxrate', '1800k', '-bufsize', '3600k']), '-pix_fmt', 'yuv420p', ...(p.mute ? ['-an'] : ['-c:a', 'aac', '-b:a', '96k']), '-movflags', '+faststart', wa];
      let r2 = await run(waArgs()); if (r2.code !== 0) throw new Error('The WhatsApp version could not be made.');
      if (fs.statSync(wa).size > LIMITS.waMaxBytes) { const kbps = Math.max(200, Math.floor(LIMITS.waMaxBytes * 8 * 0.85 / 1000 / waLen - 96)); r2 = await run(waArgs(kbps)); if (r2.code !== 0 || fs.statSync(wa).size > LIMITS.waMaxBytes) throw new Error('The WhatsApp version is over 16 MB. Use a shorter clip.'); }
      await run(['-y', '-hide_banner', '-nostats', '-ss', f(Math.min(1, p.outLen / 3)), '-i', ig, '-frames:v', '1', '-q:v', '3', '-vf', 'scale=720:-2', cov]);
      const igId = this.media.saveFile(ig, 'mp4'), waId = this.media.saveFile(wa, 'mp4'), coverId = fs.existsSync(cov) ? this.media.saveFile(cov, 'jpg') : '';
      job.result = { igId, waId, coverId, duration: +p.outLen.toFixed(2), waDuration: +waLen.toFixed(2), igBytes: this.media.size(igId, 'mp4'), waBytes: this.media.size(waId, 'mp4'), hasAudio: !p.mute, width: 1080, height: 1920 };
      job.state = 'done'; job.progress = 1; fs.rmSync(file, { force: true });
    } catch (e) { job.state = 'error'; job.error = String(e.message || e).slice(0, 300); }
    finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  job(id) { return this.jobs.get(String(id)) || null; }
}
