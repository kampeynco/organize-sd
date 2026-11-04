// Reads the Secretary of State's live sites, for api/_sos-save.ts to copy. (The page reads the saved copy.)
//
// The SOS has no documented API. Counts come from the JSON data service behind electionresults.sd.gov's maps,
// which is quick. The results pages themselves have slow spells for everyone (up to ~11s seen), so they're read
// only for what the data service doesn't have: the election title and banner, and ballots cast by precinct.
import type { ElectionInfo } from '../lib/electionResults';
import type { TurnoutArea } from '../lib/voterTurnout';
import { decodeEntities, districtId, fetchText, sosUtc, vipRows } from './_sos.js';

const SOS_SITE = 'https://electionresults.sd.gov';
const SOS_API = 'https://sdresws.azurewebsites.us/ResultsAjax.svc';

// The data service usually answers within a second, but statewide precinct results take it several
const DATA_TIMEOUTS_MS = [20000, 30000];
// The results pages are slow for everyone at times; cutting them off early would only waste a response
const PAGE_TIMEOUTS_MS = [15000, 15000];

const sosData = async <T>(query: string): Promise<T[]> =>
  (JSON.parse(await fetchText(`${SOS_API}/${query}`, DATA_TIMEOUTS_MS)).d ?? []) as T[];

/** SOS names and labels as plain text */
export const clean = (s: string) =>
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

/* ─── Results ─── */

/** The results site's title for the election it shows, and its banner ("Testing In Progress" before election night) */
export async function electionInfo(): Promise<ElectionInfo> {
  const html = await fetchText(`${SOS_SITE}/resultsSW.aspx?type=SWR&map=CTY`, PAGE_TIMEOUTS_MS);
  const message = html.match(/id="pnlSiteMessage"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  return {
    title: clean(html.match(/id="lnkDateHeader"[\s\S]*?<h2>([\s\S]*?)<\/h2>/)?.[1] ?? 'South Dakota Election Results'),
    message: message && clean(message) ? clean(message) : null,
  };
}

/** Statewide offices, ballot questions, legislative races */
export type RaceType = 'SWR' | 'BQ' | 'LEG';

/** One candidate's votes in one race and area, as the data service returns them */
export interface MapRow {
  RaceID: number;
  RaceName: string;
  /** Ballot position of the office, as text: "110" */
  OfficeSeqNo: string;
  /** Legislative races: "District 30", "District 26A" */
  AreaNum: string;
  VoteFor: number;
  CandidateID: string;
  calcCandidate: string;
  PartyCode: string | null;
  PartyName: string | null;
  BallotOrder: number;
  calcCandidateVotes: number;
  Winner: boolean | null;
  CountyID: string;
  PrecinctsReporting: number;
  PrecinctsPartial: number;
  TotalPrecincts: number;
  StatePrecinctID: string | null;
  PrecinctName: string | null;
  IsReported: boolean;
}

/** Every race of one type, statewide (SW), by county (CTY) or by precinct (PREC), in one request (race 0 is all) */
export const mapData = (type: RaceType, category: 'SW' | 'CTY' | 'PREC') =>
  sosData<MapRow>(`GetMapData?type=${type}&category=${category}&raceID=0&osn=0&county=0&party=0`);

/* ─── Turnout by county ─── */

interface SosTurnout {
  CountyID: string;
  /** "Aurora", or "Brown (Vote Center)" */
  CountyName: string;
  Voters: number;
  calcVoterTurnout: number;
  PrecinctsReporting: number;
  PartialPrecincts: number;
  TotalPrecincts: number;
  /** When results last changed, on the service's UTC clock: "11/4/2026 8:35:03 AM" */
  CurrentDateTime: string | null;
}

/** Ballots cast as a share of active voters by county, as the SOS turnout page shows it */
export async function countyTurnout() {
  const rows = await sosData<SosTurnout>('GetVoterTurnoutData?');
  if (rows.length !== 66) throw new Error(`turnout data has ${rows.length} counties`);
  const counties = rows.map((r): TurnoutArea & { partial: number } => {
    const voteCenters = /\(vote center\)/i.test(r.CountyName);
    return {
      id: r.CountyID,
      name: r.CountyName.replace(/\s*\(vote center\)\s*/i, '').trim(),
      ballots: r.calcVoterTurnout,
      voters: r.Voters,
      reporting: r.PrecinctsReporting,
      partial: r.PartialPrecincts ?? 0,
      total: r.TotalPrecincts,
      ...(voteCenters ? { voteCenters } : {}),
    };
  });
  return { updatedAt: sosUtc(rows.find((r) => r.CurrentDateTime)?.CurrentDateTime), counties };
}

/* ─── Turnout by legislative district ─── */

// The SOS doesn't report turnout by legislative district, so this builds it from three SOS sources:
//   1. ballots cast in each precinct, from the results site's turnout details page (the only place they're
//      published; there's no data-service call for them);
//   2. which district each precinct belongs to, from the precinct results of the legislative races;
//   3. active voters by district, from the Voter Information Portal's registration page.
//
// Most precincts sit in one district, and their ballots are counted exactly. Some ballots are cast where voters
// from several districts vote together: at the vote centers of the 11 vote-center counties (any voter in the
// county can vote at any of them), in absentee precincts, and in a few precincts split by a district line.
// Those ballots are apportioned in proportion to the votes cast in each district's legislative races at that
// location. Raw race votes would favor contested districts (an uncontested race is skipped on far more
// ballots), so each district's votes are first scaled by its own ballots-per-vote rate, measured in the precincts
// it has to itself.

interface LegRow {
  /** "District 01", "District 26A" */
  AreaNum: string;
  CountyID: string;
  PrecinctName: string | null;
  /** "State Senator" or "State Representative" */
  RaceName: string;
  VoteFor: number;
  calcCandidateVotes: number;
  IsReported: boolean;
}

/** Precincts are matched by county and name: the turnout page has no precinct numbers */
const precinctKey = (county: string, name: string) => `${county}|${name.replace(/\s+/g, ' ').trim().toUpperCase()}`;

/**
 * Ballots cast in each precinct or vote center, from the SOS turnout details page, keyed "county|PRECINCT NAME"
 * (the county's SOS number, and the name with spaces collapsed, in upper case)
 */
export async function precinctBallots(): Promise<Map<string, number>> {
  const html = await fetchText(`${SOS_SITE}/VoterTurnoutDetails.aspx?map=PREC`, PAGE_TIMEOUTS_MS);
  const ballots = new Map<string, number>();
  // Each county's precincts sit in <div id="countyturnout{county number}">, one row per precinct:
  // name, ballots cast, registered voters (the whole county's, at vote centers, so that column isn't used)
  for (const section of html.split('id="countyturnout').slice(1)) {
    const county = section.match(/^(\d+)"/)?.[1];
    if (!county) continue;
    const rows = section.matchAll(/<div class="county-precinct">([^<]*)<\/div>\s*<div class="county-cast">\s*<span>([\d,]*)<\/span>/g);
    for (const [, name, cast] of rows) {
      const key = precinctKey(county, decodeEntities(name));
      ballots.set(key, (ballots.get(key) ?? 0) + Number(cast.replace(/,/g, '') || 0));
    }
  }
  if (ballots.size < 500) throw new Error(`turnout details page lists ${ballots.size} precincts`);
  return ballots;
}

interface LegPrecinct {
  county: string;
  /** House district -> votes in its House race here, and how many seats that race fills */
  house: Map<string, { votes: number; seats: number }>;
  /** Senate district ("26" for both 26A and 26B) -> votes in its Senate race here */
  senate: Map<string, number>;
  reported: boolean;
}

const senateOf = (district: string) => district.replace(/[AB]$/, '');

/** Every precinct's legislative districts and votes, from one statewide request */
async function legislativePrecincts(): Promise<Map<string, LegPrecinct>> {
  const rows = await sosData<LegRow>('GetMapData?type=LEG&category=PREC&raceID=0&osn=0&county=0&party=0');
  const precincts = new Map<string, LegPrecinct>();
  for (const r of rows) {
    const key = precinctKey(r.CountyID, r.PrecinctName ?? '');
    let p = precincts.get(key);
    if (!p) {
      p = { county: r.CountyID, house: new Map(), senate: new Map(), reported: true };
      precincts.set(key, p);
    }
    p.reported &&= r.IsReported;
    const district = districtId(r.AreaNum);
    if (/senat/i.test(r.RaceName)) {
      p.senate.set(district, (p.senate.get(district) ?? 0) + r.calcCandidateVotes);
    } else {
      const race = p.house.get(district) ?? { votes: 0, seats: r.VoteFor || 1 };
      race.votes += r.calcCandidateVotes;
      p.house.set(district, race);
    }
  }
  // A precinct with only a Senate race on its ballot still belongs to that district
  for (const p of precincts.values()) {
    if (!p.house.size) for (const district of p.senate.keys()) p.house.set(district, { votes: 0, seats: 1 });
  }
  if (precincts.size < 500) throw new Error(`legislative results list ${precincts.size} precincts`);
  return precincts;
}

/**
 * About how many of a precinct's ballots came from one of its districts: the most votes cast in either of that
 * district's races there, per seat. (Where both halves of District 26 or 28 share a precinct, their one Senate race
 * can't tell them apart, so only their House races count.)
 */
function legVotes(p: LegPrecinct, district: string): number {
  const house = p.house.get(district);
  const houseVotes = house ? house.votes / house.seats : 0;
  const halves = [...p.house.keys()].filter((d) => senateOf(d) === senateOf(district)).length;
  const senateVotes = halves === 1 ? p.senate.get(senateOf(district)) ?? 0 : 0;
  return Math.max(houseVotes, senateVotes);
}

interface Tally {
  ballots: number;
  estimated: number;
  reporting: number;
  total: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 1;
};

/** Each district's ballots: counted where a precinct is all one district, apportioned where it isn't */
function apportion(ballots: Map<string, number>, precincts: Map<string, LegPrecinct>) {
  const all = [...precincts];
  const shared = all.filter(([, p]) => p.house.size > 1);

  // Ballots per legislative vote, from the precincts each district has to itself
  const own = new Map<string, { ballots: number; votes: number }>();
  for (const [key, p] of all) {
    if (p.house.size !== 1) continue;
    const [district] = p.house.keys();
    const [b, v] = [ballots.get(key) ?? 0, legVotes(p, district)];
    if (!b || !v) continue;
    const o = own.get(district) ?? { ballots: 0, votes: 0 };
    o.ballots += b;
    o.votes += v;
    own.set(district, o);
  }
  const scale = new Map([...own].map(([d, o]) => [d, o.ballots / o.votes]));
  const typical = median([...scale.values()]);

  // A district with no precinct to itself (District 3 votes entirely at Brown County's vote centers) gets the rate
  // that accounts for the ballots its neighbors' rates leave over at the places they share
  const leftover = new Map<string, { ballots: number; votes: number }>();
  for (const [key, p] of shared) {
    const unknown = [...p.house.keys()].filter((d) => !scale.has(d));
    if (unknown.length !== 1) continue;
    const explained = [...p.house.keys()].filter((d) => scale.has(d)).reduce((sum, d) => sum + legVotes(p, d) * scale.get(d)!, 0);
    const l = leftover.get(unknown[0]) ?? { ballots: 0, votes: 0 };
    l.ballots += (ballots.get(key) ?? 0) - explained;
    l.votes += legVotes(p, unknown[0]);
    leftover.set(unknown[0], l);
  }
  for (const [, p] of shared) {
    for (const d of p.house.keys()) {
      if (scale.has(d)) continue;
      const l = leftover.get(d);
      const rate = l?.votes ? l.ballots / l.votes : NaN;
      // A vote can't stand for less than one ballot; anything far above the usual means too little data
      scale.set(d, rate >= 1 && rate <= 3 ? rate : typical);
    }
  }
  const weight = (p: LegPrecinct, d: string) => legVotes(p, d) * (scale.get(d) ?? typical);

  const tallies = new Map<string, Tally>();
  const tally = (d: string) => {
    let t = tallies.get(d);
    if (!t) tallies.set(d, (t = { ballots: 0, estimated: 0, reporting: 0, total: 0 }));
    return t;
  };
  // County-wide weights, for a precinct the legislative results don't list or that has no votes yet
  const countyWeights = new Map<string, Map<string, number>>();
  for (const [, p] of all) {
    const weights = countyWeights.get(p.county) ?? new Map<string, number>();
    countyWeights.set(p.county, weights);
    for (const d of p.house.keys()) {
      weights.set(d, (weights.get(d) ?? 0) + weight(p, d));
      const t = tally(d);
      t.total += 1;
      if (p.reported) t.reporting += 1;
    }
  }

  let unassigned = 0;
  for (const [key, b] of ballots) {
    if (!b) continue;
    const p = precincts.get(key);
    const county = countyWeights.get(key.split('|')[0]) ?? new Map<string, number>();
    let weights: [string, number][] = p ? [...p.house.keys()].map((d) => [d, weight(p, d)]) : [...county];
    if (weights.length === 1) {
      tally(weights[0][0]).ballots += b;
      continue;
    }
    let sum = weights.reduce((s, [, w]) => s + w, 0);
    if (!sum && p) {
      weights = weights.map(([d]) => [d, county.get(d) ?? 0]);
      sum = weights.reduce((s, [, w]) => s + w, 0);
    }
    if (!sum) {
      weights = weights.map(([d]) => [d, 1]);
      sum = weights.length;
    }
    if (!weights.length) {
      unassigned += b;
      continue;
    }
    for (const [d, w] of weights) {
      const share = (b * w) / sum;
      const t = tally(d);
      t.ballots += share;
      t.estimated += share;
    }
  }
  if (unassigned) console.warn(`district turnout: ${unassigned} ballots in precincts with no district`);
  return tallies;
}

/** Active voters by district */
async function districtVoters(): Promise<Map<string, number>> {
  const voters = new Map<string, number>();
  for (const r of await vipRows('VoterRegistrationsByDistrict.aspx', 'hidDistrictTotals')) {
    if (r.VoterStatus !== 'Active') continue;
    const d = districtId(r.District);
    voters.set(d, (voters.get(d) ?? 0) + r.Voters);
  }
  return voters;
}

/** Turnout by legislative district, from ballots by precinct (see precinctBallots) */
export async function districtTurnout(ballots: Map<string, number>): Promise<TurnoutArea[]> {
  const [precincts, voters] = await Promise.all([legislativePrecincts(), districtVoters()]);
  const tallies = apportion(ballots, precincts);
  const strays = [...tallies.keys()].filter((d) => !voters.has(d));
  if (voters.size < 35 || strays.length) {
    throw new Error(`district mismatch: ${voters.size} registration districts; results-only districts ${strays.join(', ')}`);
  }
  return [...voters].map(([id, active]) => {
    const t = tallies.get(id) ?? { ballots: 0, estimated: 0, reporting: 0, total: 0 };
    const estimated = Math.round(t.estimated);
    return {
      id,
      name: `District ${id}`,
      ballots: Math.round(t.ballots),
      voters: active,
      reporting: t.reporting,
      total: t.total,
      ...(estimated ? { estimated } : {}),
    };
  });
}
