import type { Candidate, CountyResult, ElectionInfo, ElectionSummary, PrecinctResult, Race, RaceType } from '../lib/electionResults';
import { LATEST_ELECTION, SAVED_CDN_CACHE, centralTime, json, savedCopy } from './_sos.js';

// The Secretary of State's unofficial results for /results, from our saved copy of them (scripts/sos/schema.sql),
// which a daily cron copies from the SOS (api/save-sos.ts). The copy keeps the page up after the SOS results site
// moves on to the next election, and keeps our visitors off the state's servers. The responses are shaped as
// lib/electionResults.ts describes.
const RACE_TYPES: RaceType[] = ['SWR', 'BQ'];

const UNAVAILABLE = 'Results are unavailable right now. This page will keep trying.';

interface RaceRow {
  race_id: number;
  race_type: RaceType;
  name: string;
  question: string | null;
  office_seq: number;
  vote_for: number;
  precincts_reporting: number;
  precincts_partial: number;
  precincts_total: number;
}

interface CandidateRow {
  race_id: number;
  candidate_id: string;
  name: string;
  party_code: string;
  party_name: string;
  votes: number;
}

interface CountyRow {
  race_id: number;
  county_id: string;
  name: string;
  candidate_id: string;
  votes: number;
  precincts_reporting: number;
  precincts_partial: number;
  precincts_total: number;
}

/** Every statewide race and ballot question, in ballot order, with statewide and county results */
async function summary(): Promise<ElectionSummary> {
  const sql = savedCopy();
  // One read-only transaction: one round trip, and all four queries see the same saved copy
  const [elections, races, candidates, counties] = await sql.transaction(
    [
      sql.query(
        `select e.results_updated_at, t.ballots, t.active_voters, t.precincts_reporting, t.precincts_partial, t.precincts_total
         from sos.elections e left join sos.turnout t on t.election_id = e.election_id and t.geography = 'state'
         where e.election_id = ${LATEST_ELECTION}`
      ),
      sql.query(
        `select race_id, race_type, name, question, office_seq, vote_for, precincts_reporting, precincts_partial, precincts_total
         from sos.races where election_id = ${LATEST_ELECTION} and race_type in ('SWR', 'BQ') order by office_seq, race_id`
      ),
      sql.query(
        `select c.race_id, c.candidate_id, c.name, c.party_code, c.party_name, c.votes
         from sos.candidates c join sos.races x using (election_id, race_id)
         where c.election_id = ${LATEST_ELECTION} and x.race_type in ('SWR', 'BQ') order by c.race_id, c.ballot_order`
      ),
      sql.query(
        `select r.race_id, r.county_id, c.name, r.candidate_id, r.votes, r.precincts_reporting, r.precincts_partial, r.precincts_total
         from sos.county_results r join sos.counties c using (county_id) join sos.races x using (election_id, race_id)
         where r.election_id = ${LATEST_ELECTION} and x.race_type in ('SWR', 'BQ') order by c.name`
      ),
    ],
    { readOnly: true }
  );
  const election = elections[0];
  if (!election) throw new Error('no election is saved');

  const candidatesOf = new Map<number, CandidateRow[]>();
  for (const c of candidates as CandidateRow[]) candidatesOf.set(c.race_id, [...(candidatesOf.get(c.race_id) ?? []), c]);
  const countiesOf = new Map<number, Map<string, CountyResult>>();
  for (const r of counties as CountyRow[]) {
    const byCounty = countiesOf.get(r.race_id) ?? new Map<string, CountyResult>();
    countiesOf.set(r.race_id, byCounty);
    let county = byCounty.get(r.county_id);
    if (!county) {
      county = { id: r.county_id, name: r.name, reporting: r.precincts_reporting, partial: r.precincts_partial, total: r.precincts_total, votes: {} };
      byCounty.set(r.county_id, county);
    }
    county.votes[r.candidate_id] = r.votes;
  }

  return {
    updated: centralTime(election.results_updated_at),
    ballotsCast: election.ballots ?? 0,
    activeVoters: election.active_voters ?? 0,
    precincts: { reporting: election.precincts_reporting ?? 0, partial: election.precincts_partial ?? 0, total: election.precincts_total ?? 0 },
    races: (races as RaceRow[]).map(
      (r): Race => ({
        id: String(r.race_id),
        osn: String(r.office_seq),
        type: r.race_type,
        name: r.name,
        ...(r.question ? { question: r.question } : {}),
        voteFor: r.vote_for,
        reporting: r.precincts_reporting,
        partial: r.precincts_partial,
        total: r.precincts_total,
        candidates: (candidatesOf.get(r.race_id) ?? []).map(
          (c): Candidate => ({
            id: c.candidate_id,
            name: c.name,
            // Ballot question choices are colored by their answer
            party: r.race_type === 'BQ' ? c.name.toUpperCase() : c.party_code,
            partyName: c.party_name,
            votes: c.votes,
          })
        ),
        counties: [...(countiesOf.get(r.race_id)?.values() ?? [])],
      })
    ),
  };
}

/** The SOS results site's title for the election and its banner, as they were when the election was saved */
async function electionInfo(): Promise<ElectionInfo> {
  const [election] = await savedCopy().query(`select title, message from sos.elections where election_id = ${LATEST_ELECTION}`);
  if (!election) throw new Error('no election is saved');
  return { title: election.title, message: election.message };
}

/** One race's results in each precinct (or vote center) of one county */
async function precinctResults(race: string, county: string): Promise<PrecinctResult[]> {
  const rows = await savedCopy().query(
    `select precinct_id, precinct_name, reported, candidate_id, votes from sos.precinct_results
     where election_id = ${LATEST_ELECTION} and race_id = $1 and county_id = $2 order by precinct_id, candidate_id`,
    [+race, county]
  );
  const precincts = new Map<string, PrecinctResult>();
  for (const r of rows) {
    let p = precincts.get(r.precinct_id);
    if (!p) precincts.set(r.precinct_id, (p = { id: r.precinct_id, name: r.precinct_name, reported: r.reported, votes: {} }));
    p.votes[r.candidate_id] = r.votes;
  }
  return [...precincts.values()];
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
      return json({ error: 'Unknown race.' }, 400, SAVED_CDN_CACHE);
    }
    if (!/^\d{2}$/.test(county ?? '')) {
      return json({ error: 'Unknown county.' }, 400, SAVED_CDN_CACHE);
    }
  }

  try {
    if (params.get('part') === 'info') return json(await electionInfo(), 200, SAVED_CDN_CACHE);
    if (forCounty) return json({ precincts: await precinctResults(race!, county!) }, 200, SAVED_CDN_CACHE);
    return json(await summary(), 200, SAVED_CDN_CACHE);
  } catch (err) {
    console.error('election results failed', err);
    return json({ error: UNAVAILABLE }, 503, SAVED_CDN_CACHE);
  }
}
