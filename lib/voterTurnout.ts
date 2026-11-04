// Shapes returned by /api/voter-turnout, which serves our saved copy of the Secretary of State's 2026 general election turnout

export interface TurnoutArea {
  /** Counties: the SOS county number ("49"). Districts: "1" .. "35", with "26A", "26B", "28A" and "28B". */
  id: string;
  name: string;
  /** Ballots cast */
  ballots: number;
  /** Active registered voters */
  voters: number;
  /** Precincts (or, in vote-center counties, vote centers) counted so far */
  reporting: number;
  total: number;
  /** Counties whose voters can vote at any vote center rather than at their home precinct */
  voteCenters?: boolean;
  /**
   * Districts only: how many of `ballots` were apportioned rather than counted, because they were cast at a vote
   * center or in a precinct that serves more than one district (see api/_sos-live.ts)
   */
  estimated?: number;
}

export interface Turnout {
  /** When the SOS last updated results, as it prints it: "11/4/2026 2:35 AM CT" */
  updated: string;
  statewide: TurnoutArea;
  counties: TurnoutArea[];
  /** null when no district turnout is saved; the counties still show */
  districts: TurnoutArea[] | null;
}

/**
 * A district with at least this share of its ballots apportioned is marked as an estimate. Below it, even a
 * sizable error in the apportioned part moves the district's turnout by well under half a point.
 */
export const ESTIMATE_FLAG_SHARE = 0.1;

/** Ballots cast as a share of active voters */
export const turnoutOf = (a: TurnoutArea) => (a.voters ? a.ballots / a.voters : 0);

export const isEstimate = (a: TurnoutArea) => !!a.estimated && a.estimated >= a.ballots * ESTIMATE_FLAG_SHARE;

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const unavailable = 'Turnout is unavailable right now. Try again in a minute.';
  const isJson = res.headers.get('content-type')?.includes('json');
  if (!res.ok || !isJson) {
    const data = isJson ? await res.json().catch(() => ({})) : {};
    throw new Error(data.error || unavailable);
  }
  return res.json().catch(() => {
    throw new Error(unavailable);
  });
}

// results.html preloads this URL on the turnout view (see scripts/prerender.js), so change it in both places
export const fetchTurnout = () => getJson<Turnout>('/api/voter-turnout');
