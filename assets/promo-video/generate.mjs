// Generates every shot in shots.mjs on kie.ai and downloads it to clips/<id>.mp4.
// Re-runnable: finished clips are skipped and in-flight tasks are resumed from clips/manifest.json.
//
//   node generate.mjs --dry-run          show what would be generated and what it costs
//   node generate.mjs                    generate everything not yet in clips/
//   node generate.mjs --only a,b         generate just these shots
//   node generate.mjs --redo a,b         throw away these clips and generate them again
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { MODELS, SHOTS } from './shots.mjs';
import { createTask, credits, download, resultUrls, waitForTask } from './lib/kie.mjs';

const CLIPS = new URL('./clips/', import.meta.url).pathname;
const MANIFEST = `${CLIPS}manifest.json`;
const RESERVE = 50; // never spend the account below this
const CONCURRENCY = 12;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const list = (name) => (args.includes(name) ? args[args.indexOf(name) + 1].split(',') : null);
const only = list('--only');
const redo = list('--redo') ?? [];

mkdirSync(CLIPS, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

// kie.ai is limited to Seedance 2.5 at 1080p, so any shot generated from now on uses it, whatever made its last take
for (const s of SHOTS) s.engine = 'seedance';
const wanted = SHOTS.filter((s) => (only ?? (redo.length ? redo : null))?.includes(s.id) ?? true);
const todo = wanted.filter((s) => redo.includes(s.id) || !existsSync(`${CLIPS}${s.id}.mp4`));
// in-flight tasks are already paid for
const fresh = todo.filter((s) => redo.includes(s.id) || !manifest[s.id]?.taskId);
const cost = fresh.reduce((sum, s) => sum + MODELS[s.engine].cost(s), 0);

const balance = await credits();
console.log(`${todo.length} clips to fetch (${fresh.length} new), est. ${cost} credits; balance ${balance}`);
for (const s of todo) console.log(`  ${s.id.padEnd(18)} ${s.engine.padEnd(9)} ${MODELS[s.engine].cost(s)}`);
if (flag('--dry-run')) process.exit(0);
if (cost > balance - RESERVE) {
  console.error(`Not enough credits: need ${cost}, have ${balance} (keeping ${RESERVE} in reserve).`);
  process.exit(1);
}

// Keep the old take next to the new one rather than deleting it
for (const id of redo) {
  const clip = `${CLIPS}${id}.mp4`;
  if (existsSync(clip)) renameSync(clip, `${CLIPS}${id}.take${Date.now()}.mp4`);
  delete manifest[id];
}
save();

async function run(s, attempt = 1) {
  const { model, input } = MODELS[s.engine];
  const entry = (manifest[s.id] ??= {});
  if (!entry.taskId) {
    entry.taskId = await createTask(model, input(s));
    entry.engine = s.engine;
    entry.created = new Date().toISOString();
    save();
    console.log(`→ ${s.id}: submitted ${entry.taskId}`);
  }
  const info = await waitForTask(entry.taskId);
  entry.state = info.state;
  entry.credits = info.creditsConsumed;
  if (info.state === 'fail') {
    entry.error = `${info.failCode} ${info.failMsg}`;
    delete entry.taskId; // let the next attempt (or run) resubmit
    save();
    // Veo answers "500 Internal Error" or "400 PUBLIC_ERROR_HIGH_TRAFFIC" now and then; failed tasks are not billed
    if ((String(info.failCode) === '500' || /HIGH_TRAFFIC/.test(info.failMsg)) && attempt < 3) {
      if (/HIGH_TRAFFIC/.test(info.failMsg)) await new Promise((r) => setTimeout(r, 60_000));
      console.log(`↻ ${s.id}: ${entry.error}; retrying`);
      return run(s, attempt + 1);
    }
    throw new Error(`${s.id} failed: ${entry.error}`);
  }
  const urls = resultUrls(info);
  entry.urls = urls.map((u) => u.url);
  const video = urls.find((u) => /\.(mp4|mov)(\?|$)/i.test(u.url)) ?? urls[0];
  if (!video) throw new Error(`${s.id}: no result URL in ${JSON.stringify(info.resultJson)}`);
  await download(video.url, `${CLIPS}${s.id}.mp4`);
  save();
  console.log(`✓ ${s.id} (${info.costTime}s, ${info.creditsConsumed} credits)`);
}

// Small worker pool so we stay well under kie.ai's rate limits
const queue = [...todo];
const failures = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let s; (s = queue.shift()); ) {
      try { await run(s); } catch (err) { failures.push(s.id); console.error(`✗ ${err.message}`); }
    }
  }),
);
console.log(`done; balance now ${await credits()}${failures.length ? `; failed: ${failures.join(',')}` : ''}`);
process.exit(failures.length ? 1 : 0);
