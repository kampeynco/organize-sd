import { submissionsDatabase } from './_database.js';
import { json, readSubmission, submissionKeys, rateLimited } from './_submission.js';

const SOURCES = new Set(['hero', 'newsletter', 'sticky']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const payload = await readSubmission(request, 4096);
  if (payload instanceof Response) return payload;

  // Honeypot: real visitors never see or fill this field
  if (typeof payload.company === 'string' && payload.company.trim() !== '') {
    return json({ ok: true });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const zip = typeof payload.zip === 'string' ? payload.zip.trim() : '';
  const source = typeof payload.source === 'string' ? payload.source : '';

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (!/^[0-9]{5}$/.test(zip)) {
    return json({ error: 'Please enter a 5-digit ZIP code.' }, 400);
  }
  if (!SOURCES.has(source)) {
    return json({ error: 'Invalid signup source.' }, 400);
  }

  try {
    const { ipKey, emailKey } = submissionKeys(request, email);
    const sql = submissionsDatabase();
    const [row] = await sql`
      SELECT submission_api.submit_signup(${email}, ${zip}, ${source}, ${ipKey}, ${emailKey}) AS result
    `;
    if (row?.result === 'limited') return rateLimited();
    if (row?.result !== 'ok') throw new Error('Unconfirmed signup');
    return json({ ok: true });
  } catch {
    console.error('Signup database write failed');
    return json({ error: 'Something went wrong. Please try again.' }, 503);
  }
}
