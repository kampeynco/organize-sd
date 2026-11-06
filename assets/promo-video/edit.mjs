// Cuts the promo from timeline.mjs: every segment is rendered to a frame-exact 1080p/24 chunk (footage graded,
// overlays composited), the chunks are joined, and the audio is mixed: score + ambience + dialogue (the score
// ducks under dialogue) + synthesized impact hits on the chapter slams. Output: ../organize-sd-promo.mp4
//
//   node edit.mjs              render (unchanged segments are reused from build/)
//   node edit.mjs --plan       print the cut list and check it against the score's sections
//   node edit.mjs --proof      also write build/proof.jpg, one frame from every segment
//   node edit.mjs --range 0-12 render only segments 0–12 to build/preview.mp4
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { SCORE, TIMELINE } from './timeline.mjs';
import { close as closeBrowser, renderScene, renderStill } from './graphics/render.mjs';

const ROOT = new URL('./', import.meta.url).pathname;
const BUILD = `${ROOT}build/`;
const args = process.argv.slice(2);
const range = args.includes('--range') ? args[args.indexOf('--range') + 1].split('-').map(Number) : null;
const OUT = range ? `${BUILD}preview.mp4` : new URL('../organize-sd-promo.mp4', import.meta.url).pathname;
const FPS = 24;
const SR = 48000;

// ── Beat grid ─────────────────────────────────────────────────────────────────────────────────
const beatsFile = `${BUILD}beats.json`;
let grid = existsSync(beatsFile) ? JSON.parse(readFileSync(beatsFile, 'utf8')) : null;
if (!grid || !grid.file.endsWith(SCORE)) {
  execFileSync('node', [`${ROOT}beats.mjs`, `${ROOT}${SCORE}`], { stdio: 'inherit' });
  grid = JSON.parse(readFileSync(beatsFile, 'utf8'));
}
const { beats, duration: scoreDur } = grid;
const period = (beats.at(-1) - beats[0]) / (beats.length - 1);
const beatTime = (i) => (i === 0 ? 0 : i < beats.length ? beats[i] : beats.at(-1) + (i - beats.length + 1) * period);
const totalBeats = TIMELINE.reduce((s, e) => s + e.beats, 0);
const endFrame = Math.round(Math.min(scoreDur, beatTime(totalBeats)) * FPS);
const cut = (i) => (i >= totalBeats ? endFrame : Math.round(beatTime(i) * FPS));

// ── Segments and overlays in frames ───────────────────────────────────────────────────────────
let b = 0;
const allSegments = TIMELINE.map((e, n) => {
  const s = { ...e, n, beat: b, start: cut(b), end: cut(b + e.beats) };
  s.frames = s.end - s.start;
  b += e.beats;
  return s;
});
const segments = range ? allSegments.slice(range[0], range[1] + 1) : allSegments;
const firstFrame = segments[0].start;
const lastFrame = segments.at(-1).end;
const overlays = allSegments.flatMap((s) =>
  [s.ov ?? []].flat().map((o) => {
    const start = cut(s.beat + (o.at ?? 0));
    const end = cut(s.beat + (o.at ?? 0) + (o.beats ?? s.beats - (o.at ?? 0)));
    return { ...o, start, end };
  }),
);

const tc = (f) => `${Math.floor(f / FPS / 60)}:${((f / FPS) % 60).toFixed(2).padStart(5, '0')}`;

// Clip length and the hard cuts some models (Kling, Seedance) put inside a clip, cached in build/clipinfo.json
function clipInfo() {
  const file = `${BUILD}clipinfo.json`;
  const cache = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  for (const id of new Set(allSegments.filter((s) => s.type === 'clip').map((s) => s.id))) {
    const path = `${ROOT}clips/${id}.mp4`;
    if (!existsSync(path) || cache[id]?.mtime === statSync(path).mtimeMs) continue;
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]));
    const log = spawnSync('ffmpeg', ['-i', path, '-vf', 'scdet=threshold=9,metadata=print:file=-', '-an', '-f', 'null', '-']).stdout.toString();
    const cuts = [...log.matchAll(/lavfi\.scd\.time=([\d.]+)/g)].map((m) => Number(m[1]));
    cache[id] = { mtime: statSync(path).mtimeMs, duration, cuts };
  }
  writeFileSync(file, JSON.stringify(cache, null, 2));
  return cache;
}

if (args.includes('--plan')) {
  const info = clipInfo();
  const warnings = [];
  for (const s of allSegments) {
    const what = s.type === 'clip' ? `${s.id} @${s.from ?? 0}s` : `[${s.scene}] ${s.params.word ?? ''}`;
    console.log(`${String(s.beat).padStart(4)}  ${tc(s.start).padStart(8)}  ${(s.frames / FPS).toFixed(2).padStart(5)}s  ${what}`);
    if (s.type !== 'clip' || !info[s.id]) continue;
    const from = s.from ?? 0, to = from + s.frames / FPS;
    const { duration, cuts } = info[s.id];
    // more than two frames past the end means a visible freeze
    if (to > duration + 2 / FPS) warnings.push(`${tc(s.start)} ${s.id}: runs ${(to - duration).toFixed(2)}s past the clip's end (freeze frame)`);
    for (const c of cuts) {
      if (c > from && c - from < 0.4) warnings.push(`${tc(s.start)} ${s.id}: opens with ${(c - from).toFixed(2)}s of the shot before the clip's internal cut at ${c}s`);
      if (c < to && to - c < 0.4) warnings.push(`${tc(s.start)} ${s.id}: ends with a ${(to - c).toFixed(2)}s flash after the clip's internal cut at ${c}s`);
    }
  }
  for (const o of overlays) console.log(`    ov ${o.start} ${o.end} ${o.scene}`);
  console.log(`total ${totalBeats} beats, ${tc(endFrame)}; score sections at`, grid.sections.map((x) => x.beat).join(', '));
  console.log(warnings.length ? `\n⚠ ${warnings.join('\n⚠ ')}` : '\nno freeze frames or flash cuts');
  process.exit(warnings.length ? 1 : 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────
const run = (cmd, argv) =>
  new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c ? rej(new Error(`${cmd} ${argv.join(' ')}\n${err}`)) : res()));
  });
const hash = (...parts) => createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 12);
const clipPath = (id) => `${ROOT}clips/${id}.mp4`;
const stamp = (p) => statSync(p).mtimeMs;
const hasAudio = (p) =>
  execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', p])
    .toString()
    .trim() !== '';
async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    for (let x; (x = queue.shift()); ) await fn(x);
  }));
}

for (const s of segments) {
  if (s.type === 'clip' && !existsSync(clipPath(s.id))) throw new Error(`missing clip: clips/${s.id}.mp4 (run generate.mjs)`);
}
mkdirSync(`${BUILD}seg`, { recursive: true });
mkdirSync(`${BUILD}gfx`, { recursive: true });

// ── 1. Graphics: full-screen cards, and each overlay cut to the segments it covers ────────────
console.log('graphics…');
const VIGNETTE = await renderStill('vignette', `${BUILD}gfx/vignette.png`);
for (const s of segments) {
  if (s.type === 'gfx') {
    s.layers = [await renderScene({ scene: s.scene, params: s.params, frames: s.frames, fps: FPS, opaque: true }, `${BUILD}gfx`)];
    continue;
  }
  s.layers = [];
  for (const o of overlays.filter((o) => o.start < s.end && o.end > s.start)) {
    s.layers.push(await renderScene({
      scene: o.scene, params: o.params, frames: s.frames, fps: FPS,
      dur: (o.end - o.start) / FPS, t0: (s.start - o.start) / FPS,
    }, `${BUILD}gfx`));
  }
}
await closeBrowser();

// ── 2. Video segments ─────────────────────────────────────────────────────────────────────────
// One look across three models: gentle contrast and a touch of warmth, then the canvas-drawn vignette.
// (ffmpeg's colorbalance/vignette/noise filters triple the render time under Rosetta, so they're avoided.)
const GRADE = 'eq=contrast=1.05:saturation=1.06:gamma=0.98:gamma_r=1.015:gamma_b=0.985';
// Every segment is tagged the same way (limited-range BT.709): clips arrive as BT.601 (Veo), BT.709 (Kling) or
// untagged (Seedance), and a file that switches color settings mid-stream shows wrong levels in some players
const ENCODE = ['-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', String(FPS * 2),
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an'];
// The encoder takes color tags from the frames, not from ENCODE, so they're stamped on every frame too
const NORMALIZE = 'setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709';
const matrixCache = {};
/** The clip's YUV matrix as swscale names it; untagged HD video is BT.709 by convention */
function matrixOf(path) {
  if (!matrixCache[path]) {
    const tag = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=color_space', '-of', 'csv=p=0', path])
      .toString().trim();
    matrixCache[path] = { bt709: 'bt709', smpte170m: 'smpte170m', bt470bg: 'bt470bg' }[tag] ?? 'bt709';
  }
  return matrixCache[path];
}

console.log(`rendering ${segments.length} segments…`);
await pool(segments, Math.max(2, Math.floor(cpus().length / 3)), async (s) => {
  const inMatrix = s.type === 'clip' ? matrixOf(clipPath(s.id)) : 'bt709';
  const key = hash(s.type, s.id, s.from, s.blur, s.frame, s.scene, s.params, s.frames, s.fadeIn, s.layers, s.type === 'clip' && stamp(clipPath(s.id)), GRADE, ENCODE, NORMALIZE, inMatrix);
  s.video = `${BUILD}seg/${String(s.n).padStart(3, '0')}-${key}.mp4`;
  if (existsSync(s.video)) return;
  const inputs = [];
  let chain;
  // Footage: clip (input 0), vignette (1), overlays (2…). Card: the card itself is input 0.
  let overlaysFrom;
  if (s.type === 'clip') {
    inputs.push('-ss', String(s.from ?? 0), '-i', clipPath(s.id), '-i', VIGNETTE);
    // frame: [x, y, w, h] reframes the source before scaling (keeps a stray foreground object out of shot)
    const reframe = s.frame ? `crop=${s.frame[2]}:${s.frame[3]}:${s.frame[0]}:${s.frame[1]},` : '';
    chain = `[0:v]setpts=PTS-STARTPTS,fps=${FPS},${reframe}scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,` +
      `crop=1920:1080,setsar=1,${GRADE},tpad=stop_mode=clone:stop_duration=4[g0];` +
      // blur: [[x, y, w, h], ...] soft-focuses regions of the frame (stray lettering on background signs)
      (s.blur ?? []).map(([x, y, w, h], i) =>
        `[g${i}]split[g${i}a][g${i}b];[g${i}b]crop=${w}:${h}:${x}:${y},gblur=sigma=18[bl${i}];[g${i}a][bl${i}]overlay=${x}:${y}[g${i + 1}];`).join('') +
      `[g${(s.blur ?? []).length}][1:v]overlay=format=auto[l0]`;
    overlaysFrom = 2;
  } else {
    chain = '[0:v]setsar=1[l0]';
    overlaysFrom = 1;
  }
  for (const layer of s.layers) inputs.push('-i', layer);
  const stack = s.type === 'clip' ? s.layers : s.layers.slice(1);
  let last = 'l0';
  stack.forEach((_, i) => {
    chain += `;[${last}][${overlaysFrom + i}:v]overlay=format=auto:eof_action=pass[l${i + 1}]`;
    last = `l${i + 1}`;
  });
  if (s.fadeIn) {
    chain += `;[${last}]fade=t=in:st=0:d=${s.fadeIn}[faded]`;
    last = 'faded';
  }
  chain += `;[${last}]scale=in_color_matrix=${inMatrix}:out_color_matrix=bt709:in_range=tv:out_range=tv,format=yuv420p,${NORMALIZE}[v]`;
  const tmp = `${s.video}.part.mp4`;
  await run('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', chain, '-map', '[v]', '-frames:v', String(s.frames), ...ENCODE, tmp]);
  renameSync(tmp, s.video);
});

// ── 3. Audio stems ────────────────────────────────────────────────────────────────────────────
console.log('audio…');
mkdirSync(`${BUILD}aud`, { recursive: true });
const silence = (n) => ['-f', 'lavfi', '-t', String(n / SR), '-i', `anullsrc=r=${SR}:cl=stereo`];
await pool(segments, 6, async (s) => {
  const samples = (s.frames * SR) / FPS;
  const isDialog = s.type === 'clip' && s.dialog;
  const gain = isDialog ? 1 : (s.gain ?? 0.16);
  const key = hash(s.type, s.id, s.from, s.mute, samples, gain, isDialog, s.type === 'clip' && stamp(clipPath(s.id)));
  s.audio = `${BUILD}aud/${String(s.n).padStart(3, '0')}-${key}.wav`;
  if (existsSync(s.audio)) return;
  const sec = samples / SR;
  const src = s.type === 'clip' && hasAudio(clipPath(s.id))
    ? ['-ss', String(s.from ?? 0), '-i', clipPath(s.id)]
    : silence(samples);
  // Even out levels across clips (dialogue to -16 LUFS, ambience to -20 then scaled), with tiny fades at the cuts
  const norm = s.type === 'clip' ? `loudnorm=I=${isDialog ? -16 : -20}:TP=-2,` : '';
  // mute: [[start, end], ...] in source seconds silences stray words; cut points sit in pauses, so no fades are needed
  const mute = (s.mute ?? []).map(([a, b]) => `volume=enable='between(t,${a - (s.from ?? 0)},${b - (s.from ?? 0)})':volume=0,`).join('');
  const af = `aresample=${SR},aformat=channel_layouts=stereo,${norm}aresample=${SR},volume=${gain},${mute}apad,` +
    `atrim=end_sample=${samples},afade=t=in:d=0.015,afade=t=out:st=${Math.max(0, sec - 0.03)}:d=0.03`;
  await run('ffmpeg', ['-y', '-v', 'error', ...src, '-af', af, '-c:a', 'pcm_s16le', '-ar', String(SR), s.audio]);
});

// Two stems — dialogue (keys the ducking) and ambience — built by concatenating per-segment audio
function stem(name, pick) {
  const list = segments.map((s) => {
    const f = pick(s) ? s.audio : `${BUILD}aud/silence-${s.frames}.wav`;
    if (!pick(s) && !existsSync(f)) {
      execFileSync('ffmpeg', ['-y', '-v', 'error', ...silence((s.frames * SR) / FPS), '-c:a', 'pcm_s16le', f]);
    }
    return `file '${f}'`;
  });
  writeFileSync(`${BUILD}${name}.txt`, list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${BUILD}${name}.txt`, '-c', 'copy', `${BUILD}${name}.wav`]);
}
stem('dialog', (s) => s.type === 'clip' && s.dialog);
stem('ambience', (s) => s.type === 'clip' && !s.dialog);

// Impact hit, synthesized: a falling sub-bass sine plus a short filtered noise crack
function writeHit(file) {
  const n = Math.round(SR * 1.8);
  const pcm = Buffer.alloc(n * 4);
  let phase = 0, lp = 0;
  let seed = 7;
  const noise = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * (36 + 90 * Math.exp(-t * 10))) / SR;
    const sub = Math.sin(phase) * Math.exp(-t * 2.6);
    lp += 0.18 * (noise() - lp);
    const crack = lp * Math.exp(-t * 22) * 1.6;
    const v = Math.tanh(1.6 * (sub * 0.9 + crack)) * 0.7;
    const s16 = Math.round(v * 32767);
    pcm.writeInt16LE(s16, i * 4);
    pcm.writeInt16LE(s16, i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(file, Buffer.concat([h, pcm]));
}
writeHit(`${BUILD}hit.wav`);
const hits = segments.filter((s) => s.hit).map((s) => Math.round(((s.start - firstFrame) / FPS) * 1000));
if (!hits.length) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...silence(((lastFrame - firstFrame) * SR) / FPS), '-c:a', 'pcm_s16le', `${BUILD}hits.wav`]);
} else {
  const ins = hits.flatMap(() => ['-i', `${BUILD}hit.wav`]);
  const graph = hits.map((ms, i) => `[${i}:a]adelay=${ms}|${ms}[h${i}]`).join(';') +
    `;${hits.map((_, i) => `[h${i}]`).join('')}amix=inputs=${hits.length}:normalize=0,apad,atrim=end_sample=${((lastFrame - firstFrame) * SR) / FPS}[a]`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...ins, '-filter_complex', graph, '-map', '[a]', '-c:a', 'pcm_s16le', `${BUILD}hits.wav`]);
}

// ── 4. Join and mix ───────────────────────────────────────────────────────────────────────────
console.log('mixing…');
writeFileSync(`${BUILD}video.txt`, segments.map((s) => `file '${s.video}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${BUILD}video.txt`, '-c', 'copy', `${BUILD}video.mp4`]);

const total = (lastFrame - firstFrame) / FPS;
const mix =
  `[0:a]aresample=${SR},aformat=channel_layouts=stereo,atrim=0:${total}[m];` +
  `[2:a]asplit=2[dl][key];` +
  `[m][key]sidechaincompress=threshold=0.015:ratio=8:attack=40:release=700[duck];` +
  `[3:a]volume=0.55[hit];` +
  `[duck][1:a][dl][hit]amix=inputs=4:normalize=0,` +
  `afade=t=in:d=0.4,afade=t=out:st=${(total - 2.5).toFixed(3)}:d=2.5[a]`;
execFileSync('ffmpeg', [
  '-y', '-v', 'error',
  '-ss', String(firstFrame / FPS), '-i', `${ROOT}${SCORE}`, '-i', `${BUILD}ambience.wav`, '-i', `${BUILD}dialog.wav`, '-i', `${BUILD}hits.wav`,
  '-filter_complex', mix, '-map', '[a]', '-c:a', 'pcm_s24le', `${BUILD}mix.wav`,
]);
// Two-pass loudness normalisation in linear mode: hits -14 LUFS without flattening the score's builds and dips
const LOUD = 'I=-14:TP=-1.5:LRA=20';
const measure = spawnSync('ffmpeg', ['-hide_banner', '-i', `${BUILD}mix.wav`, '-af', `loudnorm=${LOUD}:print_format=json`, '-f', 'null', '-'])
  .stderr.toString();
const m = JSON.parse(measure.slice(measure.lastIndexOf('{'), measure.lastIndexOf('}') + 1));
const norm = `loudnorm=${LOUD}:linear=true:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
  `:measured_thresh=${m.input_thresh}:offset=${m.target_offset},aresample=${SR}`;
const tmp = `${OUT}.part.mp4`;
execFileSync('ffmpeg', [
  '-y', '-v', 'error', '-i', `${BUILD}video.mp4`, '-i', `${BUILD}mix.wav`,
  '-map', '0:v', '-map', '1:a', '-af', norm,
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', String(total), '-movflags', '+faststart', tmp,
]);
renameSync(tmp, OUT);
console.log(`✓ ${OUT} (${tc(lastFrame - firstFrame)})`);

if (args.includes('--proof')) {
  // One frame from the middle of every segment, tiled 8 across
  const dir = `${BUILD}proof`;
  execFileSync('rm', ['-rf', dir]);
  mkdirSync(dir);
  await pool(segments.map((s, i) => [s, i]), 6, async ([s, i]) => {
    const t = (s.start - firstFrame + s.frames / 2) / FPS;
    await run('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(3), '-i', OUT, '-frames:v', '1', '-vf', 'scale=384:-1',
      `${dir}/${String(i).padStart(3, '0')}.jpg`]);
  });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', `${dir}/*.jpg`,
    '-vf', `tile=8x${Math.ceil(segments.length / 8)}`, '-frames:v', '1', `${BUILD}proof.jpg`]);
  console.log(`proof: ${BUILD}proof.jpg`);
}
