import type { Candidate, CountyResult, ElectionSummary, PrecinctResult, Race, RaceType } from '../lib/electionResults';

// Relays the Secretary of State's unofficial results. The SOS site has no API of its own: its result pages read
// a JSON data service, and the list of races only exists in the page HTML. The data service is quick; the
// results pages have slow spells (up to ~11s seen), so they're read only for the race list (see pageInfo).
const SOS_SITE = 'https://electionresults.sd.gov';
const SOS_API = 'https://sdresws.azurewebsites.us/ResultsAjax.svc';
const RACE_TYPES: RaceType[] = ['SWR', 'BQ'];

// Counts change every few minutes on election night. A short CDN cache keeps our visitors from adding load
// to the state's servers, and serving the previous copy while refreshing keeps the page fast.
const CACHE = 'public, max-age=0, s-maxage=30, stale-while-revalidate=120';

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

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': status === 200 ? CACHE : 'no-store' } });

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

interface PageInfo {
  refs: { id: string; osn: string; type: RaceType }[];
  title: string;
  message: string | null;
  fetchedAt: number;
}

async function fetchPageInfo(): Promise<PageInfo> {
  const pages = await Promise.all(
    RACE_TYPES.map((type) => sos(`${SOS_SITE}/resultsSW.aspx?type=${type}&map=CTY`, PAGE_TIMEOUTS_MS))
  );
  const html = pages[0];
  const message = html.match(/id="pnlSiteMessage"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  return {
    // Each race on the page opens its map with CreateMap('SWR', raceId, officeSeqNo, party)
    refs: pages.flatMap((page, i) =>
      [...new Set([...page.matchAll(/CreateMap\('[A-Z]+', '(\d+)', '(\d+)'/g)].map((m) => `${m[1]}:${m[2]}`))].map((ref) => {
        const [id, osn] = ref.split(':');
        return { id, osn, type: RACE_TYPES[i] };
      })
    ),
    title: clean(html.match(/id="lnkDateHeader"[\s\S]*?<h2>([\s\S]*?)<\/h2>/)?.[1] ?? 'South Dakota Election Results'),
    message: message && clean(message) ? clean(message) : null,
    fetchedAt: Date.now(),
  };
}

// The race list, title and banner only change when the SOS sets up an election or flips its test notice, so a
// copy from the last few minutes is as good as a fresh one. Kept per server instance.
const PAGE_INFO_MAX_AGE_MS = 5 * 60_000;
const PAGE_INFO_WAIT_MS = 3000;
let pageInfo: PageInfo | null = null;
let pageInfoRequest: Promise<PageInfo> | null = null;

async function getPageInfo(): Promise<PageInfo> {
  if (pageInfo && Date.now() - pageInfo.fetchedAt < PAGE_INFO_MAX_AGE_MS) return pageInfo;
  pageInfoRequest ??= fetchPageInfo()
    .then((info) => (pageInfo = info))
    .finally(() => { pageInfoRequest = null; });
  if (!pageInfo) return pageInfoRequest;
  // Take the refresh if it's quick; otherwise use the copy we have and let the refresh finish for next time
  const current = pageInfo;
  return Promise.race([
    pageInfoRequest.catch(() => current),
    new Promise<PageInfo>((resolve) => setTimeout(() => resolve(current), PAGE_INFO_WAIT_MS)),
  ]);
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

async function summary(): Promise<ElectionSummary> {
  const [page, totals] = await Promise.all([getPageInfo(), turnout()]);

  const races = await Promise.all(
    page.refs.map(async ({ id, osn, type }): Promise<Race | null> => {
      const rows = (await mapData(type, 'SW', id, osn)).sort((a, b) => a.BallotOrder - b.BallotOrder);
      if (!rows.length) return null;
      const r = rows[0];
      // Ballot question names run "Constitutional Amendment I: An Amendment to..."
      const [name, ...question] = clean(r.RaceName).split(': ');
      return {
        id,
        osn,
        type,
        name: type === 'BQ' ? name : clean(r.RaceName),
        ...(type === 'BQ' && question.length ? { question: question.join(': ') } : {}),
        voteFor: r.VoteFor,
        reporting: r.PrecinctsReporting,
        partial: r.PrecinctsPartial,
        total: r.TotalPrecincts,
        candidates: rows.map((row) => candidate(row, type)),
      };
    })
  );

  return {
    title: page.title,
    message: page.message,
    ...totals,
    races: races.filter((r): r is Race => r !== null),
  };
}

async function countyResults(type: RaceType, race: string): Promise<CountyResult[]> {
  // The SOS map asks for county results with office sequence 0 in general elections
  return groupBy(await mapData(type, 'CTY', race, '0'), 'CountyID').map((rows) => ({
    id: rows[0].CountyID,
    name: rows[0].CountyName,
    reporting: rows[0].PrecinctsReporting,
    partial: rows[0].PrecinctsPartial,
    total: rows[0].TotalPrecincts,
    votes: tally(rows),
  }));
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

  if (race !== null || type !== null) {
    if (!type || !RACE_TYPES.includes(type) || !/^\d{1,7}$/.test(race ?? '') || !/^\d{1,4}$/.test(osn)) {
      return json({ error: 'Unknown race.' }, 400);
    }
    if (county !== null && !/^\d{2}$/.test(county)) {
      return json({ error: 'Unknown county.' }, 400);
    }
  }

  try {
    if (type && race && county) return json({ precincts: await precinctResults(type, race, osn, county) });
    if (type && race) return json({ counties: await countyResults(type, race) });
    return json(await summary());
  } catch (err) {
    console.error('election results relay failed', err);
    return json({ error: "The Secretary of State's results site isn't responding right now. This page will keep trying." }, 502);
  }
}
