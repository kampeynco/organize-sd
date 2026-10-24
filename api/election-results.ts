import type { Candidate, CountyResult, ElectionInfo, ElectionSummary, PrecinctResult, Race, RaceType } from '../lib/electionResults';

// Relays the Secretary of State's unofficial results. The SOS site has no API of its own: its result pages read
// a JSON data service. The data service is quick; the results pages have slow spells (up to ~11s seen), so the
// counts come only from the data service and the pages are read only for the election title and banner.
const SOS_SITE = 'https://electionresults.sd.gov';
const SOS_API = 'https://sdresws.azurewebsites.us/ResultsAjax.svc';
const RACE_TYPES: RaceType[] = ['SWR', 'BQ'];

// How long Vercel's CDN keeps each response. Counts change every few minutes on election night, and a short
// cache keeps our visitors from adding load to the state's servers. After a quiet spell the CDN still answers
// at once with its old copy while it fetches a new one, and the page asks again a few seconds later to pick
// that up (see ResultsPage).
const CDN_CACHE = 'max-age=30, stale-while-revalidate=86400';
// The title and banner change about once per election, so visitors get a cached copy even when it's old
const INFO_CDN_CACHE = 'max-age=300, stale-while-revalidate=86400';

interface SosTurnout {
  Voters: number;
  calcVoterTurnout: number;
  PrecinctsReporting: number;
  PartialPrecincts: number;
  TotalPrecincts: number;
  /** When results last changed, on the service's UTC clock: "10/23/2026 3:51:28 AM" */
  CurrentDateTime: string | null;
}

interface SosRow {
  RaceID: number;
  RaceName: string;
  /** Ballot position of the office, as text: "110" */
  OfficeSeqNo: string;
  VoteFor: number;
  CandidateID: string;
  calcCandidate: string;
  PartyCode: string;
  PartyName: string;
  BallotOrder: number;
  calcCandidateVotes: number;
  CountyID: string;
  CountyName: string;
  PrecinctsReporting: number;
  PrecinctsPartial: number;
  TotalPrecincts: number;
  StatePrecinctID: string | null;
  PrecinctName: string | null;
  IsReported: boolean;
}

// Vercel-CDN-Cache-Control applies to Vercel's CDN only. Browsers get Vercel's default Cache-Control and always
// ask again, so a refresh never gets the browser's own old copy (`npm run dev` has no CDN to strip the CDN rules).
const json = (body: unknown, status = 200, cdnCache = CDN_CACHE) =>
  Response.json(body, {
    status,
    headers:
      status === 200
        ? { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Vercel-CDN-Cache-Control': cdnCache }
        : { 'Cache-Control': 'no-store' },
  });

// Time limits per try. The data service answers in about a quarter second, so a try that takes seconds has
// hung and a fresh one usually comes right back. The results pages are slow for everyone at times, so
// cutting them off early would only throw away a response that was on its way.
const DATA_TIMEOUTS_MS = [4000, 6000, 8000];
const PAGE_TIMEOUTS_MS = [15000, 15000];

/** Fetch a SOS URL's body, retrying hung requests and server errors */
async function sos(url: string, timeouts: number[]): Promise<string> {
  let failure: unknown;
  for (const timeout of timeouts) {
    try {
      // The limit covers reading the body too, so a response that stalls partway also gets retried
      const signal = AbortSignal.timeout(timeout);
      const res = await fetch(url, { signal });
      if (res.ok) return await res.text();
      failure = new Error(`${url} returned ${res.status}`);
      // A 4xx means a bad request, which asking again won't fix
      if (res.status < 500) break;
    } catch (err) {
      failure = err;
    }
  }
  throw failure;
}

async function mapData(type: RaceType, category: 'SW' | 'CTY' | 'PREC', race: string, osn: string, county = '0') {
  const url = `${SOS_API}/GetMapData?type=${type}&category=${category}&raceID=${race}&osn=${osn}&county=${county}&party=0`;
  const data = JSON.parse(await sos(url, DATA_TIMEOUTS_MS));
  return (data.d ?? []) as SosRow[];
}

const clean = (s: string) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const candidate = (r: SosRow, type: RaceType): Candidate => {
  const name = clean(r.calcCandidate);
  return {
    id: r.CandidateID,
    name,
    party: type === 'BQ' ? name.toUpperCase() : r.PartyCode,
    partyName: r.PartyName,
    votes: r.calcCandidateVotes,
  };
};

const tally = (rows: SosRow[]) => Object.fromEntries(rows.map((r) => [r.CandidateID, r.calcCandidateVotes]));

function groupBy<K extends keyof SosRow>(rows: SosRow[], key: K) {
  const groups = new Map<SosRow[K], SosRow[]>();
  for (const r of rows) groups.set(r[key], [...(groups.get(r[key]) ?? []), r]);
  return [...groups.values()];
}

async function electionInfo(): Promise<ElectionInfo> {
  const html = await sos(`${SOS_SITE}/resultsSW.aspx?type=SWR&map=CTY`, PAGE_TIMEOUTS_MS);
  const message = html.match(/id="pnlSiteMessage"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  return {
    title: clean(html.match(/id="lnkDateHeader"[\s\S]*?<h2>([\s\S]*?)<\/h2>/)?.[1] ?? 'South Dakota Election Results'),
    message: message && clean(message) ? clean(message) : null,
  };
}

/** "10/23/2026 3:51:28 AM" on the service's UTC clock -> "10/22/2026 10:51 PM CT", the way the SOS pages print it */
function centralTime(utc: string | null | undefined): string {
  const m = utc?.match(/^(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+) (AM|PM)$/);
  if (!m) return '';
  const [, month, day, year, hour, minute, second, half] = m;
  const date = new Date(Date.UTC(+year, +month - 1, +day, (+hour % 12) + (half === 'PM' ? 12 : 0), +minute, +second));
  const text = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${text.replace(',', '')} CT`;
}

/** Statewide ballots, voters, precincts and update time, summed from the data service's county turnout */
async function turnout() {
  const rows = (JSON.parse(await sos(`${SOS_API}/GetVoterTurnoutData?`, DATA_TIMEOUTS_MS)).d ?? []) as SosTurnout[];
  const sum = (key: 'Voters' | 'calcVoterTurnout' | 'PrecinctsReporting' | 'PartialPrecincts' | 'TotalPrecincts') =>
    rows.reduce((total, r) => total + (r[key] ?? 0), 0);
  return {
    updated: centralTime(rows[0]?.CurrentDateTime),
    ballotsCast: sum('calcVoterTurnout'),
    activeVoters: sum('Voters'),
    precincts: { reporting: sum('PrecinctsReporting'), partial: sum('PartialPrecincts'), total: sum('TotalPrecincts') },
  };
}

const countyResults = (rows: SosRow[]): CountyResult[] =>
  groupBy(rows, 'CountyID').map((county) => ({
    id: county[0].CountyID,
    name: county[0].CountyName,
    reporting: county[0].PrecinctsReporting,
    partial: county[0].PrecinctsPartial,
    total: county[0].TotalPrecincts,
    votes: tally(county),
  }));

/** Every race of one type, with its statewide and county results. Race 0 asks the data service for all of them. */
async function races(type: RaceType): Promise<Race[]> {
  // The SOS map asks for county results with office sequence 0 in general elections
  const [statewide, byCounty] = await Promise.all([mapData(type, 'SW', '0', '0'), mapData(type, 'CTY', '0', '0')]);
  // Ballot order, as on the SOS results page
  const raceGroups = groupBy(statewide, 'RaceID').sort((a, b) => +a[0].OfficeSeqNo - +b[0].OfficeSeqNo || a[0].RaceID - b[0].RaceID);
  return raceGroups.map((rows) => {
    rows.sort((a, b) => a.BallotOrder - b.BallotOrder);
    const r = rows[0];
    // Ballot question names run "Constitutional Amendment I: An Amendment to..."
    const [name, ...question] = clean(r.RaceName).split(': ');
    return {
      id: String(r.RaceID),
      osn: r.OfficeSeqNo,
      type,
      name: type === 'BQ' ? name : clean(r.RaceName),
      ...(type === 'BQ' && question.length ? { question: question.join(': ') } : {}),
      voteFor: r.VoteFor,
      reporting: r.PrecinctsReporting,
      partial: r.PrecinctsPartial,
      total: r.TotalPrecincts,
      candidates: rows.map((row) => candidate(row, type)),
      counties: countyResults(byCounty.filter((row) => row.RaceID === r.RaceID)),
    };
  });
}

async function summary(): Promise<ElectionSummary> {
  const [totals, ...byType] = await Promise.all([turnout(), ...RACE_TYPES.map(races)]);
  return { ...totals, races: byType.flat() };
}

async function precinctResults(type: RaceType, race: string, osn: string, county: string): Promise<PrecinctResult[]> {
  return groupBy(await mapData(type, 'PREC', race, osn, county), 'StatePrecinctID').map((rows) => ({
    id: rows[0].StatePrecinctID ?? '',
    name: clean(rows[0].PrecinctName ?? ''),
    reported: rows[0].IsReported,
    votes: tally(rows),
  }));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get('type') as RaceType | null;
  const race = params.get('race');
  const osn = params.get('osn') ?? '0';
  const county = params.get('county');
  const forCounty = type !== null || race !== null || county !== null;

  if (forCounty) {
    if (!type || !RACE_TYPES.includes(type) || !/^\d{1,7}$/.test(race ?? '') || !/^\d{1,4}$/.test(osn)) {
      return json({ error: 'Unknown race.' }, 400);
    }
    if (!/^\d{2}$/.test(county ?? '')) {
      return json({ error: 'Unknown county.' }, 400);
    }
  }

  try {
    if (params.get('part') === 'info') return json(await electionInfo(), 200, INFO_CDN_CACHE);
    if (forCounty) return json({ precincts: await precinctResults(type!, race!, osn, county!) });
    return json(await summary());
  } catch (err) {
    console.error('election results relay failed', err);
    return json({ error: "The Secretary of State's results site isn't responding right now. This page will keep trying." }, 502);
  }
}
