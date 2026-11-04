import type { Turnout, TurnoutArea } from '../lib/voterTurnout';
import { LATEST_ELECTION, SAVED_CDN_CACHE, centralTime, json, savedCopy } from './_sos.js';

// The election's turnout (ballots cast as a share of active voters) statewide, by county and by legislative
// district, from our saved copy (scripts/sos/schema.sql), which a daily cron copies from the Secretary of State
// (api/save-sos.ts). The SOS reports counties only; how the district numbers are built is in api/_sos-live.ts.

interface TurnoutRow {
  geography: 'state' | 'county' | 'district';
  area_id: string;
  name: string;
  ballots: number;
  active_voters: number;
  precincts_reporting: number;
  precincts_total: number;
  vote_centers: boolean;
  apportioned_ballots: number;
  results_updated_at: Date | null;
}

const area = (r: TurnoutRow): TurnoutArea => ({
  id: r.area_id,
  name: r.name,
  ballots: r.ballots,
  voters: r.active_voters,
  reporting: r.precincts_reporting,
  total: r.precincts_total,
  ...(r.vote_centers ? { voteCenters: true } : {}),
  ...(r.apportioned_ballots ? { estimated: r.apportioned_ballots } : {}),
});

async function turnout(): Promise<Turnout> {
  const rows = (await savedCopy().query(
    `select t.geography, t.area_id, t.name, t.ballots, t.active_voters, t.precincts_reporting, t.precincts_total,
       t.vote_centers, t.apportioned_ballots, e.results_updated_at
     from sos.turnout t join sos.elections e using (election_id)
     where t.election_id = ${LATEST_ELECTION}`
  )) as TurnoutRow[];
  const statewide = rows.find((r) => r.geography === 'state');
  if (!statewide) throw new Error('no turnout is saved');
  const of = (geography: TurnoutRow['geography']) => rows.filter((r) => r.geography === geography).map(area);
  const districts = of('district').sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  return {
    updated: centralTime(statewide.results_updated_at),
    statewide: area(statewide),
    counties: of('county').sort((a, b) => a.name.localeCompare(b.name)),
    districts: districts.length ? districts : null,
  };
}

export async function GET() {
  try {
    return json(await turnout(), 200, SAVED_CDN_CACHE);
  } catch (err) {
    console.error('voter turnout failed', err);
    return json({ error: 'Turnout is unavailable right now. This page will keep trying.' }, 503, SAVED_CDN_CACHE);
  }
}
