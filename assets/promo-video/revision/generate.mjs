// node revision/generate.mjs submit [id,...] | poll | status
// A persisted task is never re-submitted. Poll again after observation/network errors.
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SHOTS } from './shots.mjs';
import { apiKey, createTask, credits, taskInfo, resultUrls, download } from '../lib/kie.mjs';
const root = new URL('../', import.meta.url).pathname;
const path = `${root}revision/manifest.json`;
const state = existsSync(path) ? JSON.parse(readFileSync(path)) : {};
const save = () => { writeFileSync(`${path}.tmp`, JSON.stringify(state, null, 2)); renameSync(`${path}.tmp`, path); };
const [cmd = 'status', ids] = process.argv.slice(2);
const selected = SHOTS.filter(s => !ids || ids.split(',').includes(s.id));
if (cmd === 'submit') {
  const balance = await credits();
  const fresh = selected.filter(s => !state[s.id]?.taskId && !state[s.id]?.submissionUncertain);
  const cost = fresh.reduce((n,s) => n + 158 * s.duration, 0);
  console.log(`Balance ${balance}; ${fresh.length} new shots, estimated ${cost} credits`);
  if (cost > balance - 50) throw new Error('Insufficient balance; preserving 50 credits');
  for (const s of fresh) {
    const e = state[s.id] ??= {};
    if (!s.image) {  // text-to-video: nothing to upload
      e.input = { prompt:s.prompt, duration:s.duration, resolution:'1080p', aspect_ratio:'16:9', generate_audio:true };
    } else {
    const image = readFileSync(`${root}references/${s.image}`);
    const hash = createHash('sha256').update(image).digest('hex');
    if (e.imageHash !== hash || !e.imageUrl) {
      const form = new FormData();
      form.append('file', new Blob([image], {type:'image/png'}), s.image);
      form.append('uploadPath', 'organize-sd-revision');
      form.append('fileName', `${s.id}-${hash.slice(0,12)}.png`);
      const r = await fetch('https://kieai.redpandaai.co/api/file-stream-upload', {
        method:'POST', headers:{Authorization:`Bearer ${apiKey()}`}, body:form,
      });
      const body = await r.json();
      if (!r.ok || body.code !== 200 || !body.data?.downloadUrl) throw new Error(`Upload failed: ${body.msg}`);
      e.imageUrl = body.data.downloadUrl; e.imageHash = hash; save();
    }
    e.input = { prompt:s.prompt, first_frame_url:e.imageUrl, duration:s.duration,
      resolution:'1080p', aspect_ratio:'adaptive', generate_audio:true };
    }
    e.model = 'bytedance/seedance-2-5';
    e.submissionUncertain = true; save();
    try {
      e.taskId = await createTask(e.model, e.input);
      delete e.submissionUncertain;
      e.state = 'submitted'; e.created = new Date().toISOString(); save();
      console.log(`${s.id}: submitted ${e.taskId}`);
    } catch(err) {
      // An explicit rejection cannot have created a task; an unknown result needs investigation.
      if (err.code && err.code < 500) { delete e.submissionUncertain; save(); }
      throw err;
    }
  }
} else if (cmd === 'poll') {
  for (const s of selected) {
    const e = state[s.id];
    if (!e?.taskId) continue;
    if (e.state === 'success' && existsSync(`${root}clips/${s.id}.mp4`)) { console.log(`${s.id}: saved`); continue; }
    try {
      const info = await taskInfo(e.taskId);
      e.state = info.state; e.checked = new Date().toISOString(); e.credits = info.creditsConsumed;
      if (info.state === 'fail') e.error = `${info.failCode}: ${info.failMsg}`;
      if (info.state === 'success') {
        const urls = resultUrls(info);
        const url = urls.find(u => /\.(mp4|mov)(\?|$)/i.test(u.url))?.url ?? urls[0]?.url;
        if (!url) throw new Error('Successful task returned no video URL');
        e.videoUrl = url;
        await download(url, `${root}clips/${s.id}.part.mp4`);
        renameSync(`${root}clips/${s.id}.part.mp4`, `${root}clips/${s.id}.mp4`);
      }
      save(); console.log(`${s.id}: ${e.state}${e.error ? ` ${e.error}` : ''}`);
    } catch(err) { console.log(`${s.id}: observation error: ${err.message}; retained task ${e.taskId}`); }
  }
} else {
  for (const s of selected) console.log(s.id, state[s.id]?.state ?? 'not submitted', state[s.id]?.taskId ?? '');
}
