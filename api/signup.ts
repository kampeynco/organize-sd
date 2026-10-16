import { neon } from '@neondatabase/serverless';

const SOURCES = new Set(['hero', 'newsletter', 'sticky']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  // Honeypot: real visitors never see or fill this field
  if (typeof payload.company === 'string' && payload.company.trim() !== '') {
    return json({ ok: true });
  }

  const email = String(payload.email ?? '').trim().toLowerCase();
  const zip = String(payload.zip ?? '').trim();
  const source = String(payload.source ?? '');

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
    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      INSERT INTO signups (email, zip, source)
      VALUES (${email}, ${zip}, ${source})
      ON CONFLICT (email) DO UPDATE
        SET zip = EXCLUDED.zip, source = EXCLUDED.source, updated_at = now()
    `;
    return json({ ok: true });
  } catch (err) {
    console.error('signup insert failed', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
