import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { build } from 'esbuild';
neonConfig.webSocketConstructor = WebSocket;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const result = await build({ entryPoints: ['api/applications.ts'], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name: 'transaction', setup(build) {
  build.onResolve({ filter: /^@neondatabase\/serverless$/ }, () => ({ path: 'neon', namespace: 'test' }));
  build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const neon = () => (...args) => globalThis.applicationTestSQL(...args);' }));
} }] });
const { POST } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
globalThis.applicationTestSQL = async (strings, ...values) => {
  const query = strings.reduce((sql, text, index) => sql + (index ? '$' + index : '') + text, '');
  return (await client.query(query, values)).rows;
};
const submissionId = randomUUID();
const answers = { name: 'Rollback QA Applicant', email: 'rollback-qa@example.com', why_join: 'Test', weekend_availability: 'No', future_training: 'Yes', travel: 'Yes', comfort_strangers: '5', important_issue: 'Test', proudest_action: 'Test', leadership: 'Test', elevator_pitch: 'Test', organizing_experience: 'Test', start_from_zero: 'Test', juggling: 'Test', phone_internet: 'Yes', travel_support: 'No', learning_style: 'Mentoring', organizing_role: 'Volunteer leader', diverse_teams: 'Test' };
const req = a => new Request('http://localhost/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId, answers: a }) });
try {
  await client.query('BEGIN');
  assert.equal((await POST(req(answers))).status, 200);
  assert.equal((await POST(req(answers))).status, 200);
  assert.equal((await POST(req({ ...answers, why_join: 'Changed answer' }))).status, 409);
  const saved = await client.query('SELECT name, email, answers, created_at FROM public.applications WHERE id = $1', [submissionId]);
  assert.equal(saved.rows.length, 1);
  assert.equal(saved.rows[0].answers.why_join, 'Test');
  assert.equal(saved.rows[0].answers.future_training, 'Yes');
  assert.ok(saved.rows[0].created_at);
  console.log('PASS: real Neon insert, readback, duplicate retry, conflicting payload protection, timestamp.');
} finally {
  await client.query('ROLLBACK');
  assert.equal((await client.query('SELECT count(*)::int AS count FROM public.applications WHERE id = $1', [submissionId])).rows[0].count, 0);
  console.log('PASS: transaction rolled back; no QA application retained.');
  client.release();
  await pool.end();
}
