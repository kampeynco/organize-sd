// Every-frame glitch scan of the finished video. AI footage fails in short bursts (a hat turning into hair,
// a face ghosting into steam, a few frames of a different camera angle), and each burst shows up as a spike
// in frame-to-frame change that doesn't sit on a planned cut. This scores every frame, lists the unplanned
// spikes, and tiles every frame around each one into build/qa/spike-*.jpg for a look.
//
//   node qa.mjs [video]      default ../organize-sd-promo.mp4
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const ROOT = new URL('./', import.meta.url).pathname;
const video = process.argv[2] ?? new URL('../organize-sd-promo.mp4', import.meta.url).pathname;
const FPS = 24;
const OUT = `${ROOT}build/qa/spikes`;

// Planned cuts, from the edit's own cut list
const plan = execFileSync('node', [`${ROOT}edit.mjs`, '--plan'], { cwd: ROOT }).toString();
const rows = plan.split('\n').filter((l) => /^\s*\d+\s+\d+:\d/.test(l)).map((l) => {
  const [, , tc, dur, what] = l.match(/^\s*(\d+)\s+(\d+:[\d.]+)\s+([\d.]+)s\s+(.*)$/);
  const [m, s] = tc.split(':').map(Number);
  return { start: Math.round((m * 60 + s) * FPS), frames: Math.round(Number(dur) * FPS), what: what.trim() };
});
const planned = new Set(rows.map((r) => r.start));
const overlays = [...plan.matchAll(/^\s+ov (\d+) (\d+) (\w+)/gm)].map((m) => ({ start: +m[1], end: +m[2], scene: m[3] }));
// Text animating in (first 0.8s) or out (last 0.4s) of an overlay changes frames on purpose
const overlayMotion = (f) => overlays.find((o) => (f >= o.start && f < o.start + 0.8 * FPS) || (f >= o.end - 0.4 * FPS && f <= o.end));
const isCard = (f) => /^\[/.test(rows.findLast((r) => r.start <= f)?.what ?? '');

// Score every frame (scdet's score is the change from the previous frame, 0–100)
const log = spawnSync('ffmpeg', ['-i', video, '-an', '-vf', 'scale=480:-1,scdet=threshold=100,metadata=print:file=-', '-f', 'null', '-'],
  { maxBuffer: 1 << 28 }).stdout.toString();
const score = [];
let current = -1;
for (const line of log.split('\n')) {
  // ffmpeg's frame: counter restarts partway through long files; pts_time doesn't
  const frame = line.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);
  if (frame) current = Math.round(Number(frame[1]) * FPS);
  const sc = line.match(/^lavfi\.scd\.score=([\d.]+)/);
  if (sc) score[current] = Number(sc[1]);
}

// A spike is a frame that changes much more than the frames around it
const spikes = [];
for (let f = 1; f < score.length; f++) {
  const near = [];
  for (let k = f - 12; k <= f + 12; k++) if (k !== f && score[k] !== undefined && Math.abs(k - f) > 1) near.push(score[k]);
  near.sort((a, b) => a - b);
  const median = near[Math.floor(near.length / 2)] ?? 0;
  const isPlanned = [...Array(3)].some((_, d) => planned.has(f - 1 + d));
  if (!isPlanned && !isCard(f) && score[f] > 4 && score[f] > 3 * median + 1.5) spikes.push({ f, score: score[f], median, ov: overlayMotion(f)?.scene });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const tc = (f) => `${Math.floor(f / FPS / 60)}:${((f / FPS) % 60).toFixed(2).padStart(5, '0')}`;
const seg = (f) => rows.findLast((r) => r.start <= f);
console.log(`${score.length} frames scored, ${planned.size} planned cuts, ${spikes.length} unplanned spikes`);
for (const s of spikes) {
  const r = seg(s.f);
  console.log(`  ${tc(s.f)}  frame ${s.f}  score ${s.score.toFixed(1)} (around ${s.median.toFixed(1)})  ${r.what} +${((s.f - r.start) / FPS).toFixed(2)}s${s.ov ? `  [${s.ov} animating]` : ''}`);
  // every frame from 6 before to 5 after the spike
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', ((s.f - 6) / FPS).toFixed(3), '-i', video, '-frames:v', '1',
    '-vf', 'trim=end_frame=12,scale=480:-1,tile=6x2', `${OUT}/spike-${String(s.f).padStart(4, '0')}.jpg`]);
}
