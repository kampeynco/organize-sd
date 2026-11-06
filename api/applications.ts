import { MAX_APPLICATION_BYTES } from '../lib/voiceAnswer.js';
import { validateApplication } from '../lib/application.js';
import { submissionsDatabase } from './_database.js';
import { json, readSubmission, submissionKeys, rateLimited } from './_submission.js';

export async function POST(request: Request) {
  const payload = await readSubmission(request, MAX_APPLICATION_BYTES);
  if (payload instanceof Response) return payload;

  const id = payload.submissionId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return json({ error: 'Invalid submission ID.' }, 400);
  }
  const result = validateApplication(payload.answers, payload.voiceAnswer);
  if (result.error) return json({ error: result.error, field: result.field }, 400);
  const { name, email, ...answers } = result.answers;

  try {
    const { ipKey, emailKey } = submissionKeys(request, email);
    const sql = submissionsDatabase();
    const [row] = await sql`
      SELECT submission_api.submit_application_with_voice(
        ${id}::uuid, ${name}, ${email}, ${JSON.stringify(answers)}::jsonb,
        decode(${result.voiceAnswer.data}, 'base64'), ${result.voiceAnswer.mimeType}, ${result.voiceAnswer.durationMs}, ${ipKey}, ${emailKey}
      ) AS result
    `;
    if (row?.result === 'limited') return rateLimited();
    if (row?.result === 'conflict') return json({ error: 'This submission ID has already been used. Please reload the form to start a new application.' }, 409);
    if (row?.result !== 'ok') throw new Error('Unconfirmed application');
    return json({ ok: true, id });
  } catch {
    console.error('Application database write failed');
    return json({ error: 'Could not save your application. Please try again.' }, 503);
  }
}
