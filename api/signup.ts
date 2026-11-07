import { SMS_CONSENT_RECORD, normalizeUsPhone } from '../lib/sms.js';
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

  // Text opt-in is optional, but a phone number is only accepted with explicit consent and vice versa.
  if (payload.phone !== undefined && typeof payload.phone !== 'string') {
    return json({ error: 'Please enter a valid 10-digit US mobile number.' }, 400);
  }
  if (payload.smsConsent !== undefined && typeof payload.smsConsent !== 'boolean') {
    return json({ error: 'Invalid text message consent.' }, 400);
  }
  const rawPhone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const smsConsent = payload.smsConsent === true;
  let phone: string | null = null;
  if (rawPhone !== '') {
    phone = normalizeUsPhone(rawPhone);
    if (!phone) return json({ error: 'Please enter a valid 10-digit US mobile number.' }, 400);
    if (!smsConsent) {
      return json({ error: 'Check the box to agree to text messages, or leave the mobile number blank.' }, 400);
    }
  } else if (smsConsent) {
    return json({ error: 'Enter your mobile number to receive text messages.' }, 400);
  }
  const consentText = phone ? SMS_CONSENT_RECORD : null;

  try {
    const { ipKey, emailKey } = submissionKeys(request, email);
    const sql = submissionsDatabase();
    const [row] = await sql`
      SELECT submission_api.submit_signup_with_sms(
        ${email}, ${zip}, ${source}, ${phone}, ${consentText}, ${ipKey}, ${emailKey}
      ) AS result
    `;
    if (row?.result === 'limited') return rateLimited();
    if (row?.result !== 'ok') throw new Error('Unconfirmed signup');
    return json({ ok: true });
  } catch {
    console.error('Signup database write failed');
    return json({ error: 'Something went wrong. Please try again.' }, 503);
  }
}
