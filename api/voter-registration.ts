import { PARTY_CODES, type PartyCode, type Registration, type RegistrationArea } from '../lib/voterRegistration.js';
import { SAVED_CDN_CACHE, centralTime, json, savedCopy } from './_sos.js';

// Voter registration by party for /results, from the latest day in our saved copy (scripts/sos/schema.sql), which
// a daily cron copies from the Secretary of State's Voter Information Portal (api/save-sos.ts). The SOS's own
// file counts each county (or district), party and status; voters with a blank party code count as Other, which
// makes the county rows add up exactly to the SOS statewide totals page.

interface RegistrationRow {
  geography: 'county' | 'district';
  area_id: string;
  county_name: string | null;
  party_code: string;
  status: 'Active' | 'Inactive';
  voters: number;
  checked_at: Date;
}

const emptyVotes = () => Object.fromEntries(PARTY_CODES.map((p) => [p, 0])) as Record<PartyCode, number>;

const partyOf = (code: string): PartyCode => ((PARTY_CODES as string[]).includes(code) ? (code as PartyCode) : 'OTH');

/** Add up rows into one area each. Counties keep their name as their id; the page joins names to its map's ids. */
function areas(rows: RegistrationRow[]): RegistrationArea[] {
  const byArea = new Map<string, RegistrationArea>();
  for (const r of rows) {
    let a = byArea.get(r.area_id);
    if (!a) {
      const name = r.geography === 'county' ? r.county_name ?? r.area_id : `District ${r.area_id}`;
      byArea.set(r.area_id, (a = { id: r.geography === 'county' ? name : r.area_id, name, votes: emptyVotes(), active: 0, inactive: 0 }));
    }
    if (r.status === 'Active') {
      a.votes[partyOf(r.party_code)] += r.voters;
      a.active += r.voters;
    } else {
      a.inactive += r.voters;
    }
  }
  return [...byArea.values()];
}

async function registration(): Promise<Registration> {
  const rows = (await savedCopy().query(
    `select r.geography, r.area_id, c.name as county_name, r.party_code, r.status, r.voters, r.checked_at
     from sos.registration r left join sos.counties c on r.geography = 'county' and c.county_id = r.area_id
     where r.as_of = (select max(as_of) from sos.registration)`
  )) as RegistrationRow[];
  const counties = areas(rows.filter((r) => r.geography === 'county')).sort((a, b) => a.name.localeCompare(b.name));
  const districts = areas(rows.filter((r) => r.geography === 'district')).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  if (!counties.length || !districts.length) throw new Error('no registration is saved');

  const statewide: RegistrationArea = { id: 'SD', name: 'South Dakota', votes: emptyVotes(), active: 0, inactive: 0 };
  for (const c of counties) {
    for (const p of PARTY_CODES) statewide.votes[p] += c.votes[p];
    statewide.active += c.active;
    statewide.inactive += c.inactive;
  }
  const checked = rows.reduce((latest, r) => (new Date(r.checked_at) > latest ? new Date(r.checked_at) : latest), new Date(0));
  return { checked: centralTime(checked), statewide, counties, districts };
}

export async function GET() {
  try {
    return json(await registration(), 200, SAVED_CDN_CACHE);
  } catch (err) {
    console.error('voter registration failed', err);
    return json({ error: 'Voter registration is unavailable right now. Try again in a minute.' }, 503, SAVED_CDN_CACHE);
  }
}
