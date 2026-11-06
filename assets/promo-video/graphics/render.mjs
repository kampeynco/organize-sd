// Renders scenes from scenes.js to video in headless Chromium, frame by frame (no real-time playback,
// so every frame is exact). Output is PNG-in-MOV with alpha, so overlays can sit on top of footage.
//
//   node graphics/render.mjs --still slam '{"word":"TRAIN."}' 0.8    one PNG to build/stills/ for checking a design
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium } from 'playwright-core';

const HERE = new URL('./', import.meta.url).pathname;
const SITE = new URL('../../../', import.meta.url).pathname; // organize-sd/
export const W = 1920, H = 1080;
// The same orange-state logo the props carry; the white-backed version reads as a sticker.
export const LOGO = SITE + 'assets/logo-orange-white-megaphone-2K.png';

// Use whichever Playwright headless shell is already on this machine
function chromePath() {
  const cache = `${homedir()}/Library/Caches/ms-playwright`;
  const shells = existsSync(cache)
    ? readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()
    : [];
  for (const d of shells) {
    const bin = `${cache}/${d}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
    if (existsSync(bin)) return bin;
  }
  return undefined; // fall back to playwright-core's own download
}

const b64 = (p) => readFileSync(p).toString('base64');

let browser, page;
async function stage() {
  if (page) return page;
  browser = await chromium.launch({ executablePath: chromePath() });
  page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);
  const fonts = SITE + 'node_modules/@fontsource/';
  await page.evaluate(
    async ({ fonts, logo, counties }) => {
      const load = async (family, weight, data) => {
        const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        const face = new FontFace(family, bytes, { weight: String(weight) });
        await face.load();
        document.fonts.add(face);
      };
      for (const [family, weight, data] of fonts) await load(family, weight, data);
      const img = new Image();
      img.src = `data:image/png;base64,${logo}`;
      await img.decode();
      window.ASSETS = { logo: img, counties };
    },
    {
      fonts: [
        ...[700, 800, 900].map((w) => ['Big Shoulders Display', w, b64(`${fonts}big-shoulders-display/files/big-shoulders-display-latin-${w}-normal.woff2`)]),
        ...[400, 700].map((w) => ['Public Sans', w, b64(`${fonts}public-sans/files/public-sans-latin-${w}-normal.woff2`)]),
      ],
      logo: b64(LOGO),
      counties: JSON.parse(readFileSync(SITE + 'public/election/counties.json', 'utf8')),
    },
  );
  await page.addScriptTag({ content: readFileSync(HERE + 'scenes.js', 'utf8') });
  return page;
}

export async function close() {
  await browser?.close();
  browser = page = undefined;
}

const frame = async (scene, t, dur, params, format) => {
  const url = await page.evaluate(([s, t, d, p, f]) => window.renderFrame(s, t, d, p, f), [scene, t, dur, params, format]);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};

/**
 * Renders `frames` frames of `scene` at `fps`, starting `t0` seconds into a scene that lasts `dur` seconds.
 * Overlays become PNG-in-MOV with alpha; `opaque` cards become H.264. Cached: the file name is a hash of
 * the scene code, the logo and the arguments.
 */
export async function renderScene({ scene, params = {}, frames, fps, dur = frames / fps, t0 = 0, opaque = false }, outDir) {
  // Cards arrive as JPEGs (full-range BT.601); convert them to the footage's standard, limited-range BT.709,
  // so the finished file never switches color settings mid-stream
  const codec = opaque
    ? ['-vf', 'scale=out_range=tv:out_color_matrix=bt709,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709', '-c:v', 'libx264', '-preset', 'fast', '-crf', '12',
      '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']
    : ['-c:v', 'png', '-pix_fmt', 'rgba'];
  const key = createHash('sha1')
    .update(readFileSync(HERE + 'scenes.js'))
    .update(readFileSync(LOGO))
    .update(JSON.stringify([scene, params, frames, fps, dur, t0, opaque, codec]))
    .digest('hex')
    .slice(0, 12);
  mkdirSync(outDir, { recursive: true });
  const ext = opaque ? 'mp4' : 'mov';
  const out = `${outDir}/${scene}-${key}.${ext}`;
  if (existsSync(out)) return out;
  await stage();
  const tmp = `${out}.part.${ext}`;
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', opaque ? 'mjpeg' : 'png', '-i', '-',
    ...codec, tmp,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));
  for (let i = 0; i < frames; i++) {
    const img = await frame(scene, t0 + i / fps, dur, params, opaque ? 'jpeg' : 'png');
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  renameSync(tmp, out);
  return out;
}

/** One PNG frame of a scene */
export async function renderStill(scene, file, { params = {}, t = 1, dur = 4 } = {}) {
  await stage();
  writeFileSync(file, await frame(scene, t, dur, params, 'png'));
  return file;
}

// CLI: render a single still for checking a design
if (process.argv[1] === new URL(import.meta.url).pathname && process.argv[2] === '--still') {
  const [, , , scene, params = '{}', t = '1', dur = '4'] = process.argv;
  mkdirSync(HERE + '../build/stills', { recursive: true });
  console.log(await renderStill(scene, `${HERE}../build/stills/${scene}-${t}.png`, { params: JSON.parse(params), t: Number(t), dur: Number(dur) }));
  await close();
}
