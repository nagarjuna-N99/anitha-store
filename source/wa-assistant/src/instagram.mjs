// Instagram posting through the official Instagram Graph API (Content Publishing): create a media container for each photo,
// (a carousel container for several), wait until it is ready, then publish it. Scheduling is done here, because the API
// publishes immediately: a queue is kept on disk and a timer posts each job when its time comes. A job is claimed before
// the network call and is never retried automatically if the result is unknown, so nothing is ever posted twice.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sleep = ms => new Promise(r => setTimeout(r, ms));
export class IgClient {
  constructor(cfg, fetchImpl) { this.cfg = cfg; this.f = fetchImpl || fetch; this.wait = cfg.ig.pollMs ?? 2000; }
  get configured() { return !!(this.cfg.ig.userId && this.cfg.ig.token); }
  async call(method, p, params = {}) {
    const url = `${this.cfg.ig.graphUrl}/${p}`, body = new URLSearchParams({ ...params, access_token: this.cfg.ig.token });
    const r = await this.f(method === 'GET' ? `${url}?${body}` : url, { method, ...(method === 'GET' ? {} : { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body }) });
    const j = await r.json().catch(() => ({})); if (!r.ok || j.error) { const e = new Error('Instagram said: ' + String((j.error && (j.error.error_user_msg || j.error.message)) || r.status).replace(this.cfg.ig.token, '***').slice(0, 300)); e.code = j.error && j.error.code; e.transient = r.status >= 500 || (j.error && j.error.is_transient); throw e; } return j;
  }
  async ready(id, tries = 20, gap = this.wait) { for (let i = 0; i < tries; i++) { const s = await this.call('GET', id, { fields: 'status_code' }); if (s.status_code === 'FINISHED') return; if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram could not process the file (' + s.status_code + ').'); await sleep(gap); } throw new Error('Instagram took too long to process the photo.'); }
  // A Reel: one video container (Instagram downloads and processes the file, which takes longer than a photo), then publish.
  async publishReel({ videoUrl, coverUrl, caption }) {
    if (!this.configured) throw new Error('Instagram is not connected on the server.'); const u = this.cfg.ig.userId;
    const creation = (await this.call('POST', `${u}/media`, { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: 'true', ...(coverUrl ? { cover_url: coverUrl } : {}) })).id;
    await this.ready(creation, 120, this.wait ? 5000 : 0); const pub = await this.call('POST', `${u}/media_publish`, { creation_id: creation });
    let permalink = ''; try { permalink = (await this.call('GET', pub.id, { fields: 'permalink' })).permalink || ''; } catch { /* live anyway */ }
    return { postId: pub.id, permalink };
  }
  // ---- insights (needs the instagram_manage_insights permission on the token; every number is optional) ----
  async insights(days, now = Date.now(), withMedia = true) {
    if (!this.configured) throw new Error('Instagram is not connected on the server.'); const u = this.cfg.ig.userId, errors = {}, totals = {}, until = Math.floor(now / 1000), since = until - days * 86400;
    const acc = await this.call('GET', u, { fields: 'username,followers_count,follows_count,media_count' });
    for (const m of ['reach', 'views', 'profile_views', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'website_clicks']) {
      try { const r = await this.call('GET', `${u}/insights`, { metric: m, period: 'day', metric_type: 'total_value', since, until }); const v = r.data && r.data[0] && r.data[0].total_value ? r.data[0].total_value.value : null; totals[m] = Number.isFinite(+v) ? +v : null; }
      catch (e) { totals[m] = null; errors[m] = String(e.message).replace(/^Instagram said: /, '').slice(0, 140); }
    }
    let media = [];
    if (withMedia) try {
      const list = await this.call('GET', `${u}/media`, { fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count,thumbnail_url,media_url', limit: '30' });
      for (const m of (list.data || [])) {
        const t = Date.parse(m.timestamp); if (!Number.isFinite(t) || t < now - (days * 2 + 3) * 86400_000) continue; const row = { id: m.id, type: m.media_product_type === 'REELS' ? 'REEL' : m.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : m.media_type === 'VIDEO' ? 'VIDEO' : 'PHOTO', at: m.timestamp, url: m.permalink, caption: String(m.caption || '').slice(0, 140), likes: m.like_count ?? null, comments: m.comments_count ?? null, thumb: m.thumbnail_url || m.media_url || '' };
        for (const set of [['reach', 'saved', 'shares', 'total_interactions', 'views'], ['reach', 'saved']]) { try { const r = await this.call('GET', `${m.id}/insights`, { metric: set.join(',') }); for (const d of (r.data || [])) row[d.name === 'saved' ? 'saves' : d.name] = d.values && d.values[0] ? d.values[0].value : d.total_value ? d.total_value.value : null; break; } catch (e) { errors.media = String(e.message).replace(/^Instagram said: /, '').slice(0, 140); } }
        media.push(row);
      }
    } catch (e) { errors.media = String(e.message).replace(/^Instagram said: /, '').slice(0, 140); }
    return { account: { username: acc.username || '', followers: acc.followers_count ?? null, follows: acc.follows_count ?? null, media: acc.media_count ?? null }, totals, media, errors };
  }
  async publish({ imageUrls, caption }) {
    if (!this.configured) throw new Error('Instagram is not connected on the server.'); const u = this.cfg.ig.userId; let creation;
    if (imageUrls.length === 1) { creation = (await this.call('POST', `${u}/media`, { image_url: imageUrls[0], caption })).id; }
    else { const kids = []; for (const url of imageUrls) kids.push((await this.call('POST', `${u}/media`, { image_url: url, is_carousel_item: 'true' })).id); for (const k of kids) await this.ready(k); creation = (await this.call('POST', `${u}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption })).id; }
    await this.ready(creation); const pub = await this.call('POST', `${u}/media_publish`, { creation_id: creation });
    let permalink = ''; try { permalink = (await this.call('GET', pub.id, { fields: 'permalink' })).permalink || ''; } catch { /* the post is live even if this fails */ }
    return { postId: pub.id, permalink };
  }
}

export const CAPTION_MAX = 2200;
export function cleanCaption(c) {
  let t = String(c || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim(); if (!t) throw Object.assign(new Error('Write a caption first.'), { code: 400 });
  const tags = t.match(/#[\p{L}\p{N}_]+/gu) || []; if (tags.length > 30) throw Object.assign(new Error('Instagram allows at most 30 hashtags.'), { code: 400 });
  if (t.length > CAPTION_MAX) throw Object.assign(new Error('The caption is longer than 2,200 characters.'), { code: 400 }); return t;
}

export class SocialQueue {
  constructor({ dir, ig, media, cfg, now = () => Date.now() }) { this.file = path.join(dir, 'social.json'); this.ig = ig; this.media = media; this.cfg = cfg; this.now = now; this.s = { jobs: [] }; this.busy = false; try { this.s = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { /* first run */ }
    // a job that was mid-publish when the server stopped may or may not be live: never retry it automatically
    for (const j of this.s.jobs) if (j.status === 'publishing') { j.status = 'check'; j.error = 'The server restarted while posting. Check Instagram before posting again.'; } this.save(); }
  save() { const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(this.s), { mode: 0o600 }); fs.renameSync(t, this.file); }
  list() { return this.s.jobs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100); }
  postedToday() { const d = new Date(this.now() + 330 * 60_000).toISOString().slice(0, 10); return this.s.jobs.filter(j => j.status === 'posted' && j.postedAt && new Date(new Date(j.postedAt).getTime() + 330 * 60_000).toISOString().slice(0, 10) === d).length; }
  add({ mediaIds, caption, when, productId, productName, kind, videoId, coverId }) {
    const reel = kind === 'reel';
    if (reel) { if (!this.media.hasFile(videoId, 'mp4')) throw Object.assign(new Error('The video is missing. Make it again.'), { code: 400 }); if (coverId && !this.media.has(coverId)) coverId = ''; mediaIds = coverId ? [coverId] : []; }
    else {
    if (!Array.isArray(mediaIds) || mediaIds.length < 1 || mediaIds.length > 10) throw Object.assign(new Error('Choose 1 to 10 photos.'), { code: 400 });
    for (const m of mediaIds) if (!this.media.has(m)) throw Object.assign(new Error('A photo is missing. Upload it again.'), { code: 400 }); }
    const text = cleanCaption(caption), t = when === 'now' ? this.now() : Date.parse(when); if (!Number.isFinite(t)) throw Object.assign(new Error('The time is not valid.'), { code: 400 });
    if (when !== 'now' && (t < this.now() + 2 * 60_000 || t > this.now() + 60 * 86400_000)) throw Object.assign(new Error('Pick a time between 2 minutes and 60 days from now.'), { code: 400 });
    const job = { id: crypto.randomBytes(8).toString('hex'), kind: reel ? 'reel' : 'photo', videoId: reel ? videoId : '', coverId: reel ? (coverId || '') : '', status: 'queued', when: new Date(t).toISOString(), mediaIds, caption: text, productId: productId || '', productName: String(productName || '').slice(0, 100), attempts: 0, createdAt: new Date(this.now()).toISOString(), error: '', postId: '', permalink: '', postedAt: '' };
    this.s.jobs.push(job); this.save(); return job;
  }
  find(id) { return this.s.jobs.find(j => j.id === id); }
  cancel(id) { const j = this.find(id); if (!j) return { code: 404, error: 'Not found.' }; if (!['queued', 'failed', 'check'].includes(j.status)) return { code: 409, error: 'This post can no longer be cancelled.' }; j.status = 'cancelled'; this.save(); return { code: 200, job: j }; }
  retry(id, force) { const j = this.find(id); if (!j) return { code: 404, error: 'Not found.' }; if (!(j.status === 'failed' || (force && j.status === 'check'))) return { code: 409, error: 'Only failed posts can be retried.' }; j.status = 'queued'; j.when = new Date(this.now()).toISOString(); j.attempts = 0; j.error = ''; this.save(); return { code: 200, job: j }; }
  async run(j) {
    if (this.busy) return; this.busy = true; j.status = 'publishing'; j.attempts++; this.save();       // claimed BEFORE the network call
    try {
      if (this.postedToday() >= (this.cfg.ig.dailyCap || 20)) { j.status = 'queued'; j.attempts--; j.when = new Date(this.now() + 3600_000).toISOString(); j.error = 'Daily Instagram limit reached; will try again in an hour.'; return; }
      const base = this.cfg.payments.publicUrl; if (!base || !/^https:\/\//.test(base)) throw Object.assign(new Error('PUBLIC_URL must be this server\'s https address so Instagram can fetch the photos.'), { final: true });
      const r = j.kind === 'reel' ? await this.ig.publishReel({ videoUrl: `${base}/media/${j.videoId}.mp4`, coverUrl: j.coverId ? `${base}/media/${j.coverId}.jpg` : '', caption: j.caption }) : await this.ig.publish({ imageUrls: j.mediaIds.map(m => `${base}/media/${m}.jpg`), caption: j.caption });
      Object.assign(j, { status: 'posted', postId: r.postId, permalink: r.permalink, postedAt: new Date(this.now()).toISOString(), error: '' });
    } catch (e) {
      j.error = String(e.message || e).slice(0, 300);
      if (e.final || !e.transient || j.attempts >= 3) j.status = 'failed'; else { j.status = 'queued'; j.when = new Date(this.now() + [5, 15, 45][j.attempts - 1] * 60_000).toISOString(); }
    } finally { this.busy = false; this.save(); }
  }
  async tick() { const due = this.s.jobs.filter(j => j.status === 'queued' && Date.parse(j.when) <= this.now()).sort((a, b) => a.when.localeCompare(b.when)); for (const j of due) await this.run(j); this.media.sweep(14 * 86400_000, this.now(), new Set(this.s.jobs.filter(j => ['queued', 'publishing', 'check', 'failed'].includes(j.status)).flatMap(j => [...j.mediaIds, j.videoId, j.coverId].filter(Boolean)))); return due.length; }
  async postNow(id) { const j = this.find(id); if (!j) return { code: 404, error: 'Not found.' }; if (j.status !== 'queued') return { code: 409, error: 'Only waiting posts can be posted now.' }; await this.run(j); return { code: 200, job: j }; }
}
