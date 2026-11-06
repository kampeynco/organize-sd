// npm run save:sos: copies the Secretary of State's data into the saved copy /results reads, now, as the daily
// cron does (see api/_sos-save.ts). Needs IMPORT_DATABASE_URL, which the npm script reads from .env.local.
import { saveSos } from '../../api/_sos-save';

export default async function main() {
  if (!process.env.IMPORT_DATABASE_URL) throw new Error('IMPORT_DATABASE_URL is not set (run with npm run save:sos, which reads .env.local)');
  console.log('copying the Secretary of State…');
  const report = await saveSos();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}
