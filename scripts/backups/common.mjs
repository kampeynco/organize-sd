import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { resolve, join } from 'node:path';

export const schemas = ['public', 'sos', 'submission_api', 'submission_private'];
// Non-login, unprivileged provider-role placeholders let Neon ACLs restore locally.
// Provider-admin powers, passwords, and memberships are never recreated by this tool.
export const roles = ['neondb_owner', 'neon_superuser', 'cloud_admin', 'neon_service', 'token_roles',
  'organize_submissions', 'organize_results', 'organize_importer', 'organize_submit_executor', 'organize_backup'];
export const identifier = value => '"' + value.replaceAll('"', '""') + '"';
export const pgTool = name => process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, name) : name;
export const ageTool = () => process.env.AGE_BIN || 'age';

export function pgEnvironment(connection, { localRestore = false } = {}) {
  const url = new URL(connection);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database URL');
  const host = url.hostname.replace('-pooler.', '.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (!host.endsWith('.neon.tech') && !(localRestore && local)) throw new Error('Unexpected database host');
  const socket = url.searchParams.get('host');
  if (socket && (!localRestore || !local || !socket.startsWith('/'))) throw new Error('Invalid database socket');
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('PG') || key.includes('DATABASE_URL') || key === 'SUBMISSION_RATE_SECRET') delete env[key];
  return {
    ...env, PGHOST: socket || host, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: local ? 'disable' : 'verify-full', ...(local ? {} : { PGSSLROOTCERT: process.env.BACKUP_CA_FILE || 'system' }),
    PGCONNECT_TIMEOUT: '20', PGAPPNAME: 'organize-sd-backup',
  };
}

/** Never echo database stderr: failed restore statements can contain personal data. */
export function run(command, args, { env = process.env, input, capture = true } = {}) {
  const child = spawn(command, args, { env, timeout: 600000, stdio: ['pipe', 'pipe', 'pipe'] });
  const chunks = [];
  if (capture) child.stdout.on('data', data => chunks.push(data));
  child.stderr.resume();
  const done = new Promise((resolve, reject) => {
    child.on('error', () => reject(new Error(`Could not start ${command}`)));
    child.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${command} failed (exit ${code}); private database details withheld`)));
  });
  // Mark handled immediately; callers may first await the stream pipeline.
  done.catch(() => {});
  child.stdin.on('error', () => {});
  if (input !== undefined) child.stdin.end(input);
  return { child, done };
}

export async function sha256File(file) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}

export function psqlQuery(connection) {
  const env = pgEnvironment(connection, { localRestore: true });
  return async sql => {
    const { done } = run(pgTool('psql'), ['-X', '-qAt', '--set=ON_ERROR_STOP=1'], {
      env, input: `SET TIME ZONE 'UTC';\nSELECT coalesce(json_agg(result), '[]'::json) FROM (${sql}) AS result;\n`,
    });
    return JSON.parse((await done).toString());
  };
}

export async function inventory(query) {
  const tables = await query(`SELECT n.nspname AS schema,c.relname AS name,c.relrowsecurity AS rls,
    c.relforcerowsecurity AS forced,pg_get_userbyid(c.relowner) AS owner
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='r' AND n.nspname IN ('public','sos','submission_private','submission_api') ORDER BY 1,2`);
  for (const table of tables) {
    const [data] = await query(`SELECT count(*)::text AS rows,
      encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),''
      ORDER BY encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex') AS sha256
      FROM ${identifier(table.schema)}.${identifier(table.name)} AS t`);
    Object.assign(table, data);
  }
  const policies = await query(`SELECT schemaname,tablename,policyname,permissive,roles::text,cmd,qual,with_check
    FROM pg_policies WHERE schemaname IN ('public','sos','submission_private','submission_api') ORDER BY 1,2,3`);
  const functions = await query(`SELECT n.nspname AS schema,p.proname AS name,pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef AS security_definer,p.proconfig AS settings,pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('submission_api','submission_private') ORDER BY 1,2,6`);
  return { tables, policies, functions };
}

export function requireBackupDirectory(directory) {
  const absolute = resolve(directory);
  const repo = resolve(import.meta.dirname, '../..');
  if (absolute === repo || absolute.startsWith(repo + '/')) throw new Error('Backups must live outside the repository');
  return absolute;
}
