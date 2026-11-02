// Video analyzer (server side). The owner edits a video in any phone app (CapCut, InShot, the gallery editor), uploads it
// here, and gets a score, what was found, and clear directions on what to change. Nothing is edited or re-encoded: the
// file is only measured with ffmpeg (size, shape, length, sound, how it opens, how fast it cuts, sharpness, brightness),
// then judged against widely used Reel / status practice. Nobody can predict views; the score says how well the things
// you control are done. Arguments never go through a shell and every uploaded file is checked to be a real video.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let ffStatic = ''; try { ffStatic = (await import('ffmpeg-static')).default || ''; } catch { /* not installed: use the ffmpeg on the machine */ }
export const FFMPEG = process.env.FFMPEG_PATH || ffStatic || 'ffmpeg';
export const LIMITS = { uploadBytes: 150 * 1024 * 1024, minSecs: 3, igMaxSecs: 90, waMaxSecs: 30, waMaxBytes: 16 * 1000 * 1000, analyseSecs: 120 };

export function run(args, { timeoutMs = 5 * 60_000, onStdout } = {}) {
  return new Promise(resolve => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let err = '', killed = false;
    const to = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, timeoutMs);
    p.stderr.on('data', d => { err = (err + d).slice(-60000); });
    p.stdout.on('data', d => { if (onStdout) onStdout(d); });
    p.on('error', e => { clearTimeout(to); resolve({ code: -1, err: String(e.message) }); });
    p.on('close', code => { clearTimeout(to); resolve({ code: killed ? -2 : code, err }); });
  });
}

// ffmpeg prints the facts about a file when it is opened with no output.
export async function probe(file) {
  const { err } = await run(['-hide_banner', '-i', file], { timeoutMs: 30_000 });
  const d = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(err), vl = /Stream #[^\n]*Video: ([^\n]*)/.exec(err), v = vl && /(\d{2,5})x(\d{2,5})/.exec(vl[1]);
  if (!d || !vl || !v) return null;
  let w = +v[1], h = +v[2]; const rot = /rotation of (-?[\d.]+) degrees/.exec(err); if (rot && Math.round(Math.abs(+rot[1]) / 90) % 2 === 1) [w, h] = [h, w];
  const al = /Stream #[^\n]*Audio: ([^\n]*)/.exec(err), fps = /(\d+(?:\.\d+)?) fps/.exec(vl[1]), br = /bitrate: (\d+) kb\/s/.exec(err), inp = /Input #0, ([^,]+),/.exec(err);
  return { duration: (+d[1]) * 3600 + (+d[2]) * 60 + parseFloat(d[3]), width: w, height: h, hasAudio: !!al, fps: fps ? +fps[1] : 0, codec: (/^(\w+)/.exec(vl[1]) || [])[1] || '', audioCodec: al ? (/^(\w+)/.exec(al[1]) || [])[1] : '', kbps: br ? +br[1] : 0, container: inp ? inp[1] : '' };
}

const even = n => Math.max(2, Math.round(n / 2) * 2);
// Raw grey pictures at 5 per second, small. From them: brightness, sharpness, how much moves, where it cuts.
export async function measureFrames(file, info) {
  const k = 192 / Math.max(info.width, info.height), W = even(info.width * k), H = even(info.height * k), FS = W * H, FPS = 5, secs = Math.min(info.duration, LIMITS.analyseSecs);
  const bright = [], sharp = [], diff = []; let prev = null, buf = Buffer.alloc(0);
  const eat = d => {
    buf = buf.length ? Buffer.concat([buf, d]) : d;
    while (buf.length >= FS) {
      const f = buf.subarray(0, FS); let sum = 0; for (let i = 0; i < FS; i++) sum += f[i]; bright.push(sum / FS);
      let ls = 0, ls2 = 0, n = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, l = 4 * f[i] - f[i - 1] - f[i + 1] - f[i - W] - f[i + W]; ls += l; ls2 += l * l; n++; } sharp.push(n ? ls2 / n - (ls / n) ** 2 : 0);
      if (prev) { let s = 0; for (let i = 0; i < FS; i += 3) s += Math.abs(f[i] - prev[i]); diff.push(s / (FS / 3) / 255); } prev = Buffer.from(f); buf = buf.subarray(FS);
    }
  };
  const r = await run(['-hide_banner', '-nostats', '-t', String(secs), '-i', file, '-an', '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', 'pipe:1'], { onStdout: eat, timeoutMs: 4 * 60_000 });
  if (r.code !== 0 || bright.length < 2) throw new Error('The video could not be read all the way through.');
  return { fps: FPS, bright, sharp, diff };
}
export async function measureAudio(file, info) {
  if (!info.hasAudio) return null;
  const { err } = await run(['-hide_banner', '-nostats', '-t', String(LIMITS.analyseSecs), '-i', file, '-vn', '-af', 'ebur128=peak=true,silencedetect=noise=-35dB:d=0.5', '-f', 'null', '-'], { timeoutMs: 3 * 60_000 });
  const lufs = /I:\s+(-?[\d.]+) LUFS/.exec(err.slice(err.lastIndexOf('Summary'))), peak = /Peak:\s+(-?[\d.]+) dBFS/.exec(err.slice(err.lastIndexOf('True peak'))), sil = [];
  for (const m of err.matchAll(/silence_start: (-?[\d.]+)/g)) sil.push({ start: Math.max(0, +m[1]) }); let i = 0; for (const m of err.matchAll(/silence_end: (-?[\d.]+)/g)) { if (sil[i]) sil[i].end = +m[1]; i++; }
  return { lufs: lufs ? +lufs[1] : null, peak: peak ? +peak[1] : null, silences: sil };
}
export async function measureBars(file, info) {
  const { err } = await run(['-hide_banner', '-nostats', '-ss', String(Math.min(1, info.duration / 3)), '-t', '3', '-i', file, '-an', '-vf', 'cropdetect=limit=24:round=2:reset=0', '-f', 'null', '-'], { timeoutMs: 60_000 });
  const all = [...err.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)]; if (!all.length) return { sideBars: 0, topBars: 0 }; const m = all[all.length - 1];
  return { sideBars: Math.max(0, 1 - (+m[1]) / info.width), topBars: Math.max(0, 1 - (+m[2]) / info.height) };
}
// four pictures from the video, for the owner to see and for Claude to look at
export async function grabFrames(file, info, dir, id) {
  const ts = [0.2, 0.25, 0.5, 0.75].map((f, i) => i === 0 ? Math.min(0.2, info.duration / 4) : info.duration * f), out = [];
  for (let i = 0; i < ts.length; i++) { const f = path.join(dir, `fr-${id}-${i}.jpg`); await run(['-y', '-hide_banner', '-nostats', '-ss', String(ts[i].toFixed(2)), '-i', file, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', f], { timeoutMs: 60_000 }); if (fs.existsSync(f)) out.push({ t: +ts[i].toFixed(2), file: f }); }
  return out;
}

const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
// What the numbers say about the video (no judging here).
export function summarise(info, fr, au, bars) {
  const dt = 1 / fr.fps, n = fr.bright.length, dur = Math.min(info.duration, n * dt + dt), cuts = []; fr.diff.forEach((d, i) => { if (d > 0.14 && (!cuts.length || (i - cuts[cuts.length - 1]) * dt > 0.4)) cuts.push(i); });
  const firstN = Math.max(2, Math.round(2 * fr.fps)), hookMotion = avg(fr.diff.slice(0, firstN)), allMotion = avg(fr.diff);
  let still = 0, run0 = 0; fr.diff.forEach(d => { if (d < 0.004) { run0++; still = Math.max(still, run0 * dt); } else run0 = 0; });
  let blackStart = 0; for (let i = 0; i < n && fr.bright[i] < 14; i++) blackStart = (i + 1) * dt; let blackEnd = 0; for (let i = n - 1; i >= 0 && fr.bright[i] < 14; i--) blackEnd = (n - i) * dt;
  const lead = au && au.silences.length && au.silences[0].start < 0.3 ? ((au.silences[0].end ?? au.silences[0].start) - au.silences[0].start) : 0, sil = au ? au.silences.reduce((s, x) => s + Math.max(0, (x.end ?? info.duration) - x.start), 0) : 0;
  return { ...info, dur, shots: cuts.length + 1, avgShot: dur / (cuts.length + 1), hookMotion, allMotion, stillSecs: still, blackStart, blackEnd, brightness: avg(fr.bright), sharpness: avg(fr.sharp), sharpFirst: avg(fr.sharp.slice(0, firstN)), sharpMin: Math.min(...fr.sharp), lufs: au ? au.lufs : null, peak: au ? au.peak : null, leadSilence: lead, silentShare: au && dur ? sil / dur : 0, sideBars: bars.sideBars, topBars: bars.topBars, bytes: info.bytes || 0 };
}

// ---------- judging: every check says what was found, why it matters, and exactly what to do ----------
const S = { pass: 1, warn: 0.5, fail: 0 };
export function judge(f) {
  const G = [], g = (id, title, weight, checks) => G.push({ id, title, weight, checks }), c = (id, status, found, why, todo) => ({ id, status, found, why, todo: status === 'pass' ? '' : todo });
  const short = Math.min(f.width, f.height), ar = f.width / f.height, vertical = Math.abs(ar - 9 / 16) <= 0.03, mp = f.kbps ? f.kbps / 1000 : 0;
  g('format', 'Shape and quality', 25, [
    c('shape', vertical ? 'pass' : ar < 0.9 ? 'warn' : 'fail', `${f.width}×${f.height} (${ar < 1 ? 'vertical' : ar === 1 ? 'square' : 'landscape'})`, 'Reels and status fill the phone only when the video is vertical 9:16. Landscape gets black bars or is cropped.', 'In your editor set the canvas / ratio to 9:16 (1080×1920) and make the saree fill the frame. In CapCut: Ratio → 9:16. In InShot: Canvas → 9:16. Film vertically next time.'),
    c('res', short >= 1000 ? 'pass' : short >= 700 ? 'warn' : 'fail', `${short}p on the short side`, 'Sharper video holds attention; low resolution looks cheap next to other Reels.', 'Export at 1080p (1080×1920). In CapCut: Export → Resolution 1080p, Frame rate 30. Do not export at 480p or 720p to save space.'),
    c('fps', f.fps >= 24 && f.fps <= 61 ? 'pass' : 'warn', f.fps ? `${Math.round(f.fps)} frames per second` : 'frame rate not found', 'Under 24 fps looks jerky.', 'Export at 30 fps.'),
    c('codec', f.codec === 'h264' ? 'pass' : f.codec === 'hevc' ? 'warn' : 'fail', `${f.codec || 'unknown'} video, ${f.container.includes('mp4') ? 'MP4' : f.container.includes('mov') ? 'MOV' : f.container}`, 'H.264 in an MP4 plays everywhere. HEVC (iPhone default) is accepted by Instagram but some phones and WhatsApp versions cannot play it.', f.codec === 'hevc' ? 'Export again as MP4 with H.264. iPhone: Settings → Camera → Formats → Most Compatible, or choose "Compatible" when exporting.' : 'Export again as an MP4 file with H.264 video.'),
    c('rate', !mp ? 'pass' : mp >= 3 && mp <= 25 ? 'pass' : 'warn', mp ? `${mp.toFixed(1)} Mbps` : 'bitrate not found', mp && mp < 3 ? 'Too little data per second makes colours blocky, which hurts sarees most.' : 'Very high bitrate makes huge files that upload slowly.', mp && mp < 3 ? 'Export at "High" or "Recommended" quality, not "Low". In CapCut set Bitrate to Recommended or Higher.' : 'Export at "Recommended" quality.'),
    c('bars', f.sideBars < 0.06 && f.topBars < 0.06 ? 'pass' : 'fail', f.sideBars < 0.06 && f.topBars < 0.06 ? 'no black bars' : `black bars on ${f.sideBars >= 0.06 ? 'the sides' : 'top and bottom'} (${Math.round(Math.max(f.sideBars, f.topBars) * 100)}%)`, 'Black bars waste screen space and look unfinished.', 'Zoom (pinch) the video in your editor until it fills the whole 9:16 frame, or re-film vertically.'),
  ]);
  g('hook', 'The first 2 seconds', 25, [
    c('open', f.blackStart < 0.25 ? 'pass' : 'fail', f.blackStart < 0.25 ? 'opens on a picture' : `starts with ${f.blackStart.toFixed(1)} s of black`, 'People decide in about 2 seconds. Black frames at the start lose them.', `Trim the first ${Math.ceil(f.blackStart * 10) / 10} s so the very first frame already shows the saree.`),
    c('motion', f.hookMotion >= 0.02 ? 'pass' : 'warn', f.hookMotion >= 0.02 ? 'something moves at the start' : 'the first 2 seconds are almost still', 'A moving start (pallu swish, a turn, fabric unfolding) stops the scroll better than a still frame.', 'Start with movement: open on the pallu being flicked or a quick turn, then show the details. Move your best 2 seconds to the front.'),
    ...(f.hasAudio ? [c('lead', f.leadSilence < 0.5 ? 'pass' : 'warn', f.leadSilence < 0.5 ? 'sound starts at once' : `${f.leadSilence.toFixed(1)} s of silence at the start`, 'A silent start feels like nothing is happening.', 'Trim the silence or start the music from the first frame.')] : []),
    c('text', 'info', 'Cannot be measured here.', 'A short line on screen in the first 2 seconds ("Only 1 piece · Kanchi Pattu") helps people who watch without sound.', 'Add a short line of text in the top-middle of the frame (not the very top or bottom: Instagram covers those). Use ✨ Ask Claude to review the frames to check.'),
  ]);
  const pace = f.dur >= 8 && f.shots === 1 ? 'warn' : f.avgShot < 0.7 && f.dur > 5 ? 'warn' : 'pass';
  g('pace', 'Pace', 15, [
    c('cuts', pace, `${f.shots} shot${f.shots === 1 ? '' : 's'}, about ${f.avgShot.toFixed(1)} s each (estimated)`, 'A change of angle every 1.5 to 4 seconds keeps people watching; one long shot or constant flashing both lose them.', f.shots === 1 ? 'Add 3 to 5 cuts: full drape, pallu, border close-up, fabric texture, a turn. Keep each shot 2 to 4 seconds.' : 'Slow the cuts down: hold each shot at least 1.5 seconds.'),
    c('still', f.stillSecs < 2.5 ? 'pass' : 'warn', f.stillSecs < 2.5 ? 'no long frozen stretch' : `a still stretch of ${f.stillSecs.toFixed(1)} s`, 'A frozen picture feels like a mistake.', 'Cut the still part, or add movement (a slow zoom or a pan).'),
  ]);
  const secs = f.duration, lenOk = secs >= 7 && secs <= 30;
  g('length', 'Length', 10, [
    c('len', secs < 3 || secs > 90 ? 'fail' : lenOk ? 'pass' : 'warn', `${secs.toFixed(1)} seconds`, 'Reels of about 7 to 30 seconds are most often watched to the end, and finishing a video is a strong signal. Instagram here accepts 3 to 90 seconds.', secs < 3 ? 'Make it at least 3 seconds.' : secs > 90 ? 'Shorten to under 90 seconds; ideally 15 to 30.' : secs < 7 ? 'A little longer (7 to 15 s) lets the saree be seen properly.' : 'Trim to 30 seconds or less. Keep only the best moments.'),
  ]);
  g('sound', 'Sound', 15, f.hasAudio ? [
    c('loud', f.lufs == null ? 'pass' : f.lufs >= -20 && f.lufs <= -10 ? 'pass' : 'warn', f.lufs == null ? 'loudness not measured' : `${f.lufs.toFixed(0)} LUFS`, 'Too quiet and people skip; too loud is harsh and may distort.', f.lufs != null && f.lufs < -20 ? 'Raise the volume of the music or voice so it is clear on a phone speaker (aim for about -14 LUFS: most editors have "Normalise loudness").' : 'Lower the volume a little (the music should sit under your voice).'),
    c('clip', f.peak == null || f.peak < -0.5 ? 'pass' : 'warn', f.peak == null ? 'peak not measured' : `loudest point ${f.peak.toFixed(1)} dBFS`, 'Peaks at the maximum sound crackly.', 'Lower the volume by about 3 dB before exporting.'),
    c('silent', f.silentShare < 0.5 ? 'pass' : 'warn', f.silentShare < 0.5 ? 'sound carries through' : `${Math.round(f.silentShare * 100)}% of the video is silent`, 'Long silent stretches make people think the video stopped.', 'Add music or a voice-over across the whole video.'),
  ] : [c('has', 'warn', 'no sound', 'Many people watch with sound on, and Reels with music or a voice are shared more.', 'Add music or a short voice-over ("Pure Kanchi pattu, one piece only") in your editor. Use music that is allowed on business accounts; Instagram’s own library inside the Instagram app is the safest for a business page.')]);
  g('visual', 'Picture', 10, [
    c('sharp', f.sharpness >= 45 ? 'pass' : f.sharpness >= 25 ? 'warn' : 'fail', f.sharpness >= 45 ? 'sharp' : f.sharpness >= 25 ? 'slightly soft' : 'blurry', 'Blurry video makes zari and weaving look cheap.', 'Tap to focus on the saree when filming, hold the phone steady (elbows in, or lean on a wall), clean the lens, and film in daylight.'),
    c('light', f.brightness >= 70 && f.brightness <= 210 ? 'pass' : 'warn', f.brightness < 70 ? 'dark' : f.brightness > 210 ? 'washed out' : 'well lit', 'Light decides whether the colour shown matches the real saree.', f.brightness < 70 ? 'Film near a window in daylight, or raise the brightness a little in the editor.' : 'Lower the exposure so the zari and borders keep their detail.'),
    c('end', f.blackEnd < 0.4 ? 'pass' : 'warn', f.blackEnd < 0.4 ? 'ends on a picture' : `ends with ${f.blackEnd.toFixed(1)} s of black`, 'A black ending reads as dead air and weakens the finish.', 'Trim the last black seconds. End on the best shot with a short line ("DM or WhatsApp to order").'),
  ]);
  const avgS = G.reduce((a, gr) => { const real = gr.checks.filter(x => x.status !== 'info'); return a + gr.weight * (real.length ? real.reduce((s, x) => s + S[x.status], 0) / real.length : 1); }, 0) / G.reduce((a, gr) => a + gr.weight, 0), score = Math.round(100 * Math.pow(avgS, 1.5));   // a steeper curve: many small faults must not hide behind a few passes
  const todo = G.flatMap(gr => gr.checks.filter(x => x.status === 'fail' || x.status === 'warn').map(x => ({ group: gr.title, id: x.id, status: x.status, found: x.found, todo: x.todo, rank: (x.status === 'fail' ? 2 : 1) * gr.weight }))).sort((a, b) => b.rank - a.rank);
  const igBlock = f.duration < 3 || f.duration > 90 || short < 540, core = G.some(gr => gr.checks.some(x => x.status === 'fail' && ['shape', 'open', 'sharp', 'len', 'bars', 'codec'].includes(x.id))), verdict = igBlock || core ? 'fix' : score >= 80 ? 'ready' : score >= 60 ? 'almost' : 'fix';
  const wa = [{ id: 'len', ok: f.duration <= 30, text: f.duration <= 30 ? `${f.duration.toFixed(0)} s fits one WhatsApp status.` : `${f.duration.toFixed(0)} s: WhatsApp will cut it into 30-second pieces. Trim to 30 s or less for one clean status.` }, { id: 'size', ok: (f.bytes || 0) <= LIMITS.waMaxBytes, text: (f.bytes || 0) <= LIMITS.waMaxBytes ? `${((f.bytes || 0) / 1e6).toFixed(1)} MB is within 16 MB.` : `${((f.bytes || 0) / 1e6).toFixed(0)} MB is over 16 MB. For the status copy export at 720p / 30 fps or trim it; WhatsApp compresses large files and the colours suffer.` }, { id: 'shape', ok: vertical, text: vertical ? 'Vertical 9:16 fills the screen.' : 'Not 9:16: WhatsApp will show black bars.' }];
  return { score, verdict, groups: G, top: todo.slice(0, 3), all: todo, platforms: { reel: { ok: !igBlock, text: igBlock ? 'Cannot be posted as a Reel yet: ' + (f.duration < 3 ? 'under 3 seconds.' : f.duration > 90 ? 'over 90 seconds.' : 'resolution too low (under 540 px).') : 'Meets Instagram Reel requirements.' }, status: { ok: wa.every(x => x.ok), checks: wa } } };
}
export class VideoLab {
  constructor({ dir, media, now = () => Date.now() }) { this.dir = path.join(dir, 'videos'); this.media = media; this.now = now; fs.mkdirSync(this.dir, { recursive: true }); this.jobs = new Map(); this.queue = Promise.resolve(); this.sweepOld(); }
  src(id) { return /^[0-9a-f]{32}$/.test(String(id)) ? path.join(this.dir, 'src-' + id) : null; }
  sweepOld(maxAge = 24 * 3600_000) { for (const f of fs.readdirSync(this.dir)) { const p = path.join(this.dir, f); try { if (this.now() - fs.statSync(p).mtimeMs > maxAge) fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ } } }
  upload(req) {
    return new Promise((resolve, reject) => {
      const ct = String(req.headers['content-type'] || ''); if (!/^video\//.test(ct) && ct !== 'application/octet-stream') return reject(Object.assign(new Error('Send a video file.'), { code: 415 }));
      const len = Number(req.headers['content-length'] || 0); if (len > LIMITS.uploadBytes) return reject(Object.assign(new Error('The video is larger than 150 MB. Export it at 1080p and 30 fps, or trim it.'), { code: 413 }));
      const keep = fs.readdirSync(this.dir).filter(x => x.startsWith('src-')).map(x => ({ x, t: fs.statSync(path.join(this.dir, x)).mtimeMs })).sort((a, b) => a.t - b.t); while (keep.length >= 4) { const o = keep.shift().x; fs.rmSync(path.join(this.dir, o), { force: true }); }
      const id = crypto.randomBytes(16).toString('hex'), file = this.src(id), out = fs.createWriteStream(file, { mode: 0o600 }); let n = 0, dead = false;
      const fail = e => { if (dead) return; dead = true; out.destroy(); fs.rmSync(file, { force: true }); reject(e); };
      req.on('data', c => { n += c.length; if (n > LIMITS.uploadBytes) { fail(Object.assign(new Error('The video is larger than 150 MB. Export it at 1080p and 30 fps, or trim it.'), { code: 413 })); req.destroy(); } });
      req.on('error', fail); req.pipe(out);
      out.on('finish', async () => { if (dead) return; const info = await probe(file); if (!info) { fs.rmSync(file, { force: true }); return reject(Object.assign(new Error('That file is not a video we can read. Try an MP4 or MOV exported from your phone or editing app.'), { code: 415 })); } resolve({ id, ...info, bytes: n }); });
    });
  }
  start(id, info) {
    const file = this.src(id); if (!file || !fs.existsSync(file)) throw Object.assign(new Error('Upload the video again.'), { code: 404 });
    if ([...this.jobs.values()].filter(j => j.state === 'queued' || j.state === 'running').length >= 3) throw Object.assign(new Error('Other videos are still being checked. Wait a minute.'), { code: 429 });
    const job = { id: crypto.randomBytes(8).toString('hex'), videoId: id, state: 'queued', progress: 0, error: '', result: null }; this.jobs.set(job.id, job);
    this.queue = this.queue.then(() => this.analyse(job, file, { ...info, bytes: fs.statSync(file).size })).catch(() => {}); return job;
  }
  async analyse(job, file, info) {
    job.state = 'running'; try {
      job.progress = 0.1; const fr = await measureFrames(file, info); job.progress = 0.5; const au = await measureAudio(file, info); job.progress = 0.7; const bars = await measureBars(file, info); job.progress = 0.8;
      const facts = summarise(info, fr, au, bars), verdict = judge(facts), frames = await grabFrames(file, info, this.dir, job.videoId);
      const dt = 1 / fr.fps, score = i => { const t = frames[i] ? frames[i].t : 0, k = Math.min(fr.sharp.length - 1, Math.round(t / dt)), b = fr.bright[k]; return (b > 60 && b < 215 ? 1 : 0.4) * fr.sharp[k]; }; let best = 0; frames.forEach((_, i) => { if (score(i) > score(best)) best = i; });
      job.result = { facts: { duration: +info.duration.toFixed(1), width: info.width, height: info.height, fps: Math.round(info.fps), codec: info.codec, container: info.container, mbps: info.kbps ? +(info.kbps / 1000).toFixed(1) : null, bytes: info.bytes, hasAudio: info.hasAudio, shots: facts.shots, avgShot: +facts.avgShot.toFixed(1), brightness: Math.round(facts.brightness), lufs: facts.lufs, hookMotion: +facts.hookMotion.toFixed(3) }, ...verdict, frames: frames.map(x => 'data:image/jpeg;base64,' + fs.readFileSync(x.file).toString('base64')), bestFrame: best };
      job.state = 'done'; job.progress = 1;
    } catch (e) { job.state = 'error'; job.error = String(e.message || e).slice(0, 300); }
  }
  job(id) { return this.jobs.get(String(id)) || null; }
  frameFiles(id) { return [0, 1, 2, 3].map(i => path.join(this.dir, `fr-${id}-${i}.jpg`)).filter(f => fs.existsSync(f)); }
  // Used when the owner posts the analysed video: the same file, unchanged, becomes a public address for Instagram.
  promote(id, coverIndex) {
    const file = this.src(id); if (!file || !fs.existsSync(file)) throw Object.assign(new Error('Upload the video again.'), { code: 404 });
    const videoId = this.media.saveFile(file, 'mp4'); const fr = this.frameFiles(id), pick = fr[Number.isInteger(+coverIndex) ? Math.min(Math.max(+coverIndex, 0), fr.length - 1) : 0]; return { videoId, coverId: pick ? this.media.saveFile(pick, 'jpg') : '' };
  }
}
