import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pgEnvironment, requireBackupDirectory, ageTool } from '../scripts/backups/common.mjs';

test('database tools enforce verified TLS and remove unrelated credentials from their environment', () => {
  const env = pgEnvironment('postgresql://organize_backup:example@ep-test-pooler.neon.tech/neondb?sslmode=disable');
  assert.equal(env.PGHOST, 'ep-test.neon.tech');
  assert.equal(env.PGSSLMODE, 'verify-full');
  assert.ok(!env.DATABASE_URL && !env.SUBMISSIONS_DATABASE_URL && !env.SUBMISSION_RATE_SECRET);
  assert.throws(() => pgEnvironment('postgresql://user:example@attacker.example/neondb'));
  assert.throws(() => pgEnvironment('postgresql://user@localhost/neondb'));
});

test('backups cannot be placed inside the public source repository', () => {
  assert.throws(() => requireBackupDirectory(process.cwd()));
  assert.throws(() => requireBackupDirectory(join(process.cwd(), 'public', 'backups')));
});

const fixture = process.env.BACKUP_TEST_DIR;
test('restore refuses corrupted archives, wrong keys, the source host, and populated targets', { skip: !fixture }, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'organize-backup-negative-'));
  const invoke = (folder, overrides = {}) => spawnSync(process.execPath, ['scripts/backups/restore.mjs', folder], {
    env: { ...process.env, ...overrides }, encoding: 'utf8',
  });
  try {
    const bad = join(temporary, 'corrupted');
    await cp(fixture, bad, { recursive: true });
    const bytes = await readFile(join(bad, 'database.dump.age'));
    bytes[bytes.length - 1] ^= 1;
    await writeFile(join(bad, 'database.dump.age'), bytes);
    const corrupt = invoke(bad);
    assert.equal(corrupt.status, 1);
    assert.match(corrupt.stderr, /checksum mismatch/);
    const wrongKey = join(temporary, 'wrong.agekey');
    const generated = spawnSync(ageTool().replace(/age$/, 'age-keygen'), ['-o', wrongKey], { encoding: 'utf8' });
    assert.equal(generated.status, 0);
    const wrong = invoke(fixture, { BACKUP_AGE_IDENTITY: wrongKey });
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /failed/);
    const sameHost = invoke(fixture, { RESTORE_DATABASE_URL: process.env.BACKUP_DATABASE_URL, RESTORE_EXPECTED_DATABASE: 'neondb' });
    assert.equal(sameHost.status, 1);
    assert.match(sameHost.stderr, /source host/);
    const populated = invoke(fixture);
    assert.equal(populated.status, 1);
    assert.match(populated.stderr, /not empty/);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
