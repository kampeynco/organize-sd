// Shapes returned by /api/election-results, which relays the Secretary of State's unofficial results

export type RaceType = 'SWR' | 'BQ';

export interface Candidate {
  id: string;
  name: string;
  /** REP, DEM, IND, LIB, CON, NON; YES or NO for ballot questions */
  party: string;
  partyName: string;
  votes: number;
}

export interface Race {
  id: string;
  /** SOS office sequence number, needed to request precinct results */
  osn: string;
  type: RaceType;
  name: string;
  /** Ballot question text, e.g. "An Amendment to the South Dakota Constitution..." */
  question?: string;
  voteFor: number;
  reporting: number;
  partial: number;
  total: number;
  candidates: Candidate[];
}

export interface ElectionSummary {
  /** e.g. "General Election November 3, 2026" */
  title: string;
  /** As the SOS prints it, e.g. "11/3/2026 10:51 PM CT" */
  updated: string;
  /** SOS banner text, e.g. "Testing In Progress" before election night */
  message: string | null;
  ballotsCast: number;
  activeVoters: number;
  precincts: { reporting: number; partial: number; total: number };
  races: Race[];
}

export interface AreaResult {
  id: string;
  name: string;
  /** Votes by candidate id */
  votes: Record<string, number>;
}

export interface CountyResult extends AreaResult {
  reporting: number;
  partial: number;
  total: number;
}

export interface PrecinctResult extends AreaResult {
  reported: boolean;
}

export interface CountyResults {
  counties: CountyResult[];
}

export interface PrecinctResults {
  precincts: PrecinctResult[];
}

/** Statewide map geometry from public/election (see scripts/election-maps) */
export interface CountyMap {
  viewBox: string;
  counties: { id: string; name: string; d: string; label: [number, number]; precinctMap: boolean }[];
}

export interface PrecinctMap {
  viewBox: string;
  outline: string;
  precincts: { id: string; d: string }[];
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const unavailable = 'Results are unavailable right now. Try again in a minute.';
  // Anything but JSON (an HTML error page, a misrouted request) is an outage, not data to parse
  const isJson = res.headers.get('content-type')?.includes('json');
  if (!res.ok || !isJson) {
    const data = isJson ? await res.json().catch(() => ({})) : {};
    throw new Error(data.error || unavailable);
  }
  return res.json().catch(() => {
    throw new Error(unavailable);
  });
}

export const fetchSummary = () => getJson<ElectionSummary>('/api/election-results');

export const fetchCountyResults = (race: Race) =>
  getJson<CountyResults>(`/api/election-results?type=${race.type}&race=${race.id}&osn=${race.osn}`);

export const fetchPrecinctResults = (race: Race, countyId: string) =>
  getJson<PrecinctResults>(`/api/election-results?type=${race.type}&race=${race.id}&osn=${race.osn}&county=${countyId}`);

export const fetchCountyMap = () => getJson<CountyMap>('/election/counties.json');

export const fetchPrecinctMap = (countyId: string) => getJson<PrecinctMap>(`/election/precincts/${countyId}.json`);
