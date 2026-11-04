import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
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
const { POST } = await load('api/applications.ts', true);
const { validateApplication, QUESTIONS, countWords } = await load('lib/application.ts');
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
const request = (body = { submissionId, answers }, headers = {}) => new Request('http://localhost/api/applications', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('compiled endpoint loads in native Node ESM, as on Vercel', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'application-runtime-'));
  try {
    await writeFile(path.join(directory, 'package.json'), '{"type":"module"}');
    await symlink(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir');
    await build({ entryPoints: ['api/applications.ts', 'lib/application.ts'], outbase: '.', outdir: directory, platform: 'node', format: 'esm', bundle: false });
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
    const response = await POST(request({ submissionId, answers: overLimit }));
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
  assert.equal((await POST(request({ value: 'x'.repeat(256001) }))).status, 413);
  assert.equal((await POST(request(undefined, { 'Content-Length': '256001' }))).status, 413);
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
  release([{ id: submissionId }]);
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
  globalThis.applicationTestSQL = async () => [];
  assert.equal((await POST(request())).status, 409);
});

test('client requires a confirmed save and preserves the retry submission ID', async () => {
  const originalFetch = globalThis.fetch;
  const ids = [];
  try {
    for (const response of [new Response('<html>fallback</html>'), Response.json({ ok: true }),
      Response.json({ ok: true, id: 'wrong' }), Response.json({ error: 'Save failed' }, { status: 503 })]) {
      globalThis.fetch = async (_url, init) => { ids.push(JSON.parse(init.body).submissionId); return response; };
      await assert.rejects(submitApplication(submissionId, answers));
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(submitApplication(submissionId, answers), /connection/);
    globalThis.fetch = async (_url, init) => { ids.push(JSON.parse(init.body).submissionId); return Response.json({ ok: true, id: submissionId }); };
    await submitApplication(submissionId, answers);
    assert.ok(ids.every(id => id === submissionId));
  } finally { globalThis.fetch = originalFetch; }
});
