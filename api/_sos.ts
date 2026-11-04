// Helpers shared by the /results endpoints and the code that copies the Secretary of State's data. Vercel skips
// files whose names start with "_", so this isn't an endpoint itself.
import { neon } from '@neondatabase/serverless';

/**
 * A JSON response. Vercel-CDN-Cache-Control applies to Vercel's CDN only: browsers get Vercel's default
 * Cache-Control and always ask again, so a refresh never shows the browser's own old copy. Errors aren't cached.
 */
export const json = (body: unknown, status: number, cdnCache: string) =>
  Response.json(body, {
    status,
    headers:
      status === 200
        ? { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Vercel-CDN-Cache-Control': cdnCache }
        : { 'Cache-Control': 'no-store' },
  });

/* ─── The saved copy (Neon; tables in scripts/sos/schema.sql) ─── */

/** The database /results reads. Its SOS data changes only when it's copied again (api/save-sos.ts). */
export const savedCopy = () => neon(process.env.DATABASE_URL!);

/** The election /results shows: the latest one saved. A SQL subquery, for `where election_id = ${LATEST_ELECTION}`. */
export const LATEST_ELECTION = '(select election_id from sos.elections order by election_date desc limit 1)';

// The saved copy changes about once a day, so the CDN can keep each response a while. After five minutes it still
// answers at once with its old copy while it fetches a new one.
export const SAVED_CDN_CACHE = 'max-age=300, stale-while-revalidate=86400';

/* ─── Reading the SOS ─── */

/** Fetch a URL's body, with one time limit per try. Hung requests and server errors are retried; a 4xx isn't. */
export async function fetchText(url: string, timeouts: number[]): Promise<string> {
  let failure: unknown;
  for (const timeout of timeouts) {
    try {
      // The limit covers reading the body too, so a response that stalls partway also gets retried
      const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      if (res.ok) return await res.text();
      failure = new Error(`${url} returned ${res.status}`);
      if (res.status < 500) break;
    } catch (err) {
      failure = err;
    }
  }
  throw failure;
}

export const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/* ─── Voter Information Portal ─── */

const VIP = 'https://vip.sdsos.gov';
// The VIP pages answer in well under a second, so a try that takes several has hung
const VIP_TIMEOUTS_MS = [6000, 8000, 10000];

/** One row of a VIP registration page's hidden JSON: voters in one area, party and status */
export interface VipRow {
  CountyName: string;
  District: string;
  /** "REP", "DEM", "LIB", "IND", "NPA", "OTH", or blank ("   ") */
  PoliticalPartyCode: string;
  VoterStatus: 'Active' | 'Inactive';
  Voters: number;
}

/**
 * The JSON rows in a VIP page's hidden field. The registration pages print a table and also carry the same
 * counts as JSON in a hidden form field, one row per area, party and status.
 */
export async function vipRows(page: string, field: string): Promise<VipRow[]> {
  const html = await fetchText(`${VIP}/${page}`, VIP_TIMEOUTS_MS);
  const value = html.match(new RegExp(`<input[^>]*\\bid="${field}"[^>]*\\bvalue="([^"]*)"`))?.[1];
  if (!value) throw new Error(`${page} has no ${field} field`);
  return JSON.parse(decodeEntities(value));
}

/** "District 01" -> "1", "District 26A" -> "26A": the ids in public/election/districts.json */
export const districtId = (name: string) => name.replace(/^District\s+0*/i, '').trim().toUpperCase();

/* ─── Times ─── */

const CENTRAL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** A time the way the SOS pages print it, "11/4/2026 1:05 AM CT", or '' when it isn't known */
export const centralTime = (date: Date | string | null | undefined) =>
  date ? `${CENTRAL.format(new Date(date)).replace(',', '')} CT` : '';

/** "11/4/2026 8:35:03 AM" on the results data service's UTC clock -> that moment */
export function sosUtc(utc: string | null | undefined): Date | null {
  const m = utc?.match(/^(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+) (AM|PM)$/);
  if (!m) return null;
  const [, month, day, year, hour, minute, second, half] = m;
  return new Date(Date.UTC(+year, +month - 1, +day, (+hour % 12) + (half === 'PM' ? 12 : 0), +minute, +second));
}
