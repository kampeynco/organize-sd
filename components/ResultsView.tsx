import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { faArrowLeft, faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import {
  fetchCountyMap,
  fetchElectionInfo,
  fetchPrecinctMap,
  fetchPrecinctResults,
  fetchSummary,
  type CountyMap,
  type CountyResult,
  type ElectionInfo,
  type ElectionSummary,
  type PrecinctMap,
  type PrecinctResult,
  type Race,
} from '../lib/electionResults';
import { ResultsLegend, ResultsMap, formatShare, formatVotes, raceColors, type MapResult } from './ResultsMap';
import { CandidateRows, ErrorNote, MapPlaceholder, PickerLabel, PickerSelect, ResultsTable, Stat, type Display } from './ui';

// The saved counts change about once a day, when they're copied from the SOS; the CDN keeps each copy five minutes
const REFRESH_MS = 5 * 60_000;
// After a failed request, try again sooner than the next scheduled refresh
const RETRY_MS = 10_000;
// After the CDN answers with an old copy, by when it has usually fetched a fresh one
const STALE_RECHECK_MS = 5_000;
const SOS_RESULTS_URL = 'https://electionresults.sd.gov/';

type County = CountyMap['counties'][number];

/** Results for one race, tagged with the race (and county) they belong to so a slow response never paints another race */
interface Loaded<T> {
  key: string;
  data: T;
}

export const ResultsView: React.FC<{
  toggle: React.ReactNode;
  /** Whether this view is on screen; a hidden view stops checking for new counts */
  active: boolean;
  raceId: string | null;
  countyId: string | null;
  onRace: (id: string) => void;
  onCounty: (id: string | null) => void;
}> = ({ toggle, active, raceId, countyId, onRace, onCounty }) => {
  const [summary, setSummary] = useState<ElectionSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [info, setInfo] = useState<ElectionInfo | null>(null);
  const [countyMap, setCountyMap] = useState<CountyMap | null>(null);
  const [precincts, setPrecincts] = useState<Loaded<PrecinctResult[]> | null>(null);
  const [precinctMap, setPrecinctMap] = useState<Loaded<PrecinctMap> | null>(null);
  const [detailError, setDetailError] = useState('');
  const [tick, setTick] = useState(0);

  const race = summary?.races.find((r) => r.id === raceId) ?? summary?.races[0] ?? null;
  const raceKey = race ? `${race.type}:${race.id}` : '';
  // An unknown county in the address falls back to the statewide map
  const county = countyMap?.counties.find((c) => c.id === countyId) ?? null;
  const precinctKey = `${raceKey}:${county?.id}`;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [active]);

  // Coming back to this view picks up whatever changed while it was hidden
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) setTick((t) => t + 1);
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    if (!summaryError && !detailError) return;
    const retry = setTimeout(() => setTick((t) => t + 1), RETRY_MS);
    return () => clearTimeout(retry);
  }, [summaryError, detailError, tick]);

  useEffect(() => {
    if (countyMap) return;
    fetchCountyMap().then(setCountyMap).catch((e: Error) => setSummaryError(e.message));
  }, [countyMap, tick]);

  // Whether the last summary was an old copy, so a run of them gets one quick recheck rather than a loop
  const rechecking = useRef(false);
  useEffect(() => {
    let live = true;
    let recheck: ReturnType<typeof setTimeout> | undefined;
    fetchSummary()
      .then(({ data, stale }) => {
        if (!live) return;
        setSummary(data);
        setSummaryError('');
        if (stale && !rechecking.current) recheck = setTimeout(() => setTick((t) => t + 1), STALE_RECHECK_MS);
        rechecking.current = stale;
      })
      .catch((e: Error) => { if (live) setSummaryError(e.message); });
    return () => {
      live = false;
      clearTimeout(recheck);
    };
  }, [tick]);

  // The title and banner. The counts don't need them, so a failure keeps the last copy and waits for the next refresh.
  useEffect(() => {
    let live = true;
    fetchElectionInfo()
      .then((i) => { if (live) setInfo(i); })
      .catch(() => {});
    return () => { live = false; };
  }, [tick]);

  // The race object is replaced on every refresh, so this follows its key instead
  useEffect(() => {
    if (!race || !county) return;
    let live = true;
    fetchPrecinctResults(race, county.id)
      .then((r) => { if (live) { setPrecincts({ key: precinctKey, data: r.precincts }); setDetailError(''); } })
      .catch((e: Error) => { if (live) setDetailError(e.message); });
    return () => { live = false; };
  }, [precinctKey, tick]);

  useEffect(() => {
    if (!county?.precinctMap) return;
    let live = true;
    fetchPrecinctMap(county.id)
      .then((m) => { if (live) setPrecinctMap({ key: county.id, data: m }); })
      .catch(() => { /* the precinct table still shows every result */ });
    return () => { live = false; };
  }, [county]);

  const colors = useMemo(() => (race ? raceColors(race.candidates) : {}), [race]);
  const countyData = race?.counties ?? null;
  const precinctData = county && precincts?.key === precinctKey ? precincts.data : null;
  const precinctShapes = county && precinctMap?.key === county.id ? precinctMap.data : null;
  // Vote-center counties report by polling place (ids like C740) instead of by precinct
  const voteCenters = !!precinctData?.length && precinctData.every((p) => p.id.startsWith('C'));

  /** Picking a county from the table below brings the map back into view */
  const selectCounty = (id: string | null) => {
    onCounty(id);
    const map = document.getElementById('results-map');
    if (map && map.getBoundingClientRect().top < 0) map.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-paper">
      <section className="grain relative isolate overflow-hidden bg-brand text-white">
        <div className="container mx-auto px-4 sm:px-5 max-w-7xl pt-40 pb-12 md:pb-16 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-12 items-start">
          <div>
            {toggle}
            <h1 className="mt-8 font-display font-black uppercase text-5xl sm:text-6xl xl:text-7xl leading-[0.9]">
              South Dakota<br /> results
            </h1>
            <Updated summary={summary} info={info} />
            {summary && <Stats summary={summary} />}
          </div>

          <MapCard
            summary={summary}
            race={race}
            onRace={onRace}
            colors={colors}
            countyMap={countyMap}
            countyResults={countyData}
            county={county}
            countyPending={!!countyId && !countyMap}
            precinctMap={precinctShapes}
            precinctResults={precinctData}
            voteCenters={voteCenters}
            onSelectCounty={selectCounty}
          />
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-5 max-w-7xl py-10 md:py-14">
        {summaryError && !summary && <ErrorNote message={summaryError} />}
        {summaryError && summary && (
          <p role="status" className="mb-6 text-sm font-semibold text-brand-ink/70">
            Couldn't check for new results just now. These are the last counts we received; we'll keep trying.
          </p>
        )}
        {!summary && !summaryError && <p className="text-brand-ink/60" aria-busy="true">Loading results…</p>}
        {summary && !summary.races.length && (
          <p className="rounded-3xl bg-white p-8 text-lg text-brand-ink/80">
            The Secretary of State hasn't posted results for this election yet.
          </p>
        )}

        {race && (
          <RaceResults
            race={race}
            colors={colors}
            counties={countyData}
            county={county}
            precincts={precinctData}
            precinctMap={precinctShapes}
            voteCenters={voteCenters}
            error={detailError}
            onSelectCounty={selectCounty}
          />
        )}

        <SourceNote />
      </div>
    </div>
  );
};

/* ─── Hero ─── */

const Updated: React.FC<{ summary: ElectionSummary | null; info: ElectionInfo | null }> = ({ summary, info }) => {
  const testing = !!info?.message && /test/i.test(info.message);
  return (
    <div className="mt-5 text-white/85">
      <p className="text-lg md:text-xl">{info?.title ?? '2026 General Election'}</p>
      {summary?.updated && (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
          Unofficial · updated {summary.updated}
          {testing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-2.5 py-0.5 text-xs font-bold text-brand-ink">
              <Icon icon={faTriangleExclamation} />
              SOS test data, not real votes
            </span>
          )}
        </p>
      )}
      {info?.message && !testing && <p className="mt-1 text-sm text-white/60">{info.message}</p>}
    </div>
  );
};

const Stats: React.FC<{ summary: ElectionSummary }> = ({ summary }) => {
  const p = summary.precincts;
  return (
    <dl className="mt-8 grid grid-cols-3 gap-3">
      <Stat label="Precincts" value={`${p.total ? Math.round((p.reporting / p.total) * 100) : 0}%`} detail={`${formatVotes(p.reporting)} of ${formatVotes(p.total)} in`} />
      <Stat label="Ballots cast" value={formatVotes(summary.ballotsCast)} detail={`${formatVotes(summary.activeVoters)} active voters`} />
      <Stat
        label="Turnout"
        value={summary.activeVoters ? formatShare(summary.ballotsCast / summary.activeVoters) : '–'}
        detail="of active voters"
      />
    </dl>
  );
};

/* ─── Map card ─── */

const Pickers: React.FC<{
  summary: ElectionSummary | null;
  race: Race | null;
  countyMap: CountyMap | null;
  county: County | null;
  onRace: (id: string) => void;
  onCounty: (id: string | null) => void;
}> = ({ summary, race, countyMap, county, onRace, onCounty }) => {
  const races = summary?.races ?? [];
  const groups = [
    { title: 'Statewide offices', races: races.filter((r) => r.type === 'SWR') },
    { title: 'Ballot questions', races: races.filter((r) => r.type === 'BQ') },
  ].filter((g) => g.races.length);

  // The office field starts at the width of its longest option ("Commissioner of School and Public Lands") and the
  // county field at its own, so neither cuts off a label; when both don't fit on one line, county moves below
  return (
    <div className="flex flex-wrap gap-4">
      <PickerLabel label="Office" className="min-w-0 flex-[1_1_auto]">
        <PickerSelect value={race?.id ?? ''} shown={race?.name ?? 'Loading…'} disabled={!race} onChange={onRace}>
          {!race && <option value="">Loading…</option>}
          {groups.map((g) => (
            <optgroup key={g.title} label={g.title}>
              {g.races.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </optgroup>
          ))}
        </PickerSelect>
      </PickerLabel>
      <PickerLabel label="County" className="w-full sm:w-auto sm:flex-none">
        <PickerSelect
          value={county?.id ?? ''}
          shown={county?.name ?? 'All counties'}
          disabled={!countyMap}
          onChange={(id) => onCounty(id || null)}
        >
          <option value="">All counties</option>
          {countyMap?.counties.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </PickerSelect>
      </PickerLabel>
    </div>
  );
};

const MapCard: React.FC<{
  summary: ElectionSummary | null;
  race: Race | null;
  onRace: (id: string) => void;
  colors: Record<string, string>;
  countyMap: CountyMap | null;
  countyResults: CountyResult[] | null;
  county: County | null;
  /** A county was asked for (from the address) but the county list hasn't loaded yet */
  countyPending: boolean;
  precinctMap: PrecinctMap | null;
  precinctResults: PrecinctResult[] | null;
  voteCenters: boolean;
  onSelectCounty: (id: string | null) => void;
}> = ({ summary, race, onRace, colors, countyMap, countyResults, county, countyPending, precinctMap, precinctResults, voteCenters, onSelectCounty }) => {
  const countyById = useMemo(() => new Map<string, MapResult>((countyResults ?? []).map((c) => [c.id, c])), [countyResults]);
  const precinctById = useMemo(() => new Map<string, MapResult>((precinctResults ?? []).map((p) => [p.id, p])), [precinctResults]);
  const byPrecinct = !!county?.precinctMap;

  let hint = 'Results by county. Hover over a county for details, or click or tap one to see its precincts.';
  if (county && byPrecinct) hint = 'Results by precinct. Hover or tap a precinct for details. Double-click or use + to zoom in, then drag to move around.';
  else if (county && voteCenters) hint = `${county.name} County votes at vote centers, so it reports by voting location and has no precinct map. Its results are below.`;
  else if (county) hint = `We don't have current precinct boundaries for ${county.name} County. Its precinct results are below.`;

  let map: React.ReactNode = <MapPlaceholder ratio={byPrecinct ? '1000 / 700' : '1000 / 640'} />;
  if (race && !countyPending && byPrecinct && precinctMap && precinctResults) {
    map = (
      <ResultsMap
        key={`${race.id}-${county!.id}`}
        viewBox={precinctMap.viewBox}
        areas={precinctMap.precincts}
        outline={precinctMap.outline}
        results={precinctById}
        candidates={race.candidates}
        colors={colors}
        noun="precinct"
        label={`Map of ${race.name} results by precinct in ${county!.name} County. The tables below list the same results.`}
        zoomable
      />
    );
  } else if (race && !countyPending && !byPrecinct && countyMap && countyResults) {
    map = (
      <ResultsMap
        key={race.id}
        viewBox={countyMap.viewBox}
        areas={countyMap.counties}
        results={countyById}
        candidates={race.candidates}
        colors={colors}
        noun="county"
        label={`Map of ${race.name} results by South Dakota county. The tables below list the same results.`}
        onSelect={onSelectCounty}
        highlight={county?.id}
      />
    );
  }

  return (
    <div id="results-map" className="min-w-0 rounded-3xl bg-white p-4 sm:p-6 text-brand-ink shadow-2xl shadow-brand-ink/30 scroll-mt-32 lg:scroll-mt-24">
      {/* The dropdowns name what the map shows, so they stand in for a visible title */}
      <h2 className="sr-only">Results map</h2>
      <Pickers summary={summary} race={race} countyMap={countyMap} county={county} onRace={onRace} onCounty={onSelectCounty} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <p className="text-sm text-brand-ink/60">{hint}</p>
        {county && (
          <button
            type="button"
            onClick={() => onSelectCounty(null)}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-bold text-brand-ink hover:bg-paper-dark transition-colors"
          >
            <Icon icon={faArrowLeft} /> Statewide
          </button>
        )}
      </div>
      <div className="mt-4">{map}</div>
      {race && (
        <div className="mt-5">
          <ResultsLegend candidates={race.candidates} colors={colors} showNoBoundary={byPrecinct} />
        </div>
      )}
    </div>
  );
};

/* ─── Results below the hero ─── */

const RaceResults: React.FC<{
  race: Race;
  colors: Record<string, string>;
  counties: CountyResult[] | null;
  county: County | null;
  precincts: PrecinctResult[] | null;
  precinctMap: PrecinctMap | null;
  voteCenters: boolean;
  error: string;
  onSelectCounty: (id: string | null) => void;
}> = ({ race, colors, counties, county, precincts, precinctMap, voteCenters, error, onSelectCounty }) => {
  // Lives here, not in the table, so the choice carries over between the county and precinct tables
  const [display, setDisplay] = useState<Display>('both');
  const countyResult = county ? counties?.find((c) => c.id === county.id) : undefined;
  const mapped = new Set(precinctMap?.precincts.map((p) => p.id));
  const showParty = race.type !== 'BQ';
  const unmapped = county?.precinctMap && precincts && precinctMap && precincts.some((p) => !mapped.has(p.id));

  return (
    <article className="rounded-3xl bg-white p-5 sm:p-8 md:p-10 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">
        {race.type === 'BQ' ? 'Ballot question' : `Vote for ${race.voteFor}`}
      </p>
      <h2 className="mt-2 font-display font-black uppercase text-4xl md:text-5xl leading-[0.95] text-brand-ink">{race.name}</h2>
      {race.question && <p className="mt-3 max-w-3xl text-brand-ink/75 leading-relaxed">{race.question}</p>}

      <div className={`mt-8 grid gap-10 ${county ? 'lg:grid-cols-2' : ''}`}>
        <section aria-labelledby="results-statewide-heading">
          <h3 id="results-statewide-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-brand-ink/60">Statewide</h3>
          <CandidateRows
            candidates={race.candidates}
            votes={Object.fromEntries(race.candidates.map((c) => [c.id, c.votes]))}
            colors={colors}
            showParty={showParty}
          />
          <p className="mt-4 text-sm text-brand-ink/60">
            {formatVotes(race.reporting)} of {formatVotes(race.total)} precincts reporting
            {race.partial > 0 && ` · ${formatVotes(race.partial)} partially`}
          </p>
        </section>
        {county && (
          <section aria-labelledby="results-county-heading">
            <h3 id="results-county-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-brand-ink/60">{county.name} County</h3>
            {countyResult ? (
              <>
                <CandidateRows candidates={race.candidates} votes={countyResult.votes} colors={colors} showParty={showParty} />
                <p className="mt-4 text-sm text-brand-ink/60">
                  {countyResult.reporting} of {countyResult.total} precincts reporting
                </p>
              </>
            ) : (
              <p className="mt-6 text-brand-ink/60" aria-busy="true">Loading…</p>
            )}
          </section>
        )}
      </div>

      {error && <div className="mt-8"><ErrorNote message={error} /></div>}

      {county && unmapped && (
        <p className="mt-8 flex items-start gap-3 rounded-2xl bg-paper p-4 text-sm text-brand-ink/80">
          <Icon icon={faCircleInfo} className="mt-0.5 shrink-0 text-brand" />
          Precincts drawn since 2020 and absentee ballot counts have no boundary on the map. They are marked in the table.
        </p>
      )}

      {county ? (
        precincts ? (
          <ResultsTable
            title={`${county.name} County by ${voteCenters ? 'voting location' : 'precinct'}`}
            caption={`${county.name} County ${race.name} results by ${voteCenters ? 'voting location' : 'precinct'}`}
            areaLabel={voteCenters ? 'Voting location' : 'Precinct'}
            rows={precincts.map((p) => ({
              ...p,
              extras: [p.reported ? 'Yes' : 'No'],
              extraSort: [p.reported ? 1 : 0],
              flag: county.precinctMap && precinctMap && !mapped.has(p.id) ? 'Not on map' : undefined,
            }))}
            extras={['Reported']}
            candidates={race.candidates}
            colors={colors}
            display={display}
            onDisplay={setDisplay}
          />
        ) : (
          <p className="mt-10 text-brand-ink/60" aria-busy="true">Loading precinct results…</p>
        )
      ) : (
        counties && (
          <ResultsTable
            title="Results by county"
            caption={`${race.name} results by county`}
            areaLabel="County"
            rows={counties.map((c) => ({
              ...c,
              extras: [`${c.reporting}/${c.total}`],
              extraSort: [c.total ? c.reporting / c.total : 0],
            }))}
            extras={['Reporting']}
            candidates={race.candidates}
            colors={colors}
            display={display}
            onDisplay={setDisplay}
            onSelect={onSelectCounty}
          />
        )
      )}
    </article>
  );
};

const SourceNote: React.FC = () => (
  <div className="mt-12 max-w-3xl text-sm leading-relaxed text-brand-ink/65 space-y-3">
    <p>
      Results are unofficial and come from the{' '}
      <a href={SOS_RESULTS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
        South Dakota Secretary of State
      </a>
      . We copy the state's counts every day, so they stay here after its results site moves on to the next election.
      Counties certify official results after the canvass.
    </p>
    <p>
      Precinct boundaries are approximate. Minnehaha and Pennington County precincts come from those counties, and the
      Lincoln County part of Sioux Falls from the City of Sioux Falls. The rest come from the 2020 Census voting
      districts, matched to the Secretary of State's precinct names. Where a county has redrawn its precincts since 2020,
      its results appear in the table instead of on the map.
    </p>
  </div>
);
