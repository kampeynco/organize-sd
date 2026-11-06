import { neon } from '@neondatabase/serverless';

/** Runtime credentials must never fall back to the migration/owner connection. */
export function databaseUrl(purpose: 'submissions' | 'results' | 'importer') {
  const key = { submissions: 'SUBMISSIONS_DATABASE_URL', results: 'RESULTS_DATABASE_URL', importer: 'IMPORT_DATABASE_URL' }[purpose];
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  const url = new URL(value);
  const expectedRole = { submissions: 'organize_submissions', results: 'organize_results', importer: 'organize_importer' }[purpose];
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.neon.tech') ||
      decodeURIComponent(url.username) !== expectedRole || url.searchParams.get('sslmode') !== 'require') {
    throw new Error(`Invalid restricted database configuration for ${purpose}`);
  }
  return value;
}

export const submissionsDatabase = () => neon(databaseUrl('submissions'));
