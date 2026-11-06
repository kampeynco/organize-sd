// Explicit one-time command. The owner URL stays outside the resulting backup environment.
// node --env-file=.env.migration.local scripts/backups/provision-reader.mjs <expected-host> <new.env.local>
import { readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';

process.umask(0o077);
const [host, destination] = process.argv.slice(2);
if (!host?.endsWith('.neon.tech') || !destination?.endsWith('.local')) throw new Error('Explicit host and new ignored environment file required');
try { await access(destination); throw new Error('Refusing to overwrite existing backup credentials'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const url = new URL(process.env.DATABASE_URL);
url.hostname = host.replace('-pooler.', '.');
neonConfig.webSocketConstructor = WebSocket;
const pool = new Pool({ connectionString: url.toString() });
const client = await pool.connect();
try {
  const existing = await client.query("SELECT rolcanlogin FROM pg_roles WHERE rolname='organize_backup'");
  if (existing.rows[0]?.rolcanlogin) throw new Error('Backup login already exists; use its existing credential or explicitly rotate it');
  await client.query(await readFile('db/003-backup-reader.sql', 'utf8'));
  const password = randomBytes(32).toString('hex');
  await client.query(`ALTER ROLE organize_backup LOGIN PASSWORD '${password}'`);
  url.username = 'organize_backup';
  url.password = password;
  await writeFile(destination, `BACKUP_DATABASE_URL=${JSON.stringify(url.toString())}\n`, { mode: 0o600, flag: 'wx' });
  console.log('Read-only backup credential saved privately; no website credential changed.');
} catch (error) {
  console.error('Backup reader setup failed:', error.code || 'configuration', error.code ? 'Database details withheld' : error.message);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
