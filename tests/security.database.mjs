// Uses the isolated branch configured by .env.security-qa.local; never the live host.
// node --env-file=.env.migration.local --env-file=.env.security-qa.local tests/security.database.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { Pool, neon, neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = WebSocket;
const runtime = new URL(process.env.SUBMISSIONS_DATABASE_URL);
const owner = new URL(process.env.DATABASE_URL);
assert.notEqual(runtime.hostname, owner.hostname, 'Run destructive test cleanup only on an isolated branch');
owner.hostname = runtime.hostname;
const adminPool = new Pool({ connectionString: owner.toString() });
const admin = await adminPool.connect();
const pools = [];
const clients = {};
const hash = () => randomBytes(32).toString('hex');
const testId = randomUUID();
const prefix = `security-${testId}`;
const ip = hash();
let checks = 0;
async function denied(client, query) {
  await client.query('SAVEPOINT permission_check');
  await assert.rejects(client.query(query), e => e.code === '42501');
  await client.query('ROLLBACK TO SAVEPOINT permission_check');
  checks++;
}
try {
  for (const [name, env] of Object.entries({ submissions: 'SUBMISSIONS_DATABASE_URL', results: 'RESULTS_DATABASE_URL', importer: 'IMPORT_DATABASE_URL' })) {
    const pool = new Pool({ connectionString: process.env[env] });
    pools.push(pool);
    const client = await pool.connect();
    clients[name] = client;
    await client.query('BEGIN');
    const { rows: [role] } = await client.query('SELECT current_user, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_roles WHERE rolname=current_user');
    assert.equal(role.current_user, `organize_${name}`);
    assert.ok(!role.rolsuper && !role.rolcreaterole && !role.rolcreatedb && !role.rolbypassrls);
    for (const table of ['public.applications', 'public.signups', 'public.sms_optins', 'submission_private.rate_limits']) await denied(client, `SELECT * FROM ${table} LIMIT 1`);
    await denied(client, 'SET ROLE organize_submit_executor');
    await denied(client, 'CREATE TABLE public.security_should_be_denied (id int)');
    await denied(client, 'DELETE FROM public.applications WHERE false');
  }
  await denied(clients.submissions, 'SELECT * FROM sos.elections');
  await denied(clients.results, 'DELETE FROM sos.elections WHERE false');
  await denied(clients.results, "SELECT submission_api.submit_signup('a@example.com','57104','hero',repeat('a',64),repeat('b',64))");
  await denied(clients.results, "SELECT submission_api.submit_signup_with_sms('a@example.com','57104','hero',NULL,NULL,repeat('a',64),repeat('b',64))");
  assert.ok((await clients.results.query('SELECT count(*)::int AS count FROM sos.counties')).rows[0].count > 0);
  await clients.importer.query("INSERT INTO sos.elections (election_id,election_date,title) VALUES ($1,'2099-01-01','Security test')", [prefix]);
  await clients.importer.query('DELETE FROM sos.elections WHERE election_id=$1', [prefix]);
  checks += 3;

  const submit = clients.submissions;
  const appArgs = [testId, 'Security test', `${prefix}@example.com`, JSON.stringify({ why_join: 'Synthetic test' }), readFileSync('tests/fixtures/voice-answer.webm'), 'audio/webm', 1500, ip, hash()];
  const app = 'SELECT submission_api.submit_application_with_voice($1,$2,$3,$4::jsonb,$5::bytea,$6,$7,$8,$9) AS result';
  assert.equal((await submit.query(app, appArgs)).rows[0].result, 'ok');
  assert.equal((await submit.query(app, appArgs)).rows[0].result, 'ok');
  assert.equal((await submit.query(app, [...appArgs.slice(0, 3), JSON.stringify({ why_join: 'Changed' }), ...appArgs.slice(4)])).rows[0].result, 'conflict');
  const changedAudio = Buffer.from(appArgs[4]);
  changedAudio[changedAudio.length - 1] ^= 1;
  assert.equal((await submit.query(app, [...appArgs.slice(0, 4), changedAudio, ...appArgs.slice(5)])).rows[0].result, 'conflict');
  checks++;
  await denied(submit, `SELECT submission_api.submit_application('${testId}','test','test@example.com','{}',repeat('a',64),repeat('b',64))`);
  const signup = 'SELECT submission_api.submit_signup($1,$2,$3,$4,$5) AS result';
  const signupArgs = [`${prefix}@example.com`, '57104', 'hero', ip, hash()];
  assert.equal((await submit.query(signup, signupArgs)).rows[0].result, 'ok');
  assert.equal((await submit.query(signup, [signupArgs[0], '10001', 'sticky', ...signupArgs.slice(3)])).rows[0].result, 'ok');
  const smsSignup = 'SELECT submission_api.submit_signup_with_sms($1,$2,$3,$4,$5,$6,$7) AS result';
  assert.equal((await submit.query(smsSignup, [`${prefix}-sms@example.com`, '57104', 'hero', '+16055550123', 'Consent text', ip, hash()])).rows[0].result, 'ok');
  assert.equal((await submit.query(smsSignup, [`${prefix}-sms@example.com`, '57104', 'hero', null, null, ip, hash()])).rows[0].result, 'ok');
  for (const [phone, consent] of [['+16055550123', null], [null, 'Consent text'], ['6055550123', 'Consent text'], ['+11055550123', 'Consent text']]) {
    await submit.query('SAVEPOINT sms_check');
    await assert.rejects(submit.query(smsSignup, [`${prefix}-sms@example.com`, '57104', 'hero', phone, consent, ip, hash()]), e => e.code === '22023');
    await submit.query('ROLLBACK TO SAVEPOINT sms_check');
  }
  checks += 6;
  // Verify via the same transaction with an owner connection in a separate RLS test below.
  // Here, the runtime role cannot SELECT even its own test rows.
  checks += 5;
  for (const client of Object.values(clients)) await client.query('ROLLBACK');

  await admin.query('BEGIN');
  await admin.query('GRANT organize_submissions TO neondb_owner');
  const flags = await admin.query("SELECT schemaname,tablename,rowsecurity FROM pg_tables WHERE schemaname IN ('public','sos','submission_private')");
  assert.ok(flags.rows.every(row => row.rowsecurity));
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','sos','submission_private') AND c.relkind='r' AND NOT c.relforcerowsecurity")).rows[0].count, 0);
  // Prove that RLS still blocks reads even if someone accidentally grants SELECT.
  await admin.query('GRANT SELECT ON public.applications, public.signups, public.sms_optins TO organize_submissions');
  await admin.query('SET LOCAL ROLE organize_submissions');
  assert.equal((await admin.query('SELECT count(*)::int AS count FROM public.applications')).rows[0].count, 0);
  assert.equal((await admin.query('SELECT count(*)::int AS count FROM public.signups')).rows[0].count, 0);
  assert.equal((await admin.query('SELECT count(*)::int AS count FROM public.sms_optins')).rows[0].count, 0);
  await admin.query('RESET ROLE');
  const keys = [hash(), hash()];
  await admin.query('SET LOCAL ROLE organize_submissions');
  await admin.query(app, appArgs);
  await admin.query(signup, [`${prefix}@example.com`, '57104', 'hero', ...keys]);
  await admin.query(signup, [`${prefix}@example.com`, '10001', 'sticky', ...keys]);
  const smsCall = 'SELECT submission_api.submit_signup_with_sms($1,$2,$3,$4,$5,$6,$7)';
  await admin.query(smsCall, [`${prefix}@example.com`, '20500', 'newsletter', '+16055550123', 'First consent', ...keys]);
  await admin.query(smsCall, [`${prefix}@example.com`, '20500', 'newsletter', '+16055550123', 'Second consent', ...keys]);
  await admin.query('RESET ROLE');
  const voice = (await admin.query('SELECT pitch_audio,pitch_audio_mime,pitch_audio_duration_ms FROM public.applications WHERE id=$1', [testId])).rows[0];
  assert.deepEqual(voice.pitch_audio, appArgs[4]);
  assert.equal(voice.pitch_audio_mime, 'audio/webm');
  assert.equal(voice.pitch_audio_duration_ms, 1500);
  checks += 3;
  const original = (await admin.query('SELECT zip,source FROM public.signups WHERE email=$1', [`${prefix}@example.com`])).rows[0];
  assert.deepEqual(original, { zip: '57104', source: 'hero' });
  // An existing subscriber can add texts without rewriting the signup; each consent is its own record.
  const optins = (await admin.query('SELECT phone,email,zip,source,consent_text FROM public.sms_optins WHERE email=$1 ORDER BY id', [`${prefix}@example.com`])).rows;
  assert.deepEqual(optins.map(row => row.consent_text), ['First consent', 'Second consent']);
  assert.deepEqual({ ...optins[0], consent_text: undefined }, { phone: '+16055550123', email: `${prefix}@example.com`, zip: '20500', source: 'newsletter', consent_text: undefined });
  await admin.query('ROLLBACK');
  checks += 7;

  // Separate HTTPS sessions prove the limiter is durable and atomic across instances.
  const sql = neon(process.env.SUBMISSIONS_DATABASE_URL);
  const responses = await Promise.all(Array.from({ length: 25 }, (_, index) => sql.query(signup, [
    `${prefix}-${index}@example.com`, '57104', 'hero', ip, hash(),
  ])));
  assert.equal(responses.filter(rows => rows[0].result === 'ok').length, 20);
  assert.equal(responses.filter(rows => rows[0].result === 'limited').length, 5);
  assert.equal((await neon(process.env.SUBMISSIONS_DATABASE_URL).query(signup, [`${prefix}-again@example.com`, '57104', 'hero', ip, hash()]))[0].result, 'limited');
  checks += 3;
  console.log(`PASS: ${checks} database assertions, including denied private reads, RLS under accidental grants, retries, unchanged signup records, importer writes, and concurrent rate limits.`);
} finally {
  for (const client of Object.values(clients)) { await client.query('ROLLBACK'); client.release(); }
  await admin.query('ROLLBACK');
  await admin.query('DELETE FROM public.sms_optins WHERE email LIKE $1', [`${prefix}%@example.com`]);
  await admin.query('DELETE FROM public.signups WHERE email LIKE $1', [`${prefix}%@example.com`]);
  await admin.query('DELETE FROM public.applications WHERE id=$1', [testId]);
  admin.release();
  await Promise.all([...pools, adminPool].map(pool => pool.end()));
}
