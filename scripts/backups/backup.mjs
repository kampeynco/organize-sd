import { mkdir, mkdtemp, writeFile, rename, rm, chmod } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { ageTool, inventory, pgEnvironment, pgTool, requireBackupDirectory, run, schemas, sha256File } from './common.mjs';

process.umask(0o077);
const required = ['BACKUP_DATABASE_URL', 'BACKUP_AGE_RECIPIENT', 'BACKUP_DIR'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
const source = new URL(process.env.BACKUP_DATABASE_URL);
if (decodeURIComponent(source.username) !== 'organize_backup') throw new Error('A dedicated backup reader is required');
if (!/^age1[0-9a-z]+$/.test(process.env.BACKUP_AGE_RECIPIENT)) throw new Error('Expected an age public recipient, never a private identity');
const output = requireBackupDirectory(process.env.BACKUP_DIR);
await mkdir(output, { recursive: true, mode: 0o700 });
await chmod(output, 0o700);
const lock = join(output, '.backup.lock');
await mkdir(lock, { mode: 0o700 });
let staging;
let client;
let pool;
try {
  staging = await mkdtemp(join(output, '.pending-'));
  neonConfig.webSocketConstructor = WebSocket;
  source.hostname = source.hostname.replace('-pooler.', '.');
  pool = new Pool({ connectionString: source.toString() });
  client = await pool.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL TIME ZONE 'UTC'");
  const query = async sql => (await client.query(sql)).rows;
  const [identity] = await query(`SELECT current_user, current_setting('server_version_num')::int AS version,
    rolsuper,rolbypassrls,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=current_user`);
  if (identity.rolsuper || identity.rolbypassrls || identity.rolcreaterole || identity.rolcreatedb) throw new Error('Backup credential is too privileged');
  const versionRun = run(pgTool('pg_dump'), ['--version'], { input: '' });
  const version = (await versionRun.done).toString().match(/PostgreSQL\) (\d+)/)?.[1];
  if (!version || Number(version) !== Math.floor(identity.version / 10000)) throw new Error('pg_dump must match the database major version');
  const [snapshot] = await query('SELECT pg_export_snapshot() AS id');
  const metadata = await inventory(query);
  if (!metadata.tables.length) throw new Error('Refusing an empty application backup');
  for (const table of metadata.tables) {
    const policies = metadata.policies.filter(p => p.schemaname === table.schema && p.tablename === table.name);
    if (!table.rls || !table.forced || !policies.some(p => p.policyname === 'backup_read' && p.cmd === 'SELECT' && p.qual === 'true' && p.roles === '{organize_backup}') ||
        policies.some(p => p.permissive === 'RESTRICTIVE' && /\b(public|organize_backup)\b/.test(p.roles))) {
      throw new Error(`Backup coverage is not guaranteed for ${table.schema}.${table.name}; update the backup-reader migration first`);
    }
  }
  const archive = join(staging, 'database.dump.age');
  const dump = run(pgTool('pg_dump'), [
    '--format=custom', '--enable-row-security', '--inserts', '--rows-per-insert=100', '--lock-wait-timeout=15000',
    `--snapshot=${snapshot.id}`, ...schemas.map(schema => `--schema=${schema}`),
  ], { env: pgEnvironment(source.toString()), capture: false, input: '' });
  const encrypt = run(ageTool(), ['--encrypt', '--recipient', process.env.BACKUP_AGE_RECIPIENT], { capture: false });
  try {
    await Promise.all([
      pipeline(dump.child.stdout, encrypt.child.stdin),
      pipeline(encrypt.child.stdout, createWriteStream(archive, { flags: 'wx', mode: 0o600 })),
      dump.done, encrypt.done,
    ]);
  } catch (error) { dump.child.kill(); encrypt.child.kill(); throw error; }
  await client.query('COMMIT');
  const manifest = {
    formatVersion: 1, createdAt: new Date().toISOString(), sourceHost: source.hostname,
    sourceDatabase: decodeURIComponent(source.pathname.slice(1)), postgresMajor: Number(version),
    archiveSha256: await sha256File(archive), ...metadata,
  };
  const manifestProcess = run(ageTool(), ['--encrypt', '--recipient', process.env.BACKUP_AGE_RECIPIENT], {
    input: JSON.stringify(manifest), capture: false,
  });
  await Promise.all([
    pipeline(manifestProcess.child.stdout, createWriteStream(join(staging, 'manifest.json.age'), { flags: 'wx', mode: 0o600 })),
    manifestProcess.done,
  ]);
  await writeFile(join(staging, 'receipt.json'), JSON.stringify({
    formatVersion: 1, createdAt: manifest.createdAt, archiveSha256: manifest.archiveSha256,
    manifestSha256: await sha256File(join(staging, 'manifest.json.age')),
  }, null, 2) + '\n', { mode: 0o600 });
  const destination = join(output, manifest.createdAt.replaceAll(':', '-'));
  await rename(staging, destination);
  staging = undefined;
  console.log(JSON.stringify({ status: 'encrypted-local-backup-created', path: destination, tables: metadata.tables.length, uploaded: false }));
} catch (error) {
  console.error('Backup failed:', error.message);
  process.exitCode = 1;
} finally {
  if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); }
  await pool?.end();
  if (staging) await rm(staging, { recursive: true, force: true });
  await rm(lock, { recursive: true, force: true });
}
