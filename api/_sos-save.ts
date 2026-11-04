// Copies the Secretary of State's data into the saved copy /results reads (tables: scripts/sos/schema.sql):
//   - the election's results for statewide offices, ballot questions and legislative races, statewide, by county
//     and by precinct;
//   - its turnout statewide, by county and by legislative district, and ballots by precinct;
//   - today's voter registration by party and status, by county and by legislative district.
// A Vercel cron runs it daily (api/save-sos.ts); `npm run save:sos` runs it now.
//
// The election is saved only while the SOS results site still shows it. When the site moves on to the next
// election, the saved copy keeps this one, and only registration keeps updating. Saving the election replaces its
// rows; registration keeps one copy per day (the latest run that day), so it builds a history.
import { Pool, type PoolClient } from '@neondatabase/serverless';
import { districtId, vipRows } from './_sos.js';
import { clean, countyTurnout, districtTurnout, electionInfo, mapData, precinctBallots, type RaceType } from './_sos-live.js';

// Change these for the next election, once the SOS results site shows it
const ELECTION_ID = '2026-general';
const ELECTION_DATE = '2026-11-03';

const RACE_TYPES: RaceType[] = ['SWR', 'BQ', 'LEG'];
// Rows per insert statement
const CHUNK = 2000;

type Row = Record<string, unknown>;

/** "November 3, 2026", as the SOS results site's title names the election */
const electionDay = new Date(`${ELECTION_DATE}T12:00:00Z`).toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/* ─── Reading ─── */

async function results() {
  const byType = await Promise.all(
    RACE_TYPES.map(async (type) => {
      const [statewide, county, precinct] = await Promise.all([mapData(type, 'SW'), mapData(type, 'CTY'), mapData(type, 'PREC')]);
      if (!statewide.length) throw new Error(`the SOS lists no ${type} races`);
      return { type, statewide, county, precinct };
    })
  );

  const races = new Map<number, Row>();
  const candidates: Row[] = [];
  const countyResults: Row[] = [];
  const precinctResults: Row[] = [];
  const base = { election_id: ELECTION_ID };

  for (const { type, statewide, county, precinct } of byType) {
    for (const r of statewide) {
      if (!races.has(r.RaceID)) {
        // Ballot question names run "Constitutional Amendment I: An Amendment to..."
        const [name, ...question] = clean(r.RaceName).split(': ');
        races.set(r.RaceID, {
          ...base,
          race_id: r.RaceID,
          race_type: type,
          name: type === 'BQ' ? name : clean(r.RaceName),
          question: type === 'BQ' && question.length ? question.join(': ') : null,
          district: type === 'LEG' ? districtId(r.AreaNum) : null,
          office_seq: +r.OfficeSeqNo,
          vote_for: r.VoteFor,
          precincts_reporting: r.PrecinctsReporting,
          precincts_partial: r.PrecinctsPartial,
          precincts_total: r.TotalPrecincts,
        });
      }
      candidates.push({
        ...base,
        race_id: r.RaceID,
        candidate_id: r.CandidateID,
        name: clean(r.calcCandidate),
        party_code: r.PartyCode ?? '',
        party_name: r.PartyName ?? '',
        ballot_order: r.BallotOrder,
        votes: r.calcCandidateVotes,
        winner: !!r.Winner,
      });
    }
    for (const r of county) {
      countyResults.push({
        ...base,
        race_id: r.RaceID,
        county_id: r.CountyID,
        candidate_id: r.CandidateID,
        votes: r.calcCandidateVotes,
        precincts_reporting: r.PrecinctsReporting,
        precincts_partial: r.PrecinctsPartial,
        precincts_total: r.TotalPrecincts,
      });
    }
    for (const r of precinct) {
      precinctResults.push({
        ...base,
        race_id: r.RaceID,
        county_id: r.CountyID,
        precinct_id: r.StatePrecinctID ?? '',
        precinct_name: clean(r.PrecinctName ?? ''),
        candidate_id: r.CandidateID,
        votes: r.calcCandidateVotes,
        reported: r.IsReported,
      });
    }
  }
  return { races: [...races.values()], candidates, countyResults, precinctResults };
}

async function turnout() {
  const ballots = precinctBallots();
  const [{ updatedAt, counties }, byPrecinct, districts] = await Promise.all([
    countyTurnout(),
    ballots,
    ballots.then(districtTurnout),
  ]);
  const sum = (key: 'ballots' | 'voters' | 'reporting' | 'partial' | 'total') => counties.reduce((s, c) => s + c[key], 0);
  const statewide = { id: 'SD', name: 'South Dakota', ballots: sum('ballots'), voters: sum('voters'), reporting: sum('reporting'), partial: sum('partial'), total: sum('total') };

  const base = { election_id: ELECTION_ID };
  const row = (geography: string, a: (typeof districts)[number] & { partial?: number }): Row => ({
    ...base,
    geography,
    area_id: a.id,
    name: a.name,
    ballots: a.ballots,
    active_voters: a.voters,
    precincts_reporting: a.reporting,
    precincts_total: a.total,
    vote_centers: !!a.voteCenters,
    apportioned_ballots: a.estimated ?? 0,
    precincts_partial: a.partial ?? 0,
  });
  return {
    updatedAt,
    counties: counties.map((c) => ({ county_id: c.id, name: c.name })),
    turnout: [row('state', statewide), ...counties.map((c) => row('county', c)), ...districts.map((d) => row('district', d))],
    // Keyed "county|PRECINCT NAME" (see precinctBallots)
    precinctTurnout: [...byPrecinct].map(([key, n]): Row => {
      const [county_id, ...name] = key.split('|');
      return { ...base, county_id, precinct_name: name.join('|'), ballots: n };
    }),
  };
}

/* ─── Saving ─── */

/** Insert rows whose keys are the table's columns, a chunk per statement */
async function insert(client: PoolClient, table: string, rows: Row[], suffix = '') {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await client.query(`insert into ${table} select * from json_populate_recordset(null::${table}, $1::json) ${suffix}`, [
      JSON.stringify(rows.slice(i, i + CHUNK)),
    ]);
  }
}

/** Run `work` in one transaction on its own connection */
async function transaction(pool: Pool, work: (client: PoolClient) => Promise<void>) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await work(client);
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

async function saveElection(pool: Pool) {
  const info = await electionInfo();
  if (!info.title.includes(electionDay)) {
    return { skipped: `the SOS results site shows "${info.title}", not the ${electionDay} election; kept the saved ${ELECTION_ID}` };
  }
  const [res, turn] = await Promise.all([results(), turnout()]);
  await transaction(pool, async (client) => {
    await insert(client, 'sos.counties', turn.counties, 'on conflict (county_id) do update set name = excluded.name');
    // Takes the election's races, candidates, results and turnout with it
    await client.query('delete from sos.elections where election_id = $1', [ELECTION_ID]);
    await client.query(
      'insert into sos.elections (election_id, election_date, title, message, results_updated_at) values ($1, $2, $3, $4, $5)',
      [ELECTION_ID, ELECTION_DATE, info.title, info.message, turn.updatedAt]
    );
    await insert(client, 'sos.races', res.races);
    await insert(client, 'sos.candidates', res.candidates);
    await insert(client, 'sos.county_results', res.countyResults);
    await insert(client, 'sos.precinct_results', res.precinctResults);
    await insert(client, 'sos.turnout', turn.turnout);
    await insert(client, 'sos.precinct_turnout', turn.precinctTurnout);
  });
  return {
    election: ELECTION_ID,
    title: info.title,
    resultsUpdatedAt: turn.updatedAt?.toISOString() ?? null,
    rows: {
      races: res.races.length,
      candidates: res.candidates.length,
      county_results: res.countyResults.length,
      precinct_results: res.precinctResults.length,
      turnout: turn.turnout.length,
      precinct_turnout: turn.precinctTurnout.length,
    },
  };
}

async function saveRegistration(pool: Pool) {
  const [countyRows, districtRows, { rows: counties }] = await Promise.all([
    vipRows('VoterRegistrationsByCounty.aspx', 'hidCountyTotals'),
    vipRows('VoterRegistrationsByDistrict.aspx', 'hidDistrictTotals'),
    pool.query('select county_id, name from sos.counties'),
  ]);
  const countyIds = new Map(counties.map((c: { county_id: string; name: string }) => [c.name.toLowerCase(), c.county_id]));
  const checkedAt = new Date();
  // The day in South Dakota's (Central) time: en-CA prints dates as YYYY-MM-DD
  const asOf = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(checkedAt);
  const row = (geography: string, area_id: string, r: (typeof countyRows)[number]): Row => ({
    as_of: asOf,
    geography,
    area_id,
    party_code: r.PoliticalPartyCode.trim().toUpperCase(),
    status: r.VoterStatus,
    voters: r.Voters,
    checked_at: checkedAt.toISOString(),
  });
  const rows = [
    ...countyRows.map((r) => {
      const id = countyIds.get(r.CountyName.trim().toLowerCase());
      if (!id) throw new Error(`registration lists a county that sos.counties doesn't: "${r.CountyName}"`);
      return row('county', id, r);
    }),
    ...districtRows.map((r) => row('district', districtId(r.District), r)),
  ];
  if (new Set(countyRows.map((r) => r.CountyName)).size !== 66 || new Set(districtRows.map((r) => r.District)).size < 35) {
    throw new Error(`unexpected registration shape: ${countyRows.length} county rows, ${districtRows.length} district rows`);
  }
  await transaction(pool, async (client) => {
    await client.query('delete from sos.registration where as_of = $1', [asOf]);
    await insert(client, 'sos.registration', rows);
  });
  return { asOf, rows: rows.length };
}

const settle = <T>(p: Promise<T>) =>
  p.then(
    (value) => ({ ok: true as const, ...value }),
    (err: unknown) => {
      console.error(err);
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  );

/** Copy the SOS data now. The election and registration save separately, so one failing doesn't stop the other. */
export async function saveSos() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Election first: registration maps county names to the county ids it saves
    const election = await settle(saveElection(pool));
    const registration = await settle(saveRegistration(pool));
    return { ok: election.ok && registration.ok, election, registration };
  } finally {
    await pool.end();
  }
}
