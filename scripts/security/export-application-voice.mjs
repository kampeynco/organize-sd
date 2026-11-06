// node --env-file=.env.migration.local scripts/security/export-application-voice.mjs <application-uuid> </private/output-prefix>
import { neon } from '@neondatabase/serverless';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [id, prefix] = process.argv.slice(2);
if (!/^[0-9a-f-]{36}$/i.test(id ?? '') || !prefix) throw new Error('Application UUID and private output prefix required');
const target = resolve(prefix);
const repo = resolve(import.meta.dirname, '../..');
if (target === repo || target.startsWith(repo + '/')) throw new Error('Export recordings outside the repository');
const sql = neon(process.env.DATABASE_URL || process.env.BACKUP_DATABASE_URL);
const [row] = await sql`SELECT encode(pitch_audio,'base64') AS audio,pitch_audio_mime AS mime
  FROM public.applications WHERE id=${id}::uuid`;
if (!row?.audio) throw new Error('This application has no voice recording');
const extension = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' }[row.mime];
if (!extension) throw new Error('Unknown recording format');
await writeFile(`${target}.${extension}`, Buffer.from(row.audio, 'base64'), { mode: 0o600, flag: 'wx' });
console.log('Recording exported to the specified private location.');
