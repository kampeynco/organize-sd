// Explicit operator command: DATABASE_URL is an owner connection, never a runtime fallback.
// node --env-file=.env.local scripts/security/provision.mjs <expected-host> <output.env.local>
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';

const [host, destination] = process.argv.slice(2);
if (!host?.endsWith('.neon.tech') || !destination?.endsWith('.local')) throw new Error('Explicit Neon host and ignored .local output required');
const url = new URL(process.env.DATABASE_URL);
url.hostname = host;
neonConfig.webSocketConstructor = WebSocket;
const pool = new Pool({ connectionString: url.toString() });
const client = await pool.connect();
try {
  await client.query(await readFile('db/002-runtime-security.sql', 'utf8'));
  // Reapplying must be safe and leave exactly the same access rules.
  await client.query(await readFile('db/002-runtime-security.sql', 'utf8'));
  const env = {};
  for (const [variable, role] of Object.entries({ SUBMISSIONS_DATABASE_URL: 'organize_submissions', RESULTS_DATABASE_URL: 'organize_results', IMPORT_DATABASE_URL: 'organize_importer' })) {
    const password = randomBytes(32).toString('hex');
    // Both identifiers and password characters are controlled here, never user input.
    await client.query(`ALTER ROLE ${role} LOGIN PASSWORD '${password}'`);
    const runtime = new URL(url);
    runtime.username = role;
    runtime.password = password;
    env[variable] = runtime.toString();
  }
  env.SUBMISSION_RATE_SECRET = randomBytes(32).toString('hex');
  await writeFile(destination, Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
  await chmod(destination, 0o600);
  console.log('Migration applied twice successfully; restricted credentials saved privately.');
} catch (error) {
  console.error('Security provisioning failed:', error.code ?? 'unknown', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
