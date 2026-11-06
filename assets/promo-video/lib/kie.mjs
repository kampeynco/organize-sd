// Minimal kie.ai client: create a market task, poll it, pull the result URLs out of whatever shape it returns.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.kie.ai/api/v1';

/** KIE_API_KEY from the shell, else from organize-sd/.env.local */
export function apiKey() {
  if (process.env.KIE_API_KEY) return process.env.KIE_API_KEY;
  const envFile = fileURLToPath(new URL('../../../.env.local', import.meta.url));
  const line = readFileSync(envFile, 'utf8').split('\n').find((l) => l.startsWith('KIE_API_KEY='));
  if (!line) throw new Error('KIE_API_KEY not found in environment or .env.local');
  return line.slice('KIE_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
}

async function call(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  // kie.ai answers HTTP 200 even on failure; the real status is body.code
  if (!res.ok || body.code !== 200) {
    const err = new Error(`kie.ai ${path}: ${body.code ?? res.status} ${body.msg ?? res.statusText}`);
    err.code = body.code ?? res.status;
    throw err;
  }
  return body.data;
}

export const credits = () => call('/chat/credit');

// Account policy (set Oct 27 2026): kie.ai is used only for Seedance 2.5 at 1080p
const ALLOWED = (model, input) => model === 'bytedance/seedance-2-5' && input.resolution === '1080p';

export async function createTask(model, input) {
  if (!ALLOWED(model, input)) {
    throw new Error(`kie.ai use is limited to Seedance 2.5 at 1080p; refusing ${model} ${input.resolution ?? ''}`.trim());
  }
  const data = await call('/jobs/createTask', { method: 'POST', body: JSON.stringify({ model, input }) });
  return data.taskId;
}

export const taskInfo = (taskId) => call(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);

/** Every http(s) URL found anywhere in a result, with keys naming the "final" output first */
export function resultUrls(info) {
  const found = [];
  const walk = (v, key = '') => {
    if (typeof v === 'string') {
      if (/^\{|\[/.test(v.trim())) {
        try { return walk(JSON.parse(v), key); } catch { /* plain string */ }
      }
      if (/^https?:\/\//.test(v)) found.push({ key, url: v });
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(info.resultJson);
  walk(info.response);
  const rank = (k) => (/^result_?urls$/i.test(k) ? 0 : /audio_url$/i.test(k) ? 0 : /origin/i.test(k) ? 2 : 1);
  return [...new Map(found.sort((a, b) => rank(a.key) - rank(b.key)).map((f) => [f.url, f])).values()];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll until success/fail. Video tasks can run 10+ minutes. */
export async function waitForTask(taskId, { onTick, timeoutMs = 40 * 60_000 } = {}) {
  const start = Date.now();
  let delay = 5000;
  while (Date.now() - start < timeoutMs) {
    let info;
    try {
      info = await taskInfo(taskId);
    } catch (err) {
      if (err.code === 429 || err.code >= 500) { await sleep(delay); continue; }
      throw err;
    }
    onTick?.(info);
    if (info.state === 'success' || info.state === 'fail') return info;
    await sleep(delay);
    delay = Math.min(delay * 1.3, 20_000);
  }
  throw new Error(`task ${taskId} still running after ${timeoutMs / 60_000} min`);
}

export async function download(url, dest) {
  const { writeFile } = await import('node:fs/promises');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}
