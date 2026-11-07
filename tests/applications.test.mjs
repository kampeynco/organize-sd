import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Bundle the real endpoint, replacing only its database transport so failures can be exercised safely.
async function load(file, mockDatabase = false) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'esm',
    plugins: mockDatabase ? [{ name: 'database-test-transport', setup(build) {
      build.onResolve({ filter: /^@neondatabase\/serverless$/ }, () => ({ path: 'neon', namespace: 'test' }));
      build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const neon = () => (...args) => globalThis.applicationTestSQL(...args);' }));
    } }] : [],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
process.env.SUBMISSIONS_DATABASE_URL = 'postgresql://organize_submissions:test@ep-test.neon.tech/neondb?sslmode=require';
process.env.SUBMISSION_RATE_SECRET = 'test-secret-only-'.repeat(4);
const { POST } = await load('api/applications.ts', true);
const { validateApplication: validateWithVoice, QUESTIONS, countWords } = await load('lib/application.ts');
const voice = { mimeType: 'audio/webm', data: (await readFile('tests/fixtures/voice-answer.webm')).toString('base64'), durationMs: 1500 };
const validateApplication = (answers, recording = voice) => validateWithVoice(answers, recording);
const { submitApplication } = await load('lib/submitApplication.ts');
const submissionId = '731d7fb2-2506-4b01-bdae-8efe2b8a5126';
const answers = {
  name: ' Test Applicant ', email: ' Applicant@EXAMPLE.COM ', why_join: "I want to organize my community's volunteers.",
  weekend_availability: 'Yes', travel: 'No', comfort_strangers: '7', important_issue: 'Housing',
  proudest_action: 'Volunteering', leadership: 'Club leader', elevator_pitch: 'Make your voice heard.',
  organizing_experience: 'Community events', start_from_zero: 'Started a local club', juggling: 'Scheduled shifts',
  phone_internet: 'Yes', travel_support: 'Yes', learning_style: 'Mentoring', organizing_role: 'Volunteer leader',
  diverse_teams: 'Worked across neighborhoods',
};
const request = (body = { submissionId, answers, voiceAnswer: voice }, headers = {}) => new Request('http://localhost/api/applications', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('compiled endpoint loads in native Node ESM, as on Vercel', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'application-runtime-'));
  try {
    await writeFile(path.join(directory, 'package.json'), '{"type":"module"}');
    await symlink(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir');
    await build({ entryPoints: ['api/applications.ts', 'lib/application.ts', 'api/_database.ts', 'api/_submission.ts', 'lib/voiceAnswer.ts'], outbase: '.', outdir: directory, platform: 'node', format: 'esm', bundle: false });
    const endpoint = await import(pathToFileURL(path.join(directory, 'api/applications.js')).href);
    assert.equal((await endpoint.POST(request({}))).status, 400);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('normalizes contact fields, retains answers and excludes hidden or unknown fields', () => {
  const result = validateApplication({ ...answers, future_training: 'No', unexpected: 'discard' });
  assert.equal(result.answers.name, 'Test Applicant');
  assert.equal(result.answers.email, 'applicant@example.com');
  assert.equal(result.answers.why_join, answers.why_join);
  assert.equal(result.answers.rural_experience, '');
  assert.ok(!('future_training' in result.answers));
  assert.ok(!('unexpected' in result.answers));
});

test('requires the conditional answer only when weekend attendance is No', () => {
  assert.equal(validateApplication({ ...answers, weekend_availability: 'No' }).field, 'future_training');
  assert.ok(validateApplication({ ...answers, weekend_availability: 'No', future_training: 'Yes' }).answers);
});

test('rejects invalid required fields, types, options, scales and excessive lengths', () => {
  for (const [key, value] of [['name', ' '], ['email', 'invalid'], ['why_join', ''], ['travel', true],
    ['comfort_strangers', '11'], ['comfort_strangers', '1.5'], ['learning_style', 'invalid'],
    ['name', 'n'.repeat(201)], ['why_join', 'x'.repeat(10001)]]) {
    assert.equal(validateApplication({ ...answers, [key]: value }).field, key);
  }
});

test('word limits accept the boundary and reject excess words for every written answer', async () => {
  globalThis.applicationTestSQL = () => assert.fail('Unexpected database write');
  assert.equal(countWords('  \n\t '), 0);
  assert.equal(countWords("  Community-led organizing\nwith\tneighbors.  "), 4);
  for (const question of QUESTIONS.filter(q => q.type === 'textarea')) {
    const atLimit = Array(question.maxWords).fill('word').join(' \n\t');
    assert.ok(validateApplication({ ...answers, [question.id]: atLimit }).answers, question.id);
    const overLimit = { ...answers, [question.id]: `${atLimit} extra` };
    const invalid = validateApplication(overLimit);
    assert.equal(invalid.field, question.id);
    assert.equal(invalid.error, `Please use ${question.maxWords} words or fewer.`);
    const response = await POST(request({ submissionId, answers: overLimit, voiceAnswer: voice }));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).field, question.id);
  }
});

test('endpoint rejects malformed and oversized requests before writing', async () => {
  globalThis.applicationTestSQL = () => assert.fail('Unexpected database write');
  for (const body of [null, [], {}, { submissionId: 'invalid', answers }, { submissionId, answers: null },
    { submissionId, answers: { ...answers, email: 'invalid' } }]) assert.equal((await POST(request(body))).status, 400);
  assert.equal((await POST(new Request('http://localhost/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).status, 400);
  assert.equal((await POST(request(undefined, { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await POST(request({ value: 'x'.repeat(1600001) }))).status, 413);
  assert.equal((await POST(request(undefined, { 'Content-Length': '1600001' }))).status, 413);
});

test('endpoint awaits persistence and sends parameterized contact details and answers', async () => {
  let release;
  const saved = new Promise(resolve => { release = resolve; });
  let captured;
  globalThis.applicationTestSQL = (strings, ...values) => { captured = { strings, values }; return saved; };
  let settled = false;
  const result = POST(request()).then(r => { settled = true; return r; });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(settled, false);
  release([{ result: 'ok' }]);
  const response = await result;
  assert.deepEqual(await response.json(), { ok: true, id: submissionId });
  assert.deepEqual(captured.values.slice(0, 3), [submissionId, 'Test Applicant', 'applicant@example.com']);
  assert.equal(JSON.parse(captured.values[3]).why_join, answers.why_join);
  assert.ok(!captured.strings.join('').includes(answers.why_join));
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('database errors and conflicting IDs never report success', async () => {
  globalThis.applicationTestSQL = async () => { throw new Error('private database error'); };
  const failure = await POST(request());
  assert.equal(failure.status, 503);
  assert.ok(!(await failure.text()).includes('private database error'));
  globalThis.applicationTestSQL = async () => [{ result: 'conflict' }];
  assert.equal((await POST(request())).status, 409);
});

test('client requires a confirmed save and preserves the retry submission ID', async () => {
  const originalFetch = globalThis.fetch;
  const ids = [];
  try {
    for (const response of [new Response('<html>fallback</html>'), Response.json({ ok: true }),
      Response.json({ ok: true, id: 'wrong' }), Response.json({ error: 'Save failed' }, { status: 503 })]) {
      globalThis.fetch = async (_url, init) => { ids.push(JSON.parse(init.body).submissionId); return response; };
      await assert.rejects(submitApplication(submissionId, answers, voice));
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(submitApplication(submissionId, answers, voice), /connection/);
    globalThis.fetch = async (_url, init) => { ids.push(JSON.parse(init.body).submissionId); return Response.json({ ok: true, id: submissionId }); };
    await submitApplication(submissionId, answers, voice);
    assert.ok(ids.every(id => id === submissionId));
  } finally { globalThis.fetch = originalFetch; }
});

const { POST: signup } = await load('api/signup.ts', true);
const { networkIdentity, submissionKeys } = await load('api/_submission.ts');
const signupRequest = (body, headers = {}) => new Request('http://localhost/api/signup', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});
test('signup rejects malformed, null, oversized, non-JSON and cross-origin submissions', async () => {
  globalThis.applicationTestSQL = () => assert.fail('Unexpected database write');
  for (const body of [null, [], {}, { email: 'invalid', zip: '57104', source: 'hero' },
    { email: { toString: null }, zip: '57104', source: 'hero' },
    { email: 'a@example.com', zip: 57104, source: 'hero' }]) assert.equal((await signup(signupRequest(body))).status, 400);
  assert.equal((await signup(signupRequest({ value: 'x'.repeat(4097) }))).status, 413);
  assert.equal((await signup(signupRequest({}, { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await signup(signupRequest({}, { Origin: 'https://attacker.example' }))).status, 403);
});
const { SMS_CONSENT_RECORD, SMS_CONSENT_LABEL, SMS_DISCLOSURE, normalizeUsPhone, formatUsPhone } = await load('lib/sms.ts');
const signupBody = { email: ' A@Example.com ', zip: '57104', source: 'hero' };
test('US mobile numbers normalize to E.164 and reject non-NANP input', () => {
  for (const input of ['6055550123', '(605) 555-0123', '605.555.0123', '+1 605 555 0123', '1-605-555-0123'])
    assert.equal(normalizeUsPhone(input), '+16055550123');
  for (const input of ['', '555-0123', '05555501234', '1055550123', '6051550123', '+44 20 7946 0958', '6'.repeat(33)])
    assert.equal(normalizeUsPhone(input), null);
  assert.equal(formatUsPhone('+16055550123'), '(605) 555-0123');
});
test('signup requires a valid phone and explicit consent together, never one without the other', async () => {
  globalThis.applicationTestSQL = () => assert.fail('Unexpected database write');
  for (const extra of [{ phone: '555-0123', smsConsent: true }, { phone: '6055550123' }, { phone: '6055550123', smsConsent: false },
    { phone: '6055550123', smsConsent: 'yes' }, { phone: 6055550123, smsConsent: true }, { smsConsent: true }, { phone: '  ', smsConsent: true }]) {
    assert.equal((await signup(signupRequest({ ...signupBody, ...extra }))).status, 400, JSON.stringify(extra));
  }
});
test('signup stores the normalized phone with the server-side consent language, and email-only stays email-only', async () => {
  const calls = [];
  globalThis.applicationTestSQL = async (strings, ...values) => { calls.push({ query: strings.join('?'), values }); return [{ result: 'ok' }]; };
  const sms = await signup(signupRequest({ ...signupBody, phone: '(605) 555-0123', smsConsent: true, consentText: 'forged' }));
  assert.equal(sms.status, 200);
  const emailOnly = await signup(signupRequest({ ...signupBody, phone: '', smsConsent: false }));
  assert.equal(emailOnly.status, 200);
  assert.ok(calls.every(call => call.query.includes('submission_api.submit_signup_with_sms(')));
  assert.deepEqual(calls[0].values.slice(0, 5), ['a@example.com', '57104', 'hero', '+16055550123', SMS_CONSENT_RECORD]);
  assert.deepEqual(calls[1].values.slice(0, 5), ['a@example.com', '57104', 'hero', null, null]);
  assert.ok(SMS_CONSENT_RECORD.includes(SMS_CONSENT_LABEL) && SMS_CONSENT_RECORD.includes(SMS_DISCLOSURE));
  assert.ok(SMS_CONSENT_RECORD.length <= 2000);
});
test('both endpoints report durable rate limits and fail closed on missing configuration', async () => {
  globalThis.applicationTestSQL = async () => [{ result: 'limited' }];
  for (const response of [await POST(request()), await signup(signupRequest({ email: 'a@example.com', zip: '57104', source: 'hero' }))]) {
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '3600');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const secret = process.env.SUBMISSION_RATE_SECRET;
  delete process.env.SUBMISSION_RATE_SECRET;
  assert.equal((await POST(request())).status, 503);
  process.env.SUBMISSION_RATE_SECRET = secret;
  const database = process.env.SUBMISSIONS_DATABASE_URL;
  delete process.env.SUBMISSIONS_DATABASE_URL;
  assert.equal((await POST(request())).status, 503);
  process.env.SUBMISSIONS_DATABASE_URL = database;
});
test('network keys normalize IPv6 and ignore untrusted forwarding headers', () => {
  assert.equal(networkIdentity('2001:db8:abcd:0001::1'), networkIdentity('2001:db8:abcd:1:1234:5678:1234:5678'));
  assert.equal(networkIdentity('::ffff:192.0.2.1'), networkIdentity('192.0.2.1'));
  const first = submissionKeys(request(undefined, { 'X-Forwarded-For': '192.0.2.1' }), 'a@example.com');
  const second = submissionKeys(request(undefined, { 'X-Forwarded-For': '192.0.2.2' }), 'a@example.com');
  assert.deepEqual(first, second);
  process.env.VERCEL = '1';
  try {
    assert.throws(() => submissionKeys(request(undefined, { 'X-Forwarded-For': '192.0.2.1' }), 'a@example.com'));
    const trusted = submissionKeys(request(undefined, { 'X-Vercel-Forwarded-For': '192.0.2.1' }), 'a@example.com');
    assert.match(trusted.ipKey, /^[a-f0-9]{64}$/);
    assert.notEqual(trusted.ipKey, first.ipKey);
  } finally { delete process.env.VERCEL; }
});


test('voting pitch requires a bounded audio recording, never typed text', async () => {
  globalThis.applicationTestSQL = () => assert.fail('Invalid audio reached database');
  for (const recording of [null, {}, {...voice, mimeType:'text/html'}, {...voice, data:'<script>no</script>'},
    {...voice, data:Buffer.from('not audio'.repeat(30)).toString('base64')}, {...voice, durationMs:0},
    {...voice, durationMs:60001}, {...voice, data:'A'.repeat(1333340)}]) {
    const response = await POST(request({submissionId,answers,voiceAnswer:recording}));
    assert.equal(response.status,400);
    assert.equal((await response.json()).field,'elevator_pitch');
  }
  assert.equal(validateWithVoice(answers).field,'elevator_pitch');
  const result=validateApplication(answers);
  assert.ok(!('elevator_pitch' in result.answers));
  assert.deepEqual(result.voiceAnswer,voice);
});
