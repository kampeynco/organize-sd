// Beat-tracks the soundtrack so the edit can cut on the beat. Writes build/beats.json.
//   node beats.mjs [audio/score-1.mp3]
// Onset envelope = spectral flux; tempo = autocorrelation with a prior around 120 BPM;
// beats = Ellis' dynamic-programming tracker; bars = the beat phase where loudness changes land.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const file = process.argv[2] ?? new URL('./audio/score-1.mp3', import.meta.url).pathname;
const SR = 22050;
const WIN = 1024;
const HOP = 256;
const FPS = SR / HOP; // onset frames per second

const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {
  maxBuffer: 1 << 30,
});
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const duration = x.length / SR;

// ── Spectral flux onset envelope ──────────────────────────────────────────────────────────────
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const a = i + k, b = a + len / 2;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

const hann = Float32Array.from({ length: WIN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / WIN));
const frames = Math.floor((x.length - WIN) / HOP);
const onset = new Float32Array(frames);
const rms = new Float32Array(frames);
let prev = new Float32Array(WIN / 2);
for (let f = 0; f < frames; f++) {
  const re = new Float32Array(WIN), im = new Float32Array(WIN);
  let e = 0;
  for (let i = 0; i < WIN; i++) { const s = x[f * HOP + i]; re[i] = s * hann[i]; e += s * s; }
  rms[f] = Math.sqrt(e / WIN);
  fft(re, im);
  const mag = new Float32Array(WIN / 2);
  let flux = 0;
  for (let k = 1; k < WIN / 2; k++) {
    mag[k] = Math.log1p(1000 * Math.hypot(re[k], im[k]));
    flux += Math.max(0, mag[k] - prev[k]);
  }
  onset[f] = flux;
  prev = mag;
}
// Remove the slow trend and normalise
const smooth = (a, r) => a.map((_, i) => {
  let s = 0, n = 0;
  for (let j = Math.max(0, i - r); j <= Math.min(a.length - 1, i + r); j++) { s += a[j]; n++; }
  return s / n;
});
const trend = smooth(onset, Math.round(FPS));
const env = onset.map((v, i) => Math.max(0, v - trend[i]));
const sd = Math.sqrt(env.reduce((s, v) => s + v * v, 0) / env.length) || 1;
for (let i = 0; i < env.length; i++) env[i] /= sd;

// ── Tempo ─────────────────────────────────────────────────────────────────────────────────────
let best = { score: -Infinity, period: 0 };
for (let lag = Math.round((60 / 170) * FPS); lag <= Math.round((60 / 80) * FPS); lag++) {
  let ac = 0;
  for (let i = lag; i < env.length; i++) ac += env[i] * env[i - lag];
  const bpm = (60 * FPS) / lag;
  const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
  if (ac * prior > best.score) best = { score: ac * prior, period: lag };
}
const period = best.period;
const tempo = (60 * FPS) / period;

// ── Dynamic-programming beat tracker ──────────────────────────────────────────────────────────
const TIGHT = 100;
const score = new Float32Array(env.length);
const back = new Int32Array(env.length).fill(-1);
for (let t = 0; t < env.length; t++) {
  let bestPrev = -1, bestVal = 0;
  for (let p = t - 2 * period; p <= t - Math.round(period / 2); p++) {
    if (p < 0) continue;
    const v = score[p] - TIGHT * Math.log((t - p) / period) ** 2;
    if (bestPrev < 0 || v > bestVal) { bestVal = v; bestPrev = p; }
  }
  score[t] = env[t] + (bestPrev >= 0 ? bestVal : 0);
  back[t] = bestPrev;
}
let t = score.length - 1;
for (let i = score.length - period; i < score.length; i++) if (score[i] > score[t]) t = i;
const beatFrames = [];
for (; t >= 0; t = back[t]) beatFrames.unshift(t);
const beats = beatFrames.map((f) => +((f * HOP + WIN / 2) / SR).toFixed(3));

// ── Loudness per beat, bar phase, sections ────────────────────────────────────────────────────
const loud = beatFrames.map((f, i) => {
  const end = beatFrames[i + 1] ?? Math.min(rms.length, f + period);
  let s = 0;
  for (let j = f; j < end; j++) s += rms[j] ** 2;
  return Math.sqrt(s / Math.max(1, end - f));
});
const peak = Math.max(...loud);
const energy = loud.map((v) => +(v / peak).toFixed(3));
// Section changes: compare the 8 beats after each beat with the 8 before
const change = energy.map((_, i) => {
  if (i < 8 || i > energy.length - 8) return 0;
  const avg = (a, b) => energy.slice(a, b).reduce((s, v) => s + v, 0) / (b - a);
  return avg(i, i + 8) - avg(i - 8, i);
});
// Downbeat phase: the beat-mod-4 position where the biggest loudness jumps land
const phaseScore = [0, 1, 2, 3].map((ph) => change.reduce((s, c, i) => s + (i % 4 === ph ? Math.abs(c) : 0), 0));
const downbeatPhase = phaseScore.indexOf(Math.max(...phaseScore));
const sections = change
  .map((c, i) => ({ beat: i, time: beats[i], change: +c.toFixed(3), energy: energy[i] }))
  .filter((s) => (s.beat - downbeatPhase) % 4 === 0 && Math.abs(s.change) > 0.12)
  .filter((s, i, arr) => !arr.some((o) => Math.abs(o.beat - s.beat) <= 8 && Math.abs(o.change) > Math.abs(s.change)));

mkdirSync(new URL('./build/', import.meta.url), { recursive: true });
const out = { file, duration: +duration.toFixed(3), tempo: +tempo.toFixed(2), downbeatPhase, beats, energy, sections };
writeFileSync(new URL('./build/beats.json', import.meta.url), JSON.stringify(out));
console.log(`${file}\n  ${duration.toFixed(1)}s, ${tempo.toFixed(1)} BPM, ${beats.length} beats, downbeat phase ${downbeatPhase}`);
console.log('  sections:', sections.map((s) => `${s.time.toFixed(1)}s(${s.change > 0 ? '+' : ''}${s.change})`).join(' '));
// Energy per 8 beats, as a quick picture of the song's shape
const bars = [];
for (let i = 0; i < energy.length; i += 8) bars.push(energy.slice(i, i + 8).reduce((s, v) => s + v, 0) / 8);
console.log('  shape:', bars.map((v) => ' ▁▂▃▄▅▆▇█'[Math.min(8, Math.round(v * 8))]).join(''));
