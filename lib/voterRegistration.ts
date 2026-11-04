// Shapes returned by /api/voter-registration, which serves our latest saved copy of the Secretary of State's registration totals
import type { AreaResult, Candidate } from './electionResults';

export type PartyCode = 'REP' | 'DEM' | 'IND' | 'NPA' | 'LIB' | 'OTH';

/**
 * The registration categories the SOS reports, largest first statewide. They stand in for candidates so the
 * results map, legend and tables draw registration too: `votes` holds active voters by party.
 * South Dakota has no Independent Party; IND and NPA are both voters outside a recognized party (see SourceNote).
 */
export const PARTIES: Candidate[] = [
  { id: 'REP', name: 'Republican', short: 'Rep', party: 'REP', partyName: 'Republican', votes: 0 },
  { id: 'DEM', name: 'Democrat', short: 'Dem', party: 'DEM', partyName: 'Democrat', votes: 0 },
  { id: 'IND', name: 'Independent', short: 'Ind', party: 'IND', partyName: 'Independent', votes: 0 },
  { id: 'NPA', name: 'No party affiliation', short: 'NPA', party: 'NPA', partyName: 'No party affiliation', votes: 0 },
  { id: 'LIB', name: 'Libertarian', short: 'Lib', party: 'LIB', partyName: 'Libertarian', votes: 0 },
  { id: 'OTH', name: 'Other', short: 'Other', party: 'OTH', partyName: 'Other', votes: 0 },
];

export const PARTY_CODES = PARTIES.map((p) => p.id as PartyCode);

export interface RegistrationArea extends AreaResult {
  /** Active voters, all parties */
  active: number;
  inactive: number;
}

export interface Registration {
  /** When the totals were copied from the SOS, e.g. "11/4/2026 1:05 AM CT" */
  checked: string;
  statewide: RegistrationArea;
  /** id is the county name until the page joins it to the county map's ids */
  counties: RegistrationArea[];
  /** id "1" .. "35", with "26A", "26B", "28A" and "28B" */
  districts: RegistrationArea[];
}

/** Statewide map geometry from public/election/districts.json (see scripts/build-districts.mjs) */
export interface DistrictMap {
  viewBox: string;
  districts: { id: string; name: string; d: string }[];
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const unavailable = 'Voter registration is unavailable right now. Try again in a minute.';
  const isJson = res.headers.get('content-type')?.includes('json');
  if (!res.ok || !isJson) {
    const data = isJson ? await res.json().catch(() => ({})) : {};
    throw new Error(data.error || unavailable);
  }
  return res.json().catch(() => {
    throw new Error(unavailable);
  });
}

// results.html preloads this URL on the registration view (see scripts/prerender.js), so change it in both places
export const fetchRegistration = () => getJson<Registration>('/api/voter-registration');

export const fetchDistrictMap = () => getJson<DistrictMap>('/election/districts.json');
