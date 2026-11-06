// Restore only into an explicitly named EMPTY database, never over the source host.
import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { ageTool, identifier, inventory, pgEnvironment, pgTool, psqlQuery, roles, run, sha256File } from './common.mjs';

process.umask(0o077);
const [folder] = process.argv.slice(2);
if (!folder || !process.env.RESTORE_DATABASE_URL || !process.env.RESTORE_EXPECTED_DATABASE || !process.env.BACKUP_AGE_IDENTITY) {
  throw new Error('Backup folder, RESTORE_DATABASE_URL, RESTORE_EXPECTED_DATABASE, and BACKUP_AGE_IDENTITY are required');
}
try {
  const key = resolve(process.env.BACKUP_AGE_IDENTITY);
  if ((await stat(key)).mode & 0o077) throw new Error('Recovery identity must be readable only by its owner');
  const archive = join(folder, 'database.dump.age');
  const manifestPath = join(folder, 'manifest.json.age');
  const receipt = JSON.parse(await readFile(join(folder, 'receipt.json'), 'utf8'));
  if (await sha256File(archive) !== receipt.archiveSha256 || await sha256File(manifestPath) !== receipt.manifestSha256) throw new Error('Backup checksum mismatch');
  const decode = run(ageTool(), ['--decrypt', '--identity', key, manifestPath], { input: '' });
  const manifest = JSON.parse((await decode.done).toString());
  if (manifest.formatVersion !== 1 || manifest.archiveSha256 !== receipt.archiveSha256) throw new Error('Invalid authenticated manifest');
  const target = new URL(process.env.RESTORE_DATABASE_URL);
  const database = decodeURIComponent(target.pathname.slice(1));
  if (database !== process.env.RESTORE_EXPECTED_DATABASE || target.hostname.replace('-pooler.', '.') === manifest.sourceHost.replace('-pooler.', '.')) {
    throw new Error('Restore target does not match the explicit empty target or is on the source host');
  }
  const query = psqlQuery(target.toString());
  const [objects] = await query(`SELECT (
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND c.relkind IN ('r','p','v','m','S','f')) +
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema') +
    (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND t.typtype IN ('e','d')) +
    (SELECT count(*) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','information_schema'))
    )::int AS count`);
  if (objects.count) throw new Error('Restore target is not empty');
  const environment = pgEnvironment(target.toString(), { localRestore: true });
  // Role passwords and provider administrator roles are deliberately not backed up.
  // Existing roles are left unchanged. Missing application roles are created without login access.
  const bootstrap = roles.map(role => `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${role}') THEN
    CREATE ROLE ${identifier(role)} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$;`).join('\n') +
    // The archive recreates public with its original ACL. RESTRICT protects against races
    // that might create objects after the empty-target check. Never use CASCADE here.
    '\nGRANT organize_submit_executor TO neondb_owner;\nDROP SCHEMA IF EXISTS public RESTRICT;\n';
  await run(pgTool('psql'), ['-X', '-q', '--set=ON_ERROR_STOP=1'], { env: environment, input: bootstrap }).done;
  const decrypt = run(ageTool(), ['--decrypt', '--identity', key, archive], { capture: false, input: '' });
  const restore = run(pgTool('pg_restore'), ['--exit-on-error', '--single-transaction', '--no-tablespaces', '--dbname', database], { env: environment, capture: true });
  try {
    await Promise.all([pipeline(decrypt.child.stdout, restore.child.stdin), decrypt.done, restore.done]);
  } catch (error) { decrypt.child.kill(); restore.child.kill(); throw error; }
  const restored = await inventory(query);
  assert.deepEqual(restored.tables, manifest.tables, 'Restored table data or RLS state differs');
  assert.deepEqual(restored.policies, manifest.policies, 'Restored policies differ');
  assert.deepEqual(restored.functions, manifest.functions, 'Restored function ownership/security differs');
  // Verify private table access is still denied to every runtime role, without reading any records.
  for (const role of ['organize_submissions', 'organize_results', 'organize_importer']) {
    const [privileges] = await query(`SELECT has_table_privilege('${role}','public.applications','SELECT') AS applicants,
      has_table_privilege('${role}','public.signups','SELECT') AS signups`);
    if (privileges.applicants || privileges.signups) throw new Error('Restored private-table access is too broad');
  }
  const proof = { status: 'restore-verified', verifiedAt: new Date().toISOString(), targetDatabase: database,
    tables: restored.tables.length, dataChecksumsMatched: true, rlsMatched: true, policiesMatched: true,
    functionOwnershipMatched: true, privateRuntimeReadsDenied: true };
  await writeFile(join(folder, 'restore-verification.json'), JSON.stringify(proof, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(proof));
} catch (error) {
  // Assertion diffs/SQL errors can contain private metadata; never log full exception objects.
  console.error('Restore failed:', error.code === 'ERR_ASSERTION' ? 'Restored data/security did not match the authenticated manifest' : error.message);
  process.exitCode = 1;
}
