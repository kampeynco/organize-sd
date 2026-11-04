import { saveSos } from './_sos-save.js';

// Vercel Cron calls this once a day (see vercel.json) to copy the Secretary of State's data into the saved copy
// /results reads. Vercel sends the project's CRON_SECRET environment variable as a bearer token; any other
// request is turned away, so nobody else can make this site load the state's servers or rewrite the copy.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not allowed.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const report = await saveSos();
  if (!report.ok) console.error('copying the SOS data failed', JSON.stringify(report));
  return Response.json(report, { status: report.ok ? 200 : 500, headers: { 'Cache-Control': 'no-store' } });
}
