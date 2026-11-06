// Publish values through stdin so credentials never appear in command arguments or logs.
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
const [file, target] = process.argv.slice(2);
if (!file?.endsWith('.local') || !['production', 'preview', 'development'].includes(target)) throw new Error('Explicit private env file and target required');
const env = parseEnv(await readFile(file, 'utf8'));
for (const name of ['SUBMISSIONS_DATABASE_URL', 'RESULTS_DATABASE_URL', 'IMPORT_DATABASE_URL', 'SUBMISSION_RATE_SECRET']) {
  if (!env[name]) throw new Error(`Missing ${name}`);
  const args = ['env', 'add', name, target, '--force', '--yes'];
  if (target !== 'development') args.push('--sensitive');
  const result = spawnSync('vercel', args, { input: env[name], encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Failed to publish ${name} to ${target} (details withheld to protect credentials)`);
  console.log(`Published ${name} to ${target}`);
}
