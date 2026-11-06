import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export async function readSubmission(request: Request, maxBytes: number): Promise<Record<string, unknown> | Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Please submit this form from our website.' }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Please submit the form as JSON.' }, 415);
  }
  if (Number(request.headers.get('content-length')) > maxBytes) return json({ error: 'Submission is too large.' }, 413);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Invalid submission.' }, 400);
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return json({ error: 'Submission is too large.' }, 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const payload = JSON.parse(new TextDecoder().decode(body));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ error: 'Invalid submission.' }, 400);
    return payload;
  } catch {
    return json({ error: 'Invalid submission.' }, 400);
  } finally {
    reader.releaseLock();
  }
}

/** Group IPv6 privacy addresses by /64; normalize alternate spellings before hashing. */
export function networkIdentity(ip: string) {
  if (isIP(ip) === 4) return ip;
  if (isIP(ip) !== 6) throw new Error('Missing trusted client address');
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const halves = canonical.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const parts = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  const numbers = parts.map(part => parseInt(part, 16));
  if (numbers.slice(0, 5).every(n => n === 0) && numbers[5] === 65535) {
    return [numbers[6] >> 8, numbers[6] & 255, numbers[7] >> 8, numbers[7] & 255].join('.');
  }
  return numbers.slice(0, 4).map(n => n.toString(16)).join(':') + '::/64';
}

export function submissionKeys(request: Request, email: string) {
  const secret = process.env.SUBMISSION_RATE_SECRET;
  if (!secret || secret.length < 32) throw new Error('Submission protection is not configured');
  // Vercel overwrites this header at its trusted edge. Do not accept caller-controlled X-Forwarded-For.
  const ip = process.env.VERCEL === '1'
    ? request.headers.get('x-vercel-forwarded-for')?.trim() ?? ''
    : ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname) ? '127.0.0.1' : '';
  const hash = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  return { ipKey: hash(`ip:${networkIdentity(ip)}`), emailKey: hash(`email:${email}`) };
}

export const rateLimited = () => json({ error: 'Too many submissions. Please try again in an hour.' }, 429, { 'Retry-After': '3600' });
