import { neon } from '@neondatabase/serverless';
import { validateApplication } from '../lib/application.js';

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});
const MAX_BODY_BYTES = 256000;

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Please submit your application as JSON.' }, 415);
  }
  let payload: Record<string, unknown>;
  try {
    // Bound the streamed body as well as checking Content-Length (which may be absent).
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return json({ error: 'Application is too large.' }, 413);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Invalid application.' }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({ error: 'Application is too large.' }, 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    payload = JSON.parse(new TextDecoder().decode(body));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ error: 'Invalid application.' }, 400);
  } catch {
    return json({ error: 'Invalid application.' }, 400);
  }

  const id = payload.submissionId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return json({ error: 'Invalid submission ID.' }, 400);
  }
  const result = validateApplication(payload.answers);
  if (result.error) return json({ error: result.error, field: result.field }, 400);
  const { name, email, ...answers } = result.answers;

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      INSERT INTO public.applications (id, name, email, answers)
      VALUES (${id}::uuid, ${name}, ${email}, ${JSON.stringify(answers)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET id = applications.id
      WHERE applications.name = EXCLUDED.name
        AND applications.email = EXCLUDED.email
        AND applications.answers = EXCLUDED.answers
      RETURNING id
    `;
    // Repeating the same submission succeeds without creating another row.
    // A reused ID can never overwrite another application.
    if (!rows.length) return json({ error: 'This submission ID has already been used. Please reload the form to start a new application.' }, 409);
    return json({ ok: true, id: rows[0].id });
  } catch {
    // Do not log applicant answers, contact details, or database credentials.
    console.error('Application database write failed');
    return json({ error: 'Could not save your application. Please try again.' }, 503);
  }
}
